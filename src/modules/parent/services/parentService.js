import apiClient from '@/shared/api/apiClient'

export async function getParentProfile() {
  const { data } = await apiClient.get('/stakeholders/me/profile')
  return data
}

export async function getMyStudents() {
  const { data } = await apiClient.get('/stakeholders/me/students')
  return data
}