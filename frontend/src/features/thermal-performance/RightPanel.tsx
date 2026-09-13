import { useEffect, useRef, useState, type FC, type ReactNode } from 'react'
import {
  Thermometer,
  Sun,
  Wind,
  TrendingDown,
  Clock,
  Flame,
  Activity,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Cpu,
  Layers,
} from 'lucide-react'
import { useResultsStore } from '@/store/resultsStore'
import { useDesignStore } from '@/store/designStore'
import { useClimateStore } from '@/store/climateStore'
import { getLocationProfile } from '@/data/locations'
import { formatSigned } from '@/lib/formatters'
import { ThermalTrendChart } from './ThermalTrendChart'
import { RiskAssessmentCard } from '@/features/risk-assessment/RiskAssessmentCard'

/* ── Animated Number Transition Component ───────────────────────────── */

interface AnimatedNumberProps {
  value: string
  runCount: number
}

const AnimatedNumber: FC<AnimatedNumberProps> = ({ value, runCount }) => {
  const [displayed, setDisplayed] = useState(value)
  const [phase, setPhase] = useState<'stable' | 'out' | 'in'>('stable')
  const prevRef = useRef({ value, runCount })

  useEffect(() => {
    const prev = prevRef.current
    if (prev.value === value && prev.runCount === runCount) return

    prevRef.current = { value, runCount }

    setPhase('out')
    const t1 = setTimeout(() => {
      setDisplayed(value)
      setPhase('in')
      const t2 = setTimeout(() => setPhase('stable'), 160)
      return () => clearTimeout(t2)
    }, 150)

    return () => clearTimeout(t1)
  }, [value, runCount])

  return (
    <span
      style={{
        display: 'inline-block',
        opacity: phase === 'out' ? 0 : 1,
        transform: phase === 'out' ? 'translateY(3px)' : phase === 'in' ? 'translateY(-2px)' : 'translateY(0)',
        transition: phase === 'stable' ? 'none' : 'opacity 150ms ease, transform 150ms ease',
      }}
    >
      {displayed}
    </span>
  )
}

/* ── Metric Card Primitive ─────────────────────────────────────────── */

interface MetricCardProps {
  id: string
  label: string
  rawValue: number
  format: (v: number) => string
  unit: string
  sub: string
  variant: 'solar' | 'cool' | 'ok' | 'warn' | 'neutral'
  icon: ReactNode
  idle: boolean
  estimated: boolean
  runCount: number
}

const VARIANT_COLORS: Record<string, string> = {
  solar: 'var(--solar)',
  cool: 'var(--cool)',
  ok: 'var(--ok)',
  warn: 'var(--warn)',
  neutral: 'var(--text-primary)',
}

const MetricCard: FC<MetricCardProps> = ({
  id,
  label,
  rawValue,
  format,
  unit,
  sub,
  variant,
  icon,
  idle,
  estimated,
  runCount,
}) => {
  const color = VARIANT_COLORS[variant]
  const formattedV = format(rawValue)

  return (
    <div
      className={`metric-card ${variant}`}
      id={id}
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '7px 10px',
        borderBottom: '1px solid var(--border-dim)',
        background: 'var(--bg-surface)',
        transition: 'background 0.15s, opacity 250ms',
        opacity: idle ? 0.75 : 1,
      }}
    >
      {/* Header row: icon + label + estimated badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ color, opacity: 0.85, display: 'flex', alignItems: 'center' }}>{icon}</span>
          <span className="metric-label" style={{ fontSize: 8.5 }}>
            {label}
          </span>
        </div>

        {!idle && estimated && (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 7,
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--solar)',
              border: '1px solid var(--solar)',
              borderRadius: 2,
              padding: '1px 3px',
              lineHeight: 1,
            }}
          >
            EST
          </span>
        )}
      </div>

      {/* Value row */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, minHeight: 22, margin: '1px 0' }}>
        {idle ? (
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
              lineHeight: 1.2,
            }}
          >
            NOT YET CALCULATED
          </span>
        ) : (
          <>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: id === 'metric-indoor-temp' ? 900 : 800,
                fontSize: id === 'metric-indoor-temp' ? 24 : 18,
                letterSpacing: '-0.02em',
                color,
                lineHeight: 1,
              }}
            >
              <AnimatedNumber value={formattedV} runCount={runCount} />
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: id === 'metric-indoor-temp' ? 11 : 8.5,
                fontWeight: 700,
                color: 'var(--text-muted)',
                letterSpacing: '0.04em',
              }}
            >
              <AnimatedNumber value={unit} runCount={runCount} />
            </span>
          </>
        )}
      </div>

      {/* Sub-label */}
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 7.5,
          color: 'var(--text-muted)',
          letterSpacing: '0.02em',
          lineHeight: 1.2,
          opacity: idle ? 0.7 : 0.9,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {idle ? 'Run simulation to evaluate this shelter' : sub}
      </div>
    </div>
  )
}

/* ── Main RightPanel Thermal Intelligence Console ────────────────────── */

export const RightPanel: FC = () => {
  const status = useResultsStore((s) => s.status)
  const estimated = useResultsStore((s) => s.estimated)
  const runCount = useResultsStore((s) => s.runCount)
  const indoorTemp = useResultsStore((s) => s.indoorTemp)
  const solarGain = useResultsStore((s) => s.solarGain)
  const heatLoss = useResultsStore((s) => s.heatLoss)
  const comfortHours = useResultsStore((s) => s.comfortHours)
  const heatingDemand = useResultsStore((s) => s.heatingDemand)
  const verifiedAgainstSurrogate = useResultsStore((s) => s.verifiedAgainstSurrogate)
  const deltaFromSurrogate = useResultsStore((s) => s.deltaFromSurrogate)
  const uValue = useResultsStore((s) => s.uValue)
  const weight = useResultsStore((s) => s.weight)
  const cost = useResultsStore((s) => s.cost)
  const indoorTempSeries = useResultsStore((s) => s.indoorTempSeries)

  const thermalMass = useDesignStore((s) => s.thermalMass)

  const activeProfile = useClimateStore((s) => s.activeProfile)
  const selectedLoc = useClimateStore((s) => s.selectedLocation)
  const locationId = useDesignStore((s) => s.location)
  const loc = activeProfile || getLocationProfile(locationId)
  const envName = activeProfile?.name || selectedLoc?.name || loc.name

  const idle = status === 'idle'
  const isReady = status === 'ready'


  const lastSimulatedParams = useResultsStore((s) => s.lastSimulatedParams)
  const shape = useDesignStore((s) => s.shape)
  const length = useDesignStore((s) => s.length)
  const width = useDesignStore((s) => s.width)
  const height = useDesignStore((s) => s.height)
  const orientation = useDesignStore((s) => s.orientation)
  const wallMaterial = useDesignStore((s) => s.wallMaterial)
  const roofMaterial = useDesignStore((s) => s.roofMaterial)
  const insulation = useDesignStore((s) => s.insulation)
  const openingRatio = useDesignStore((s) => s.openingRatio)

  const isStale = isReady && !!lastSimulatedParams && (
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

  const [isRiskExpanded, setIsRiskExpanded] = useState(false)

  const metrics: Omit<MetricCardProps, 'idle' | 'estimated' | 'runCount'>[] = [
    {
      id: 'metric-indoor-temp',
      label: 'Indoor Temperature',
      rawValue: indoorTemp,
      format: (v) => formatSigned(v, 1),
      unit: '°C',
      sub: '24-hour mean design day temp',
      variant: 'cool',
      icon: <Thermometer size={10} strokeWidth={2} />,
    },
    {
      id: 'metric-solar-gain',
      label: 'Solar Thermal Gain',
      rawValue: solarGain,
      format: (v) => v.toFixed(0),
      unit: 'W/m²',
      sub: 'South façade irradiance average',
      variant: 'solar',
      icon: <Sun size={10} strokeWidth={2} />,
    },
    {
      id: 'metric-heat-loss',
      label: 'Fabric Heat Loss',
      rawValue: heatLoss,
      format: (v) => v.toFixed(0),
      unit: 'W/m²',
      sub: 'Through envelope & infiltration',
      variant: 'cool',
      icon: <TrendingDown size={10} strokeWidth={2} />,
    },
    {
      id: 'metric-comfort-hours',
      label: 'Hours Above 5°C',
      rawValue: comfortHours,
      format: (v) => v.toFixed(1),
      unit: 'h / day',
      sub: 'Emergency survivability threshold (>5°C)',
      variant: 'ok',
      icon: <Clock size={10} strokeWidth={2} />,
    },
    {
      id: 'metric-heating-req',
      label: 'Heating Requirement',
      rawValue: heatingDemand,
      format: (v) => v.toFixed(1),
      unit: 'kWh / day',
      sub: 'Thermal deficit vs. 18°C setpoint',
      variant: 'warn',
      icon: <Flame size={10} strokeWidth={2} />,
    },
  ]

  return (
    <aside className="panel-right" id="panel-right" aria-label="Thermal Intelligence Console">
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
          <Activity size={11} strokeWidth={2} color="var(--solar)" />
          <span>Thermal Intelligence</span>
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 7.5,
            fontWeight: 700,
            letterSpacing: '0.08em',
            padding: '1px 5px',
            borderRadius: 2,
            background: idle
              ? 'var(--bg-surface)'
              : isStale
              ? 'rgba(217, 119, 6, 0.16)'
              : verifiedAgainstSurrogate
              ? 'var(--ok-glow)'
              : estimated
              ? 'var(--solar-glow)'
              : 'var(--ok-glow)',
            color: idle
              ? 'var(--text-faint)'
              : isStale
              ? 'var(--solar)'
              : verifiedAgainstSurrogate
              ? 'var(--ok)'
              : estimated
              ? 'var(--solar)'
              : 'var(--ok)',
            border: `1px solid ${
              idle
                ? 'var(--border-dim)'
                : isStale
                ? 'var(--solar)'
                : verifiedAgainstSurrogate
                ? 'var(--ok)'
                : estimated
                ? 'var(--solar)'
                : 'var(--ok)'
            }`,
            textTransform: 'uppercase',
          }}
        >
          {idle
            ? '● AWAITING SIM'
            : isStale
            ? '● SIMULATION OUTDATED'
            : isReady
            ? (verifiedAgainstSurrogate ? '● VERIFIED PHYSICS' : estimated ? '● ESTIMATED' : '● SIM COMPLETE')
            : '● COMPLETE'}
        </span>
      </div>

      {/* ── Stale Design Input Alert Strip ── */}
      {isStale && (
        <div
          style={{
            background: 'rgba(217, 119, 6, 0.14)',
            borderBottom: '1px solid var(--solar)',
            padding: '5px 10px',
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            color: 'var(--solar)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <ShieldAlert size={10} color="var(--solar)" />
            <span>SIMULATION OUTDATED — Design inputs changed.</span>
          </div>
          <button
            onClick={() => {
              const btn = document.getElementById('btn-simulate')
              if (btn) btn.click()
            }}
            style={{
              background: 'var(--solar)',
              color: '#000000',
              fontFamily: 'var(--font-mono)',
              fontSize: 7.5,
              fontWeight: 700,
              border: 'none',
              borderRadius: 2,
              padding: '2px 6px',
              cursor: 'pointer',
            }}
          >
            SIMULATE
          </button>
        </div>
      )}

      {/* ── Physics Verification Strip (when verified against surrogate) ── */}
      {verifiedAgainstSurrogate && deltaFromSurrogate != null && !isStale && (
        <div
          style={{
            background: 'var(--ok-glow)',
            borderBottom: '1px solid var(--ok)',
            padding: '5px 10px',
            fontFamily: 'var(--font-mono)',
            fontSize: 8,
            color: 'var(--ok)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={10} color="var(--ok)" />
            <span>CURRENT DESIGN · ✓ PHYSICS VERIFIED</span>
          </div>
          <span>
            Δ SURROGATE: {deltaFromSurrogate >= 0 ? `±${deltaFromSurrogate.toFixed(2)}` : deltaFromSurrogate.toFixed(2)}°C
          </span>
        </div>
      )}

      {/* ── Scrollable Body ── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {/* ── Primary Section Content: Empty State vs Active Simulation Dashboard ── */}
        {idle ? (
          <div
            style={{
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
              flex: 1,
            }}
          >
            {/* Clean Single Empty State Card */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-base)',
                borderRadius: 4,
                padding: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={14} color="var(--solar)" />
                <span
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}
                >
                  THERMAL PERFORMANCE
                </span>
              </div>

              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--solar)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  No simulation yet
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-ui)',
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    lineHeight: 1.4,
                    marginTop: 3,
                  }}
                >
                  Your current shelter configuration has not been evaluated. Run the thermal simulation to compute transient indoor temperature and energy requirements.
                </div>
              </div>

              <button
                onClick={() => {
                  const btn = document.getElementById('btn-simulate')
                  if (btn) btn.click()
                }}
                className="action-btn primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  background: 'var(--cool)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 3,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)',
                  marginTop: 4,
                }}
              >
                <span>RUN SIMULATION</span>
              </button>
            </div>

            {/* What Will Be Calculated Card */}
            <div
              style={{
                background: 'var(--bg-base)',
                border: '1px solid var(--border-dim)',
                borderRadius: 4,
                padding: 12,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 8.5,
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                WHAT WILL BE CALCULATED:
              </span>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { icon: <Thermometer size={11} color="var(--cool)" />, text: 'Indoor temperature (°C 24-hr profile)' },
                  { icon: <Flame size={11} color="var(--warn)" />, text: 'Heating requirement (kWh/day)' },
                  { icon: <TrendingDown size={11} color="var(--cool)" />, text: 'Fabric heat loss (W/m²)' },
                  { icon: <Sun size={11} color="var(--solar)" />, text: 'Solar thermal gain (W/m²)' },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontFamily: 'var(--font-ui)', color: 'var(--text-secondary)' }}>
                    {item.icon}
                    <span>{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ── Primary Metric Cards ── */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {metrics.map((m) => (
                <MetricCard key={m.id} {...m} idle={idle} estimated={estimated} runCount={runCount} />
              ))}
            </div>

            {/* ── B. 24H TRANSIENT TEMPERATURE CHART ── */}
            <div style={{ padding: 8 }}>
              <ThermalTrendChart data={indoorTempSeries} idle={idle} />
            </div>
          </>
        )}

        {/* ── C. FACTUAL ENGINEERING READOUT ── */}
        <div
          style={{
            margin: '0 8px 8px',
            padding: '6px 8px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-dim)',
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Cpu size={10} color="var(--solar)" />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 8,
                fontWeight: 700,
                color: 'var(--text-secondary)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              Factual Engineering Readout
            </span>
          </div>

          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 7.5,
              color: 'var(--text-muted)',
              lineHeight: 1.35,
            }}
          >
            {idle ? (
              <span>System awaiting initial simulation run to compute envelope thermal performance.</span>
            ) : (
              <span>
                Simulated indoor mean is <strong style={{ color: 'var(--text-primary)' }}>{indoorTemp.toFixed(1)}°C</strong> with
                fabric U-value of <strong style={{ color: 'var(--text-primary)' }}>{uValue?.toFixed(3) || '—'} W/m²K</strong> under
                active thermal mass (<strong style={{ color: 'var(--text-primary)' }}>{thermalMass.toUpperCase()}</strong>). Heating
                demand is <strong style={{ color: 'var(--solar)' }}>{heatingDemand.toFixed(1)} kWh/day</strong>.
              </span>
            )}
          </div>
        </div>

        {/* ── D. ENVELOPE LOGISTICS & SPECS ── */}
        <div
          style={{
            margin: '0 8px 8px',
            border: '1px solid var(--border-dim)',
            background: 'var(--bg-base)',
            padding: '6px 8px',
            borderRadius: 2,
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 7.5,
                fontWeight: 700,
                color: 'var(--text-muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Layers size={9} color="var(--solar)" />
              Design Envelope Inputs
            </span>
            <span style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--text-faint)' }}>ACTIVE DESIGN</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                U-VALUE
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                {uValue != null ? uValue.toFixed(3) : '—'} <span style={{ fontSize: 7.5 }}>W/m²K</span>
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                WEIGHT
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                {weight != null ? Math.round(weight).toLocaleString() : '—'} <span style={{ fontSize: 7.5 }}>kg</span>
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                EST COST
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 700, color: 'var(--solar)' }}>
                {cost != null ? `₹${Math.round(cost).toLocaleString()}` : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* ── E. COLLAPSIBLE DISASTER RISK SECTION ── */}
        <div style={{ borderTop: '1px solid var(--border-dim)' }}>
          <button
            type="button"
            onClick={() => setIsRiskExpanded(!isRiskExpanded)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              background: 'var(--bg-panel)',
              border: 'none',
              borderBottom: isRiskExpanded ? '1px solid var(--border-dim)' : 'none',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <ShieldAlert size={10} color="var(--warn)" />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 8.5,
                  fontWeight: 700,
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
                Disaster Risk Assessment
              </span>
            </div>
            <span style={{ color: 'var(--text-muted)', display: 'flex' }}>
              {isRiskExpanded ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            </span>
          </button>

          {isRiskExpanded && (
            <div style={{ padding: 6, background: 'var(--bg-base)' }}>
              <RiskAssessmentCard />
            </div>
          )}
        </div>
      </div>

      {/* ── Environment Footer (Dynamic per active location) ── */}
      <div
        style={{
          borderTop: '1px solid var(--border-dim)',
          background: 'var(--bg-panel)',
          padding: '8px 10px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4px 8px',
          flexShrink: 0,
        }}
      >
        <span
          className="section-header"
          style={{ gridColumn: '1/-1', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <Wind size={9} color="var(--solar)" />
          Site Environment ({envName})
        </span>

        {[
          { k: 'T_out', v: loc.tOut || (activeProfile ? `${activeProfile.tOutMin}° → ${activeProfile.tOutMax}°C` : '–18 → –8°C') },
          { k: 'Wind', v: typeof loc.wind === 'string' ? loc.wind : `${loc.windSpeed || 3.5} m/s` },
          { k: 'G_south', v: typeof loc.gSouth === 'string' ? loc.gSouth : `${loc.gSouthValue || 520} W/m²` },
          { k: 'Alt.', v: typeof loc.altitude === 'string' ? loc.altitude : `${loc.altitudeNum || selectedLoc?.altitude || 3524}m` },
        ].map(({ k, v }) => (
          <div key={k}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 7,
                color: 'var(--text-muted)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {k}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 600, color: 'var(--text-primary)' }}>
              {v}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}

export default RightPanel
