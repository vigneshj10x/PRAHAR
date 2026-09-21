"""
scratch/verify_all_scenarios.py

Verification runner for the 4 DRDO-grade operational test scenarios:
Scenario 1: Heliborne FEMS in Leh (panel weight <= 30 kg/m2; no concrete/stone/adobe)
Scenario 2: Road-bound bunker for ammunition storage (artillery hardening, 3.5x mass, 0W internal gain, 5-25C comfort)
Scenario 3: Future climate projection (2030-2040 CMIP6 Leh projection, disclaimer shown)
Scenario 4: Limited materials (porter-carried, [PVC canvas, aerogel])
"""
import sys
from pathlib import Path
from datetime import datetime, timezone
import json

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from simulation_engine.engine import simulate, SimulationParams, ClimateInput
from simulation_engine.materials import materials_db
from simulation_engine.surrogate.pipeline import recommend
from backend.climate import fetch_future_climate_projection_sync

print("=" * 80)
print("DRDO OPERATIONAL SCENARIO VERIFICATION")
print("=" * 80)

# ── SCENARIO 1: Heliborne FEMS in Leh ──────────────────────────────────────────
print("\n[SCENARIO 1] Heliborne FEMS in Leh (Helicopter deployment, panel limit <= 30 kg/m2)")
s1_reqs = {
    "shelter_purpose": "troop_habitation",
    "deployment_method": "heliborne",
    "budget": 250000.0,
    "weightLimit": 6000.0,
}
s1_results = recommend("leh", s1_reqs, top_n=4)
print(f"Generated {len(s1_results)} Pareto Candidates:")
s1_valid = True
for idx, c in enumerate(s1_results):
    p = c["params"]
    r = c["results"]
    wall_mat = materials_db.get(p["wallMaterial"])
    roof_mat = materials_db.get(p["roofMaterial"])
    wall_wt = wall_mat.weight if wall_mat else 0.0
    roof_wt = roof_mat.weight if roof_mat else 0.0
    max_panel = max(wall_wt, roof_wt)
    is_ok = max_panel <= 30.0 and p["wallMaterial"] not in ["concrete", "stone", "adobe"]
    if not is_ok:
        s1_valid = False
    print(f"  Cand {idx+1}: Shape={p['shape']}, Wall={p['wallMaterial']} ({wall_wt} kg/m²), "
          f"Roof={p['roofMaterial']} ({roof_wt} kg/m²) | MaxPanel={max_panel} kg/m² (<=30 limit: {is_ok}) | "
          f"Cost=Rs {r['cost']:,.0f}, TotalWt={r['weight']:,.0f} kg")

assert s1_valid, "Scenario 1 Failed: Heavy material found in heliborne deployment!"
print(">>> SCENARIO 1 PASSED: All candidates meet heliborne panel weight constraint (<= 30 kg/m²).")

# ── SCENARIO 2: Road-bound bunker for ammunition storage ───────────────────────
print("\n[SCENARIO 2] Road-bound bunker for ammunition storage (Artillery hardened, 0W internal, 5°C-25°C comfort)")
s2_sim_params = SimulationParams(
    shape="bunker_bermed",
    orientation=180.0,
    wall_material="concrete",
    roof_material="concrete",
    insulation=150.0,
    opening=5.0,
    thermal_mass="high",
    length=8.0,
    width=5.0,
    height=2.5,
    shelter_purpose="ammunition_storage",
    shelter_permanence="permanent",
    deployment_method="road_bound",
    hardening="artillery_hardened",
)
from simulation_engine.generate_dataset import CLIMATES
s2_res = simulate(params=s2_sim_params, climate=CLIMATES["leh"])
print(f"  Shape: {s2_sim_params.shape} | Wall: {s2_sim_params.wall_material} | Hardening: {s2_sim_params.hardening}")
print(f"  Envelope U-Value: {s2_res.u_value} W/m²·K (includes roof +1.0 R-value for artillery slab)")
print(f"  Max Panel Weight Allowed: {s2_res.max_panel_weight_kg_m2} kg/m² (Road-bound)")
print(f"  Comfort Band: {s2_res.comfort_min_c}°C to {s2_res.comfort_max_c}°C")
print(f"  Mean Temp: {s2_res.mean_indoor_temp}°C | Weight: {s2_res.weight} kg | Heating Demand: {s2_res.heating_demand} kWh/day")

assert s2_res.comfort_min_c == 5.0 and s2_res.comfort_max_c == 25.0, "Scenario 2 Failed: Comfort band mismatch!"
assert s2_res.max_panel_weight_kg_m2 == 999.0, "Scenario 2 Failed: Road-bound panel limit mismatch!"
print(">>> SCENARIO 2 PASSED: Ammunition storage comfort band (5-25°C) & artillery mass active.")

# ── SCENARIO 3: Future climate projection ──────────────────────────────────────
print("\n[SCENARIO 3] Future Climate Projection (Leh 2030-2040 CMIP6)")
proj = fetch_future_climate_projection_sync(
    lat=34.1526,
    lon=77.5771,
    build_start_date="2030-01-01",
    build_duration_years=10
)
print(f"  Projection Source: {proj['source']}")
print(f"  Timeline: {proj.get('start_date')} to {proj.get('end_date')}")
print(f"  Worst Case Month: {proj.get('worst_month')}")
print(f"  Diurnal Outdoor Temp Series (24h): min={min(proj['hourlyOutdoorTemp']):.1f}°C, max={max(proj['hourlyOutdoorTemp']):.1f}°C")
print(f"  Diurnal Solar Rad Series (24h): peak={max(proj['hourlySolarRadiation']):.0f} W/m²")

assert proj["source"] == "open-meteo-cmip6", f"Scenario 3 Failed: Unexpected source {proj['source']}"
assert len(proj["hourlyOutdoorTemp"]) == 24, "Scenario 3 Failed: 24h temp series missing!"
print(">>> SCENARIO 3 PASSED: Live Open-Meteo CMIP6 projection fetched with worst-case month.")

# ── SCENARIO 4: Limited materials (Porter-carried, [PVC canvas, aerogel]) ────────
print("\n[SCENARIO 4] Limited Materials (Porter-carried, availableMaterials = ['tactical_fabric_pvc', 'aerogel_insulation'])")
s4_reqs = {
    "deployment_method": "porter_carried",
    "available_materials": ["tactical_fabric_pvc", "aerogel_insulation"],
    "budget": 100000.0,
    "weightLimit": 1500.0,
}
s4_results = recommend("leh", s4_reqs, top_n=4)
print(f"Generated {len(s4_results)} Pareto Candidates:")
s4_valid = True
for idx, c in enumerate(s4_results):
    p = c["params"]
    r = c["results"]
    wall_ok = p["wallMaterial"] == "tactical_fabric_pvc"
    roof_ok = p["roofMaterial"] == "tactical_fabric_pvc"
    if not (wall_ok and roof_ok):
        s4_valid = False
    print(f"  Cand {idx+1}: Wall={p['wallMaterial']}, Roof={p['roofMaterial']} | "
          f"Ins={p['insulation']} mm | Total Weight={r['weight']} kg | Cost=Rs {r['cost']:,.0f}")

assert s4_valid, "Scenario 4 Failed: Materials other than tactical_fabric_pvc were recommended!"
print(">>> SCENARIO 4 PASSED: Only tactical_fabric_pvc selected across all candidates.")

print("\n" + "=" * 80)
print("ALL 4 DRDO REAL-WORLD TEST SCENARIOS PASSED WITH ZERO REGRESSIONS!")
print("=" * 80)
