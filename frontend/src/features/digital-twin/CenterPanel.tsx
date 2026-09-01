import { Suspense, useState, useEffect, useRef } from 'react'
import type { FC } from 'react'
import { RotateCcw, Maximize2, Minimize2, Sun } from 'lucide-react'
import { useDesignStore } from '@/store/designStore'
import { useVisualizationStore } from '@/store/visualizationStore'
import type { CameraViewMode } from '@/domain'
import { getLocationProfile } from '@/data/locations'
import ShelterScene from './ShelterScene'
import VisualizationModeToggle from './VisualizationModeToggle'
import ClimateProfileCard from '@/features/location/ClimateProfileCard'
import { degreesToCompass } from '@/lib/formatters'

const VIEW_MODES: Array<{ id: CameraViewMode; label: string }> = [
  { id: 'perspective', label: 'Perspective' },
  { id: 'top',         label: 'Top' },
  { id: 'south',       label: 'South' },
  { id: 'section',     label: 'Section' },
]

export const CenterPanel: FC = () => {
  const { shape, orientation, length, width, height, location } = useDesignStore()
  const viewMode    = useVisualizationStore((s) => s.viewMode)
  const setViewMode = useVisualizationStore((s) => s.setViewMode)
  const resetCamera = useVisualizationStore((s) => s.resetCamera)

  const panelRef = useRef<HTMLElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const loc = getLocationProfile(location)

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
    <main ref={panelRef} className="panel-center" id="panel-center" aria-label="3D Digital Twin">

      {/* Viewport toolbar */}
      <div className="viewport-toolbar" id="viewport-toolbar">
        <span className="section-header" style={{ marginRight: 6 }}>3D Digital Twin</span>

        <div style={{ width: 1, height: 14, background: 'var(--border-dim)', margin: '0 6px' }} />

        {VIEW_MODES.map(({ id, label }) => {
          const isActive = viewMode === id
          return (
            <button
              key={id}
              id={`vp-btn-${id}`}
              onClick={() => setViewMode(id)}
              className={`viewport-btn ${isActive ? 'active' : ''}`}
              style={{
                background: isActive ? 'var(--bg-hover)' : 'transparent',
                color:      isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                borderColor:isActive ? 'var(--border-bright)' : 'transparent',
                fontWeight: isActive ? 700 : 500,
              }}
            >
              {label}
            </button>
          )
        })}

        <div style={{ flex: 1 }} />

        {/* Visualization mode toggle */}
        <VisualizationModeToggle />

        <div style={{ width: 1, height: 14, background: 'var(--border-dim)', margin: '0 4px' }} />

        <button
          id="vp-reset"
          className="viewport-btn"
          title="Reset camera perspective"
          style={{ padding: '3px 6px', display: 'flex', alignItems: 'center' }}
          onClick={() => {
            setViewMode('perspective')
            resetCamera()
          }}
        >
          <RotateCcw size={11} />
        </button>

        <button
          id="vp-fit"
          className="viewport-btn"
          title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Enter Full Screen'}
          style={{
            padding: '3px 6px',
            display: 'flex',
            alignItems: 'center',
            color: isFullscreen ? 'var(--solar)' : 'inherit',
          }}
          onClick={toggleFullscreen}
        >
          {isFullscreen ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
        </button>
      </div>

      {/* ── 3D Canvas area ── */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>

        <Suspense fallback={
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 9,
            color: 'var(--text-muted)', letterSpacing: '0.12em', textTransform: 'uppercase',
          }}>
            Initialising 3D digital twin…
          </div>
        }>
          <ShelterScene />
        </Suspense>

        {/* ── Shape / orientation info badge ── */}
        <div id="viewport-info" style={{
          position: 'absolute', top: 8, left: 8,
          display: 'flex', gap: 12, alignItems: 'center',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-base)',
          padding: '3px 9px', borderRadius: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          pointerEvents: 'none',
        }}>
          {[
            { k: 'SHAPE',  v: shape.toUpperCase() },
            { k: 'SIZE',   v: `${length}×${width}×${height} m` },
            { k: 'ORIENT', v: `${orientation}° ${degreesToCompass(orientation)}` },
            { k: 'SITE',   v: loc.name.split(',')[0].toUpperCase() },
          ].map(({ k, v }) => (
            <span key={k} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-muted)' }}>
              {k}&nbsp;<span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{v}</span>
            </span>
          ))}
        </div>

        {/* ── Climate Profile Card (Collapsible) ── */}
        <ClimateProfileCard />

        {/* ── XYZ coordinate HUD ── */}
        <div id="viewport-hud" style={{
          position: 'absolute', bottom: 10, left: 10,
          display: 'flex', gap: 14, pointerEvents: 'none',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-dim)',
          borderRadius: 2, padding: '3px 8px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
        }}>
          {[
            { axis: 'X', val: '0.00', color: '#ef4444' },
            { axis: 'Y', val: (height / 2).toFixed(2), color: '#16a34a' },
            { axis: 'Z', val: '0.00', color: '#0284c7' },
          ].map(c => (
            <span key={c.axis} style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: c.color, fontWeight: 700 }}>
              {c.axis}:<span style={{ color: 'var(--text-secondary)', marginLeft: 2, fontWeight: 500 }}>{c.val}</span>
            </span>
          ))}
        </div>

        {/* ── Sun position HUD ── */}
        <div id="sun-hud" style={{
          position: 'absolute', bottom: 10, right: 10,
          display: 'flex', alignItems: 'center', gap: 10,
          pointerEvents: 'none',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-dim)',
          borderRadius: 2, padding: '4px 9px',
          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
        }}>
          <Sun size={10} color="var(--solar)" />
          {[
            { k: 'ALT',  v: `${loc.sceneTheme.sunElevation.toFixed(1)}°` },
            { k: 'AZI',  v: `${loc.sceneTheme.sunAzimuth.toFixed(0)}°` },
            { k: 'HOUR', v: '12:00' },
          ].map(({ k, v }) => (
            <span key={k} style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, color: 'var(--text-muted)' }}>
              {k}&nbsp;<span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{v}</span>
            </span>
          ))}
        </div>
      </div>
    </main>
  )
}

export default CenterPanel
