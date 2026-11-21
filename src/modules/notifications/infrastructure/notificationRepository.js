import apiClient from '@/shared/api/apiClient'
import {
  createDeliveryList,
  createNotification,
  createNotificationPage,
} from '../domain/notification'

export async function fetchNotifications(signal) {
  const { data } = await apiClient.get('/notifications', { signal })
  return createNotificationPage(data).items
}

// `params` are forwarded as provided by the caller (e.g. paging cursors returned by the backend).
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
  await apiClient.patch(`/notifications/${encodeURIComponent(notificationId)}/read`)
}

export async function sendAnnouncement(payload) {
  const { data } = await apiClient.post('/announcements', payload)
  return data
}

export async function fetchFailedDeliveries(signal) {
  const { data } = await apiClient.get('/notifications/deliveries/failed', { signal })
  return createDeliveryList(data)
}

export async function replayDelivery(deliveryId) {
  await apiClient.post(`/notifications/deliveries/${encodeURIComponent(deliveryId)}/replay`)
}
