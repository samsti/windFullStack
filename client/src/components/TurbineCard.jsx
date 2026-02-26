import { Link } from 'react-router-dom'
import { getTurbineDisplayState } from '../utils/turbineStatus'

function getWorstStatus(m, isRunning) {
  if (!m || !isRunning) return 'idle'
  const checks = [
    m.generatorTemp > 80 || m.gearboxTemp > 80 ? 'critical'
      : m.generatorTemp > 65 || m.gearboxTemp > 65 ? 'warning' : 'good',
    m.vibration > 0.6 ? 'critical' : m.vibration > 0.3 ? 'warning' : 'good',
    m.rotorSpeed > 23 || m.rotorSpeed < 2 ? 'critical'
      : m.rotorSpeed > 20 || m.rotorSpeed < 5 ? 'warning' : 'good',
    m.windSpeed > 25 || m.windSpeed < 2 ? 'critical'
      : m.windSpeed > 20 || m.windSpeed < 5 ? 'warning' : 'good',
  ]
  if (checks.includes('critical')) return 'critical'
  if (checks.includes('warning'))  return 'warning'
  return 'good'
}

const BORDER = {
  critical: 'border-red-800 shadow-sm shadow-red-950/80 hover:border-red-700',
  warning:  'border-amber-700/70 hover:border-amber-600',
  good:     'border-gray-800 hover:border-cyan-800',
  idle:     'border-gray-800 hover:border-cyan-800',
  offline:  'border-gray-700/50 opacity-50 hover:opacity-80 hover:border-gray-600',
  maintenance: 'border-violet-800/60 hover:border-violet-700',
}

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
  const m            = turbine.latestMetric
  const displayState = getTurbineDisplayState(turbine)
  const isRunning    = displayState === 'running'
  const worstStatus  = turbine.isInMaintenance ? 'idle'
                     : displayState === 'offline' ? 'idle'
                     : getWorstStatus(m, isRunning)
  const borderKey    = turbine.isInMaintenance ? 'maintenance'
                     : displayState === 'offline' ? 'offline'
                     : worstStatus

  const statusBadge =
    displayState === 'running'  ? { cls: 'bg-emerald-950/60 text-emerald-400 border-emerald-800', dot: 'bg-emerald-400', label: m?.status ?? 'running' } :
    displayState === 'stopped'  ? { cls: 'bg-red-950/60 text-red-400 border-red-800',             dot: 'bg-red-400',     label: 'stopped' } :
    /* offline */                 { cls: 'bg-gray-800/60 text-gray-500 border-gray-700',           dot: 'bg-gray-500',    label: 'offline' }

  return (
    <Link to={`/turbine/${turbine.id}`}>
      <div className={`bg-gray-900 border rounded-xl p-5 hover:bg-gray-800/60 transition-all cursor-pointer group ${BORDER[borderKey]}`}>

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
              {turbine.name || turbine.id}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{turbine.id}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full border ${statusBadge.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot} ${isRunning ? 'animate-pulse' : ''}`} />
              {statusBadge.label}
            </span>
            {turbine.isInMaintenance && (
              <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-violet-950/60 text-violet-400 border-violet-800">
                🔧 maintenance
              </span>
            )}
          </div>
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
