/**
 * RiskAssessmentCard.tsx
 *
 * Professional Disaster Risk Intelligence component for site microclimate & terrain.
 * Assesses 7 critical environmental & structural hazard factors:
 *   1. Avalanche Exposure
 *   2. Glacial Lake Outburst Flood (GLOF)
 *   3. Landslide & Slope Instability
 *   4. Seismic Hazard (BIS IS 1893: 2016)
 *   5. Extreme Cold & Frostbite Risk
 *   6. Structural Snow Load
 *   7. Flash Flood & Drainage Runoff
 *
 * Uses established engineering workstation aesthetic, transparent source citations,
 * non-color-only severity indicators, keyboard accessibility, and zero fake monitoring claims.
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
  FileText,
  Compass,
} from 'lucide-react'
import { useRiskStore, type RiskFactorItem } from '@/store/riskStore'

const LEVEL_STYLES: Record<string, { color: string; bg: string; border: string; label: string }> = {
  Critical: {
    color: 'var(--danger, #ef4444)',
    bg: 'rgba(239, 68, 68, 0.12)',
    border: 'rgba(239, 68, 68, 0.4)',
    label: 'CRITICAL',
  },
  High: {
    color: 'var(--warn, #f97316)',
    bg: 'rgba(249, 115, 22, 0.12)',
    border: 'rgba(249, 115, 22, 0.4)',
    label: 'HIGH',
  },
  Moderate: {
    color: 'var(--solar, #eab308)',
    bg: 'rgba(234, 179, 8, 0.12)',
    border: 'rgba(234, 179, 8, 0.4)',
    label: 'MODERATE',
  },
  Low: {
    color: 'var(--ok, #10b981)',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.4)',
    label: 'LOW',
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
  const [collapsed, setCollapsed] = useState(false)
  const [showSources, setShowSources] = useState(false)
  const [expandedFactor, setExpandedFactor] = useState<string | null>(null)
  const { data, isLoading, error } = useRiskStore()

  if (!data && !isLoading && !error) return null

  // Determine highest severity level
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
        width: '100%',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-dim)',
        borderRadius: 4,
        overflow: 'hidden',
        transition: 'all 150ms ease',
      }}
    >
      {/* ── 1. Header Strip ── */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
        aria-controls="risk-assessment-body"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 10px',
          background: 'var(--bg-surface)',
          border: 'none',
          borderBottom: collapsed ? 'none' : '1px solid var(--border-dim)',
          cursor: 'pointer',
          minHeight: 44,
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <ShieldAlert size={13} style={{ color: badgeStyle.color, flexShrink: 0 }} />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9.5,
              fontWeight: 700,
              letterSpacing: '0.08em',
              color: 'var(--text-primary)',
              textTransform: 'uppercase',
            }}
          >
            DISASTER RISK INTELLIGENCE
          </span>
          {data && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 8,
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
              {badgeStyle.label} OVERALL
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isLoading && <Loader2 size={11} className="animate-spin" style={{ color: 'var(--solar)' }} />}
          {collapsed ? (
            <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
          ) : (
            <ChevronUp size={13} style={{ color: 'var(--text-muted)' }} />
          )}
        </div>
      </button>

      {/* ── 2. Assessment Body ── */}
      {!collapsed && (
        <div
          id="risk-assessment-body"
          style={{
            padding: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            background: 'var(--bg-base)',
          }}
        >
          {/* Loading state */}
          {isLoading && !data && (
            <div
              style={{
                padding: '16px 0',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: 9,
                fontFamily: 'var(--font-mono)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Loader2 size={13} className="animate-spin" color="var(--solar)" />
              Sampling 9-point terrain gradient & BIS seismic zones…
            </div>
          )}

          {/* Error state */}
          {error && (
            <div
              style={{
                padding: '6px 8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 3,
                color: 'var(--danger)',
                fontSize: 8.5,
                fontFamily: 'var(--font-mono)',
              }}
            >
              ERROR: {error}
            </div>
          )}

          {data && (
            <>
              {/* ── 3. Site Geomorphology Strip (Climate ↔ Risk Connection) ── */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 4,
                  background: 'var(--bg-panel)',
                  border: '1px solid var(--border-dim)',
                  borderRadius: 3,
                  padding: '4px 6px',
                }}
              >
                <div>
                  <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    ELEVATION
                  </div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {data.location.elevation}m
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    SLOPE GRADIENT
                  </div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {data.location.slopeAngle}°
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    ASPECT
                  </div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Compass size={9} color="var(--solar)" />
                    {data.location.aspect}
                  </div>
                </div>
              </div>

              {/* ── 4. Factual Risk Context & Multi-Hazard Summary ── */}
              <div
                style={{
                  fontSize: 8.5,
                  lineHeight: 1.35,
                  padding: '6px 8px',
                  background: badgeStyle.bg,
                  border: `1px solid ${badgeStyle.border}`,
                  borderRadius: 3,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <span style={{ fontWeight: 700, color: badgeStyle.color }}>7-FACTOR SITE HAZARD PROFILE: </span>
                {data.overallRiskSummary}
              </div>

              {/* ── 5. Risk Factor Matrix (7 Categories) ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div
                  style={{
                    fontSize: 7.5,
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Evaluated Risk Factors ({data.risks.length})
                </div>

                {data.risks.map((risk: RiskFactorItem) => {
                  const style = LEVEL_STYLES[risk.level] || LEVEL_STYLES.Low
                  const Icon = FACTOR_ICONS[risk.factor] || ShieldAlert
                  const isExpanded = expandedFactor === risk.factor

                  return (
                    <div
                      key={risk.factor}
                      onClick={() => setExpandedFactor(isExpanded ? null : risk.factor)}
                      style={{
                        padding: '6px 8px',
                        background: isExpanded ? 'var(--bg-surface)' : 'var(--bg-panel)',
                        border: '1px solid var(--border-dim)',
                        borderLeft: `3px solid ${style.color}`,
                        borderRadius: 3,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        transition: 'background 120ms ease',
                      }}
                    >
                      {/* Factor Header */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Icon size={11} style={{ color: style.color }} />
                          <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                            {risk.title}
                          </span>
                        </div>

                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 7.5,
                            fontWeight: 700,
                            color: style.color,
                            background: style.bg,
                            border: `1px solid ${style.border}`,
                            padding: '1px 4px',
                            borderRadius: 2,
                            textTransform: 'uppercase',
                          }}
                        >
                          {style.label}
                        </span>
                      </div>

                      {/* Justification Text */}
                      <div style={{ fontSize: 8, color: 'var(--text-secondary)', lineHeight: 1.3, fontFamily: 'var(--font-mono)' }}>
                        {risk.justification}
                      </div>

                      {/* Expanded Source Citation Details */}
                      {(isExpanded || showSources) && (
                        <div
                          style={{
                            fontSize: 7.5,
                            color: 'var(--text-muted)',
                            fontFamily: 'var(--font-mono)',
                            marginTop: 2,
                            paddingTop: 3,
                            borderTop: '1px dashed var(--border-dim)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <FileText size={8} color="var(--text-muted)" />
                          <span><strong>ASSESSMENT SOURCE:</strong> {risk.dataSource}</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* ── 6. Source Transparency & Disclaimer ── */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                <button
                  type="button"
                  onClick={() => setShowSources(!showSources)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: 8,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    minHeight: 32,
                  }}
                >
                  {showSources ? 'Hide Data Sources' : 'Show Data Sources'}
                </button>
              </div>

              <div
                style={{
                  fontSize: 7,
                  color: 'var(--text-muted)',
                  lineHeight: 1.25,
                  padding: '4px 6px',
                  background: 'var(--bg-panel)',
                  borderRadius: 2,
                  border: '1px dashed var(--border-dim)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                <span style={{ fontWeight: 700 }}>ASSESSMENT CITATION & DISCLAIMER: </span>
                {data.disclaimer}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default RiskAssessmentCard

