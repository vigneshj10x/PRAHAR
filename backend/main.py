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
from backend.climate import get_climate_profile, geocode_place, fetch_future_climate_projection
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
    shelterPurpose: Optional[str] = Field(default="troop_habitation", description="Operational purpose")
    shelterPermanence: Optional[str] = Field(default="semi_permanent", description="hasty | semi_permanent | permanent")
    deploymentMethod: Optional[str] = Field(default="road_bound", description="road_bound | heliborne | porter_carried")
    hardening: Optional[str] = Field(default="non_ballistic", description="non_ballistic | small_arms | artillery_hardened")
    buildStartDate: Optional[str] = Field(default=None, description="ISO date string e.g. 2028-03-01")
    buildDurationYears: Optional[int] = Field(default=1, description="Operational duration in years")
    availableMaterials: Optional[List[str]] = Field(default_factory=list, description="Array of available material IDs")
    shelterType: Optional[str] = Field(default=None, description="Specific military shelter type ID")


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
    maxPanelWeightKgM2: Optional[float] = None
    comfortMinC: Optional[float] = None
    comfortMaxC: Optional[float] = None
    estimated: bool


class RecommendRequirementsModel(BaseModel):
    length: Optional[float] = None
    occupants: Optional[int] = None
    budget: Optional[float] = None
    weightLimit: Optional[float] = None
    minComfortPercent: Optional[float] = None
    comfort_band: Optional[List[float]] = None
    shelterPurpose: Optional[str] = None
    shelterPermanence: Optional[str] = None
    deploymentMethod: Optional[str] = None
    hardening: Optional[str] = None
    buildStartDate: Optional[str] = None
    buildDurationYears: Optional[int] = None
    availableMaterials: Optional[List[str]] = None
    shelterType: Optional[str] = None
    # Snake-case aliases
    shelter_purpose: Optional[str] = None
    shelter_permanence: Optional[str] = None
    deployment_method: Optional[str] = None
    build_start_date: Optional[str] = None
    build_duration_years: Optional[int] = None
    available_materials: Optional[List[str]] = None


class RecommendRequestModel(BaseModel):
    location: Optional[LocationCoordinatesModel] = None
    requirements: Optional[RecommendRequirementsModel] = None
    shelterPurpose: Optional[str] = None
    shelterPermanence: Optional[str] = None
    deploymentMethod: Optional[str] = None
    hardening: Optional[str] = None
    buildStartDate: Optional[str] = None
    buildDurationYears: Optional[int] = None
    availableMaterials: Optional[List[str]] = None
    shelterType: Optional[str] = None


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
            shelter_purpose=req.shelterPurpose or "troop_habitation",
            shelter_permanence=req.shelterPermanence or "semi_permanent",
            deployment_method=req.deploymentMethod or "road_bound",
            hardening=req.hardening or "non_ballistic",
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
            maxPanelWeightKgM2=result.max_panel_weight_kg_m2,
            comfortMinC=result.comfort_min_c,
            comfortMaxC=result.comfort_max_c,
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
async def recommend_designs_endpoint(req: RecommendRequestModel):
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

    # Merge top-level fields into req_dict
    for f in [
        "shelterPurpose", "shelterPermanence", "deploymentMethod", "hardening",
        "buildStartDate", "buildDurationYears", "availableMaterials", "shelterType"
    ]:
        val = getattr(req, f, None)
        if val is not None and f not in req_dict:
            req_dict[f] = val

    # Future climate projection check (CMIP6 if buildStartDate > 90 days out)
    build_start_date = req_dict.get("buildStartDate") or req_dict.get("build_start_date")
    build_duration = req_dict.get("buildDurationYears") or req_dict.get("build_duration_years") or 5
    climate_source = "open-meteo"
    climate_disclaimer = None

    if build_start_date:
        try:
            clean_date_str = str(build_start_date).replace("Z", "+00:00")
            if "T" in clean_date_str:
                start_dt = datetime.fromisoformat(clean_date_str)
            else:
                start_dt = datetime.fromisoformat(clean_date_str + "T00:00:00+00:00")
            now_dt = datetime.now(timezone.utc)
            days_out = (start_dt.date() - now_dt.date()).days
            if days_out > 90:
                future_proj = await fetch_future_climate_projection(
                    lat=lat,
                    lon=lon,
                    build_start_date=clean_date_str[:10],
                    build_duration_years=int(build_duration)
                )
                climate_dict["hourly_outdoor_temp"] = future_proj.get("hourlyOutdoorTemp")
                climate_dict["hourly_solar_radiation"] = future_proj.get("hourlySolarRadiation")
                climate_source = future_proj.get("source", "open-meteo-cmip6")
                climate_disclaimer = (
                    f"CMIP6 climate projection applied ({climate_source}). "
                    f"Worst-case month: {future_proj.get('worst_month', '')} over {build_duration}-year timeline."
                )
        except Exception as e:
            print(f"[Backend Climate Projection Warning]: {e}", flush=True)

    candidates = recommend(climate=climate_dict, requirements=req_dict, top_n=6)
    print(f"[DIAGNOSTIC STEP 4][Backend Response - /api/recommend]: Generated {len(candidates)} candidates", flush=True)
    return {
        "candidates": candidates,
        "climateSource": climate_source,
        "climateDisclaimer": climate_disclaimer,
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


MILITARY_SHELTER_TYPES = [
    {
        "id": "puf_barracks",
        "name": "PUF Panel Barracks",
        "description": "Polyurethane foam insulated panelized shelter for modular semi-permanent to permanent troop quartering.",
        "typicalDeployment": ["road_bound"],
        "typicalPermanence": ["semi_permanent", "permanent"],
        "typicalPurposes": ["troop_habitation"],
        "typicalMaterials": ["puf_sandwich_panel", "eps_insulation", "timber_insulated_roof"],
        "erectionTime": "1-4 weeks",
        "tempRating": "-35°C to +45°C",
        "weightClass": "medium"
    },
    {
        "id": "fems",
        "name": "Fast Erectable Modular Shelter (FEMS)",
        "description": "Ultra-lightweight interlocking composite panel system for rapid cold-weather forward deployment.",
        "typicalDeployment": ["road_bound", "heliborne", "porter_carried"],
        "typicalPermanence": ["semi_permanent", "permanent"],
        "typicalPurposes": ["troop_habitation", "command_post_c4i", "medical_facility"],
        "typicalMaterials": ["fems_composite_panel", "aerogel_insulation"],
        "erectionTime": "4-12 hours",
        "tempRating": "-40°C to +50°C",
        "weightClass": "lightweight"
    },
    {
        "id": "tactical_tent",
        "name": "Tactical AirBeam / DRASH Tent",
        "description": "Inflatable high-pressure arch or rapid-truss expeditionary fabric shelter for hasty deployment.",
        "typicalDeployment": ["road_bound", "heliborne", "porter_carried"],
        "typicalPermanence": ["hasty"],
        "typicalPurposes": ["troop_habitation", "medical_facility", "command_post_c4i"],
        "typicalMaterials": ["tactical_fabric_pvc", "aerogel_insulation"],
        "erectionTime": "30-90 minutes",
        "tempRating": "-30°C to +45°C",
        "weightClass": "ultra_light"
    },
    {
        "id": "container_shelter",
        "name": "ISO Tactical Container Shelter",
        "description": "Hard-walled, expandable 20ft ISO container shelter outfitted with integrated thermal and ballistic lining.",
        "typicalDeployment": ["road_bound", "heliborne"],
        "typicalPermanence": ["semi_permanent", "permanent"],
        "typicalPurposes": ["command_post_c4i", "medical_facility", "maintenance_hangar", "logistics_storage"],
        "typicalMaterials": ["galvanized_steel_sheet", "puf_sandwich_panel", "rockwool_insulation"],
        "erectionTime": "1-2 hours",
        "tempRating": "-40°C to +55°C",
        "weightClass": "heavy"
    },
    {
        "id": "hardened_bunker",
        "name": "Artillery-Hardened Defense Bunker",
        "description": "Subterranean or berm-protected reinforced concrete structure with 1.5m overhead earth cover for maximum ballistic and blast survival.",
        "typicalDeployment": ["road_bound"],
        "typicalPermanence": ["permanent"],
        "typicalPurposes": ["command_post_c4i", "ammunition_storage", "troop_habitation"],
        "typicalMaterials": ["concrete", "stone", "aerogel_insulation"],
        "erectionTime": "4-12 weeks",
        "tempRating": "-50°C to +40°C",
        "weightClass": "extra_heavy"
    },
    {
        "id": "lams_hangar",
        "name": "Large Area Maintenance Shelter (LAMS)",
        "description": "Tensioned arch-frame hangar for aircraft, drone maintenance, vehicle repair, and large equipment logistics.",
        "typicalDeployment": ["road_bound"],
        "typicalPermanence": ["semi_permanent", "permanent"],
        "typicalPurposes": ["maintenance_hangar", "logistics_storage"],
        "typicalMaterials": ["galvanized_steel_sheet", "tactical_fabric_pvc", "rockwool_insulation"],
        "erectionTime": "1-2 weeks",
        "tempRating": "-30°C to +45°C",
        "weightClass": "medium_heavy"
    },
    {
        "id": "observation_post",
        "name": "Forward Observation Post (OP)",
        "description": "Compact high-altitude observation redoubt designed for porter-pack or heli-lift transport to mountain ridges.",
        "typicalDeployment": ["porter_carried", "heliborne", "road_bound"],
        "typicalPermanence": ["semi_permanent", "permanent"],
        "typicalPurposes": ["command_post_c4i", "troop_habitation"],
        "typicalMaterials": ["fems_composite_panel", "aerogel_insulation"],
        "erectionTime": "2-6 hours",
        "tempRating": "-45°C to +35°C",
        "weightClass": "lightweight"
    }
]


@app.get("/api/shelter-types")
def get_shelter_types(purpose: Optional[str] = None):
    """Returns catalog of standard DRDO military shelter types, optionally filtered by purpose."""
    if purpose:
        return [st for st in MILITARY_SHELTER_TYPES if purpose in st.get("typicalPurposes", [])]
    return MILITARY_SHELTER_TYPES


@app.get("/api/materials")
def get_materials(deploymentMethod: Optional[str] = None, db: Session = Depends(get_db)):
    """Returns the thermophysical materials catalog from the SQLite database, optionally filtered by deployment method."""
    materials = db.query(MaterialModel).all()
    if materials:
        results = [m.to_dict() for m in materials]
    elif PHYSICS_ENGINE_AVAILABLE:
        results = [
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
                "carbonFactor": m.carbon_factor,
                "description": getattr(m, "description", ""),
                "deploymentCompatibility": list(getattr(m, "deployment_compatibility", [])),
                "shelterTypeCompatibility": list(getattr(m, "shelter_type_compatibility", [])),
            } for m in materials_db.list_all()
        ]
    else:
        results = []

    if deploymentMethod:
        results = [
            m for m in results
            if not m.get("deploymentCompatibility") or deploymentMethod in m.get("deploymentCompatibility", [])
        ]
    return results


@app.get("/api/climate/{lat}/{lon}")
async def get_climate(
    lat: float,
    lon: float,
    name: Optional[str] = None,
    buildStartDate: Optional[str] = None,
    buildDurationYears: int = 1
):
    """
    Fetches real-time atmospheric and multi-decadal climatology data
    for coordinates via Open-Meteo & NASA POWER APIs per docs/api-contract.md.
    If buildStartDate > 90 days in future, returns Open-Meteo CMIP6 projection.
    """
    if not (-90.0 <= lat <= 90.0) or not (-180.0 <= lon <= 180.0):
        raise HTTPException(status_code=422, detail="Latitude must be [-90, 90] and Longitude must be [-180, 180]")
    try:
        profile = await get_climate_profile(
            lat=lat,
            lon=lon,
            location_name=name,
            build_start_date=buildStartDate,
            build_duration_years=buildDurationYears
        )
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

