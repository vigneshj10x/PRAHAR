# THERMO-SHIELD: ANSYS Fluent 3D CFD Offline Validation Suite

This directory contains the **offline Computational Fluid Dynamics (CFD) validation module** for the THERMO-SHIELD thermal simulation engine.

---

## 1. What This Module Does

This module performs rigorous, automated numerical cross-validation of our reduced-order Resistance-Capacitance (RC) thermal model against high-fidelity 3D Navier-Stokes CFD simulations conducted in **ANSYS Fluent** via the official Python interface (`ansys-fluent-core` / PyFluent).

Its responsibilities are:
1. Taking shortlisted shelter designs (geometry, materials, opening ratios, occupancy) and real high-altitude climate profiles (Leh winter).
2. Building an internal 3D hexahedral computational fluid domain in Fluent.
3. Applying identical physical boundary conditions (exterior convective cooling via the Jürges correlation, solar radiation flux with orientation cosine factor, and metabolic volumetric internal heat generation).
4. Solving the steady-state thermal and momentum equations.
5. Evaluating outcome agreement against an engineering acceptance threshold of **Δ < 15%**.
6. Producing comprehensive JSON, Markdown, and frontend validation data artifacts.

---

## 2. Decoupling: Three.js Frontend vs Fluent Internal Geometry

> [!IMPORTANT]
> **Zero Connection Between Three.js Visualization and Fluent CFD Geometry**
> The Three.js 3D model in the web frontend exists **solely for interactive user visualization and parameter inspection**.
> 
> ANSYS Fluent operates on its own dedicated internal rectangular prism computational domain built programmatically by `fluent_geometry_builder.py`. The user never interacts with or sees Fluent's internal mesh; these two representations are completely decoupled.

---

## 3. Computational Pipeline Architecture: Why Fluent is at the END

In THERMO-SHIELD, multi-objective optimization (NSGA-II) evaluates thousands of shelter candidate configurations across Pareto frontiers of thermal comfort, cost, envelope weight, and carbon footprint.

```
┌─────────────────────────────────────────────────────────────┐
│                 THERMO-SHIELD LIVE PIPELINE                 │
└─────────────────────────────────────────────────────────────┘
                               │
               [1] User Design / Climate Ingress
                               │
                               ▼
        ┌─────────────────────────────────────────────┐
        │       Reduced-Order RC Solver Engine        │
        │    (~1 to 5 milliseconds per evaluation)    │
        │                                             │
        │    • Runs 10,000+ NSGA-II generations       │
        │    • Instant interactive UI feedback        │
        └─────────────────────────────────────────────┘
                               │
                     [2] Pareto Shortlist
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│           OFFLINE SCIENTIFIC AUDIT & BENCHMARK              │
├─────────────────────────────────────────────────────────────┤
│         ANSYS Fluent 3D CFD Offline Validation              │
│       (Minutes per run, executes offline on demand)         │
│                                                             │
│    • Audits shortlisted designs against Navier-Stokes CFD   │
│    • Confirms RC model accuracy within < 15% delta         │
│    • Completely detached from live APIs / frontend buttons  │
└─────────────────────────────────────────────────────────────┘
```

- A full 3D CFD Navier-Stokes simulation in ANSYS Fluent takes **several minutes** to reach residual convergence ($10^{-4}$).
- An NSGA-II optimization run requires **10,000 to 50,000 function evaluations**. Running Fluent inside the optimization loop would require **weeks of supercomputer time** for a single search.
- Therefore, our fast reduced-order RC solver is used for the optimization search, and ANSYS Fluent is placed strictly at the **offline validation endpoint** to audit the shortlisted winners.

---

## 4. PyFluent CFD vs PyMAPDL FEA: Complementary Physics

THERMO-SHIELD incorporates two separate offline validation pathways:

| Feature | PyMAPDL Suite (`ansys_pymapdl_runner.py`) | PyFluent Suite (`simulation-engine/validation/fluent/`) |
|:---|:---|:---|
| **Physics Domain** | Finite Element Analysis (FEA) Thermal Conduction | Computational Fluid Dynamics (CFD) Convection + Airflow |
| **Governing Equation** | Solid Heat Diffusion Equation ($\nabla \cdot (k \nabla T) + \dot{q} = 0$) | Navier-Stokes + Energy Conservation ($\nabla \cdot (\rho \mathbf{u} h) = \nabla \cdot (k \nabla T) + S_h$) |
| **Primary Focus** | Multi-layer wall assembly conduction & thermal bridging | Internal air stratification, buoyancy, and exterior convective stripping |
| **Elements / Mesh** | SOLID70 / SOLID90 3D solid thermal brick elements | Structured 3D hexahedral fluid cell volume with tagged boundary faces |
| **Floor Boundary** | Ground-coupling conduction | Adiabatic baseline boundary |

Together, PyMAPDL and PyFluent provide complete independent validation of both the **solid conductive envelope** and the **fluid convective/radiant domain**.

---

## 5. Prerequisites & Installation

### Required Software
1. **ANSYS Student 2024 R2** (or Commercial/Research license) installed locally:
   - Download free of charge from [ANSYS Student Portal](https://www.ansys.com/academic/students).
   - Ensure **Fluent** is checked during installation.
   - Self-licensed — no license server or key configuration required.
   - Mesh limit: **512,000 cells** (our shelter mesh uses ~10,000 to 20,000 cells, comfortably below the ceiling).
2. **Python Environment**:
   - Python 3.10+
   - PyFluent library:
     ```bash
     pip install ansys-fluent-core
     ```

### Licensing & Concurrent Sessions Constraint
> [!WARNING]
> ANSYS Student licenses strictly permit **only 1 active concurrent Fluent session**.
> `run_validation.py` executes all benchmark cases sequentially. **Never attempt parallel or multithreaded runs with a Student license.**

---

## 6. How to Run

From the project root:
```bash
python simulation-engine/validation/fluent/run_validation.py
```
Or from within the `fluent/` directory:
```bash
cd simulation-engine/validation/fluent
python run_validation.py
```

If your local ANSYS installation resides in a custom directory, set `AWP_ROOT242` or `ANSYS_INSTALL_DIR`:
```bash
set AWP_ROOT242=C:\Program Files\ANSYS Inc\v242
python run_validation.py
```

---

## 7. Output Artifacts Produced

Executing `run_validation.py` generates the following files:

1. `validation_report.json`: Full machine-readable record including execution times, residual convergence, and per-metric deltas.
2. `validation_summary.md`: Clean Markdown comparison table highlighting RC Temp vs Fluent Temp and Heat Loss deltas.
3. `frontend/src/data/validation_results.json`: Live data file ingested by the frontend's FEA Validation modal.
4. `ansys_fluent_scratch/`: Temporary mesh files (`.msh`) and solver scratch records.

---

## 8. Benchmark Cases Summary

| Case | Configuration | Envelope Setup | Climate Conditions |
|:---:|:---|:---|:---|
| **1** | Concrete Baseline | 50mm insulation, 14% opening | Leh winter (Mean -14.3°C, Wind 3.5 m/s) |
| **2** | Composite Standard | 100mm insulation, 14% opening | Leh winter (Mean -14.3°C, Wind 3.5 m/s) |
| **3** | PCM Latent Storage | 75mm insulation, 14% opening | Leh winter (Mean -14.3°C, Wind 3.5 m/s) |
| **4** | High Solar Aperture | 50mm insulation, 25% opening | Leh winter (Mean -14.3°C, Wind 3.5 m/s) |
| **5** | Semi-Dome Equivalent* | 100mm insulation, 14% opening | Leh winter (Mean -14.3°C, Wind 3.5 m/s) |
| **6** | Super-Insulated Passive | 150mm insulation, 5% opening | Leh winter (Mean -14.3°C, Wind 3.5 m/s) |
| **7** | High Wind Exposure | 100mm insulation, 14% opening | Leh winter with 8.0 m/s gale wind |
| **8** | Extreme Cold Outpost | 100mm insulation, 14% opening | Leh winter with -25.0°C ambient mean |

*\*Case 5 Note: Semi-dome approximated as equivalent rectangular volume with matching floor area (28.25 m²). Dome curvature effects on convection are not captured in this rectangular validation case.*
