import apiClient from '@/shared/api/apiClient'
import {
  createDeliveryList,
  createNotification,
  createNotificationPage,
} from '../domain/notification'

// GET /notifications?offset&limit&unreadOnly (server defaults apply when omitted)
export async function fetchNotifications(params, signal) {
  const { data } = await apiClient.get('/notifications', { params, signal })
  return createNotificationPage(data).items
}

// GET /notifications/page?cursor&limit&unreadOnly -> { items, nextCursor, hasMore }
export async function fetchNotificationPage(params, signal) {
  const { data } = await apiClient.get('/notifications/page', { params, signal })
  return createNotificationPage(data)
}

export async function fetchNotification(notificationId, signal) {
  const { data } = await apiClient.get(
    `/notifications/${encodeURIComponent(notificationId)}`,
    { signal },
  )
  return createNotification(data)
}

export async function markNotificationRead(notificationId) {
  const { data } = await apiClient.patch(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
  )
  return createNotification(data)
}

// requestId is the idempotency key required by CreateAnnouncementResource.
export async function sendAnnouncement(payload) {
  const { data } = await apiClient.post('/announcements', {
    requestId: crypto.randomUUID(),
    ...payload,
  })
  return data
}

export async function fetchFailedDeliveries(params, signal) {
  const { data } = await apiClient.get('/notifications/deliveries/failed', { params, signal })
  return createDeliveryList(data)
}

// ReplayNotificationDeliveryResource: { requestId, reasonCode? } -> { deliveryId, replayId, scheduled }
export async function replayDelivery(deliveryId) {
  const { data } = await apiClient.post(
    `/notifications/deliveries/${encodeURIComponent(deliveryId)}/replay`,
    { requestId: crypto.randomUUID() },
  )
  return data
}
