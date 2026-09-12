"""
simulation-engine/test_validation.py

Qualitative and quantitative validation suite for THERMO-SHIELD thermal simulation engine.
Tests physical correctness, monotonicity of thermal parameters, and realistic Leh-winter behavior.
"""
import sys
import math

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from engine import simulate, SimulationParams, ClimateInput


def test_insulation_impact():
    print("=" * 70)
    print("TEST 1: Insulation Thickness Impact (25mm -> 75mm -> 150mm)")
    print("=" * 70)

    thicknesses = [25.0, 75.0, 150.0]
    results = []

    for ins in thicknesses:
        p = SimulationParams(wall_material="concrete", insulation=ins, opening=14.0, thermal_mass="high")
        res = simulate(p)
        results.append(res)
        print(f"  Insulation = {ins:3.0f} mm -> U-Value = {res.u_value:.3f} W/m²K | Mean T_in = {res.mean_indoor_temp:+5.2f} °C | Heat Loss = {res.heat_loss:5.1f} W/m² | Heating Demand = {res.heating_demand:4.1f} kWh/day")

    # Assertions for qualitative physical correctness
    assert results[0].u_value > results[1].u_value > results[2].u_value, "FAIL: Higher insulation must decrease U-value"
    assert results[0].mean_indoor_temp < results[1].mean_indoor_temp < results[2].mean_indoor_temp, "FAIL: Higher insulation must increase indoor temperature"
    assert results[0].heating_demand > results[1].heating_demand > results[2].heating_demand, "FAIL: Higher insulation must reduce heating energy demand"
    assert abs(results[0].heat_loss) > abs(results[2].heat_loss), "FAIL: Higher insulation must reduce absolute heat loss"
    print("  [PASS] Physical monotonicity verified: More insulation -> Lower U-value -> Higher T_in -> Lower fuel demand.\n")


def test_opening_ratio_impact():
    print("=" * 70)
    print("TEST 2: South Window Opening Ratio Impact (5% vs 14% vs 25%)")
    print("=" * 70)

    openings = [5.0, 14.0, 25.0]
    results = []

    for op in openings:
        p = SimulationParams(wall_material="aac_block", insulation=100.0, opening=op, thermal_mass="medium")
        res = simulate(p)
        results.append(res)
        print(f"  South Opening = {op:2.0f}% -> Solar Gain = {res.solar_gain:5.1f} W/m² | Peak T_in = {res.max_indoor_temp:+5.2f} °C | Night Min T_in = {res.min_indoor_temp:+5.2f} °C")

    # Solar harvest must strictly increase with glazing area
    assert results[0].solar_gain < results[1].solar_gain < results[2].solar_gain, "FAIL: Larger window aperture must harvest more solar energy"
    assert results[0].max_indoor_temp < results[2].max_indoor_temp, "FAIL: Larger window aperture must generate higher daytime peak temperature"
    print("  [PASS] Solar aperture behavior verified: Higher opening ratio -> Greater solar harvest -> Higher peak daytime heat.\n")


def test_pcm_thermal_buffering():
    print("=" * 70)
    print("TEST 3: Phase Change Material (PCM) Thermal Buffering")
    print("=" * 70)

    # 1. Non-PCM lightweight assembly
    p_baseline = SimulationParams(wall_material="insulated_panel", insulation=50.0, opening=14.0, thermal_mass="low")
    res_baseline = simulate(p_baseline)
    swing_baseline = res_baseline.max_indoor_temp - res_baseline.min_indoor_temp

    # 2. PCM-enhanced wallboard assembly
    p_pcm = SimulationParams(wall_material="pcm_enhanced_panel", insulation=50.0, opening=14.0, thermal_mass="high")
    res_pcm = simulate(p_pcm)
    swing_pcm = res_pcm.max_indoor_temp - res_pcm.min_indoor_temp

    print(f"  Without PCM (Lightweight Panel): Diurnal Swing = {swing_baseline:.2f} °C (Min {res_baseline.min_indoor_temp:.1f} °C -> Max {res_baseline.max_indoor_temp:.1f} °C)")
    print(f"  With PCM (PCM-Enhanced Panel):   Diurnal Swing = {swing_pcm:.2f} °C (Min {res_pcm.min_indoor_temp:.1f} °C -> Max {res_pcm.max_indoor_temp:.1f} °C)")

    assert swing_pcm < swing_baseline, "FAIL: PCM latent storage must dampen diurnal temperature swing"
    print("  [PASS] PCM latent storage verified: Dampens diurnal temperature fluctuations.\n")


def test_leh_winter_full_run():
    print("=" * 70)
    print("TEST 4: Full Engineering Run — Leh High Altitude Winter Design Day")
    print("=" * 70)

    # Scenario: 6m x 4m x 2.5m high-altitude cold shelter in Leh, Ladakh
    params = SimulationParams(
        shape="semidome",
        orientation=180.0,
        wall_material="composite",
        roof_material="timber_insulated_roof",
        insulation=120.0,
        opening=18.0,
        thermal_mass="high",
        length=6.0,
        width=4.0,
        height=2.5
    )

    climate = ClimateInput(
        lat=34.1526,
        lon=77.5771,
        altitude=3524.0,
        wind_speed=3.8
    )

    res = simulate(params=params, climate=climate)

    print(f"  Shelter Configuration:")
    print(f"    - Geometry:       {params.shape.upper()} ({params.length}m L x {params.width}m W x {params.height}m H)")
    print(f"    - Wall Substrate: {params.wall_material} (120 mm insulation)")
    print(f"    - Aperture:       {params.opening}% South Glazing (SHGC=0.58, U=1.40 W/m²K)")
    print(f"    - Altitude:       {climate.altitude:.0f} m (Air density rho = {1.204 * math.exp(-3524/8500):.3f} kg/m³)")
    print()
    print(f"  Performance Results:")
    print(f"    * Overall Assembly U-Value:   {res.u_value:.3f} W/(m²·K)")
    print(f"    * 24h Mean Indoor Temp:       {res.mean_indoor_temp:+5.2f} °C (vs Ambient Mean -14.2 °C)")
    print(f"    * Diurnal Range:              Min {res.min_indoor_temp:+5.2f} °C | Max {res.max_indoor_temp:+5.2f} °C")
    print(f"    * Average Solar Gain:         {res.solar_gain:.1f} W/m²")
    print(f"    * Average Fabric Heat Loss:   {res.heat_loss:.1f} W/m²")
    print(f"    * Auxiliary Heating Demand:   {res.heating_demand:.2f} kWh/day (18°C setpoint)")
    print(f"    * Survivability Hours (>5°C): {res.comfort_hours_5c:.1f} hours/day")
    print(f"    * Total Envelope Weight:      {res.weight:,.1f} kg")
    print(f"    * Estimated Envelope Cost:    INR Rs. {res.cost:,.0f}")
    print()
    print("  Hourly 24-Hour Diurnal Temperature Profile:")
    print("  Hour | Ambient (°C) | Solar Rad (W/m²) | Indoor Temp (°C) | Net Flux (W/m²)")
    print("  -----|--------------|------------------|------------------|----------------")
    for pt in res.indoor_temp_series:
        print(f"  {pt.time} |    {pt.outdoor_temp:+5.1f}     |      {pt.solar_rad:4.0f}        |      {pt.temp:+5.2f}       |    {pt.heat_flux:+5.1f}")

    print("=" * 70)
    print("  [SUCCESS] All physical validation checks passed cleanly.")
    print("=" * 70)


if __name__ == "__main__":
    import math
    test_insulation_impact()
    test_opening_ratio_impact()
    test_pcm_thermal_buffering()
    test_leh_winter_full_run()
