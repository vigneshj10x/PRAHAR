/**
 * WhatIfPanel.tsx
 *
 * Sandbox "What-If" panel — lets the user nudge Insulation and Orientation
 * and see a live Before → After readout.
 *
 * IMPORTANT: This panel does NOT mutate the main designParams or results stores.
 * Closing the panel discards all scratch changes.
 *
 * "Before" is a snapshot captured when the panel opens:
 *   - If a simulation has been run, uses those results.
 *   - Otherwise falls back to Scenario A_baseline (makes the panel useful
 *     even before SIMULATE has been clicked).
 */
import { useState, useEffect, useRef, type FC } from 'react'
import { X, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useDesignStore }  from '@/store/designStore'
import { useResultsStore } from '@/store/resultsStore'
import { useUIModalStore } from '@/store/uiModalStore'
import { getSimulationService } from '@/services/index'
import type { DesignParams, SimulationResult } from '@/domain'
import { degreesToCompass } from '@/lib/formatters'

type NumericMetricKey = 'indoorTemp' | 'solarGain' | 'heatLoss' | 'comfortHours' | 'heatingDemand'

/* ── Metric definitions ───────────────────────────────────────────── */
const METRICS: {
  label:            string
  key:              NumericMetricKey
  unit:             string
  format:           (v: number) => string
  improveDirection: 'higher' | 'lower'
}[] = [
  { label: 'Indoor Temp',    key: 'indoorTemp',    unit: '°C',       format: (v) => (v >= 0 ? `+${v.toFixed(1)}` : v.toFixed(1)), improveDirection: 'higher' },
  { label: 'Solar Gain',     key: 'solarGain',     unit: 'W/m²',     format: (v) => Math.round(v).toString(),                        improveDirection: 'higher' },
  { label: 'Heat Loss',      key: 'heatLoss',      unit: 'W/m²',     format: (v) => Math.round(v).toString(),                        improveDirection: 'lower'  },
  { label: 'Comfort Hours',  key: 'comfortHours',  unit: 'h/day',    format: (v) => v.toFixed(1),                                    improveDirection: 'higher' },
  { label: 'Heating Demand', key: 'heatingDemand', unit: 'kWh/day',  format: (v) => v.toFixed(1),                                    improveDirection: 'lower'  },
]

function isImproved(dir: 'higher' | 'lower', before: number, after: number): boolean {
  const THRESH = 0.05
  return dir === 'higher' ? after > before + THRESH : after < before - THRESH
}

/* ── Main panel ───────────────────────────────────────────────────── */
export const WhatIfPanel: FC = () => {
  const closeWhatIf = useUIModalStore((s) => s.closeWhatIf)

  /* Design store — read-only in this panel */
  const designParams = useDesignStore()

  /* Results store — only to snapshot the current state on open */
  const resultsStatus    = useResultsStore((s) => s.status)
  const storedIndoorTemp = useResultsStore((s) => s.indoorTemp)

  /* Snapshot captured once at open time — never mutated by slider changes */
  const baselineRef = useRef<SimulationResult | null>(null)
  const [baseline, setBaseline] = useState<SimulationResult | null>(null)

  /* Local scratch state — insulation and orientation only */
  const [insulation,   setInsulation]   = useState(designParams.insulation)
  const [orientation,  setOrientation]  = useState(designParams.orientation)
  const [liveResult,   setLiveResult]   = useState<SimulationResult | null>(null)

  /* ── Capture baseline once on mount ──────────────────────────────── */
  useEffect(() => {
    if (baselineRef.current !== null) return   // only once
    const service = getSimulationService()

    const initializeBaseline = async () => {
      let snap: SimulationResult

      if (resultsStatus === 'ready' && storedIndoorTemp !== 0) {
        // Snapshot from current simulation results
        const s = useResultsStore.getState()
        snap = {
          indoorTemp:    s.indoorTemp,
          solarGain:     s.solarGain,
          heatLoss:      s.heatLoss,
          comfortHours:  s.comfortHours,
          heatingDemand: s.heatingDemand,
          estimated:     s.estimated,
          scenarioKey:   s.scenarioKey,
        }
      } else {
        // Fallback: Scenario A baseline (so the panel is useful even without a prior SIMULATE)
        const scenarioA = await service.getScenario('A_baseline')
        snap = scenarioA.results
      }

      baselineRef.current = snap
      setBaseline(snap)

      // Run the initial "after" using current design params
      const initParams: DesignParams = {
        shape:        designParams.shape,
        orientation:  designParams.orientation,
        wallMaterial: designParams.wallMaterial,
        insulation:   designParams.insulation,
        openingRatio: designParams.openingRatio,
        thermalMass:  designParams.thermalMass,
        location:     designParams.location,
      }
      const initialAfter = await service.getResults(initParams)
      setLiveResult(initialAfter)
    }

    initializeBaseline()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])   // deliberately run only once on mount

  /* ── Slider change handlers ────────────────────────────────────── */
  async function handleInsulationChange(val: number) {
    setInsulation(val)
    const service = getSimulationService()
    const params: DesignParams = {
      shape:        designParams.shape,
      orientation:  orientation,   // use local scratch orientation
      wallMaterial: designParams.wallMaterial,
      insulation:   val,
      openingRatio: designParams.openingRatio,
      thermalMass:  designParams.thermalMass,
      location:     designParams.location,
    }
    const result = await service.getResults(params)
    setLiveResult(result)
  }

  async function handleOrientationChange(val: number) {
    setOrientation(val)
    const service = getSimulationService()
    const params: DesignParams = {
      shape:        designParams.shape,
      orientation:  val,
      wallMaterial: designParams.wallMaterial,
      insulation:   insulation,    // use local scratch insulation
      openingRatio: designParams.openingRatio,
      thermalMass:  designParams.thermalMass,
      location:     designParams.location,
    }
    const result = await service.getResults(params)
    setLiveResult(result)
  }

  const baselineLabel = baseline?.scenarioKey === 'A_baseline'
    ? 'Baseline (Scenario A)'
    : 'Before (current sim)'

  return (
    <div
      style={{
        position:      'fixed',
        bottom:        100,
        right:         12,
        width:         316,
        background:    'var(--bg-surface)',
        border:        '1px solid var(--border-base)',
        borderRadius:  6,
        display:       'flex',
        flexDirection: 'column',
        gap:           0,
        zIndex:        9997,
        boxShadow:     '0 16px 48px rgba(15, 23, 42, 0.16), 0 2px 6px rgba(0, 0, 0, 0.04)',
        overflow:      'hidden',
      }}
    >
      {/* ── Header ── */}
      <div style={{
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'space-between',
        padding:         '10px 12px',
        borderBottom:    '1px solid var(--border-base)',
        background:      'var(--bg-surface)',
        flexShrink:      0,
      }}>
        <div>
          <div style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      9.5,
            fontWeight:    700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color:         'var(--cool)',
          }}>
            WHAT-IF ANALYSIS
          </div>
          <div style={{
            fontFamily:    'var(--font-mono)',
            fontSize:      7.5,
            color:         'var(--text-muted)',
            letterSpacing: '0.06em',
            marginTop:     2,
          }}>
            Sandbox — no changes saved to main design
          </div>
        </div>
        <button
          onClick={closeWhatIf}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
        >
          <X size={14} />
        </button>
      </div>

      <div style={{ padding: '14px 14px 10px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* ── Insulation slider ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)',
            }}>
              Insulation
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--solar)', fontWeight: 600,
            }}>
              {insulation} mm
            </span>
          </div>
          <input
            type="range"
            min={25} max={150} step={25}
            value={insulation}
            onChange={(e) => handleInsulationChange(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--solar)', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {[25, 50, 100, 150].map(v => (
              <span key={v} style={{
                fontFamily: 'var(--font-mono)', fontSize: 7,
                color: v === insulation ? 'var(--solar)' : 'var(--text-faint)',
                transition: 'color 150ms',
              }}>{v}</span>
            ))}
          </div>
        </div>

        {/* ── Orientation slider ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 600,
              letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)',
            }}>
              Orientation
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--cool)', fontWeight: 600,
            }}>
              {orientation}° <span style={{ opacity: 0.7, fontSize: 8 }}>({degreesToCompass(orientation)})</span>
            </span>
          </div>
          <input
            type="range"
            min={0} max={360} step={15}
            value={orientation}
            onChange={(e) => handleOrientationChange(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--cool)', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {['0° N', '90° E', '180° S', '270° W', '360°'].map(v => (
              <span key={v} style={{
                fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-faint)',
              }}>{v}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Metrics table ── */}
      <div style={{
        borderTop:  '1px solid var(--border-dim)',
        padding:    '10px 14px 14px',
        display:    'flex',
        flexDirection: 'column',
        gap:        0,
      }}>
        {/* Column headers */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 0.5fr',
          gap: 6, paddingBottom: 6, marginBottom: 4,
          borderBottom: '1px solid var(--border-dim)',
        }}>
          {['Metric', baselineLabel, 'After', 'Δ'].map(col => (
            <div key={col} style={{
              fontFamily: 'var(--font-mono)', fontSize: 7.5, fontWeight: 700,
              color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase',
            }}>
              {col}
            </div>
          ))}
        </div>

        {METRICS.map((m) => {
          const beforeVal = baseline ? baseline[m.key] : 0
          const afterVal  = liveResult ? liveResult[m.key] : beforeVal
          const improved  = isImproved(m.improveDirection, beforeVal, afterVal)
          const worsened  = !improved && Math.abs(afterVal - beforeVal) >= 0.05

          const DeltaIcon = Math.abs(afterVal - beforeVal) < 0.05
            ? <Minus size={10} color="var(--text-faint)" />
            : improved
              ? <TrendingUp  size={10} color="var(--ok)" />
              : <TrendingDown size={10} color="var(--warn)" />

          return (
            <div
              key={m.key}
              style={{
                display:             'grid',
                gridTemplateColumns: '1.4fr 1fr 1fr 0.5fr',
                gap:                 6,
                padding:             '7px 0',
                borderBottom:        '1px solid var(--border-dim)',
                alignItems:          'center',
              }}
            >
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 8,
                color: 'var(--text-muted)', letterSpacing: '0.05em',
              }}>
                {m.label}<br />
                <span style={{ opacity: 0.55, fontSize: 7 }}>{m.unit}</span>
              </span>

              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, color: 'var(--text-secondary)' }}>
                {baseline ? m.format(beforeVal) : '—'}
              </span>

              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: 9.5,
                color:      improved ? 'var(--ok)' : worsened ? 'var(--warn)' : 'var(--text-secondary)',
                fontWeight: improved || worsened ? 600 : 400,
                transition: 'color 200ms',
              }}>
                {liveResult ? m.format(afterVal) : '—'}
              </span>

              <span style={{ display: 'flex', alignItems: 'center' }}>
                {DeltaIcon}
              </span>
            </div>
          )
        })}
      </div>

      {/* ── Footer note ── */}
      <div style={{
        padding:      '6px 14px 10px',
        borderTop:    '1px solid var(--border-dim)',
        fontFamily:   'var(--font-mono)',
        fontSize:     7.5,
        color:        'var(--text-faint)',
        letterSpacing:'0.05em',
        lineHeight:   1.5,
      }}>
        Live results via prototype interpolation. Close panel to discard.
      </div>
    </div>
  )
}

export default WhatIfPanel
