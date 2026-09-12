# -*- coding: utf-8 -*-
"""
simulation_engine/optimization

Multi-objective optimization package for THERMO-SHIELD.
Provides the public `optimize` function running NSGA-II search over envelope designs.
"""

from .optimizer import optimize
from .problem import ThermoShieldProblem

__all__ = ["optimize", "ThermoShieldProblem"]
