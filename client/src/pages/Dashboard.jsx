import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTurbines, getFarmOverview } from '../services/api'
import { useSSE } from '../hooks/useSSE'
import TurbineCard from '../components/TurbineCard'
import { TotalPowerChart, WindAndTempChart } from '../components/charts/FarmOverviewChart'

function StatCard({ label, value, unit, color = 'text-white' }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex flex-col gap-1">
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>
        {value ?? '—'}
        {unit && <span className="text-sm text-gray-500 font-normal ml-1">{unit}</span>}
      </p>
    </div>
  )
}

export default function Dashboard() {
  const { data: initial, isLoading } = useQuery({
    queryKey: ['turbines'],
    queryFn: getTurbines,
    refetchInterval: 10_000,
  })

  const { data: overview } = useQuery({
    queryKey: ['overview'],
    queryFn: () => getFarmOverview(60),
    refetchInterval: 30_000,
  })

  const { data: live, connected } = useSSE('/api/turbines/live')
  const [turbines, setTurbines] = useState([])

  useEffect(() => {
    if (live) setTurbines(live)
    else if (initial) setTurbines(initial)
  }, [live, initial])

  const online  = turbines.filter(t => t.latestMetric?.status === 'running').length
  const totalPower  = turbines.reduce((s, t) => s + (t.latestMetric?.powerOutput ?? 0), 0)
  const avgWind     = turbines.length
    ? turbines.reduce((s, t) => s + (t.latestMetric?.windSpeed ?? 0), 0) / turbines.length
    : null
  const avgGenTemp  = turbines.length
    ? turbines.reduce((s, t) => s + (t.latestMetric?.generatorTemp ?? 0), 0) / turbines.length
    : null

  return (
    <div>
      {/* Page header */}
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Overview</h1>
          <p className="text-gray-400 mt-1 text-sm">
            {turbines.length} turbines &nbsp;·&nbsp;
            <span className="text-emerald-400">{online} running</span>
            {turbines.length - online > 0 && (
              <span className="text-red-400"> &nbsp;·&nbsp; {turbines.length - online} stopped</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-gray-400">{connected ? 'Live' : 'Connecting…'}</span>
        </div>
      </div>

      {/* Aggregate stats bar */}
      {turbines.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <StatCard label="Total Power"    value={totalPower.toFixed(0)} unit="kW"  color="text-emerald-400" />
          <StatCard label="Avg Wind Speed" value={avgWind?.toFixed(1)}   unit="m/s" color="text-cyan-400"    />
          <StatCard label="Avg Gen Temp"   value={avgGenTemp?.toFixed(1)} unit="°C"  color="text-amber-400"   />
          <StatCard label="Online"         value={`${online} / ${turbines.length}`}  color="text-white"       />
        </div>
      )}

      {/* Turbine cards */}
      {isLoading && turbines.length === 0 && (
        <div className="flex items-center justify-center h-48 text-gray-500">Loading turbines…</div>
      )}

      {!isLoading && turbines.length === 0 && (
        <div className="flex flex-col items-center justify-center h-48 text-gray-500 gap-2">
          <p className="text-lg font-medium">No turbines yet</p>
          <p className="text-sm">Waiting for MQTT telemetry on the broker…</p>
        </div>
      )}

      {turbines.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {turbines.map(t => <TurbineCard key={t.id} turbine={t} />)}
        </div>
      )}

      {/* Farm-wide trend charts */}
      {overview?.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-white mb-4">Farm Trends</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TotalPowerChart data={overview} />
            <WindAndTempChart data={overview} />
          </div>
        </div>
      )}
    </div>
  )
}
