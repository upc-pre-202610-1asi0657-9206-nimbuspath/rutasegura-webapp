import apiClient from '@/shared/api/apiClient'

function normalizeTime(value) {
  if (!value) return value

  return value.length === 5
    ? `${value}:00`
    : value
}

// ============================================================
// ROUTES
// ============================================================

export async function getAdminRoutes() {
  const { data } = await apiClient.get('/routes')

  return data
}

export async function getRouteQuota() {
  const { data } = await apiClient.get(
    '/routes/quota',
  )

  return data
}

export async function createRoute(payload) {
  const { data } = await apiClient.post(
    '/routes',
    {
      name: payload.name.trim(),

      direction: payload.direction,

      departureTime: normalizeTime(
        payload.departureTime,
      ),

      estimatedArrivalTime: normalizeTime(
        payload.estimatedArrivalTime,
      ),

      timeZoneId:
        payload.timeZoneId ||
        'America/Lima',

      operatingDays:
        payload.operatingDays,
    },
  )

  return data
}

export async function getRouteById(
  routeId,
) {
  const { data } = await apiClient.get(
    `/routes/${routeId}`,
  )

  return data
}

export async function regenerateEnrollmentCode(
  routeId,
) {
  const { data } = await apiClient.post(
    `/routes/${routeId}/enrollment-code`,
  )

  return data
}

export async function deleteRoute(routeId) {
  await apiClient.delete(
    `/routes/${routeId}`,
  )
}

export async function assignRouteResources(
  routeId,
  driverId,
  vehicleId,
) {
  const { data } = await apiClient.put(
    `/routes/${routeId}/assignment`,
    {
      driverId,
      vehicleId,
    },
  )

  return data
}

export async function releaseRouteResources(
  routeId,
) {
  const { data } = await apiClient.delete(
    `/routes/${routeId}/assignment`,
  )

  return data
}

export async function renameRoute(routeId, name) {
  await apiClient.put(`/routes/${encodeURIComponent(routeId)}/name`, {
    name: name.trim(),
  })
}

export async function changeRouteSchedule(routeId, schedule) {
  const payload = {
    departureTime: normalizeTime(schedule.departureTime),
    estimatedArrivalTime: normalizeTime(schedule.estimatedArrivalTime),
    operatingDays: schedule.operatingDays,
  }
  if (schedule.timeZoneId) payload.timeZoneId = schedule.timeZoneId
  await apiClient.put(`/routes/${encodeURIComponent(routeId)}/schedule`, payload)
}

export async function getRouteTripRecords(routeId, signal) {
  const { data } = await apiClient.get(
    `/routes/${encodeURIComponent(routeId)}/trip-records`,
    { signal },
  )
  return Array.isArray(data) ? data : data?.items ?? data?.records ?? []
}

export async function activateRoute(
  routeId,
) {
  const { data } = await apiClient.post(
    `/routes/${routeId}/activate`,
  )

  return data
}

export async function deactivateRoute(
  routeId,
) {
  const { data } = await apiClient.post(
    `/routes/${routeId}/deactivate`,
  )

  return data
}

// ============================================================
// IAM USERS
// ============================================================

export async function getOrganizationUsers() {
  const { data } = await apiClient.get(
    '/users',
  )

  return data
}

export async function createDriverAccount(
  payload,
) {
  const { data } = await apiClient.post(
    '/users/drivers',
    {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      password: payload.password,
    },
  )

  return data
}

// ============================================================
// DRIVERS
// ============================================================

export async function getDrivers() {
  const { data } = await apiClient.get(
    '/roster/drivers',
  )

  return data
}

export async function getDriverById(
  driverId,
) {
  const { data } = await apiClient.get(
    `/roster/drivers/${driverId}`,
  )

  return data
}

export async function registerDriver(
  payload,
) {
  const { data } = await apiClient.post(
    '/roster/drivers',
    {
      userId: payload.userId,

      firstName: payload.firstName.trim(),

      lastName: payload.lastName.trim(),

      documentNumber:
        payload.documentNumber.trim(),

      licenseNumber:
        payload.licenseNumber.trim(),

      licenseCategory:
        payload.licenseCategory,

      licenseExpiresOn:
        payload.licenseExpiresOn,

      phoneNumber:
        payload.phoneNumber.trim(),
    },
  )

  return data
}

export async function verifyDriver(
  driverId,
) {
  const { data } = await apiClient.post(
    `/roster/drivers/${driverId}/verify`,
  )

  return data
}

export async function suspendDriver(
  driverId,
) {
  const { data } = await apiClient.post(
    `/roster/drivers/${driverId}/suspend`,
  )

  return data
}

export async function reinstateDriver(
  driverId,
) {
  const { data } = await apiClient.post(
    `/roster/drivers/${driverId}/reinstate`,
  )

  return data
}

export async function updateDriverContact(
  driverId,
  phoneNumber,
) {
  const { data } = await apiClient.put(
    `/roster/drivers/${driverId}/contact`,
    {
      phoneNumber,
    },
  )

  return data
}

export async function renewDriverLicense(
  driverId,
  payload,
) {
  const { data } = await apiClient.put(
    `/roster/drivers/${driverId}/license`,
    {
      licenseNumber:
        payload.licenseNumber,

      licenseCategory:
        payload.licenseCategory,

      licenseExpiresOn:
        payload.licenseExpiresOn,
    },
  )

  return data
}

// ============================================================
// VEHICLES
// ============================================================

export async function getVehicles() {
  const { data } = await apiClient.get(
    '/roster/vehicles',
  )

  return data
}

export async function getVehicleById(
  vehicleId,
) {
  const { data } = await apiClient.get(
    `/roster/vehicles/${vehicleId}`,
  )

  return data
}

export async function registerVehicle(
  payload,
) {
  const { data } = await apiClient.post(
    '/roster/vehicles',
    {
      licensePlate:
        payload.licensePlate.trim(),

      seatingCapacity: Number(
        payload.seatingCapacity,
      ),

      brand: payload.brand.trim(),

      model: payload.model.trim(),
    },
  )

  return data
}

export async function changeVehicleCapacity(
  vehicleId,
  seatingCapacity,
) {
  const { data } = await apiClient.put(
    `/roster/vehicles/${vehicleId}/capacity`,
    {
      seatingCapacity: Number(
        seatingCapacity,
      ),
    },
  )

  return data
}

export async function enableVehicle(
  vehicleId,
) {
  const { data } = await apiClient.post(
    `/roster/vehicles/${vehicleId}/enable`,
  )

  return data
}

export async function disableVehicle(
  vehicleId,
) {
  const { data } = await apiClient.post(
    `/roster/vehicles/${vehicleId}/disable`,
  )

  return data
}