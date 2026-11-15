import api from '@/shared/api/apiClient'
export const tripLive = (id, signal) =>
  api.get(`/trips/${id}/live`, { signal }).then((r) => r.data)
export const tripPosition = (id, signal) =>
  api.get(`/trips/${id}/position`, { signal }).then((r) => r.data)
export const resolveSos = (id) => api.post(`/trips/${id}/sos/resolve`)
export const tripSummary = (id, signal) =>
  api.get(`/trips/${id}/summary`, { signal }).then((r) => r.data)
export const operationalAlerts = (signal) =>
  api
    .get('/operations/alerts', { signal, params: { onlyOpen: true } })
    .then((r) => r.data)
export function limaDay(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  return ['year', 'month', 'day']
    .map((key) => parts.find((p) => p.type === key).value)
    .join('-')
}
export function dayRange(day) {
  const from = new Date(`${day}T00:00:00-05:00`)
  return {
    from: from.toISOString(),
    to: new Date(+from + 86400000).toISOString(),
  }
}
export const tripStatus = (value) =>
  ({
    Scheduled: 'Programado',
    InProgress: 'En curso',
    Delayed: 'En curso con retraso',
    Completed: 'Completado',
    Cancelled: 'Cancelado',
  })[value] || value
export const passengerStatus = (value) =>
  ({
    Expected: 'Por recoger',
    Pending: 'Por recoger',
    OnBoard: 'A bordo',
    Boarded: 'A bordo',
    Alighted: 'Desembarcó',
    Delivered: 'Entregado',
    Absent: 'Ausente',
  })[value] || value

export const isActiveTrip = (status) =>
  status === 'InProgress' || status === 'Delayed'
export const incidentLabel = (value) =>
  ({
    HeavyTraffic: 'Tráfico intenso',
    RouteDeviation: 'Desvío de ruta',
    VehicleFailure: 'Falla del vehículo',
    StudentUnwell: 'Alumno indispuesto',
    Accident: 'Accidente',
    Other: 'Otro incidente',
    INCIDENT: 'Incidente',
    SOS: 'SOS',
  })[value] || value
export const severityLabel = (value) =>
  ({ LOW: 'Baja', MEDIUM: 'Media', HIGH: 'Alta', CRITICAL: 'Crítica' })[
    value
  ] || value
export const alertStatusLabel = (value) =>
  ({ OPEN: 'Abierta', ACKNOWLEDGED: 'Reconocida', RESOLVED: 'Resuelta' })[
    value
  ] || value
