import { useState, useEffect, type FC, type ReactNode } from 'react'
import {
  Settings2,
  MapPin,
  Box,
  Ruler,
  Layers,
  Activity,
  ShieldCheck,
  ArrowRight,
  Sliders,
  Sparkles,
} from 'lucide-react'
import { useDesignStore } from '@/store/designStore'
import { useResultsStore } from '@/store/resultsStore'
import { useUIModalStore } from '@/store/uiModalStore'
import type { ShapeType, ThermalMassType } from '@/domain'
import { degreesToCompass } from '@/lib/formatters'
import LocationSearchBox from '@/features/location/LocationSearchBox'
import { AccordionSectionHeader } from './AccordionSection'
import { CompassWidget } from './CompassWidget'
import { GeometrySelector, SHAPE_CATEGORIES } from './GeometrySelector'

/* ── Form Control Primitives ───────────────────────────────────────── */

interface FLabelProps {
  htmlFor?: string
  children: ReactNode
  unit?: string
}
const FLabel: FC<FLabelProps> = ({ htmlFor, children, unit }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
    <label htmlFor={htmlFor} className="form-label">
      {children}
    </label>
    {unit && (
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 7.5,
          color: 'var(--solar)',
          letterSpacing: '0.05em',
        }}
      >
        {unit}
      </span>
    )}
  </div>
)

interface FNumberProps {
  id: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  unit?: string
}
const FNumber: FC<FNumberProps> = ({ id, value, onChange, min, max, step = 0.1, unit }) => (
  <div style={{ position: 'relative' }}>
    <input
      id={id}
      type="number"
      className="form-input"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        width: '100%',
        background: 'var(--bg-input)',
        border: '1px solid var(--border-base)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        fontWeight: 600,
        borderRadius: 2,
        padding: '4px 6px',
        paddingRight: unit ? 30 : 8,
        outline: 'none',
        transition: 'border-color 150ms',
      }}
    />
    {unit && (
      <span
        style={{
          position: 'absolute',
          right: 7,
          top: '50%',
          transform: 'translateY(-50%)',
          fontFamily: 'var(--font-mono)',
          fontSize: 8.5,
          color: 'var(--text-muted)',
          pointerEvents: 'none',
        }}
      >
        {unit}
      </span>
    )}
  </div>
)

interface FSelectProps {
  id: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; disabled?: boolean }[]
}
const FSelect: FC<FSelectProps> = ({ id, value, onChange, options }) => (
  <div className="form-select-wrap">
    <select
      id={id}
      className="form-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        background: 'var(--bg-input)',
        border: '1px solid var(--border-base)',
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-ui)',
        fontSize: 9.5,
        borderRadius: 2,
        padding: '4px 6px',
        outline: 'none',
      }}
    >
      {options.map((o) => (
        <option
          key={o.value}
          value={o.value}
          disabled={o.disabled}
          style={{ background: '#0d121c', color: o.disabled ? 'var(--text-faint)' : '#f8fafc' }}
        >
          {o.label}
        </option>
      ))}
    </select>
  </div>
)

/* ── Main LeftPanel Engineering Console ────────────────────────────── */

export const LeftPanel: FC = () => {
  // Zustand Store Integration
  const shape = useDesignStore((s) => s.shape)
  const setShape = useDesignStore((s) => s.setShape)

  const length = useDesignStore((s) => s.length)
  const setLength = useDesignStore((s) => s.setLength)

  const width = useDesignStore((s) => s.width)
  const setWidth = useDesignStore((s) => s.setWidth)

  const height = useDesignStore((s) => s.height)
  const setHeight = useDesignStore((s) => s.setHeight)

  const orientation = useDesignStore((s) => s.orientation)
  const setOrientation = useDesignStore((s) => s.setOrientation)

  const wallMaterial = useDesignStore((s) => s.wallMaterial)
  const setWallMaterial = useDesignStore((s) => s.setWallMaterial)

  const roofMaterial = useDesignStore((s) => s.roofMaterial)
  const setRoofMaterial = useDesignStore((s) => s.setRoofMaterial)

  const insulation = useDesignStore((s) => s.insulation)
  const setInsulation = useDesignStore((s) => s.setInsulation)

  const openingRatio = useDesignStore((s) => s.openingRatio)
  const setOpeningRatio = useDesignStore((s) => s.setOpeningRatio)

  const thermalMass = useDesignStore((s) => s.thermalMass)
  const setThermalMass = useDesignStore((s) => s.setThermalMass)

  const occupants = useDesignStore((s) => s.occupants)
  const setOccupants = useDesignStore((s) => s.setOccupants)
  const budget = useDesignStore((s) => s.budget)
  const setBudget = useDesignStore((s) => s.setBudget)
  const weightLimit = useDesignStore((s) => s.weightLimit)
  const setWeightLimit = useDesignStore((s) => s.setWeightLimit)
  const minComfortPercent = useDesignStore((s) => s.minComfortPercent)
  const setMinComfortPercent = useDesignStore((s) => s.setMinComfortPercent)

  const status = useResultsStore((s) => s.status)
  const lastSimulatedParams = useResultsStore((s) => s.lastSimulatedParams)
  const verifiedAgainstSurrogate = useResultsStore((s) => s.verifiedAgainstSurrogate)
  const openReport = useUIModalStore((s) => s.openReport)
  const setActiveModal = useUIModalStore((s) => s.setActiveModal)
  const candidatesEvaluated = useUIModalStore((s) => s.optimize.candidatesEvaluated)

  // Accordion Progressive Disclosure Default State: ONLY SITE = OPEN (true), all others CLOSED (false)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    site: true,
    geometry: false,
    dimensions: false,
    criteria: false,
    envelope: false,
    derived: false,
  })

  // Expert Mode toggle: allows expanding all controls when requested by advanced engineers
  const [isExpertMode, setIsExpertMode] = useState(false)

  const toggleExpertMode = () => {
    const nextMode = !isExpertMode
    setIsExpertMode(nextMode)
    if (nextMode) {
      setOpenSections({
        site: true,
        geometry: true,
        dimensions: true,
        criteria: true,
        envelope: true,
        derived: true,
      })
    } else {
      setOpenSections({
        site: true,
        geometry: false,
        dimensions: false,
        criteria: false,
        envelope: false,
        derived: false,
      })
    }
  }

  // Handle guided workflow strip navigation events
  useEffect(() => {
    const handleWorkflowNav = (e: Event) => {
      const customEvent = e as CustomEvent<{ stage: string }>
      const stage = customEvent.detail?.stage
      if (stage === 'site') {
        setOpenSections({ site: true, geometry: false, dimensions: false, criteria: false, envelope: false, derived: false })
      } else if (stage === 'design') {
        setOpenSections({ site: false, geometry: true, dimensions: true, criteria: false, envelope: true, derived: false })
      } else if (stage === 'simulate') {
        setOpenSections({ site: false, geometry: true, dimensions: true, criteria: false, envelope: true, derived: true })
      } else if (stage === 'optimize') {
        setOpenSections({ site: false, geometry: false, dimensions: false, criteria: true, envelope: false, derived: false })
      }
    }
    window.addEventListener('prahar:workflow-navigate', handleWorkflowNav)
    return () => window.removeEventListener('prahar:workflow-navigate', handleWorkflowNav)
  }, [])

  const toggleSection = (key: string) => {
    setOpenSections((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      const allOpen = Object.values(next).every(Boolean)
      if (!allOpen && isExpertMode) {
        setIsExpertMode(false)
      }
      return next
    })
  }

  // Stale parameter check
  const isStale = status === 'ready' && !!lastSimulatedParams && (
    shape !== lastSimulatedParams.shape ||
    length !== lastSimulatedParams.length ||
    width !== lastSimulatedParams.width ||
    height !== lastSimulatedParams.height ||
    orientation !== lastSimulatedParams.orientation ||
    wallMaterial !== lastSimulatedParams.wallMaterial ||
    roofMaterial !== lastSimulatedParams.roofMaterial ||
    insulation !== lastSimulatedParams.insulation ||
    openingRatio !== lastSimulatedParams.openingRatio ||
    thermalMass !== lastSimulatedParams.thermalMass
  )

  // Derived Next Action Guidance
  let nextActionTitle = 'Analyze Site Location'
  let nextActionSubtitle = 'Select Himalayan site microclimate & elevation'
  let nextActionCta = 'ANALYZE LOCATION'
  let onNextActionClick = () => {
    setOpenSections((prev) => ({ ...prev, site: true }))
  }

  if (isStale) {
    nextActionTitle = 'Design Modified — Re-Simulate'
    nextActionSubtitle = 'Design parameters changed since last simulation run'
    nextActionCta = 'RUN SIMULATION'
    onNextActionClick = () => {
      const btn = document.getElementById('btn-simulate')
      if (btn) btn.click()
    }
  } else if (verifiedAgainstSurrogate) {
    nextActionTitle = 'Physics Verified — Report Ready'
    nextActionSubtitle = 'Transient ISO 13790 physics verification passed'
    nextActionCta = 'GENERATE REPORT'
    onNextActionClick = () => {
      openReport()
    }
  } else if (candidatesEvaluated > 0) {
    nextActionTitle = 'Candidate Selected — Verify'
    nextActionSubtitle = 'Run ISO 13790 / 6946 high-fidelity verification'
    nextActionCta = 'VERIFY WITH PHYSICS'
    onNextActionClick = () => {
      setActiveModal('optimize')
    }
  } else if (status === 'ready') {
    nextActionTitle = 'Simulation Complete — Auto-Optimize'
    nextActionSubtitle = 'Run ML surrogate Pareto multi-objective search'
    nextActionCta = 'EXPLORE OPTIMIZATION'
    onNextActionClick = () => {
      setActiveModal('optimize')
    }
  } else if (openSections.site && !openSections.geometry) {
    nextActionTitle = 'Configure Shelter Design'
    nextActionSubtitle = 'Select geometry, dimensions, orientation & envelope'
    nextActionCta = 'CONFIGURE SHELTER'
    onNextActionClick = () => {
      setOpenSections({ site: false, geometry: true, dimensions: true, criteria: false, envelope: true, derived: false })
    }
  }

  // Derived Engineering Physics Calculations
  const getShapeFactors = (s: ShapeType) => {
    switch (s) {
      case 'semidome':
      case 'barrel_vault':
        return { v: 0.65, a: 0.82 }
      case 'aframe':
      case 'conical_teepee':
      case 'pyramidal':
        return { v: 0.5, a: 0.75 }
      case 'geodesic_dome':
      case 'igloo_catenary':
        return { v: 0.58, a: 0.68 }
      case 'hexagonal_yurt':
      case 'octagonal_pod':
        return { v: 0.72, a: 0.85 }
      case 'monopitch':
      case 'gable':
      case 'hip_roof':
        return { v: 0.75, a: 0.95 }
      case 'mansard':
      case 'gambrel':
        return { v: 0.85, a: 1.05 }
      case 'bunker_bermed':
        return { v: 0.7, a: 0.55 }
      case 'stilt_elevated':
        return { v: 0.65, a: 1.15 }
      default:
        return { v: 0.75, a: 1.0 }
    }
  }

  const sFact = getShapeFactors(shape)
  const floorArea = (length * width).toFixed(1)
  const calcVol = Math.max(1, length * width * height * sFact.v)
  const calcEnv = Math.max(1, (2 * (length * height + width * height) + length * width) * sFact.a)
  const volume = calcVol.toFixed(1)
  const avRatio = (calcEnv / calcVol).toFixed(2)
  const rVal = (insulation / 1000 / 0.032).toFixed(2)

  const allShapes = SHAPE_CATEGORIES.flatMap((c) => c.shapes)
  const currentShapeObj = allShapes.find((s) => s.value === shape)

  return (
    <aside className="panel-left" id="panel-left" aria-label="Design Parameters">
      {/* ── Console Header Strip ── */}
      <div
        className="panel-header"
        style={{
          padding: '8px 10px',
          background: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border-base)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span className="section-header" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Settings2 size={11} strokeWidth={2} color="var(--solar)" />
          <span>Engineering Console</span>
        </span>
        <button
          id="btn-expert-mode"
          onClick={toggleExpertMode}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 7.5,
            fontWeight: 700,
            letterSpacing: '0.06em',
            padding: '2px 6px',
            borderRadius: 2,
            background: isExpertMode ? 'rgba(217, 119, 6, 0.16)' : 'var(--bg-surface)',
            color: isExpertMode ? 'var(--solar)' : 'var(--text-muted)',
            border: `1px solid ${isExpertMode ? 'var(--solar)' : 'var(--border-dim)'}`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
          title={isExpertMode ? 'Switch to Guided Progressive Disclosure mode' : 'Expand all engineering accordions for Expert Mode'}
        >
          <Sliders size={9} />
          {isExpertMode ? 'EXPERT (ALL OPEN)' : 'ADVANCED CONTROLS'}
        </button>
      </div>

      {/* ── Scrollable Console Body ── */}
      <div className="panel-body" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* ── Contextual Next Action Banner ── */}
        <div
          id="contextual-next-action"
          style={{
            margin: 8,
            padding: '8px 10px',
            background: isStale ? 'rgba(217, 119, 6, 0.12)' : 'rgba(2, 132, 199, 0.08)',
            border: `1px solid ${isStale ? 'var(--solar)' : 'var(--border-bright)'}`,
            borderRadius: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 7.5,
                fontWeight: 700,
                color: isStale ? 'var(--solar)' : 'var(--cool)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Sparkles size={9} />
              {isStale ? 'ATTENTION REQUIRED' : 'GUIDED WORKFLOW'}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)' }}>
              NEXT ACTION
            </span>
          </div>

          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10.5,
              fontWeight: 700,
              color: 'var(--text-primary)',
            }}
          >
            {nextActionTitle}
          </div>

          <div style={{ fontSize: 8.5, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', lineHeight: 1.2 }}>
            {nextActionSubtitle}
          </div>

          <button
            onClick={onNextActionClick}
            className="action-btn primary"
            style={{
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '5px 10px',
              background: isStale ? 'var(--solar)' : 'var(--cool)',
              color: '#ffffff',
              border: 'none',
              borderRadius: 3,
              fontSize: 9.5,
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0,0,0,0.25)',
              transition: 'all 0.15s ease',
            }}
          >
            <span>{nextActionCta}</span>
            <ArrowRight size={10} />
          </button>
        </div>

        {/* ── 1. SITE & METEOROLOGICAL LOCATION (Task-First Step 01) ── */}
        <AccordionSectionHeader
          id="sec-site"
          title="STEP 01 — SELECT DEPLOYMENT SITE"
          subtitle="Search location or pick suggested Himalayan preset"
          icon={<MapPin size={11} />}
          isOpen={openSections.site}
          onToggle={() => toggleSection('site')}
          badge="STEP 1"
        />
        {openSections.site && (
          <div style={{ padding: 10, background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-dim)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <LocationSearchBox />

            {/* Step 01 Summary Badge Row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 6,
                padding: '6px 8px',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-dim)',
                borderRadius: 3,
              }}
            >
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  CLIMATE PROFILE
                </div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9.5, fontWeight: 700, color: 'var(--cool)', marginTop: 1 }}>
                  Cold & Arid Sub-Zero
                </div>
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  HAZARD ASSESSMENT
                </div>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 9.5, fontWeight: 700, color: 'var(--warn)', marginTop: 1 }}>
                  Profile Available
                </div>
              </div>
            </div>

            {/* Dominant Step 1 Action Button */}
            <button
              id="btn-continue-design"
              onClick={() => setOpenSections({ site: false, geometry: true, dimensions: true, criteria: false, envelope: true, derived: false })}
              className="action-btn primary"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                width: '100%',
                padding: '7px 12px',
                background: 'var(--solar)',
                color: '#000000',
                border: 'none',
                borderRadius: 3,
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(217, 119, 6, 0.35)',
              }}
            >
              <span>CONTINUE TO SHELTER DESIGN</span>
              <ArrowRight size={11} />
            </button>
          </div>
        )}

        {/* ── 2. SHELTER GEOMETRY SELECTOR ── */}
        <AccordionSectionHeader
          id="sec-geometry"
          title="STEP 02 — SHELTER GEOMETRY"
          subtitle="25 aerodynamic & structural archetypes"
          icon={<Box size={11} />}
          isOpen={openSections.geometry}
          onToggle={() => toggleSection('geometry')}
          badge={currentShapeObj?.badge}
        />
        {openSections.geometry && (
          <div style={{ padding: 10, background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-dim)' }}>
            <GeometrySelector shape={shape} onChange={setShape} />
          </div>
        )}

        {/* ── 3. DIMENSIONS & ORIENTATION ── */}
        <AccordionSectionHeader
          id="sec-dimensions"
          title="STEP 02 — DIMENSIONS & ORIENTATION"
          subtitle={`${length}×${width}×${height}m · ${orientation}° ${degreesToCompass(orientation)}`}
          icon={<Ruler size={11} />}
          isOpen={openSections.dimensions}
          onToggle={() => toggleSection('dimensions')}
        />
        {openSections.dimensions && (
          <div style={{ padding: 10, background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-dim)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Length & Width */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <FLabel htmlFor="param-length" unit="2.0–20.0m">Length</FLabel>
                <FNumber id="param-length" value={length} onChange={setLength} min={2} max={20} step={0.5} unit="m" />
              </div>
              <div>
                <FLabel htmlFor="param-width" unit="2.0–20.0m">Width</FLabel>
                <FNumber id="param-width" value={width} onChange={setWidth} min={2} max={20} step={0.5} unit="m" />
              </div>
            </div>

            {/* Height */}
            <div>
              <FLabel htmlFor="param-height" unit="1.5–6.0m">Ridge Height</FLabel>
              <FNumber id="param-height" value={height} onChange={setHeight} min={1.5} max={6} step={0.1} unit="m" />
            </div>

            {/* Orientation Widget */}
            <div>
              <FLabel unit="0–360°">Solar Orientation</FLabel>
              <CompassWidget degrees={orientation} onChange={setOrientation} />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.2 }}>
                180° South orientation maximizes passive solar irradiance gain in high-altitude sub-zero climates.
              </div>
            </div>
          </div>
        )}

        {/* ── 4. DEPLOYMENT CRITERIA ── */}
        <AccordionSectionHeader
          id="sec-criteria"
          title="4. Deployment Criteria"
          subtitle={`${occupants} persons · Budget ₹${budget.toLocaleString()}`}
          icon={<ShieldCheck size={11} />}
          isOpen={openSections.criteria}
          onToggle={() => toggleSection('criteria')}
        />
        {openSections.criteria && (
          <div style={{ padding: 10, background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-dim)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <FLabel htmlFor="req-occupants">Occupants</FLabel>
                <FNumber id="req-occupants" value={occupants} onChange={setOccupants} min={1} max={50} step={1} unit="prs" />
              </div>
              <div>
                <FLabel htmlFor="req-comfort">Min Comfort</FLabel>
                <FNumber id="req-comfort" value={minComfortPercent} onChange={setMinComfortPercent} min={0} max={100} step={5} unit="%" />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <FLabel htmlFor="req-budget">Budget Ceiling</FLabel>
                <FNumber id="req-budget" value={budget} onChange={setBudget} min={20000} max={1000000} step={5000} unit="₹" />
              </div>
              <div>
                <FLabel htmlFor="req-weight">Weight Limit</FLabel>
                <FNumber id="req-weight" value={weightLimit} onChange={setWeightLimit} min={500} max={30000} step={250} unit="kg" />
              </div>
            </div>
          </div>
        )}

        {/* ── 5. ENVELOPE & MATERIALS ── */}
        <AccordionSectionHeader
          id="sec-envelope"
          title="5. Envelope & Materials"
          subtitle={`Walls: ${wallMaterial.replace('_', ' ')} · Roof: ${roofMaterial.replace('_', ' ')}`}
          icon={<Layers size={11} />}
          isOpen={openSections.envelope}
          onToggle={() => toggleSection('envelope')}
        />
        {openSections.envelope && (
          <div style={{ padding: 10, background: 'var(--bg-panel)', borderBottom: '1px solid var(--border-dim)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div>
              <FLabel htmlFor="param-wallmat">Wall Material</FLabel>
              <FSelect
                id="param-wallmat"
                value={wallMaterial}
                onChange={setWallMaterial}
                options={[
                  { value: 'adobe', label: 'Adobe / Mud Brick' },
                  { value: 'stone', label: 'Dry Stone Masonry' },
                  { value: 'concrete', label: 'Dense Concrete' },
                  { value: 'aac_block', label: 'AAC Block' },
                  { value: 'composite', label: 'Stabilized Bio-Composite' },
                  { value: 'insulated_panel', label: 'PUF Insulated Panel' },
                  { value: 'pcm_enhanced_panel', label: 'PCM-Enhanced Wall Panel' },
                ]}
              />
            </div>

            <div>
              <FLabel htmlFor="param-roofmat">Roof Material</FLabel>
              <FSelect
                id="param-roofmat"
                value={roofMaterial}
                onChange={setRoofMaterial}
                options={[
                  { value: 'timber_insulated_roof', label: 'Timber Insulated Roof' },
                  { value: 'insulated_panel', label: 'PUF Sandwich Panel' },
                  { value: 'composite', label: 'Stabilized Bio-Composite' },
                ]}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <FLabel htmlFor="param-insulation">Insulation</FLabel>
                <FSelect
                  id="param-insulation"
                  value={String(insulation)}
                  onChange={(v) => setInsulation(Number(v))}
                  options={[
                    { value: '25', label: '25 mm' },
                    { value: '50', label: '50 mm' },
                    { value: '100', label: '100 mm' },
                    { value: '150', label: '150 mm' },
                  ]}
                />
              </div>

              <div>
                <FLabel htmlFor="param-opening">Opening Ratio</FLabel>
                <FSelect
                  id="param-opening"
                  value={String(openingRatio)}
                  onChange={(v) => setOpeningRatio(Number(v))}
                  options={[
                    { value: '5', label: '5% (Fortress)' },
                    { value: '10', label: '10% (Low)' },
                    { value: '14', label: '14% (Std)' },
                    { value: '20', label: '20% (High)' },
                  ]}
                />
              </div>
            </div>

            <div>
              <FLabel htmlFor="param-thermalmass">Thermal Mass</FLabel>
              <FSelect
                id="param-thermalmass"
                value={thermalMass}
                onChange={(v) => setThermalMass(v as ThermalMassType)}
                options={[
                  { value: 'low', label: 'Low — Lightweight / Timber' },
                  { value: 'medium', label: 'Medium — Brick / AAC' },
                  { value: 'high', label: 'High — Stone / Rammed Earth' },
                ]}
              />
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.2 }}>
                Buffers rapid outdoor ambient temperature fluctuations via volumetric thermal capacitance.
              </div>
            </div>
          </div>
        )}

        {/* ── 6. DERIVED ENGINEERING METRICS ── */}
        <AccordionSectionHeader
          id="sec-derived"
          title="6. Derived Engineering Telemetry"
          subtitle={`Floor ${floorArea}m² · S/V ${avRatio}m⁻¹ · R ${rVal}`}
          icon={<Activity size={11} />}
          isOpen={openSections.derived}
          onToggle={() => toggleSection('derived')}
        />
        {openSections.derived && (
          <div
            style={{
              padding: 10,
              background: 'var(--bg-base)',
              borderBottom: '1px solid var(--border-dim)',
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px 12px',
            }}
          >
            {[
              { label: 'FLOOR AREA', val: `${floorArea} m²` },
              { label: 'CALC VOLUME', val: `${volume} m³` },
              { label: 'S/V RATIO', val: `${avRatio} m⁻¹` },
              { label: 'INS. R-VALUE', val: `${rVal} m²K/W` },
            ].map(({ label, val }) => (
              <div key={label} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: 2, padding: '5px 7px' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {label}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', marginTop: 1 }}>
                  {val}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}

export default LeftPanel
