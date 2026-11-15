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
export async function getMyGuardianLinks() { return (await apiClient.get('/stakeholders/me/guardian-links')).data }
export async function uploadStudentPhoto(studentId, file) {
  const payload = new FormData(); payload.append('photo', file)
  return (await apiClient.put(`/stakeholders/me/students/${studentId}/photo`, payload)).data
}
export async function removeStudentPhoto(studentId) { return (await apiClient.delete(`/stakeholders/me/students/${studentId}/photo`)).data }
export async function changeStudentPickup(studentId, payload) { return (await apiClient.put(`/stakeholders/me/students/${studentId}/pickup-location`, payload)).data }
export async function withdrawStudent(studentId, enrollmentId) { return (await apiClient.delete(`/stakeholders/me/students/${studentId}/enrollments/${enrollmentId}`)).data }
