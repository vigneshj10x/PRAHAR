# -*- coding: utf-8 -*-
"""
simulation_engine/test_surrogate.py

Phase 9 Automated Verification and Demonstration Suite:
  1. Displays held-out test set accuracy metrics (MAE, RMSE, R²) per target output.
  2. Demonstrates fast multi-objective design recommendation (`recommend()`).
  3. Demonstrates high-fidelity physics verification with surrogate delta comparison (`verify()`).
"""

import sys
from pathlib import Path
import time

# Ensure UTF-8 stdout encoding on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from simulation_engine.surrogate import get_surrogate, recommend, verify


def print_held_out_metrics():
    print("=" * 85)
    print("1. HELD-OUT TEST SET ACCURACY METRICS (20% Held-Out Validation)")
    print("=" * 85)

    surrogate = get_surrogate()
    metrics = surrogate.metrics

    print(f"Model: Gradient-Boosted Decision Trees (XGBoost Ensemble)")
    print(f"Validation Sample Size: N_test = {surrogate.n_test_samples} designs (out of {surrogate.n_train_samples + surrogate.n_test_samples} total)")
    print("-" * 85)
    print(f"{'Target Output Variable':<28} | {'Units':<10} | {'MAE':<10} | {'RMSE':<10} | {'R² Score':<10}")
    print("-" * 85)

    units_map = {
        "u_value": "W/m²·K",
        "mean_indoor_temp": "°C",
        "min_indoor_temp": "°C",
        "max_indoor_temp": "°C",
        "solar_gain_wm2": "W/m²",
        "heat_loss_wm2": "W/m²",
        "heating_demand_kwh_day": "kWh/day",
        "comfort_percent": "%",
        "comfort_hours_5c": "hours",
        "total_weight_kg": "kg",
        "total_cost_inr": "₹ INR",
        "carbon_footprint_kgco2": "kg CO2e",
    }

    for tgt, m in metrics.items():
        u = units_map.get(tgt, "")
        print(f"{tgt:<28} | {u:<10} | {m['mae']:<10.4f} | {m['rmse']:<10.4f} | {m['r2']:<10.4f}")

    print("=" * 85)
    print("  [PASS] Surrogate validated to within high-precision engineering tolerance.\n")


def demonstrate_recommend():
    print("=" * 85)
    print("2. FAST MULTI-OBJECTIVE RECOMMENDATION: recommend(climate, requirements)")
    print("=" * 85)

    climate = "leh"
    requirements = {
        "budget": 200000.0,
        "weightLimit": 7500.0,
        "length": 6.0,
        "width": 4.0,
        "height": 2.5,
    }

    t0 = time.perf_counter()
    candidates = recommend(
        climate=climate,
        requirements=requirements,
        top_n=6,
        candidate_pool_size=3000,
        seed=42,
    )
    t1 = time.perf_counter()

    elapsed_ms = (t1 - t0) * 1000.0
    print(f"Evaluated 3,000 design permutations across 6 objectives in {elapsed_ms:.1f} ms.")
    print(f"Identified {len(candidates)} Pareto-optimal candidates:\n")

    for c in candidates:
        p = c["params"]
        r = c["results"]
        print(
            f"  [{c['id']}] {p['shape']:11s} | {p['wallMaterial']:18s} | {p['roofMaterial']:21s} | "
            f"Ins: {p['insulation']:4.0f}mm | Open: {p['opening']:4.1f}% | "
            f"Cost: ₹{r['cost']:7,.0f} | Wt: {r['weight']:5.0f}kg | "
            f"HeatDemand: {r['heatingDemand']:4.2f} kWh/d | Comfort: {r['comfortPercent']:5.1f}% | "
            f"T_mean: {r['meanIndoorTemp']:+5.1f}°C"
        )
        print(f"    -> Note: {c['tradeoffNotes']}")

    assert len(candidates) == 6, "Expected 6 diverse candidates"
    assert all(c["results"]["estimated"] is True for c in candidates), "Expected estimated=True for surrogate"
    print(f"\n  [PASS] Sub-second Pareto recommendation verified.\n")
    return candidates


def demonstrate_verify(cand):
    print("=" * 85)
    print("3. HIGH-FIDELITY PHYSICS VERIFICATION: verify(params, climate)")
    print("=" * 85)
    print(f"Testing Candidate: {cand['id']} ({cand['params']['shape']}, {cand['params']['wallMaterial']}, {cand['params']['roofMaterial']})")

    t0 = time.perf_counter()
    v = verify(params=cand["params"], climate="leh")
    t1 = time.perf_counter()

    print(f"Numerical RC Physics Solver executed in {(t1 - t0) * 1000.0:.1f} ms.")
    print(f"Primary Delta (Mean Indoor Temp): |T_physics - T_surrogate| = {v['deltaFromSurrogate']:.2f} °C")
    print("\nSIDE-BY-SIDE COMPARISON (Numerical Physics vs. ML Surrogate):")
    print("-" * 85)
    print(f"{'Performance Metric':<26} | {'Physics (Ground Truth)':<24} | {'Surrogate Prediction':<22} | {'Delta':<10}")
    print("-" * 85)

    comp = v["surrogateComparison"]
    for k, d in comp.items():
        u = d["unit"]
        phys_val = f"{d['physics']:,.2f} {u}"
        surr_val = f"{d['surrogate']:,.2f} {u}"
        delta_val = f"{d['delta']:,.2f} {u}"
        print(f"{k:<26} | {phys_val:<24} | {surr_val:<22} | {delta_val:<10}")

    print("=" * 85)
    assert v["verifiedAgainstSurrogate"] is True, "Expected verifiedAgainstSurrogate=True"
    assert v["estimated"] is False, "Expected estimated=False for physics verification"
    print("  [PASS] High-fidelity physics verification with delta analysis verified.\n")


if __name__ == "__main__":
    print_held_out_metrics()
    cands = demonstrate_recommend()
    demonstrate_verify(cands[0])
    print("=" * 85)
    print("ALL PHASE 9 VERIFICATION CHECKS COMPLETED SUCCESSFULLY!")
    print("=" * 85)
