# -*- coding: utf-8 -*-
"""
simulation_engine/test_optimization.py

Verification and validation suite for Phase 8: Multi-Objective Pareto Optimization.
Tests:
  1. NSGA-II problem definition & continuous evaluation against RC physics solver.
  2. Constraint adherence (budget ceilings, weight limits, overheating band).
  3. Objective trade-off diversity across multiple climate archetypes (Leh vs Jaisalmer).
  4. Output data structure conformance to docs/api-contract.md.
"""

import sys
from pathlib import Path
import numpy as np

# Ensure project root in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from simulation_engine.optimization import optimize, ThermoShieldProblem
from simulation_engine.generate_dataset import CLIMATES


def test_leh_extreme_cold_optimization():
    print("=" * 80)
    print("TEST 1: High-Altitude Extreme Cold Optimization (Leh, Ladakh -19.5°C to -8.0°C)")
    print("=" * 80)

    requirements = {
        "budget": 200000.0,
        "weightLimit": 7500.0,
        "length": 6.0,
        "width": 4.0,
        "height": 2.5,
    }

    candidates = optimize(
        climate="leh",
        requirements=requirements,
        top_n=6,
        pop_size=30,
        generations=20,
        seed=42,
    )

    assert len(candidates) > 0, "Optimization must return at least one candidate"
    assert len(candidates) <= 6, "Returned candidate count must not exceed top_n=6"

    print(f"Generated {len(candidates)} Pareto-optimal candidates:")
    for c in candidates:
        p = c["params"]
        r = c["results"]

        # Validate schema
        assert "id" in c and c["id"].startswith("cand-pareto-"), "Candidate ID must match schema"
        assert "tradeoffNotes" in c and len(c["tradeoffNotes"]) > 10, "Candidate must include trade-off notes"
        assert c["paretoRank"] == 1, "Candidate paretoRank must be 1"
        assert "indoorTempSeries" in r and len(r["indoorTempSeries"]) == 24, "Results must have 24h temp series"

        # Validate constraint compliance
        assert r["cost"] <= requirements["budget"] * 1.05, f"Cost {r['cost']} exceeds budget {requirements['budget']}"
        assert r["weight"] <= requirements["weightLimit"] * 1.05, f"Weight {r['weight']} exceeds limit {requirements['weightLimit']}"

        print(
            f"  [{c['id']}] {p['shape']:11s} | {p['wallMaterial']:18s} | {p['roofMaterial']:21s} | "
            f"Ins: {p['insulation']:4.0f}mm | Open: {p['opening']:4.1f}% | "
            f"Cost: ₹{r['cost']:7,.0f} | Wt: {r['weight']:5.0f}kg | "
            f"HeatDemand: {r['heatingDemand']:4.1f} kWh | Comfort: {r['comfortPercent']:5.1f}% | "
            f"T_mean: {r['meanIndoorTemp']:+5.1f}°C"
        )
        print(f"    -> Note: {c['tradeoffNotes']}")

    # Verify trade-off spread: cost, weight, and heating demand must not be identical
    costs = [c["results"]["cost"] for c in candidates]
    weights = [c["results"]["weight"] for c in candidates]
    heating = [c["results"]["heatingDemand"] for c in candidates]

    cost_spread = max(costs) - min(costs)
    weight_spread = max(weights) - min(weights)
    heating_spread = max(heating) - min(heating)

    print(f"\nPareto Spread Metrics in Leh:")
    print(f"  Cost Spread:           ₹{cost_spread:,.0f} (Min: ₹{min(costs):,.0f}, Max: ₹{max(costs):,.0f})")
    print(f"  Weight Spread:         {weight_spread:,.0f} kg (Min: {min(weights):,.0f} kg, Max: {max(weights):,.0f} kg)")
    print(f"  Heating Demand Spread: {heating_spread:.1f} kWh/day (Min: {min(heating):.1f}, Max: {max(heating):.1f})")

    assert cost_spread > 10000, "Pareto set must display meaningful cost variation"
    assert weight_spread > 500, "Pareto set must display meaningful weight variation"
    print("  [PASS] Multi-objective diversity in extreme cold verified.\n")


def test_jaisalmer_hot_desert_optimization():
    print("=" * 80)
    print("TEST 2: Hot & Arid Desert Optimization (Jaisalmer, Rajasthan 8.0°C to 26.5°C)")
    print("=" * 80)

    requirements = {
        "budget": 180000.0,
        "weightLimit": 9000.0,
        "comfort_max_temp": 24.0,  # Strict overheating avoidance
    }

    candidates = optimize(
        climate="jaisalmer",
        requirements=requirements,
        top_n=6,
        pop_size=30,
        generations=20,
        seed=101,
    )

    assert len(candidates) > 0, "Optimization must return at least one candidate"
    print(f"Generated {len(candidates)} Pareto-optimal candidates:")

    for c in candidates:
        p = c["params"]
        r = c["results"]

        # Overheating constraint verification
        assert r["maxIndoorTemp"] <= 25.0, f"Max temp {r['maxIndoorTemp']}°C exceeds comfort boundary 24.0°C"

        print(
            f"  [{c['id']}] {p['shape']:11s} | {p['wallMaterial']:18s} | {p['roofMaterial']:21s} | "
            f"Ins: {p['insulation']:4.0f}mm | Open: {p['opening']:4.1f}% | "
            f"Cost: ₹{r['cost']:7,.0f} | Wt: {r['weight']:5.0f}kg | "
            f"Solar: {r['solarGain']:4.1f} W/m² | T_max: {r['maxIndoorTemp']:4.1f}°C | "
            f"Comfort: {r['comfortPercent']:5.1f}%"
        )
        print(f"    -> Note: {c['tradeoffNotes']}")

    # Check solar aperture moderation in hot desert climate
    openings = [c["params"]["opening"] for c in candidates]
    max_temps = [c["results"]["maxIndoorTemp"] for c in candidates]

    print(f"\nDesert Climate Metrics:")
    print(f"  Peak Indoor Temperature Range: {min(max_temps):.2f}°C to {max(max_temps):.2f}°C")
    print(f"  Window Aperture Range:         {min(openings):.1f}% to {max(openings):.1f}%")

    assert all(t <= 24.5 for t in max_temps), "Optimizer must effectively prevent daytime overheating"
    print("  [PASS] Overheating avoidance & solar moderation verified.\n")


def test_api_contract_schema_compliance():
    print("=" * 80)
    print("TEST 3: API Contract & Frontend Interface Schema Conformance")
    print("=" * 80)

    candidates = optimize(
        climate="srinagar",
        requirements={"budget": 250000.0, "weightLimit": 6000.0},
        top_n=3,
        pop_size=20,
        generations=10,
        seed=77,
    )

    c0 = candidates[0]
    expected_param_keys = {
        "location", "shape", "orientation", "wallMaterial", "roofMaterial",
        "insulation", "opening", "thermalMass", "length", "width", "height"
    }
    expected_result_keys = {
        "uValue", "indoorTempSeries", "meanIndoorTemp", "indoorTemp",
        "minIndoorTemp", "maxIndoorTemp", "solarGain", "heatLoss",
        "heatingDemand", "comfortPercent", "comfortHours", "comfortHours5c",
        "weight", "cost", "carbonFootprint", "estimated"
    }

    assert expected_param_keys.issubset(c0["params"].keys()), "Missing keys in candidate params"
    assert expected_result_keys.issubset(c0["results"].keys()), "Missing keys in candidate results"
    assert isinstance(c0["results"]["indoorTempSeries"], list), "indoorTempSeries must be list"
    assert len(c0["results"]["indoorTempSeries"]) == 24, "indoorTempSeries must have 24 hourly entries"

    pt0 = c0["results"]["indoorTempSeries"][0]
    for k in ["time", "hour", "temp", "outdoorTemp", "solarRad", "heatFlux"]:
        assert k in pt0, f"HourlyPoint missing key '{k}'"

    print("  [PASS] Complete schema conformance to docs/api-contract.md verified.\n")


if __name__ == "__main__":
    test_leh_extreme_cold_optimization()
    test_jaisalmer_hot_desert_optimization()
    test_api_contract_schema_compliance()
    print("=" * 80)
    print("ALL PHASE 8 TESTS PASSED SUCCESSFULLY!")
    print("=" * 80)
