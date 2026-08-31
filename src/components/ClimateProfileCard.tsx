/**
 * ClimateProfileCard.tsx
 *
 * Compact engineering technical readout showing site climate characteristics
 * and design priorities dynamically for the active location.
 *
 * Features collapsible toggle, monospace telemetry rows, and design priority tags.
 */
import { useState, type FC } from 'react'
import { MapPin, ChevronDown, ChevronUp, Sun, Wind, Thermometer, ShieldAlert, Sparkles } from 'lucide-react'
import { useDesignStore } from '../store/designStore'
import { getLocationProfile } from '../data/locations'

const ClimateProfileCard: FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const locationId = useDesignStore((s) => s.location)
  const profile = getLocationProfile(locationId)

  return (
    <div
      id="climate-profile-card"
      style={{
        position: 'absolute',
        top: 8,
        right: 8,
        width: collapsed ? 'auto' : 280,
        maxWidth: 'calc(100% - 16px)',
        background: 'var(--bg-panel)',
        border: '1px solid var(--border-base)',
        borderRadius: 4,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08), 0 0 0 1px var(--border-dim)',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MapPin size={12} color="var(--solar)" strokeWidth={2} />
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-primary)',
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
            }}
          >
            {profile.altitude}
          </span>
        </div>

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
                label: 'Solar Peak',
                val: profile.solarPotential,
              },
              {
                icon: <Sun size={10} color="var(--solar-dim)" />,
                label: 'Sunshine',
                val: profile.sunshine,
              },
              {
                icon: <Wind size={10} color="var(--text-secondary)" />,
                label: 'Wind',
                val: profile.wind,
              },
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
