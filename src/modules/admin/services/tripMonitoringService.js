import apiClient from '@/shared/api/apiClient'

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

export async function getTripLive(
  tripId,
) {
  const { data } = await apiClient.get(
    `/trips/${tripId}/live`,
  )

  return data
}

export async function getTripPosition(
  tripId,
) {
  const { data } = await apiClient.get(
    `/trips/${tripId}/position`,
  )

  return data
}

export async function getTripSummary(
  tripId,
) {
  const { data } = await apiClient.get(
    `/trips/${tripId}/summary`,
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