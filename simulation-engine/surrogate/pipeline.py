# -*- coding: utf-8 -*-
"""
simulation_engine/surrogate/pipeline.py

Public API:
  - `recommend(climate, requirements, ...)` -> List[Candidate] (Fast ML Surrogate Pareto Recommendation)
  - `verify(params, climate)` -> Dict[str, Any] (High-Fidelity Physics Verification + Surrogate Delta)

Powers POST /api/recommend and POST /api/verify according to docs/api-contract.md.
"""

from typing import List, Dict, Any, Optional, Union
import numpy as np
import pandas as pd
from pymoo.util.nds.non_dominated_sorting import NonDominatedSorting

from simulation_engine.engine import (
    simulate,
    SimulationParams,
    ClimateInput,
    SimulationResult,
)
from simulation_engine.materials import materials_db
from simulation_engine.geometry import calculate_geometry
from simulation_engine.generate_dataset import CLIMATES
from simulation_engine.optimization.optimizer import _resolve_climate, _generate_tradeoff_notes
from .model import get_surrogate, SurrogateModel, CATEGORIES, CAT_DTYPES, FEATURE_COLS

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


def _normalize_params(params: Union[Dict[str, Any], SimulationParams]) -> SimulationParams:
    """Normalizes input dictionary or dataclass into SimulationParams."""
    if isinstance(params, SimulationParams):
        return params
    if isinstance(params, dict):
        return SimulationParams(
            shape=params.get("shape", "rectangular"),
            orientation=float(params.get("orientation", 180.0)),
            wall_material=params.get("wallMaterial") or params.get("wall_material", "adobe"),
            roof_material=params.get("roofMaterial") or params.get("roof_material", "timber_insulated_roof"),
            glazing_material=params.get("glazingMaterial") or params.get("glazing_material", "glazing_low_e"),
            insulation=float(params.get("insulation", 100.0)),
            opening=float(params.get("opening", 14.0)),
            thermal_mass=params.get("thermalMass") or params.get("thermal_mass", "high"),
            length=float(params.get("length", 6.0)),
            width=float(params.get("width", 4.0)),
            height=float(params.get("height", 2.5)),
            internal_gain_w=float(params.get("internalGainW") or params.get("internal_gain_w", 220.0)),
            ach=float(params.get("ach", 0.5)),
            greenhouse_mode=bool(params.get("greenhouseMode") or params.get("greenhouse_mode", False)),
            shelter_purpose=params.get("shelterPurpose") or params.get("shelter_purpose", "troop_habitation"),
            shelter_permanence=params.get("shelterPermanence") or params.get("shelter_permanence", "semi_permanent"),
            deployment_method=params.get("deploymentMethod") or params.get("deployment_method", "road_bound"),
            hardening=params.get("hardening", "non_ballistic"),
        )
    return SimulationParams()


def recommend(
    climate: Union[str, Dict[str, Any], ClimateInput],
    requirements: Optional[Dict[str, Any]] = None,
    *,
    top_n: int = 6,
    candidate_pool_size: int = 3000,
    seed: int = 42,
    surrogate_model: Optional[SurrogateModel] = None,
) -> List[Dict[str, Any]]:
    """
    Evaluates candidate architectural envelopes using the trained ML surrogate model.
    Filters by user requirements and extracts the Pareto-optimal frontier in sub-second time.

    Parameters
    ----------
    climate : ClimateInput | str | dict
        Climate archetype or hourly environmental input.
    requirements : dict, optional
        User criteria (budget, weightLimit, comfort_band, minComfortPercent, length, width, height).
    top_n : int
        Maximum number of diverse Pareto candidate designs returned (default 6).
    candidate_pool_size : int
        Number of configurations evaluated across the parametric grid (default 3,000).
    seed : int
        Random seed for sampling reproducibility.
    surrogate_model : SurrogateModel, optional
        Preloaded surrogate instance; defaults to global cached singleton.

    Returns
    -------
    List[Dict[str, Any]]
        List of recommended candidates with 'estimated': True conforming to docs/api-contract.md.
    """
    surrogate = surrogate_model or get_surrogate()
    norm_climate = _resolve_climate(climate)
    reqs = requirements or {}

    print(f"\n[DIAGNOSTIC STEP 6][Surrogate Pareto Recommendation Ingress]:\n"
          f"  Climate: lat={norm_climate.lat}, lon={norm_climate.lon}, alt={norm_climate.altitude}\n"
          f"  Requirements: {reqs}\n"
          f"  Candidate Pool Size: {candidate_pool_size}", flush=True)

    rng = np.random.default_rng(seed)

    # 1. Parse operational parameters & constraints
    shelter_purpose = reqs.get("shelter_purpose") or reqs.get("shelterPurpose") or "troop_habitation"
    shelter_permanence = reqs.get("shelter_permanence") or reqs.get("shelterPermanence") or "semi_permanent"
    deployment_method = reqs.get("deployment_method") or reqs.get("deploymentMethod") or "road_bound"
    hardening = reqs.get("hardening") or "non_ballistic"
    available_materials = reqs.get("available_materials") or reqs.get("availableMaterials") or []
    max_panel_weight = DEPLOYMENT_MAX_PANEL_WEIGHT.get(deployment_method, 999.0)

    max_cost = float(reqs.get("max_cost") or reqs.get("budget") or reqs.get("maxCost") or 1e9)
    max_weight = float(reqs.get("max_weight") or reqs.get("weightLimit") or reqs.get("weight_limit") or 1e9)
    min_comfort = float(reqs.get("min_comfort_percent") or reqs.get("minComfortPercent") or 0.0)

    comfort_band = reqs.get("comfort_band")
    if comfort_band and len(comfort_band) >= 2:
        comfort_max_temp = float(comfort_band[1])
    else:
        p_min, p_max = PURPOSE_COMFORT_BANDS.get(shelter_purpose, (18.0, 24.0))
        comfort_max_temp = float(reqs.get("comfort_max_temp", reqs.get("max_temp", p_max)))

    # Filter candidate materials based on availability, deployment panel weight and compatibility
    all_materials = materials_db.list_all()
    candidate_walls = [
        m.id for m in all_materials
        if (m.category in ("wall", "envelope") or m.id in [
            "tactical_fabric_pvc", "fems_composite_panel", "puf_sandwich_panel",
            "eps_sandwich_panel", "concrete", "stone", "adobe",
            "galvanized_steel_sheet", "composite", "insulated_panel"
        ])
        and m.weight <= max_panel_weight
        and (not m.deployment_compatibility or deployment_method in m.deployment_compatibility)
        and (not m.shelter_type_compatibility or shelter_purpose in m.shelter_type_compatibility)
    ]
    candidate_roofs = [
        m.id for m in all_materials
        if (m.category in ("roof", "envelope") or m.id in [
            "timber_insulated_roof", "fems_composite_panel", "tactical_fabric_pvc",
            "puf_sandwich_panel", "eps_sandwich_panel", "galvanized_steel_sheet",
            "composite", "insulated_panel"
        ])
        and m.weight <= max_panel_weight
        and (not m.deployment_compatibility or deployment_method in m.deployment_compatibility)
        and (not m.shelter_type_compatibility or shelter_purpose in m.shelter_type_compatibility)
    ]

    if available_materials:
        candidate_walls = [mid for mid in candidate_walls if mid in available_materials]
        candidate_roofs = [mid for mid in candidate_roofs if mid in available_materials]

    if not candidate_walls:
        raise ValueError(
            f"No compatible wall materials available for deployment={deployment_method}, "
            f"purpose={shelter_purpose}, available={available_materials}"
        )
    if not candidate_roofs:
        raise ValueError(
            f"No compatible roof materials available for deployment={deployment_method}, "
            f"purpose={shelter_purpose}, available={available_materials}"
        )

    # Geometry bounds
    req_len = reqs.get("length")
    req_wid = reqs.get("width")
    req_hgt = reqs.get("height")

    # 2. Generate large candidate parameter matrix (candidate_pool_size)
    shapes = rng.choice(CATEGORIES["shape"], size=candidate_pool_size)
    walls = rng.choice(candidate_walls, size=candidate_pool_size)
    roofs = rng.choice(candidate_roofs, size=candidate_pool_size)
    glazings = rng.choice(CATEGORIES.get("glazing_material", ["glazing_low_e", "polyethylene_sheet"]), size=candidate_pool_size)
    masses = rng.choice(CATEGORIES["thermal_mass"], size=candidate_pool_size)

    # Orientation: mix of south-biased (135°-225°) and uniform (0°-360°)
    is_south_biased = rng.random(size=candidate_pool_size) < 0.60
    orient_south = rng.uniform(135.0, 225.0, size=candidate_pool_size)
    orient_all = rng.uniform(0.0, 360.0, size=candidate_pool_size)
    orientations = np.where(is_south_biased, orient_south, orient_all)

    # Continuous insulation & opening
    insulations = rng.uniform(25.0, 250.0, size=candidate_pool_size)
    openings = rng.uniform(5.0, 30.0, size=candidate_pool_size)

    # Dimensions
    if req_len:
        lengths = np.full(candidate_pool_size, float(req_len))
    else:
        lengths = rng.uniform(4.0, 8.0, size=candidate_pool_size)

    if req_wid:
        widths = np.full(candidate_pool_size, float(req_wid))
    else:
        widths = rng.uniform(3.0, 5.0, size=candidate_pool_size)

    if req_hgt:
        heights = np.full(candidate_pool_size, float(req_hgt))
    else:
        heights = rng.uniform(2.2, 3.0, size=candidate_pool_size)

    # Climate scalar constants
    temps = norm_climate.hourly_outdoor_temp or [0.0] * 24
    solar = norm_climate.hourly_solar_radiation or [0.0] * 24
    t_min = float(min(temps))
    t_max = float(max(temps))
    t_mean = float(sum(temps) / len(temps))
    sol_peak = float(max(solar))
    wind = float(norm_climate.wind_speed)
    humidity = float(norm_climate.humidity_pct) if hasattr(norm_climate, "humidity_pct") else 30.0
    diurnal_amp = round(t_max - t_min, 2)

    # 3. Compute geometry features using exact calculate_geometry
    floor_areas = np.empty(candidate_pool_size, dtype=np.float64)
    envelope_areas = np.empty(candidate_pool_size, dtype=np.float64)
    volumes = np.empty(candidate_pool_size, dtype=np.float64)
    av_ratios = np.empty(candidate_pool_size, dtype=np.float64)

    for i in range(candidate_pool_size):
        geom = calculate_geometry(
            shape=shapes[i],
            length=lengths[i],
            width=widths[i],
            height=heights[i],
            orientation_deg=orientations[i]
        )
        floor_areas[i] = geom.floor_area
        envelope_areas[i] = geom.envelope_area
        volumes[i] = geom.volume
        av_ratios[i] = geom.av_ratio

    is_pcms = np.where(np.char.find(walls.astype(str), "pcm") >= 0, 1, 0)
    is_greenhouses = np.where(glazings == "polyethylene_sheet", 1, 0)
    is_ground_coupled = np.where(np.isin(shapes, ["bunker_bermed", "igloo_catenary"]), 1, 0)

    # Build DataFrame for surrogate batch inference
    df_pool = pd.DataFrame({
        "lat": norm_climate.lat,
        "lon": norm_climate.lon,
        "altitude_m": norm_climate.altitude,
        "ambient_min_temp": t_min,
        "ambient_max_temp": t_max,
        "ambient_mean_temp": t_mean,
        "solar_peak_wm2": sol_peak,
        "wind_speed_ms": wind,
        "humidity_pct": humidity,
        "diurnal_amplitude_c": diurnal_amp,
        "shape": pd.Categorical(shapes, categories=CATEGORIES["shape"]),
        "orientation_deg": orientations,
        "wall_material": pd.Categorical(walls, categories=CATEGORIES["wall_material"]),
        "roof_material": pd.Categorical(roofs, categories=CATEGORIES["roof_material"]),
        "glazing_material": pd.Categorical(glazings, categories=CATEGORIES["glazing_material"]),
        "insulation_mm": insulations,
        "opening_ratio_pct": openings,
        "thermal_mass": pd.Categorical(masses, categories=CATEGORIES["thermal_mass"]),
        "is_pcm": is_pcms,
        "is_greenhouse": is_greenhouses,
        "is_ground_coupled": is_ground_coupled,
        "length_m": lengths,
        "width_m": widths,
        "height_m": heights,
        "floor_area_m2": floor_areas,
        "envelope_area_m2": envelope_areas,
        "volume_m3": volumes,
        "av_ratio": av_ratios,
    })

    # 4. Fast batch prediction (<30 ms for 3,000 candidates)
    preds = surrogate.predict_batch(df_pool)

    costs = preds["total_cost_inr"]
    weights = preds["total_weight_kg"]
    heating = preds["heating_demand_kwh_day"]
    heat_loss = preds["heat_loss_wm2"]
    solar_gains = preds["solar_gain_wm2"]
    comfort_pcts = preds["comfort_percent"]
    max_temps = preds["max_indoor_temp"]
    mean_temps = preds["mean_indoor_temp"]
    min_temps = preds["min_indoor_temp"]
    u_vals = preds["u_value"]
    comfort_5cs = preds["comfort_hours_5c"]
    carbon_fps = preds["carbon_footprint_kgco2"]

    # 5. Multi-objective objective matrix (minimizing all)
    # Objectives: heatLoss mag, heatingDemand, cost, weight, -comfort, -useful_solar
    overheat_penalties = np.maximum(0.0, max_temps - comfort_max_temp) * 1.5
    useful_solars = np.maximum(0.0, solar_gains - overheat_penalties)

    f_loss = np.abs(heat_loss)
    f_heat = heating
    f_cost = costs
    f_weight = weights
    f_comfort = -comfort_pcts
    f_solar = -useful_solars

    # Constraints filtering
    panel_weights = np.array([
        max(
            (materials_db.get(walls[i]).weight if materials_db.get(walls[i]) else 0.0),
            (materials_db.get(roofs[i]).weight if materials_db.get(roofs[i]) else 0.0)
        )
        for i in range(candidate_pool_size)
    ])
    c_panel_weight = panel_weights <= max_panel_weight * 1.01

    c_cost = costs <= max_cost * 1.05
    c_weight = weights <= max_weight * 1.05
    c_overheat = max_temps <= (comfort_max_temp + 1.5)
    c_comfort = comfort_pcts >= (min_comfort - 5.0)

    feasible_mask = c_cost & c_weight & c_overheat & c_comfort & c_panel_weight
    feasible_indices = np.where(feasible_mask)[0]

    if len(feasible_indices) < 10:
        # Relax constraints to avoid empty results while preserving panel weight
        feasible_mask = c_cost & c_weight & c_panel_weight
        feasible_indices = np.where(feasible_mask)[0]

    if len(feasible_indices) == 0:
        feasible_indices = np.where(c_panel_weight)[0]
        if len(feasible_indices) == 0:
            feasible_indices = np.arange(candidate_pool_size)

    # 6. Non-dominated sorting over feasible pool
    F_sub = np.column_stack([
        f_loss[feasible_indices],
        f_heat[feasible_indices],
        f_cost[feasible_indices],
        f_weight[feasible_indices],
        f_comfort[feasible_indices],
        f_solar[feasible_indices],
    ])

    fronts = NonDominatedSorting().do(F_sub)
    pareto_local_idx = fronts[0] if fronts else np.arange(min(len(feasible_indices), 50))
    pareto_indices = feasible_indices[pareto_local_idx]

    # 7. Diverse candidate selection across key archetypes
    sub_costs = costs[pareto_indices]
    sub_weights = weights[pareto_indices]
    sub_heating = heating[pareto_indices]
    sub_loss = np.abs(heat_loss[pareto_indices])
    sub_solar = useful_solars[pareto_indices]

    # Normalize for knee-point distance
    p_matrix = np.column_stack([sub_costs, sub_weights, sub_heating, sub_loss, -comfort_pcts[pareto_indices], -sub_solar])
    p_min = p_matrix.min(axis=0)
    p_max = p_matrix.max(axis=0)
    p_range = np.where((p_max - p_min) > 1e-6, p_max - p_min, 1.0)
    p_norm = (p_matrix - p_min) / p_range
    ideal_dists = np.linalg.norm(p_norm, axis=1)

    chosen_indices: List[int] = []
    chosen_roles: Dict[int, str] = {}

    def add_pick(idx: int, role: str):
        if idx not in chosen_indices and len(chosen_indices) < top_n:
            chosen_indices.append(idx)
            chosen_roles[idx] = role

    # Pick archetypes
    add_pick(pareto_indices[int(np.argmin(sub_costs))], "cost")
    add_pick(pareto_indices[int(np.argmin(sub_weights))], "weight")
    add_pick(pareto_indices[int(np.argmin(sub_heating))], "thermal")
    add_pick(pareto_indices[int(np.argmin(sub_loss))], "heat_loss")
    add_pick(pareto_indices[int(np.argmax(sub_solar))], "solar")

    # Knee point
    sorted_knee = np.argsort(ideal_dists)
    for k_idx in sorted_knee:
        add_pick(pareto_indices[int(k_idx)], "balanced")
        if len(chosen_indices) >= top_n:
            break

    # Fill remaining if needed
    for p_idx in pareto_indices:
        add_pick(p_idx, "balanced")
        if len(chosen_indices) >= top_n:
            break

    # 8. Build Candidate objects matching docs/api-contract.md with exact physics validation
    candidates = []
    for rank, global_idx in enumerate(chosen_indices):
        role = chosen_roles.get(global_idx, "balanced")
        cand_id = f"cand-pareto-{rank+1:02d}"

        cand_params = SimulationParams(
            shape=shapes[global_idx],
            orientation=round(float(orientations[global_idx]), 1),
            wall_material=walls[global_idx],
            roof_material=roofs[global_idx],
            insulation=round(float(insulations[global_idx]), 1),
            opening=round(float(openings[global_idx]), 1),
            thermal_mass=masses[global_idx],
            length=round(float(lengths[global_idx]), 2),
            width=round(float(widths[global_idx]), 2),
            height=round(float(heights[global_idx]), 2),
            shelter_purpose=shelter_purpose,
            shelter_permanence=shelter_permanence,
            deployment_method=deployment_method,
            hardening=hardening,
        )
        phys = simulate(cand_params, norm_climate)

        series = [
            {
                "time": pt.time,
                "hour": pt.hour,
                "temp": pt.temp,
                "outdoorTemp": pt.outdoor_temp,
                "solarRad": pt.solar_rad,
                "heatFlux": pt.heat_flux,
            }
            for pt in phys.indoor_temp_series
        ]

        cand = {
            "id": cand_id,
            "params": {
                "location": {
                    "lat": norm_climate.lat,
                    "lon": norm_climate.lon,
                    "altitude": norm_climate.altitude,
                },
                "shape": shapes[global_idx],
                "orientation": round(float(orientations[global_idx]), 1),
                "wallMaterial": walls[global_idx],
                "roofMaterial": roofs[global_idx],
                "glazingMaterial": glazings[global_idx],
                "greenhouseMode": bool(is_greenhouses[global_idx]),
                "insulation": round(float(insulations[global_idx]), 1),
                "opening": round(float(openings[global_idx]), 1),
                "thermalMass": masses[global_idx],
                "length": round(float(lengths[global_idx]), 2),
                "width": round(float(widths[global_idx]), 2),
                "height": round(float(heights[global_idx]), 2),
                "shelterPurpose": shelter_purpose,
                "shelterPermanence": shelter_permanence,
                "deploymentMethod": deployment_method,
                "hardening": hardening,
            },
            "results": {
                "uValue": phys.u_value,
                "indoorTempSeries": series,
                "meanIndoorTemp": phys.mean_indoor_temp,
                "indoorTemp": phys.mean_indoor_temp,
                "minIndoorTemp": phys.min_indoor_temp,
                "maxIndoorTemp": phys.max_indoor_temp,
                "solarGain": phys.solar_gain,
                "heatLoss": phys.heat_loss,
                "heatingDemand": phys.heating_demand,
                "comfortPercent": phys.comfort_percent,
                "comfortHours": phys.comfort_hours_5c,
                "comfortHours5c": phys.comfort_hours_5c,
                "weight": phys.weight,
                "cost": phys.cost,
                "carbonFootprint": phys.carbon_footprint,
                "maxPanelWeightKgM2": phys.max_panel_weight_kg_m2,
                "comfortMinC": phys.comfort_min_c,
                "comfortMaxC": phys.comfort_max_c,
                "estimated": True,
            },
            "tradeoffNotes": "",
            "paretoRank": 1,
        }
        cand["tradeoffNotes"] = _generate_tradeoff_notes(cand, role)
        candidates.append(cand)

    print(f"[DIAGNOSTIC STEP 6][Surrogate Generated {len(candidates)} Diverse Pareto Candidates]:", flush=True)
    for c in candidates:
        p = c['params']
        r = c['results']
        print(f"  - [{c['id']}] Shape={p['shape']}, Wall={p['wallMaterial']}, Roof={p['roofMaterial']}, Ins={p['insulation']}mm, Op={p['opening']}%, Mass={p['thermalMass']} | MeanTemp={r['meanIndoorTemp']}°C, HeatLoss={r['heatLoss']}W/m2, Cost=₹{r['cost']}, Wt={r['weight']}kg", flush=True)

    return candidates


def verify(
    params: Union[Dict[str, Any], SimulationParams],
    climate: Union[str, Dict[str, Any], ClimateInput],
    *,
    surrogate_model: Optional[SurrogateModel] = None,
) -> Dict[str, Any]:
    """
    Executes real numerical physics simulation on the specified design configuration,
    and returns verified high-fidelity physics output along with a surrogate delta comparison.

    Parameters
    ----------
    params : SimulationParams | dict
        The shelter design envelope parameters.
    climate : ClimateInput | str | dict
        The site environmental data.
    surrogate_model : SurrogateModel, optional
        Preloaded surrogate instance.

    Returns
    -------
    Dict[str, Any]
        Verified simulation results conforming to docs/api-contract.md (POST /api/verify)
        including 'verifiedAgainstSurrogate': True, and 'deltaFromSurrogate'.
    """
    surrogate = surrogate_model or get_surrogate()
    norm_params = _normalize_params(params)
    norm_climate = _resolve_climate(climate)

    # 1. Execute physical numerical RC solver
    physics_res: SimulationResult = simulate(params=norm_params, climate=norm_climate)

    # 2. Execute fast surrogate inference on identical inputs
    surrogate_pred = surrogate.predict_single(norm_params, norm_climate)

    # 3. Calculate surrogate delta metrics
    delta_temp = round(abs(physics_res.mean_indoor_temp - surrogate_pred["mean_indoor_temp"]), 2)
    delta_heat_demand = round(abs(physics_res.heating_demand - surrogate_pred["heating_demand_kwh_day"]), 2)
    delta_heat_loss = round(abs(physics_res.heat_loss - surrogate_pred["heat_loss_wm2"]), 2)
    delta_solar = round(abs(physics_res.solar_gain - surrogate_pred["solar_gain_wm2"]), 2)
    delta_u_val = round(abs(physics_res.u_value - surrogate_pred["u_value"]), 3)
    delta_cost = round(abs(physics_res.cost - surrogate_pred["total_cost_inr"]), 0)
    delta_weight = round(abs(physics_res.weight - surrogate_pred["total_weight_kg"]), 1)

    series_models = [
        {
            "time": pt.time,
            "hour": pt.hour,
            "temp": pt.temp,
            "outdoorTemp": pt.outdoor_temp,
            "solarRad": pt.solar_rad,
            "heatFlux": pt.heat_flux,
        }
        for pt in physics_res.indoor_temp_series
    ]

    return {
        "uValue": physics_res.u_value,
        "indoorTempSeries": series_models,
        "meanIndoorTemp": physics_res.mean_indoor_temp,
        "indoorTemp": physics_res.mean_indoor_temp,
        "minIndoorTemp": physics_res.min_indoor_temp,
        "maxIndoorTemp": physics_res.max_indoor_temp,
        "solarGain": physics_res.solar_gain,
        "heatLoss": physics_res.heat_loss,
        "heatingDemand": physics_res.heating_demand,
        "comfortPercent": physics_res.comfort_percent,
        "comfortHours": physics_res.comfort_hours_5c,
        "comfortHours5c": physics_res.comfort_hours_5c,
        "weight": physics_res.weight,
        "cost": physics_res.cost,
        "carbonFootprint": physics_res.carbon_footprint,
        "estimated": False,  # Verified physical truth
        "verifiedAgainstSurrogate": True,
        "deltaFromSurrogate": delta_temp,
        "surrogateComparison": {
            "meanIndoorTemp": {
                "physics": physics_res.mean_indoor_temp,
                "surrogate": surrogate_pred["mean_indoor_temp"],
                "delta": delta_temp,
                "unit": "°C",
            },
            "heatingDemand": {
                "physics": physics_res.heating_demand,
                "surrogate": surrogate_pred["heating_demand_kwh_day"],
                "delta": delta_heat_demand,
                "unit": "kWh/day",
            },
            "heatLoss": {
                "physics": physics_res.heat_loss,
                "surrogate": surrogate_pred["heat_loss_wm2"],
                "delta": delta_heat_loss,
                "unit": "W/m²",
            },
            "solarGain": {
                "physics": physics_res.solar_gain,
                "surrogate": surrogate_pred["solar_gain_wm2"],
                "delta": delta_solar,
                "unit": "W/m²",
            },
            "uValue": {
                "physics": physics_res.u_value,
                "surrogate": surrogate_pred["u_value"],
                "delta": delta_u_val,
                "unit": "W/m²·K",
            },
            "cost": {
                "physics": physics_res.cost,
                "surrogate": surrogate_pred["total_cost_inr"],
                "delta": delta_cost,
                "unit": "₹",
            },
            "weight": {
                "physics": physics_res.weight,
                "surrogate": surrogate_pred["total_weight_kg"],
                "delta": delta_weight,
                "unit": "kg",
            },
        },
    }
