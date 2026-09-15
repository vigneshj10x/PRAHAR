/**
 * RiskAssessmentCard.tsx
 *
 * High-fidelity engineering disaster risk assessment card for high-altitude/Himalayan terrain.
 * Assesses 7 critical environmental & structural hazard factors:
 *   1. Avalanche Exposure
 *   2. Glacial Lake Outburst Flood (GLOF)
 *   3. Landslide & Slope Instability
 *   4. Seismic Hazard (BIS IS 1893: 2016)
 *   5. Extreme Cold & Frostbite Risk
 *   6. Structural Snow Load
 *   7. Flash Flood & Drainage Runoff
 *
 * Matching dark engineering visual theme with collapsible strip, color-coded level badges,
 * terrain gradient telemetry, and technical source citations.
 */
import { useState, type FC } from 'react'
import {
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Mountain,
  Snowflake,
  Activity,
  AlertTriangle,
  Flame,
  Layers,
  Loader2,
} from 'lucide-react'
import { useRiskStore, type RiskFactorItem } from '@/store/riskStore'

const LEVEL_STYLES: Record<string, { color: string; bg: string; border: string }> = {
  Critical: {
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.4)',
  },
  High: {
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.12)',
    border: 'rgba(249, 115, 22, 0.4)',
  },
  Moderate: {
    color: '#eab308',
    bg: 'rgba(234, 179, 8, 0.12)',
    border: 'rgba(234, 179, 8, 0.4)',
  },
  Low: {
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.4)',
  },
}

const FACTOR_ICONS: Record<string, any> = {
  avalanche: Snowflake,
  glof: Layers,
  landslide: Mountain,
  seismic: Activity,
  extreme_cold: Flame,
  snow_load: Snowflake,
  flash_flood: AlertTriangle,
}

export const RiskAssessmentCard: FC = () => {
  const [collapsed, setCollapsed] = useState(true)
  const [showSources, setShowSources] = useState(false)
  const { data, isLoading, error } = useRiskStore()

  if (!data && !isLoading && !error) return null

  // Calculate highest severity level
  let highestLevel = 'Low'
  if (data?.risks) {
    if (data.risks.some((r) => r.level === 'Critical')) highestLevel = 'Critical'
    else if (data.risks.some((r) => r.level === 'High')) highestLevel = 'High'
    else if (data.risks.some((r) => r.level === 'Moderate')) highestLevel = 'Moderate'
  }

  const badgeStyle = LEVEL_STYLES[highestLevel] || LEVEL_STYLES.Low

  return (
    <div
      id="risk-assessment-card"
      style={{
        width: collapsed ? 'auto' : 320,
        maxWidth: 'calc(100vw - 24px)',
        background: 'var(--bg-panel, #0f172a)',
        border: '1px solid var(--border-base, #334155)',
        borderRadius: 4,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.45), 0 0 0 1px var(--border-dim, rgba(255,255,255,0.05))',
        zIndex: 20,
        overflow: 'hidden',
        transition: 'all 200ms ease',
        pointerEvents: 'auto',
      }}
    >
      {/* ── Header / Toggle Strip ── */}
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          background: 'var(--bg-surface, #1e293b)',
          borderBottom: collapsed ? 'none' : '1px solid var(--border-dim, #334155)',
          cursor: 'pointer',
          userSelect: 'none',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <ShieldAlert size={13} style={{ color: badgeStyle.color, flexShrink: 0 }} />
          <span
            style={{
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'var(--text-primary, #f8fafc)',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            DISASTER RISK
          </span>
          {data && (
            <span
              style={{
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: 8.5,
                fontWeight: 700,
                color: badgeStyle.color,
                background: badgeStyle.bg,
                border: `1px solid ${badgeStyle.border}`,
                padding: '1px 5px',
                borderRadius: 2,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {highestLevel}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isLoading && <Loader2 size={11} className="animate-spin" style={{ color: 'var(--solar, #f59e0b)' }} />}
          {collapsed ? (
            <ChevronDown size={12} style={{ color: 'var(--text-muted, #94a3b8)' }} />
          ) : (
            <ChevronUp size={12} style={{ color: 'var(--text-muted, #94a3b8)' }} />
          )}
        </div>
      </div>

      {/* ── Expanded Content ── */}
      {!collapsed && (
        <div style={{ padding: '8px 10px', maxHeight: '420px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Loading state */}
          {isLoading && !data && (
            <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted, #94a3b8)', fontSize: 10, fontFamily: 'var(--font-mono, monospace)' }}>
              Sampling 9-point terrain gradient & seismic zones…
            </div>
          )}

          {/* Error state */}
          {error && (
            <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 2, color: '#f87171', fontSize: 9.5 }}>
              {error}
            </div>
          )}

          {data && (
            <>
              {/* ── Terrain Geomorphology HUD ── */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 4,
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-dim, #334155)',
                  borderRadius: 2,
                  padding: '4px 6px',
                }}
              >
                <div>
                  <div style={{ fontSize: 7.5, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-muted, #94a3b8)' }}>ELEVATION</div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-primary, #f8fafc)', fontFamily: 'var(--font-mono, monospace)' }}>
                    {data.location.elevation}m
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 7.5, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-muted, #94a3b8)' }}>SLOPE</div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-primary, #f8fafc)', fontFamily: 'var(--font-mono, monospace)' }}>
                    {data.location.slopeAngle}°
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 7.5, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-muted, #94a3b8)' }}>ASPECT</div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-primary, #f8fafc)', fontFamily: 'var(--font-mono, monospace)' }}>
                    {data.location.aspect}
                  </div>
                </div>
              </div>

              {/* ── Overall Multi-Hazard Summary ── */}
              <div
                style={{
                  fontSize: 9,
                  lineHeight: 1.35,
                  padding: '6px 8px',
                  background: badgeStyle.bg,
                  border: `1px solid ${badgeStyle.border}`,
                  borderRadius: 2,
                  color: 'var(--text-primary, #f8fafc)',
                }}
              >
                <span style={{ fontWeight: 700, color: badgeStyle.color }}>SITE HAZARD PROFILE: </span>
                {data.overallRiskSummary}
              </div>

              {/* ── 7 Risk Factor Rows ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.risks.map((risk: RiskFactorItem) => {
                  const style = LEVEL_STYLES[risk.level] || LEVEL_STYLES.Low
                  const Icon = FACTOR_ICONS[risk.factor] || ShieldAlert

                  return (
                    <div
                      key={risk.factor}
                      style={{
                        padding: '6px 8px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-dim, rgba(255, 255, 255, 0.06))',
                        borderLeft: `3px solid ${style.color}`,
                        borderRadius: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 3,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Icon size={11} style={{ color: style.color }} />
                          <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
                            {risk.title}
                          </span>
                        </div>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono, monospace)',
                            fontSize: 8,
                            fontWeight: 700,
                            color: style.color,
                            background: style.bg,
                            border: `1px solid ${style.border}`,
                            padding: '1px 4px',
                            borderRadius: 2,
                            textTransform: 'uppercase',
                          }}
                        >
                          {risk.level}
                        </span>
                      </div>

                      <div style={{ fontSize: 8.5, color: 'var(--text-secondary, #cbd5e1)', lineHeight: 1.3 }}>
                        {risk.justification}
                      </div>

                      {showSources && (
                        <div
                          style={{
                            fontSize: 7.5,
                            color: 'var(--text-muted, #94a3b8)',
                            fontFamily: 'var(--font-mono, monospace)',
                            marginTop: 2,
                            paddingTop: 2,
                            borderTop: '1px dashed var(--border-dim, rgba(255,255,255,0.06))',
                          }}
                        >
                          Src: {risk.dataSource}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* ── Toggle Sources & Disclaimer ── */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                <button
                  onClick={() => setShowSources(!showSources)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: 8,
                    fontFamily: 'var(--font-mono, monospace)',
                    color: 'var(--text-muted, #94a3b8)',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                  }}
                >
                  {showSources ? 'Hide Data Sources' : 'Show Data Sources'}
                </button>
              </div>

              <div
                style={{
                  fontSize: 7.5,
                  color: 'var(--text-muted, #94a3b8)',
                  lineHeight: 1.25,
                  padding: '4px 6px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: 2,
                  border: '1px dashed var(--border-dim, #334155)',
                }}
              >
                <span style={{ fontWeight: 600 }}>DISCLAIMER: </span>
                {data.disclaimer}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
