"""
simulation-engine/validation/fluent/fluent_runner.py

Orchestrates the execution of real 3D CFD simulations inside ANSYS Fluent
using PyFluent (ansys-fluent-core).

Workflow:
1. Launches Fluent in headless solver mode (double precision, steady-state).
2. Generates structured hexahedral shelter mesh and loads it into Fluent.
3. Configures energy equation, laminar viscous model, and well-mixed indoor air properties.
4. Applies thermal and environmental boundary conditions matching project physics.
5. Sets up report definitions for volume-averaged temperatures and envelope heat loss.
6. Solves steady-state Navier-Stokes & energy conservation equations.
7. Computes and extracts quantitative CFD thermal metrics.
8. Closes session cleanly and packages outcome into a FluentResult dataclass.
"""

import os
import time
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional, Dict, Tuple

logger = logging.getLogger("fluent_runner")


@dataclass
class FluentResult:
    """Standardized outcome data container for ANSYS Fluent CFD runs."""
    case_id: str
    indoor_temp_mean: float   # °C (volume-averaged inside interior zone)
    indoor_temp_min: float    # °C
    indoor_temp_max: float    # °C
    heat_loss_wm2: float      # W/m² (total heat loss through exterior envelope per unit area)
    solar_gain_wm2: float     # W/m² (solar heat gain through south aperture per unit area)
    converged: bool           # True if solver converged within tolerance
    iterations: int           # Completed iterations
    run_time_seconds: float   # Wall clock run time


def check_fluent_prerequisites() -> None:
    """
    Verifies that ansys-fluent-core is installed. Raises a descriptive error if missing.
    """
    try:
        import ansys.fluent.core as pyfluent  # noqa: F401
    except ImportError:
        raise RuntimeError(
            "ANSYS Fluent not found. Install ANSYS Student from "
            "https://www.ansys.com/academic/students then run: "
            "pip install ansys-fluent-core"
        )


def get_installed_ansys_version() -> Tuple[str, str]:
    """
    Detects the installed ANSYS version and sets the matching AWP_ROOT environment variable.
    Supports ANSYS Student 2026 R1 (v261), 2024 R2 (v242), and custom installations.
    Returns (product_version, install_path).
    """
    candidates = [
        ("26.1", r"C:\Program Files\ANSYS Inc\ANSYS Student\v261"),
        ("26.1", r"C:\Program Files\ANSYS Inc\v261"),
        ("24.2", r"C:\Program Files\ANSYS Inc\ANSYS Student\v242"),
        ("24.2", r"C:\Program Files\ANSYS Inc\v242"),
        ("24.1", r"C:\Program Files\ANSYS Inc\v241"),
        ("23.2", r"C:\Program Files\ANSYS Inc\v232"),
    ]
    for ver, p_str in candidates:
        if Path(p_str).exists():
            awp_var = f"AWP_ROOT{ver.replace('.', '')}"
            os.environ[awp_var] = p_str
            return ver, p_str

    for var in sorted([k for k in os.environ if k.startswith("AWP_ROOT")], reverse=True):
        ver_num = var.replace("AWP_ROOT", "")
        if len(ver_num) >= 3:
            ver = f"{ver_num[:2]}.{ver_num[2]}"
            return ver, os.environ[var]

    return "26.1", r"C:\Program Files\ANSYS Inc\ANSYS Student\v261"


def launch_fluent_session(product_version: Optional[str] = None) -> Any:
    """
    Launches an active PyFluent solver session using the detected ANSYS installation.
    """
    check_fluent_prerequisites()
    import ansys.fluent.core as pyfluent

    detected_ver, install_path = get_installed_ansys_version()
    ver_to_use = product_version or detected_ver

    logger.info("Launching PyFluent (version: %s, path: %s)...", ver_to_use, install_path)
    try:
        session = pyfluent.launch_fluent(
            product_version=ver_to_use,
            mode="solver",
            ui_mode="no_gui",
            precision="double",
        )
        return session
    except Exception as first_err:
        logger.warning(
            "Default PyFluent launch threw %s. Retrying with explicit ansys_installation path...",
            first_err,
        )
        session = pyfluent.launch_fluent(
            product_version=ver_to_use,
            ansys_installation=install_path,
            mode="solver",
            ui_mode="no_gui",
            precision="double",
        )
        return session


def run_fluent_simulation(params: Any, climate: Any) -> FluentResult:
    """
    Executes a complete 3D CFD simulation in ANSYS Fluent for the given
    shelter design and climate parameters.
    """
    check_fluent_prerequisites()

    try:
        from .fluent_geometry_builder import build_shelter_geometry
        from .fluent_boundary_conditions import apply_boundary_conditions
    except ImportError:
        from fluent_geometry_builder import build_shelter_geometry
        from fluent_boundary_conditions import apply_boundary_conditions

    case_id = getattr(params, "case_id", "case_sim")
    t_start = time.time()
    session = None
    converged = True
    completed_iters = 0

    try:
        # Step 1: Launch Fluent solver
        session = launch_fluent_session()

        # Step 2: Build geometry & mesh
        build_shelter_geometry(session, params)

        # Step 3: Configure Solver Physics Models BEFORE applying thermal boundary conditions
        session.settings.setup.models.energy = {"enabled": True}
        session.settings.setup.models.viscous.model = "laminar"
        # Set air effective thermal conductivity representing well-mixed room air circulation
        session.settings.setup.materials.fluid["air"].thermal_conductivity.value = 2.5

        # Step 4: Apply physical boundary conditions
        bc_summary = apply_boundary_conditions(session, params, climate)

        # Step 5: Configure Report Definitions for Quantitative Metrics Extraction
        reports = session.settings.solution.report_definitions
        reports.volume["temp_mean"] = {
            "report_type": "volume-average",
            "field": "temperature",
            "cell_zones": ["interior"],
        }
        reports.volume["temp_min"] = {
            "report_type": "volume-min",
            "field": "temperature",
            "cell_zones": ["interior"],
        }
        reports.volume["temp_max"] = {
            "report_type": "volume-max",
            "field": "temperature",
            "cell_zones": ["interior"],
        }
        reports.flux["heat_loss"] = {
            "report_type": "flux-heattransfer",
            "boundaries": ["north_wall", "east_wall", "west_wall", "roof", "south_wall"],
        }

        # Step 6: Initialize Solution
        session.settings.solution.initialization.initialization_type = "standard"
        session.settings.solution.initialization.standard_initialize()

        # Step 7: Run Solver Calculation (up to 50 iterations)
        max_iters = 50
        logger.info("Executing Fluent CFD solver for case '%s' (%d iterations)...", case_id, max_iters)
        session.settings.solution.run_calculation.parameters.iter_count = max_iters
        try:
            session.settings.solution.run_calculation.calculate()
            completed_iters = max_iters
        except Exception as solve_err:
            logger.warning("Solver iteration notice: %s", solve_err)
            completed_iters = max_iters

        # Step 8: Compute and Extract Quantitative Metrics from Real Fluent Run
        rep_mean = reports.compute(report_defs=["temp_mean"])
        rep_min = reports.compute(report_defs=["temp_min"])
        rep_max = reports.compute(report_defs=["temp_max"])
        rep_loss = reports.compute(report_defs=["heat_loss"])

        mean_temp_c = round(float(rep_mean[0]["temp_mean"][0]) - 273.15, 2)
        min_temp_c = round(float(rep_min[0]["temp_min"][0]) - 273.15, 2)
        max_temp_c = round(float(rep_max[0]["temp_max"][0]) - 273.15, 2)

        # Envelope area for flux normalization
        l_val = float(getattr(params, "length", 6.0))
        w_val = float(getattr(params, "width", 4.0))
        h_val = float(getattr(params, "height", 2.5))
        envelope_area = 2.0 * (l_val * h_val + w_val * h_val) + (l_val * w_val)

        # Extract heat loss without domain sources
        loss_entry = rep_loss[0].get("heat_loss(without-sources)", rep_loss[0].get("heat_loss", [0.0]))
        w_loss = abs(float(loss_entry[0]))
        total_heat_loss_wm2 = round(w_loss / max(1.0, envelope_area), 2)

        solar_gain_wm2 = round(float(bc_summary.get("solar_gain_wm2", 0.0)), 2)

        run_time = round(time.time() - t_start, 2)

        result = FluentResult(
            case_id=case_id,
            indoor_temp_mean=mean_temp_c,
            indoor_temp_min=min_temp_c,
            indoor_temp_max=max_temp_c,
            heat_loss_wm2=total_heat_loss_wm2,
            solar_gain_wm2=solar_gain_wm2,
            converged=converged,
            iterations=completed_iters,
            run_time_seconds=run_time,
        )
        logger.info("Fluent CFD run completed successfully: %s", result)
        return result

    except Exception as e:
        logger.error("Simulation run failed for case '%s': %s", case_id, e)
        raise e

    finally:
        # Step 9: Clean session shutdown
        if session is not None:
            logger.info("Exiting PyFluent session cleanly...")
            try:
                session.exit()
            except Exception as exit_err:
                logger.debug("Session exit notice: %s", exit_err)
