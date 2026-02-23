import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export const getTurbines = () =>
  api.get('/turbines').then(r => r.data)

export const getTurbine = id =>
  api.get(`/turbines/${id}`).then(r => r.data)

export const getTurbineMetrics = (id, minutes = 60) =>
  api.get(`/turbines/${id}/metrics`, { params: { minutes } }).then(r => r.data)
