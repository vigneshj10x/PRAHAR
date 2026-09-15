import sys
sys.path.insert(0, ".")
from pathlib import Path
from simulation_engine.validation.fluent.fluent_runner import launch_fluent_session

cgns_path = Path("scratch/test_cube.cgns").resolve()
print("Testing import of:", cgns_path)

session = launch_fluent_session()
try:
    print("Available in session.tui.file.import_.cgns:")
    print(dir(session.tui.file.import_.cgns))
    # Test importing mesh
    session.tui.file.import_.cgns.mesh(str(cgns_path))
    print("CGNS import succeeded!")
    session.tui.mesh.check()
    print("Mesh check succeeded!")
    session.tui.report.volume_integrals.volume("interior", "()")
finally:
    session.exit()
