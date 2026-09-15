# -*- coding: utf-8 -*-
"""
simulation_engine/optimization/problem.py

ThermoShieldProblem – Pymoo multi-objective optimization problem definition
for high-altitude and extreme-climate thermal shelter envelopes.

Objectives:
  1. Minimize: heat loss magnitude (|heatLoss|, W/m²)
  2. Minimize: auxiliary heating demand (heatingDemand, kWh/day)
  3. Minimize: envelope construction cost (cost, INR ₹)
  4. Minimize: deployment mass (weight, kg)
  5. Maximize: thermal comfort percentage (comfortPercent, 18°C - 24°C)
  6. Maximize: useful solar gain (solarGain penalized for overheating > 24°C)

Constraints (G <= 0 is feasible):
  1. Deployment weight limit: weight <= max_weight
  2. Budget ceiling: cost <= max_cost
  3. Overheating protection: max_indoor_temp <= comfort_max_temp (default 24.0°C)
  4. Thermal comfort lower bound: mean_indoor_temp >= comfort_min_temp
     (or comfortPercent >= min_comfort_percent if specified)

Decision Variables (matching Phase 7 parametric space):
  - Envelope shape: rectangular, semidome, aframe
  - Azimuthal orientation: 0° to 360° (continuous)
  - Wall material: adobe, stone, concrete, aac_block, composite, insulated_panel, pcm_enhanced_panel
  - Roof material: timber_insulated_roof, insulated_panel, composite
  - Insulation thickness: 25 mm to 250 mm (continuous)
  - South window aperture: 5% to 30% (continuous)
  - Thermal mass capacity: low, medium, high
  - Geometry (length, width, height): fixed from requirements or bounded
"""

from typing import Dict, Any, List, Optional
import numpy as np
from pymoo.core.problem import ElementwiseProblem

from simulation_engine.engine import (
    simulate,
    SimulationParams,
    ClimateInput,
    SimulationResult,
)
from simulation_engine.geometry import ALL_SHAPES, calculate_geometry

# Categorical design options from Phase 7 parametric space (25 architectural shapes)
SHAPES: List[str] = ALL_SHAPES
WALL_MATERIALS: List[str] = [
    "adobe",
    "stone",
    "concrete",
    "aac_block",
    "composite",
    "insulated_panel",
    "pcm_enhanced_panel",
]
ROOF_MATERIALS: List[str] = [
    "timber_insulated_roof",
    "insulated_panel",
    "composite",
]
THERMAL_MASS_OPTIONS: List[str] = ["low", "medium", "high"]


class ThermoShieldProblem(ElementwiseProblem):
    """
    Pymoo ElementwiseProblem for NSGA-II multi-objective shelter optimization.
    Evaluates solutions against the reduced-order transient RC thermal solver.
    """

    def __init__(
        self,
        climate: ClimateInput,
        requirements: Optional[Dict[str, Any]] = None,
        use_live: bool = True,
    ):
        self.climate = climate
        self.requirements = requirements or {}
        self.use_live = use_live

        # Parse constraints from requirements (non-hardcoded)
        self.max_weight: Optional[float] = (
            self.requirements.get("max_weight")
            or self.requirements.get("weightLimit")
            or self.requirements.get("weight_limit")
        )
        self.max_cost: Optional[float] = (
            self.requirements.get("max_cost")
            or self.requirements.get("budget")
            or self.requirements.get("maxCost")
        )

        # Comfort band parameters (Phase 6 standard: 18.0°C to 24.0°C)
        comfort_band = self.requirements.get("comfort_band")
        if comfort_band and len(comfort_band) >= 2:
            self.comfort_min_temp = float(comfort_band[0])
            self.comfort_max_temp = float(comfort_band[1])
        else:
            self.comfort_min_temp = (
                float(self.requirements["comfort_min_temp"])
                if "comfort_min_temp" in self.requirements
                else (
                    float(self.requirements["min_temp"])
                    if "min_temp" in self.requirements
                    else None
                )
            )
            self.comfort_max_temp = float(
                self.requirements.get(
                    "comfort_max_temp",
                    self.requirements.get("max_temp", 24.0),
                )
            )

        self.min_comfort_percent: Optional[float] = (
            self.requirements.get("min_comfort_percent")
            or self.requirements.get("comfort_threshold")
            or self.requirements.get("minComfortPercent")
        )

        # Geometry bounds (fixed if specified in requirements, else searchable)
        req_len = self.requirements.get("length")
        req_wid = self.requirements.get("width")
        req_hgt = self.requirements.get("height")

        len_lb = float(req_len) if req_len else 4.0
        len_ub = float(req_len) if req_len else 8.0
        wid_lb = float(req_wid) if req_wid else 3.0
        wid_ub = float(req_wid) if req_wid else 5.0
        hgt_lb = float(req_hgt) if req_hgt else 2.2
        hgt_ub = float(req_hgt) if req_hgt else 3.0

        # Decision vector lower and upper bounds (10 variables)
        xl = np.array([
            0.0,                        # 0: Shape index [0..len(SHAPES)-1]
            0.0,                        # 1: Orientation (0° to 360°)
            0.0,                        # 2: Wall material index
            0.0,                        # 3: Roof material index
            25.0,                       # 4: Insulation thickness (mm, 25 to 250)
            5.0,                        # 5: South opening ratio (%, 5 to 30)
            0.0,                        # 6: Thermal mass index [0..2]
            len_lb,                     # 7: Length (m)
            wid_lb,                     # 8: Width (m)
            hgt_lb,                     # 9: Height (m)
        ], dtype=float)

        xu = np.array([
            float(len(SHAPES) - 1),
            360.0,
            float(len(WALL_MATERIALS) - 1),
            float(len(ROOF_MATERIALS) - 1),
            250.0,
            30.0,
            float(len(THERMAL_MASS_OPTIONS) - 1),
            len_ub,
            wid_ub,
            hgt_ub,
        ], dtype=float)

        # 6 objectives, 4 constraints
        super().__init__(n_var=10, n_obj=6, n_constr=4, xl=xl, xu=xu)

    def _decode(self, x: np.ndarray) -> Dict[str, Any]:
        """Maps continuous optimization vector into concrete design parameters."""
        shape_idx = int(np.clip(np.round(x[0]), 0, len(SHAPES) - 1))
        wall_idx = int(np.clip(np.round(x[2]), 0, len(WALL_MATERIALS) - 1))
        roof_idx = int(np.clip(np.round(x[3]), 0, len(ROOF_MATERIALS) - 1))
        mass_idx = int(np.clip(np.round(x[6]), 0, len(THERMAL_MASS_OPTIONS) - 1))

        return {
            "shape": SHAPES[shape_idx],
            "orientation": float(np.round(x[1], 1)),
            "wallMaterial": WALL_MATERIALS[wall_idx],
            "roofMaterial": ROOF_MATERIALS[roof_idx],
            "insulation": float(np.round(x[4], 1)),
            "opening": float(np.round(x[5], 1)),
            "thermalMass": THERMAL_MASS_OPTIONS[mass_idx],
            "length": float(np.round(x[7], 2)),
            "width": float(np.round(x[8], 2)),
            "height": float(np.round(x[9], 2)),
        }

    def _evaluate(self, x, out, *args, **kwargs):
        """Evaluates design candidates via the transient physics solver."""
        params_dict = self._decode(x)

        sim_params = SimulationParams(
            shape=params_dict["shape"],
            orientation=params_dict["orientation"],
            wall_material=params_dict["wallMaterial"],
            roof_material=params_dict["roofMaterial"],
            insulation=params_dict["insulation"],
            opening=params_dict["opening"],
            thermal_mass=params_dict["thermalMass"],
            length=params_dict["length"],
            width=params_dict["width"],
            height=params_dict["height"],
        )

        result: SimulationResult = simulate(params=sim_params, climate=self.climate)

        # ─── OBJECTIVES (Pymoo minimizes all F) ───────────────────────────────
        # 1. Minimize heat loss magnitude (|heatLoss|, W/m²)
        f_heat_loss = abs(result.heat_loss)

        # 2. Minimize heating demand (kWh/day for 18°C setpoint)
        f_heating_demand = result.heating_demand

        # 3. Minimize envelope fabrication cost (INR ₹)
        f_cost = result.cost

        # 4. Minimize envelope total weight (kg)
        f_weight = result.weight

        # 5. Maximize thermal comfort percentage (18°C - 24°C band) -> minimize -comfort
        f_comfort = -result.comfort_percent

        # 6. Maximize useful solar gain (W/m²).
        # Solar gain is beneficial for winter heating, but excessive solar irradiance
        # that drives peak temperature beyond the 24°C comfort limit causes unwanted
        # overheating. We apply an overheating penalty for excursions above 24°C.
        overheat_penalty = max(0.0, result.max_indoor_temp - self.comfort_max_temp) * 1.5
        useful_solar_gain = max(0.0, result.solar_gain - overheat_penalty)
        f_solar = -useful_solar_gain

        out["F"] = [
            f_heat_loss,
            f_heating_demand,
            f_cost,
            f_weight,
            f_comfort,
            f_solar,
        ]

        # ─── CONSTRAINTS (G <= 0 is feasible in Pymoo) ────────────────────────
        # Constraint 1: Deployment weight limit
        g_weight = 0.0
        if self.max_weight is not None and self.max_weight > 0:
            g_weight = (result.weight - self.max_weight) / max(1.0, self.max_weight)

        # Constraint 2: Budget limit
        g_cost = 0.0
        if self.max_cost is not None and self.max_cost > 0:
            g_cost = (result.cost - self.max_cost) / max(1.0, self.max_cost)

        # Constraint 3: Overheating protection (max indoor temp <= comfort_max_temp)
        g_temp_max = result.max_indoor_temp - self.comfort_max_temp

        # Constraint 4: Thermal comfort lower bound / min comfort percent
        g_temp_min = 0.0
        if self.min_comfort_percent is not None and self.min_comfort_percent > 0:
            g_temp_min = (self.min_comfort_percent - result.comfort_percent) / 100.0
        elif self.comfort_min_temp is not None:
            g_temp_min = self.comfort_min_temp - result.mean_indoor_temp

        out["G"] = [g_weight, g_cost, g_temp_max, g_temp_min]
