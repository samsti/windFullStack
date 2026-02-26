import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getTurbineDisplayState } from '../utils/turbineStatus'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTurbine, getTurbineMetrics, getTurbineAlerts, acknowledgeAlert } from '../services/api'
import { useSSE } from '../hooks/useSSE'
import TelemetryChart from '../components/charts/TelemetryChart'
import WindmillVisualization from '../components/WindmillVisualization'
import TurbineControls from '../components/TurbineControls'

const RANGES = [
  { label: '1h',  minutes: 60,     bucket: 1    },
  { label: '1d',  minutes: 1440,   bucket: 30   },
  { label: '30d', minutes: 43200,  bucket: 720  },
  { label: '90d', minutes: 129600, bucket: 1440 },
  { label: 'All', minutes: 0,      bucket: 1440 },
]

export default function TurbineDetail() {
  const { id } = useParams()
  const [rangeIdx, setRangeIdx] = useState(0)
  const range = RANGES[rangeIdx]

  const { data: turbine } = useQuery({
    queryKey: ['turbine', id],
    queryFn: () => getTurbine(id),
  })

  const { data: history, isFetching: historyFetching } = useQuery({
    queryKey: ['metrics', id, range.minutes, range.bucket],
    queryFn: () => getTurbineMetrics(id, range.minutes, range.bucket),
    refetchInterval: range.minutes <= 60 ? 10_000 : range.minutes <= 1440 ? 60_000 : 5 * 60_000,
  })

  const qc = useQueryClient()

  const { data: turbineAlerts = [] } = useQuery({
    queryKey: ['turbineAlerts', id],
    queryFn: () => getTurbineAlerts(id, 20),
    refetchInterval: 15_000,
  })

  const { mutate: ack } = useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['turbineAlerts', id] }),
  })

  const { data: liveAll, connected } = useSSE('/api/turbines/live')
  const live   = liveAll?.find(t => t.id === id)
  const latest = live?.latestMetric ?? history?.[history.length - 1]

  // Use SSE for running/stopped/offline (updates every telemetry tick)
  // Use REST turbine query for maintenance (SSE only fires on TurbineMetric changes, not Turbine)
  const statusSource    = live ?? turbine
  const displayState    = getTurbineDisplayState(statusSource)
  const isRunning       = displayState === 'running'
  const isInMaintenance = turbine?.isInMaintenance ?? false

  return (
    <div>
      {/* ── Header ── */}
      <div className="flex items-center gap-4 mb-6">
        <Link
          to="/"
          className="text-gray-500 hover:text-white transition-colors text-sm flex items-center gap-1"
        >
          ← Back
        </Link>

        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white">{turbine?.name ?? id}</h1>
          <p className="text-gray-500 text-sm mt-0.5">{id}</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs flex items-center gap-1.5 text-gray-500">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'}`} />
            {connected ? 'Live' : 'Connecting…'}
          </span>

          {statusSource && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
              displayState === 'running' ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800' :
              displayState === 'stopped' ? 'bg-red-950/60 text-red-400 border-red-800' :
              'bg-gray-800/60 text-gray-500 border-gray-700'
            }`}>
              {displayState}
            </span>
          )}
          {isInMaintenance && (
            <span className="px-3 py-1 rounded-full text-sm font-medium border bg-violet-950/60 text-violet-400 border-violet-800 flex items-center gap-1.5">
              🔧 Maintenance
            </span>
          )}
        </div>
      </div>

      {/* ── Offline / maintenance banners ── */}
      {displayState === 'offline' && (
        <div className="mb-4 px-4 py-3 rounded-xl border border-gray-700 bg-gray-900/80 text-gray-400 text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gray-500 flex-shrink-0" />
          No telemetry received for over 5 minutes — turbine may be offline.
        </div>
      )}
      {isInMaintenance && statusSource?.maintenanceReason && (
        <div className="mb-4 px-4 py-3 rounded-xl border border-violet-800/40 bg-violet-950/20 text-violet-300 text-sm flex items-center gap-2">
          <span className="flex-shrink-0">🔧</span>
          Maintenance in progress{statusSource.maintenanceReason ? `: ${statusSource.maintenanceReason}` : ''}. Alerts suppressed.
        </div>
      )}

      {/* ── Live visualisation ── */}
      <WindmillVisualization latest={latest} isRunning={isRunning} />

      {/* ── Operator controls ── */}
      <TurbineControls
        turbineId={id}
        isRunning={isRunning}
        currentPitch={latest?.bladePitch}
        isInMaintenance={isInMaintenance}
      />

      {/* ── Historical trends ── */}
      <div className="mb-2">
        <div className="flex items-center gap-4 mb-4">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            Historical trends
          </h2>

          {/* Range tabs */}
          <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
            {RANGES.map((r, i) => (
              <button
                key={r.label}
                onClick={() => setRangeIdx(i)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  rangeIdx === i
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {historyFetching && (
            <span className="text-xs text-gray-600">Loading…</span>
          )}
        </div>

        {history && history.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TelemetryChart
              data={history}
              title="Power & Wind"
              bucket={range.bucket}
              metrics={[
                { key: 'windSpeed',   label: 'Wind Speed (m/s)' },
                { key: 'powerOutput', label: 'Power Output (kW)' },
              ]}
            />
            <TelemetryChart
              data={history}
              title="Temperatures"
              bucket={range.bucket}
              metrics={[
                { key: 'generatorTemp',      label: 'Generator (°C)' },
                { key: 'gearboxTemp',        label: 'Gearbox (°C)' },
                { key: 'ambientTemperature', label: 'Ambient (°C)' },
              ]}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500 gap-2 border border-gray-800 rounded-xl">
            <p className="text-base font-medium">No data for this range</p>
            <p className="text-sm">Try a shorter time window or wait for more telemetry</p>
          </div>
        )}
      </div>

      {/* ── Turbine alerts ── */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            Recent alerts
          </h2>
          {turbineAlerts.some(a => !a.isAcknowledged) && (
            <span className="text-xs text-amber-400">
              {turbineAlerts.filter(a => !a.isAcknowledged).length} unacknowledged
            </span>
          )}
        </div>

        {turbineAlerts.length === 0 ? (
          <div className="flex items-center justify-center h-24 text-gray-600 text-sm border border-gray-800 rounded-xl">
            No alerts for this turbine
          </div>
        ) : (
          <div className="space-y-2">
            {turbineAlerts.map(alert => {
              const sevColor =
                alert.severity?.toLowerCase() === 'critical' ? { border: 'border-red-900',   dot: 'bg-red-400',   badge: 'bg-red-950/60 text-red-400 border-red-800'   } :
                alert.severity?.toLowerCase() === 'warning'  ? { border: 'border-amber-900', dot: 'bg-amber-400', badge: 'bg-amber-950/60 text-amber-400 border-amber-800' } :
                                                               { border: 'border-blue-900',  dot: 'bg-blue-400',  badge: 'bg-blue-950/60 text-blue-400 border-blue-800'  }
              const ago = iso => {
                const m = Math.floor((Date.now() - new Date(iso)) / 60000)
                return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : `${Math.floor(m/60)}h ago`
              }
              return (
                <div key={alert.id} className={`
                  flex items-start gap-3 p-3 rounded-xl border bg-gray-900
                  ${alert.isAcknowledged ? 'border-gray-800 opacity-50' : sevColor.border}
                `}>
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${sevColor.dot} ${!alert.isAcknowledged ? 'animate-pulse' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded border font-bold uppercase ${sevColor.badge}`}>
                        {alert.severity}
                      </span>
                      <span className="text-xs text-gray-500">{ago(alert.triggeredAt)}</span>
                    </div>
                    <p className="text-sm text-gray-300">{alert.message}</p>
                    {alert.isAcknowledged && (
                      <p className="text-xs text-gray-600 mt-0.5">
                        Acknowledged{alert.acknowledgedBy ? ` by ${alert.acknowledgedBy}` : ''}
                      </p>
                    )}
                  </div>
                  {!alert.isAcknowledged && (
                    <button
                      onClick={() => ack(alert.id)}
                      className="flex-shrink-0 text-xs px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 hover:text-white transition-colors"
                    >
                      Ack
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
