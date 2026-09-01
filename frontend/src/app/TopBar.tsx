import type { FC } from 'react'
import { Cpu, Activity, Wifi } from 'lucide-react'
import { useDesignStore } from '@/store/designStore'
import { getLocationProfile } from '@/data/locations'

export const TopBar: FC = () => {
  const locationId = useDesignStore((s) => s.location)
  const loc = getLocationProfile(locationId)

  return (
    <header className="topbar" role="banner" id="topbar">

      {/* Brand mark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <Cpu size={15} color="var(--solar)" strokeWidth={1.5} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: '0.10em',
            color: 'var(--text-primary)',
            textTransform: 'uppercase',
            lineHeight: 1,
          }}>
            THERMO-SHIELD
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8.5,
            letterSpacing: '0.06em',
            color: 'var(--text-muted)',
            lineHeight: 1,
          }}>
            Area-Specific Passive Shelter Design Engine
          </span>
        </div>
      </div>

      <div className="topbar-div" />

      {/* Location + simulation context */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="status-dot solar" />
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          letterSpacing: '0.10em',
          color: 'var(--solar)',
          textTransform: 'uppercase',
          fontWeight: 700,
        }}>
          {loc.statusLine}
        </span>
      </div>

      <div style={{ flex: 1 }} />

      {/* Right: connection + performance indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Activity size={10} color="var(--text-muted)" strokeWidth={1.5} />
          <span className="label-mono" style={{ fontSize: 9.5, color: 'var(--text-secondary)', fontWeight: 600 }}>
            ALT&nbsp;{loc.altitude}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span className="label-mono" style={{ fontSize: 9.5, color: 'var(--text-secondary)', fontWeight: 600 }}>
            {loc.coordinates}
          </span>
        </div>
        <div className="topbar-div" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Wifi size={10} color="var(--cool)" strokeWidth={1.5} />
          <span className="label-mono" style={{ fontSize: 9.5, color: 'var(--cool)', fontWeight: 700 }}>READY</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div className="status-dot ok" />
          <span className="label-mono" style={{ fontSize: 9.5, color: 'var(--ok)', fontWeight: 700 }}>ENGINE OK</span>
        </div>
      </div>
    </header>
  )
}

export default TopBar
