import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAlerts, acknowledgeAlert } from '../services/api'

// ── Helpers ──────────────────────────────────────────────────────────────────

const SEV = {
  critical: {
    border: 'border-red-800',
    badge:  'bg-red-950/60 text-red-400 border border-red-800',
    dot:    'bg-red-400',
    glow:   'shadow-red-900/40',
  },
  warning: {
    border: 'border-amber-800',
    badge:  'bg-amber-950/60 text-amber-400 border border-amber-800',
    dot:    'bg-amber-400',
    glow:   'shadow-amber-900/40',
  },
  info: {
    border: 'border-blue-800',
    badge:  'bg-blue-950/60 text-blue-400 border border-blue-800',
    dot:    'bg-blue-400',
    glow:   '',
  },
}

function sev(s) {
  return SEV[s?.toLowerCase()] ?? SEV.info
}

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m <  1)  return 'just now'
  if (m < 60)  return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24)  return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Alert row ─────────────────────────────────────────────────────────────────

function AlertRow({ alert, onAck, ackPending }) {
  const s = sev(alert.severity)
  return (
    <div className={`
      bg-gray-900 border rounded-xl p-4 flex items-start gap-4
      ${alert.isAcknowledged ? 'border-gray-800 opacity-55' : `${s.border} shadow-md ${s.glow}`}
    `}>
      {/* Severity pulse dot */}
      <div className={`
        w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${s.dot}
        ${!alert.isAcknowledged ? 'animate-pulse' : ''}
      `} />

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
          <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${s.badge}`}>
            {alert.severity}
          </span>
          <Link
            to={`/turbine/${alert.turbineId}`}
            className="text-sm font-semibold text-white hover:text-cyan-400 transition-colors"
          >
            {alert.turbineName ?? alert.turbineId}
          </Link>
          <span className="text-gray-700 text-xs">·</span>
          <span className="text-xs text-gray-500">{timeAgo(alert.triggeredAt)}</span>
        </div>

        <p className="text-sm text-gray-300 leading-snug">{alert.message}</p>

        {alert.isAcknowledged && (
          <p className="text-xs text-gray-600 mt-1.5">
            Acknowledged{alert.acknowledgedBy ? ` by ${alert.acknowledgedBy}` : ''}
            {alert.acknowledgedAt ? ` · ${timeAgo(alert.acknowledgedAt)}` : ''}
          </p>
        )}
      </div>

      {/* Acknowledge button */}
      {!alert.isAcknowledged && (
        <button
          onClick={() => onAck(alert.id)}
          disabled={ackPending}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium
            bg-gray-800 hover:bg-gray-700 border border-gray-700
            text-gray-300 hover:text-white transition-colors disabled:opacity-50"
        >
          Acknowledge
        </button>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

const FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'unack',    label: 'Unacknowledged' },
  { key: 'critical', label: 'Critical' },
  { key: 'warning',  label: 'Warning' },
]

export default function AlertsPage() {
  const [filter, setFilter] = useState('all')
  const qc = useQueryClient()

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['alerts', filter === 'unack'],
    queryFn: () => getAlerts(100, filter === 'unack'),
    refetchInterval: 10_000,
  })

  const { mutate: ack, isPending: ackPending } = useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alerts'] }),
  })

  // client-side severity filter (all data already loaded)
  const filtered =
    filter === 'critical' ? alerts.filter(a => a.severity?.toLowerCase() === 'critical') :
    filter === 'warning'  ? alerts.filter(a => a.severity?.toLowerCase() === 'warning')  :
    alerts

  const unackCount    = alerts.filter(a => !a.isAcknowledged).length
  const criticalCount = alerts.filter(a => a.severity?.toLowerCase() === 'critical' && !a.isAcknowledged).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Alerts</h1>
          <p className="text-gray-500 text-sm mt-0.5">All turbine alerts across the farm</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {criticalCount > 0 && (
            <span className="px-3 py-1 bg-red-950/60 text-red-400 border border-red-800 rounded-full text-sm font-medium animate-pulse">
              {criticalCount} critical
            </span>
          )}
          {unackCount > 0 && (
            <span className="px-3 py-1 bg-amber-950/60 text-amber-400 border border-amber-800 rounded-full text-sm font-medium">
              {unackCount} unacknowledged
            </span>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6 w-fit">
        {FILTERS.map(f => {
          const badge =
            f.key === 'unack'    ? unackCount    :
            f.key === 'critical' ? criticalCount : 0
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                filter === f.key ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {f.label}
              {badge > 0 && (
                <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${
                  f.key === 'critical' ? 'bg-red-900 text-red-400' : 'bg-amber-900 text-amber-400'
                }`}>
                  {badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-gray-500 text-center py-16">Loading alerts…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-44
          text-gray-500 gap-2 border border-gray-800 rounded-xl">
          <p className="text-base font-medium">No alerts</p>
          <p className="text-sm">All systems normal</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(alert => (
            <AlertRow
              key={alert.id}
              alert={alert}
              onAck={ack}
              ackPending={ackPending}
            />
          ))}
        </div>
      )}
    </div>
  )
}
