import {
  AreaChart, Area, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

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
          <span className="text-white font-medium">{p.value?.toFixed(1)}</span>
        </div>
      ))}
    </div>
  )
}

const sharedAxis = {
  tick: { fill: '#6b7280', fontSize: 11 },
  stroke: '#374151',
  tickLine: false,
}

export function TotalPowerChart({ data }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">
        Total Farm Power Output (kW)
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="powerGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
          <XAxis dataKey="recordedAt" tickFormatter={formatTime} {...sharedAxis} />
          <YAxis {...sharedAxis} axisLine={false} width={50} />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="totalPower"
            name="Total Power (kW)"
            stroke="#10b981"
            fill="url(#powerGrad)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function WindAndTempChart({ data }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">
        Avg Wind Speed & Generator Temp
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
          <XAxis dataKey="recordedAt" tickFormatter={formatTime} {...sharedAxis} />
          <YAxis yAxisId="wind" {...sharedAxis} axisLine={false} width={42} />
          <YAxis yAxisId="temp" orientation="right" {...sharedAxis} axisLine={false} width={42} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 11, color: '#9ca3af', paddingTop: 8 }} iconType="circle" iconSize={8} />
          <Line yAxisId="wind" type="monotone" dataKey="avgWindSpeed"    name="Avg Wind (m/s)" stroke="#06b6d4" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line yAxisId="temp" type="monotone" dataKey="avgGeneratorTemp" name="Avg Gen Temp (°C)" stroke="#f59e0b" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
