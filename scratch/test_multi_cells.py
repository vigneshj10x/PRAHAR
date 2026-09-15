import sys
sys.path.insert(0, ".")
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO)

def generate_cube_mesh(nx=2, ny=2, nz=2, dx=1.0, dy=1.0, dz=1.0, filename="scratch/test_2x2x2.msh"):
    out_file = Path(filename).resolve()
    out_file.parent.mkdir(parents=True, exist_ok=True)

    total_nodes = (nx + 1) * (ny + 1) * (nz + 1)
    total_cells = nx * ny * nz

    def node_id(i, j, k):
        return 1 + i + j * (nx + 1) + k * (nx + 1) * (ny + 1)

    def cell_id(i, j, k):
        return 1 + i + j * nx + k * nx * ny

    # Zone 2: south_wall (j = 0, normal points in -y direction)
    # Right-handed from c0 to c1 (0): 1 -> 2 -> 6 -> 5
    # (i, 0, k) -> (i+1, 0, k) -> (i+1, 0, k+1) -> (i, 0, k+1)
    faces_south = []
    for k in range(nz):
        for i in range(nx):
            n1 = node_id(i, 0, k)
            n2 = node_id(i + 1, 0, k)
            n3 = node_id(i + 1, 0, k + 1)
            n4 = node_id(i, 0, k + 1)
            c0 = cell_id(i, 0, k)
            c1 = 0
            faces_south.append((n1, n2, n3, n4, c0, c1))

    # Zone 3: north_wall (j = ny, normal points in +y direction)
    # Right-handed from c0 to c1 (0): 3 -> 4 -> 8 -> 7
    # (i, ny, k) -> (i+1, ny, k) -> (i+1, ny, k+1) -> (i, ny, k+1)
    faces_north = []
    for k in range(nz):
        for i in range(nx):
            n1 = node_id(i, ny, k)
            n2 = node_id(i + 1, ny, k)
            n3 = node_id(i + 1, ny, k + 1)
            n4 = node_id(i, ny, k + 1)
            c0 = cell_id(i, ny - 1, k)
            c1 = 0
            faces_north.append((n1, n2, n3, n4, c0, c1))

    # Zone 4: east_wall (i = nx, normal points in +x direction)
    # Right-handed from c0 to c1 (0): 2 -> 6 -> 8 -> 4
    # (nx, j, k) -> (nx, j, k+1) -> (nx, j+1, k+1) -> (nx, j+1, k)
    faces_east = []
    for k in range(nz):
        for j in range(ny):
            n1 = node_id(nx, j, k)
            n2 = node_id(nx, j, k + 1)
            n3 = node_id(nx, j + 1, k + 1)
            n4 = node_id(nx, j + 1, k)
            c0 = cell_id(nx - 1, j, k)
            c1 = 0
            faces_east.append((n1, n2, n3, n4, c0, c1))

    # Zone 5: west_wall (i = 0, normal points in -x direction)
    # Right-handed from c0 to c1 (0): 3 -> 1 -> 5 -> 7
    # (0, j+1, k) -> (0, j, k) -> (0, j, k+1) -> (0, j+1, k+1)
    faces_west = []
    for k in range(nz):
        for j in range(ny):
            n1 = node_id(0, j + 1, k)
            n2 = node_id(0, j, k)
            n3 = node_id(0, j, k + 1)
            n4 = node_id(0, j + 1, k + 1)
            c0 = cell_id(0, j, k)
            c1 = 0
            faces_west.append((n1, n2, n3, n4, c0, c1))

    # Zone 6: roof (k = nz, normal points in +z direction)
    # Right-handed from c0 to c1 (0): 5 -> 7 -> 8 -> 6
    # (i, j, nz) -> (i, j+1, nz) -> (i+1, j+1, nz) -> (i+1, j, nz)
    faces_roof = []
    for j in range(ny):
        for i in range(nx):
            n1 = node_id(i, j, nz)
            n2 = node_id(i, j + 1, nz)
            n3 = node_id(i + 1, j + 1, nz)
            n4 = node_id(i + 1, j, nz)
            c0 = cell_id(i, j, nz - 1)
            c1 = 0
            faces_roof.append((n1, n2, n3, n4, c0, c1))

    # Zone 7: floor (k = 0, normal points in -z direction)
    # Right-handed from c0 to c1 (0): 1 -> 3 -> 4 -> 2
    # (i, j, 0) -> (i, j+1, 0) -> (i+1, j+1, 0) -> (i+1, j, 0)
    faces_floor = []
    for j in range(ny):
        for i in range(nx):
            n1 = node_id(i, j, 0)
            n2 = node_id(i, j + 1, 0)
            n3 = node_id(i + 1, j + 1, 0)
            n4 = node_id(i + 1, j, 0)
            c0 = cell_id(i, j, 0)
            c1 = 0
            faces_floor.append((n1, n2, n3, n4, c0, c1))

    # Zone 8: internal faces
    faces_internal = []
    # Internal X-planes (normal = +X from c0=(i-1) to c1=(i))
    for i in range(1, nx):
        for k in range(nz):
            for j in range(ny):
                n1 = node_id(i, j, k)
                n2 = node_id(i, j + 1, k)
                n3 = node_id(i, j + 1, k + 1)
                n4 = node_id(i, j, k + 1)
                c0 = cell_id(i - 1, j, k)
                c1 = cell_id(i, j, k)
                faces_internal.append((n1, n2, n3, n4, c1, c0))

    # Internal Y-planes (normal = +Y from c0=(j-1) to c1=(j))
    for j in range(1, ny):
        for k in range(nz):
            for i in range(nx):
                n1 = node_id(i, j, k)
                n2 = node_id(i, j, k + 1)
                n3 = node_id(i + 1, j, k + 1)
                n4 = node_id(i + 1, j, k)
                c0 = cell_id(i, j - 1, k)
                c1 = cell_id(i, j, k)
                faces_internal.append((n1, n2, n3, n4, c1, c0))

    # Internal Z-planes (normal = +Z from c0=(k-1) to c1=(k))
    for k in range(1, nz):
        for j in range(ny):
            for i in range(nx):
                n1 = node_id(i, j, k)
                n2 = node_id(i + 1, j, k)
                n3 = node_id(i + 1, j + 1, k)
                n4 = node_id(i, j + 1, k)
                c0 = cell_id(i, j, k - 1)
                c1 = cell_id(i, j, k)
                faces_internal.append((n1, n2, n3, n4, c1, c0))

    total_faces = (
        len(faces_south) + len(faces_north) + len(faces_east) +
        len(faces_west) + len(faces_roof) + len(faces_floor) + len(faces_internal)
    )

    with open(out_file, "w", encoding="ascii") as f:
        f.write('(0 "ANSYS Fluent Mesh File - Generated by THERMO-SHIELD Validation")\n')
        f.write('(2 3)\n')
        f.write(f'(10 (0 1 {total_nodes:x} 0 3))\n')
        f.write(f'(10 (1 1 {total_nodes:x} 1 3)(\n')
        for k in range(nz + 1):
            z = k * dz
            for j in range(ny + 1):
                y = j * dy
                for i in range(nx + 1):
                    x = i * dx
                    f.write(f"{x:.6f} {y:.6f} {z:.6f}\n")
        f.write('))\n')

        # Cells declaration (Zone 1 = fluid, element_type = 4: hexahedral)
        f.write(f'(12 (0 1 {total_cells:x} 0 0))\n')
        f.write(f'(12 (1 1 {total_cells:x} 1 4))\n')

        # Faces declaration
        f.write(f'(13 (0 1 {total_faces:x} 0 0))\n')

        current_face_idx = 1
        def write_zone(zid, flist, bctype):
            nonlocal current_face_idx
            if not flist:
                return
            start = current_face_idx
            end = current_face_idx + len(flist) - 1
            f.write(f'(13 ({zid:x} {start:x} {end:x} {bctype:x} 4)(\n')
            for n1, n2, n3, n4, c0, c1 in flist:
                f.write(f"{n1:x} {n2:x} {n3:x} {n4:x} {c0:x} {c1:x}\n")
            f.write('))\n')
            current_face_idx = end + 1

        write_zone(2, faces_south, 3)
        write_zone(3, faces_north, 3)
        write_zone(4, faces_east, 3)
        write_zone(5, faces_west, 3)
        write_zone(6, faces_roof, 3)
        write_zone(7, faces_floor, 3)
        write_zone(8, faces_internal, 2)

        f.write('(45 (1 fluid interior)())\n')
        f.write('(45 (2 wall south_wall)())\n')
        f.write('(45 (3 wall north_wall)())\n')
        f.write('(45 (4 wall east_wall)())\n')
        f.write('(45 (5 wall west_wall)())\n')
        f.write('(45 (6 wall roof)())\n')
        f.write('(45 (7 wall floor)())\n')
        f.write('(45 (8 interior interior_faces)())\n')

    return str(out_file)

mesh_p = generate_cube_mesh(2, 2, 2, 1.0, 1.0, 1.0)
print("Generated mesh:", mesh_p)

from simulation_engine.validation.fluent.fluent_runner import launch_fluent_session
session = launch_fluent_session()
try:
    session.file.read_mesh(file_name=mesh_p)
    print("Read mesh succeeded!")
    session.tui.mesh.check_verbosity(2)
    session.tui.mesh.check()
    print("Mesh check succeeded!")
finally:
    session.exit()
