import type { FC } from 'react'
import { Cpu, Activity, Wifi, Box, Map, Compass, Layers } from 'lucide-react'
import { useDesignStore } from '@/store/designStore'
import { useClimateStore } from '@/store/climateStore'
import { useNavigationStore } from '@/store/navigationStore'
import { getLocationProfile } from '@/data/locations'

export const TopBar: FC = () => {
  const locationId = useDesignStore((s) => s.location)
  const activeProfile = useClimateStore((s) => s.activeProfile)
  const loc = activeProfile || getLocationProfile(locationId)

  const activePage = useNavigationStore((s) => s.activePage)
  const openMap = useNavigationStore((s) => s.openMap)
  const openWorkbench = useNavigationStore((s) => s.openWorkbench)
  const openLayerPage = useNavigationStore((s) => s.openLayerPage)

  return (
    <header className="topbar" role="banner" id="topbar">
      {/* Brand mark */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <Cpu size={15} color="var(--solar)" strokeWidth={1.5} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: '0.10em',
              color: 'var(--text-primary)',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            THERMO-SHIELD
          </span>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8.5,
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
              lineHeight: 1,
            }}
          >
            Area-Specific Passive Shelter Design Engine
          </span>
        </div>
      </div>

      <div className="topbar-div" />

      {/* Primary Page Navigation Tabs (Workbench vs Full Map View vs Layer Analytics) */}
      <nav
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'var(--bg-base)',
          padding: '3px',
          borderRadius: 6,
          border: '1px solid var(--border-base)',
          marginLeft: 8,
          marginRight: 8,
        }}
        aria-label="Primary Navigation"
      >
        <button
          onClick={openWorkbench}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: activePage === 'workbench' ? 700 : 500,
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
            border: activePage === 'workbench' ? '1px solid var(--border-bright)' : '1px solid transparent',
            background: activePage === 'workbench' ? 'var(--bg-surface)' : 'transparent',
            color: activePage === 'workbench' ? 'var(--text-primary)' : 'var(--text-muted)',
            boxShadow: activePage === 'workbench' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.15s ease',
          }}
          title="Switch to 3D Digital Twin Simulation Workbench"
        >
          <Box size={13} color={activePage === 'workbench' ? 'var(--solar)' : 'currentColor'} />
          <span>3D DIGITAL TWIN</span>
        </button>

        <button
          onClick={openMap}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: activePage === 'map' ? 700 : 500,
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
            border: activePage === 'map' ? '1px solid var(--solar)' : '1px solid transparent',
            background: activePage === 'map' ? 'var(--bg-surface)' : 'transparent',
            color: activePage === 'map' ? 'var(--solar)' : 'var(--text-muted)',
            boxShadow: activePage === 'map' ? '0 1px 3px rgba(217,119,6,0.15)' : 'none',
            transition: 'all 0.15s ease',
          }}
          title="Open Dedicated Full Map View for Exact Coordinate Pointing"
        >
          <Map size={13} color={activePage === 'map' ? 'var(--solar)' : 'currentColor'} />
          <span>FULL MAP VIEW</span>
          <span
            style={{
              fontSize: 8.5,
              background: activePage === 'map' ? 'rgba(217,119,6,0.15)' : 'rgba(2,132,199,0.12)',
              color: activePage === 'map' ? 'var(--solar)' : 'var(--cool)',
              padding: '1px 5px',
              borderRadius: 3,
              fontWeight: 700,
            }}
          >
            GIS
          </span>
        </button>

        <button
          onClick={() => openLayerPage()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: activePage === 'layer-analytics' ? 700 : 500,
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
            border: activePage === 'layer-analytics' ? '1px solid #8b5cf6' : '1px solid transparent',
            background: activePage === 'layer-analytics' ? 'var(--bg-surface)' : 'transparent',
            color: activePage === 'layer-analytics' ? '#8b5cf6' : 'var(--text-muted)',
            boxShadow: activePage === 'layer-analytics' ? '0 1px 3px rgba(139,92,246,0.15)' : 'none',
            transition: 'all 0.15s ease',
          }}
          title="Open Dedicated Full-Page Layer-by-Layer EnergyPlus & Physics Workstation"
        >
          <Layers size={13} color={activePage === 'layer-analytics' ? '#8b5cf6' : 'currentColor'} />
          <span>LAYER ANALYTICS</span>
          <span
            style={{
              fontSize: 8.5,
              background: activePage === 'layer-analytics' ? 'rgba(139,92,246,0.15)' : 'rgba(100,116,139,0.12)',
              color: activePage === 'layer-analytics' ? '#8b5cf6' : 'var(--text-muted)',
              padding: '1px 5px',
              borderRadius: 3,
              fontWeight: 700,
            }}
          >
            7 LAYERS
          </span>
        </button>
      </nav>

      <div className="topbar-div" />

      {/* Location + simulation context badge (Clickable to open map) */}
      <button
        onClick={openMap}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: '2px 6px',
          borderRadius: 4,
        }}
        title="Click to view & pick exact location on Full Map"
      >
        <div className="status-dot solar" />
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.08em',
            color: 'var(--solar)',
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          {loc.statusLine}
        </span>
      </button>

      <div style={{ flex: 1 }} />

      {/* Right: connection + performance indicators */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}
          onClick={openMap}
          title="Click to inspect altitude & coordinates on Full Map"
        >
          <Activity size={10} color="var(--text-muted)" strokeWidth={1.5} />
          <span className="label-mono" style={{ fontSize: 9.5, color: 'var(--text-secondary)', fontWeight: 600 }}>
            ALT&nbsp;{loc.altitude}
          </span>
        </div>

        <div
          style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}
          onClick={openMap}
          title="Click to point exact coordinates on Full Map"
        >
          <Compass size={11} color="var(--solar)" />
          <span className="label-mono" style={{ fontSize: 9.5, color: 'var(--text-secondary)', fontWeight: 600 }}>
            {loc.coordinates}
          </span>
        </div>

        <div className="topbar-div" />

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <Wifi size={10} color="var(--cool)" strokeWidth={1.5} />
          <span className="label-mono" style={{ fontSize: 9.5, color: 'var(--cool)', fontWeight: 700 }}>
            READY
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div className="status-dot ok" />
          <span className="label-mono" style={{ fontSize: 9.5, color: 'var(--ok)', fontWeight: 700 }}>
            ENGINE OK
          </span>
        </div>
      </div>
    </header>
  )
}

export default TopBar
