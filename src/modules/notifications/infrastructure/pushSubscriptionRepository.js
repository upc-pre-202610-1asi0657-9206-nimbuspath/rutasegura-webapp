import apiClient from '@/shared/api/apiClient'
import { notificationOptions } from './notificationScope'

export async function registerPushSubscription(installationId, token) {
  const { data } = await apiClient.put(`/push-subscriptions/${installationId}`,
    { token, platform: 'Web' }, await notificationOptions())
  return data
}

// A logout request carries its captured credential, even after sessionStorage is cleared.
export async function disablePushSubscription(record, jwt) {
  if (!record?.subscriptionId || !jwt) return
  const base = apiClient.defaults.baseURL.replace(/\/$/, '')
  const response = await fetch(`${base}/push-subscriptions/${encodeURIComponent(record.subscriptionId)}`, {
    method: 'DELETE', keepalive: true,
    headers: { Authorization: `Bearer ${jwt}`, 'X-Organization-Id': record.organizationId },
  })
  if (!response.ok && ![401, 403, 404].includes(response.status)) {
    throw new Error('No pudimos dar de baja la suscripción en el servidor.')
  }
}
