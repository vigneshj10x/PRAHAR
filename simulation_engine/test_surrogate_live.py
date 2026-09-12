import numpy as np
import pandas as pd
from simulation_engine.engine import simulate, SimulationParams, ClimateInput
from simulation_engine.surrogate.model import get_surrogate, CATEGORIES

surrogate = get_surrogate()
np.random.seed(999)

test_cases = [
    {
        "name": "Case 1 (Extreme Cold Leh - Glamping Dome)",
        "params": SimulationParams(shape="semidome", orientation=195.0, wall_material="insulated_cavity_brick", roof_material="timber_insulated_roof", insulation=180.0, opening=22.0, thermal_mass="high", length=7.2, width=4.8, height=2.8),
        "climate": ClimateInput(lat=34.15, lon=77.58, altitude=3524.0, wind_speed=4.2)
    },
    {
        "name": "Case 2 (A-Frame High Altitude Military Bunker)",
        "params": SimulationParams(shape="aframe", orientation=180.0, wall_material="stone_masonry", roof_material="standing_seam_metal", insulation=120.0, opening=10.0, thermal_mass="high", length=6.0, width=4.0, height=3.2),
        "climate": ClimateInput(lat=34.08, lon=74.80, altitude=2200.0, wind_speed=5.0)
    },
    {
        "name": "Case 3 (Composite Climate - Mud Brick Rectangular)",
        "params": SimulationParams(shape="rectangular", orientation=160.0, wall_material="adobe", roof_material="reinforced_concrete_slab", insulation=40.0, opening=15.0, thermal_mass="medium", length=5.5, width=3.5, height=2.4),
        "climate": ClimateInput(lat=28.61, lon=77.21, altitude=216.0, wind_speed=2.5, hourly_outdoor_temp=[12.0+5.0*np.sin((h-8)*np.pi/12) for h in range(24)])
    },
    {
        "name": "Case 4 (PCM Enhanced High-Efficiency Emergency Pod)",
        "params": SimulationParams(shape="rectangular", orientation=180.0, wall_material="pcm_enhanced_panel", roof_material="polyurethane_sandwich_panel", insulation=150.0, opening=25.0, thermal_mass="high", length=6.0, width=4.0, height=2.5),
        "climate": ClimateInput(lat=34.15, lon=77.58, altitude=3524.0, wind_speed=3.0)
    },
    {
        "name": "Case 5 (Hot-Arid Thar Desert Quonset/Vault)",
        "params": SimulationParams(shape="vaulted_barrel", orientation=180.0, wall_material="aerated_autoclaved_concrete", roof_material="timber_insulated_roof", insulation=75.0, opening=8.0, thermal_mass="low", length=8.0, width=5.0, height=3.0),
        "climate": ClimateInput(lat=26.92, lon=70.91, altitude=225.0, wind_speed=4.0, hourly_outdoor_temp=[20.0+12.0*np.sin((h-9)*np.pi/12) for h in range(24)])
    }
]

print("="*90)
print("STEP 8: LIVE SURROGATE VS NUMERICAL PHYSICS VALIDATION (5 UNSEEN CASES)")
print("="*90)

all_errors = []

for tc in test_cases:
    p = tc["params"]
    c = tc["climate"]
    phys = simulate(p, c)
    surr = surrogate.predict_single(p, c)
    
    t_err = abs(phys.mean_indoor_temp - surr["mean_indoor_temp"])
    t_pct = abs(t_err / (abs(phys.mean_indoor_temp) if abs(phys.mean_indoor_temp) > 0.5 else 1.0)) * 100.0
    
    hl_err = abs(phys.heat_loss - surr["heat_loss_wm2"])
    hl_pct = abs(hl_err / (abs(phys.heat_loss) if abs(phys.heat_loss) > 0.5 else 1.0)) * 100.0
    
    sg_err = abs(phys.solar_gain - surr["solar_gain_wm2"])
    sg_pct = abs(sg_err / (abs(phys.solar_gain) if abs(phys.solar_gain) > 0.5 else 1.0)) * 100.0
    
    hd_err = abs(phys.heating_demand - surr["heating_demand_kwh_day"])
    hd_pct = abs(hd_err / (abs(phys.heating_demand) if abs(phys.heating_demand) > 0.5 else 1.0)) * 100.0
    
    u_err = abs(phys.u_value - surr["u_value"])
    u_pct = abs(u_err / (phys.u_value if phys.u_value > 0.01 else 1.0)) * 100.0

    print(f"\n--- {tc['name']} ---")
    print(f"Metric              | Physics Solver | Surrogate Pred | Absolute Delta | % Error")
    print(f"--------------------+----------------+----------------+----------------+---------")
    print(f"Mean Indoor Temp    | {phys.mean_indoor_temp:8.2f} °C   | {surr['mean_indoor_temp']:8.2f} °C   | {t_err:8.2f} °C   | {t_pct:5.2f}%")
    print(f"Heat Loss           | {phys.heat_loss:8.1f} W/m² | {surr['heat_loss_wm2']:8.1f} W/m² | {hl_err:8.1f} W/m² | {hl_pct:5.2f}%")
    print(f"Solar Gain          | {phys.solar_gain:8.1f} W/m² | {surr['solar_gain_wm2']:8.1f} W/m² | {sg_err:8.1f} W/m² | {sg_pct:5.2f}%")
    print(f"Heating Demand      | {phys.heating_demand:8.2f} kWh  | {surr['heating_demand_kwh_day']:8.2f} kWh  | {hd_err:8.2f} kWh  | {hd_pct:5.2f}%")
    print(f"Overall U-Value     | {phys.u_value:8.3f} W/m²K| {surr['u_value']:8.3f} W/m²K| {u_err:8.3f} W/m²K| {u_pct:5.2f}%")
    print(f"Cost (INR)          | ₹{phys.cost:8,.0f}     | ₹{surr['total_cost_inr']:8,.0f}     | ₹{abs(phys.cost - surr['total_cost_inr']):6,.0f}     | {abs(phys.cost - surr['total_cost_inr'])/phys.cost*100:5.2f}%")
    print(f"Weight (kg)         | {phys.weight:8.1f} kg   | {surr['total_weight_kg']:8.1f} kg   | {abs(phys.weight - surr['total_weight_kg']):6.1f} kg   | {abs(phys.weight - surr['total_weight_kg'])/phys.weight*100:5.2f}%")
    
    all_errors.append({"t_pct": t_pct, "hl_pct": hl_pct, "sg_pct": sg_pct, "hd_pct": hd_pct, "u_pct": u_pct})

avg_t = np.mean([e["t_pct"] for e in all_errors])
avg_hl = np.mean([e["hl_pct"] for e in all_errors])
avg_sg = np.mean([e["sg_pct"] for e in all_errors])
avg_hd = np.mean([e["hd_pct"] for e in all_errors])
avg_u = np.mean([e["u_pct"] for e in all_errors])

print("\n" + "="*90)
print(f"SUMMARY MEAN ABSOLUTE PERCENTAGE ERROR (MAPE) ACROSS 5 UNSEEN CASES:")
print(f"  Mean Temp MAPE:        {avg_t:.2f}%")
print(f"  Heat Loss MAPE:        {avg_hl:.2f}%")
print(f"  Solar Gain MAPE:       {avg_sg:.2f}%")
print(f"  Heating Demand MAPE:   {avg_hd:.2f}%")
print(f"  U-Value MAPE:          {avg_u:.2f}%")
print("="*90)
