import type { Turbine } from '../types'

const STALE_MS = 5 * 60 * 1000 // 5 minutes — matches OfflineDetectionService.StaleAge

/**
 * Returns 'running' | 'stopped' | 'offline'
 * - offline: no telemetry received in the last 5 min (matches server-side threshold)
 * - running: recent telemetry with status === 'running'
 * - stopped: recent telemetry but status !== 'running'
 */
export function getTurbineDisplayState(turbine: Turbine | null | undefined): 'running' | 'stopped' | 'offline' {
  if (!turbine) return 'offline'
  const lastSeen = turbine.lastSeenAt ? new Date(turbine.lastSeenAt) : null
  const isStale  = !lastSeen || Date.now() - lastSeen.getTime() > STALE_MS
  if (isStale) return 'offline'
  return turbine.latestMetric?.status === 'running' ? 'running' : 'stopped'
}
