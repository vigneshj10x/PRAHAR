import { Suspense, useState, useEffect, useRef, type FC } from 'react'
import { RotateCcw, Maximize2, Minimize2, Sun, Mountain, Box } from 'lucide-react'
import { useDesignStore } from '@/store/designStore'
import { useVisualizationStore } from '@/store/visualizationStore'
import { useClimateStore } from '@/store/climateStore'
import type { CameraViewMode } from '@/domain'
import { getLocationProfile } from '@/data/locations'
import ShelterScene from './ShelterScene'
import VisualizationModeToggle from './VisualizationModeToggle'
import ClimateProfileCard from '@/features/location/ClimateProfileCard'
import { SectionLegend } from './SectionLegend'
import { LayerInspectorModal } from './LayerInspectorModal'
import { degreesToCompass } from '@/lib/formatters'

const VIEW_MODES: Array<{ id: CameraViewMode; label: string; tooltip: string }> = [
  { id: 'perspective', label: 'Perspective', tooltip: '3D Free Orbit Perspective View' },
  { id: 'top', label: 'Top Plan', tooltip: '2D Top Down Plan View' },
  { id: 'south', label: 'South Elev', tooltip: 'South Façade Elevation View' },
  { id: 'section', label: 'Section', tooltip: 'Transverse Architectural Cutaway View' },
]

export const CenterPanel: FC = () => {
  const { shape, orientation, length, width, height, location } = useDesignStore()
  const activeProfile = useClimateStore((s) => s.activeProfile)
  const viewMode = useVisualizationStore((s) => s.viewMode)
  const setViewMode = useVisualizationStore((s) => s.setViewMode)
  const resetCamera = useVisualizationStore((s) => s.resetCamera)
  const showEnvironment = useVisualizationStore((s) => s.showEnvironment)
  const toggleEnvironment = useVisualizationStore((s) => s.toggleEnvironment)

  const panelRef = useRef<HTMLElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const loc = activeProfile || getLocationProfile(location)

  // Track browser fullscreen state changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      )
      setIsFullscreen(isFull)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('MSFullscreenChange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange)
    }
  }, [])

  // Toggle browser fullscreen for the 3D Digital Twin panel
  const toggleFullscreen = async () => {
    try {
      const elem = panelRef.current || document.documentElement

      if (
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      ) {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen()
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen()
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen()
        }
      } else {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen()
        } else if ((elem as any).webkitRequestFullscreen) {
          await (elem as any).webkitRequestFullscreen()
        } else if ((elem as any).mozRequestFullScreen) {
          await (elem as any).mozRequestFullScreen()
        } else if ((elem as any).msRequestFullscreen) {
          await (elem as any).msRequestFullscreen()
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle request failed:', err)
    }
  }

  return (
    <main ref={panelRef} className="panel-center" id="panel-center" aria-label="3D Digital Twin Engineering Workspace">
      {/* ── Viewport Control Toolbar ── */}
      <div className="viewport-toolbar" id="viewport-toolbar" style={{ flexWrap: 'wrap', gap: 6, padding: '4px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Box size={12} color="var(--solar)" />
          <span className="section-header" style={{ fontSize: 9.5, letterSpacing: '0.1em' }}>
            3D Digital Twin
          </span>
        </div>

        <div style={{ width: 1, height: 16, background: 'var(--border-dim)', margin: '0 4px' }} />

        {/* ── Camera Perspective Segmented Controls ── */}
        <div
          role="tablist"
          aria-label="Camera Perspective Views"
          style={{
            display: 'flex',
            gap: 2,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-base)',
            borderRadius: 3,
            padding: 2,
          }}
        >
          {VIEW_MODES.map(({ id, label, tooltip }) => {
            const isActive = viewMode === id
            return (
              <button
                key={id}
                id={`vp-btn-${id}`}
                role="tab"
                aria-selected={isActive}
                onClick={() => setViewMode(id)}
                title={tooltip}
                style={{
                  padding: '3px 8px',
                  borderRadius: 2,
                  border: isActive ? '1px solid var(--solar)' : '1px solid transparent',
                  background: isActive ? 'var(--solar-glow)' : 'transparent',
                  color: isActive ? 'var(--solar)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 8.5,
                  fontWeight: isActive ? 700 : 500,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  transition: 'all 120ms',
                  outline: 'none',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>

        <div style={{ flex: 1 }} />

        {/* ── Visualization Render Mode Segmented Toggle ── */}
        <VisualizationModeToggle />

        <div style={{ width: 1, height: 16, background: 'var(--border-dim)', margin: '0 4px' }} />

        {/* ── Environment Background Toggle ── */}
        <button
          id="vp-env-toggle"
          aria-label="Toggle Environment Background Terrain"
          className={`viewport-btn ${showEnvironment ? 'active' : ''}`}
          title={showEnvironment ? 'Hide Background Environment (Mountains, Weather, Terrain)' : 'Show Background Environment'}
          style={{
            padding: '3px 8px',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            borderRadius: 2,
            color: showEnvironment ? 'var(--solar)' : 'var(--text-muted)',
            borderColor: showEnvironment ? 'var(--solar)' : 'var(--border-base)',
            background: showEnvironment ? 'var(--solar-glow)' : 'var(--bg-panel)',
            fontFamily: 'var(--font-mono)',
            fontSize: 8.5,
            fontWeight: showEnvironment ? 700 : 500,
            cursor: 'pointer',
            transition: 'all 120ms',
          }}
          onClick={toggleEnvironment}
        >
          <Mountain size={10} />
          <span>Env</span>
        </button>

        {/* ── Reset Camera Target ── */}
        <button
          id="vp-reset"
          aria-label="Reset Camera Target Position"
          className="viewport-btn"
          title="Reset camera orientation and target focus"
          style={{
            padding: '3px 7px',
            display: 'flex',
            alignItems: 'center',
            borderRadius: 2,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-base)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
          onClick={() => {
            setViewMode('perspective')
            resetCamera()
          }}
        >
          <RotateCcw size={10} />
        </button>

        {/* ── Browser Fullscreen Toggle ── */}
        <button
          id="vp-fullscreen"
          aria-label="Toggle Workstation Fullscreen Viewport"
          className="viewport-btn"
          title={isFullscreen ? 'Exit Full Screen Viewport (Esc)' : 'Enter Full Screen Viewport'}
          style={{
            padding: '3px 7px',
            display: 'flex',
            alignItems: 'center',
            borderRadius: 2,
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-base)',
            color: isFullscreen ? 'var(--solar)' : 'var(--text-muted)',
            cursor: 'pointer',
          }}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <Minimize2 size={10} /> : <Maximize2 size={10} />}
        </button>
      </div>

      {/* ── 3D Viewport Canvas Area ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0, background: 'var(--bg-base)' }}>
        <Suspense
          fallback={
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                background: 'var(--bg-base)',
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                color: 'var(--text-muted)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}
            >
              <div style={{ color: 'var(--solar)', fontWeight: 700 }}>INITIALIZING 3D DIGITAL TWIN WORKSTATION…</div>
              <div style={{ fontSize: 8, color: 'var(--text-faint)' }}>Loading WebGL Shader Context & Physics Meshes</div>
            </div>
          }
        >
          <ShelterScene />
        </Suspense>

        {/* ── Section Cutaway Legend & Layer Inspector Overlay Modal ── */}
        <SectionLegend />
        <LayerInspectorModal />

        {/* ── Top-Left Viewport Model Telemetry Overlay ── */}
        <div
          id="viewport-info"
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            background: 'rgba(13, 18, 28, 0.92)',
            backdropFilter: 'blur(6px)',
            border: '1px solid var(--border-base)',
            padding: '4px 10px',
            borderRadius: 3,
            boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          {[
            { k: 'SHAPE', v: shape.replace('_', ' ').toUpperCase() },
            { k: 'BOUNDS', v: `${length.toFixed(1)}×${width.toFixed(1)}×${height.toFixed(1)}m` },
            { k: 'ORIENT', v: `${orientation}° ${degreesToCompass(orientation)}` },
            { k: 'SITE', v: `${loc.name.split(',')[0].toUpperCase()} (${loc.altitude}m)` },
          ].map(({ k, v }) => (
            <div key={k} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                {k}:
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 700, color: 'var(--text-primary)' }}>
                {v}
              </span>
            </div>
          ))}
        </div>

        {/* ── Top-Right Climate Profile Overlay Card ── */}
        <div
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 6,
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          <ClimateProfileCard />
        </div>

        {/* ── Bottom-Left XYZ Coordinate Telemetry HUD ── */}
        <div
          id="viewport-hud"
          style={{
            position: 'absolute',
            bottom: 10,
            left: 10,
            display: 'flex',
            gap: 12,
            pointerEvents: 'none',
            background: 'rgba(13, 18, 28, 0.92)',
            backdropFilter: 'blur(6px)',
            border: '1px solid var(--border-dim)',
            borderRadius: 3,
            padding: '4px 9px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            zIndex: 10,
          }}
        >
          {[
            { axis: 'X', val: '0.00m', color: '#ef4444' },
            { axis: 'Y', val: `${(height / 2).toFixed(2)}m`, color: '#16a34a' },
            { axis: 'Z', val: '0.00m', color: '#0284c7' },
          ].map((c) => (
            <span key={c.axis} style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: c.color, fontWeight: 700 }}>
              {c.axis}:<span style={{ color: 'var(--text-primary)', marginLeft: 3, fontWeight: 600 }}>{c.val}</span>
            </span>
          ))}
        </div>

        {/* ── Bottom-Right Solar & Environmental Telemetry HUD ── */}
        <div
          id="sun-hud"
          style={{
            position: 'absolute',
            bottom: 10,
            right: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            pointerEvents: 'none',
            background: 'rgba(13, 18, 28, 0.92)',
            backdropFilter: 'blur(6px)',
            border: '1px solid var(--border-dim)',
            borderRadius: 3,
            padding: '4px 10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            zIndex: 10,
          }}
        >
          <Sun size={10} color="var(--solar)" />
          {[
            { k: 'SOLAR EL', v: `${loc.sceneTheme.sunElevation.toFixed(1)}°` },
            { k: 'AZIMUTH', v: `${loc.sceneTheme.sunAzimuth.toFixed(0)}°` },
            { k: 'G_SOUTH', v: typeof loc.gSouth === 'string' ? loc.gSouth : `${loc.gSouthValue || 520} W/m²` },
          ].map(({ k, v }) => (
            <span key={k} style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--text-muted)' }}>
              {k}:&nbsp;<span style={{ color: 'var(--solar)', fontWeight: 700 }}>{v}</span>
            </span>
          ))}
        </div>
      </div>
    </main>
  )
}

export default CenterPanel
