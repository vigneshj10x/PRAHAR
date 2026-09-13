/**
 * ParetoCandidateExplorer.tsx
 *
 * Interactive Pareto-optimal design set explorer powered by the fast ML surrogate model.
 * Displays non-dominated candidates with a Recharts scatter plot trade-off visualizer
 * and specification cards allowing users to apply candidates or verify them with high-fidelity physics.
 */

import { useState, useMemo, useEffect, type FC } from 'react'
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts'
import {
  Zap,
  X,
  TrendingUp,
  ShieldCheck,
  Check,
  Layers,
} from 'lucide-react'
import type { CandidateDesign } from '@/domain'
import { useDesignStore } from '@/store/designStore'

interface ParetoCandidateExplorerProps {
  candidates: CandidateDesign[]
  locationName: string
  budget: number
  weightLimit: number
  occupants: number
  onSelectCandidate: (candidate: CandidateDesign) => void
  onClose: () => void
}

type ChartMetric = 'cost_vs_heating' | 'weight_vs_heatloss' | 'cost_vs_comfort'

const ARCHETYPE_COLORS: Record<string, string> = {
  'cand-pareto-01': '#16a34a', // Green - Budget
  'cand-pareto-02': '#0284c7', // Sky blue - Tactical/Ultralight
  'cand-pareto-03': '#ea580c', // Orange - Thermal Protection
  'cand-pareto-04': '#9333ea', // Purple - Super-Insulated
  'cand-pareto-05': '#d97706', // Amber - Passive Solar
  'cand-pareto-06': '#0d9488', // Teal - Balanced
}

const OBJECTIVES = [
  { name: 'Heat Loss', unit: 'W/m²', dir: 'MINIMIZE', iconColor: 'var(--cool)' },
  { name: 'Heating Demand', unit: 'kWh/d', dir: 'MINIMIZE', iconColor: 'var(--warn)' },
  { name: 'Construction Cost', unit: '₹', dir: 'MINIMIZE', iconColor: 'var(--solar)' },
  { name: 'Envelope Weight', unit: 'kg', dir: 'MINIMIZE', iconColor: 'var(--text-muted)' },
  { name: 'Comfort Band (18–24°C)', unit: '%', dir: 'MAXIMIZE', iconColor: 'var(--ok)' },
  { name: 'Solar Gain', unit: 'W/m²', dir: 'MAXIMIZE', iconColor: 'var(--solar)' },
]

export const ParetoCandidateExplorer: FC<ParetoCandidateExplorerProps> = ({
  candidates,
  locationName,
  budget,
  weightLimit,
  occupants,
  onSelectCandidate,
  onClose,
}) => {
  const [selectedId, setSelectedId] = useState<string>(
    candidates.length > 0 ? candidates[0].id : ''
  )
  const [metricView, setMetricView] = useState<ChartMetric>('cost_vs_heating')
  const [appliedId, setAppliedId] = useState<string | null>(null)

  // Keydown Escape handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Direct design store actions for applying candidate params
  const setShape = useDesignStore((s) => s.setShape)
  const setOrientation = useDesignStore((s) => s.setOrientation)
  const setWallMaterial = useDesignStore((s) => s.setWallMaterial)
  const setRoofMaterial = useDesignStore((s) => s.setRoofMaterial)
  const setInsulation = useDesignStore((s) => s.setInsulation)
  const setOpeningRatio = useDesignStore((s) => s.setOpeningRatio)
  const setThermalMass = useDesignStore((s) => s.setThermalMass)
  const setLength = useDesignStore((s) => s.setLength)
  const setWidth = useDesignStore((s) => s.setWidth)
  const setHeight = useDesignStore((s) => s.setHeight)

  const handleApplyCandidate = (cand: CandidateDesign) => {
    const p = cand.params as any
    if (p.shape) setShape(p.shape)
    if (p.orientation !== undefined) setOrientation(p.orientation)
    if (p.wallMaterial) setWallMaterial(p.wallMaterial)
    if (p.roofMaterial) setRoofMaterial(p.roofMaterial)
    if (p.insulation !== undefined) setInsulation(p.insulation)
    if (p.opening !== undefined || p.openingRatio !== undefined) {
      setOpeningRatio(p.opening ?? p.openingRatio)
    }
    if (p.thermalMass) setThermalMass(p.thermalMass)
    if (p.length) setLength(p.length)
    if (p.width) setWidth(p.width)
    if (p.height) setHeight(p.height)

    setAppliedId(cand.id)
  }

  // Transform candidates for Recharts Scatter plot
  const scatterData = useMemo(() => {
    return candidates.map((c, idx) => {
      const p = c.params as any
      const r = c.results as any
      return {
        id: c.id,
        name: `Option ${idx + 1}`,
        shape: p.shape || 'rectangular',
        wallMaterial: p.wallMaterial || 'adobe',
        insulation: p.insulation ?? 50,
        cost: r.cost ?? 0,
        comfort: r.comfortPercent ?? ((r.comfortHours ?? 0) / 24) * 100,
        weight: r.weight ?? 0,
        heatLoss: Math.abs(r.heatLoss ?? 0),
        heatingDemand: r.heatingDemand ?? 0,
        indoorTemp: r.indoorTemp ?? r.meanIndoorTemp ?? 0,
        color: ARCHETYPE_COLORS[c.id] || '#64748b',
        tradeoffNotes: c.tradeoffNotes,
        rawCandidate: c,
      }
    })
  }, [candidates])

  const selectedCandidateObj = useMemo(() => {
    return candidates.find((c) => c.id === selectedId) || candidates[0]
  }, [candidates, selectedId])

  // Factual Trade-off Analysis calculation
  const tradeoffAnalysis = useMemo(() => {
    if (!selectedCandidateObj || candidates.length < 2) return null
    const rSelected = selectedCandidateObj.results as any
    const avgHeating =
      candidates.reduce((acc, c) => acc + ((c.results as any).heatingDemand ?? 0), 0) /
      candidates.length
    const avgCost =
      candidates.reduce((acc, c) => acc + ((c.results as any).cost ?? 0), 0) / candidates.length
    const avgWeight =
      candidates.reduce((acc, c) => acc + ((c.results as any).weight ?? 0), 0) / candidates.length

    const heatDiff = (rSelected.heatingDemand ?? 0) - avgHeating
    const costDiff = (rSelected.cost ?? 0) - avgCost
    const weightDiff = (rSelected.weight ?? 0) - avgWeight

    return {
      heatDiff,
      costDiff,
      weightDiff,
    }
  }, [selectedCandidateObj, candidates])

  // Chart axes configuration based on selected metricView
  const chartConfig = useMemo(() => {
    switch (metricView) {
      case 'weight_vs_heatloss':
        return {
          xKey: 'weight',
          yKey: 'heatLoss',
          xLabel: 'Envelope Weight (kg) [MINIMIZE]',
          yLabel: 'Fabric Heat Loss (W/m²) [MINIMIZE]',
          xUnit: ' kg',
          yUnit: ' W/m²',
        }
      case 'cost_vs_comfort':
        return {
          xKey: 'cost',
          yKey: 'comfort',
          xLabel: 'Construction Cost (₹) [MINIMIZE]',
          yLabel: 'Thermal Comfort Band 18–24°C (%) [MAXIMIZE]',
          xUnit: ' ₹',
          yUnit: '%',
        }
      case 'cost_vs_heating':
      default:
        return {
          xKey: 'cost',
          yKey: 'heatingDemand',
          xLabel: 'Construction Cost (₹) [MINIMIZE]',
          yLabel: 'Heating Demand (kWh/day) [MINIMIZE]',
          xUnit: ' ₹',
          yUnit: ' kWh/d',
        }
    }
  }, [metricView])

  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload
      return (
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-base)',
            borderRadius: 4,
            padding: '8px 12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-primary)',
            minWidth: 220,
          }}
        >
          <div style={{ fontWeight: 700, color: d.color, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
            <span>{d.id}</span>
            <span style={{ fontSize: 8.5, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{d.shape}</span>
          </div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 6, fontSize: 9 }}>
            {String(d.wallMaterial).replace(/_/g, ' ')} ({d.insulation}mm ins.)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px', borderTop: '1px solid var(--border-dim)', paddingTop: 4 }}>
            <div>Cost: <strong>₹{Math.round(d.cost).toLocaleString()}</strong></div>
            <div>Heating: <strong>{d.heatingDemand.toFixed(1)} kWh</strong></div>
            <div>Weight: <strong>{Math.round(d.weight).toLocaleString()} kg</strong></div>
            <div>Heat Loss: <strong>{d.heatLoss.toFixed(1)} W/m²</strong></div>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9998,
        backdropFilter: 'blur(6px)',
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-base)',
          borderRadius: 8,
          width: 1060,
          maxWidth: '96vw',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
        }}
      >
        {/* ── 1. Modal Header ── */}
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--border-base)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-panel)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 4,
                background: 'var(--solar-glow)',
                border: '1px solid var(--solar)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Zap size={16} color="var(--solar)" />
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  color: 'var(--text-primary)',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                AI SURROGATE OPTIMIZATION
                <span
                  style={{
                    fontSize: 8.5,
                    fontWeight: 700,
                    background: 'var(--ok-glow)',
                    color: 'var(--ok)',
                    border: '1px solid var(--ok)',
                    padding: '1px 6px',
                    borderRadius: 3,
                    letterSpacing: '0.06em',
                  }}
                >
                  COMPLETE · {candidates.length} CANDIDATES GENERATED
                </span>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'var(--text-muted)',
                  marginTop: 2,
                }}
              >
                Evaluated 3,000 multi-objective parameter combinations for{' '}
                <strong style={{ color: 'var(--text-secondary)' }}>{locationName}</strong> climate
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: 6,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 44,
              minWidth: 44,
            }}
            title="Close Explorer"
            aria-label="Close Explorer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── 2. Objectives Bar ── */}
        <div
          style={{
            padding: '8px 18px',
            background: 'var(--bg-base)',
            borderBottom: '1px solid var(--border-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              OBJECTIVES:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {OBJECTIVES.map((obj) => (
                <div
                  key={obj.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    background: 'var(--bg-panel)',
                    border: '1px solid var(--border-dim)',
                    padding: '2px 6px',
                    borderRadius: 3,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 8,
                  }}
                >
                  <span style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{obj.name}</span>
                  <span style={{ fontSize: 7, color: 'var(--text-faint)' }}>({obj.unit})</span>
                  <span style={{ fontSize: 7, fontWeight: 800, color: obj.dir === 'MINIMIZE' ? 'var(--warn)' : 'var(--ok)' }}>
                    [{obj.dir}]
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
            <span>Ceiling: <strong>₹{budget.toLocaleString()}</strong></span>
            <span>·</span>
            <span>Limit: <strong>{weightLimit.toLocaleString()}kg</strong></span>
            <span>·</span>
            <span>Occupants: <strong>{occupants} prs</strong></span>
          </div>
        </div>

        {/* ── 3. Main Body Grid ── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {/* ── Top Row: Pareto Scatter Chart + Selected Candidate Focus ── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(300px, 1fr) 340px',
              gap: 14,
            }}
          >
            {/* Pareto Scatter Plot */}
            <div
              style={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-dim)',
                borderRadius: 6,
                padding: '10px 14px 8px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 9.5,
                    fontWeight: 700,
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <TrendingUp size={12} color="var(--solar)" />
                  Trade-off visualization
                </div>

                {/* Projection Selector Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {(
                    [
                      { key: 'cost_vs_heating', label: 'Cost vs Heating' },
                      { key: 'weight_vs_heatloss', label: 'Weight vs Heat Loss' },
                      { key: 'cost_vs_comfort', label: 'Cost vs Comfort' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setMetricView(tab.key)}
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 8,
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: 3,
                        border:
                          metricView === tab.key
                            ? '1px solid var(--solar)'
                            : '1px solid var(--border-dim)',
                        background:
                          metricView === tab.key ? 'var(--solar-glow)' : 'var(--bg-surface)',
                        color:
                          metricView === tab.key ? 'var(--solar)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        minHeight: 28,
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ width: '100%', height: 180, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dim)" />
                    <XAxis
                      type="number"
                      dataKey={chartConfig.xKey}
                      name={chartConfig.xLabel}
                      unit={chartConfig.xUnit}
                      tick={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, fill: 'var(--text-muted)' }}
                      stroke="var(--border-base)"
                    />
                    <YAxis
                      type="number"
                      dataKey={chartConfig.yKey}
                      name={chartConfig.yLabel}
                      unit={chartConfig.yUnit}
                      tick={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, fill: 'var(--text-muted)' }}
                      stroke="var(--border-base)"
                    />
                    <ZAxis range={[140, 140]} />
                    <Tooltip content={<CustomScatterTooltip />} />
                    <Scatter
                      name="Candidates"
                      data={scatterData}
                      onClick={(entry: any) => setSelectedId(entry?.id || entry?.payload?.id || '')}
                      cursor="pointer"
                    >
                      {scatterData.map((entry) => (
                        <Cell
                          key={`cell-${entry.id}`}
                          fill={entry.color}
                          stroke={entry.id === selectedId ? '#ffffff' : '#000000'}
                          strokeWidth={entry.id === selectedId ? 2.5 : 1}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>

              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-faint)', marginTop: 4, textAlign: 'right' }}>
                * 2D projection of 6-objective Pareto set generated via ML surrogate evaluation.
              </div>
            </div>

            {/* Selected Candidate Inspector */}
            {selectedCandidateObj && (
              <div
                style={{
                  background: 'var(--bg-panel)',
                  border: `1.5px solid ${ARCHETYPE_COLORS[selectedCandidateObj.id] || 'var(--solar)'}`,
                  borderRadius: 6,
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 9,
                        fontWeight: 700,
                        padding: '1px 5px',
                        borderRadius: 3,
                        background: `${ARCHETYPE_COLORS[selectedCandidateObj.id] || '#64748b'}20`,
                        color: ARCHETYPE_COLORS[selectedCandidateObj.id] || '#64748b',
                        border: `1px solid ${ARCHETYPE_COLORS[selectedCandidateObj.id] || '#64748b'}40`,
                      }}
                    >
                      {selectedCandidateObj.id}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 700, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                      {(selectedCandidateObj.params as any).shape}
                    </span>
                  </div>

                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 7.5,
                      fontWeight: 700,
                      color: 'var(--solar)',
                      background: 'var(--solar-glow)',
                      padding: '1px 5px',
                      borderRadius: 2,
                      border: '1px solid var(--solar)',
                    }}
                  >
                    AI SURROGATE PREDICTION
                  </span>
                </div>

                {/* Specs */}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--text-muted)', lineHeight: 1.4 }}>
                  Wall: <strong style={{ color: 'var(--text-secondary)' }}>{String((selectedCandidateObj.params as any).wallMaterial).replace(/_/g, ' ')}</strong> · Ins: <strong style={{ color: 'var(--text-secondary)' }}>{(selectedCandidateObj.params as any).insulation}mm</strong> · Roof: <strong style={{ color: 'var(--text-secondary)' }}>{String((selectedCandidateObj.params as any).roofMaterial || 'insulated').replace(/_/g, ' ')}</strong>
                </div>

                {/* Primary Metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, background: 'var(--bg-base)', border: '1px solid var(--border-dim)', borderRadius: 4, padding: 6 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase' }}>HEATING DEMAND</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--warn)' }}>{((selectedCandidateObj.results as any).heatingDemand ?? 0).toFixed(1)} kWh/d</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase' }}>EST COST</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--solar)' }}>₹{Math.round((selectedCandidateObj.results as any).cost ?? 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase' }}>WEIGHT</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--text-primary)' }}>{Math.round((selectedCandidateObj.results as any).weight ?? 0).toLocaleString()} kg</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase' }}>FABRIC HEAT LOSS</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, color: 'var(--cool)' }}>{Math.abs((selectedCandidateObj.results as any).heatLoss ?? 0).toFixed(1)} W/m²</div>
                  </div>
                </div>

                {/* Factual Trade-off Interpretation */}
                {tradeoffAnalysis && (
                  <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', borderRadius: 4, padding: 6, fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-muted)', lineHeight: 1.3 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 2 }}>WHY THIS DESIGN?</div>
                    {tradeoffAnalysis.heatDiff < 0 ? (
                      <div>• Reduces heating demand by {Math.abs(tradeoffAnalysis.heatDiff).toFixed(1)} kWh/d vs pool average.</div>
                    ) : (
                      <div>• Increases heating demand by {tradeoffAnalysis.heatDiff.toFixed(1)} kWh/d vs pool average.</div>
                    )}
                    {tradeoffAnalysis.costDiff < 0 ? (
                      <div>• Lower construction cost by ₹{Math.round(Math.abs(tradeoffAnalysis.costDiff)).toLocaleString()}.</div>
                    ) : (
                      <div>• Higher construction cost by ₹{Math.round(tradeoffAnalysis.costDiff).toLocaleString()}.</div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
                  <button
                    onClick={() => handleApplyCandidate(selectedCandidateObj)}
                    className="action-btn primary"
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      background: appliedId === selectedCandidateObj.id ? 'var(--ok-glow)' : 'var(--cool)',
                      color: appliedId === selectedCandidateObj.id ? 'var(--ok)' : '#ffffff',
                      border: appliedId === selectedCandidateObj.id ? '1px solid var(--ok)' : 'none',
                      borderRadius: 4,
                      padding: '8px 12px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10.5,
                      fontWeight: 700,
                      cursor: 'pointer',
                      minHeight: 40,
                      boxShadow: appliedId === selectedCandidateObj.id ? 'none' : '0 2px 6px rgba(2, 132, 199, 0.35)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {appliedId === selectedCandidateObj.id ? <Check size={14} /> : <Layers size={14} />}
                    {appliedId === selectedCandidateObj.id ? 'APPLIED TO ACTIVE DESIGN' : 'APPLY TO DESIGN'}
                  </button>

                  <button
                    onClick={() => onSelectCandidate(selectedCandidateObj)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      background: 'var(--bg-surface)',
                      color: 'var(--solar)',
                      border: '1px solid var(--solar)',
                      borderRadius: 4,
                      padding: '8px 12px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer',
                      minHeight: 38,
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <ShieldCheck size={14} color="var(--solar)" />
                    <span>VERIFY WITH PHYSICS</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Bottom Section: All Candidate Archetypes Grid ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              ALL OPTIMIZED ARCHETYPES ({candidates.length})
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: 10 }}>
              {candidates.map((cand, idx) => {
                const isSelected = cand.id === selectedId
                const p = cand.params as any
                const r = cand.results as any
                const color = ARCHETYPE_COLORS[cand.id] || '#64748b'

                const noteParts = (cand.tradeoffNotes || '').split(':')
                const archetypeBadge = noteParts.length > 1 ? noteParts[0].trim() : `Candidate ${idx + 1}`

                return (
                  <div
                    key={cand.id}
                    onClick={() => setSelectedId(cand.id)}
                    style={{
                      background: isSelected ? 'var(--bg-surface)' : 'var(--bg-panel)',
                      border: isSelected ? `1.5px solid ${color}` : '1px solid var(--border-base)',
                      borderRadius: 6,
                      padding: '10px 12px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                      transition: 'all 120ms ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 2, background: `${color}18`, color: color, border: `1px solid ${color}40` }}>
                        {archetypeBadge}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                        {cand.id}
                      </span>
                    </div>

                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--text-secondary)' }}>
                      <strong style={{ textTransform: 'capitalize' }}>{p.shape}</strong> · {String(p.wallMaterial).replace(/_/g, ' ')} ({p.insulation}mm)
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, background: 'var(--bg-base)', padding: 4, borderRadius: 3, border: '1px solid var(--border-dim)' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 6.5, color: 'var(--text-muted)' }}>DEMAND</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'var(--warn)' }}>{(r.heatingDemand ?? 0).toFixed(1)}k</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 6.5, color: 'var(--text-muted)' }}>COST</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'var(--solar)' }}>₹{Math.round((r.cost ?? 0) / 1000)}k</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 6.5, color: 'var(--text-muted)' }}>WEIGHT</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'var(--text-primary)' }}>{Math.round((r.weight ?? 0) / 1000)}t</div>
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 6.5, color: 'var(--text-muted)' }}>LOSS</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'var(--cool)' }}>{Math.abs(r.heatLoss ?? 0).toFixed(0)}W</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── 4. Modal Footer ── */}
        <div
          style={{
            padding: '8px 18px',
            borderTop: '1px solid var(--border-dim)',
            background: 'var(--bg-panel)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-mono)',
            fontSize: 8.5,
            color: 'var(--text-muted)',
          }}
        >
          <div>
            Fast Pareto Surrogate Optimization · Objective space: 6D non-dominated sorting
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-base)',
              borderRadius: 3,
              padding: '4px 10px',
              fontFamily: 'var(--font-mono)',
              fontSize: 8.5,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              minHeight: 32,
            }}
          >
            Close Explorer
          </button>
        </div>
      </div>
    </div>
  )
}

export default ParetoCandidateExplorer

