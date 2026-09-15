import sys
sys.path.insert(0, ".")
import ansys.fluent.core as pyfluent
from simulation_engine.validation.fluent.fluent_runner import get_installed_ansys_version

ver, path = get_installed_ansys_version()
meshing = pyfluent.launch_fluent(product_version=ver, mode="meshing", ui_mode="no_gui")
try:
    meshing.workflow.InitializeWorkflow(WorkflowType="Watertight Geometry")
    for t in meshing.workflow.TaskObject:
        try:
            print("Task:", t.name())
        except Exception:
            print("Task:", dir(t))
    import_task = meshing.workflow.TaskObject["Import Geometry"]
    print("Import Geometry arguments:", import_task.arguments())
finally:
    meshing.exit()
