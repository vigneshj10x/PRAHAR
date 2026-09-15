# -*- coding: utf-8 -*-
"""
simulation_engine/optimization/optimizer.py

Public API: `optimize`
Multi-objective optimization pipeline using NSGA-II (via pymoo) over the
THERMO-SHIELD parametric envelope space.

Produces a diverse Pareto-optimal front of shelter configurations balancing:
  - Thermal comfort vs. envelope weight
  - Auxiliary heating demand vs. fabrication cost
  - Solar heat capture vs. daytime overheating prevention
"""

import math
from typing import List, Dict, Any, Optional, Union
import numpy as np

from pymoo.algorithms.moo.nsga2 import NSGA2
from pymoo.optimize import minimize
from pymoo.util.nds.non_dominated_sorting import NonDominatedSorting
from pymoo.operators.sampling.rnd import FloatRandomSampling
from pymoo.operators.crossover.sbx import SBX
from pymoo.operators.mutation.pm import PM

from simulation_engine.engine import (
    simulate,
    SimulationParams,
    ClimateInput,
    SimulationResult,
)
from simulation_engine.generate_dataset import CLIMATES
from .problem import ThermoShieldProblem


def _resolve_climate(climate: Union[str, Dict[str, Any], ClimateInput]) -> ClimateInput:
    """Normalizes input into a verified ClimateInput instance."""
    if isinstance(climate, ClimateInput):
        return climate
    if isinstance(climate, str):
        key = climate.strip().lower()
        if key in CLIMATES:
            return CLIMATES[key]
        raise ValueError(f"Unknown climate archetype '{climate}'. Available: {list(CLIMATES.keys())}")
    if isinstance(climate, dict):
        lat = float(climate.get("lat", 34.1526))
        lon = float(climate.get("lon", 77.5771))
        alt = float(climate.get("altitude", 3524.0))
        
        hourly_temp = climate.get("hourly_outdoor_temp") or climate.get("hourlyOutdoorTemp")
        hourly_solar = climate.get("hourly_solar_radiation") or climate.get("hourlySolarRadiation")
        
        # If hourly temps not provided, find nearest representative archetype from CLIMATES
        if not hourly_temp:
            best_key = "leh"
            min_dist = float("inf")
            for k, arch in CLIMATES.items():
                dist = (lat - arch.lat) ** 2 + (lon - arch.lon) ** 2
                if dist < min_dist:
                    min_dist = dist
                    best_key = k
            matched = CLIMATES[best_key]
            hourly_temp = matched.hourly_outdoor_temp
            hourly_solar = matched.hourly_solar_radiation
            south_solar = matched.hourly_south_solar_rad
            wind = matched.wind_speed
            humidity = matched.humidity_pct
        else:
            south_solar = climate.get("hourly_south_solar_rad") or climate.get("hourlySouthSolarRad")
            wind = float(climate.get("wind_speed") or climate.get("windSpeed", 3.5))
            humidity = float(climate.get("humidity_pct") or climate.get("humidityPct", 30.0))

        return ClimateInput(
            lat=lat,
            lon=lon,
            altitude=alt,
            hourly_outdoor_temp=list(hourly_temp),
            hourly_solar_radiation=list(hourly_solar) if hourly_solar else [],
            hourly_south_solar_rad=list(south_solar) if south_solar else None,
            wind_speed=wind,
            humidity_pct=humidity,
        )
    return ClimateInput()


def _generate_tradeoff_notes(cand: Dict[str, Any], rank_type: str) -> str:
    """Generates concise, human-readable trade-off rationale for the candidate."""
    p = cand["params"]
    r = cand["results"]
    shape = p["shape"].capitalize()
    wall = p["wallMaterial"].replace("_", " ").title()
    roof = p["roofMaterial"].replace("_", " ").title()
    ins = p["insulation"]
    cost = r["cost"]
    weight = r["weight"]
    heat_demand = r["heatingDemand"]
    comfort_pct = r["comfortPercent"]
    solar = r["solarGain"]
    mean_temp = r["meanIndoorTemp"]

    if rank_type == "cost":
        return (
            f"Budget Champion: Lowest envelope cost (₹{cost:,.0f}) utilizing {wall} "
            f"with {ins:.0f}mm insulation, maintaining {mean_temp:+.1f}°C mean temperature "
            f"at {weight:,.0f} kg."
        )
    elif rank_type == "weight":
        return (
            f"Tactical Rapid-Deployment: Ultralight envelope ({weight:,.0f} kg) using "
            f"{wall} + {roof} for air-drop or forward logistical mobility (Cost: ₹{cost:,.0f})."
        )
    elif rank_type == "thermal":
        return (
            f"Thermal Protection Champion: Lowest heating demand ({heat_demand:.1f} kWh/day) "
            f"and high comfort ({comfort_pct:.1f}%) via {ins:.0f}mm insulation with {wall} thermal buffering."
        )
    elif rank_type == "solar":
        return (
            f"Passive Solar Specialist: Maximizes diurnal solar harvest ({solar:.1f} W/m²) "
            f"via {p['opening']:.0f}% south aperture and {p['orientation']:.0f}° solar azimuth."
        )
    elif rank_type == "heat_loss":
        return (
            f"Super-Insulated Envelope: Minimized fabric heat loss ({abs(r['heatLoss']):.1f} W/m², "
            f"U={r['uValue']:.3f} W/m²K) for extreme blizzard resistance."
        )
    else:
        return (
            f"Balanced Compromise: Pareto knee-point balancing budget (₹{cost:,.0f}), "
            f"weight ({weight:,.0f} kg), and heating demand ({heat_demand:.1f} kWh/day) "
            f"in a {shape} form."
        )


def _select_diverse_candidates(
    evaluated_candidates: List[Dict[str, Any]],
    top_n: int = 6,
) -> List[Dict[str, Any]]:
    """
    Selects a diverse subset of top_n Pareto candidates spanning key archetypes:
      1. Lowest Cost (Budget Champion)
      2. Lowest Weight (Tactical Air-Drop)
      3. Lowest Heating Demand / Highest Comfort (Thermal Champion)
      4. Highest Useful Solar Gain (Passive Solar)
      5. Lowest Envelope Heat Loss Rate (Super-Insulated)
      6. Best Balanced Knee-Point (Normalized compromise)
    """
    if len(evaluated_candidates) <= top_n:
        for idx, c in enumerate(evaluated_candidates):
            c["id"] = f"cand-pareto-{idx+1:02d}"
            c["paretoRank"] = 1
            if not c.get("tradeoffNotes"):
                c["tradeoffNotes"] = _generate_tradeoff_notes(c, "balanced")
        return evaluated_candidates

    # Extract objective metrics for ranking
    costs = np.array([c["results"]["cost"] for c in evaluated_candidates])
    weights = np.array([c["results"]["weight"] for c in evaluated_candidates])
    heating = np.array([c["results"]["heatingDemand"] for c in evaluated_candidates])
    heat_loss = np.array([abs(c["results"]["heatLoss"]) for c in evaluated_candidates])
    solar_gains = np.array([c["results"]["solarGain"] for c in evaluated_candidates])
    comforts = np.array([c["results"]["comfortPercent"] for c in evaluated_candidates])

    # Normalized objectives matrix for knee-point computation
    # (cost, weight, heating, heat_loss, -comfort, -solar)
    raw_matrix = np.column_stack([
        costs,
        weights,
        heating,
        heat_loss,
        -comforts,
        -solar_gains,
    ])
    mins = raw_matrix.min(axis=0)
    maxs = raw_matrix.max(axis=0)
    denom = np.where((maxs - mins) > 1e-6, maxs - mins, 1.0)
    norm_matrix = (raw_matrix - mins) / denom

    # Distance to ideal point (0, 0, 0, 0, 0, 0)
    ideal_distances = np.linalg.norm(norm_matrix, axis=1)

    selected_indices: List[int] = []
    selected_roles: Dict[int, str] = {}

    def try_add(idx: int, role: str):
        if idx not in selected_indices and len(selected_indices) < top_n:
            selected_indices.append(idx)
            selected_roles[idx] = role

    # 1. Budget Champion
    try_add(int(np.argmin(costs)), "cost")
    # 2. Tactical Air-Drop (Weight Champion)
    try_add(int(np.argmin(weights)), "weight")
    # 3. Thermal Comfort Champion (Lowest heating demand / highest comfort)
    try_add(int(np.argmin(heating)), "thermal")
    # 4. Super-Insulated (Lowest heat loss magnitude)
    try_add(int(np.argmin(heat_loss)), "heat_loss")
    # 5. Passive Solar Specialist (Highest solar harvest)
    try_add(int(np.argmax(solar_gains)), "solar")
    # 6. Balanced Compromise (Knee-point closest to ideal)
    sorted_by_ideal = np.argsort(ideal_distances)
    for idx in sorted_by_ideal:
        try_add(int(idx), "balanced")
        if len(selected_indices) >= top_n:
            break

    # If still need more candidates to reach top_n, pick maximum Euclidean spread in objective space
    while len(selected_indices) < top_n and len(selected_indices) < len(evaluated_candidates):
        selected_norm = norm_matrix[selected_indices]
        remaining = [i for i in range(len(evaluated_candidates)) if i not in selected_indices]
        best_candidate = remaining[0]
        max_min_dist = -1.0
        for rem_idx in remaining:
            dists = np.linalg.norm(selected_norm - norm_matrix[rem_idx], axis=1)
            min_d = np.min(dists)
            if min_d > max_min_dist:
                max_min_dist = min_d
                best_candidate = rem_idx
        try_add(best_candidate, "balanced")

    # Assemble final selected candidate objects
    final_candidates = []
    for rank_idx, cand_idx in enumerate(selected_indices):
        cand = evaluated_candidates[cand_idx]
        role = selected_roles.get(cand_idx, "balanced")
        cand["id"] = f"cand-pareto-{rank_idx+1:02d}"
        cand["paretoRank"] = 1
        cand["tradeoffNotes"] = _generate_tradeoff_notes(cand, role)
        final_candidates.append(cand)

    return final_candidates


def optimize(
    climate: Union[str, Dict[str, Any], ClimateInput],
    requirements: Optional[Dict[str, Any]] = None,
    *,
    top_n: int = 6,
    pop_size: int = 40,
    generations: int = 25,
    seed: int = 42,
    use_live: bool = True,
) -> List[Dict[str, Any]]:
    """
    Runs multi-objective NSGA-II optimization against the thermal physics engine.

    Parameters
    ----------
    climate : ClimateInput | str | dict
        Climate archetype name ('leh', 'jaisalmer', etc.) or explicit ClimateInput profile.
    requirements : dict, optional
        User deployment criteria:
          - 'budget' or 'max_cost' (₹)
          - 'weightLimit' or 'max_weight' (kg)
          - 'comfort_band': [min_t, max_t] (e.g. [18.0, 24.0] or [5.0, 24.0])
          - 'minComfortPercent' (%)
          - 'length', 'width', 'height': target dimensions (m)
    top_n : int (default 6)
        Number of diverse Pareto candidates returned for decision display.
    pop_size : int (default 40)
        NSGA-II population size per generation.
    generations : int (default 25)
        NSGA-II iteration generations.
    seed : int (default 42)
        Reproducibility seed for genetic operators.
    use_live : bool (default True)
        Evaluates designs via live numerical physics simulation.

    Returns
    -------
    List[Dict[str, Any]]
        List of Pareto-optimal candidate designs conforming to docs/api-contract.md.
    """
    norm_climate = _resolve_climate(climate)
    reqs = requirements or {}

    problem = ThermoShieldProblem(
        climate=norm_climate,
        requirements=reqs,
        use_live=use_live,
    )

    algorithm = NSGA2(
        pop_size=pop_size,
        sampling=FloatRandomSampling(),
        crossover=SBX(prob=0.9, eta=15),
        mutation=PM(prob=0.2, eta=20),
        eliminate_duplicates=True,
    )

    res = minimize(
        problem,
        algorithm,
        termination=("n_gen", generations),
        seed=seed,
        verbose=False,
    )

    # ─── Extract Pareto-Optimal Solutions ─────────────────────────────────────
    candidate_vectors: List[np.ndarray] = []

    if res.opt is not None and len(res.opt) > 0:
        # Strictly feasible solutions found
        candidate_vectors = [sol.X for sol in res.opt]
    else:
        # Fallback for severe cold / strict constraints:
        # Rank by minimum constraint violation and take non-dominated subset
        pop_X = res.pop.get("X")
        pop_G = res.pop.get("G")
        pop_F = res.pop.get("F")

        cv = np.sum(np.maximum(0.0, pop_G), axis=1)
        min_cv = np.min(cv)
        # Select candidates close to minimum violation
        viable_mask = cv <= (min_cv + 0.05 * max(1.0, min_cv))
        viable_indices = np.where(viable_mask)[0]

        if len(viable_indices) > 0:
            viable_F = pop_F[viable_indices]
            fronts = NonDominatedSorting().do(viable_F)
            if fronts and len(fronts[0]) > 0:
                pareto_sub = viable_indices[fronts[0]]
                candidate_vectors = [pop_X[i] for i in pareto_sub]
            else:
                candidate_vectors = [pop_X[viable_indices[0]]]
        else:
            candidate_vectors = [pop_X[0]]

    # ─── Evaluate & Build Full Candidate Dictionaries ─────────────────────────
    evaluated_candidates = []
    seen_hashes = set()

    for x in candidate_vectors:
        design = problem._decode(x)
        # Prevent identical duplicates
        sig = (
            design["shape"],
            round(design["orientation"] / 15.0) * 15.0,
            design["wallMaterial"],
            design["roofMaterial"],
            round(design["insulation"] / 10.0) * 10.0,
            round(design["opening"]),
            design["thermalMass"],
        )
        if sig in seen_hashes:
            continue
        seen_hashes.add(sig)

        sim_params = SimulationParams(
            shape=design["shape"],
            orientation=design["orientation"],
            wall_material=design["wallMaterial"],
            roof_material=design["roofMaterial"],
            insulation=design["insulation"],
            opening=design["opening"],
            thermal_mass=design["thermalMass"],
            length=design["length"],
            width=design["width"],
            height=design["height"],
        )

        sim_res: SimulationResult = simulate(params=sim_params, climate=norm_climate)

        # Build Candidate schema matching docs/api-contract.md
        cand_dict: Dict[str, Any] = {
            "id": "",
            "params": {
                "location": {
                    "lat": norm_climate.lat,
                    "lon": norm_climate.lon,
                    "altitude": norm_climate.altitude,
                },
                "shape": design["shape"],
                "orientation": design["orientation"],
                "wallMaterial": design["wallMaterial"],
                "roofMaterial": design["roofMaterial"],
                "insulation": design["insulation"],
                "opening": design["opening"],
                "thermalMass": design["thermalMass"],
                "length": design["length"],
                "width": design["width"],
                "height": design["height"],
            },
            "results": {
                "uValue": sim_res.u_value,
                "indoorTempSeries": [
                    {
                        "time": pt.time,
                        "hour": pt.hour,
                        "temp": pt.temp,
                        "outdoorTemp": pt.outdoor_temp,
                        "solarRad": pt.solar_rad,
                        "heatFlux": pt.heat_flux,
                    }
                    for pt in sim_res.indoor_temp_series
                ],
                "meanIndoorTemp": sim_res.mean_indoor_temp,
                "indoorTemp": sim_res.mean_indoor_temp,
                "minIndoorTemp": sim_res.min_indoor_temp,
                "maxIndoorTemp": sim_res.max_indoor_temp,
                "solarGain": sim_res.solar_gain,
                "heatLoss": sim_res.heat_loss,
                "heatingDemand": sim_res.heating_demand,
                "comfortPercent": sim_res.comfort_percent,
                "comfortHours": sim_res.comfort_hours_5c,
                "comfortHours5c": sim_res.comfort_hours_5c,
                "weight": sim_res.weight,
                "cost": sim_res.cost,
                "carbonFootprint": sim_res.carbon_footprint,
                "estimated": False,
            },
            "tradeoffNotes": "",
            "paretoRank": 1,
        }
        evaluated_candidates.append(cand_dict)

    # Pick top_n diverse candidates across the Pareto front
    return _select_diverse_candidates(evaluated_candidates, top_n=top_n)
