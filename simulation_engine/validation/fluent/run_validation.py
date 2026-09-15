"""
simulation-engine/validation/fluent/run_validation.py

Master Execution Script: Offline ANSYS Fluent 3D CFD Validation Suite.

Iterates through the 8 benchmark cases one by one:
  1. Computes the Reduced-Order RC Model solution via engine.simulate()
  2. Executes the full 3D CFD solution via ANSYS Fluent (PyFluent)
  3. Evaluates engineering agreement against the 15% delta threshold
  4. Generates markdown and JSON benchmark reports and updates the frontend data

NOTE ON LICENSING & PARALLELISM:
Run cases one at a time, not in parallel — ANSYS Student license only allows
one active Fluent session at a time.
"""

import sys
import os
import time
import logging
from pathlib import Path
from typing import List

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("run_validation")

# Ensure UTF-8 output on Windows consoles
if sys.platform == "win32":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

# Ensure repository paths are importable
current_dir = Path(__file__).parent.resolve()
repo_root = current_dir.parent.parent.parent
sys.path.insert(0, str(repo_root))
sys.path.insert(0, str(repo_root / "simulation_engine"))
sys.path.insert(0, str(repo_root / "simulation-engine"))

# Import RC Engine
try:
    from simulation_engine.engine import simulate
except ImportError:
    try:
        from engine import simulate
    except ImportError:
        logger.error("Could not import simulate from simulation_engine.engine")
        simulate = None

# Import Fluent Validation Suite components
try:
    from .fluent_runner import run_fluent_simulation, FluentResult
    from .fluent_comparator import compare, generate_report, ComparisonResult
    from .validation_cases import VALIDATION_CASES
except ImportError:
    from fluent_runner import run_fluent_simulation, FluentResult
    from fluent_comparator import compare, generate_report, ComparisonResult
    from validation_cases import VALIDATION_CASES


def main():
    print("\n" + "=" * 78)
    print("  THERMO-SHIELD: ANSYS FLUENT 3D CFD OFFLINE VALIDATION SUITE")
    print("  Comparing Reduced-Order RC Model vs 3D Navier-Stokes CFD Solutions")
    print("=" * 78 + "\n")

    print("PREREQUISITE CHECK:")
    print("  Requires ANSYS Student (2026 R1 / 2024 R2) locally installed.")
    print("  Mesh constraint: < 512,000 cells (Student License limit).")
    print("  Execution mode: Sequential (1 active session at a time).\n")

    if simulate is None:
        print("[ERROR] Could not load RC simulation engine. Please check Python path.")
        sys.exit(1)

    # Check PyFluent version and confirm session launch before Case 1
    try:
        import ansys.fluent.core as pyfluent
        print(f"PyFluent Version: {pyfluent.__version__}")
    except ImportError as imp_err:
        print(f"\n[CRITICAL ERROR] ansys-fluent-core is not installed: {imp_err}")
        print("Run: pip install ansys-fluent-core")
        sys.exit(1)

    print("Verifying ANSYS Fluent session launch before Case 1...")
    try:
        from .fluent_runner import launch_fluent_session, get_installed_ansys_version
    except ImportError:
        from fluent_runner import launch_fluent_session, get_installed_ansys_version

    detected_ver, install_path = get_installed_ansys_version()
    print(f"Detected ANSYS Version: {detected_ver} at {install_path}")

    try:
        test_session = launch_fluent_session()
        print("SUCCESS: Fluent session launched successfully!")
        test_session.exit()
    except Exception as launch_err:
        print("\n" + "!" * 78)
        print("CRITICAL PREREQUISITE FAILURE: Fluent session launch failed!")
        print(f"Exact Error Message:\n{launch_err}")
        print("!" * 78)
        print("\nStopping immediately as instructed. Will not proceed to Case 1 or other 7 cases.")
        sys.exit(1)

    if "--preflight-only" in sys.argv:
        print("\n" + "=" * 78)
        print("  PRE-FLIGHT CHECK COMPLETED SUCCESSFULLY: Fluent session is operational.")
        print("  Stopping as requested (--preflight-only).")
        print("=" * 78 + "\n")
        return

    all_comparisons: List[ComparisonResult] = []
    total_cases = len(VALIDATION_CASES)
    start_total_time = time.time()

    print(f"\nStarting validation suite of {total_cases} cases...\n")

    for idx, case in enumerate(VALIDATION_CASES, start=1):
        print(f"[{idx}/{total_cases}] Running {case.label}...")
        if case.notes:
            print(f"       Note: {case.notes}")

        # Step 1: RC Model Simulation
        sim_params = case.design_params.to_simulation_params()
        t_rc_start = time.time()
        rc_result = simulate(sim_params, case.climate_input)
        rc_time = time.time() - t_rc_start

        # Step 2: ANSYS Fluent CFD Simulation (One session at a time)
        # Student license only allows one active Fluent session at a time.
        try:
            fluent_result = run_fluent_simulation(case.design_params, case.climate_input)
        except Exception as sim_err:
            logger.error("Fluent CFD execution failed on %s: %s", case.case_id, sim_err)
            print(f"       [FAILED] Could not complete Fluent CFD simulation: {sim_err}")
            continue

        # Step 3: Compare Results
        comparison = compare(rc_result, fluent_result, case.label)
        all_comparisons.append(comparison)

        # Step 4: Real-time Detailed Progress Reporting
        status_tag = "PASS" if comparison.overall_passed else "FAIL"
        conv_str = "yes" if fluent_result.converged else "no"

        print(f"       Fluent Converged: {conv_str} ({fluent_result.iterations} iterations in {fluent_result.run_time_seconds:.1f}s)")
        print(f"       RC Result:     Mean Temp: {rc_result.mean_indoor_temp:6.2f} °C | Min: {rc_result.min_indoor_temp:6.2f} °C | Max: {rc_result.max_indoor_temp:6.2f} °C | Heat Loss: {abs(rc_result.heat_loss):5.2f} W/m² | Solar Gain: {rc_result.solar_gain:5.2f} W/m²")
        print(f"       Fluent Result: Mean Temp: {fluent_result.indoor_temp_mean:6.2f} °C | Min: {fluent_result.indoor_temp_min:6.2f} °C | Max: {fluent_result.indoor_temp_max:6.2f} °C | Heat Loss: {fluent_result.heat_loss_wm2:5.2f} W/m² | Solar Gain: {fluent_result.solar_gain_wm2:5.2f} W/m²")
        print("       Metric Deltas:")
        for m_key, m_val in comparison.metrics.items():
            m_status = "PASS" if m_val.passed else "FAIL"
            print(f"         - {m_key:<18}: RC={m_val.rc_value:6.2f}, Fluent={m_val.fluent_value:6.2f} | Delta = {m_val.delta_percent:5.1f}% [{m_status}]")
        print(f"       Case Status: [{status_tag}]\n")

    if not all_comparisons:
        print("[WARNING] No cases completed successfully. Reports cannot be generated.")
        return

    # Final Report Generation
    print("=" * 78)
    print("Generating validation artifacts...")
    report_data = generate_report(all_comparisons, output_dir=current_dir)

    total_time = time.time() - start_total_time
    print(f"\nValidation finished in {total_time:.1f}s.")
    print("=" * 78)
    print("  VALIDATION SUMMARY REPORT (REAL NUMBERS)")
    print("=" * 78)
    print(f"{'Case':<45} | {'RC T(C)':<8} | {'CFD T(C)':<9} | {'Delta T%':<9} | {'RC Loss':<8} | {'CFD Loss':<8} | {'Delta L%':<9} | {'Status'}")
    print("-" * 115)
    for c in all_comparisons:
        m_t = c.metrics["indoor_temp_mean"]
        m_l = c.metrics["heat_loss_wm2"]
        st = "PASS" if c.overall_passed else "FAIL"
        print(f"{c.case_label:<45} | {m_t.rc_value:<8.1f} | {m_t.fluent_value:<9.1f} | {m_t.delta_percent:<9.1f} | {m_l.rc_value:<8.1f} | {m_l.fluent_value:<8.1f} | {m_l.delta_percent:<9.1f} | {st}")
    print("-" * 115)

    print(f"\nKey Metrics:")
    print(f"  - Total Cases Passed:        {report_data['cases_passed']}/{report_data['total_cases']}")
    print(f"  - Overall Agreement:         {report_data['overall_agreement_percent']}%")
    print(f"  - Mean Temperature Delta:    {report_data['mean_temp_delta_percent']}%")
    print(f"  - Mean Heat Loss Delta:       {report_data['mean_loss_delta_percent']}%")
    print(f"  - Overall Assessment:        {report_data['assessment']}")

    # Identify worst-performing case
    worst_case = max(all_comparisons, key=lambda c: c.mean_delta_percent)
    print(f"\nWorst-Performing Case:")
    print(f"  {worst_case.case_label} (Mean Delta: {worst_case.mean_delta_percent}%)")
    if "High Wind" in worst_case.case_label:
        print("  Root Cause: High wind (8 m/s) induces enhanced exterior convective cooling (Jurges correlation).")
        print("  The 1D RC model assumes uniform laminar film resistance, whereas Fluent 3D Navier-Stokes resolves localized windward stagnation and boundary layer stripping.")
        print("  Recommended RC Model Improvement: Incorporate directional wind pressure coefficients (Cp) and non-uniform windward/leeward film heat transfer coefficients.")
    elif "Semi-Dome" in worst_case.case_label:
        print("  Root Cause: Semi-dome approximated as equivalent rectangular volume in CFD.")
        print("  Recommended RC Model Improvement: Refine shape factor (Psi) to account for reduced dome perimeter-to-volume ratio.")
    else:
        print(f"  Root Cause: Deviations in metric deltas between 1D lumped RC formulation and 3D fluid field.")

    # Check for any failures
    failed_cases = [c for c in all_comparisons if not c.overall_passed]
    if failed_cases:
        print(f"\nFailed Cases Analysis (Delta > 15%):")
        for fc in failed_cases:
            print(f"  Case: {fc.case_label}")
            for m_name, m_val in fc.metrics.items():
                if not m_val.passed:
                    print(f"    - Failed Metric: {m_name} (RC: {m_val.rc_value}, Fluent: {m_val.fluent_value}, Delta: {m_val.delta_percent}%)")
                    if "temp" in m_name:
                        print("      Likely Cause: Dynamic 24h thermal mass inertia in RC model vs steady-state mean in Fluent.")
                        print("      Recommended RC Model Improvement: Refine effective lumped air-capacitance coupling with boundary layers.")
                    elif "heat_loss" in m_name:
                        print("      Likely Cause: Differences in convective stack effect and boundary film representation.")
                        print("      Recommended RC Model Improvement: Implement localized convective heat transfer correlation.")

    print(f"\nReports saved to: {current_dir}")
    print("=" * 78 + "\n")


if __name__ == "__main__":
    main()
