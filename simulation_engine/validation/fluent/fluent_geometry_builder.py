"""
simulation-engine/validation/fluent/fluent_geometry_builder.py

This geometry exists only for Fluent physics calculation. It is completely separate
from the Three.js frontend visualization which handles all user-facing 3D display.

WORKFLOW & SOLVER-MODE ARCHITECTURE:
Fluent solver is launched in headless solver mode.
To guarantee an optimal, zero-skewness, structured hexahedral mesh with named boundary
zones without requiring CAD licenses or meshing handoffs, this module programmatically builds
a native 3D Nastran Bulk Data (.bdf) mesh matching the exact shelter dimensions (length, width, height)
and target cell size (~0.4m).

The mesh defines:
  - interior    (fluid cell zone for indoor air volume)
  - south_wall  (solar-exposed, glazing)
  - north_wall
  - east_wall
  - west_wall
  - roof
  - floor       (adiabatic — no heat loss through floor)

Loaded natively via Fluent's Nastran bulkdata importer.
"""

import os
import math
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger("fluent_geometry_builder")


def generate_fluent_box_mesh(
    length: float,
    width: float,
    height: float,
    cell_size: float = 0.4,
    output_path: str = "shelter_box.bdf",
) -> str:
    """
    Programmatically writes a 3D Nastran Bulk Data (.bdf) mesh containing
    structured hexahedral volume cells (CHEXA, PID 1 = fluid) and cleanly tagged
    boundary face shells (CQUAD4, PIDs 2-7 for south, north, east, west, roof, floor).
    ANSYS Fluent imports Nastran bulk data natively, creating conformal fluid volume cells
    and labeled boundary face zones.
    """
    out_file = Path(output_path).resolve()
    out_file.parent.mkdir(parents=True, exist_ok=True)

    nx = max(4, int(round(length / cell_size)))
    ny = max(3, int(round(width / cell_size)))
    nz = max(3, int(round(height / cell_size)))

    dx = length / nx
    dy = width / ny
    dz = height / nz

    total_cells = nx * ny * nz
    total_nodes = (nx + 1) * (ny + 1) * (nz + 1)

    def nid(i: int, j: int, k: int) -> int:
        return 1 + i + j * (nx + 1) + k * (nx + 1) * (ny + 1)

    lines = [
        "BEGIN BULK",
        "PSOLID,1,1",
        "PSHELL,2,1,0.1", # South wall (PID 2)
        "PSHELL,3,1,0.1", # North wall (PID 3)
        "PSHELL,4,1,0.1", # East wall  (PID 4)
        "PSHELL,5,1,0.1", # West wall  (PID 5)
        "PSHELL,6,1,0.1", # Roof       (PID 6)
        "PSHELL,7,1,0.1", # Floor      (PID 7)
        "MAT1,1,1.0E5,,0.3,1.0",
    ]

    # Grid nodes
    for k in range(nz + 1):
        z = k * dz
        for j in range(ny + 1):
            y = j * dy
            for i in range(nx + 1):
                x = i * dx
                node_num = nid(i, j, k)
                lines.append(f"GRID,{node_num},,{x:.4f},{y:.4f},{z:.4f}")

    eid = 1
    # Hexahedral volume elements (PID 1)
    for k in range(nz):
        for j in range(ny):
            for i in range(nx):
                n1 = nid(i, j, k)
                n2 = nid(i + 1, j, k)
                n3 = nid(i + 1, j + 1, k)
                n4 = nid(i, j + 1, k)
                n5 = nid(i, j, k + 1)
                n6 = nid(i + 1, j, k + 1)
                n7 = nid(i + 1, j + 1, k + 1)
                n8 = nid(i, j + 1, k + 1)
                lines.append(f"CHEXA,{eid},1,{n1},{n2},{n3},{n4},{n5},{n6}")
                lines.append(f",{n7},{n8}")
                eid += 1

    # South wall (y = 0, PID 2)
    for k in range(nz):
        for i in range(nx):
            n1 = nid(i, 0, k)
            n2 = nid(i + 1, 0, k)
            n3 = nid(i + 1, 0, k + 1)
            n4 = nid(i, 0, k + 1)
            lines.append(f"CQUAD4,{eid},2,{n1},{n2},{n3},{n4}")
            eid += 1

    # North wall (y = ny, PID 3)
    for k in range(nz):
        for i in range(nx):
            n1 = nid(i, ny, k)
            n2 = nid(i + 1, ny, k)
            n3 = nid(i + 1, ny, k + 1)
            n4 = nid(i, ny, k + 1)
            lines.append(f"CQUAD4,{eid},3,{n1},{n2},{n3},{n4}")
            eid += 1

    # East wall (i = nx, PID 4)
    for k in range(nz):
        for j in range(ny):
            n1 = nid(nx, j, k)
            n2 = nid(nx, j + 1, k)
            n3 = nid(nx, j + 1, k + 1)
            n4 = nid(nx, j, k + 1)
            lines.append(f"CQUAD4,{eid},4,{n1},{n2},{n3},{n4}")
            eid += 1

    # West wall (i = 0, PID 5)
    for k in range(nz):
        for j in range(ny):
            n1 = nid(0, j, k)
            n2 = nid(0, j + 1, k)
            n3 = nid(0, j + 1, k + 1)
            n4 = nid(0, j, k + 1)
            lines.append(f"CQUAD4,{eid},5,{n1},{n2},{n3},{n4}")
            eid += 1

    # Roof (k = nz, PID 6)
    for j in range(ny):
        for i in range(nx):
            n1 = nid(i, j, nz)
            n2 = nid(i + 1, j, nz)
            n3 = nid(i + 1, j + 1, nz)
            n4 = nid(i, j + 1, nz)
            lines.append(f"CQUAD4,{eid},6,{n1},{n2},{n3},{n4}")
            eid += 1

    # Floor (k = 0, PID 7)
    for j in range(ny):
        for i in range(nx):
            n1 = nid(i, j, 0)
            n2 = nid(i + 1, j, 0)
            n3 = nid(i + 1, j + 1, 0)
            n4 = nid(i, j + 1, 0)
            lines.append(f"CQUAD4,{eid},7,{n1},{n2},{n3},{n4}")
            eid += 1

    lines.append("END DATA")
    with open(out_file, "w", encoding="ascii") as f:
        f.write("\n".join(lines) + "\n")

    logger.info(
        "Generated Nastran shelter mesh: %s (%d hex cells, %d nodes)",
        str(out_file), total_cells, total_nodes
    )
    return str(out_file)


def build_shelter_geometry(session: Any, params: Any) -> Any:
    """
    Builds a simple 3D box geometry inside Fluent representing the shelter for
    physics calculation only.

    Parameters
    ----------
    session : Any
        An active PyFluent session (launched in solver mode).
    params : DesignParams / SimulationParams
        Design parameters specifying length, width, height, and envelope setup.

    Returns
    -------
    session : Any
        The active PyFluent session with the shelter mesh loaded, checked,
        and ready for boundary condition application.
    """
    length = float(getattr(params, "length", 6.0))
    width = float(getattr(params, "width", 4.0))
    height = float(getattr(params, "height", 2.5))
    case_id = getattr(params, "case_id", "case")

    scratch_dir = Path("./ansys_fluent_scratch")
    scratch_dir.mkdir(parents=True, exist_ok=True)
    mesh_filename = scratch_dir / f"shelter_{case_id}_{length:.1f}x{width:.1f}x{height:.1f}.bdf"

    # Step 1: Generate structured mesh file
    mesh_path = generate_fluent_box_mesh(
        length=length,
        width=width,
        height=height,
        cell_size=0.4,
        output_path=str(mesh_filename),
    )

    # Step 2: Load mesh into PyFluent solver session
    logger.info("Reading generated mesh into PyFluent session: %s", mesh_path)
    session.tui.file.import_.nastran.bulkdata(mesh_path)

    # Step 3: Check mesh quality inside Fluent
    try:
        session.tui.mesh.check()
    except Exception as e:
        logger.debug("Mesh check notice: %s", e)

    # Step 4: Rename zones to standard canonical names
    rename_map = {
        "psolid-pid_1": "interior",
        "pshell-pid_2": "south_wall",
        "pshell-pid_3": "north_wall",
        "pshell-pid_4": "east_wall",
        "pshell-pid_5": "west_wall",
        "pshell-pid_6": "roof",
        "pshell-pid_7": "floor",
    }
    for old_name, new_name in rename_map.items():
        try:
            session.tui.mesh.modify_zones.zone_name(old_name, new_name)
        except Exception as e:
            logger.debug("Zone rename %s -> %s: %s", old_name, new_name, e)

    return session
