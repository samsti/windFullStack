import { Link } from 'react-router-dom'

function Metric({ label, value, unit }) {
  return (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider leading-none mb-1">{label}</p>
      <p className="text-sm font-semibold text-white">
        {value != null ? value.toFixed(1) : '—'}
        <span className="text-xs text-gray-500 ml-1">{unit}</span>
      </p>
    </div>
  )
}

export default function TurbineCard({ turbine }) {
  const m = turbine.latestMetric
  const isRunning = m?.status === 'running'

  return (
    <Link to={`/turbine/${turbine.id}`}>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-cyan-800 hover:bg-gray-800/60 transition-all cursor-pointer group">

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
              {turbine.name || turbine.id}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{turbine.id}</p>
          </div>
          <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border ${
            isRunning
              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
              : 'bg-red-950/60 text-red-400 border-red-800'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400' : 'bg-red-400'} animate-pulse`} />
            {m?.status ?? 'offline'}
          </span>
        </div>

        {/* Metrics */}
        {m ? (
          <div className="grid grid-cols-2 gap-y-3 gap-x-4">
            <Metric label="Wind Speed"   value={m.windSpeed}     unit="m/s" />
            <Metric label="Power Output" value={m.powerOutput}   unit="kW"  />
            <Metric label="Rotor Speed"  value={m.rotorSpeed}    unit="RPM" />
            <Metric label="Gen. Temp"    value={m.generatorTemp} unit="°C"  />
          </div>
        ) : (
          <p className="text-gray-600 text-sm">Waiting for data...</p>
        )}

        {/* Timestamp */}
        {m && (
          <p className="text-xs text-gray-600 mt-4 border-t border-gray-800/60 pt-3">
            {new Date(m.recordedAt).toLocaleTimeString()}
          </p>
        )}
      </div>
    </Link>
  )
}
