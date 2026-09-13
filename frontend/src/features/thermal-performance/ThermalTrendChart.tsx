import type { FC } from 'react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts'

interface TempPoint {
  hour: number
  time: string
  indoorTemp: number
  outdoorTemp: number
  solarRad?: number
  heatFlux?: number
}

interface ThermalTrendChartProps {
  data?: TempPoint[]
  idle?: boolean
}

export const ThermalTrendChart: FC<ThermalTrendChartProps> = ({ data, idle }) => {
  if (idle || !data || data.length === 0) {
    return (
      <div
        style={{
          height: 120,
          background: 'var(--bg-base)',
          border: '1px solid var(--border-dim)',
          borderRadius: 3,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          padding: 12,
          textAlign: 'center',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: 700,
            color: 'var(--text-muted)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          24H TRANSIENT THERMAL PROFILE
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, color: 'var(--text-faint)' }}>
          Run simulation to compute hourly indoor vs outdoor thermal lag curve
        </span>
      </div>
    )
  }

  // Derive actual min and max indoor temps from dataset
  const minIndoor = Math.min(...data.map((d) => d.indoorTemp))
  const maxIndoor = Math.max(...data.map((d) => d.indoorTemp))

  return (
    <div
      style={{
        background: 'var(--bg-base)',
        border: '1px solid var(--border-dim)',
        borderRadius: 3,
        padding: '8px 10px 4px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8.5,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
          }}
        >
          24H Diurnal Temperature Curve
        </span>
        <div style={{ display: 'flex', gap: 10, fontFamily: 'var(--font-mono)', fontSize: 7.5 }}>
          <span style={{ color: 'var(--cool)', fontWeight: 600 }}>T_in: {minIndoor.toFixed(1)}° → {maxIndoor.toFixed(1)}°C</span>
        </div>
      </div>

      <div style={{ width: '100%', height: 110 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIndoor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--cool)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--cool)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="time"
              stroke="var(--text-faint)"
              fontSize={7.5}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-dim)' }}
              interval={4}
            />
            <YAxis
              stroke="var(--text-faint)"
              fontSize={7.5}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-dim)' }}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-panel)',
                border: '1px solid var(--border-bright)',
                borderRadius: 2,
                fontFamily: 'var(--font-mono)',
                fontSize: 8.5,
                padding: '4px 8px',
                color: 'var(--text-primary)',
              }}
              formatter={(val: any) => [`${Number(val).toFixed(1)}°C`]}
            />
            <Area
              type="monotone"
              dataKey="outdoorTemp"
              name="Outdoor Temp"
              stroke="#64748b"
              strokeDasharray="2 2"
              fill="none"
              strokeWidth={1}
            />
            <Area
              type="monotone"
              dataKey="indoorTemp"
              name="Indoor Temp"
              stroke="var(--cool)"
              fillOpacity={1}
              fill="url(#colorIndoor)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-block', width: 8, height: 2, background: 'var(--cool)' }} />
          <span>T_indoor (Simulated)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ display: 'inline-block', width: 8, height: 2, background: '#64748b', strokeDasharray: '2 2' }} />
          <span>T_outdoor (Ambient)</span>
        </div>
      </div>
    </div>
  )
}

export default ThermalTrendChart
