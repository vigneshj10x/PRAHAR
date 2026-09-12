/**
 * ClimateProfileCard.tsx
 *
 * High-fidelity engineering technical telemetry readout showing site microclimate
 * characteristics, Open-Meteo & NASA POWER merged telemetry, and live design priorities.
 *
 * Features collapsible toggle, monospace telemetry rows, loading skeleton, error handling,
 * and data source badges.
 */
import { useState, type FC } from 'react'
import {
  MapPin,
  ChevronDown,
  ChevronUp,
  Sun,
  Wind,
  Thermometer,
  ShieldAlert,
  Sparkles,
  Droplets,
  CloudSnow,
  Loader2,
  AlertCircle,
  Database,
} from 'lucide-react'
import { useClimateStore } from '@/store/climateStore'

export const ClimateProfileCard: FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const { activeProfile, isLoading, error, dataSource, fetchClimateForLocation } = useClimateStore()

  const profile = activeProfile

  return (
    <div
      id="climate-profile-card"
      style={{
        position: 'relative',
        width: collapsed ? 'auto' : 300,
        maxWidth: 'calc(100% - 16px)',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-base)',
        borderRadius: 4,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--border-dim)',
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
          background: 'var(--bg-surface)',
          borderBottom: collapsed ? 'none' : '1px solid var(--border-dim)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        title="Toggle Climate Profile telemetry"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          <MapPin size={12} color="var(--solar)" strokeWidth={2} style={{ flexShrink: 0 }} />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {profile.name.toUpperCase()}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 7.5,
              padding: '1px 4px',
              borderRadius: 2,
              background: 'var(--cool-glow)',
              color: 'var(--cool)',
              fontWeight: 600,
              border: '1px solid var(--cool)',
              flexShrink: 0,
            }}
          >
            {profile.altitude}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {isLoading && <Loader2 size={11} className="spin" color="var(--solar)" />}
          <button
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label={collapsed ? 'Expand Climate Profile' : 'Collapse Climate Profile'}
          >
            {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </button>
        </div>
      </div>

      {/* ── Body (Collapsible) ── */}
      {!collapsed && (
        <div
          style={{
            padding: '8px 10px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            background: 'var(--bg-panel)',
            maxHeight: 'calc(100vh - 280px)',
            overflowY: 'auto',
          }}
        >
          {/* Loading state indicator */}
          {isLoading && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 8px',
                background: 'var(--solar-glow)',
                border: '1px solid var(--solar)',
                borderRadius: 2,
                fontSize: 8,
                fontFamily: 'var(--font-mono)',
                color: 'var(--solar)',
              }}
            >
              <Loader2 size={10} className="spin" />
              <span>Querying Open-Meteo & NASA POWER APIs…</span>
            </div>
          )}

          {/* Error state */}
          {error && !isLoading && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                padding: '6px 8px',
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid #ef4444',
                borderRadius: 2,
                fontSize: 8,
                fontFamily: 'var(--font-mono)',
                color: '#ef4444',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <AlertCircle size={10} />
                <span style={{ fontWeight: 700 }}>Telemetry Failure</span>
              </div>
              <span style={{ fontSize: 7.5, lineHeight: 1.2 }}>{error}</span>
              <button
                onClick={() => fetchClimateForLocation(profile.lat, profile.lon, profile.name, profile.altitudeNum)}
                style={{
                  alignSelf: 'flex-start',
                  background: 'transparent',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                  padding: '2px 6px',
                  borderRadius: 2,
                  fontSize: 7.5,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-mono)',
                  marginTop: 2,
                }}
              >
                Retry Fetch
              </button>
            </div>
          )}

          {/* Source & Zone Badge */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: 7.5,
              fontFamily: 'var(--font-mono)',
              padding: '2px 4px',
              background: 'var(--bg-surface)',
              borderRadius: 2,
              border: '1px solid var(--border-dim)',
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>
              ZONE: <strong style={{ color: 'var(--text-primary)' }}>{profile.zone}</strong>
            </span>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                color: 'var(--solar)',
                fontWeight: 600,
              }}
            >
              <Database size={8} />
              {dataSource === 'merged'
                ? 'MERGED (OM + NASA)'
                : dataSource.toUpperCase()}
            </span>
          </div>

          {/* Telemetry rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {[
              {
                icon: <Thermometer size={10} color="var(--cool)" />,
                label: 'Ambient Temp',
                val: profile.ambientTempRange,
              },
              {
                icon: <Sun size={10} color="var(--solar)" />,
                label: 'Solar Insolation',
                val: profile.solarPotential,
              },
              {
                icon: <Sun size={10} color="var(--solar-dim)" />,
                label: 'Sunshine',
                val: profile.sunshine,
              },
              {
                icon: <Wind size={10} color="var(--text-secondary)" />,
                label: 'Wind Speed',
                val: profile.wind,
              },
              ...(profile.humidity !== undefined
                ? [
                    {
                      icon: <Droplets size={10} color="#38bdf8" />,
                      label: 'Humidity (RH)',
                      val: `${profile.humidity.toFixed(1)}%`,
                    },
                  ]
                : []),
              ...(profile.snowfallMm !== undefined && profile.snowfallMm > 0
                ? [
                    {
                      icon: <CloudSnow size={10} color="#e2e8f0" />,
                      label: 'Snowfall / Depth',
                      val: `${profile.snowfallMm.toFixed(0)} mm / ${profile.snowDepthCm?.toFixed(0) || 0} cm`,
                    },
                  ]
                : []),
              {
                icon: <ShieldAlert size={10} color="var(--warn)" />,
                label: 'Night Loss',
                val: profile.nightHeatLoss,
              },
              {
                icon: <Sparkles size={10} color="var(--ok)" />,
                label: 'Solar Window',
                val: profile.solarOpportunity,
              },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  fontSize: 8.5,
                  padding: '3px 0',
                  borderBottom: '1px solid var(--border-dim)',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  {item.icon}
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)',
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                      fontSize: 8,
                    }}
                  >
                    {item.label}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-primary)',
                    fontWeight: 500,
                    textAlign: 'right',
                    fontSize: 8.5,
                  }}
                >
                  {item.val}
                </span>
              </div>
            ))}
          </div>

          {/* Design Priorities Section */}
          <div style={{ marginTop: 4 }}>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 8,
                fontWeight: 700,
                color: 'var(--text-muted)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: 4,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              Design Priorities ({profile.zone})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {profile.designPriorities?.map((p: string, i: number) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 5,
                    fontSize: 8,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.3,
                  }}
                >
                  <span
                    style={{
                      color: 'var(--solar)',
                      fontWeight: 700,
                      fontSize: 7.5,
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}.
                  </span>
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClimateProfileCard
