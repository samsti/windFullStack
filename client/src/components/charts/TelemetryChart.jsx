import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

const COLORS = {
  windSpeed:          '#06b6d4',
  powerOutput:        '#10b981',
  rotorSpeed:         '#8b5cf6',
  bladePitch:         '#ec4899',
  generatorTemp:      '#f59e0b',
  gearboxTemp:        '#ef4444',
  ambientTemperature: '#3b82f6',
  vibration:          '#f97316',
  windDirection:      '#64748b',
  nacelleDirection:   '#a78bfa',
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-gray-400 mb-2">{new Date(label).toLocaleTimeString()}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span style={{ color: p.color }}>●</span>
          <span className="text-gray-300">{p.name}:</span>
          <span className="text-white font-medium">{p.value?.toFixed(2)}</span>
        </div>
      ))}
    </div>
  )
}

export default function TelemetryChart({ data, metrics, title }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
          <XAxis
            dataKey="recordedAt"
            tickFormatter={formatTime}
            tick={{ fill: '#6b7280', fontSize: 11 }}
            stroke="#374151"
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#6b7280', fontSize: 11 }}
            stroke="#374151"
            tickLine={false}
            axisLine={false}
            width={42}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: '#9ca3af', paddingTop: 8 }}
            iconType="circle"
            iconSize={8}
          />
          {metrics.map(({ key, label }) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={label}
              stroke={COLORS[key] ?? '#6b7280'}
              dot={false}
              strokeWidth={2}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
