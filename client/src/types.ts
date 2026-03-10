export interface TurbineMetric {
  recordedAt: string
  status: string
  windSpeed: number
  powerOutput: number
  rotorSpeed: number
  generatorTemp: number
  gearboxTemp: number
  vibration: number
  bladePitch: number
  windDirection: number
  ambientTemperature: number
  nacelleDirection: number
}

export interface Turbine {
  id: string
  name: string
  lastSeenAt: string | null
  latestMetric: TurbineMetric | null
  isInMaintenance: boolean
  maintenanceReason: string | null
}

export interface Alert {
  id: string
  turbineId: string
  turbineName: string | null
  severity: string
  message: string
  isAcknowledged: boolean
  acknowledgedBy: string | null
  acknowledgedAt: string | null
  triggeredAt: string
}

export interface Command {
  id: string
  turbineId: string
  turbineName: string | null
  action: string
  payload: string
  issuedBy: string
  issuedAt: string
  status: string
}

export interface FarmOverviewPoint {
  recordedAt: string
  totalPower: number
  avgWindSpeed: number
  avgGeneratorTemp: number
}

export interface LoginResponse {
  token: string
}

export interface CommandPayload {
  action: string
  value?: number
  angle?: number
  reason?: string
}

export interface MaintenancePayload {
  enable: boolean
  reason: string | null
}
