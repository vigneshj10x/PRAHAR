/**
 * CompareModal.tsx
 *
 * Side-by-side comparison of EXISTING vs OPTIMIZED thermal performance.
 * Shows metrics: Indoor Temp, Solar Gain, Heat Loss, Comfort, Heating Demand.
 *
 * "Before" state = whatever is currently in results store, or Scenario A_baseline
 * if no simulation has been run yet.
 * "After" state = Scenario C_optimized pre-computed values (always exact).
 */
import type { FC } from 'react'
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useUIModalStore } from '../store/uiModalStore'
import type { SimulationResult } from '../lib/simulationEngine'

interface CompareMetric {
  label:            string
  key:              keyof SimulationResult
  unit:             string
  format:           (v: number) => string
  improveDirection: 'higher' | 'lower'
}

const METRICS: CompareMetric[] = [
  {
    label:            'Indoor Temperature',
    key:              'indoorTemp',
    unit:             '°C',
    format:           (v) => (v >= 0 ? `+${v.toFixed(1)}` : v.toFixed(1)),
    improveDirection: 'higher',
  },
  {
    label:            'Solar Gain',
    key:              'solarGain',
    unit:             'W/m²',
    format:           (v) => Math.round(v).toString(),
    improveDirection: 'higher',
  },
  {
    label:            'Heat Loss',
    key:              'heatLoss',
    unit:             'W/m²',
    format:           (v) => Math.round(v).toString(),
    improveDirection: 'lower',
  },
  {
    label:            'Comfort Hours',
    key:              'comfortHours',
    unit:             'h / day',
    format:           (v) => v.toFixed(1),
    improveDirection: 'higher',
  },
  {
    label:            'Heating Demand',
    key:              'heatingDemand',
    unit:             'kWh / day',
    format:           (v) => v.toFixed(1),
    improveDirection: 'lower',
  },
]

/* helpers */
function isImproved(metric: CompareMetric, before: number, after: number): boolean {
  const THRESH = 0.05
  return metric.improveDirection === 'higher'
    ? after > before + THRESH
    : after < before - THRESH
}

function DeltaArrow({ metric, before, after }: { metric: CompareMetric; before: number; after: number }) {
  if (Math.abs(after - before) < 0.05) return <Minus size={12} color="var(--text-muted)" />
  if (isImproved(metric, before, after)) return <TrendingUp  size={12} color="var(--ok)" />
  return <TrendingDown size={12} color="var(--warn)" />
}

/* ─── Main component ──────────────────────────────────────────────── */
const CompareModal: FC = () => {
  const closeCompare              = useUIModalStore((s) => s.closeCompare)
  const { beforeResult, afterResult, beforeParams } = useUIModalStore((s) => s.compare)

  if (!beforeResult || !afterResult) return null

  const beforeLabel = beforeParams && beforeResult.scenarioKey === 'A_baseline'
    ? 'Existing  (Scenario A — Baseline)'
    : 'Existing (current design)'

  return (
    <div
      style={{
        position:       'fixed',
        inset:          0,
        background:     'rgba(15, 23, 42, 0.45)',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        zIndex:         9998,
        backdropFilter: 'blur(4px)',
      }}
      onClick={closeCompare}
    >
      <div
        style={{
          background:   'var(--bg-surface)',
          border:       '1px solid var(--border-base)',
          borderRadius: 6,
          padding:      '24px 28px 18px',
          width:        560,
          maxWidth:     '90vw',
          maxHeight:    '80vh',
          overflow:     'auto',
          boxShadow:    '0 24px 64px rgba(15, 23, 42, 0.18), 0 2px 8px rgba(0, 0, 0, 0.04)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{
          display:         'flex',
          alignItems:      'flex-start',
          justifyContent:  'space-between',
          marginBottom:    20,
        }}>
          <div>
            <div style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      12,
              fontWeight:    700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color:         'var(--text-primary)',
              marginBottom:  4,
            }}>
              Performance Comparison
            </div>
            <div style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      8.5,
              color:         'var(--text-muted)',
              letterSpacing: '0.08em',
            }}>
              Leh • Ladakh • January winter design day (prototype values)
            </div>
          </div>
          <button
            onClick={closeCompare}
            style={{
              background: 'transparent',
              border:     'none',
              cursor:     'pointer',
              color:      'var(--text-muted)',
              padding:    4,
              marginLeft: 12,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Column header row ── */}
        <div style={{
          display:             'grid',
          gridTemplateColumns: '2fr 1.5fr 1.5fr 0.6fr',
          gap:                 12,
          padding:             '6px 0 10px',
          borderBottom:        '1px solid var(--border-base)',
          marginBottom:        4,
        }}>
          {['Metric', 'Existing', 'Optimized (C)', 'Δ'].map(col => (
            <div key={col} style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      8,
              fontWeight:    700,
              color:         'var(--text-muted)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}>
              {col}
            </div>
          ))}
        </div>

        {/* ── Column sub-headers ── */}
        <div style={{
          display:             'grid',
          gridTemplateColumns: '2fr 1.5fr 1.5fr 0.6fr',
          gap:                 12,
          padding:             '0 0 10px',
          borderBottom:        '1px solid var(--border-dim)',
          marginBottom:        6,
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, color: 'var(--text-faint)', letterSpacing: '0.06em' }}>
            {beforeLabel}
          </div>
          <div />
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, color: 'var(--text-faint)', letterSpacing: '0.06em' }}>
            Scenario C — Optimized
          </div>
          <div />
        </div>

        {/* ── Data rows ── */}
        {METRICS.map((metric) => {
          const beforeValue = (beforeResult as Record<string, unknown>)[metric.key] as number
          const afterValue  = (afterResult  as Record<string, unknown>)[metric.key] as number
          const improved    = isImproved(metric, beforeValue, afterValue)

          const delta = metric.improveDirection === 'higher'
            ? afterValue - beforeValue
            : beforeValue - afterValue

          return (
            <div
              key={metric.key}
              style={{
                display:             'grid',
                gridTemplateColumns: '2fr 1.5fr 1.5fr 0.6fr',
                gap:                 12,
                padding:             '11px 0',
                borderBottom:        '1px solid var(--border-dim)',
                alignItems:          'center',
              }}
            >
              {/* Metric label */}
              <div style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      9,
                color:         'var(--text-secondary)',
                letterSpacing: '0.06em',
              }}>
                {metric.label}
              </div>

              {/* Before value */}
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize:   11,
                color:      'var(--text-secondary)',
              }}>
                {metric.format(beforeValue)}{' '}
                <span style={{ fontSize: 8, opacity: 0.55 }}>{metric.unit}</span>
              </div>

              {/* After value */}
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize:   11,
                fontWeight: improved ? 700 : 500,
                color:      improved ? 'var(--ok)' : 'var(--text-secondary)',
              }}>
                {metric.format(afterValue)}{' '}
                <span style={{ fontSize: 8, opacity: 0.55 }}>{metric.unit}</span>
              </div>

              {/* Delta column: arrow icon + numeric delta */}
              <div style={{
                display:    'flex',
                alignItems: 'center',
                gap:        4,
              }}>
                <DeltaArrow metric={metric} before={beforeValue} after={afterValue} />
                {Math.abs(delta) >= 0.05 && (
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize:   8,
                    color:      improved ? 'var(--ok)' : 'var(--warn)',
                    fontWeight: 600,
                  }}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          )
        })}

        {/* ── Footer ── */}
        <div style={{
          marginTop:      18,
          paddingTop:     12,
          borderTop:      '1px solid var(--border-dim)',
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          gap:            12,
        }}>
          <span style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      8,
            color:         'var(--text-faint)',
            letterSpacing: '0.06em',
          }}>
            Prototype values — pre-computed interpolation, not a validated physics solver.
          </span>
          <button
            onClick={closeCompare}
            style={{
              padding:       '6px 16px',
              background:    'rgba(245, 158, 11, 0.08)',
              border:        '1px solid var(--solar)',
              borderRadius:  2,
              color:         'var(--solar)',
              fontFamily:    'var(--font-mono)',
              fontSize:      9,
              fontWeight:    600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              cursor:        'pointer',
              transition:    'background 150ms',
              flexShrink:    0,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(245,158,11,0.18)' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(245,158,11,0.08)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default CompareModal
