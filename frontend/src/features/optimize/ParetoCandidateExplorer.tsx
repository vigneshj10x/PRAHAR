/**
 * ParetoCandidateExplorer.tsx
 *
 * Interactive Pareto-optimal design set explorer powered by the fast ML surrogate model.
 * Displays 3-6 non-dominated candidates with a Recharts scatter plot trade-off visualizer
 * and a specification table allowing users to select and verify candidates with high-fidelity physics.
 */

import { useState, useMemo, type FC } from 'react'
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
  Sparkles,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react'
import type { CandidateDesign } from '@/domain'

interface ParetoCandidateExplorerProps {
  candidates: CandidateDesign[]
  locationName: string
  budget: number
  weightLimit: number
  occupants: number
  onSelectCandidate: (candidate: CandidateDesign) => void
  onClose: () => void
}

type ChartMetric = 'cost_vs_comfort' | 'weight_vs_heatloss' | 'cost_vs_heating'

const ARCHETYPE_COLORS: Record<string, string> = {
  'cand-pareto-01': '#16a34a', // Green - Budget
  'cand-pareto-02': '#0284c7', // Sky blue - Tactical/Ultralight
  'cand-pareto-03': '#ea580c', // Orange - Thermal Protection
  'cand-pareto-04': '#9333ea', // Purple - Super-Insulated
  'cand-pareto-05': '#d97706', // Amber - Passive Solar
  'cand-pareto-06': '#0d9488', // Teal - Balanced
}

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
  const [metricView, setMetricView] = useState<ChartMetric>('cost_vs_comfort')

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
      }
    })
  }, [candidates])

  // Chart axes configuration based on selected metricView
  const chartConfig = useMemo(() => {
    switch (metricView) {
      case 'weight_vs_heatloss':
        return {
          xKey: 'weight',
          yKey: 'heatLoss',
          xLabel: 'Envelope Weight (kg)',
          yLabel: 'Fabric Heat Loss (W/m²)',
          xUnit: ' kg',
          yUnit: ' W/m²',
        }
      case 'cost_vs_heating':
        return {
          xKey: 'cost',
          yKey: 'heatingDemand',
          xLabel: 'Construction Cost (₹)',
          yLabel: 'Heating Demand (kWh/day)',
          xUnit: ' ₹',
          yUnit: ' kWh/d',
        }
      case 'cost_vs_comfort':
      default:
        return {
          xKey: 'cost',
          yKey: 'comfort',
          xLabel: 'Construction Cost (₹)',
          yLabel: 'Thermal Comfort Hours (%)',
          xUnit: ' ₹',
          yUnit: '%',
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
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-primary)',
            minWidth: 200,
          }}
        >
          <div style={{ fontWeight: 700, color: d.color, marginBottom: 4 }}>
            {d.id} · {d.shape}
          </div>
          <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>
            {d.wallMaterial} ({d.insulation}mm ins.)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3px 8px' }}>
            <div>Cost: <strong>₹{Math.round(d.cost).toLocaleString()}</strong></div>
            <div>Comfort: <strong>{d.comfort.toFixed(1)}%</strong></div>
            <div>Weight: <strong>{Math.round(d.weight).toLocaleString()} kg</strong></div>
            <div>T_mean: <strong>{d.indoorTemp > 0 ? `+${d.indoorTemp.toFixed(1)}` : d.indoorTemp.toFixed(1)}°C</strong></div>
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
        background: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9998,
        backdropFilter: 'blur(5px)',
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
          width: 980,
          maxWidth: '96vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden',
        }}
      >
        {/* ── Modal Header ── */}
        <div
          style={{
            padding: '14px 20px',
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
                width: 28,
                height: 28,
                borderRadius: 4,
                background: 'var(--solar-glow)',
                border: '1px solid var(--solar)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Zap size={15} color="var(--solar)" />
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
                Pareto-Optimal Design Candidates
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 600,
                    background: 'var(--ok-glow)',
                    color: 'var(--ok)',
                    border: '1px solid var(--ok)',
                    padding: '1px 6px',
                    borderRadius: 3,
                  }}
                >
                  ML Surrogate Explorer
                </span>
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9.5,
                  color: 'var(--text-muted)',
                  marginTop: 2,
                }}
              >
                Evaluated 3,000 architectural permutations across 6 objectives for{' '}
                <strong style={{ color: 'var(--text-secondary)' }}>{locationName}</strong>
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
            }}
            title="Close Explorer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Requirements Strip ── */}
        <div
          style={{
            padding: '8px 20px',
            background: 'var(--bg-base)',
            borderBottom: '1px solid var(--border-dim)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            color: 'var(--text-muted)',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span>
              Budget Ceiling: <strong style={{ color: 'var(--text-primary)' }}>₹{budget.toLocaleString()}</strong>
            </span>
            <span>·</span>
            <span>
              Weight Limit: <strong style={{ color: 'var(--text-primary)' }}>{weightLimit.toLocaleString()} kg</strong>
            </span>
            <span>·</span>
            <span>
              Target Personnel: <strong style={{ color: 'var(--text-primary)' }}>{occupants} prs</strong>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--text-faint)' }}>Trade-off View:</span>
            {(
              [
                { key: 'cost_vs_comfort', label: 'Cost vs Comfort' },
                { key: 'weight_vs_heatloss', label: 'Weight vs Heat Loss' },
                { key: 'cost_vs_heating', label: 'Cost vs Heating Demand' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setMetricView(tab.key)}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 8.5,
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: 3,
                  border:
                    metricView === tab.key
                      ? '1px solid var(--solar)'
                      : '1px solid var(--border-dim)',
                  background:
                    metricView === tab.key ? 'var(--solar-glow)' : 'var(--bg-surface)',
                  color:
                    metricView === tab.key ? 'var(--solar-dim)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Scrollable Body ── */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {/* ── Recharts Scatter Visualizer ── */}
          <div
            style={{
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-dim)',
              borderRadius: 6,
              padding: '12px 16px 8px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
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
                Pareto Frontier Trade-Off Scatter Map ({chartConfig.xLabel} vs {chartConfig.yLabel})
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 8.5,
                  color: 'var(--text-muted)',
                }}
              >
                Click dot to highlight candidate specification
              </div>
            </div>

            <div style={{ width: '100%', height: 165 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-dim)" />
                  <XAxis
                    type="number"
                    dataKey={chartConfig.xKey}
                    name={chartConfig.xLabel}
                    unit={chartConfig.xUnit}
                    tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-muted)' }}
                    stroke="var(--border-base)"
                  />
                  <YAxis
                    type="number"
                    dataKey={chartConfig.yKey}
                    name={chartConfig.yLabel}
                    unit={chartConfig.yUnit}
                    tick={{ fontFamily: 'var(--font-mono)', fontSize: 9, fill: 'var(--text-muted)' }}
                    stroke="var(--border-base)"
                  />
                  <ZAxis range={[120, 120]} />
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
                        stroke={entry.id === selectedId ? '#0f172a' : '#ffffff'}
                        strokeWidth={entry.id === selectedId ? 2.5 : 1}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Candidate Set Cards / List ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              Candidate Design Archetypes ({candidates.length} Available)
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))',
                gap: 10,
              }}
            >
              {candidates.map((cand, idx) => {
                const isSelected = cand.id === selectedId
                const p = cand.params as any
                const r = cand.results as any
                const color = ARCHETYPE_COLORS[cand.id] || '#64748b'

                // Extract archetype label from tradeoffNotes if formatted
                const noteParts = (cand.tradeoffNotes || '').split(':')
                const archetypeBadge =
                  noteParts.length > 1 ? noteParts[0].trim() : `Candidate ${idx + 1}`
                const descriptionText =
                  noteParts.length > 1 ? noteParts.slice(1).join(':').trim() : cand.tradeoffNotes

                return (
                  <div
                    key={cand.id}
                    onClick={() => setSelectedId(cand.id)}
                    style={{
                      background: isSelected ? 'var(--bg-surface)' : 'var(--bg-panel)',
                      border: isSelected ? `2px solid ${color}` : '1px solid var(--border-base)',
                      borderRadius: 6,
                      padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'all 150ms ease',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      boxShadow: isSelected
                        ? '0 6px 18px rgba(0,0,0,0.06)'
                        : '0 1px 3px rgba(0,0,0,0.02)',
                    }}
                  >
                    {/* Top Row: Candidate ID & Archetype */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 8.5,
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: 3,
                            background: `${color}18`,
                            color: color,
                            border: `1px solid ${color}40`,
                            textTransform: 'uppercase',
                          }}
                        >
                          {archetypeBadge}
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 10,
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                          }}
                        >
                          {cand.id}
                        </span>
                      </div>

                      {isSelected && (
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 8,
                            fontWeight: 700,
                            color: 'var(--solar-dim)',
                            background: 'var(--solar-glow)',
                            padding: '2px 6px',
                            borderRadius: 3,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 3,
                          }}
                        >
                          <Sparkles size={9} />
                          ACTIVE FOCUS
                        </span>
                      )}
                    </div>

                    {/* Architecture Specs */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        fontFamily: 'var(--font-mono)',
                        fontSize: 9.5,
                        color: 'var(--text-secondary)',
                        flexWrap: 'wrap',
                      }}
                    >
                      <span style={{ textTransform: 'capitalize' }}>
                        <strong>{p.shape}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        Wall: <strong>{String(p.wallMaterial).replace(/_/g, ' ')}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        Roof: <strong>{String(p.roofMaterial || 'insulated').replace(/_/g, ' ')}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        Ins: <strong>{p.insulation}mm</strong>
                      </span>
                      <span>·</span>
                      <span>
                        Open: <strong>{p.opening ?? p.openingRatio}%</strong>
                      </span>
                    </div>

                    {/* Key Numbers Grid */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(6, 1fr)',
                        gap: 6,
                        background: 'var(--bg-base)',
                        border: '1px solid var(--border-dim)',
                        borderRadius: 4,
                        padding: '6px 8px',
                      }}
                    >
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          T_MEAN
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {(r.indoorTemp ?? r.meanIndoorTemp ?? 0) > 0 ? `+${(r.indoorTemp ?? r.meanIndoorTemp ?? 0).toFixed(1)}` : (r.indoorTemp ?? r.meanIndoorTemp ?? 0).toFixed(1)}°C
                        </div>
                      </div>

                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          COMFORT
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, color: 'var(--ok)' }}>
                          {(r.comfortPercent ?? ((r.comfortHours ?? 0) / 24) * 100).toFixed(1)}%
                        </div>
                      </div>

                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          HEAT LOSS
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, color: 'var(--cool)' }}>
                          {Math.abs(r.heatLoss ?? 0).toFixed(1)}
                          <span style={{ fontSize: 7.5 }}> W/m²</span>
                        </div>
                      </div>

                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          DEMAND
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, color: 'var(--warn)' }}>
                          {(r.heatingDemand ?? 0).toFixed(1)}
                          <span style={{ fontSize: 7.5 }}> kWh</span>
                        </div>
                      </div>

                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          WEIGHT
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {Math.round(r.weight ?? 0).toLocaleString()}
                          <span style={{ fontSize: 7.5 }}> kg</span>
                        </div>
                      </div>

                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          COST
                        </div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, fontWeight: 700, color: 'var(--solar-dim)' }}>
                          ₹{Math.round(r.cost ?? 0).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Tradeoff Rationale */}
                    <div
                      style={{
                        fontFamily: 'var(--font-ui)',
                        fontSize: 9.5,
                        color: 'var(--text-muted)',
                        lineHeight: 1.4,
                      }}
                    >
                      {descriptionText}
                    </div>

                    {/* Selection Button */}
                    <div style={{ marginTop: 'auto', paddingTop: 4 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onSelectCandidate(cand)
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                          background: isSelected ? 'var(--solar)' : 'var(--bg-surface)',
                          color: isSelected ? '#ffffff' : 'var(--text-primary)',
                          border: isSelected ? '1px solid var(--solar)' : '1px solid var(--border-base)',
                          borderRadius: 4,
                          padding: '7px 10px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: 9.5,
                          fontWeight: 700,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          cursor: 'pointer',
                          transition: 'all 150ms ease',
                        }}
                      >
                        <ShieldCheck size={13} />
                        Select & Verify with Physics
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          style={{
            padding: '10px 20px',
            borderTop: '1px solid var(--border-dim)',
            background: 'var(--bg-panel)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--text-muted)',
          }}
        >
          <div>
            ISO 13790 / ISO 6946 Validation Seam · Step 1: ML Fast Pareto Selection → Step 2: Numerical Verification
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid var(--border-base)',
              borderRadius: 3,
              padding: '4px 10px',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default ParetoCandidateExplorer
