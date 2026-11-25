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
export const acknowledgeAlert = (alertId) =>
  api.post(`/operations/alerts/${encodeURIComponent(alertId)}/acknowledge`)
export const resolveAlert = (alertId) =>
  api.post(`/operations/alerts/${encodeURIComponent(alertId)}/resolve`)
export const tripTrack = (id, signal) =>
  api.get(`/trips/${id}/track`, { signal }).then((r) => r.data)
export const tripOperationalDetails = (id, signal) =>
  api.get(`/trips/${id}/operational-details`, { signal }).then((r) => r.data)
// Builds a GeoJSON LineString from the real recorded track; returns null when fewer than 2 valid points exist.
export function trackToGeometry(data) {
  const raw = Array.isArray(data)
    ? data
    : data?.points || data?.positions || data?.coordinates || []
  const coordinates = raw
    .map((p) =>
      Array.isArray(p)
        ? [Number(p[1]), Number(p[0])]
        : [Number(p?.longitude ?? p?.lng), Number(p?.latitude ?? p?.lat)],
    )
    .filter(
      ([lng, lat]) =>
        Number.isFinite(lng) &&
        Number.isFinite(lat) &&
        Math.abs(lat) <= 90 &&
        Math.abs(lng) <= 180,
    )
  return coordinates.length > 1 ? { type: 'LineString', coordinates } : null
}
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
