import axios from 'axios'
import type { Turbine, Alert, Command, FarmOverviewPoint, LoginResponse, CommandPayload, MaintenancePayload, TurbineMetric } from '../types'

const BASE = import.meta.env.VITE_API_URL ?? ''
const api = axios.create({ baseURL: `${BASE}/api` })

const TOKEN_KEY = 'wind_token'

export const auth = {
  getToken:   (): string | null => localStorage.getItem(TOKEN_KEY),
  setToken:   (token: string)   => localStorage.setItem(TOKEN_KEY, token),
  clearToken: ()                => localStorage.removeItem(TOKEN_KEY),
  isLoggedIn: ()                => !!localStorage.getItem(TOKEN_KEY),
}

api.interceptors.request.use(config => {
  const token = auth.getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && !err.config.url?.includes('/auth/')) {
      auth.clearToken()
      window.dispatchEvent(new CustomEvent('auth:expired'))
    }
    return Promise.reject(err)
  }
)

export const getTurbines = (): Promise<Turbine[]> =>
  api.get('/turbines').then(r => r.data)

export const getTurbine = (id: string): Promise<Turbine> =>
  api.get(`/turbines/${id}`).then(r => r.data)

export const getTurbineMetrics = (id: string, minutes = 60, bucket = 1): Promise<TurbineMetric[]> =>
  api.get(`/turbines/${id}/metrics`, { params: { minutes, bucket } }).then(r => r.data)

export const getFarmOverview = (minutes = 60, bucket = 1): Promise<FarmOverviewPoint[]> =>
  api.get('/turbines/overview', { params: { minutes, bucket } }).then(r => r.data)

export const getAlerts = (limit = 50, unackOnly = false): Promise<Alert[]> =>
  api.get('/alerts', { params: { limit, unackOnly } }).then(r => r.data)

export const getTurbineAlerts = (id: string, limit = 20): Promise<Alert[]> =>
  api.get(`/turbines/${id}/alerts`, { params: { limit } }).then(r => r.data)

export const acknowledgeAlert = (id: string): Promise<void> =>
  api.post(`/alerts/${id}/acknowledge`).then(r => r.data)

export const acknowledgeAllWarnings = (): Promise<{ acknowledged: number }> =>
  api.post('/alerts/acknowledge-warnings').then(r => r.data)

export const sendCommand = (id: string, payload: CommandPayload): Promise<void> =>
  api.post(`/turbines/${id}/command`, payload).then(r => r.data)

export const setMaintenance = (id: string, payload: MaintenancePayload): Promise<void> =>
  api.post(`/turbines/${id}/maintenance`, payload).then(r => r.data)

export const getCommands = (turbineId: string | null = null, limit = 200): Promise<Command[]> =>
  api.get('/commands', { params: { turbineId: turbineId || undefined, limit } }).then(r => r.data)

export const login = (email: string, password: string): Promise<LoginResponse> =>
  api.post('/auth/login', { email, password }).then(r => r.data)
