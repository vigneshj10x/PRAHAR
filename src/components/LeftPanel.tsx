import type { FC } from 'react'
import { Settings2 } from 'lucide-react'
import { useDesignStore } from '../store/designStore'
import type { ShapeType, ThermalMassType } from '../store/designStore'

/* ── Tiny reusable form primitives ───────────────────────────────── */

interface LabelProps { children: React.ReactNode }
const FLabel: FC<LabelProps> = ({ children }) => (
  <span className="form-label">{children}</span>
)

interface SelectProps {
  id:      string
  value:   string
  onChange: (v: string) => void
  options: { value: string; label: string; disabled?: boolean }[]
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

/* ── Helper: compass label for orientation ────────────────────────── */
function compassDir(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
  return dirs[Math.round(deg / 22.5) % 16]
}

/* ── Main panel ───────────────────────────────────────────────────── */
const LeftPanel: FC = () => {
  // ── Read & write from shared Zustand store ──────────────────────
  const location     = useDesignStore(s => s.location)
  const setLocation  = useDesignStore(s => s.setLocation)

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

  const insulation    = useDesignStore(s => s.insulation)
  const setInsulation = useDesignStore(s => s.setInsulation)

  const openingRatio    = useDesignStore(s => s.openingRatio)
  const setOpeningRatio = useDesignStore(s => s.setOpeningRatio)

  const thermalMass    = useDesignStore(s => s.thermalMass)
  const setThermalMass = useDesignStore(s => s.setThermalMass)

  // Derived summary stats
  const floorArea = (length * width).toFixed(1)
  const volume    = (length * width * height * 0.75).toFixed(1)
  const avRatio   = ((2 * (length * height + width * height) + length * width) / (length * width * height * 0.75)).toFixed(2)
  const rVal      = (insulation / 1000 / 0.032).toFixed(2)

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

        {/* ── LOCATION ───────────────────────────────────────────── */}
        <div className="form-section">
          <div className="form-section-title">Location & Climate Zone</div>

          <div className="form-group">
            <FLabel>Site / Climate</FLabel>
            <FSelect
              id="param-location"
              value={location}
              onChange={setLocation}
              options={[
                { value: 'leh',       label: 'Leh, Ladakh (Cold & Arid, 3524m)' },
                { value: 'jaisalmer', label: 'Jaisalmer, RJ (Hot & Dry, 225m)' },
                { value: 'delhi',     label: 'New Delhi, NCR (Composite, 216m)' },
                { value: 'kochi',     label: 'Kochi, Kerala (Warm & Humid, 4m)' },
                { value: 'srinagar',  label: 'Srinagar, Kashmir (Cold & Cloudy, 1585m)' },
              ]}
            />
            <div style={{
              marginTop: 4,
              fontSize: 7.5,
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              lineHeight: 1.3,
              background: 'var(--solar-glow)',
              border: '1px solid var(--border-base)',
              padding: '4px 6px',
              borderRadius: 2,
            }}>
              <span style={{ color: 'var(--solar)', fontWeight: 700 }}>CLIMATE DRIVES DESIGN:</span> Active bioclimatic profile updates ambient conditions, solar potential & 3D daylight environment.
            </div>
          </div>
        </div>

        {/* ── GEOMETRY ───────────────────────────────────────────── */}
        <div className="form-section">
          <div className="form-section-title">Geometry</div>

          <div className="form-group">
            <FLabel>Shape</FLabel>
            <FSelect
              id="param-shape"
              value={shape}
              onChange={v => setShape(v as ShapeType)}
              options={[
                { value: 'rectangular', label: 'Rectangular' },
                { value: 'semidome',    label: 'Semi-dome' },
                { value: 'aframe',      label: 'A-frame' },
              ]}
            />
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
                ({compassDir(orientation)})
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
                { value: 'adobe',    label: 'Adobe / Mud Brick' },
                { value: 'stone',    label: 'Dry Stone Masonry' },
                { value: 'rammed',   label: 'Rammed Earth' },
                { value: 'concrete', label: 'Dense Concrete' },
                { value: 'timber',   label: 'Timber Frame' },
                { value: 'sip',      label: 'SIP Panel' },
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
