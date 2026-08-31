/**
 * ThermalReplayChart.tsx
 *
 * 24-Hour thermal replay visualization with Recharts.
 * Animates a marker along the curve over ~8 seconds, updating a live temperature readout
 * and triggering tint updates on the 3D shelter via callback.
 */
import { useState, useEffect, useRef, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceDot
} from 'recharts'
import { Play, Pause, RotateCcw } from 'lucide-react'
import type { HourlyPoint } from '../lib/simulationEngine'

interface ThermalReplayChartProps {
  hourlyData: HourlyPoint[]
  onReplayTempChange?: (temp: number) => void    // callback to tint 3D shelter
  height?: number
}

export default function ThermalReplayChart({
  hourlyData,
  onReplayTempChange,
  height = 140,
}: ThermalReplayChartProps) {
  const [isPlaying, setIsPlaying]       = useState(false)
  const [currentHourIdx, setCurrentHourIdx] = useState(0)
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const animationDurationMs = 8000  // 8 seconds for full 24-hour cycle

  // Compute min/max temp for axis scaling
  const tempRange = useMemo(() => {
    if (!hourlyData || hourlyData.length === 0) return { min: -20, max: 10 }
    const temps = hourlyData.map(h => h.indoorTemp)
    const min = Math.min(...temps)
    const max = Math.max(...temps)
    const pad = (max - min) * 0.1
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
    if (isPlaying) {
      setIsPlaying(false)
    } else {
      setIsPlaying(true)
    }
  }

  function handleReset() {
    setIsPlaying(false)
    setCurrentHourIdx(0)
    startTimeRef.current = null
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      width: '100%',
    }}>

      {/* ── Chart ─────────────────────────────────────────────── */}
      <div style={{
        position: 'relative',
        width: '100%',
        height,
        background: 'var(--bg-panel)',
        borderRadius: 3,
        border: '1px solid var(--border-base)',
        padding: 8,
        boxSizing: 'border-box',
        boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)',
      }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={hourlyData} margin={{ top: 5, right: 5, left: -30, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
            <XAxis
              dataKey="hour"
              stroke="var(--text-muted)"
              tick={{ fontSize: 9.5 }}
              interval={2}
              tickFormatter={(h) => `${String(h).padStart(2, '0')}:00`}
            />
            <YAxis
              stroke="var(--text-muted)"
              tick={{ fontSize: 9.5 }}
              domain={[tempRange.min, tempRange.max]}
              width={35}
              label={{ value: '°C', angle: -90, position: 'insideLeft', style: { fill: 'var(--text-muted)', fontSize: 9 } }}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-base)',
                borderRadius: 4,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
              }}
              labelFormatter={(h) => `${String(h).padStart(2, '0')}:00`}
              formatter={(temp: any) => {
                if (temp === undefined || temp === null) return ['—', 'Temperature']
                const t = typeof temp === 'number' ? temp : parseFloat(String(temp))
                return [t.toFixed(1) + ' °C', 'Temperature']
              }}
              cursor={{ stroke: 'rgba(217,119,6,0.4)' }}
            />

            {/* Main temperature line — gradient from cool (blue) at night to warm (amber) at day */}
            <Line
              type="monotone"
              dataKey="indoorTemp"
              stroke="var(--solar)"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />

            {/* Current replay position marker */}
            <ReferenceDot
              x={currentPoint.hour}
              y={currentPoint.indoorTemp}
              r={4}
              fill="var(--solar)"
              stroke="white"
              strokeWidth={1}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Controls + readout ────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        justifyContent: 'space-between',
      }}>

        {/* Play/Pause/Reset buttons */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={handlePlayPause}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 26,
              height: 26,
              background: isPlaying ? 'var(--cool-glow)' : 'var(--solar-glow)',
              border: `1px solid ${isPlaying ? 'var(--cool)' : 'var(--solar)'}`,
              borderRadius: 3,
              color: isPlaying ? 'var(--cool-dim)' : 'var(--solar-dim)',
              cursor: 'pointer',
              transition: 'all 150ms',
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={11} /> : <Play size={11} />}
          </button>

          <button
            onClick={handleReset}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 26,
              height: 26,
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-base)',
              borderRadius: 3,
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 150ms',
              fontSize: 11,
              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}
            title="Reset to 06:00"
          >
            <RotateCcw size={11} />
          </button>
        </div>

        {/* Time display */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--text-muted)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          minWidth: 60,
          textAlign: 'center',
        }}>
          {String(currentPoint.hour).padStart(2, '0')}:00
        </div>

        {/* Current replay temperature readout */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 600,
          color: 'var(--solar)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          minWidth: 100,
          textAlign: 'right',
        }}>
          {currentPoint.indoorTemp >= 0 ? '+' : ''}{currentPoint.indoorTemp.toFixed(1)} °C
        </div>
      </div>
    </div>
  )
}
