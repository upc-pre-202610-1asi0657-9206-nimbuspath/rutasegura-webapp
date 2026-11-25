import apiClient from '@/shared/api/apiClient'
import {
  acknowledgeAlert,
  operationalAlerts,
  resolveAlert,
  tripLive,
  tripPosition,
  tripSummary,
} from '@/modules/tracking/services/trackingService'

export async function getOrganizationTrips({
  from,
  to,
  status = null,
}) {
  const params = {
    from,
    to,
  }

  if (status) {
    params.status = status
  }

  const { data } = await apiClient.get(
    '/trips',
    {
      params,
    },
  )

  return data
}

export async function scheduleTrip(
  routeId,
  serviceDate,
) {
  const { data } = await apiClient.post(
    '/trips',
    {
      routeId,
      serviceDate,
    },
  )

  return data
}

export async function cancelTrip(
  tripId,
  reason,
) {
  await apiClient.post(
    `/trips/${tripId}/cancel`,
    {
      reason,
    },
  )
}

// Live-trip reads and operational alerts are owned by the tracking context; delegated, not duplicated.
export const getTripLive = (tripId, signal) => tripLive(tripId, signal)
export const getTripPosition = (tripId, signal) => tripPosition(tripId, signal)
export const getTripSummary = (tripId, signal) => tripSummary(tripId, signal)
export const getOpenAlerts = (signal) => operationalAlerts(signal)
export const acknowledgeOperationalAlert = (alertId) => acknowledgeAlert(alertId)
export const resolveOperationalAlert = (alertId) => resolveAlert(alertId)
