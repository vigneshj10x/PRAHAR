"""
dihar_and_dataset_deepdive.py

1. DIHAR Trench Greenhouse Physical Benchmark Validation (Leh Winter)
2. Rigorous Audit & Categorization of the 592 rows (max_indoor_temp > 50°C) from training_dataset.csv
3. Hour-by-hour energy balance trace for anomalous rows.
"""
import sys
import math
import pandas as pd
import numpy as np
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from simulation_engine.engine import simulate, SimulationParams, ClimateInput, ReducedOrderThermalModel
from simulation_engine.geometry import calculate_geometry
from simulation_engine.materials import materials_db


def run_dihar_benchmark():
    print("=" * 95)
    print("TASK 1 & 2: DIHAR TRENCH GREENHOUSE EXPERIMENTAL BENCHMARK VALIDATION (LEH WINTER)")
    print("Citation: Defence Institute of High Altitude Research (DIHAR-DRDO) & SKUAST-K/Leh High-Altitude Studies")
    print("=" * 95)

    # DIHAR Trench Greenhouse specifications:
    # Dimensions: 30 ft x 10 ft x ~4 ft (9.14m L x 3.05m W x 1.2m H), Stone masonry back/bermed, South UV Poly/Glazing
    # Climate: Leh January winter design day (-18°C night to -8°C day, ambient mean -13.5°C)
    # Citation: DIHAR-DRDO Annual Reports, SKUAST-K/Leh Greenhouse Technology Publications
    # Key: The entire south-facing slope is 200μm LDPE agricultural polyethylene film
    dihar_params = SimulationParams(
        shape="bunker_bermed",  # Partially underground/bermed trench morphology
        orientation=180.0,      # South facing glazing
        wall_material="stone",  # Dry stone masonry (thermal mass storage)
        roof_material="timber_insulated_roof",
        glazing_material="polyethylene_sheet",  # DIHAR uses agricultural poly film (SHGC=0.87)
        insulation=50.0,        # Standard earth-coupled insulation equivalent
        opening=75.0,           # ~75% south aperture (entire south slope is poly film)
        thermal_mass="high",    # Heavy stone mass
        length=9.14,            # 30 ft
        width=3.05,             # 10 ft
        height=1.40,            # Trench profile
        ach=0.3,                # Sealed winter greenhouse
        internal_gain_w=50.0,   # Minimal vegetative / sensor heat
        greenhouse_mode=True    # Enable high-aperture greenhouse mode
    )

    leh_climate = ClimateInput(
        lat=34.1526,
        lon=77.5771,
        altitude=3524.0,
        hourly_outdoor_temp=[
            -18.0, -18.6, -19.0, -19.2, -19.4, -19.5,
            -18.8, -17.2, -14.5, -11.8, -9.5,  -8.4,
            -8.0,  -8.2,  -9.0,  -10.5, -12.4, -14.2,
            -15.5, -16.3, -16.9, -17.3, -17.6, -17.8
        ],
        hourly_solar_radiation=[
            0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
            15.0, 80.0, 210.0, 360.0, 480.0, 520.0,
            510.0, 440.0, 310.0, 150.0, 35.0, 0.0,
            0.0, 0.0, 0.0, 0.0, 0.0, 0.0
        ],
        wind_speed=3.2,
        humidity_pct=24.5
    )

    res = simulate(dihar_params, leh_climate)

    amb_min = min(leh_climate.hourly_outdoor_temp)   # -19.5 °C
    amb_max = max(leh_climate.hourly_outdoor_temp)   # -8.0 °C
    amb_avg = sum(leh_climate.hourly_outdoor_temp) / 24.0  # -14.88 °C

    indoor_min = res.min_indoor_temp
    indoor_max = res.max_indoor_temp
    indoor_avg = res.mean_indoor_temp

    day_delta_model = indoor_max - amb_max
    night_delta_model = indoor_min - amb_min
    mean_delta_model = indoor_avg - amb_avg

    dihar_day_delta_target = 20.7
    dihar_night_delta_target = 7.0

    print(f"\nDIHAR Experimental vs Simulation Engine Results:")
    print(f"{'Condition':<28} | {'Ambient Air':<14} | {'Model Indoor':<14} | {'Model Delta (T_in - T_out)':<28} | {'DIHAR Published Target':<22} | {'Discrepancy'}")
    print("-" * 125)
    print(f"{'Daytime Peak (13:00-14:00)':<28} | {amb_max:>6.1f} °C       | {indoor_max:>6.2f} °C       | {day_delta_model:>+7.2f} °C above ambient       | {dihar_day_delta_target:>+6.1f} °C above ambient | {day_delta_model - dihar_day_delta_target:>+5.2f} °C")
    print(f"{'Nighttime Minimum (05:00)':<28} | {amb_min:>6.1f} °C       | {indoor_min:>6.2f} °C       | {night_delta_model:>+7.2f} °C above ambient       | {dihar_night_delta_target:>+6.1f} °C above ambient | {night_delta_model - dihar_night_delta_target:>+5.2f} °C")
    print(f"{'24-Hour Diurnal Average':<28} | {amb_avg:>6.1f} °C       | {indoor_avg:>6.2f} °C       | {mean_delta_model:>+7.2f} °C above ambient       | ~+13.5 °C above ambient | {mean_delta_model - 13.5:>+5.2f} °C")

    print("\nHourly Telemetry for Simulated DIHAR Trench Structure:")
    print("Hour | Ambient (°C) | Solar Rad (W/m²) | Indoor Temp (°C) | Delta from Ambient (°C)")
    print("-----|--------------|------------------|------------------|------------------------")
    for pt in res.indoor_temp_series:
        delta = pt.temp - pt.outdoor_temp
        print(f"{pt.time} | {pt.outdoor_temp:>12.1f} | {pt.solar_rad:>16.1f} | {pt.temp:>16.2f} | {delta:>+22.2f}")


def analyze_dataset_flags():
    print("\n" + "=" * 95)
    print("TASK 3 & 4: AUDIT & CLASSIFICATION OF 592 ROWS (max_indoor_temp > 50°C)")
    print("=" * 95)

    csv_path = PROJECT_ROOT / "simulation-engine" / "data" / "training_dataset.csv"
    df = pd.read_csv(csv_path)

    flagged = df[df["max_indoor_temp"] > 50.0].copy()
    print(f"Total Dataset Rows: {len(df)}")
    print(f"Flagged Rows (>50°C): {len(flagged)} ({len(flagged)/len(df)*100:.2f}%)")

    # Bucket classification rules:
    # (a) Physically Plausible Given Precedent:
    #     - Tropical/Hot climates (Jaisalmer, Kochi, Delhi) with high solar, low ventilation, or
    #     - High solar aperture (>= 20%) + High insulation (>= 100mm) + closed sealed space in bright sun,
    #       reaching 45°C - 65°C (matching SKUAST/DIHAR summer greenhouse peak records of 45-64°C).
    # (b) Implausible:
    #     - Extreme unphysical runaway (T_max > 75°C, or subzero winter with minimal insulation somehow exceeding 75°C - 166°C).
    
    bucket_a = flagged[
        ((flagged["climate_id"].isin(["jaisalmer", "kochi", "delhi"])) & (flagged["max_indoor_temp"] <= 75.0)) |
        ((flagged["opening_ratio_pct"] >= 20.0) & (flagged["insulation_mm"] >= 75.0) & (flagged["max_indoor_temp"] <= 75.0))
    ]
    bucket_b = flagged[~flagged.index.isin(bucket_a.index)]

    print(f"\nClassification Split:")
    print(f"  Bucket (a) [Physically Plausible Greenhouse/Passive Solar Trap (50°C - 75°C)]: {len(bucket_a)} rows ({len(bucket_a)/len(flagged)*100:.1f}%)")
    print(f"  Bucket (b) [Implausible Numerical Runaway (>75°C to 166.7°C)]:                  {len(bucket_b)} rows ({len(bucket_b)/len(flagged)*100:.1f}%)")

    print("\n--- Sample Bucket (a) Rows (Realistic Passive Solar Greenhouse Heating) ---")
    print(bucket_a[["climate_id", "shape", "wall_material", "insulation_mm", "opening_ratio_pct", "ambient_max_temp", "max_indoor_temp"]].head(6).to_string())

    print("\n--- Sample Bucket (b) Rows (Anomalous Runaway Peaks) ---")
    print(bucket_b[["climate_id", "shape", "wall_material", "insulation_mm", "opening_ratio_pct", "ambient_max_temp", "max_indoor_temp"]].head(6).to_string())

    # Trace energy balance on the most extreme row in Bucket (b) if any exist
    if len(bucket_b) > 0:
        worst_idx = bucket_b["max_indoor_temp"].idxmax()
        worst_row = bucket_b.loc[worst_idx]
        print(f"\nTracing Energy Balance on Worst-Case Bucket (b) Row (Index {worst_idx}, Peak = {worst_row['max_indoor_temp']:.2f}°C):")
        print(f"  Climate: {worst_row['climate_id']} | Shape: {worst_row['shape']} | Wall: {worst_row['wall_material']} | Ins: {worst_row['insulation_mm']}mm | Opening: {worst_row['opening_ratio_pct']}% | Mass: {worst_row['thermal_mass']}")
        print(f"  Dimensions: {worst_row['length_m']}m L x {worst_row['width_m']}m W x {worst_row['height_m']}m H | Vol: {worst_row['volume_m3']:.2f} m3 | Floor: {worst_row['floor_area_m2']:.2f} m2")
    else:
        print("\nNo Bucket (b) anomalous rows found — all high-temperature rows are physically plausible.")

    return bucket_a, bucket_b

if __name__ == "__main__":
    run_dihar_benchmark()
    analyze_dataset_flags()
