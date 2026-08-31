/**
 * VisualizationModeToggle.tsx
 *
 * Segmented control for switching between visualization modes:
 * - Normal: default engineering appearance
 * - Temperature: heat-map based on indoor temperature
 * - Heat Flow: animated heat flow particles
 * - Solar Gain: emphasized solar radiation
 */
import type { FC } from 'react'
import { Thermometer, Zap, Sun, Eye } from 'lucide-react'
import { useVisualizationStore } from '../store/visualizationStore'
import type { VisualizationMode } from '../store/visualizationStore'

const MODES: Array<{
  id: VisualizationMode
  label: string
  icon: React.ReactNode
  tooltip: string
}> = [
  { id: 'normal', label: 'Normal', icon: <Eye size={10} />, tooltip: 'Default engineering appearance' },
  { id: 'temperature', label: 'Temperature', icon: <Thermometer size={10} />, tooltip: 'Heat-map gradient' },
  { id: 'heatflow', label: 'Heat Flow', icon: <Zap size={10} />, tooltip: 'Animated heat flow' },
  { id: 'solargain', label: 'Solar', icon: <Sun size={10} />, tooltip: 'Solar gain emphasis' },
]

const VisualizationModeToggle: FC = () => {
  const mode = useVisualizationStore(s => s.mode)
  const setMode = useVisualizationStore(s => s.setMode)

  return (
    <div style={{
      display: 'flex',
      gap: 2,
      background: 'var(--bg-panel)',
      border: '1px solid var(--border-base)',
      borderRadius: 3,
      padding: 2,
    }}>
      {MODES.map(({ id, label, icon, tooltip }) => (
        <button
          key={id}
          onClick={() => setMode(id)}
          title={tooltip}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            padding: '3px 7px',
            borderRadius: 2,
            border: mode === id ? '1px solid var(--solar)' : '1px solid transparent',
            background: mode === id ? 'var(--solar-glow)' : 'transparent',
            color: mode === id ? 'var(--solar)' : 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: 8.5,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 150ms',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            if (mode !== id) {
              ;(e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'
            }
          }}
          onMouseLeave={(e) => {
            if (mode !== id) {
              ;(e.currentTarget as HTMLButtonElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
            }
          }}
        >
          {icon}
          <span style={{ fontSize: 8 }}>
            {label}
          </span>
        </button>
      ))}
    </div>
  )
}

export default VisualizationModeToggle
