"""
simulation_engine/generate_dataset.py
"""
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from simulation_engine.engine import (
    simulate,
    SimulationParams,
    ClimateInput,
    SimulationResult,
)
from simulation_engine.geometry import calculate_geometry

# Import everything from simulation-engine/generate_dataset.py
sys.path.insert(0, str(PROJECT_ROOT / "simulation-engine"))
from generate_dataset import *

if __name__ == "__main__":
    out_dir = Path(__file__).parent / "data"
    run_batch_pipeline(output_dir=out_dir, target_count=2500, resume=False)

