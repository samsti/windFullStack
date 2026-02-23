import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getTurbine, getTurbineMetrics } from '../services/api'
import { useSSE } from '../hooks/useSSE'
import TelemetryChart from '../components/charts/TelemetryChart'

function MetricCard({ label, value, unit, color }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>
        {value != null ? value.toFixed(1) : '—'}
      </p>
      <p className="text-xs text-gray-600 mt-1">{unit}</p>
    </div>
  )
}

export default function TurbineDetail() {
  const { id } = useParams()

  const { data: turbine } = useQuery({
    queryKey: ['turbine', id],
    queryFn: () => getTurbine(id),
  })

  const { data: history } = useQuery({
    queryKey: ['metrics', id],
    queryFn: () => getTurbineMetrics(id, 60),
    refetchInterval: 10_000,
  })

  // SSE for live current-value panel (filter by this turbine)
  const { data: liveAll, connected } = useSSE('/api/turbines/live')
  const live = liveAll?.find(t => t.id === id)
  const latest = live?.latestMetric ?? history?.[history.length - 1]

  const isRunning = latest?.status === 'running'

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          to="/"
          className="text-gray-500 hover:text-white transition-colors text-sm flex items-center gap-1"
        >
          ← Back
        </Link>

        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white">
            {turbine?.name ?? id}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">{id}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* SSE status */}
          <span className={`text-xs flex items-center gap-1.5 text-gray-500`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
            {connected ? 'Live' : 'Connecting…'}
          </span>

          {latest && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
              isRunning
                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                : 'bg-red-950/60 text-red-400 border-red-800'
            }`}>
              {latest.status}
            </span>
          )}
        </div>
      </div>

      {/* Current values */}
      {latest && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-8">
          <MetricCard label="Wind Speed"       value={latest.windSpeed}          unit="m/s"  color="text-cyan-400"   />
          <MetricCard label="Power Output"     value={latest.powerOutput}        unit="kW"   color="text-emerald-400"/>
          <MetricCard label="Rotor Speed"      value={latest.rotorSpeed}         unit="RPM"  color="text-violet-400" />
          <MetricCard label="Blade Pitch"      value={latest.bladePitch}         unit="°"    color="text-pink-400"   />
          <MetricCard label="Wind Direction"   value={latest.windDirection}      unit="°"    color="text-sky-400"    />
          <MetricCard label="Generator Temp"   value={latest.generatorTemp}      unit="°C"   color="text-amber-400"  />
          <MetricCard label="Gearbox Temp"     value={latest.gearboxTemp}        unit="°C"   color="text-red-400"    />
          <MetricCard label="Ambient Temp"     value={latest.ambientTemperature} unit="°C"   color="text-blue-400"   />
          <MetricCard label="Nacelle Dir"      value={latest.nacelleDirection}   unit="°"    color="text-indigo-400" />
          <MetricCard label="Vibration"        value={latest.vibration}          unit=""     color="text-orange-400" />
        </div>
      )}

      {/* Charts */}
      {history && history.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TelemetryChart
            data={history}
            title="Power & Wind"
            metrics={[
              { key: 'windSpeed',   label: 'Wind Speed (m/s)' },
              { key: 'powerOutput', label: 'Power Output (kW)' },
            ]}
          />
          <TelemetryChart
            data={history}
            title="Rotor & Blade Pitch"
            metrics={[
              { key: 'rotorSpeed', label: 'Rotor Speed (RPM)' },
              { key: 'bladePitch', label: 'Blade Pitch (°)' },
            ]}
          />
          <TelemetryChart
            data={history}
            title="Temperatures"
            metrics={[
              { key: 'generatorTemp',      label: 'Generator (°C)' },
              { key: 'gearboxTemp',        label: 'Gearbox (°C)' },
              { key: 'ambientTemperature', label: 'Ambient (°C)' },
            ]}
          />
          <TelemetryChart
            data={history}
            title="Vibration & Direction"
            metrics={[
              { key: 'vibration',      label: 'Vibration' },
              { key: 'windDirection',  label: 'Wind Dir (°)' },
            ]}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-48 text-gray-500 gap-2 border border-gray-800 rounded-xl">
          <p className="text-lg font-medium">No history yet</p>
          <p className="text-sm">Charts will appear as telemetry accumulates</p>
        </div>
      )}
    </div>
  )
}
