import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const getTurbines = () =>
  api.get('/turbines').then(r => r.data)

export const getTurbine = id =>
  api.get(`/turbines/${id}`).then(r => r.data)

export const getTurbineMetrics = (id, minutes = 60) =>
  api.get(`/turbines/${id}/metrics`, { params: { minutes } }).then(r => r.data)

export const getFarmOverview = (minutes = 60) =>
  api.get('/turbines/overview', { params: { minutes } }).then(r => r.data)

export const getAlerts = (limit = 50, unackOnly = false) =>
  api.get('/alerts', { params: { limit, unackOnly } }).then(r => r.data)

export const getTurbineAlerts = (id, limit = 20) =>
  api.get(`/turbines/${id}/alerts`, { params: { limit } }).then(r => r.data)

export const acknowledgeAlert = id =>
  api.post(`/alerts/${id}/acknowledge`).then(r => r.data)
