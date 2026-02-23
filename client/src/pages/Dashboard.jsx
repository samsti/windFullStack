import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTurbines } from '../services/api'
import { useSSE } from '../hooks/useSSE'
import TurbineCard from '../components/TurbineCard'

export default function Dashboard() {
  const { data: initial, isLoading } = useQuery({
    queryKey: ['turbines'],
    queryFn: getTurbines,
    refetchInterval: 10_000,
  })

  const { data: live, connected } = useSSE('/api/turbines/live')
  const [turbines, setTurbines] = useState([])

  useEffect(() => {
    if (live) setTurbines(live)
    else if (initial) setTurbines(initial)
  }, [live, initial])

  const online = turbines.filter(t => t.latestMetric?.status === 'running').length

  return (
    <div>
      {/* Page header */}
      <div className="flex items-end justify-between mb-8">
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

        {/* Live indicator */}
        <div className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-gray-400">{connected ? 'Live' : 'Connecting…'}</span>
        </div>
      </div>

      {/* States */}
      {isLoading && turbines.length === 0 && (
        <div className="flex items-center justify-center h-48 text-gray-500">
          Loading turbines…
        </div>
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
    </div>
  )
}
