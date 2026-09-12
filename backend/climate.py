"""
backend/climate.py

Climate Data Integration Service for THERMO-SHIELD.
Integrates Open-Meteo (real-time/hourly forecasting & geocoding)
and NASA POWER (long-term multi-decadal climatology).

Merging Rule:
  - Open-Meteo supplies high-resolution hourly diurnal profiles (temperatures, direct/diffuse solar irradiance, snow data, and peak solar radiation).
  - NASA POWER supplies 30-year climatological baseline averages for annual solar potential, mean ambient temperature bounds, and prevailing seasonal winds.
  - The merged payload combines Open-Meteo's dynamic diurnal curves with NASA POWER's climatological validation benchmarks.
"""

import time
import json
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any, Tuple
import httpx

from backend.database import SessionLocal, init_db
from backend.models import ClimateCacheModel

# In-memory cache: (lat_round, lon_round) -> (timestamp, data)
_CLIMATE_CACHE: Dict[Tuple[float, float], Tuple[float, Dict[str, Any]]] = {}
CACHE_TTL_SECONDS = 12 * 3600  # 12 hours TTL


async def fetch_open_meteo(lat: float, lon: float, client: httpx.AsyncClient) -> Optional[Dict[str, Any]]:
    """
    Fetches real-time and forecast weather data from Open-Meteo API.
    No API key required.
    """
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "hourly": "temperature_2m,relative_humidity_2m,direct_normal_irradiance,diffuse_radiation,wind_speed_10m,snowfall,snow_depth",
        "daily": "temperature_2m_max,temperature_2m_min,temperature_2m_mean,precipitation_sum,snowfall_sum,wind_speed_10m_max,shortwave_radiation_sum",
        "timezone": "auto",
        "forecast_days": 1
    }
    try:
        resp = await client.get(url, params=params, timeout=15.0)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"[Open-Meteo] Request failed for ({lat}, {lon}): {e}")
    return None


async def fetch_nasa_power(lat: float, lon: float, client: httpx.AsyncClient) -> Optional[Dict[str, Any]]:
    """
    Fetches multi-year climatology baseline from NASA POWER API.
    No API key required.
    """
    url = "https://power.larc.nasa.gov/api/temporal/climatology/point"
    params = {
        "parameters": "T2M,T2M_MAX,T2M_MIN,ALLSKY_SFC_SW_DWN,WS10M,RH2M",
        "community": "RE",
        "longitude": lon,
        "latitude": lat,
        "format": "JSON"
    }
    try:
        resp = await client.get(url, params=params, timeout=15.0)
        if resp.status_code == 200:
            return resp.json()
    except Exception as e:
        print(f"[NASA-POWER] Request failed for ({lat}, {lon}): {e}")
    return None


async def geocode_place(query: str, client: httpx.AsyncClient) -> List[Dict[str, Any]]:
    """
    Geocodes a place name query using Open-Meteo Geocoding API.
    """
    url = "https://geocoding-api.open-meteo.com/v1/search"
    params = {
        "name": query.strip(),
        "count": 6,
        "language": "en",
        "format": "json"
    }
    try:
        resp = await client.get(url, params=params, timeout=8.0)
        if resp.status_code == 200:
            data = resp.json()
            results = data.get("results", [])
            output = []
            for r in results:
                admin = r.get("admin1") or r.get("country") or ""
                country = r.get("country", "")
                name_str = f"{r.get('name', '')}, {admin}".strip(", ")
                output.append({
                    "id": str(r.get("id", "")),
                    "name": name_str,
                    "city": r.get("name", ""),
                    "country": country,
                    "region": admin,
                    "lat": float(r.get("latitude", 0.0)),
                    "lon": float(r.get("longitude", 0.0)),
                    "altitude": float(r.get("elevation", 0.0))
                })
            return output
    except Exception as e:
        print(f"[Geocode] Query failed for '{query}': {e}")
    return []


async def get_climate_profile(lat: float, lon: float, location_name: Optional[str] = None) -> Dict[str, Any]:
    """
    Retrieves and merges live climate data for coordinates with in-memory caching.
    """
    cache_key = (round(lat, 3), round(lon, 3))
    now = time.time()

    # 1. Check L1 in-memory fast cache
    if cache_key in _CLIMATE_CACHE:
        cached_time, cached_data = _CLIMATE_CACHE[cache_key]
        if now - cached_time < CACHE_TTL_SECONDS:
            return cached_data

    # 2. Check L2 persistent SQLite database cache
    try:
        init_db()
        db = SessionLocal()
        try:
            cached_db = db.query(ClimateCacheModel).filter(
                ClimateCacheModel.lat_round == cache_key[0],
                ClimateCacheModel.lon_round == cache_key[1]
            ).first()
            if cached_db:
                updated = cached_db.updated_at
                if updated.tzinfo is None:
                    updated = updated.replace(tzinfo=timezone.utc)
                time_diff = datetime.now(timezone.utc) - updated
                if time_diff < timedelta(hours=24):
                    data = json.loads(cached_db.profile_json)  # type: ignore[arg-type]
                    _CLIMATE_CACHE[cache_key] = (now, data)
                    return data
        finally:
            db.close()
    except Exception as db_err:
        print(f"[ClimateCache] DB read error: {db_err}")

    headers = {"User-Agent": "THERMO-SHIELD-Climatology/1.0 (SIH-PS-26051)"}
    async with httpx.AsyncClient(headers=headers, follow_redirects=True, timeout=15.0) as client:
        # Fetch both in parallel
        om_task = fetch_open_meteo(lat, lon, client)
        nasa_task = fetch_nasa_power(lat, lon, client)
        om_data, nasa_data = await om_task, await nasa_task

    # Process and Merge
    source = "merged"
    altitude = 0.0

    # 1. Parse Open-Meteo Data
    om_min_temp = None
    om_max_temp = None
    om_avg_temp = None
    om_peak_solar = 0.0
    om_daily_kwh = 4.0
    om_avg_wind = 3.0
    om_max_wind = 7.0
    om_humidity = 40.0
    om_snowfall_mm = 0.0
    om_snow_depth_cm = 0.0
    hourly_temps: List[float] = []
    hourly_solar: List[float] = []

    if om_data:
        altitude = float(om_data.get("elevation", 0.0))
        daily = om_data.get("daily", {})
        hourly = om_data.get("hourly", {})

        if daily.get("temperature_2m_min"):
            om_min_temp = float(daily["temperature_2m_min"][0])
            om_max_temp = float(daily["temperature_2m_max"][0])
            om_avg_temp = float(daily["temperature_2m_mean"][0])
        if daily.get("wind_speed_10m_max"):
            om_max_wind = float(daily["wind_speed_10m_max"][0])
        if daily.get("shortwave_radiation_sum"):
            # MJ/m² -> kWh/m² (1 kWh = 3.6 MJ)
            om_daily_kwh = round(float(daily["shortwave_radiation_sum"][0]) / 3.6, 2)
        if daily.get("snowfall_sum"):
            om_snowfall_mm = float(daily["snowfall_sum"][0]) * 10.0  # cm to mm

        # Hourly values
        if hourly.get("temperature_2m"):
            hourly_temps = [float(t) for t in hourly["temperature_2m"][:24]]
        if hourly.get("direct_normal_irradiance") and hourly.get("diffuse_radiation"):
            hourly_solar = [
                float(hourly["direct_normal_irradiance"][i]) + float(hourly["diffuse_radiation"][i])
                for i in range(min(24, len(hourly["direct_normal_irradiance"])))
            ]
            om_peak_solar = max(hourly_solar) if hourly_solar else 500.0

        if hourly.get("relative_humidity_2m"):
            rh_list = [float(h) for h in hourly["relative_humidity_2m"][:24]]
            om_humidity = sum(rh_list) / len(rh_list) if rh_list else 40.0

        if hourly.get("wind_speed_10m"):
            ws_list = [float(w) for w in hourly["wind_speed_10m"][:24]]
            om_avg_wind = sum(ws_list) / len(ws_list) if ws_list else 3.0

        if hourly.get("snow_depth"):
            sd_list = [float(s) for s in hourly["snow_depth"][:24] if s is not None]
            om_snow_depth_cm = max(sd_list) if sd_list else 0.0

    # 2. Parse NASA POWER Climatology Data
    nasa_avg_temp = None
    nasa_min_temp = None
    nasa_max_temp = None
    nasa_solar_kwh = None
    nasa_wind_speed = None
    nasa_humidity = None

    if nasa_data:
        properties = nasa_data.get("properties", {}).get("parameter", {})
        if "T2M" in properties:
            # Annual average
            nasa_avg_temp = properties["T2M"].get("ANN")
            nasa_min_temp = properties.get("T2M_MIN", {}).get("ANN")
            nasa_max_temp = properties.get("T2M_MAX", {}).get("ANN")
            nasa_solar_kwh = properties.get("ALLSKY_SFC_SW_DWN", {}).get("ANN")
            nasa_wind_speed = properties.get("WS10M", {}).get("ANN")
            nasa_humidity = properties.get("RH2M", {}).get("ANN")

    # 3. Apply Merge Rules
    if om_data and nasa_data:
        source = "merged"
        final_min_temp = om_min_temp if om_min_temp is not None else (nasa_min_temp or -10.0)
        final_max_temp = om_max_temp if om_max_temp is not None else (nasa_max_temp or 5.0)
        final_avg_temp = om_avg_temp if om_avg_temp is not None else (nasa_avg_temp or -2.5)
        final_solar_kwh = om_daily_kwh if om_daily_kwh > 0 else (nasa_solar_kwh or 4.5)
        final_solar_peak = om_peak_solar if om_peak_solar > 0 else 520.0
        final_wind_avg = om_avg_wind if om_avg_wind is not None else (nasa_wind_speed or 3.2)
        final_wind_max = om_max_wind if om_max_wind is not None else (final_wind_avg * 1.8)
        final_humidity = om_humidity if om_humidity is not None else (nasa_humidity or 35.0)
    elif om_data:
        source = "open-meteo"
        final_min_temp = om_min_temp or -15.0
        final_max_temp = om_max_temp or -5.0
        final_avg_temp = om_avg_temp or -10.0
        final_solar_kwh = om_daily_kwh
        final_solar_peak = om_peak_solar or 500.0
        final_wind_avg = om_avg_wind
        final_wind_max = om_max_wind
        final_humidity = om_humidity
    elif nasa_data:
        source = "nasa-power"
        final_min_temp = nasa_min_temp or -12.0
        final_max_temp = nasa_max_temp or 0.0
        final_avg_temp = nasa_avg_temp or -6.0
        final_solar_kwh = nasa_solar_kwh or 4.8
        final_solar_peak = (nasa_solar_kwh or 4.8) * 115.0
        final_wind_avg = nasa_wind_speed or 3.5
        final_wind_max = (nasa_wind_speed or 3.5) * 1.8
        final_humidity = nasa_humidity or 30.0
    else:
        # Fallback offline approximation
        source = "fallback"
        altitude = 3524.0 if lat > 30 else 200.0
        final_min_temp = -18.0 if lat > 30 else 15.0
        final_max_temp = -8.0 if lat > 30 else 28.0
        final_avg_temp = -13.0 if lat > 30 else 21.5
        final_solar_kwh = 4.85
        final_solar_peak = 520.0
        final_wind_avg = 3.2
        final_wind_max = 7.8
        final_humidity = 25.0

    # Auto-generate name if missing
    loc_name = location_name or f"{lat:.2f}°, {lon:.2f}°"
    if lat > 33 and lon > 76:
        loc_name = location_name or "Leh / Ladakh High Altitude Cold Desert"

    result = {
        "location": {
            "lat": round(lat, 4),
            "lon": round(lon, 4),
            "name": loc_name,
            "altitude": round(altitude, 1)
        },
        "ambientTempRange": {
            "min": round(final_min_temp, 1),
            "max": round(final_max_temp, 1),
            "avg": round(final_avg_temp, 1)
        },
        "solarIrradiance": {
            "dailyTotalKwh": round(final_solar_kwh, 2),
            "peakWm2": round(final_solar_peak, 1)
        },
        "windSpeed": {
            "avgMs": round(final_wind_avg, 1),
            "maxMs": round(final_wind_max, 1)
        },
        "humidity": {
            "avgPercent": round(final_humidity, 1)
        },
        "snowData": {
            "annualSnowfallMm": round(om_snowfall_mm, 1),
            "maxSnowDepthCm": round(om_snow_depth_cm, 1)
        },
        "hourlyOutdoorTemp": hourly_temps,
        "hourlySolarRadiation": hourly_solar,
        "source": source,
        "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

    # Store in L1 in-memory fast cache
    _CLIMATE_CACHE[cache_key] = (now, result)

    # Store in L2 persistent SQLite database cache
    try:
        init_db()
        db = SessionLocal()
        try:
            existing = db.query(ClimateCacheModel).filter(
                ClimateCacheModel.lat_round == cache_key[0],
                ClimateCacheModel.lon_round == cache_key[1]
            ).first()
            if existing:
                existing.profile_json = json.dumps(result)
                existing.source = source
                existing.location_name = loc_name
                existing.fetched_at = result["fetchedAt"]
                existing.updated_at = datetime.now(timezone.utc)
            else:
                db.add(ClimateCacheModel(
                    lat=lat,
                    lon=lon,
                    lat_round=cache_key[0],
                    lon_round=cache_key[1],
                    location_name=loc_name,
                    profile_json=json.dumps(result),
                    source=source,
                    fetched_at=result["fetchedAt"]
                ))
            db.commit()
        finally:
            db.close()
    except Exception as db_err:
        print(f"[ClimateCache] DB save error: {db_err}")

    return result
