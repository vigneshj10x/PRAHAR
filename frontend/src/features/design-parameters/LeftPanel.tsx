import type { FC } from 'react'
import { Settings2 } from 'lucide-react'
import { useDesignStore } from '@/store/designStore'
import type { ShapeType, ThermalMassType } from '@/domain'
import { degreesToCompass } from '@/lib/formatters'
import LocationSearchBox from '@/features/location/LocationSearchBox'

/* ── Tiny reusable form primitives ───────────────────────────────── */

interface LabelProps { children: React.ReactNode }
const FLabel: FC<LabelProps> = ({ children }) => (
  <span className="form-label">{children}</span>
)

interface SelectProps {
  id:       string
  value:    string
  onChange: (v: string) => void
  options:  { value: string; label: string; disabled?: boolean }[]
}
const FSelect: FC<SelectProps> = ({ id, value, onChange, options }) => (
  <div className="form-select-wrap">
    <select
      id={id}
      className="form-select"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {options.map(o => (
        <option key={o.value} value={o.value} disabled={o.disabled} style={o.disabled ? { color: 'var(--text-faint)' } : undefined}>
          {o.label}
        </option>
      ))}
    </select>
  </div>
)

interface NumberProps {
  id:       string
  value:    number
  onChange: (v: number) => void
  min?:     number
  max?:     number
  step?:    number
  unit?:    string
}
const FNumber: FC<NumberProps> = ({ id, value, onChange, min, max, step = 0.1, unit }) => (
  <div style={{ position: 'relative' }}>
    <input
      id={id}
      type="number"
      className="form-input"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={e => onChange(Number(e.target.value))}
      style={{ paddingRight: unit ? 28 : 8 }}
    />
    {unit && (
      <span style={{
        position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)',
        fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)',
        pointerEvents: 'none',
      }}>{unit}</span>
    )}
  </div>
)

interface RangeProps {
  id:       string
  value:    number
  onChange: (v: number) => void
  min:      number
  max:      number
  step?:    number
  format?:  (v: number) => string
}
const FRange: FC<RangeProps> = ({ id, value, onChange, min, max, step = 1, format }) => (
  <div className="form-range-wrap">
    <input
      id={id}
      type="range"
      className="form-range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
    />
    <span className="range-value">
      {format ? format(value) : value}
    </span>
  </div>
)

/* ── Main panel ───────────────────────────────────────────────────── */
export const LeftPanel: FC = () => {
  // ── Read & write from shared Zustand store ──────────────────────
  const shape        = useDesignStore(s => s.shape)
  const setShape     = useDesignStore(s => s.setShape)

  const length       = useDesignStore(s => s.length)
  const setLength    = useDesignStore(s => s.setLength)

  const width        = useDesignStore(s => s.width)
  const setWidth     = useDesignStore(s => s.setWidth)

  const height       = useDesignStore(s => s.height)
  const setHeight    = useDesignStore(s => s.setHeight)

  const orientation  = useDesignStore(s => s.orientation)
  const setOrientation = useDesignStore(s => s.setOrientation)

  const wallMaterial  = useDesignStore(s => s.wallMaterial)
  const setWallMaterial = useDesignStore(s => s.setWallMaterial)

  const roofMaterial  = useDesignStore(s => s.roofMaterial)
  const setRoofMaterial = useDesignStore(s => s.setRoofMaterial)

  const insulation    = useDesignStore(s => s.insulation)
  const setInsulation = useDesignStore(s => s.setInsulation)

  const openingRatio    = useDesignStore(s => s.openingRatio)
  const setOpeningRatio = useDesignStore(s => s.setOpeningRatio)

  const thermalMass    = useDesignStore(s => s.thermalMass)
  const setThermalMass = useDesignStore(s => s.setThermalMass)

  const occupants         = useDesignStore(s => s.occupants)
  const setOccupants      = useDesignStore(s => s.setOccupants)
  const budget            = useDesignStore(s => s.budget)
  const setBudget         = useDesignStore(s => s.setBudget)
  const weightLimit       = useDesignStore(s => s.weightLimit)
  const setWeightLimit    = useDesignStore(s => s.setWeightLimit)
  const minComfortPercent = useDesignStore(s => s.minComfortPercent)
  const setMinComfortPercent = useDesignStore(s => s.setMinComfortPercent)

  // Derived summary stats for all 25 shapes
  const getShapeFactors = (s: ShapeType) => {
    switch (s) {
      case 'semidome': case 'barrel_vault': return { v: 0.65, a: 0.82 }
      case 'aframe': case 'conical_teepee': case 'pyramidal': return { v: 0.50, a: 0.75 }
      case 'geodesic_dome': case 'igloo_catenary': return { v: 0.58, a: 0.68 }
      case 'hexagonal_yurt': case 'octagonal_pod': return { v: 0.72, a: 0.85 }
      case 'monopitch': case 'gable': case 'hip_roof': return { v: 0.75, a: 0.95 }
      case 'mansard': case 'gambrel': return { v: 0.85, a: 1.05 }
      case 'bunker_bermed': return { v: 0.70, a: 0.55 }
      case 'stilt_elevated': return { v: 0.65, a: 1.15 }
      default: return { v: 0.75, a: 1.0 }
    }
  }

  const sFact = getShapeFactors(shape)
  const floorArea = (length * width).toFixed(1)
  const calcVol = Math.max(1, length * width * height * sFact.v)
  const calcEnv = Math.max(1, (2 * (length * height + width * height) + length * width) * sFact.a)
  const volume = calcVol.toFixed(1)
  const avRatio = (calcEnv / calcVol).toFixed(2)
  const rVal = (insulation / 1000 / 0.032).toFixed(2)

  const SHAPE_CATEGORIES = [
    {
      name: '1. Standard & Prismatic',
      shapes: [
        { value: 'rectangular', label: 'Rectangular Box (Flat/Low Slope)', badge: 'Balanced' },
        { value: 'monopitch', label: 'Single-Slope Solar Shed', badge: 'Solar Max' },
        { value: 'gable', label: 'Pitched Gable Roof', badge: 'Rain & Snow' },
        { value: 'hip_roof', label: '4-Slope Pyramidal Hip', badge: '4-Way Wind' },
        { value: 'mansard', label: 'Mansard Curb Roof', badge: 'Max Clearance' },
        { value: 'gambrel', label: 'Gambrel Arch Barn', badge: 'Loft Volume' },
      ],
    },
    {
      name: '2. Curved & Vaulted',
      shapes: [
        { value: 'semidome', label: 'Semi-Cylinder Quonset Vault', badge: 'Low S/V' },
        { value: 'quonset_extended', label: 'Extended Quonset Vault', badge: 'High Arch' },
        { value: 'barrel_vault', label: 'Gothic Barrel Vault', badge: 'Structural Arch' },
        { value: 'hyperbolic_paraboloid', label: 'Saddle Hypar Paraboloid', badge: 'Tensile Flow' },
        { value: 'torus_inflatable', label: 'Pressurized Toroidal Pod', badge: 'Extreme Altitude' },
      ],
    },
    {
      name: '3. Domes & Geodesics',
      shapes: [
        { value: 'geodesic_dome', label: '3V Geodesic Dome', badge: 'Min Thermal Loss' },
        { value: 'igloo_catenary', label: 'Catenary Igloo Dome', badge: 'Hyper-Insulated' },
        { value: 'pyramidal', label: '4-Sided High-Snow Pyramid', badge: 'Snow Shedding' },
        { value: 'conical_teepee', label: 'Conical Alpine Bivouac', badge: 'Steep Pitch' },
      ],
    },
    {
      name: '4. Polygonal & High-Wind',
      shapes: [
        { value: 'aframe', label: 'Steep A-Frame Prism', badge: 'Avalanche Shed' },
        { value: 'hexagonal_yurt', label: 'Hexagonal Nomadic Yurt', badge: 'Radial Wind' },
        { value: 'octagonal_pod', label: 'Octagonal Defense Bunker', badge: 'Wind Buffer' },
        { value: 'diamond_faceted', label: 'Faceted Diamond Stealth Pod', badge: 'Deflection' },
        { value: 'wedge_supersonic', label: 'Supersonic Windward Wedge', badge: 'Wind Scoured' },
      ],
    },
    {
      name: '5. Specialized & Adaptive',
      shapes: [
        { value: 'bifacial_shed', label: 'Bifacial Dual-Slope Collector', badge: 'Solar Thermal+' },
        { value: 'stilt_elevated', label: 'Elevated Stilt Tropical Pod', badge: 'Flood Defense' },
        { value: 'bunker_bermed', label: 'Earth-Bermed Thermal Bunker', badge: 'Earth Coupling' },
        { value: 'modular_hex_cluster', label: 'Modular Hexagonal Cluster', badge: 'Scalable' },
        { value: 'origami_accordion', label: 'Pleated Origami Deployable', badge: 'Rapid Deploy' },
      ],
    },
  ]

  return (
    <aside className="panel-left" id="panel-left" aria-label="Design Parameters">

      {/* Panel header */}
      <div className="panel-header">
        <span className="section-header" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Settings2 size={9} strokeWidth={2} />
          Design Parameters
        </span>
        <span className="label-mono" style={{ fontSize: 9, color: 'var(--text-muted)' }}>v0.2</span>
      </div>

      {/* Scrollable form body */}
      <div className="panel-body">

        {/* ── LOCATION & CLIMATE ZONE (REAL METEOROLOGICAL INTEGRATION) ── */}
        <div className="form-section">
          <div className="form-section-title">Location & Real Climate Flow</div>
          <LocationSearchBox />
        </div>

        {/* ── GEOMETRY ───────────────────────────────────────────── */}
        <div className="form-section">
          <div className="form-section-title">Geometry</div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <FLabel>Shelter Geometry (25 Shapes)</FLabel>
              <span
                style={{
                  fontSize: 7.5,
                  fontFamily: 'var(--font-mono)',
                  padding: '1px 5px',
                  borderRadius: 2,
                  background: 'rgba(217, 119, 6, 0.15)',
                  color: 'var(--solar)',
                  border: '1px solid rgba(217, 119, 6, 0.3)',
                }}
              >
                S/V: {avRatio} m⁻¹
              </span>
            </div>
            <div className="form-select-wrap">
              <select
                id="param-shape"
                className="form-select"
                value={shape}
                onChange={e => setShape(e.target.value as ShapeType)}
                style={{ fontSize: 10 }}
              >
                {SHAPE_CATEGORIES.map(cat => (
                  <optgroup key={cat.name} label={cat.name} style={{ background: '#0f172a', color: '#fbbf24', fontWeight: 700 }}>
                    {cat.shapes.map(s => (
                      <option key={s.value} value={s.value} style={{ background: '#1e293b', color: '#f8fafc', fontWeight: 400 }}>
                        {s.label} [{s.badge}]
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <FLabel>Length</FLabel>
              <FNumber id="param-length" value={length} onChange={setLength}
                min={2} max={20} step={0.5} unit="m" />
            </div>
            <div className="form-group">
              <FLabel>Width</FLabel>
              <FNumber id="param-width" value={width} onChange={setWidth}
                min={2} max={20} step={0.5} unit="m" />
            </div>
          </div>

          <div className="form-group">
            <FLabel>Ridge Height</FLabel>
            <FNumber id="param-height" value={height} onChange={setHeight}
              min={1.5} max={6} step={0.1} unit="m" />
          </div>

          <div className="form-group">
            <FLabel>
              Orientation&nbsp;
              <span style={{ color: 'var(--solar)', fontSize: 8 }}>
                ({degreesToCompass(orientation)})
              </span>
            </FLabel>
            <FRange
              id="param-orientation"
              value={orientation}
              onChange={setOrientation}
              min={0}
              max={360}
              step={5}
              format={v => `${v}°`}
            />
          </div>
        </div>

        {/* ── OPTIMIZATION CRITERIA (PARETO REQUIREMENTS) ────────── */}
        <div className="form-section">
          <div className="form-section-title">Deployment Criteria</div>

          <div className="form-row">
            <div className="form-group">
              <FLabel>Occupants</FLabel>
              <FNumber id="req-occupants" value={occupants} onChange={setOccupants}
                min={1} max={50} step={1} unit="prs" />
            </div>
            <div className="form-group">
              <FLabel>Min Comfort</FLabel>
              <FNumber id="req-comfort" value={minComfortPercent} onChange={setMinComfortPercent}
                min={0} max={100} step={5} unit="%" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <FLabel>Budget Ceiling</FLabel>
              <FNumber id="req-budget" value={budget} onChange={setBudget}
                min={20000} max={1000000} step={5000} unit="₹" />
            </div>
            <div className="form-group">
              <FLabel>Weight Limit</FLabel>
              <FNumber id="req-weight" value={weightLimit} onChange={setWeightLimit}
                min={500} max={30000} step={250} unit="kg" />
            </div>
          </div>
        </div>

        {/* ── ENVELOPE ───────────────────────────────────────────── */}
        <div className="form-section">
          <div className="form-section-title">Envelope</div>

          <div className="form-group">
            <FLabel>Wall Material</FLabel>
            <FSelect
              id="param-wallmat"
              value={wallMaterial}
              onChange={setWallMaterial}
              options={[
                { value: 'adobe',              label: 'Adobe / Mud Brick' },
                { value: 'stone',              label: 'Dry Stone Masonry' },
                { value: 'concrete',           label: 'Dense Concrete' },
                { value: 'aac_block',          label: 'AAC Block' },
                { value: 'composite',          label: 'Stabilized Bio-Composite' },
                { value: 'insulated_panel',    label: 'PUF Insulated Panel' },
                { value: 'pcm_enhanced_panel', label: 'PCM-Enhanced Wall Panel' },
              ]}
            />
          </div>

          <div className="form-group">
            <FLabel>Roof Material</FLabel>
            <FSelect
              id="param-roofmat"
              value={roofMaterial}
              onChange={setRoofMaterial}
              options={[
                { value: 'timber_insulated_roof', label: 'Timber Insulated Roof' },
                { value: 'insulated_panel',       label: 'PUF Sandwich Panel' },
                { value: 'composite',             label: 'Stabilized Bio-Composite' },
              ]}
            />
          </div>

          <div className="form-group">
            <FLabel>Insulation Thickness</FLabel>
            <FSelect
              id="param-insulation"
              value={String(insulation)}
              onChange={v => setInsulation(Number(v))}
              options={[
                { value: '25',  label: '25 mm  — minimal' },
                { value: '50',  label: '50 mm  — standard' },
                { value: '100', label: '100 mm — enhanced' },
                { value: '150', label: '150 mm — high-performance' },
              ]}
            />
          </div>

          <div className="form-group">
            <FLabel>Opening Ratio (glazing + doors)</FLabel>
            <FSelect
              id="param-opening"
              value={String(openingRatio)}
              onChange={v => setOpeningRatio(Number(v))}
              options={[
                { value: '5',  label:  '5%  — fortress (very low)' },
                { value: '10', label: '10%  — low' },
                { value: '14', label: '14%  — moderate (default)' },
                { value: '20', label: '20%  — high (solar-passive)' },
              ]}
            />
          </div>
        </div>

        {/* ── THERMAL MASS ───────────────────────────────────────── */}
        <div className="form-section">
          <div className="form-section-title">Thermal Properties</div>

          <div className="form-group">
            <FLabel>Thermal Mass</FLabel>
            <FSelect
              id="param-thermalmass"
              value={thermalMass}
              onChange={v => setThermalMass(v as ThermalMassType)}
              options={[
                { value: 'low',    label: 'Low    — lightweight / timber' },
                { value: 'medium', label: 'Medium — brick / concrete block' },
                { value: 'high',   label: 'High   — stone / rammed earth' },
              ]}
            />
          </div>

          {/* ── Live-computed summary stats ── */}
          <div style={{
            marginTop: 8,
            background: 'var(--bg-base)',
            border: '1px solid var(--border-dim)',
            borderRadius: 2,
            padding: '7px 9px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '5px 12px',
          }}>
            {[
              { k: 'Floor Area', v: `${floorArea} m²` },
              { k: 'Volume',     v: `${volume} m³` },
              { k: 'A/V Ratio',  v: avRatio },
              { k: 'Ins. R-val', v: `${rVal} m²K/W` },
            ].map(({ k, v }) => (
              <div key={k}>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 7.5,
                  color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase',
                }}>{k}</div>
                <div style={{
                  fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)',
                }}>{v}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </aside>
  )
}

export default LeftPanel
