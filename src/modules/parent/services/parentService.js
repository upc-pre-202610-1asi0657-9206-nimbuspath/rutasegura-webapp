import apiClient from '@/shared/api/apiClient'

export async function getParentProfile() {
  const { data } = await apiClient.get('/stakeholders/me/profile')
  return data
}

export async function getMyStudents() {
  const { data } = await apiClient.get('/stakeholders/me/students')
  return data
}

export async function registerStudent(payload) {
  const { data } = await apiClient.post('/stakeholders/me/students', {
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
    birthDate: payload.birthDate || null,
    schoolGrade: payload.schoolGrade?.trim() || null,
    schoolName: payload.schoolName?.trim() || null,
    pickupLocation: {
      address: payload.address.trim(),
      reference: payload.reference?.trim() || null,
      latitude: Number(payload.latitude),
      longitude: Number(payload.longitude),
    },
  })

  return data
}

export async function deleteStudent(studentId) {
  await apiClient.delete(`/stakeholders/me/students/${studentId}`)
}

export async function getRouteOffer(enrollmentCode) {
  const { data } = await apiClient.get(
    `/stakeholders/route-offers/${encodeURIComponent(enrollmentCode.trim())}`,
  )

  return data
}

export async function enrollStudent(studentId, enrollmentCode) {
  const { data } = await apiClient.post(
    `/stakeholders/me/students/${studentId}/enrollments`,
    {
      enrollmentCode: enrollmentCode.trim(),
    },
  )

  return data
}

export async function updateParentProfile(payload) {
  const { data } = await apiClient.put('/stakeholders/me/profile', {
    phoneNumber: payload.phoneNumber.trim(),
    documentNumber: payload.documentNumber?.trim() || null,
  })

  return data
}

export async function getGuardianTrips(from, to) {
  const { data } = await apiClient.get('/guardians/me/trips', {
    params: {
      from,
      to,
    },
  })

  return data
}