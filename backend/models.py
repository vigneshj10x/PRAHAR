"""
backend/models.py

SQLAlchemy 2.0 Database Models for THERMO-SHIELD:
  1. MaterialModel: Thermophysical materials catalog (including Phase Change Materials).
  2. ClimateCacheModel: Persistent spatial climate cache for Open-Meteo + NASA POWER telemetry.
  3. SimulationRunModel: Persistent telemetry log for design evaluations.
"""

from datetime import datetime, timezone
from typing import Optional
from sqlalchemy import String, Float, Integer, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from backend.database import Base


def utc_now() -> datetime:
    """Returns current timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


class MaterialModel(Base):
    """
    Thermophysical materials definition table matching docs/api-contract.md.
    """
    __tablename__ = "materials"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False, index=True)  # wall | roof | insulation | glazing | pcm
    thermal_conductivity: Mapped[float] = mapped_column(Float, nullable=False)       # W/(m·K)
    density: Mapped[float] = mapped_column(Float, nullable=False)                    # kg/m³
    specific_heat: Mapped[float] = mapped_column(Float, nullable=False)              # J/(kg·K)
    thickness: Mapped[float] = mapped_column(Float, nullable=False)                  # mm
    emissivity: Mapped[float] = mapped_column(Float, nullable=False)                 # 0.0 to 1.0
    solar_absorptivity: Mapped[float] = mapped_column(Float, nullable=False)         # 0.0 to 1.0
    pcm_melting_point: Mapped[Optional[float]] = mapped_column(Float, nullable=True) # °C (if PCM, else None)
    pcm_latent_heat: Mapped[Optional[float]] = mapped_column(Float, nullable=True)   # kJ/kg (if PCM, else None)
    cost: Mapped[float] = mapped_column(Float, nullable=False)                       # INR ₹ / m²
    weight: Mapped[float] = mapped_column(Float, nullable=False)                     # kg / m²
    carbon_factor: Mapped[Optional[float]] = mapped_column(Float, nullable=True)     # kgCO2e / kg
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    deployment_compatibility: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="[]")
    shelter_type_compatibility: Mapped[Optional[str]] = mapped_column(Text, nullable=True, default="[]")

    def to_dict(self):
        """Converts model to dictionary matching API contract schema."""
        import json
        deploy = []
        if self.deployment_compatibility:
            try:
                deploy = json.loads(self.deployment_compatibility)
            except Exception:
                deploy = [d.strip() for d in self.deployment_compatibility.split(",") if d.strip()]

        shelter_types = []
        if self.shelter_type_compatibility:
            try:
                shelter_types = json.loads(self.shelter_type_compatibility)
            except Exception:
                shelter_types = [s.strip() for s in self.shelter_type_compatibility.split(",") if s.strip()]

        return {
            "id": self.id,
            "name": self.name,
            "category": self.category,
            "thermalConductivity": self.thermal_conductivity,
            "density": self.density,
            "specificHeat": self.specific_heat,
            "thickness": self.thickness,
            "emissivity": self.emissivity,
            "solarAbsorptivity": self.solar_absorptivity,
            "pcmMeltingPoint": self.pcm_melting_point,
            "pcmLatentHeat": self.pcm_latent_heat,
            "cost": self.cost,
            "weight": self.weight,
            "carbonFactor": self.carbon_factor,
            "description": self.description,
            "deploymentCompatibility": deploy,
            "shelterTypeCompatibility": shelter_types,
        }


class ClimateCacheModel(Base):
    """
    Persistent spatial cache for merged Open-Meteo and NASA POWER climate profiles.
    Keyed by rounded coordinates (0.001 deg ~110m spatial resolution).
    """
    __tablename__ = "climate_cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)
    lat_round: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    lon_round: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    location_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    profile_json: Mapped[str] = mapped_column(Text, nullable=False)  # Complete JSON payload
    source: Mapped[str] = mapped_column(String(64), nullable=False)  # merged | open-meteo | nasa-power | fallback
    fetched_at: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)


class SimulationRunModel(Base):
    """
    Historical log of executed shelter thermal simulations.
    """
    __tablename__ = "simulation_runs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, index=True)
    params_json: Mapped[str] = mapped_column(Text, nullable=False)
    results_json: Mapped[str] = mapped_column(Text, nullable=False)
    location_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)


class RiskCacheModel(Base):
    """
    Persistent spatial cache for Location-Based Disaster Risk Assessments.
    Keyed by rounded coordinates (0.001 deg ~110m resolution).
    Has effectively permanent TTL since terrain topography and seismic classifications do not change.
    """
    __tablename__ = "risk_cache"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lon: Mapped[float] = mapped_column(Float, nullable=False)
    lat_round: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    lon_round: Mapped[float] = mapped_column(Float, nullable=False, index=True)
    assessment_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, onupdate=utc_now)

