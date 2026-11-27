import apiClient from '@/shared/api/apiClient'
import { notificationOptions } from './notificationScope'
import {
  createDeliveryList,
  createNotification,
  createNotificationPage,
} from '../domain/notification'

// GET /notifications?offset&limit&unreadOnly (server defaults apply when omitted)
export async function fetchNotifications(params, signal) {
  const { data } = await apiClient.get('/notifications', await notificationOptions({ params, signal }))
  return createNotificationPage(data).items
}

// GET /notifications/page?cursor&limit&unreadOnly -> { items, nextCursor, hasMore }
export async function fetchNotificationPage(params, signal) {
  const { data } = await apiClient.get('/notifications/page', await notificationOptions({ params, signal }))
  return createNotificationPage(data)
}

export async function fetchNotification(notificationId, signal) {
  const { data } = await apiClient.get(
    `/notifications/${encodeURIComponent(notificationId)}`,
    await notificationOptions({ signal }),
  )
  return createNotification(data)
}

export async function markNotificationRead(notificationId) {
  const { data } = await apiClient.patch(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
    undefined, await notificationOptions(),
  )
  return createNotification(data)
}

// requestId is the idempotency key required by CreateAnnouncementResource.
export async function sendAnnouncement(payload) {
  const { data } = await apiClient.post('/announcements', {
    requestId: crypto.randomUUID(),
    ...payload,
  }, await notificationOptions())
  return data
}

export async function fetchFailedDeliveries(params, signal) {
  const { data } = await apiClient.get('/notifications/deliveries/failed', await notificationOptions({ params, signal }))
  return createDeliveryList(data)
}

// ReplayNotificationDeliveryResource: { requestId, reasonCode? } -> { deliveryId, replayId, scheduled }
export async function replayDelivery(deliveryId) {
  const { data } = await apiClient.post(
    `/notifications/deliveries/${encodeURIComponent(deliveryId)}/replay`,
    { requestId: crypto.randomUUID() },
    await notificationOptions(),
  )
  return data
}
