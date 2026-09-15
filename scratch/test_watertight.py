import sys
sys.path.insert(0, ".")
from pathlib import Path
import ansys.fluent.core as pyfluent
from simulation_engine.validation.fluent.fluent_runner import get_installed_ansys_version

ver, path = get_installed_ansys_version()
meshing = pyfluent.launch_fluent(product_version=ver, mode="meshing", ui_mode="no_gui")
try:
    meshing.workflow.InitializeWorkflow(WorkflowType="Watertight Geometry")
    tasks = meshing.workflow.TaskObject
    print("Tasks in Watertight Geometry:")
    for k in tasks:
        print(" -", k)
finally:
    meshing.exit()
