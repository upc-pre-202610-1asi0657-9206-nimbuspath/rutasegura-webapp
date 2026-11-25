// Domain: pure functions, no Vue / Axios.
// Shapes follow docs/notifications_docs_json.md (NotificationResource, NotificationPageResource,
// NotificationDeliveryResource, CreateAnnouncementResource). No fabricated defaults.

const pick = (...values) => values.find((value) => value !== undefined && value !== null) ?? null

export function createNotification(dto) {
  if (!dto || typeof dto !== 'object' || !dto.id) return null
  return {
    id: String(dto.id),
    title: pick(dto.title),
    message: pick(dto.body),
    type: pick(dto.category),
    priority: pick(dto.priority),
    tripId: pick(dto.tripId),
    studentId: pick(dto.studentId),
    createdAt: pick(dto.occurredAt, dto.createdAt),
    readAt: pick(dto.readAt),
    read: dto.readAt != null,
  }
}

// NotificationPageResource: { items, nextCursor, hasMore }. A bare array is accepted for /notifications.
export function createNotificationPage(data) {
  const raw = Array.isArray(data) ? data : data?.items ?? []
  return {
    items: raw.map(createNotification).filter(Boolean),
    nextCursor: Array.isArray(data) ? null : pick(data?.nextCursor),
    hasMore: Array.isArray(data) ? false : Boolean(data?.hasMore),
  }
}

export const countUnread = (items) => items.filter((item) => !item.read).length

export function sortByNewest(items) {
  return [...items].sort(
    (a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0),
  )
}

// ───────── Announcements & failed deliveries (admin) ─────────

// CreateAnnouncementResource: { requestId, title, body, routeId? }. requestId is added by the repository.
export function validateAnnouncement(form) {
  const title = String(form?.title ?? '').trim()
  const body = String(form?.message ?? '').trim()
  const errors = {}
  if (!title) errors.title = 'Ingresa un título.'
  if (!body) errors.message = 'Ingresa el mensaje del comunicado.'
  return { valid: !Object.keys(errors).length, errors, payload: { title, body } }
}

// NotificationDeliveryResource
export function createDelivery(dto) {
  if (!dto || typeof dto !== 'object' || !dto.id) return null
  return {
    id: String(dto.id),
    notificationId: pick(dto.notificationId),
    channel: pick(dto.channel),
    status: pick(dto.status),
    reason: pick(dto.lastErrorCode),
    attempts: pick(dto.attemptCount),
    replays: pick(dto.replayCount),
    failedAt: pick(dto.lastAttemptAt, dto.createdAt),
  }
}

export const createDeliveryList = (data) =>
  (Array.isArray(data) ? data : []).map(createDelivery).filter(Boolean)
