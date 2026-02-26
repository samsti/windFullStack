import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

const TOKEN_KEY = 'wind_token'

export const auth = {
  getToken:  ()      => localStorage.getItem(TOKEN_KEY),
  setToken:  token   => localStorage.setItem(TOKEN_KEY, token),
  clearToken: ()     => localStorage.removeItem(TOKEN_KEY),
  isLoggedIn: ()     => !!localStorage.getItem(TOKEN_KEY),
}

// Attach JWT on every request
api.interceptors.request.use(config => {
  const token = auth.getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// On 401, clear stale token and prompt re-login
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

export const getTurbines = () =>
  api.get('/turbines').then(r => r.data)

export const getTurbine = id =>
  api.get(`/turbines/${id}`).then(r => r.data)

export const getTurbineMetrics = (id, minutes = 60, bucket = 1) =>
  api.get(`/turbines/${id}/metrics`, { params: { minutes, bucket } }).then(r => r.data)

export const getFarmOverview = (minutes = 60, bucket = 1) =>
  api.get('/turbines/overview', { params: { minutes, bucket } }).then(r => r.data)

export const getAlerts = (limit = 50, unackOnly = false) =>
  api.get('/alerts', { params: { limit, unackOnly } }).then(r => r.data)

export const getTurbineAlerts = (id, limit = 20) =>
  api.get(`/turbines/${id}/alerts`, { params: { limit } }).then(r => r.data)

export const acknowledgeAlert = id =>
  api.post(`/alerts/${id}/acknowledge`).then(r => r.data)

export const sendCommand = (id, payload) =>
  api.post(`/turbines/${id}/command`, payload).then(r => r.data)

export const setMaintenance = (id, payload) =>
  api.post(`/turbines/${id}/maintenance`, payload).then(r => r.data)

export const getCommands = (turbineId = null, limit = 200) =>
  api.get('/commands', { params: { turbineId: turbineId || undefined, limit } }).then(r => r.data)

export const login = (email, password) =>
  api.post('/auth/login', { email, password }).then(r => r.data)
