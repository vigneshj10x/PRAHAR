import { useEffect, useRef, useState, type FC } from 'react'
import { Thermometer, Sun, Wind, TrendingDown, Clock, Flame } from 'lucide-react'
import { useResultsStore } from '@/store/resultsStore'
import { useDesignStore } from '@/store/designStore'
import { useClimateStore } from '@/store/climateStore'
import { getLocationProfile } from '@/data/locations'
import { formatSigned } from '@/lib/formatters'

/* ─────────────────────────────────────────────────────────────────────────────
   AnimatedNumber
   Fades the old value out (↓ 4 px, opacity 0) and fades the new value in
   (↑ 4 px, opacity 1) over two 150 ms half-steps whenever `value` changes.
─────────────────────────────────────────────────────────────────────────────── */
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
    <span style={{
      display: 'inline-block',
      opacity: phase === 'out' ? 0 : 1,
      transform: phase === 'out' ? 'translateY(3px)' : phase === 'in' ? 'translateY(-2px)' : 'translateY(0)',
      transition: phase === 'stable' ? 'none' : 'opacity 150ms ease, transform 150ms ease',
    }}>
      {displayed}
    </span>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   MetricCard — clean, non-overlapping structured layout
─────────────────────────────────────────────────────────────────────────────── */
interface MetricCardProps {
  id: string
  label: string
  rawValue: number
  format: (v: number) => string
  unit: string
  sub: string
  variant: 'solar' | 'cool' | 'ok' | 'warn' | 'neutral'
  icon: React.ReactNode
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
  id, label, rawValue, format, unit, sub,
  variant, icon, idle, estimated, runCount,
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
        padding: '8px 12px 8px 14px',
        borderBottom: '1px solid var(--border-dim)',
        background: 'var(--bg-surface)',
        flex: '1 1 0%',
        minHeight: 68,
        position: 'relative',
        transition: 'background 0.15s, opacity 250ms',
        opacity: idle ? 0.75 : 1,
      }}
    >
      {/* Header row: icon + label + estimated badge */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 2,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ color, opacity: 0.85, display: 'flex', alignItems: 'center' }}>{icon}</span>
          <span className="metric-label" style={{ fontSize: 8.5 }}>{label}</span>
        </div>

        {!idle && estimated && (
          <span style={{
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
          }}>
            est
          </span>
        )}
      </div>

      {/* Value row: fixed height line to avoid vertical collision */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        gap: 5,
        minHeight: 24,
        margin: '2px 0',
      }}>
        {idle ? (
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: '0.12em',
            color: 'var(--text-muted)',
            lineHeight: 1.2,
          }}>
            AWAITING SIM
          </span>
        ) : (
          <>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontWeight: 800,
              fontSize: 22,
              letterSpacing: '-0.02em',
              color,
              lineHeight: 1,
            }}>
              <AnimatedNumber value={formattedV} runCount={runCount} />
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 600,
              color: 'var(--text-muted)',
              letterSpacing: '0.04em',
            }}>
              <AnimatedNumber value={unit} runCount={runCount} />
            </span>
          </>
        )}
      </div>

      {/* Sub-label */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 7.5,
        color: 'var(--text-muted)',
        letterSpacing: '0.02em',
        lineHeight: 1.2,
        opacity: idle ? 0.6 : 0.9,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {sub}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   RightPanel
─────────────────────────────────────────────────────────────────────────────── */
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

  const activeProfile = useClimateStore((s) => s.activeProfile)
  const selectedLoc = useClimateStore((s) => s.selectedLocation)
  const locationId = useDesignStore((s) => s.location)
  const loc = activeProfile || getLocationProfile(locationId)
  const envName = activeProfile?.name || selectedLoc?.name || loc.name

  const idle = status === 'idle'

  const metrics: Omit<MetricCardProps, 'idle' | 'estimated' | 'runCount'>[] = [
    {
      id: 'metric-indoor-temp',
      label: 'Indoor Temperature',
      rawValue: indoorTemp,
      format: (v) => formatSigned(v, 1),
      unit: '°C',
      sub: '24-hour average · design day',
      variant: 'cool',
      icon: <Thermometer size={10} strokeWidth={2} />,
    },
    {
      id: 'metric-solar-gain',
      label: 'Solar Thermal Gain',
      rawValue: solarGain,
      format: (v) => v.toFixed(0),
      unit: 'W/m²',
      sub: 'South façade irradiance avg',
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
      label: 'Comfort Hours',
      rawValue: comfortHours,
      format: (v) => v.toFixed(1),
      unit: 'h / day',
      sub: 'Above 5°C threshold window',
      variant: 'ok',
      icon: <Clock size={10} strokeWidth={2} />,
    },
    {
      id: 'metric-heating-req',
      label: 'Heating Requirement',
      rawValue: heatingDemand,
      format: (v) => v.toFixed(1),
      unit: 'kWh / day',
      sub: 'Deficit vs. 18°C setpoint',
      variant: 'warn',
      icon: <Flame size={10} strokeWidth={2} />,
    },
  ]

  return (
    <aside className="panel-right" id="panel-right" aria-label="Thermal Performance">

      {/* ── Panel header ── */}
      <div className="panel-header">
        <span className="section-header" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Thermometer size={10} strokeWidth={2} />
          Thermal Performance
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 8,
          fontWeight: 700,
          letterSpacing: '0.1em',
          color: idle
            ? 'var(--text-faint)'
            : verifiedAgainstSurrogate
            ? 'var(--ok)'
            : estimated
            ? 'var(--solar)'
            : 'var(--ok)',
          textTransform: 'uppercase',
          transition: 'color 300ms',
        }}>
          {idle
            ? '— IDLE —'
            : verifiedAgainstSurrogate
            ? 'VERIFIED PHYSICS'
            : estimated
            ? 'ESTIMATED'
            : '24-H AVG'}
        </span>
      </div>

      {/* ── Verified Delta Strip (when verified against surrogate) ── */}
      {verifiedAgainstSurrogate && deltaFromSurrogate != null && (
        <div style={{
          background: 'var(--ok-glow)',
          borderBottom: '1px solid var(--ok)',
          padding: '5px 12px',
          fontFamily: 'var(--font-mono)',
          fontSize: 8.5,
          color: 'var(--ok)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span>ISO 13790 Transient Verified</span>
          <span>Δ Surrogate: {deltaFromSurrogate >= 0 ? `±${deltaFromSurrogate.toFixed(2)}` : deltaFromSurrogate.toFixed(2)}°C</span>
        </div>
      )}

      {/* ── Metric cards (5 rows with non-overlapping structured heights) ── */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
      }}>
        {metrics.map((m) => (
          <MetricCard
            key={m.id}
            {...m}
            idle={idle}
            estimated={estimated}
            runCount={runCount}
          />
        ))}
      </div>

      {/* ── Envelope Specs & Logistics Strip ── */}
      {(cost !== undefined || weight !== undefined || uValue !== undefined) && (
        <div style={{
          borderTop: '1px solid var(--border-dim)',
          background: 'var(--bg-base)',
          padding: '6px 12px',
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 6,
          flexShrink: 0,
        }}>
          {uValue !== undefined && (
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase' }}>U-VALUE</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 700, color: 'var(--text-primary)' }}>{uValue.toFixed(3)} <span style={{ fontSize: 7.5 }}>W/m²K</span></div>
            </div>
          )}
          {weight !== undefined && (
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase' }}>WEIGHT</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 700, color: 'var(--text-primary)' }}>{Math.round(weight).toLocaleString()} <span style={{ fontSize: 7.5 }}>kg</span></div>
            </div>
          )}
          {cost !== undefined && (
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase' }}>COST</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 700, color: 'var(--solar-dim)' }}>₹{Math.round(cost).toLocaleString()}</div>
            </div>
          )}
        </div>
      )}

      {/* ── Environment footer (dynamic per active location) ── */}
      <div style={{
        borderTop: '1px solid var(--border-dim)',
        background: 'var(--bg-panel)',
        padding: '8px 12px 10px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '4px 8px',
        flexShrink: 0,
      }}>
        <span className="section-header" style={{ gridColumn: '1/-1', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Wind size={9} color="var(--solar)" />
          Environment ({envName})
        </span>

        {[
          { k: 'T_out', v: loc.tOut || (activeProfile ? `${activeProfile.tOutMin}° → ${activeProfile.tOutMax}°C` : '–18 → –8°C') },
          { k: 'Wind', v: typeof loc.wind === 'string' ? loc.wind : `${loc.windSpeed || 3.5} m/s` },
          { k: 'G_south', v: typeof loc.gSouth === 'string' ? loc.gSouth : `${loc.gSouthValue || 520} W/m²` },
          { k: 'Alt.', v: typeof loc.altitude === 'string' ? loc.altitude : `${loc.altitudeNum || selectedLoc?.altitude || 3524}m` },
        ].map(({ k, v }) => (
          <div key={k}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{k}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 600, color: 'var(--text-primary)' }}>{v}</div>
          </div>
        ))}

        <div style={{
          gridColumn: '1/-1',
          marginTop: 4,
          paddingTop: 4,
          borderTop: '1px dashed var(--border-dim)',
          fontFamily: 'var(--font-mono)',
          fontSize: 7,
          color: 'var(--text-muted)',
          lineHeight: 1.3,
          letterSpacing: '0.01em',
        }}>
          * Simulation values are controlled prototype reference data for PS 26051 (DRDO).
        </div>
      </div>
    </aside>
  )
}

export default RightPanel
