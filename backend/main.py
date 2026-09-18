"""
backend/main.py

FastAPI backend server for THERMO-SHIELD.
Implements the REST API contract defined in docs/api-contract.md.
"""
import sys
import time
from pathlib import Path

# Add project root to sys.path so both backend and simulation_engine are resolvable
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from typing import List, Optional
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import httpx
from backend.database import get_db, init_db
from backend.models import MaterialModel
from backend.seed import seed_materials
from backend.climate import get_climate_profile, geocode_place
from backend.risk_assessment import get_disaster_risk_assessment
from simulation_engine.engine import simulate, SimulationParams, ClimateInput
from simulation_engine.materials import materials_db
from simulation_engine.optimization.optimizer import _resolve_climate
try:
    from simulation_engine.surrogate import recommend, verify
    SURROGATE_AVAILABLE = True
except Exception:
    SURROGATE_AVAILABLE = False

PHYSICS_ENGINE_AVAILABLE = True


# ─── Pydantic Data Models (Contract Specification) ──────────────────────────

class LocationCoordinatesModel(BaseModel):
    lat: float = Field(..., description="Latitude in decimal degrees", ge=-90.0, le=90.0)
    lon: float = Field(..., description="Longitude in decimal degrees", ge=-180.0, le=180.0)
    altitude: Optional[float] = Field(default=3524.0, description="Altitude in meters above sea level")
    hourly_outdoor_temp: Optional[List[float]] = None
    hourly_solar_radiation: Optional[List[float]] = None
    hourlyOutdoorTemp: Optional[List[float]] = None
    hourlySolarRadiation: Optional[List[float]] = None
    wind_speed: Optional[float] = None
    humidity_pct: Optional[float] = None


class SimulationRequestModel(BaseModel):
    location: Optional[LocationCoordinatesModel] = None
    shape: str = Field(default="rectangular", description="25 architectural/extreme-climate shelter shapes")
    orientation: float = Field(default=180.0, description="Degrees from North (180=South)")
    wallMaterial: str = Field(default="adobe", description="Material ID from materials database")
    roofMaterial: Optional[str] = Field(default="timber_insulated_roof", description="Roof material ID")
    glazingMaterial: Optional[str] = Field(default="glazing_low_e", description="Glazing material ID (e.g. glazing_low_e, polyethylene_sheet)")
    insulation: float = Field(default=100.0, description="Insulation thickness in mm", ge=0.0, le=300.0)
    opening: float = Field(default=14.0, description="Glazing aperture percentage on south wall (5% to 95%)", ge=5.0, le=95.0)
    thermalMass: str = Field(default="high", description="low | medium | high")
    length: float = Field(default=6.0, description="Length in meters", ge=1.0, le=30.0)
    width: float = Field(default=4.0, description="Width in meters", ge=1.0, le=30.0)
    height: float = Field(default=2.5, description="Height in meters", ge=1.0, le=10.0)
    greenhouseMode: Optional[bool] = Field(default=False, description="Enable DIHAR high-aperture greenhouse thermal mode")


class HourlyPointModel(BaseModel):
    time: str
    hour: int
    temp: float
    outdoorTemp: float
    solarRad: float
    heatFlux: float


class SimulationResponseModel(BaseModel):
    uValue: float
    indoorTempSeries: List[HourlyPointModel]
    meanIndoorTemp: float
    indoorTemp: float  # Compatibility alias
    solarGain: float
    heatLoss: float
    heatingDemand: float
    comfortPercent: float
    comfortHours: float  # Compatibility alias
    weight: float
    cost: float
    estimated: bool


class RecommendRequirementsModel(BaseModel):
    length: Optional[float] = None
    occupants: Optional[int] = None
    budget: Optional[float] = None
    weightLimit: Optional[float] = None
    minComfortPercent: Optional[float] = None
    comfort_band: Optional[List[float]] = None


class RecommendRequestModel(BaseModel):
    location: Optional[LocationCoordinatesModel] = None
    requirements: Optional[RecommendRequirementsModel] = None


class VerifyRequestModel(BaseModel):
    params: SimulationRequestModel
    location: Optional[LocationCoordinatesModel] = None


# ─── FastAPI Application Scaffold ───────────────────────────────────────────

app = FastAPI(
    title="THERMO-SHIELD API",
    description="Backend API for Climate-Aware Shelter Thermal Design and Physics Engine (SIH PS 26051)",
    version="1.0.0"
)

# CORS Middleware for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Endpoints ──────────────────────────────────────────────────────────────

@app.get("/api/ping")
def ping():
    """Keep-alive ping endpoint to prevent cold start idle sleep on Render free tier."""
    return {"status": "alive", "timestamp": datetime.now(timezone.utc).isoformat()}


@app.get("/api/health")
def health_check():
    """Health check endpoint confirming API status and physics engine availability."""
    return {
        "status": "online",
        "service": "thermo-shield-backend",
        "physicsEngineLoaded": PHYSICS_ENGINE_AVAILABLE,
        "version": "1.0.0"
    }


@app.post("/api/simulate", response_model=SimulationResponseModel)
def run_simulation(req: SimulationRequestModel):
    """
    Executes reduced-order thermal simulation for given design parameters and site climate.
    """
    print(f"\n[DIAGNOSTIC STEP 2][Backend Ingress - /api/simulate] Received Request:\n  {req.dict()}", flush=True)
    if PHYSICS_ENGINE_AVAILABLE:
        alt = req.location.altitude if req.location and req.location.altitude else 3524.0
        lat = req.location.lat if req.location else 34.1526
        lon = req.location.lon if req.location else 77.5771

        params = SimulationParams(
            shape=req.shape,
            orientation=req.orientation,
            wall_material=req.wallMaterial,
            roof_material=req.roofMaterial or "timber_insulated_roof",
            glazing_material=req.glazingMaterial or "glazing_low_e",
            insulation=req.insulation,
            opening=req.opening,
            thermal_mass=req.thermalMass,
            length=req.length,
            width=req.width,
            height=req.height,
            greenhouse_mode=bool(req.greenhouseMode),
        )

        hourly_temp = (req.location.hourly_outdoor_temp or req.location.hourlyOutdoorTemp) if req.location else None
        hourly_solar = (req.location.hourly_solar_radiation or req.location.hourlySolarRadiation) if req.location else None
        wind = req.location.wind_speed if (req.location and req.location.wind_speed) else None
        humidity = req.location.humidity_pct if (req.location and req.location.humidity_pct) else None

        climate_dict = {
            "lat": lat,
            "lon": lon,
            "altitude": alt,
            "hourly_outdoor_temp": hourly_temp,
            "hourly_solar_radiation": hourly_solar,
            "wind_speed": wind,
            "humidity_pct": humidity,
        }
        climate = _resolve_climate(climate_dict)

        result = simulate(params=params, climate=climate)

        series = [
            HourlyPointModel(
                time=pt.time,
                hour=pt.hour,
                temp=pt.temp,
                outdoorTemp=pt.outdoor_temp,
                solarRad=pt.solar_rad,
                heatFlux=pt.heat_flux
            ) for pt in result.indoor_temp_series
        ]

        resp = SimulationResponseModel(
            uValue=result.u_value,
            indoorTempSeries=series,
            meanIndoorTemp=result.mean_indoor_temp,
            indoorTemp=result.mean_indoor_temp,
            solarGain=result.solar_gain,
            heatLoss=result.heat_loss,
            heatingDemand=result.heating_demand,
            comfortPercent=result.comfort_percent,
            comfortHours=result.comfort_hours_5c,
            weight=result.weight,
            cost=result.cost,
            estimated=result.estimated
        )
        print(f"[DIAGNOSTIC STEP 4][Backend Response Construction - /api/simulate]:\n  meanTemp={resp.meanIndoorTemp}, heatLoss={resp.heatLoss}, solarGain={resp.solarGain}, heatingDemand={resp.heatingDemand}, cost={resp.cost}, weight={resp.weight}", flush=True)
        return resp

    print("[DIAGNOSTIC STEP 4][Backend FALLBACK TRIGGERED - Mock Response Used]", flush=True)
    return SimulationResponseModel(
        uValue=0.28,
        indoorTempSeries=[],
        meanIndoorTemp=6.8,
        indoorTemp=6.8,
        solarGain=218.0,
        heatLoss=-19.5,
        heatingDemand=2.7,
        comfortPercent=68.5,
        comfortHours=14.0,
        weight=4250.0,
        cost=185000.0,
        estimated=False
    )


@app.post("/api/recommend")
def recommend_designs_endpoint(req: RecommendRequestModel):
    """
    Evaluates multi-objective parameter space using the fast ML surrogate model
    to generate a Pareto-optimal set of design recommendations per docs/api-contract.md.
    """
    print(f"\n[DIAGNOSTIC STEP 2][Backend Ingress - /api/recommend] Received Request:\n  {req.dict()}", flush=True)
    if not SURROGATE_AVAILABLE:
        print("[DIAGNOSTIC STEP 2][Backend Ingress - /api/recommend] SURROGATE_AVAILABLE is FALSE! Raising 503", flush=True)
        raise HTTPException(status_code=503, detail="ML Surrogate model is currently unavailable.")

    lat = req.location.lat if req.location else 34.1526
    lon = req.location.lon if req.location else 77.5771
    alt = req.location.altitude if req.location and req.location.altitude else 3524.0
    hourly_temp = (req.location.hourly_outdoor_temp or req.location.hourlyOutdoorTemp) if req.location else None
    hourly_solar = (req.location.hourly_solar_radiation or req.location.hourlySolarRadiation) if req.location else None
    wind = req.location.wind_speed if (req.location and req.location.wind_speed) else None
    humidity = req.location.humidity_pct if (req.location and req.location.humidity_pct) else None

    climate_dict = {
        "lat": lat,
        "lon": lon,
        "altitude": alt,
        "hourly_outdoor_temp": hourly_temp,
        "hourly_solar_radiation": hourly_solar,
        "wind_speed": wind,
        "humidity_pct": humidity,
    }
    req_dict = req.requirements.dict(exclude_none=True) if req.requirements else {}

    candidates = recommend(climate=climate_dict, requirements=req_dict, top_n=6)
    print(f"[DIAGNOSTIC STEP 4][Backend Response - /api/recommend]: Generated {len(candidates)} candidates", flush=True)
    return {
        "candidates": candidates,
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


@app.post("/api/verify")
def verify_design_endpoint(req: VerifyRequestModel):
    """
    Executes high-fidelity physical simulation on a specific design and returns
    the verified physics output along with surrogate delta analysis per docs/api-contract.md.
    """
    print(f"\n[DIAGNOSTIC STEP 2][Backend Ingress - /api/verify] Received Request:\n  {req.dict()}", flush=True)
    if not SURROGATE_AVAILABLE:
        raise HTTPException(status_code=503, detail="Verification engine is currently unavailable.")

    params_dict = req.params.dict()
    lat = req.location.lat if req.location else (req.params.location.lat if req.params.location else 34.1526)
    lon = req.location.lon if req.location else (req.params.location.lon if req.params.location else 77.5771)
    alt = req.location.altitude if req.location else (req.params.location.altitude if req.params.location and req.params.location.altitude else 3524.0)

    climate_dict = {"lat": lat, "lon": lon, "altitude": alt}
    res = verify(params=params_dict, climate=climate_dict)
    print(f"[DIAGNOSTIC STEP 4][Backend Response - /api/verify]: Physics temp={res['indoorTemp']}, delta={res.get('deltaFromSurrogate')}", flush=True)
    return res


@app.on_event("startup")
def on_startup():
    """Initializes SQLite database tables and seeds default materials catalog."""
    init_db()
    seed_materials()


@app.get("/api/materials")
def get_materials(db: Session = Depends(get_db)):
    """Returns the thermophysical materials catalog from the SQLite database."""
    materials = db.query(MaterialModel).all()
    if materials:
        return [m.to_dict() for m in materials]
    # Fallback to in-memory db if database is empty
    if PHYSICS_ENGINE_AVAILABLE:
        return [
            {
                "id": m.id,
                "name": m.name,
                "category": m.category,
                "thermalConductivity": m.thermal_conductivity,
                "density": m.density,
                "specificHeat": m.specific_heat,
                "thickness": m.thickness_mm,
                "emissivity": m.emissivity,
                "solarAbsorptivity": m.solar_absorptivity,
                "pcmMeltingPoint": m.pcm_melting_point,
                "pcmLatentHeat": m.pcm_latent_heat,
                "cost": m.cost,
                "weight": m.weight,
                "carbonFactor": m.carbon_factor
            } for m in materials_db.list_all()
        ]
    return []


@app.get("/api/climate/{lat}/{lon}")
async def get_climate(lat: float, lon: float, name: Optional[str] = None):
    """
    Fetches real-time atmospheric and multi-decadal climatology data
    for coordinates via Open-Meteo & NASA POWER APIs per docs/api-contract.md.
    """
    if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lon <= 180.0):
        raise HTTPException(status_code=422, detail="Latitude must be [-90, 90] and Longitude must be [-180, 180]")
    try:
        profile = await get_climate_profile(lat, lon, name)
        return profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve climate data: {str(e)}")


@app.get("/api/risk-assessment/{lat}/{lon}")
async def get_risk_assessment(lat: float, lon: float):
    """
    Evaluates 7-factor Location-Based Disaster Risk Assessment for high-altitude/Himalayan regions:
      1. Avalanche Risk (terrain gradient, aspect, elevation, snow accumulation)
      2. GLOF Risk (Glacial Lake Outburst Flood proximity to curated glaciated lakes)
      3. Landslide Risk (slope, active tectonic thrust belt, monsoon rainfall saturation)
      4. Seismic Risk (Bureau of Indian Standards BIS IS 1893: 2016 Seismic Zone map: II to V)
      5. Extreme Cold / Frostbite Exposure Risk (NOAA / DIPAS Wind Chill Index)
      6. Snow Load Risk (structural roof load per IS 875 Part 4)
      7. Flash Flood Risk (valley drainage funnel, relief ratio, hydrology proxy)
    """
    if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lon <= 180.0):
        raise HTTPException(status_code=422, detail="Latitude must be [-90, 90] and Longitude must be [-180, 180]")
    try:
        assessment = await get_disaster_risk_assessment(lat, lon)
        return assessment
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to compute disaster risk assessment: {str(e)}")


@app.get("/api/risk-assessment")
async def get_risk_assessment_query(lat: float, lon: float):
    return await get_risk_assessment(lat, lon)



@app.get("/api/geocode")
async def search_places(q: str):
    """
    Geocodes place names using Open-Meteo geocoding service.
    """
    if not q or len(q.strip()) < 2:
        return []
    async with httpx.AsyncClient() as client:
        return await geocode_place(q.strip(), client)


@app.get("/api/locations")
def get_locations():
    """
    Returns preset Indian bioclimatic archetypes per docs/api-contract.md.
    """
    return [
        {
            "id": "leh",
            "name": "Leh, Ladakh",
            "region": "Ladakh (High Altitude Cold Desert)",
            "zone": "Cold & Arid",
            "season": "Winter (January)",
            "lat": 34.1526,
            "lon": 77.5771,
            "altitude": 3524
        },
        {
            "id": "jaisalmer",
            "name": "Jaisalmer, Rajasthan",
            "region": "Thar Desert",
            "zone": "Hot & Dry",
            "season": "Winter / Design Day",
            "lat": 26.9157,
            "lon": 70.9083,
            "altitude": 225
        },
        {
            "id": "delhi",
            "name": "New Delhi, NCR",
            "region": "Indo-Gangetic Plain",
            "zone": "Composite",
            "season": "Winter (January)",
            "lat": 28.6139,
            "lon": 77.2090,
            "altitude": 216
        },
        {
            "id": "kochi",
            "name": "Kochi, Kerala",
            "region": "Malabar Coast",
            "zone": "Warm & Humid",
            "season": "Annual Tropical",
            "lat": 9.9312,
            "lon": 76.2673,
            "altitude": 4
        },
        {
            "id": "srinagar",
            "name": "Srinagar, Kashmir",
            "region": "Kashmir Valley",
            "zone": "Cold & Cloudy",
            "season": "Winter (January)",
            "lat": 34.0837,
            "lon": 74.7973,
            "altitude": 1585
        }
    ]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

