/**
 * ThermalReplayChart.tsx
 *
 * 24-Hour thermal replay visualization with Recharts.
 * Animates a marker along the curve over ~8 seconds, updating a live temperature readout
 * and triggering tint updates on the 3D shelter via callback.
 * Designed with a compact, space-efficient height and interactive scrubber.
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot
} from 'recharts'
import { Play, Pause, RotateCcw, ChevronDown } from 'lucide-react'
import type { HourlyReplayPoint } from '@/domain'

interface ThermalReplayChartProps {
  hourlyData: HourlyReplayPoint[]
  onReplayTempChange?: (temp: number) => void    // callback to tint 3D shelter
  height?: number
  onCollapse?: () => void
}

export const ThermalReplayChart = ({
  hourlyData,
  onReplayTempChange,
  height = 70,
  onCollapse,
}: ThermalReplayChartProps) => {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentHourIdx, setCurrentHourIdx] = useState(0)
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const animationDurationMs = 8000 // 8 seconds for full 24-hour cycle

  // Compute min/max temp for axis scaling
  const tempRange = useMemo(() => {
    if (!hourlyData || hourlyData.length === 0) return { min: -20, max: 10 }
    const temps = hourlyData.map(h => h.indoorTemp)
    const min = Math.min(...temps)
    const max = Math.max(...temps)
    const pad = Math.max(1, (max - min) * 0.1)
    return {
      min: Math.floor(min - pad),
      max: Math.ceil(max + pad),
    }
  }, [hourlyData])

  // Current hour and temperature
  const currentPoint = hourlyData[currentHourIdx] || { hour: 0, indoorTemp: 0 }

  // Trigger 3D tint callback on replay temp change
  useEffect(() => {
    if (onReplayTempChange) {
      onReplayTempChange(currentPoint.indoorTemp)
    }
  }, [currentPoint.indoorTemp, onReplayTempChange])

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      return
    }

    const animate = (now: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = now
      }

      const elapsed = now - startTimeRef.current
      const progress = Math.min(elapsed / animationDurationMs, 1)
      const idx = Math.round(progress * (hourlyData.length - 1))

      setCurrentHourIdx(idx)

      // Stop if finished
      if (progress >= 1) {
        setIsPlaying(false)
        startTimeRef.current = null
      } else {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
    }
  }, [isPlaying, hourlyData.length])

  function handlePlayPause() {
    setIsPlaying(prev => !prev)
  }

  function handleReset() {
    setIsPlaying(false)
    setCurrentHourIdx(0)
    startTimeRef.current = null
  }

  function handleScrub(e: React.ChangeEvent<HTMLInputElement>) {
    setIsPlaying(false)
    const val = parseInt(e.target.value, 10)
    if (!isNaN(val) && val >= 0 && val < hourlyData.length) {
      setCurrentHourIdx(val)
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 5,
      width: '100%',
    }}>

      {/* ── Compact Controls Header Bar ──────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        padding: '0 2px',
      }}>
        {/* Play/Pause/Reset buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <button
            onClick={handlePlayPause}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 22,
              height: 22,
              background: isPlaying ? 'var(--cool-glow)' : 'var(--solar-glow)',
              border: `1px solid ${isPlaying ? 'var(--cool)' : 'var(--solar)'}`,
              borderRadius: 3,
              color: isPlaying ? 'var(--cool-dim)' : 'var(--solar-dim)',
              cursor: 'pointer',
              fontSize: 10,
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
            title={isPlaying ? 'Pause Replay' : 'Play 24h Cycle'}
          >
            {isPlaying ? <Pause size={10} /> : <Play size={10} />}
          </button>

          <button
            onClick={handleReset}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 22,
              height: 22,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-base)',
              borderRadius: 3,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 10,
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
            title="Reset to 00:00"
          >
            <RotateCcw size={10} />
          </button>

          {/* Time display */}
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            fontWeight: 700,
            color: 'var(--text-primary)',
            background: 'var(--bg-panel)',
            padding: '2px 5px',
            borderRadius: 2,
            border: '1px solid var(--border-dim)',
            minWidth: 42,
            textAlign: 'center',
          }}>
            {String(currentPoint.hour).padStart(2, '0')}:00
          </div>
        </div>

        {/* Interactive Scrub Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, maxWidth: 280 }}>
          <input
            type="range"
            min={0}
            max={Math.max(0, hourlyData.length - 1)}
            value={currentHourIdx}
            onChange={handleScrub}
            title="Drag to scrub through 24-hour cycle"
            style={{
              width: '100%',
              height: 4,
              cursor: 'pointer',
              accentColor: 'var(--solar)',
            }}
          />
        </div>

        {/* Current Replay Temperature & Collapse Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: 'var(--font-mono)',
            fontSize: 9.5,
            background: 'rgba(217, 119, 6, 0.08)',
            border: '1px solid rgba(217, 119, 6, 0.25)',
            padding: '2px 7px',
            borderRadius: 3,
            color: 'var(--solar)',
            fontWeight: 700,
          }}>
            <span style={{ fontSize: 8, color: 'var(--text-muted)', fontWeight: 500 }}>INDOOR:</span>
            <span>{currentPoint.indoorTemp >= 0 ? '+' : ''}{currentPoint.indoorTemp.toFixed(1)} °C</span>
          </div>

          {onCollapse && (
            <button
              onClick={onCollapse}
              title="Collapse Replay Bar (Press ↓)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                fontFamily: 'var(--font-mono)',
                fontSize: 8.5,
                fontWeight: 600,
                color: 'var(--text-muted)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-base)',
                borderRadius: 3,
                padding: '2px 6px',
                cursor: 'pointer',
              }}
            >
              <ChevronDown size={10} />
              <span>COLLAPSE</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Compact Chart Area ─────────────────────────────────── */}
      <div style={{
        position: 'relative',
        width: '100%',
        height,
        background: 'var(--bg-panel)',
        borderRadius: 3,
        border: '1px solid var(--border-base)',
        padding: '3px 6px 1px',
        boxSizing: 'border-box',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
      }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={hourlyData} margin={{ top: 2, right: 6, left: -26, bottom: 2 }}>
            <CartesianGrid strokeDasharray="2 2" stroke="rgba(0,0,0,0.05)" />
            <XAxis
              dataKey="hour"
              stroke="var(--text-muted)"
              tick={{ fontSize: 8.5 }}
              interval={2}
              tickFormatter={(h) => `${String(h).padStart(2, '0')}:00`}
            />
            <YAxis
              stroke="var(--text-muted)"
              tick={{ fontSize: 8.5 }}
              domain={[tempRange.min, tempRange.max]}
              width={30}
              tickFormatter={(t) => `${Math.round(t)}°`}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-base)',
                borderRadius: 4,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: 9.5,
                padding: '4px 8px',
              }}
              labelFormatter={(h) => `${String(h).padStart(2, '0')}:00`}
              formatter={(temp: any) => {
                if (temp === undefined || temp === null) return ['—', 'Indoor']
                const t = typeof temp === 'number' ? temp : parseFloat(String(temp))
                return [t.toFixed(1) + ' °C', 'Indoor Temp']
              }}
              cursor={{ stroke: 'rgba(217,119,6,0.4)' }}
            />

            {/* Main temperature line */}
            <Line
              type="monotone"
              dataKey="indoorTemp"
              stroke="var(--solar)"
              strokeWidth={1.8}
              dot={false}
              isAnimationActive={false}
            />

            {/* Current replay position marker */}
            <ReferenceDot
              x={currentPoint.hour}
              y={currentPoint.indoorTemp}
              r={3.5}
              fill="var(--solar)"
              stroke="white"
              strokeWidth={1.2}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default ThermalReplayChart
