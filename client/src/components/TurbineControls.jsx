import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { sendCommand, setMaintenance } from '../services/api'

// ── Section card ──────────────────────────────────────────────────────────────
function ControlCard({ title, children }) {
  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 flex flex-col gap-4">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">{title}</p>
      {children}
    </div>
  )
}

// ── Slider ────────────────────────────────────────────────────────────────────
function SliderRow({ value, min, max, onChange, color, label, unit }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-sm font-bold tabular-nums" style={{ color }}>{value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full cursor-pointer"
        style={{ accentColor: color }}
      />
      <div className="flex justify-between text-[10px] text-gray-700 tabular-nums">
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  )
}

// ── Confirm flash ─────────────────────────────────────────────────────────────
function ConfirmBadge() {
  return (
    <div className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-emerald-900
      bg-emerald-950/40 text-emerald-400 text-sm font-medium">
      ✓ Sent
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function TurbineControls({ turbineId, isRunning, currentPitch = 0, isInMaintenance = false }) {
  const qc = useQueryClient()

  // Local optimistic running state — immediately reflects start/stop click
  // null = defer to prop; true/false = override until telemetry catches up
  const [optimisticRunning, setOptimisticRunning] = useState(null)
  const effectiveRunning = optimisticRunning !== null ? optimisticRunning : isRunning

  const [interval, setIntervalVal] = useState(10)
  const [pitch, setPitch]          = useState(() => Math.round(currentPitch ?? 0))
  const [confirmed, setConfirmed]  = useState(null)
  const [maintReason, setMaintReason] = useState('')

  // Track which key to flash — stored in a ref so the mutation-level onSuccess
  // always reads the current value (avoids stale-closure issues)
  const pendingKey = useRef(null)

  const { mutate: cmd, isPending } = useMutation({
    mutationFn: payload => sendCommand(turbineId, payload),

    onSuccess: (_, payload) => {
      // 1. Flash confirmation
      const k = pendingKey.current
      if (k) {
        setConfirmed(k)
        setTimeout(() => setConfirmed(c => c === k ? null : c), 2000)
        pendingKey.current = null
      }

      // 2. Optimistic running state for start / stop
      if (payload.action === 'start') setOptimisticRunning(true)
      if (payload.action === 'stop')  setOptimisticRunning(false)
      // Revert after 8 s — by then real telemetry should have arrived via SSE
      if (payload.action === 'start' || payload.action === 'stop') {
        setTimeout(() => setOptimisticRunning(null), 8_000)
      }

      // 3. Refresh queries so charts / alerts update sooner
      setTimeout(() => {
        qc.invalidateQueries({ queryKey: ['turbine', turbineId] })
        qc.invalidateQueries({ queryKey: ['metrics', turbineId] })
        qc.invalidateQueries({ queryKey: ['turbineAlerts', turbineId] })
      }, 3_000)
    },

    onError: () => {
      setOptimisticRunning(null)
      pendingKey.current = null
    },
  })

  const send = (payload, key) => {
    pendingKey.current = key
    cmd(payload)
  }

  const { mutate: toggleMaint, isPending: maintPending } = useMutation({
    mutationFn: payload => setMaintenance(turbineId, payload),
    onSuccess: () => {
      setConfirmed('maintenance')
      setTimeout(() => setConfirmed(c => c === 'maintenance' ? null : c), 2000)
      setMaintReason('')
      qc.invalidateQueries({ queryKey: ['turbine', turbineId] })
    },
  })

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Turbine Controls
        </h2>
        <div className="flex-1 h-px bg-gray-800" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

        {/* ── Power ── */}
        <ControlCard title="Power">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
              effectiveRunning ? 'bg-emerald-400 animate-pulse' : 'bg-gray-600'
            }`} />
            <span className={`text-sm font-medium ${
              effectiveRunning ? 'text-emerald-400' : 'text-gray-500'
            }`}>
              {effectiveRunning ? 'Running' : 'Stopped'}
            </span>
            {optimisticRunning !== null && (
              <span className="text-[10px] text-gray-600 ml-auto">pending telemetry…</span>
            )}
          </div>

          {confirmed === 'power' ? <ConfirmBadge /> : effectiveRunning ? (
            <button
              onClick={() => send({ action: 'stop', reason: 'operator' }, 'power')}
              disabled={isPending}
              className="w-full py-2 rounded-lg bg-red-950/60 hover:bg-red-900/60 border border-red-800
                text-red-400 hover:text-red-300 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isPending ? 'Sending…' : 'Stop Turbine'}
            </button>
          ) : (
            <button
              onClick={() => send({ action: 'start' }, 'power')}
              disabled={isPending}
              className="w-full py-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800
                text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isPending ? 'Sending…' : 'Start Turbine'}
            </button>
          )}
        </ControlCard>

        {/* ── Interval ── */}
        <ControlCard title="Report Interval">
          <SliderRow
            value={interval} min={1} max={60}
            onChange={setIntervalVal}
            color="#22d3ee" label="Every" unit="s"
          />
          {confirmed === 'interval' ? <ConfirmBadge /> : (
            <button
              onClick={() => send({ action: 'setInterval', value: interval }, 'interval')}
              disabled={isPending}
              className="w-full py-2 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-800
                text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isPending ? 'Sending…' : 'Apply'}
            </button>
          )}
        </ControlCard>

        {/* ── Blade Pitch ── */}
        <ControlCard title="Blade Pitch">
          <SliderRow
            value={pitch} min={0} max={30}
            onChange={setPitch}
            color="#fbbf24" label="Angle" unit="°"
          />
          {confirmed === 'pitch' ? <ConfirmBadge /> : (
            <button
              onClick={() => send({ action: 'setPitch', angle: pitch }, 'pitch')}
              disabled={isPending}
              className="w-full py-2 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800
                text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isPending ? 'Sending…' : 'Apply'}
            </button>
          )}
        </ControlCard>

        {/* ── Maintenance ── */}
        <ControlCard title="Maintenance">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
              isInMaintenance ? 'bg-violet-400 animate-pulse' : 'bg-gray-600'
            }`} />
            <span className={`text-sm font-medium ${
              isInMaintenance ? 'text-violet-400' : 'text-gray-500'
            }`}>
              {isInMaintenance ? 'In Maintenance' : 'Operational'}
            </span>
          </div>

          {!isInMaintenance && (
            <input
              type="text"
              placeholder="Reason (optional)"
              value={maintReason}
              onChange={e => setMaintReason(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700
                text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-700"
            />
          )}

          {confirmed === 'maintenance' ? <ConfirmBadge /> : (
            <button
              onClick={() => toggleMaint({ enable: !isInMaintenance, reason: maintReason || null })}
              disabled={maintPending}
              className={`w-full py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 border ${
                isInMaintenance
                  ? 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300 hover:text-white'
                  : 'bg-violet-950/60 hover:bg-violet-900/60 border-violet-800 text-violet-400 hover:text-violet-300'
              }`}
            >
              {maintPending ? 'Updating…' : isInMaintenance ? 'Exit Maintenance' : 'Enter Maintenance'}
            </button>
          )}
        </ControlCard>

      </div>
    </div>
  )
}
