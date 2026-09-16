"""
Update validation reports (JSON, Markdown, Frontend) with calibrated RC model results.
"""
import sys
import os
import json
from pathlib import Path

# Fix stdout encoding on Windows
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

repo_root = Path(__file__).parent.parent.resolve()
sys.path.insert(0, str(repo_root))
sys.path.insert(0, str(repo_root / "simulation_engine"))
sys.path.insert(0, str(repo_root / "simulation-engine"))
sys.path.insert(0, str(repo_root / "simulation-engine" / "validation" / "fluent"))

from validation_cases import VALIDATION_CASES
from engine import simulate
from fluent_runner import FluentResult
from fluent_comparator import compare, generate_report

# Load current Fluent ground truth from existing validation_report.json
report_path = repo_root / "simulation-engine" / "validation" / "fluent" / "validation_report.json"
with open(report_path, "r", encoding="utf-8") as f:
    old_report = json.load(f)

fluent_data_by_case = {}
for c in old_report["cases"]:
    cid = c["case_id"]
    m = c["metrics"]
    fluent_data_by_case[cid] = FluentResult(
        case_id=cid,
        indoor_temp_mean=m["indoor_temp_mean"]["fluent_value"],
        indoor_temp_min=m["indoor_temp_min"]["fluent_value"],
        indoor_temp_max=m["indoor_temp_max"]["fluent_value"],
        heat_loss_wm2=m["heat_loss_wm2"]["fluent_value"],
        solar_gain_wm2=m["solar_gain_wm2"]["fluent_value"],
        iterations=200,
        converged=True,
        run_time_seconds=120.0
    )

comparisons = []
print("Running Calibrated RC Simulation on all 8 validation cases:")
for case in VALIDATION_CASES:
    cid = case.case_id
    params = case.design_params.to_simulation_params()
    climate = case.climate_input
    
    rc_res = simulate(params=params, climate=climate)
    fl_res = fluent_data_by_case[cid]
    
    comp = compare(rc_res, fl_res, case.label)
    comparisons.append(comp)
    
    m_temp = comp.metrics["indoor_temp_mean"]
    m_loss = comp.metrics["heat_loss_wm2"]
    print(f"  {cid}: RC T={m_temp.rc_value:+5.2f}C | Fluent={m_temp.fluent_value:+5.2f}C | dT={m_temp.delta_percent:5.2f}% ({'PASS' if m_temp.passed else 'FAIL'}) | "
          f"RC Loss={m_loss.rc_value:4.1f} | Fluent={m_loss.fluent_value:4.1f} | dLoss={m_loss.delta_percent:5.2f}% ({'PASS' if m_loss.passed else 'FAIL'})")

# Generate output reports
output_dir = repo_root / "simulation-engine" / "validation" / "fluent"
rep = generate_report(comparisons, output_dir=output_dir)

# Also update simulation_engine copy
sim_engine_dir = repo_root / "simulation_engine" / "validation" / "fluent"
if sim_engine_dir.exists():
    generate_report(comparisons, output_dir=sim_engine_dir)

# Also update frontend if path exists
frontend_path = repo_root / "frontend" / "src" / "data" / "validation_results.json"
if frontend_path.parent.exists():
    with open(frontend_path, "w", encoding="utf-8") as f:
        json.dump(rep, f, indent=2)
    print(f"Updated {frontend_path}")

print("-" * 80)
print(f"Mean Temperature Delta: {rep['mean_temp_delta_percent']}% (Target: < 15.0%) -> {'PASS' if rep['mean_temp_delta_percent'] < 15.0 else 'FAIL'}")
print(f"Mean Heat Loss Delta:    {rep['mean_loss_delta_percent']}% (Target: < 15.0%) -> {'PASS' if rep['mean_loss_delta_percent'] < 15.0 else 'FAIL'}")
print(f"Overall Agreement:       {rep['overall_agreement_percent']}%")
print(f"Overall Assessment:      {rep['assessment']}")
print("=" * 80)
