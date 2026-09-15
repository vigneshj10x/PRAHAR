import sys
sys.path.insert(0, ".")
from pathlib import Path

def write_shelter_bdf(length=4.0, width=3.0, height=2.4, nx=4, ny=3, nz=3, filename="scratch/test_shelter.bdf"):
    out_file = Path(filename).resolve()
    out_file.parent.mkdir(parents=True, exist_ok=True)

    dx = length / nx
    dy = width / ny
    dz = height / nz

    def nid(i, j, k):
        return 1 + i + j * (nx + 1) + k * (nx + 1) * (ny + 1)

    lines = [
        "BEGIN BULK",
        "PSOLID,1,1",
        "PSHELL,2,1,0.1", # South wall
        "PSHELL,3,1,0.1", # North wall
        "PSHELL,4,1,0.1", # East wall
        "PSHELL,5,1,0.1", # West wall
        "PSHELL,6,1,0.1", # Roof
        "PSHELL,7,1,0.1", # Floor
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
    print("Wrote BDF file:", out_file)
    return str(out_file)

bdf_p = write_shelter_bdf(4.0, 3.0, 2.4, 4, 3, 3)

from simulation_engine.validation.fluent.fluent_runner import launch_fluent_session
session = launch_fluent_session()
try:
    session.tui.file.import_.nastran.bulkdata(bdf_p)
    print("Mesh imported successfully!")
    session.tui.mesh.check()
    print("Mesh check succeeded!")

    # Rename zones to standard names
    session.tui.mesh.modify_zones.zone_name("psolid-pid_1", "interior")
    session.tui.mesh.modify_zones.zone_name("pshell-pid_2", "south_wall")
    session.tui.mesh.modify_zones.zone_name("pshell-pid_3", "north_wall")
    session.tui.mesh.modify_zones.zone_name("pshell-pid_4", "east_wall")
    session.tui.mesh.modify_zones.zone_name("pshell-pid_5", "west_wall")
    session.tui.mesh.modify_zones.zone_name("pshell-pid_6", "roof")
    session.tui.mesh.modify_zones.zone_name("pshell-pid_7", "floor")
    print("Zones renamed successfully!")

    # Enable energy equation
    session.tui.define.models.energy("yes", "no", "no", "no", "yes")
    print("Energy equation enabled!")

    # Set laminar viscous
    session.tui.define.models.viscous.laminar("yes")
    print("Viscous laminar set!")

    # Boundary conditions using Pythonic settings API:
    # South wall: heat flux
    w_south = session.settings.setup.boundary_conditions.wall['south_wall']
    w_south.thermal.thermal_bc = 'Heat Flux'
    w_south.thermal.heat_flux = 150.0

    # North, East, West, Roof: Convection
    for w_name in ['north_wall', 'east_wall', 'west_wall', 'roof']:
        w = session.settings.setup.boundary_conditions.wall[w_name]
        w.thermal.thermal_bc = 'Convection'
        w.thermal.heat_transfer_coeff = 15.0
        w.thermal.free_stream_temp = 263.15

    # Floor: adiabatic
    w_floor = session.settings.setup.boundary_conditions.wall['floor']
    w_floor.thermal.thermal_bc = 'Heat Flux'
    w_floor.thermal.heat_flux = 0.0
    print("All boundary conditions set successfully!")

    # Initialize solution
    session.settings.solution.initialization.initialization_type = 'standard'
    session.settings.solution.initialization.standard_initialize()
    print("Flow initialized!")

    # Run 10 iterations
    session.settings.solution.run_calculation.iter_count = 10
    session.settings.solution.run_calculation.calculate()
    print("10 iterations calculated!")

    # Extract results using exact arguments
    print("Computing volume_average...")
    session.settings.results.report.volume_integrals.volume_average(cell_zones=['interior'], cell_function='temperature', write_to_file=False)
    session.settings.results.report.volume_integrals.minimum(cell_zones=['interior'], cell_function='temperature', write_to_file=False)
    session.settings.results.report.volume_integrals.maximum(cell_zones=['interior'], cell_function='temperature', write_to_file=False)
    session.settings.results.report.fluxes.heat_transfer(zones=['north_wall', 'east_wall', 'west_wall', 'roof'], write_to_file=False)

    # Test report definition computation
    session.settings.solution.report_definitions.volume['temp_mean'] = {
        'report_type': 'volume-average',
        'field': 'temperature',
        'cell_zones': ['interior']
    }
    res_def = session.settings.solution.report_definitions.compute(report_defs=['temp_mean'])
    print("Report definition compute returned:", res_def)
finally:
    session.exit()
