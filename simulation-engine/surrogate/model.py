# -*- coding: utf-8 -*-
"""
simulation_engine/surrogate/model.py

Gradient-Boosted Tree ML Surrogate Model for THERMO-SHIELD.
Trained on the reduced-order transient physics dataset to provide sub-millisecond
performance predictions across the 10-dimensional architectural envelope space.

Predicts:
  - Envelope overall U-value (W/m²·K)
  - Diurnal indoor temperature statistics (mean, min, max, °C)
  - Envelope fabric heat loss flux (W/m²)
  - South glazing solar thermal gain (W/m²)
  - Auxiliary heating energy demand (kWh/day)
  - Thermal comfort band satisfaction (comfortPercent, %)
  - Survivability hours above 5°C (comfortHours5c)
  - Total envelope structural weight (kg)
  - Estimated fabrication cost (INR ₹)
  - Embodied carbon footprint (kg CO2e)
"""

from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Union
import json
import time
import numpy as np
import pandas as pd
from pandas.api.types import CategoricalDtype
import joblib
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from simulation_engine.geometry import calculate_geometry, ALL_SHAPES
from simulation_engine.engine import SimulationParams, ClimateInput


# ─── Canonical Feature and Category Definitions ──────────────────────────────
CATEGORIES = {
    "shape": ALL_SHAPES,
    "wall_material": [
        "adobe",
        "stone",
        "concrete",
        "aac_block",
        "composite",
        "insulated_panel",
        "pcm_enhanced_panel",
    ],
    "roof_material": [
        "timber_insulated_roof",
        "insulated_panel",
        "composite",
    ],
    "thermal_mass": ["low", "medium", "high"],
}

CAT_DTYPES = {col: CategoricalDtype(categories=cats) for col, cats in CATEGORIES.items()}

FEATURE_COLS = [
    "lat",
    "lon",
    "altitude_m",
    "ambient_min_temp",
    "ambient_max_temp",
    "ambient_mean_temp",
    "solar_peak_wm2",
    "wind_speed_ms",
    "shape",
    "orientation_deg",
    "wall_material",
    "roof_material",
    "insulation_mm",
    "opening_ratio_pct",
    "thermal_mass",
    "is_pcm",
    "length_m",
    "width_m",
    "height_m",
    "floor_area_m2",
    "envelope_area_m2",
    "volume_m3",
    "av_ratio",
]

TARGET_COLS = [
    "u_value",
    "mean_indoor_temp",
    "min_indoor_temp",
    "max_indoor_temp",
    "solar_gain_wm2",
    "heat_loss_wm2",
    "heating_demand_kwh_day",
    "comfort_percent",
    "comfort_hours_5c",
    "total_weight_kg",
    "total_cost_inr",
    "carbon_footprint_kgco2",
]


class SurrogateModel:
    """
    Multi-output gradient boosted surrogate ensemble using XGBoost.
    Trains and persists individual regression estimators per target for optimal tuning.
    """

    def __init__(self):
        self.models: Dict[str, xgb.XGBRegressor] = {}
        self.metrics: Dict[str, Dict[str, float]] = {}
        self.is_trained: bool = False
        self.trained_at: Optional[str] = None
        self.n_train_samples: int = 0
        self.n_test_samples: int = 0

    @staticmethod
    def prepare_dataframe(df: pd.DataFrame) -> pd.DataFrame:
        """Applies canonical categorical types and ensures feature alignment."""
        clean_df = df[FEATURE_COLS].copy()
        wall_map = {
            "puf_sandwich_panel": "insulated_panel",
            "eps_sandwich_panel": "insulated_panel",
            "fems_composite_panel": "composite",
            "galvanized_steel_sheet": "composite",
            "tactical_fabric_pvc": "composite",
        }
        roof_map = {
            "puf_sandwich_panel": "insulated_panel",
            "eps_sandwich_panel": "insulated_panel",
            "fems_composite_panel": "composite",
            "galvanized_steel_sheet": "composite",
            "tactical_fabric_pvc": "composite",
        }
        clean_df["wall_material"] = clean_df["wall_material"].replace(wall_map)
        clean_df["roof_material"] = clean_df["roof_material"].replace(roof_map)

        for col, cat_type in CAT_DTYPES.items():
            clean_df[col] = clean_df[col].astype(cat_type)
        return clean_df

    @staticmethod
    def extract_features_single(params: SimulationParams, climate: ClimateInput) -> pd.DataFrame:
        """Constructs a single-row feature DataFrame from simulation inputs."""
        temps = climate.hourly_outdoor_temp or [0.0] * 24
        solar = climate.hourly_solar_radiation or [0.0] * 24

        geom = calculate_geometry(
            shape=params.shape,
            length=params.length,
            width=params.width,
            height=params.height,
        )

        is_pcm = 1 if params.wall_material == "pcm_enhanced_panel" else 0

        row = {
            "lat": climate.lat,
            "lon": climate.lon,
            "altitude_m": climate.altitude,
            "ambient_min_temp": float(min(temps)),
            "ambient_max_temp": float(max(temps)),
            "ambient_mean_temp": float(sum(temps) / len(temps)),
            "solar_peak_wm2": float(max(solar)),
            "wind_speed_ms": climate.wind_speed,
            "shape": params.shape,
            "orientation_deg": float(params.orientation),
            "wall_material": params.wall_material,
            "roof_material": params.roof_material,
            "insulation_mm": float(params.insulation),
            "opening_ratio_pct": float(params.opening),
            "thermal_mass": params.thermal_mass,
            "is_pcm": is_pcm,
            "length_m": float(params.length),
            "width_m": float(params.width),
            "height_m": float(params.height),
            "floor_area_m2": float(geom.floor_area),
            "envelope_area_m2": float(geom.envelope_area),
            "volume_m3": float(geom.volume),
            "av_ratio": float(geom.av_ratio),
        }
        df_row = pd.DataFrame([row])
        for col, cat_type in CAT_DTYPES.items():
            df_row[col] = df_row[col].astype(cat_type)
        return df_row

    def train(
        self,
        dataset_path: Union[str, Path],
        test_size: float = 0.2,
        random_state: int = 42,
    ) -> Dict[str, Dict[str, float]]:
        """
        Trains XGBoost surrogate models across all targets on the Phase 7 dataset.
        Evaluates and stores held-out validation metrics (MAE, RMSE, R²).
        """
        p = Path(dataset_path)
        if p.suffix == ".parquet":
            df = pd.read_parquet(p)
        else:
            df = pd.read_csv(p)

        X = self.prepare_dataframe(df)
        y = df[TARGET_COLS]

        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=random_state
        )

        self.n_train_samples = len(X_train)
        self.n_test_samples = len(X_test)
        self.metrics = {}
        self.models = {}

        for tgt in TARGET_COLS:
            # Tuned hyper-parameters for fast convergence and tabular precision
            n_est = 250 if tgt in ["u_value", "total_weight_kg", "total_cost_inr"] else 200
            max_depth = 5
            lr = 0.05

            model = xgb.XGBRegressor(
                n_estimators=n_est,
                max_depth=max_depth,
                learning_rate=lr,
                subsample=0.90,
                colsample_bytree=0.90,
                enable_categorical=True,
                random_state=random_state,
                n_jobs=2,
            )
            model.fit(X_train, y_train[tgt])
            preds = model.predict(X_test)

            mae = float(mean_absolute_error(y_test[tgt], preds))
            rmse = float(np.sqrt(mean_squared_error(y_test[tgt], preds)))
            r2 = float(r2_score(y_test[tgt], preds))

            self.models[tgt] = model
            self.metrics[tgt] = {
                "mae": round(mae, 4),
                "rmse": round(rmse, 4),
                "r2": round(r2, 4),
            }

        self.is_trained = True
        self.trained_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        return self.metrics

    def predict_batch(self, df_features: pd.DataFrame) -> Dict[str, np.ndarray]:
        """Predicts all simulation outputs for a batch of candidate feature vectors."""
        if not self.is_trained:
            raise RuntimeError("SurrogateModel must be trained or loaded before prediction.")

        clean_X = self.prepare_dataframe(df_features)
        predictions = {}
        for tgt, model in self.models.items():
            preds = model.predict(clean_X)
            # Clip physical non-negatives
            if tgt in ["u_value", "solar_gain_wm2", "heating_demand_kwh_day", "comfort_percent", "comfort_hours_5c", "total_weight_kg", "total_cost_inr", "carbon_footprint_kgco2"]:
                preds = np.maximum(0.0, preds)
            if tgt == "comfort_percent":
                preds = np.minimum(100.0, preds)
            if tgt == "comfort_hours_5c":
                preds = np.minimum(24.0, preds)
            predictions[tgt] = preds
        return predictions

    def predict_single(self, params: SimulationParams, climate: ClimateInput) -> Dict[str, float]:
        """Predicts simulation outputs for a single design configuration."""
        df_feat = self.extract_features_single(params, climate)
        batch_out = self.predict_batch(df_feat)
        return {k: round(float(v[0]), 3) for k, v in batch_out.items()}

    def save(self, output_path: Union[str, Path]) -> None:
        """Saves models, metrics, and metadata to disk."""
        out_p = Path(output_path)
        out_p.parent.mkdir(parents=True, exist_ok=True)

        bundle = {
            "models": self.models,
            "metrics": self.metrics,
            "trained_at": self.trained_at,
            "n_train_samples": self.n_train_samples,
            "n_test_samples": self.n_test_samples,
            "feature_cols": FEATURE_COLS,
            "target_cols": TARGET_COLS,
            "categories": CATEGORIES,
        }
        joblib.dump(bundle, out_p)

        # Also write a human-readable metrics JSON alongside
        metrics_p = out_p.with_suffix(".json")
        with open(metrics_p, "w", encoding="utf-8") as f:
            json.dump({
                "trained_at": self.trained_at,
                "n_train_samples": self.n_train_samples,
                "n_test_samples": self.n_test_samples,
                "metrics": self.metrics,
            }, f, indent=2)

    def load(self, model_path: Union[str, Path]) -> "SurrogateModel":
        """Loads serialized models from disk."""
        p = Path(model_path)
        if not p.exists():
            raise FileNotFoundError(f"Surrogate model bundle not found at {p}")
        bundle = joblib.load(p)
        self.models = bundle["models"]
        self.metrics = bundle.get("metrics", {})
        self.trained_at = bundle.get("trained_at")
        self.n_train_samples = bundle.get("n_train_samples", 0)
        self.n_test_samples = bundle.get("n_test_samples", 0)
        self.is_trained = True
        return self


# Global singleton cache for low-latency API access
_SURROGATE_INSTANCE: Optional[SurrogateModel] = None


def get_surrogate(model_path: Optional[Path] = None) -> SurrogateModel:
    """Retrieves or lazily loads the shared trained surrogate model instance."""
    global _SURROGATE_INSTANCE
    if _SURROGATE_INSTANCE is not None and _SURROGATE_INSTANCE.is_trained:
        return _SURROGATE_INSTANCE

    surrogate = SurrogateModel()
    candidates = []
    if model_path:
        candidates.append(Path(model_path))

    root = Path(__file__).resolve().parent.parent.parent
    candidates.extend([
        root / "simulation_engine" / "models" / "surrogate_model.joblib",
        root / "simulation-engine" / "models" / "surrogate_model.joblib",
        Path(__file__).parent / "surrogate_model.joblib",
    ])

    for cp in candidates:
        if cp.exists():
            surrogate.load(cp)
            _SURROGATE_INSTANCE = surrogate
            return _SURROGATE_INSTANCE

    # If no serialized model found, train on available dataset automatically
    dataset_candidates = [
        root / "simulation_engine" / "data" / "training_dataset.csv",
        root / "simulation-engine" / "data" / "training_dataset.csv",
        root / "simulation-engine" / "data" / "training_dataset.parquet",
    ]
    for dp in dataset_candidates:
        if dp.exists():
            surrogate.train(dp)
            save_path = root / "simulation_engine" / "models" / "surrogate_model.joblib"
            surrogate.save(save_path)
            _SURROGATE_INSTANCE = surrogate
            return _SURROGATE_INSTANCE

    raise RuntimeError("Could not find or train surrogate model: dataset missing.")
