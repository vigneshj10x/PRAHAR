"""
simulation-engine/validation/fluent/__init__.py

ANSYS Fluent Offline Validation Module for THERMO-SHIELD.
Uses PyFluent (ansys-fluent-core) to validate the reduced-order RC thermal
model against full 3D Navier-Stokes CFD simulations.
"""

from .fluent_geometry_builder import build_shelter_geometry
from .fluent_boundary_conditions import apply_boundary_conditions
from .fluent_runner import run_fluent_simulation, FluentResult
from .fluent_comparator import compare, generate_report, ComparisonResult
from .validation_cases import VALIDATION_CASES, ValidationCase, DesignParams

__all__ = [
    "build_shelter_geometry",
    "apply_boundary_conditions",
    "run_fluent_simulation",
    "FluentResult",
    "compare",
    "generate_report",
    "ComparisonResult",
    "VALIDATION_CASES",
    "ValidationCase",
    "DesignParams",
]
