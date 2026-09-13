import type { FC } from 'react'
import { degreesToCompass } from '@/lib/formatters'

interface CompassProps {
  degrees: number
  onChange: (deg: number) => void
}

export const CompassWidget: FC<CompassProps> = ({ degrees, onChange }) => {
  const PRESETS = [
    { label: 'N', deg: 0 },
    { label: 'NE', deg: 45 },
    { label: 'E', deg: 90 },
    { label: 'SE', deg: 135 },
    { label: 'S', deg: 180 },
    { label: 'SW', deg: 225 },
    { label: 'W', deg: 270 },
    { label: 'NW', deg: 315 },
  ]

  // Ensure normalized degrees display between 0 and 360
  const normalizedDegrees = ((degrees % 360) + 360) % 360

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-dim)',
          borderRadius: 2,
          padding: '6px 8px',
        }}
      >
        {/* SVG Compass Dial */}
        <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
          <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
            <circle cx="50" cy="50" r="46" fill="var(--bg-input)" stroke="var(--border-bright)" strokeWidth="2" />
            <circle cx="50" cy="50" r="3" fill="var(--solar)" />
            {/* Cardinal ticks */}
            <line x1="50" y1="8" x2="50" y2="14" stroke="var(--solar)" strokeWidth="2" />
            <line x1="50" y1="86" x2="50" y2="92" stroke="var(--text-muted)" strokeWidth="1.5" />
            <line x1="8" y1="50" x2="14" y2="50" stroke="var(--text-muted)" strokeWidth="1.5" />
            <line x1="86" y1="50" x2="92" y2="50" stroke="var(--text-muted)" strokeWidth="1.5" />
            {/* Rotating Arrow */}
            <g transform={`rotate(${normalizedDegrees} 50 50)`} style={{ transition: 'transform 150ms ease-out' }}>
              <polygon points="50,14 44,50 56,50" fill="var(--solar)" />
              <polygon points="50,86 44,50 56,50" fill="var(--text-muted)" opacity="0.5" />
            </g>
          </svg>
        </div>

        {/* Degree & Bearing Readout */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--solar)' }}>
              {normalizedDegrees}°
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                fontWeight: 600,
                color: 'var(--text-secondary)',
                letterSpacing: '0.08em',
              }}
            >
              {degreesToCompass(normalizedDegrees)}
            </span>
          </div>

          <input
            id="param-orientation-slider"
            aria-label="Orientation angle degrees"
            type="range"
            min={0}
            max={360}
            step={5}
            value={normalizedDegrees}
            onChange={(e) => onChange(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--solar)', cursor: 'pointer' }}
          />
        </div>
      </div>

      {/* Preset Bearing Quick Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 2 }}>
        {PRESETS.map((p) => {
          const isSelected = Math.abs(normalizedDegrees - p.deg) < 5 || (p.deg === 0 && normalizedDegrees === 360)
          return (
            <button
              key={p.label}
              type="button"
              id={`orientation-preset-${p.label.toLowerCase()}`}
              onClick={() => onChange(p.deg)}
              style={{
                padding: '2px 0',
                fontFamily: 'var(--font-mono)',
                fontSize: 7.5,
                fontWeight: isSelected ? 700 : 500,
                background: isSelected ? 'var(--solar-glow)' : 'var(--bg-input)',
                color: isSelected ? 'var(--solar)' : 'var(--text-muted)',
                border: `1px solid ${isSelected ? 'var(--solar)' : 'var(--border-dim)'}`,
                borderRadius: 2,
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 120ms',
              }}
            >
              {p.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default CompassWidget
