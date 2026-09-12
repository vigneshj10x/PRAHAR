# THERMO-SHIELD — Reduced-Order Thermal Simulation Methodology

**Document Version**: 1.0.0  
**Model Type**: Lumped-Parameter Resistance-Capacitance (RC) Transient Network  
**Target Application**: High-Speed Engineering Evaluation & Multi-Objective Optimization for High-Altitude Defense Shelters

---

## 1. Mathematical Formulation & Governing Equations

The reduced-order thermal simulation engine solves a single-zone lumped parameter energy balance across the indoor air and internal envelope thermal mass nodes.

### 1.1 First-Law Differential Heat Balance
$$C_{\text{eff}}(T_{\text{in}}) \frac{dT_{\text{in}}}{dt} = \sum_{i} U_i A_i \left(T_{\text{sol-air}, i}(t) - T_{\text{in}}(t)\right) + Q_{\text{solar, direct}}(t) + Q_{\text{internal}} + \dot{m}_{\text{inf}} c_{p, \text{air}} \left(T_{\text{out}}(t) - T_{\text{in}}(t)\right)$$

Where:
- $T_{\text{in}}(t)$: Instantaneous zone indoor dry-bulb temperature (${}^\circ\text{C}$).
- $T_{\text{out}}(t)$: Instantaneous outdoor ambient dry-bulb temperature (${}^\circ\text{C}$).
- $C_{\text{eff}}(T_{\text{in}})$: Effective overall thermal capacitance ($\text{J}/\text{K}$), combining sensible and PCM latent buffers.
- $U_i, A_i$: Overall thermal transmittance ($\text{W}/(\text{m}^2\cdot\text{K})$) and surface area ($\text{m}^2$) of envelope sub-surface $i$.
- $T_{\text{sol-air}, i}(t)$: Sol-Air equivalent surface temperature taking into account external radiation (${}^\circ\text{C}$).
- $Q_{\text{solar, direct}}(t)$: Direct solar radiation transmitted through glazing into zone interior ($\text{W}$).
- $Q_{\text{internal}}$: Sensible internal thermal gains from occupants and equipment ($\approx 200 - 300\text{ W}$).
- $\dot{m}_{\text{inf}} c_{p, \text{air}}$: Thermal capacity flow rate of infiltration air ($\text{W}/\text{K}$).

---

## 2. Multi-Layer $U$-Value Calculation (ISO 6946)

The engine calculates assembly thermal transmittance ($U$-value) rigorously layer by layer:

$$R_{\text{total}} = R_{\text{si}} + \sum_{j=1}^{N} \frac{t_j}{k_j} + R_{\text{se}}$$
$$U = \frac{1}{R_{\text{total}}}$$

- **Internal Surface Film Resistance ($R_{\text{si}}$)**: $0.13\text{ m}^2\cdot\text{K}/\text{W}$ (standard horizontal heat flow ISO 6946).
- **External Surface Film Resistance ($R_{\text{se}}$)**: $0.04\text{ m}^2\cdot\text{K}/\text{W}$ (high-altitude exterior convective boundary).
- **Composite Area-Weighted Assembly $U$-Value**:
  $$U_{\text{overall}} = \frac{U_{\text{wall}} A_{\text{wall, opaque}} + U_{\text{roof}} A_{\text{roof}} + U_{\text{glaze}} A_{\text{glaze}}}{A_{\text{total}}}$$

---

## 3. Solar Radiation & Sol-Air Temperature

### 3.1 Transmitted Fenestration Solar Gain
$$Q_{\text{solar, direct}}(t) = A_{\text{glaze}} \cdot \text{SHGC} \cdot G_{\text{south}}(t)$$
- $\text{SHGC} = 0.58$ for Double Low-E argon-filled units ($U = 1.40\text{ W}/(\text{m}^2\cdot\text{K})$).

### 3.2 Opaque Envelope Sol-Air Boundary (ASHRAE Fundamentals)
$$T_{\text{sol-air}, i}(t) = T_{\text{out}}(t) + \frac{\alpha_i \cdot G_i(t) - \varepsilon_i \Delta R}{h_e}$$
- $\alpha_i$: Solar absorptivity of the exterior material finish.
- $\varepsilon_i$: Longwave infrared surface emissivity.
- $\Delta R$: Longwave radiation factor to night/clear sky ($30 - 60\text{ W}/\text{m}^2$).
- $h_e$: External convective-radiative film coefficient ($1 / R_{\text{se}} \approx 25\text{ W}/(\text{m}^2\cdot\text{K})$).

---

## 4. Phase Change Material (PCM) Latent Buffer Modeling

Nonlinear phase transitions in PCM-enhanced composites are modeled via the **Apparent Heat Capacity Method**:

$$C_{\text{eff}}(T) = C_{\text{sensible}} + C_{\text{pcm, latent}}(T)$$
$$C_{\text{pcm, latent}}(T) = m_{\text{pcm}} \cdot \frac{L_f}{\sqrt{2\pi}\sigma} \exp\left(-\frac{(T - T_m)^2}{2\sigma^2}\right)$$

Where:
- $m_{\text{pcm}}$: Mass of active Phase Change Material ($\text{kg}$).
- $L_f$: Latent heat of fusion ($\text{J}/\text{kg}$).
- $T_m$: Peak melting/crystallization temperature (${}^\circ\text{C}$).
- $\sigma$: Phase transition smoothing bandwidth ($\approx 1.5^\circ\text{C}$).

---

## 5. Performance Metrics & Metrics Definition

1. **24-Hour Mean Indoor Temperature ($T_{\text{mean}}$)**: Average internal zone temperature over 24 hours.
2. **Auxiliary Heating Demand ($Q_{\text{aux}}$)**: Net thermal energy ($\text{kWh}/\text{day}$) required to maintain a continuous $18^\circ\text{C}$ minimum comfort setpoint (ISO 13790):
   $$Q_{\text{aux}} = \int_{0}^{24\text{h}} \max\left(0, UA_{\text{total}}(18.0 - T_{\text{out}}) - Q_{\text{solar}} - Q_{\text{internal}}\right) dt$$
3. **Comfort Hours / Percentage**:
   - Standard Thermal Comfort Band: $18^\circ\text{C} \le T_{\text{in}} \le 24^\circ\text{C}$.
   - Military High-Altitude Survivability Threshold: Hours/day where $T_{\text{in}} \ge 5.0^\circ\text{C}$ with zero auxiliary fuel.
4. **Envelope Mass & Cost**: Aggregated from individual material layer densities, standard fabrication thicknesses, and unit costs.

---

## 6. Model Assumptions & Known Limitations

| Aspect | Implementation | Known Engineering Limitation |
| :--- | :--- | :--- |
| **Spatial Discretization** | 1D Single-Zone Lumped Parameter | Assumes uniform spatial air temperature; does not resolve vertical thermal stratification or localized cold drafts. |
| **Airflow & Moisture** | Sensible heat balance with constant ACH | Does not model moisture sorption/desorption, relative humidity condensation, or buoyancy-driven stack effect ventilation. |
| **Convection Coefficients** | ISO 6946 / ASHRAE empirical constants | Uses quasi-steady film coefficients rather than solving full Navier-Stokes boundary layer flow. |
| **Ground Thermal Coupling** | Integrated base insulation | Approximates floor loss as a steady conductive pathway without 2D/3D soil semi-infinite domain thermal storage. |
| **PCM Hysteresis** | Symmetric Gaussian apparent capacity | Assumes identical melting and freezing paths (supercooling hysteresis not modeled). |
