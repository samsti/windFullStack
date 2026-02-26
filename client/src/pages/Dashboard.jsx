import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTurbines, getFarmOverview } from '../services/api'
import { useSSE } from '../hooks/useSSE'
import TurbineCard from '../components/TurbineCard'
import { TotalPowerChart, WindAndTempChart } from '../components/charts/FarmOverviewChart'
import { getTurbineDisplayState } from '../utils/turbineStatus'

const OVERVIEW_RANGES = [
  { label: '1h',  minutes: 60,     bucket: 1    },
  { label: '1d',  minutes: 1440,   bucket: 30   },
  { label: '30d', minutes: 43200,  bucket: 720  },
  { label: '90d', minutes: 129600, bucket: 1440 },
  { label: 'All', minutes: 0,      bucket: 1440 },
]

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
  const [overviewRangeIdx, setOverviewRangeIdx] = useState(0)
  const overviewRange = OVERVIEW_RANGES[overviewRangeIdx]

  const { data: initial, isLoading } = useQuery({
    queryKey: ['turbines'],
    queryFn: getTurbines,
    refetchInterval: 10_000,
  })

  const { data: overview, isFetching: overviewFetching } = useQuery({
    queryKey: ['overview', overviewRange.minutes, overviewRange.bucket],
    queryFn: () => getFarmOverview(overviewRange.minutes, overviewRange.bucket),
    refetchInterval: overviewRange.minutes <= 60 ? 30_000 : overviewRange.minutes <= 1440 ? 60_000 : 5 * 60_000,
  })

  const { data: live, connected } = useSSE('/api/turbines/live')
  const [turbines, setTurbines] = useState([])

  useEffect(() => {
    if (live) setTurbines(live)
    else if (initial) setTurbines(initial)
  }, [live, initial])

  const online  = turbines.filter(t => getTurbineDisplayState(t) === 'running').length
  const offline = turbines.filter(t => getTurbineDisplayState(t) === 'offline').length
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
            {turbines.length - online - offline > 0 && (
              <span className="text-red-400"> &nbsp;·&nbsp; {turbines.length - online - offline} stopped</span>
            )}
            {offline > 0 && (
              <span className="text-gray-500"> &nbsp;·&nbsp; {offline} offline</span>
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
      {(overview?.length > 0 || overviewFetching) && (
        <div className="mt-10">
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-lg font-semibold text-white">Farm Trends</h2>

            <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
              {OVERVIEW_RANGES.map((r, i) => (
                <button
                  key={r.label}
                  onClick={() => setOverviewRangeIdx(i)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    overviewRangeIdx === i
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {overviewFetching && (
              <span className="text-xs text-gray-600">Loading…</span>
            )}
          </div>

          {overview?.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TotalPowerChart data={overview} bucket={overviewRange.bucket} />
              <WindAndTempChart data={overview} bucket={overviewRange.bucket} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-600 text-sm border border-gray-800 rounded-xl">
              No data for this range
            </div>
          )}
        </div>
      )}
    </div>
  )
}
