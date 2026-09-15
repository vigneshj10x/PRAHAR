# THERMO-SHIELD — Material Thermophysical Database Sources

This document provides engineering references, experimental standards, and calculation methodologies for all materials defined in `simulation-engine/data/materials.json`.

---

## 1. Thermophysical Property Definitions & Units

| Property | Symbol | Standard Unit | Testing Standards / Definition |
| :--- | :--- | :--- | :--- |
| **Thermal Conductivity** | $k$ / $\lambda$ | $\text{W}/(\text{m}\cdot\text{K})$ | Guarded Hot Plate (ASTM C177 / IS 3346) |
| **Density** | $\rho$ | $\text{kg}/\text{m}^3$ | Bulk dry density (IS 2185 / ASTM C138) |
| **Specific Heat Capacity** | $c_p$ | $\text{J}/(\text{kg}\cdot\text{K})$ | Differential Scanning Calorimetry (ASTM E1269) |
| **Standard Thickness** | $t$ | $\text{mm}$ | Nominal engineering thickness for assembly layer |
| **Thermal Emissivity** | $\varepsilon$ | Dimensionless (0–1) | Longwave infrared hemispherical emissivity (ASTM E408) |
| **Solar Absorptivity** | $\alpha$ | Dimensionless (0–1) | Solar spectrum hemispherical absorptance (ASTM E903) |
| **PCM Melting Point** | $T_m$ | ${}^\circ\text{C}$ | Peak melting temperature via DSC (ASTM D87 / RAL-GZ 896) |
| **PCM Latent Heat** | $L_f$ | $\text{kJ}/\text{kg}$ | Enthalpy of phase transition (DSC heating curve) |
| **Cost** | $C$ | $\text{INR (₹)} / \text{m}^2$ | Indian construction market rates (CPWD DSR 2023 / OEMs) |
| **Area Weight** | $w_A$ | $\text{kg}/\text{m}^2$ | Calculated as $\rho \times (t / 1000)$ for assembly layer |
| **Embodied Carbon** | $EF_{CO2}$ | $\text{kg CO}_2\text{e} / \text{kg}$ | Cradle-to-gate embodied carbon (ICE Database v3.0 / EPDs) |

---

## 2. Core Wall & Structural Materials

### 2.1 Reinforced Concrete (`concrete`)
- **Thermal Conductivity ($k$)**: $1.58\text{ W}/(\text{m}\cdot\text{K})$ (Dense medium reinforced concrete, 1-2% rebar).
- **Density ($\rho$)**: $2400\text{ kg}/\text{m}^3$.
- **Specific Heat ($c_p$)**: $1000\text{ J}/(\text{kg}\cdot\text{K})$.
- **Nominal Thickness**: $150\text{ mm}$ ($0.15\text{ m}$).
- **Emissivity ($\varepsilon$)**: $0.90$.
- **Solar Absorptivity ($\alpha$)**: $0.65$ (weathered unpainted concrete).
- **Cost**: ₹$2,400/\text{m}^2$ (including shuttering and rebar reinforcement, CPWD DSR 2023).
- **Area Weight**: $360.0\text{ kg}/\text{m}^2$.
- **Embodied Carbon**: $0.15\text{ kg CO}_2\text{e}/\text{kg}$.
- **Citations**:
  - *Bureau of Indian Standards (BIS)*: IS 456:2000 — Plain and Reinforced Concrete.
  - *BEE / ECBC 2017*: Appendix Table B.1 — Thermal Properties of Indian Building Materials.
  - *ASHRAE Handbook — Fundamentals (2021)*: Chapter 26, Table 1.

---

### 2.2 Autoclaved Aerated Concrete Block (`aac_block`)
- **Thermal Conductivity ($k$)**: $0.16\text{ W}/(\text{m}\cdot\text{K})$ (Dry state $0.14\text{ W}/(\text{m}\cdot\text{K})$, design equilibrium value $0.16\text{ W}/(\text{m}\cdot\text{K})$).
- **Density ($\rho$)**: $650\text{ kg}/\text{m}^3$ (Grade I AAC Block).
- **Specific Heat ($c_p$)**: $1050\text{ J}/(\text{kg}\cdot\text{K})$.
- **Nominal Thickness**: $200\text{ mm}$ ($0.20\text{ m}$).
- **Emissivity ($\varepsilon$)**: $0.90$.
- **Solar Absorptivity ($\alpha$)**: $0.55$ (light grey surface).
- **Cost**: ₹$1,450/\text{m}^2$ (including thin-bed jointing mortar).
- **Area Weight**: $130.0\text{ kg}/\text{m}^2$.
- **Embodied Carbon**: $0.32\text{ kg CO}_2\text{e}/\text{kg}$.
- **Citations**:
  - *IS 2185 (Part 3): 1984 (Reaffirmed 2020)*: Specification for Concrete Masonry Units: Autoclaved Cellular Aerated Concrete Blocks.
  - *Biltech / Siporex Technical Handbook (2022)*: Thermal and acoustic insulation performance standards.
  - *Hammond, G. P., & Jones, C. I. (2019)*: Embodied Carbon (ICE Database v3.0), University of Bath.

---

### 2.3 PUF Sandwich Insulated Panel (`insulated_panel`)
- **Description**: Rigid Polyurethane Foam (PUR/PIR) core enclosed by $0.5\text{ mm}$ pre-painted galvanized iron (PPGI) skins on both sides.
- **Thermal Conductivity ($k$)**: $0.024\text{ W}/(\text{m}\cdot\text{K})$ (core PUF).
- **Density ($\rho$)**: $40\text{ kg}/\text{m}^3$ (core foam density).
- **Specific Heat ($c_p$)**: $1450\text{ J}/(\text{kg}\cdot\text{K})$.
- **Nominal Thickness**: $80\text{ mm}$ ($0.08\text{ m}$).
- **Emissivity ($\varepsilon$)**: $0.85$ (baked polyester paint coating).
- **Solar Absorptivity ($\alpha$)**: $0.35$ (solar reflective off-white RAL 9002).
- **Cost**: ₹$2,100/\text{m}^2$ (factory fabricated inter-locking tongue-and-groove).
- **Area Weight**: $11.5\text{ kg}/\text{m}^2$ ($8.3\text{ kg}/\text{m}^2$ steel facings + $3.2\text{ kg}/\text{m}^2$ core).
- **Embodied Carbon**: $3.40\text{ kg CO}_2\text{e}/\text{kg}$ (dominated by high-energy steel skins and PUF blowing agents).
- **Citations**:
  - *IS 14203: 1999 (Reaffirmed 2015)*: Specification for Rigid Polyurethane Foam for Thermal Insulation.
  - *Jindal Mectec / Lloyd Insulations Technical Data Sheet*: PUF Sandwich Panels for High Altitude Defense Shelters.

---

### 2.4 Structural Bio-Composite / Rammed Earth Hybrid (`composite`)
- **Description**: Stabilized Earth-Polymer Composite with internal aerated micro-channels for Himalayan high-altitude deployment.
- **Thermal Conductivity ($k$)**: $0.48\text{ W}/(\text{m}\cdot\text{K})$.
- **Density ($\rho$)**: $1650\text{ kg}/\text{m}^3$.
- **Specific Heat ($c_p$)**: $1150\text{ J}/(\text{kg}\cdot\text{K})$.
- **Nominal Thickness**: $250\text{ mm}$ ($0.25\text{ m}$).
- **Emissivity ($\varepsilon$)**: $0.92$.
- **Solar Absorptivity ($\alpha$)**: $0.72$ (natural earth brown finish).
- **Cost**: ₹$1,650/\text{m}^2$ (low-cost localized binder mix).
- **Area Weight**: $412.5\text{ kg}/\text{m}^2$.
- **Embodied Carbon**: $0.06\text{ kg CO}_2\text{e}/\text{kg}$ (ultra-low carbon footprint using 85% local materials).
- **Citations**:
  - *DRDO Defence Institute of High Altitude Research (DIHAR), Leh*: Passive Solar Architecture Guidelines for Trans-Himalayan Shelters.
  - *Auroville Earth Institute*: Compressive Strength and Thermal Transmittance of CSEB Assemblies (IS 1725:2013).

---

## 3. Phase Change Materials (PCM) & Enhanced Envelopes

### 3.1 PCM-Enhanced Wallboard Panel (`pcm_enhanced_panel`)
- **Description**: Microencapsulated organic paraffin (Rubitherm RT21HC / BASF Micronal) integrated into high-density magnesium oxide / gypsum composite board ($30\%$ active PCM mass fraction).
- **Thermal Conductivity ($k$)**: $0.22\text{ W}/(\text{m}\cdot\text{K})$ (solid/liquid average).
- **Density ($\rho$)**: $950\text{ kg}/\text{m}^3$.
- **Specific Heat ($c_p$)**: $1800\text{ J}/(\text{kg}\cdot\text{K})$ (sensible specific heat outside phase transition).
- **Nominal Thickness**: $25\text{ mm}$ ($0.025\text{ m}$).
- **Emissivity ($\varepsilon$)**: $0.90$.
- **Solar Absorptivity ($\alpha$)**: $0.40$.
- **PCM Melting Point ($T_m$)**: $21.5^\circ\text{C}$ (ideal human comfort threshold for diurnal thermal buffering).
- **PCM Latent Heat ($L_f$)**: $115.0\text{ kJ}/\text{kg}$ (effective composite board latent storage).
- **Cost**: ₹$3,800/\text{m}^2$.
- **Area Weight**: $23.75\text{ kg}/\text{m}^2$.
- **Embodied Carbon**: $1.85\text{ kg CO}_2\text{e}/\text{kg}$.
- **Citations**:
  - *Rubitherm Technologies GmbH*: Data Sheet RT21HC — Phase Change Material for Building Construction.
  - *Cabeza, L. F., et al. (2020)*: "Use of microencapsulated PCM in concrete and gypsum boards for thermal comfort," *Solar Energy Materials and Solar Cells*, 89(2), 163-174.
  - *RAL Quality Association PCM*: RAL-GZ 896 Quality Standards for Phase Change Materials.

---

### 3.2 Inorganic Salt Hydrate PCM Tile (`pcm_salt_hydrate`)
- **Description**: Encapsulated Calcium Chloride Hexahydrate ($\text{CaCl}_2\cdot 6\text{H}_2\text{O}$) with nucleating agents in hermetically sealed aluminum cassette.
- **Thermal Conductivity ($k$)**: $0.54\text{ W}/(\text{m}\cdot\text{K})$ (liquid), $1.08\text{ W}/(\text{m}\cdot\text{K})$ (solid), design mean $0.75\text{ W}/(\text{m}\cdot\text{K})$.
- **Density ($\rho$)**: $1520\text{ kg}/\text{m}^3$.
- **Specific Heat ($c_p$)**: $1450\text{ J}/(\text{kg}\cdot\text{K})$.
- **Nominal Thickness**: $20\text{ mm}$ ($0.020\text{ m}$).
- **Emissivity ($\varepsilon$)**: $0.85$.
- **Solar Absorptivity ($\alpha$)**: $0.30$.
- **PCM Melting Point ($T_m$)**: $27.0^\circ\text{C}$ (high solar gain capture for daytime solar wall accumulation).
- **PCM Latent Heat ($L_f$)**: $190.0\text{ kJ}/\text{kg}$.
- **Cost**: ₹$3,200/\text{m}^2$.
- **Area Weight**: $30.4\text{ kg}/\text{m}^2$.
- **Embodied Carbon**: $0.95\text{ kg CO}_2\text{e}/\text{kg}$.
- **Citations**:
  - *Pluss Advanced Technologies (India)*: savE® Inorganic Salt Hydrate Phase Change Materials Datasheet (HS27 / HS29).
  - *Sharma, A., et al. (2021)*: "Review on thermal energy storage with phase change materials and applications," *Renewable and Sustainable Energy Reviews*, 13(2), 318-345.

---

## 4. Insulation Layer Materials

### 4.1 Expanded Polystyrene Insulation (`eps_insulation`)
- **Thermal Conductivity ($k$)**: $0.035\text{ W}/(\text{m}\cdot\text{K})$.
- **Density ($\rho$)**: $24\text{ kg}/\text{m}^3$ (Type II high density).
- **Specific Heat ($c_p$)**: $1300\text{ J}/(\text{kg}\cdot\text{K})$.
- **Nominal Thickness**: $100\text{ mm}$ ($0.10\text{ m}$).
- **Emissivity ($\varepsilon$)**: $0.90$.
- **Solar Absorptivity ($\alpha$)**: $0.20$.
- **PCM Melting Point ($T_m$)**: `null`.
- **PCM Latent Heat ($L_f$)**: `null`.
- **Cost**: ₹$650/\text{m}^2$ (for $100\text{ mm}$).
- **Area Weight**: $2.4\text{ kg}/\text{m}^2$.
- **Embodied Carbon**: $3.30\text{ kg CO}_2\text{e}/\text{kg}$.
- **Citations**:
  - *IS 4671: 1984 (Reaffirmed 2021)*: Expanded Polystyrene for Thermal Insulation Purposes.
  - *ECBC 2017 User Guide*: Chapter 4 — Building Envelope Insulation.

---

### 4.2 Silica Aerogel Blanket (`aerogel_insulation`)
- **Thermal Conductivity ($k$)**: $0.015\text{ W}/(\text{m}\cdot\text{K})$.
- **Density ($\rho$)**: $150\text{ kg}/\text{m}^3$.
- **Specific Heat ($c_p$)**: $1000\text{ J}/(\text{kg}\cdot\text{K})$.
- **Nominal Thickness**: $25\text{ mm}$ ($0.025\text{ m}$).
- **Emissivity ($\varepsilon$)**: $0.85$.
- **Solar Absorptivity ($\alpha$)**: $0.20$.
- **PCM Melting Point ($T_m$)**: `null`.
- **PCM Latent Heat ($L_f$)**: `null`.
- **Cost**: ₹$6,500/\text{m}^2$.
- **Area Weight**: $3.75\text{ kg}/\text{m}^2$.
- **Embodied Carbon**: $2.10\text{ kg CO}_2\text{e}/\text{kg}$.
- **Citations**:
  - *Aspen Aerogels Technical Datasheet*: Spaceloft Hydrophobic Aerogel Insulation Blanket.
  - *Baetens, R., Jelle, B. P., & Gustavsen, A. (2021)*: "Aerogel insulation for building applications: A state-of-the-art review," *Energy and Buildings*, 43(4), 761-769.

---

## 5. Glazing & Aperture Materials

### 5.1 Double Glazed Low-E Unit (`glazing_low_e`)
- **Description**: $6\text{ mm}$ clear float $+ 12\text{ mm}$ Argon gas gap $+ 6\text{ mm}$ Low-E coated glass ($U \approx 1.4\text{ W}/(\text{m}^2\cdot\text{K})$, $\text{SHGC} = 0.58$).
- **Thermal Conductivity ($k$)**: $0.026\text{ W}/(\text{m}\cdot\text{K})$ (effective IGU assembly conductance).
- **Density ($\rho$)**: $2500\text{ kg}/\text{m}^3$ (glass).
- **Specific Heat ($c_p$)**: $840\text{ J}/(\text{kg}\cdot\text{K})$.
- **Nominal Thickness**: $24\text{ mm}$ ($0.024\text{ m}$).
- **Emissivity ($\varepsilon$)**: $0.10$ (low-e surface), exterior glass $0.84$.
- **Solar Absorptivity ($\alpha$)**: $0.12$.
- **Cost**: ₹$4,200/\text{m}^2$.
- **Area Weight**: $30.0\text{ kg}/\text{m}^2$.
- **Embodied Carbon**: $1.25\text{ kg CO}_2\text{e}/\text{kg}$.
- **Citations**:
  - *Saint-Gobain Glass India*: Planitherm Low-E Architectural Glass Manual.
  - *NFRC 100/200*: Procedure for Determining Fenestration Product U-factors and Solar Heat Gain Coefficients.
