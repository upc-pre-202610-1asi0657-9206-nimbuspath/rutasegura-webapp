import apiClient from '@/shared/api/apiClient'
import { createOrganization } from '../domain/organization'

export async function fetchOrganization(organizationId, signal) {
  const { data } = await apiClient.get(
    `/organizations/${encodeURIComponent(organizationId)}`,
    { signal },
  )
  return createOrganization(data)
}

export async function updateOrganization(organizationId, payload) {
  await apiClient.put(`/organizations/${encodeURIComponent(organizationId)}`, payload)
}
