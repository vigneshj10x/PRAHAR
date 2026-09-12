# THERMO-SHIELD: ANSYS MAPDL Thermal Validation Suite

This directory contains the **offline Finite Element Analysis (FEA) validation suite** for the THERMO-SHIELD thermal simulation engine.

---

## 1. Architectural Role & Offline Notice

> [!IMPORTANT]
> **OFFLINE VALIDATION TOOL ONLY**
> This script is a standalone, offline research benchmarking tool designed to audit our reduced-order Resistance-Capacitance (RC) solver against industry-standard **ANSYS Mechanical (MAPDL)** FEA solutions.
> 
> It is **NOT** part of the live deployed web application, is **NOT** called during runtime by the FastAPI backend or Vite frontend, and does not run during live user interaction.

---

## 2. Prerequisites & Licensing

To execute this validation module, the host machine must have:
1. **ANSYS Mechanical with MAPDL** installed locally with an active valid license (ANSYS Student, Teaching, or Commercial license).
   - Standard Windows install path: `C:\Program Files\ANSYS Inc\v242` (or `v231`, `v232`, `v241`).
   - Or environment variable `AWP_ROOTXXX` pointing to the ANSYS root directory.
2. **Python Environment**:
   - Python 3.10+
   - `ansys-mapdl-core` (`pip install ansys-mapdl-core`)
   - `numpy`, `scipy`

---

## 3. How to Install and Run

### Step 1: Install PyMAPDL
```bash
pip install ansys-mapdl-core
```

### Step 2: Verify Local ANSYS Installation
Ensure your ANSYS license manager is running and MAPDL is accessible:
```bash
python -c "from ansys.mapdl.core import launch_mapdl; mapdl = launch_mapdl(); print(mapdl); mapdl.exit()"
```

### Step 3: Execute the Validation Benchmark
Run the automated comparative runner from the project root:
```bash
python -m simulation_engine.validation.ansys_pymapdl_runner
```
or directly from the `validation/` folder:
```bash
python ansys_pymapdl_runner.py
```

---

## 4. Input Translation & Boundary Condition Equivalence

The validation runner guarantees **100% input equivalence** between the two solvers by pulling from the exact same single source of truth:

| Model Parameter | THERMO-SHIELD Source | ANSYS MAPDL Implementation | Unit |
|:---|:---|:---|:---|
| **Wall Material** | `materials_db.get(wall_material)` | `MP, KXX, 1, k_wall` <br> `MP, DENS, 1, rho_wall` <br> `MP, C, 1, cp_wall` | $\text{W/(m}\cdot\text{K)}$, $\text{kg/m}^3$, $\text{J/(kg}\cdot\text{K)}$ |
| **Insulation Layer** | `materials_db.get("glass_wool")` | `MP, KXX, 2, k_ins` <br> `MP, DENS, 2, rho_ins` <br> `MP, C, 2, cp_ins` | $\text{W/(m}\cdot\text{K)}$, $\text{kg/m}^3$, $\text{J/(kg}\cdot\text{K)}$ |
| **Roof Cladding** | `materials_db.get(roof_material)` | `MP, KXX, 3, k_roof` <br> `MP, DENS, 3, rho_roof` <br> `MP, C, 3, cp_roof` | $\text{W/(m}\cdot\text{K)}$, $\text{kg/m}^3$, $\text{J/(kg}\cdot\text{K)}$ |
| **Geometry** | `length x width x height` | `BLOCK, -W/2, W/2, -L/2, L/2, 0, H` with boolean shell subtraction | $\text{meters}$ |
| **Ambient Convection** | $h_c = 4.0 + 3.0 \times V_{wind}$ | `SF, ALL, CONV, h_conv, T_amb` | $\text{W/(m}^2\cdot\text{K)}$, $^\circ\text{C}$ |
| **Solar Irradiance** | Peak Directional Solar Flux | `SF, ALL, HFLUX, q_solar` on South Facade | $\text{W/m}^2$ |
| **Internal Occupants** | $N_{occupants} \times 80\text{ W}$ | `BFE, ALL, HGEN, 1, q_internal_vol` | $\text{W/m}^3$ |

---

## 5. Generated Artifacts
When executed on an ANSYS-licensed machine, the script generates:
- `validation_report.md`: Markdown summary table with input parameters, temperatures, heat losses, and percentage deltas.
- `validation_report.json`: Machine-readable benchmark record.
- `ansys_scratch/`: Temporary MAPDL session files, mesh databases, and solver logs.
