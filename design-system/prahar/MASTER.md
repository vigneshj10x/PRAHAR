# PRAHAR / THERMO-SHIELD — Defense Engineering Workstation Design System (MASTER.md)

> **System**: PRAHAR / THERMO-SHIELD (Smart India Hackathon PS 26051 — DRDO / iDEX)  
> **Document**: Master UI/UX Design System Specification  
> **Version**: 1.0.0  
> **Target Theme**: High-Precision Defense Engineering Digital Twin Workstation  

---

## 1. Product Design Direction

PRAHAR is a high-precision defense engineering digital twin workstation designed for DRDO engineers, military logistics commanders, NDMA disaster relief authorities, and thermal researchers. The interface must balance extreme data density, physical simulation rigor, and high-altitude microclimate situational awareness while keeping the central 3D Digital Twin as the primary engineering canvas.

### Core Visual & Functional Principles
- **Precision & Technical Credibility**: Every metric display, U-value readout, heat flux vector, and material layer property is presented with exact SI/IS units and high legibility.
- **Situational Awareness**: Immediate, un-cluttered visibility into environmental threats (7-factor Himalayan disaster risks, extreme cold waves, snow loads).
- **Controlled Technology Aesthetic**: A dark engineering workstation atmosphere—reminiscent of defense command systems, CAD workstations, and aerospace telemetry consoles.
- **No Unnecessary Decoration**: Strictly zero gaming HUD elements, zero neon cyberpunk overlays, zero generic SaaS card padding, zero purple AI gradients, and zero emoji UI icons.

---

## 2. Visual Style

- **Style Classification**: **Technical / Dark Engineering Workstation**
- **Rationale**: Defense and aerospace engineers operate in complex environments where dark background themes reduce glare, enhance 3D geometry contrast, highlight heat-map gradients, and prevent eye strain during extended analytical sessions.
- **Surface Elevation Strategy**: Flat, low-contrast dark slate panels (`#0c1017`, `#121824`, `#192234`) with crisp 1px subtle borders (`#212e46`, `#2d3f5e`).
- **Restrained Translucency**: Glassmorphism is strictly limited to 3D canvas floating overlays (e.g. view mode toggles, section legends) using dark translucent backdrops (`rgba(12, 16, 23, 0.85)` with `backdrop-filter: blur(8px)`).

---

## 3. Color System & Semantic Tokens

```css
:root {
  /* ── Core Surface Elevation System ── */
  --color-bg-base:        #080b10; /* Deepest workspace backdrop */
  --color-bg-panel:       #0d121c; /* Sidebar and panel background */
  --color-bg-surface:     #131a28; /* Elevated cards and container panels */
  --color-bg-elevated:    #1a2436; /* Modals, dropdown menus, and popovers */
  --color-bg-hover:       #212e46; /* Interactive element hover state */
  --color-bg-active:      #2a3b5a; /* Selected item / pressed state */

  /* ── Structural Borders ── */
  --color-border-dim:     #172030; /* Subdued divider lines */
  --color-border-base:    #212e46; /* Standard panel and card borders */
  --color-border-bright:  #34486d; /* Focus rings and active borders */
  --color-border-accent:  #0284c7; /* Engineering highlight border */

  /* ── High-Contrast Typography ── */
  --color-text-primary:   #f8fafc; /* Primary headings and key readouts (Slate 50) */
  --color-text-secondary: #cbd5e1; /* Labels, descriptions, and body text (Slate 300) */
  --color-text-muted:     #8094b0; /* Secondary metadata and units (Slate 400/500) */
  --color-text-faint:     #475569; /* Disabled states and subtle gridlines */

  /* ── Engineering Telemetry & Status Accents ── */
  --color-telemetry-cool: #0284c7; /* Heat loss, sub-zero cold, cool airflow (Sky 600) */
  --color-telemetry-cool-glow: rgba(2, 132, 199, 0.15);
  
  --color-thermal-hot:    #ea580c; /* Heating demand, solar gain, high temp (Orange 600) */
  --color-thermal-hot-glow: rgba(234, 88, 12, 0.15);
  
  --color-solar:          #d97706; /* Solar irradiance, sun angle, diurnal peak (Amber 600) */
  --color-solar-glow:     rgba(217, 119, 6, 0.15);

  --color-status-ok:      #16a34a; /* Thermal comfort satisfied, verified (Green 600) */
  --color-status-ok-glow: rgba(22, 163, 74, 0.15);

  --color-status-warn:    #eab308; /* Low comfort, high wind chill alert (Yellow 500) */
  --color-status-warn-glow: rgba(234, 179, 8, 0.15);

  --color-status-danger:  #dc2626; /* Critical frostbite hazard, GLOF proximity (Red 600) */
  --color-status-danger-glow: rgba(220, 38, 38, 0.15);

  --color-ai-accent:      #0284c7; /* XGBoost Surrogate / Pareto recommendation */
  --color-ai-accent-glow: rgba(2, 132, 199, 0.20);
}
```

---

## 4. Typography System

The typography hierarchy pairs **Inter** for structural labels and UI controls with **IBM Plex Mono** for high-density numerical telemetry, units, coordinate readouts, and physics solver matrices.

| Style Role | Font Family | Size | Weight | Line Height | Tracking | Usage |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Display Title** | Inter | 20px (1.25rem) | 600 (SemiBold) | 1.2 | -0.02em | TopBar brand title, Report header |
| **Section Header** | IBM Plex Mono | 11px (0.6875rem) | 600 (SemiBold) | 1.3 | +0.10em | Uppercase panel section headers |
| **Card Title** | Inter | 14px (0.875rem) | 600 (SemiBold) | 1.3 | -0.01em | Control card & modal headers |
| **Body Primary** | Inter | 13px (0.8125rem) | 400 (Regular) | 1.5 | 0 | Descriptions, dropdown values |
| **Body Secondary**| Inter | 12px (0.75rem) | 400 (Regular) | 1.4 | 0 | Subtext, tooltips, secondary notes |
| **Numeric Key Data**| IBM Plex Mono | 18px (1.125rem) | 600 (SemiBold) | 1.1 | 0 | Main metrics (U-value, mean temp, cost) |
| **Numeric Value** | IBM Plex Mono | 13px (0.8125rem) | 500 (Medium) | 1.2 | 0 | Input fields, table cells, telemetry |
| **Unit Label** | IBM Plex Mono | 10px (0.625rem) | 400 (Regular) | 1.0 | +0.04em | Engineering units (`W/m²K`, `kWh/day`) |

---

## 5. Responsive Layout System

The PRAHAR interface preserves the central **3D Digital Twin Viewport** as the primary interactive engineering workspace. Side panels are collapsible, ensuring fluid operation across display sizes.

```text
========================================================================================
                                     TopBar (44px)
========================================================================================
 LeftPanel (300px)   │                                          │  RightPanel (300px)
 [Collapsible Drawer]│         Center 3D Viewport               │  [Collapsible Drawer]
 ── Geometry         │         (Three.js Digital Twin)          │  ── U-Value Gauge
 ── Materials        │                                          │  ── Diurnal Plot 24h
 ── Insulation       │  [Floating 3D Controls & Legend Overlay] │  ── Heating Demand
 ── Location & Climate│                                          │  ── Weight / Cost
 ── Disaster Risk    │                                          │  ── Comfort Badge
========================================================================================
                                    BottomBar (36px)
========================================================================================
```

### Breakpoint Strategy & Panel Adaptation
- **Desktop Extra Wide ($\ge 1440\text{px}$)**: Full 3-column expanded layout. LeftPanel (`300px`), Center 3D Viewport (`Flex 1`), RightPanel (`300px`).
- **Laptop / Standard ($\text{1024px} - \text{1439px}$)**: Left and Right panels auto-collapse to slim icon/metric rails (`48px`) with hover/click drawer expansions, keeping the 3D viewport canvas at $\ge 70\%$ screen width.
- **Tablet ($\text{768px} - \text{1023px}$)**: Single panel visible at a time via tab toggle (`Parameters` \| `3D Digital Twin` \| `Telemetry`). Sidebars slide out as overlay drawers.
- **Mobile ($< \text{768px}$)**: Stacked viewport layout with bottom-sheet control drawers. 3D canvas scales dynamically with touch orbit controls.

---

## 6. Application Shell Components

### 6.1 TopBar (`TopBar.tsx`)
- **Height**: `44px`
- **Visual Design**: Dark elevated surface (`#0d121c`) with bottom border (`#212e46`).
- **Left Zone**: PRAHAR military badge, application title, and live/mock engine transport indicator pill (`LIVE FASTAPI BACKEND` in green vs `MOCK ENGINE` in amber).
- **Center Zone**: View mode segment selector (`Workbench` \| `Full Map` \| `Layer Analytics`).
- **Right Zone**: Quick preset location dropdown (Leh, Jaisalmer, Delhi, Kochi, Srinagar) and primary action triggers (`Auto-Optimize`, `What-If`, `Compare`, `Report`).

### 6.2 LeftPanel (`LeftPanel.tsx`)
- **Width**: `300px` (collapsible to `48px`)
- **Content Accordions**:
  1. **Architectural Geometry**: Visual thumbnail grid for 25 shelter shapes.
  2. **Envelope Materials**: Wall, Roof, Glazing material selectors + PCM toggle.
  3. **Envelope Dimensions**: Insulation slider (0–300 mm), Aperture ratio (5–95%), Length, Width, Height.
  4. **Site Microclimate**: Geocoding search box & dynamic weather card.
  5. **Disaster Risk HUD**: Compact 7-factor Himalayan risk score radar.

### 6.3 Center Viewport (`CenterPanel.tsx` & `ShelterScene.tsx`)
- **Workspace**: Full height/width Three.js WebGL canvas.
- **Environment**: Dark high-altitude atmospheric gradient background (`#080b10` to `#121826`), high-altitude terrain floor grid, sun vector directional light, and cutaway section planes.
- **Floating Overlays**: Camera view mode pills (Perspective, Top, South, Cutaway), visualization state toggle (Thermal Heat Map vs Material View), heat flux color scale legend.

### 6.4 RightPanel (`RightPanel.tsx`)
- **Width**: `300px` (collapsible to `48px`)
- **Telemetry Cards**:
  1. **U-Value & Thermal Transmittance Gauge**: Visual arc/linear meter with target boundary comparison.
  2. **24-Hour Diurnal Replay Chart**: Recharts plot comparing outdoor dry-bulb temperature vs simulated indoor dry-bulb curve vs solar radiation.
  3. **Thermal Comfort & Survivability Badge**: Hours/day above 18°C comfort and 5°C survival thresholds.
  4. **Structural Weight & Cost**: Total envelope weight (kg) with airborne transport limits, fabrication budget (₹ INR), and embodied carbon footprint ($\text{kg CO}_2\text{e}$).

### 6.5 BottomBar (`BottomBar.tsx`)
- **Height**: `36px`
- **Telemetry Bar**: Active site coordinates, altitude, solver execution latency (e.g. `24ms`), active database state, and quick help/methodology links.

---

## 7. Engineering Controls Pattern

All UI input controls prioritize high-density precision, immediate keyboard input support, and clear SI/IS unit labels over decorative fluff.

```text
┌── Insulation Thickness ───────────────────────────────────┐
│ 150.0  [ mm ]                             [  ◄   Slider  ► ]│
│ Min: 0 mm                              Max: 300 mm         │
└───────────────────────────────────────────────────────────┘
```

- **Number Inputs + Sliders**: Combined slider track with precise numerical input box. Typing a number updates slider instantly.
- **Segmented Toggles**: Low-contrast dark pills (`#192234`) with active bright indicator (`#0284c7`).
- **Visual Geometry Cards**: 25 shelter shapes rendered as 3D SVG wireframe thumbnail cards with title and code tag (e.g. `Bunker Bermed [bunker_bermed]`).

---

## 8. Thermal Telemetry & Performance Hierarchy

Thermal metrics are categorized by severity and visual weight:

| Metric Category | Visual Indicator | Normal State | Warning State | Critical Threshold |
| :--- | :--- | :--- | :--- | :--- |
| **Indoor Dry-Bulb ($T_{\text{in}}$)** | Digital badge + curve | $18^\circ\text{C} - 24^\circ\text{C}$ (Green) | $5^\circ\text{C} - 17^\circ\text{C}$ (Amber) | $< 5^\circ\text{C}$ (Red Frostbite Risk) |
| **Envelope U-Value** | Gauge meter + value | $< 0.30\text{ W}/m^2K$ (Green) | $0.31 - 0.60\text{ W}/m^2K$ (Yellow) | $> 0.60\text{ W}/m^2K$ (Red High Loss) |
| **Auxiliary Heating Demand** | Energy badge | $< 15\text{ kWh/day}$ (Green) | $15 - 40\text{ kWh/day}$ (Orange) | $> 40\text{ kWh/day}$ (Red High Fuel) |
| **Envelope Weight** | Weight bar | $< 5,000\text{ kg}$ (Airborne OK) | $5,000 - 15,000\text{ kg}$ (Truck OK) | $> 15,000\text{ kg}$ (Heavy Transport) |

---

## 9. 7-Factor Disaster Risk HUD

The 7-factor disaster risk card evaluates site hazards:
1. **Avalanche Exposure Risk** (Terrain slope gradient + snow depth)
2. **GLOF Burst Risk** (Proximity to curated glaciated lakes, e.g. South Lhonak, Chorabari)
3. **Landslide Slope Stability** (Tectonic thrust belt + monsoon saturation)
4. **Seismic Hazard Zone** (BIS IS 1893:2016 Classification: Zone II to V)
5. **Extreme Cold / Frostbite Exposure** (NOAA / DIPAS Wind Chill Index)
6. **Structural Snow Load** (Roof snow accumulation per IS 875 Part 4)
7. **Flash Flood Drainage Funnel** (Relief ratio & catchment proxy)

### Compact HUD Radar Layout
Displayed as a 7-axis radar visualizer with high-visibility color coding (Green = Low, Amber = Moderate, Red = Extreme), accompanied by an instant mitigation advisory pill (e.g. `RECOMMENDATION: Reinforced Pitch Roof + High Seismic Anchor`).

---

## 10. AI Pareto Optimization UX Pattern

When the user triggers **Auto-Optimize**, the XGBoost surrogate model evaluates 3,000+ candidates in sub-milliseconds and displays an interactive **Pareto Trade-Off Explorer**:

- **2D Pareto Scatter Visualizer**: Recharts scatter chart plotting candidate designs along non-dominated Pareto frontiers:
  - X-Axis: Total Fabrication Cost (₹ INR) or Weight (kg)
  - Y-Axis: Thermal Comfort (%) or Mean Indoor Temp (°C)
  - Dot Size: Insulation Thickness (mm)
  - Dot Color: Architectural Shape Archetype
- **Candidate Comparison Cards**: Displays 3 to 6 distinct Pareto candidates (e.g., `Ultra-Lightweight Tactical`, `Super-Insulated Maximum Comfort`, `Low-Cost Regional Bio-Composite`).
- **Sacrifice & Gain HUD**: Explicitly highlights:
  - *"What this candidate gains"* (+3.2°C mean temp, 68% fuel reduction)
  - *"What you sacrifice"* (+1,200 kg weight, +₹45,000 cost)
- **Numerical Physics Verification Button**: Triggers `POST /api/verify` to execute high-fidelity 1D RC physics solver and show surrogate prediction error delta (e.g. `Verified Physics Delta: ±0.12°C`).

---

## 11. Material Layer Analytics Pattern

Full workstation page ([`LayerAnalyticsPage.tsx`](file:///d:/sih_thermal_shellder/frontend/src/features/layers/LayerAnalyticsPage.tsx)) providing deep envelope thermal breakdown:
- **Visual Cross-Section Stack**: Stacked layer diagram showing outer finish $\rightarrow$ core wall $\rightarrow$ PCM layer $\rightarrow$ inner finish.
- **Temperature Drop Gradient Plot**: Line graph showing steady-state temperature profile from outdoor temperature ($T_{\text{out}}$) through each material layer interface to indoor air ($T_{\text{in}}$).
- **Layer Property Table**: Layer thickness ($mm$), conductivity ($k$), density ($\rho$), specific heat ($c_p$), thermal resistance ($R = t/k$), area weight ($\text{kg}/m^2$), cost ($₹/m^2$), and embodied carbon ($\text{kg CO}_2\text{e}/\text{kg}$).

---

## 12. Engineering State Machine

The UI components implement clear visual feedback across all system execution states:

```text
[ Idle / Ready ] ──> [ Climate Fetching: Spinner + Pulsing Location Pill ]
                 ──> [ Simulation Running: Animated Thermal Pulse on 3D Viewport ]
                 ──> [ Optimization Running: XGBoost Candidate Counter 0..3000 ]
                 ──> [ Physics Verifying: Progress Bar + Delta Calculator ]
                 ──> [ Success / Verified: Green Check Shield + Result Update ]
                 ──> [ Warning / Degradation: Amber Alert Pill (Fallback Climate Used) ]
                 ──> [ Error: Red Alert Banner with RFC 7807 Details ]
```

---

## 13. Motion & Animation Principles

- **Panel Drawer Slide**: `200ms cubic-bezier(0.16, 1, 0.3, 1)`
- **Hover & Selection Highlights**: `150ms ease-out`
- **Numeric Counter Roll**: `300ms ease-in-out` for metric updates
- **3D Camera Interpolation**: Smooth orbit animation (`Tween.js` or `R3F framing`) when selecting views.
- **Reduced Motion**: Respects `prefers-reduced-motion: reduce` by disabling canvas particle streams and instant panel transitions.

---

## 14. Iconography Standards

- **Icon Library**: **Lucide React** (`lucide-react`) exclusively.
- **Rules**:
  - NO emoji icons anywhere in UI buttons, tabs, or telemetry cards.
  - Consistent 1.5px stroke weight matching monospace typography.
  - All icon-only buttons have explicit `aria-label` attributes and tooltip popovers.

---

## 15. Accessibility & Engineering Standards

- **Color Contrast**: All primary text against background panels meets WCAG 2.1 AA ($\ge 4.5:1$ contrast ratio).
- **Keyboard Navigation**: Full `Tab` focus ring support (`outline: 2px solid #0284c7; outline-offset: 2px`).
- **Non-Color Status Indicators**: Risk scores and comfort alerts use icons ($\triangle$, $\checkmark$, $\times$) and textual labels alongside color coding.

---

## 16. PRAHAR Explicit Anti-Patterns

> [!WARNING]
> The following design choices are **EXPLICITY BANNED** in PRAHAR:

1. ❌ **Generic Light SaaS Theme**: White cards with light grey borders (`#f1f5f9`) that look like an admin dashboard.
2. ❌ **Purple / Pink AI Gradients**: Decorative gradient borders or "magic AI" sparkles that cheapen scientific credibility.
3. ❌ **Cyberpunk / Sci-Fi Neon Overload**: Glowing neon grids, scanlines, or distorted HUD text that obscure telemetry numbers.
4. ❌ **Gaming Dashboard HUD**: Excessive angular borders, tactical crosshairs everywhere, or sci-fi sound effects.
5. ❌ **Emoji Icons**: Using emojis (e.g. 🏔️, ❄️, 🔥, ⚡, 🏠) in visual buttons or card titles instead of clean Lucide SVG icons.
6. ❌ **Tiny Unreadable Numbers**: Small grey numbers for critical thermal units or U-values.
7. ❌ **Color-Only Status Indicators**: Relying only on red/green dots without text or icons.
8. ❌ **Fixed Sidebars That Squeeze 3D Viewport**: Non-collapsible sidebars on laptops that compress Three.js canvas under 600px width.
