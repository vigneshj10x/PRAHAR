"""
diagnostic_pass.py
Runs full diagnostics across Step 1 to Step 8.
"""
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import json
from simulation_engine.engine import simulate, SimulationParams, ClimateInput
from simulation_engine.materials import materials_db
from simulation_engine.optimization.optimizer import optimize
from simulation_engine.surrogate.pipeline import recommend, verify
from simulation_engine.generate_dataset import CLIMATES

def run_diagnostic():
    print("=" * 80)
    print("STEP 1 & 2: Testing Frontend Payload -> Backend Ingress")
    print("=" * 80)
    
    # Test Payload A: Default Baseline (Adobe, 50mm insulation, Leh)
    payload_a = {
        "location": {"lat": 34.1526, "lon": 77.5771, "altitude": 3524.0},
        "shape": "rectangular",
        "orientation": 180.0,
        "wallMaterial": "adobe",
        "roofMaterial": "timber_insulated_roof",
        "insulation": 25.0,
        "opening": 14.0,
        "thermalMass": "medium",
        "length": 6.0,
        "width": 4.0,
        "height": 2.5
    }
    
    # Test Payload B: User changed insulation to 150mm, stone wall, jaisalmer
    payload_b = {
        "location": {"lat": 26.9157, "lon": 70.9083, "altitude": 225.0},
        "shape": "vaulted_barrel",
        "orientation": 180.0,
        "wallMaterial": "pcm_enhanced_panel",
        "roofMaterial": "timber_insulated_roof",
        "insulation": 150.0,
        "opening": 20.0,
        "thermalMass": "high",
        "length": 8.0,
        "width": 5.0,
        "height": 3.0
    }
    
    print("\n--- SIMULATION A (25mm insulation, Leh) ---")
    p_a = SimulationParams(
        shape=payload_a["shape"],
        orientation=payload_a["orientation"],
        wall_material=payload_a["wallMaterial"],
        roof_material=payload_a["roofMaterial"],
        insulation=payload_a["insulation"],
        opening=payload_a["opening"],
        thermal_mass=payload_a["thermalMass"],
        length=payload_a["length"],
        width=payload_a["width"],
        height=payload_a["height"]
    )
    c_a = ClimateInput(lat=34.1526, lon=77.5771, altitude=3524.0)
    res_a = simulate(p_a, c_a)
    print(f"Result A: Mean Temp={res_a.mean_indoor_temp}°C, Heat Loss={res_a.heat_loss} W/m2, U-val={res_a.u_value}, Cost=₹{res_a.cost:,.0f}, Wt={res_a.weight}kg")
    
    print("\n--- SIMULATION B (150mm insulation, PCM Panel, Vaulted, Thar Desert) ---")
    p_b = SimulationParams(
        shape=payload_b["shape"],
        orientation=payload_b["orientation"],
        wall_material=payload_b["wallMaterial"],
        roof_material=payload_b["roofMaterial"],
        insulation=payload_b["insulation"],
        opening=payload_b["opening"],
        thermal_mass=payload_b["thermalMass"],
        length=payload_b["length"],
        width=payload_b["width"],
        height=payload_b["height"]
    )
    # Jaisalmer hourly profile
    jaisalmer_climate = ClimateInput(
        lat=26.9157, lon=70.9083, altitude=225.0,
        hourly_outdoor_temp=[9.5, 8.8, 8.2, 8.0, 8.4, 9.5, 12.5, 16.0, 19.5, 22.8, 25.2, 26.5, 26.0, 25.2, 23.8, 21.5, 18.5, 16.0, 14.2, 12.8, 11.8, 11.0, 10.5, 10.0],
        hourly_solar_radiation=[0,0,0,0,0,0, 20, 110, 260, 420, 540, 580, 570, 500, 370, 200, 45, 0, 0,0,0,0,0,0]
    )
    res_b = simulate(p_b, jaisalmer_climate)
    print(f"Result B: Mean Temp={res_b.mean_indoor_temp}°C, Heat Loss={res_b.heat_loss} W/m2, U-val={res_b.u_value}, Cost=₹{res_b.cost:,.0f}, Wt={res_b.weight}kg")

    print("\n" + "=" * 80)
    print("STEP 6: AUTO-OPTIMIZE NSGA-II PARETO OPTIMIZATION")
    print("=" * 80)
    candidates = optimize(
        climate="leh",
        requirements={"budget": 250000, "weightLimit": 8000, "minComfortPercent": 50},
        top_n=4,
        pop_size=20,
        generations=10,
        seed=42
    )
    print(f"\nGenerated {len(candidates)} evolved Pareto Candidates:")
    for c in candidates:
        print(f"  Candidate {c['id']}: Shape={c['params']['shape']}, Wall={c['params']['wallMaterial']}, Ins={c['params']['insulation']}mm, Cost=₹{c['results']['cost']:,.0f}, Wt={c['results']['weight']:,.0f}kg, MeanTemp={c['results']['meanIndoorTemp']}°C")
        print(f"    Rationale: {c['tradeoffNotes']}")

if __name__ == "__main__":
    run_diagnostic()
