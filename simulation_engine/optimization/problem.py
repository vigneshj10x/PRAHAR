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
  5. Maximize: thermal comfort percentage (comfortPercent)
  6. Maximize: useful solar gain (solarGain penalized for overheating)

Constraints (G <= 0 is feasible):
  1. Deployment weight limit: weight <= max_weight
  2. Budget ceiling: cost <= max_cost
  3. Overheating protection: max_indoor_temp <= comfort_max_temp
  4. Thermal comfort lower bound: mean_indoor_temp >= comfort_min_temp
  5. Max panel weight limit: max(wall_weight, roof_weight) <= max_panel_weight
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
from simulation_engine.materials import materials_db

# Categorical design options from Phase 7 parametric space (25 architectural shapes)
SHAPES: List[str] = ALL_SHAPES
THERMAL_MASS_OPTIONS: List[str] = ["low", "medium", "high"]

PURPOSE_COMFORT_BANDS: Dict[str, tuple] = {
    "troop_habitation": (18.0, 24.0),
    "command_post_c4i": (18.0, 22.0),
    "ammunition_storage": (5.0, 25.0),
    "medical_facility": (20.0, 24.0),
    "maintenance_hangar": (10.0, 20.0),
    "logistics_storage": (5.0, 15.0),
}

DEPLOYMENT_MAX_PANEL_WEIGHT: Dict[str, float] = {
    "road_bound": 999.0,
    "heliborne": 30.0,
    "porter_carried": 8.0,
}


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

        # Operational parameters
        self.shelter_purpose = (
            self.requirements.get("shelter_purpose")
            or self.requirements.get("shelterPurpose")
            or "troop_habitation"
        )
        self.shelter_permanence = (
            self.requirements.get("shelter_permanence")
            or self.requirements.get("shelterPermanence")
            or "semi_permanent"
        )
        self.deployment_method = (
            self.requirements.get("deployment_method")
            or self.requirements.get("deploymentMethod")
            or "road_bound"
        )
        self.hardening = (
            self.requirements.get("hardening")
            or "non_ballistic"
        )
        self.max_panel_weight = DEPLOYMENT_MAX_PANEL_WEIGHT.get(self.deployment_method, 999.0)

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

        # Comfort band parameters:
        comfort_band = self.requirements.get("comfort_band")
        if comfort_band and len(comfort_band) >= 2:
            self.comfort_min_temp = float(comfort_band[0])
            self.comfort_max_temp = float(comfort_band[1])
        elif "comfort_min_temp" in self.requirements:
            self.comfort_min_temp = float(self.requirements["comfort_min_temp"])
            self.comfort_max_temp = float(self.requirements.get("comfort_max_temp", 24.0))
        elif "min_temp" in self.requirements:
            self.comfort_min_temp = float(self.requirements["min_temp"])
            self.comfort_max_temp = float(self.requirements.get("max_temp", 24.0))
        else:
            self.comfort_min_temp = None
            p_min, p_max = PURPOSE_COMFORT_BANDS.get(self.shelter_purpose, (18.0, 24.0))
            self.comfort_max_temp = float(self.requirements.get("comfort_max_temp", self.requirements.get("max_temp", p_max)))

        self.min_comfort_percent: Optional[float] = (
            self.requirements.get("min_comfort_percent")
            or self.requirements.get("comfort_threshold")
            or self.requirements.get("minComfortPercent")
        )

        # Determine allowed materials based on available_materials and deployment weight limits
        raw_available = (
            self.requirements.get("available_materials")
            or self.requirements.get("availableMaterials")
            or []
        )
        all_materials = materials_db.list_all()

        valid_wall_ids = [
            m.id for m in all_materials
            if (m.category in ("wall", "envelope") or m.id in [
                "tactical_fabric_pvc", "fems_composite_panel", "puf_sandwich_panel",
                "eps_sandwich_panel", "concrete", "stone", "adobe",
                "galvanized_steel_sheet", "composite", "insulated_panel"
            ])
            and m.weight <= self.max_panel_weight
            and (not m.deployment_compatibility or self.deployment_method in m.deployment_compatibility)
            and (not m.shelter_type_compatibility or self.shelter_purpose in m.shelter_type_compatibility)
        ]

        valid_roof_ids = [
            m.id for m in all_materials
            if (m.category in ("roof", "envelope") or m.id in [
                "timber_insulated_roof", "fems_composite_panel", "tactical_fabric_pvc",
                "puf_sandwich_panel", "eps_sandwich_panel", "galvanized_steel_sheet",
                "composite", "insulated_panel"
            ])
            and m.weight <= self.max_panel_weight
            and (not m.deployment_compatibility or self.deployment_method in m.deployment_compatibility)
            and (not m.shelter_type_compatibility or self.shelter_purpose in m.shelter_type_compatibility)
        ]

        if raw_available:
            self.wall_materials = [mid for mid in valid_wall_ids if mid in raw_available]
            self.roof_materials = [mid for mid in valid_roof_ids if mid in raw_available]
        else:
            self.wall_materials = valid_wall_ids
            self.roof_materials = valid_roof_ids

        if not self.wall_materials:
            raise ValueError(
                f"No compatible wall materials available for deployment={self.deployment_method}, "
                f"available={raw_available}"
            )
        if not self.roof_materials:
            raise ValueError(
                f"No compatible roof materials available for deployment={self.deployment_method}, "
                f"available={raw_available}"
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
            0.0,                                    # 0: Shape index [0..len(SHAPES)-1]
            0.0,                                    # 1: Orientation (0° to 360°)
            0.0,                                    # 2: Wall material index
            0.0,                                    # 3: Roof material index
            25.0,                                   # 4: Insulation thickness (mm, 25 to 250)
            5.0,                                    # 5: South opening ratio (%, 5 to 30)
            0.0,                                    # 6: Thermal mass index [0..2]
            len_lb,                                 # 7: Length (m)
            wid_lb,                                 # 8: Width (m)
            hgt_lb,                                 # 9: Height (m)
        ], dtype=float)

        xu = np.array([
            float(len(SHAPES) - 1),
            360.0,
            float(len(self.wall_materials) - 1),
            float(len(self.roof_materials) - 1),
            250.0,
            30.0,
            float(len(THERMAL_MASS_OPTIONS) - 1),
            len_ub,
            wid_ub,
            hgt_ub,
        ], dtype=float)

        # 6 objectives, 5 constraints
        super().__init__(n_var=10, n_obj=6, n_constr=5, xl=xl, xu=xu)

    def _decode(self, x: np.ndarray) -> Dict[str, Any]:
        """Maps continuous optimization vector into concrete design parameters."""
        shape_idx = int(np.clip(np.round(x[0]), 0, len(SHAPES) - 1))
        wall_idx = int(np.clip(np.round(x[2]), 0, len(self.wall_materials) - 1))
        roof_idx = int(np.clip(np.round(x[3]), 0, len(self.roof_materials) - 1))
        mass_idx = int(np.clip(np.round(x[6]), 0, len(THERMAL_MASS_OPTIONS) - 1))

        return {
            "shape": SHAPES[shape_idx],
            "orientation": float(np.round(x[1], 1)),
            "wallMaterial": self.wall_materials[wall_idx],
            "roofMaterial": self.roof_materials[roof_idx],
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
        wall_mat = materials_db.get(params_dict["wallMaterial"])
        roof_mat = materials_db.get(params_dict["roofMaterial"])

        # Compatibility check: deployment
        if wall_mat and wall_mat.deployment_compatibility:
            if self.deployment_method not in wall_mat.deployment_compatibility:
                out["F"] = [1e6, 1e6, 1e6, 1e6, 1e6, 0.0]
                out["G"] = [10.0, 10.0, 10.0, 10.0, 10.0]
                return
        if roof_mat and roof_mat.deployment_compatibility:
            if self.deployment_method not in roof_mat.deployment_compatibility:
                out["F"] = [1e6, 1e6, 1e6, 1e6, 1e6, 0.0]
                out["G"] = [10.0, 10.0, 10.0, 10.0, 10.0]
                return

        # Compatibility check: shelter purpose
        if wall_mat and wall_mat.shelter_type_compatibility:
            if self.shelter_purpose not in wall_mat.shelter_type_compatibility:
                out["F"] = [1e6, 1e6, 1e6, 1e6, 1e6, 0.0]
                out["G"] = [10.0, 10.0, 10.0, 10.0, 10.0]
                return
        if roof_mat and roof_mat.shelter_type_compatibility:
            if self.shelter_purpose not in roof_mat.shelter_type_compatibility:
                out["F"] = [1e6, 1e6, 1e6, 1e6, 1e6, 0.0]
                out["G"] = [10.0, 10.0, 10.0, 10.0, 10.0]
                return

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
            shelter_purpose=self.shelter_purpose,
            shelter_permanence=self.shelter_permanence,
            deployment_method=self.deployment_method,
            hardening=self.hardening,
        )

        result: SimulationResult = simulate(params=sim_params, climate=self.climate)

        # ─── OBJECTIVES (Pymoo minimizes all F) ───────────────────────────────
        f_heat_loss = abs(result.heat_loss)
        f_heating_demand = result.heating_demand
        f_cost = result.cost
        f_weight = result.weight
        f_comfort = -result.comfort_percent

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

        # Constraint 5: Panel weight limit (kg/m²)
        cand_panel_weight = max(
            wall_mat.weight if wall_mat else 0.0,
            roof_mat.weight if roof_mat else 0.0
        )
        g_panel_weight = (cand_panel_weight - self.max_panel_weight) / max(1.0, self.max_panel_weight)

        out["G"] = [g_weight, g_cost, g_temp_max, g_temp_min, g_panel_weight]
