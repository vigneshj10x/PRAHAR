import sys
import os
sys.path.insert(0, ".")
from pathlib import Path

nodes = [
    (0, 0, 0), # 1
    (1, 0, 0), # 2
    (0, 1, 0), # 3
    (1, 1, 0), # 4
    (0, 0, 1), # 5
    (1, 0, 1), # 6
    (0, 1, 1), # 7
    (1, 1, 1), # 8
]

# When looking from c0 towards c1 (outward):
# Outward normal should point outside.
# Let's test standard right-hand rule outward normals:
# South (y=0, normal -y): 1->2->6->5. (2-1)=(1,0,0), (6-1)=(1,0,1). (1,0,0)x(0,0,1) = (0,-1,0). Normal = -y!
# North (y=1, normal +y): 4->3->7->8. (3-4)=(-1,0,0), (8-4)=(0,0,1). (-1,0,0)x(0,0,1) = (0,1,0). Normal = +y!
# East (x=1, normal +x): 2->4->8->6. (4-2)=(0,1,0), (6-2)=(0,0,1). (0,1,0)x(0,0,1) = (1,0,0). Normal = +x!
# West (x=0, normal -x): 3->1->5->7. (1-3)=(0,-1,0), (7-3)=(0,0,1). (0,-1,0)x(0,0,1) = (-1,0,0). Normal = -x!
# Roof (z=1, normal +z): 5->6->8->7. (6-5)=(1,0,0), (7-5)=(0,1,0). (1,0,0)x(0,1,0) = (0,0,1). Normal = +z!
# Floor (z=0, normal -z): 1->3->4->2. (3-1)=(0,1,0), (2-1)=(1,0,0). (0,1,0)x(1,0,0) = (0,0,-1). Normal = -z!

faces = [
    (1, 2, 6, 5, 1, 0, 2), # South (right-handed)
    (3, 4, 8, 7, 1, 0, 3), # North (reversed from 4,3,7,8)
    (2, 6, 8, 4, 1, 0, 4), # East (right-handed)
    (3, 1, 5, 7, 1, 0, 5), # West (right-handed)
    (5, 7, 8, 6, 1, 0, 6), # Top/Roof (right-handed)
    (1, 3, 4, 2, 1, 0, 7), # Bottom/Floor (right-handed)
]

msh_path = Path("scratch/test_cube.msh")
msh_path.parent.mkdir(parents=True, exist_ok=True)
with open(msh_path, "w") as f:
    f.write('(0 "ANSYS Fluent Mesh")\n(2 3)\n')
    f.write('(10 (0 1 8 0 3))\n(10 (1 1 8 1 3)(\n')
    for x, y, z in nodes:
        f.write(f'{x} {y} {z}\n')
    f.write('))\n')
    f.write('(12 (0 1 1 0))\n')
    f.write('(12 (1 1 1 1 0)(\n4\n))\n')
    f.write('(13 (0 1 6 0 0))\n')
    for idx, (n1, n2, n3, n4, c0, c1, zid) in enumerate(faces, 1):
        f.write(f'(13 ({zid:x} {idx:x} {idx:x} 3 4)(\n{n1:x} {n2:x} {n3:x} {n4:x} {c0:x} {c1:x}\n))\n')
    f.write('(45 (1 fluid interior)())\n')
    f.write('(45 (2 wall south)())\n(45 (3 wall north)())\n(45 (4 wall east)())\n(45 (5 wall west)())\n(45 (6 wall roof)())\n(45 (7 wall floor)())\n')

print("Generated test_cube.msh")

from simulation_engine.validation.fluent.fluent_runner import launch_fluent_session
session = launch_fluent_session()
try:
    session.file.read_mesh(file_name=str(msh_path.resolve()))
    print("Read mesh succeeded.")
    session.tui.mesh.check()
    print("Mesh check succeeded!")

    # Enable energy equation
    session.tui.define.models.energy("yes", "no", "no", "no", "yes")
    print("Energy equation enabled!")

    # Set laminar viscous
    session.tui.define.models.viscous.laminar("yes")
    print("Laminar viscous enabled!")

    # Standard initialization
    session.tui.solve.initialize.initialize_flow()
    print("Initialization succeeded!")

    # Iterate 5 steps
    session.tui.solve.iterate(5)
    print("Iterate 5 steps succeeded!")

    # Check temperature
    temp = session.tui.report.volume_integrals.volume_avg("interior", "()", "temperature")
    print("Volume avg temp report finished!")
finally:
    session.exit()
