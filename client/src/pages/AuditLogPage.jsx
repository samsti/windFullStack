import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getTurbines, getCommands } from '../services/api'


// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1)  return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function parsePayloadSummary(payload) {
  try {
    const p = JSON.parse(payload)
    if (p.value  != null)  return `interval = ${p.value}s`
    if (p.angle  != null)  return `angle = ${p.angle}°`
    if (p.reason != null)  return `reason: ${p.reason}`
    return ''
  } catch { return '' }
}

const ACTION_STYLE = {
  start:       'bg-emerald-950/60 text-emerald-400 border-emerald-800',
  stop:        'bg-red-950/60 text-red-400 border-red-800',
  setInterval: 'bg-cyan-950/60 text-cyan-400 border-cyan-800',
  setPitch:    'bg-amber-950/60 text-amber-400 border-amber-800',
}

const ACTIONS = ['start', 'stop', 'setInterval', 'setPitch']

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AuditLogPage() {
  const [turbineFilter, setTurbineFilter] = useState('')
  const [actionFilter,  setActionFilter]  = useState('')

  const { data: turbines = [] } = useQuery({
    queryKey: ['turbines'],
    queryFn: getTurbines,
  })

  const { data: commands = [], isLoading } = useQuery({
    queryKey: ['commands', turbineFilter],
    queryFn: () => getCommands(turbineFilter || null, 200),
    refetchInterval: 30_000,
  })

  const filtered = actionFilter
    ? commands.filter(c => c.action === actionFilter)
    : commands

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Audit Log</h1>
          <p className="text-gray-500 text-sm mt-0.5">All operator commands across the farm</p>
        </div>
        <span className="text-xs text-gray-600 mt-3">{filtered.length} entries</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {/* Turbine dropdown */}
        <select
          value={turbineFilter}
          onChange={e => setTurbineFilter(e.target.value)}
          className="px-3 py-1.5 bg-gray-900 border border-gray-800 rounded-lg
            text-sm text-white focus:outline-none focus:border-cyan-700 cursor-pointer"
        >
          <option value="">All Turbines</option>
          {turbines.map(t => (
            <option key={t.id} value={t.id}>{t.name || t.id}</option>
          ))}
        </select>

        {/* Action filter tabs */}
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
          <button
            onClick={() => setActionFilter('')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              actionFilter === '' ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            All
          </button>
          {ACTIONS.map(a => (
            <button
              key={a}
              onClick={() => setActionFilter(a)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                actionFilter === a ? 'bg-gray-800 text-white' : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-gray-500 text-center py-16">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-44
          text-gray-500 gap-2 border border-gray-800 rounded-xl">
          <p className="text-base font-medium">No commands found</p>
          <p className="text-sm">Commands appear here after operators use the controls</p>
        </div>
      ) : (
        <div className="border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-900/80 text-[10px] text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Time</th>
                <th className="px-4 py-3 text-left font-medium">Turbine</th>
                <th className="px-4 py-3 text-left font-medium">Action</th>
                <th className="px-4 py-3 text-left font-medium">Parameters</th>
                <th className="px-4 py-3 text-left font-medium">Issued By</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {filtered.map(cmd => (
                <tr key={cmd.id} className="bg-gray-950 hover:bg-gray-900/60 transition-colors">
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    <span className="text-gray-300">{timeAgo(cmd.issuedAt)}</span>
                    <span className="block text-[10px] text-gray-600 mt-0.5">
                      {new Date(cmd.issuedAt).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/turbine/${cmd.turbineId}`}
                      className="text-white hover:text-cyan-400 transition-colors font-medium"
                    >
                      {cmd.turbineName || cmd.turbineId}
                    </Link>
                    <span className="block text-[10px] text-gray-600 mt-0.5">{cmd.turbineId}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded border text-xs font-bold uppercase
                      ${ACTION_STYLE[cmd.action] ?? 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                      {cmd.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                    {parsePayloadSummary(cmd.payload)}
                  </td>
                  <td className="px-4 py-3 text-gray-400">{cmd.issuedBy}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-500 border border-gray-700">
                      {cmd.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
