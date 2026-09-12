# -*- coding: utf-8 -*-
"""
simulation_engine/surrogate/train.py

Training script for Phase 9 Gradient-Boosted ML Surrogate Model.
Loads Phase 7 simulation dataset, trains XGBoost regression models on an 80/20 train/test split,
outputs held-out validation error metrics (MAE, RMSE, R²), and serializes models to disk.

Usage:
  python simulation_engine/surrogate/train.py
  python simulation_engine/surrogate/train.py --dataset path/to/dataset.csv --output path/to/model.joblib
"""

import argparse
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from simulation_engine.surrogate.model import SurrogateModel


def main():
    parser = argparse.ArgumentParser(description="Train THERMO-SHIELD ML Surrogate Model")
    parser.add_argument(
        "--dataset",
        type=str,
        default=None,
        help="Path to training dataset CSV or Parquet (defaults to Phase 7 dataset)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Path to save serialized model bundle",
    )
    parser.add_argument(
        "--test-size",
        type=float,
        default=0.20,
        help="Fraction of dataset held out for testing (default: 0.20)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for train/test split reproducibility",
    )
    args = parser.parse_args()

    # Resolve dataset path
    dataset_path = None
    if args.dataset:
        dataset_path = Path(args.dataset)
    else:
        for cand in [
            PROJECT_ROOT / "simulation_engine" / "data" / "training_dataset.csv",
            PROJECT_ROOT / "simulation-engine" / "data" / "training_dataset.csv",
            PROJECT_ROOT / "simulation-engine" / "data" / "training_dataset.parquet",
        ]:
            if cand.exists():
                dataset_path = cand
                break

    if not dataset_path or not dataset_path.exists():
        print(f"Error: Could not locate Phase 7 training dataset.")
        sys.exit(1)

    # Resolve output path
    output_path = None
    if args.output:
        output_path = Path(args.output)
    else:
        output_path = PROJECT_ROOT / "simulation_engine" / "models" / "surrogate_model.joblib"

    print("=" * 80)
    print("THERMO-SHIELD — ML Surrogate Model Training Pipeline (Phase 9)")
    print("=" * 80)
    print(f"Dataset:       {dataset_path}")
    print(f"Model Target:  {output_path}")
    print(f"Test Split:    {int(args.test_size * 100)}% held-out test set")
    print(f"Random Seed:   {args.seed}")
    print("-" * 80)

    surrogate = SurrogateModel()
    print("Training XGBoost ensemble across all 12 physical simulation outputs...")
    metrics = surrogate.train(dataset_path, test_size=args.test_size, random_state=args.seed)

    print("\n" + "=" * 80)
    print(f"HELD-OUT TEST SET VALIDATION METRICS (N_test = {surrogate.n_test_samples}, N_train = {surrogate.n_train_samples})")
    print("=" * 80)
    print(f"{'Target Output Variable':<28} | {'Units':<12} | {'MAE':<10} | {'RMSE':<10} | {'R² Score':<10}")
    print("-" * 80)

    units_map = {
        "u_value": "W/m2.K",
        "mean_indoor_temp": "deg C",
        "min_indoor_temp": "deg C",
        "max_indoor_temp": "deg C",
        "solar_gain_wm2": "W/m2",
        "heat_loss_wm2": "W/m2",
        "heating_demand_kwh_day": "kWh/day",
        "comfort_percent": "%",
        "comfort_hours_5c": "hours",
        "total_weight_kg": "kg",
        "total_cost_inr": "INR (Rs)",
        "carbon_footprint_kgco2": "kg CO2e",
    }

    for tgt, m in metrics.items():
        u = units_map.get(tgt, "")
        print(f"{tgt:<28} | {u:<12} | {m['mae']:<10.4f} | {m['rmse']:<10.4f} | {m['r2']:<10.4f}")

    print("=" * 80)

    # Save model to simulation_engine/models/
    surrogate.save(output_path)
    print(f"Model successfully serialized to: {output_path}")

    # Also save copy to simulation-engine/models/
    alt_out = PROJECT_ROOT / "simulation-engine" / "models" / "surrogate_model.joblib"
    try:
        surrogate.save(alt_out)
        print(f"Model mirror saved to:            {alt_out}")
    except Exception as e:
        print(f"Warning saving mirror: {e}")

    print("\n[SUCCESS] Surrogate model ready for sub-millisecond inference.")


if __name__ == "__main__":
    main()
