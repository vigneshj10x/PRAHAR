# -*- coding: utf-8 -*-
"""
simulation_engine/surrogate

ML Surrogate module for THERMO-SHIELD.
Provides sub-millisecond simulation approximation, fast multi-objective design recommendation,
and high-fidelity physics verification with surrogate error delta analysis.
"""

from .model import SurrogateModel, get_surrogate
from .pipeline import recommend, verify

__all__ = [
    "SurrogateModel",
    "get_surrogate",
    "recommend",
    "verify",
]
