"""
simulation-engine

Reduced-order physics simulation engine for THERMO-SHIELD.
"""
from engine import simulate, SimulationParams, SimulationResult, ClimateInput, HourlyPoint
from materials import materials_db, Material
from geometry import calculate_geometry, EnvelopeGeometry

__all__ = [
    "simulate",
    "SimulationParams",
    "SimulationResult",
    "ClimateInput",
    "HourlyPoint",
    "materials_db",
    "Material",
    "calculate_geometry",
    "EnvelopeGeometry"
]
