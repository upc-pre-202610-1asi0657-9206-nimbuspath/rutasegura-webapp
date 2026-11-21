// Domain: pure functions, no Vue / Axios. Maps backend DTOs into the shape the UI consumes.
// No fabricated defaults: absent fields stay null.

const pick = (...values) => values.find((value) => value !== undefined && value !== null) ?? null

export function createNotification(dto) {
  if (!dto || typeof dto !== 'object') return null
  const id = pick(dto.notificationId, dto.id)
  if (id === null) return null
  const readAt = pick(dto.readAt)
  const explicitRead = pick(dto.isRead, dto.read)
  return {
    id: String(id),
    title: pick(dto.title, dto.subject),
    message: pick(dto.message, dto.body, dto.content),
    type: pick(dto.type, dto.category, dto.context),
    createdAt: pick(dto.createdAt, dto.occurredAt, dto.sentAt),
    readAt,
    read: explicitRead !== null ? Boolean(explicitRead) : readAt !== null,
  }
}

// Accepts a bare array or a paged envelope; keeps any paging metadata the backend returns untouched.
export function createNotificationPage(data) {
  const rawItems = Array.isArray(data)
    ? data
    : pick(data?.items, data?.content, data?.results, data?.data) ?? []
  const meta = Array.isArray(data) || !data ? {} : { ...data }
  for (const key of ['items', 'content', 'results', 'data']) delete meta[key]
  return {
    items: rawItems.map(createNotification).filter(Boolean),
    meta,
  }
}

export const countUnread = (items) => items.filter((item) => !item.read).length

export function sortByNewest(items) {
  return [...items].sort(
    (a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0),
  )
}

// ───────── Announcements & failed deliveries (admin) ─────────

// Validates only presence; the backend remains the authority on limits and audiences.
export function validateAnnouncement(form) {
  const title = String(form?.title ?? '').trim()
  const message = String(form?.message ?? '').trim()
  const errors = {}
  if (!title) errors.title = 'Ingresa un título.'
  if (!message) errors.message = 'Ingresa el mensaje del comunicado.'
  return { valid: !Object.keys(errors).length, errors, payload: { title, message } }
}

export function createDelivery(dto) {
  if (!dto || typeof dto !== 'object') return null
  const id = pick(dto.deliveryId, dto.id)
  if (id === null) return null
  return {
    id: String(id),
    notificationId: pick(dto.notificationId),
    channel: pick(dto.channel, dto.provider),
    recipient: pick(dto.recipient, dto.recipientId, dto.userId),
    reason: pick(dto.failureReason, dto.error, dto.reason, dto.lastError),
    attempts: pick(dto.attempts, dto.attemptCount),
    failedAt: pick(dto.failedAt, dto.lastAttemptAt, dto.updatedAt, dto.createdAt),
  }
}

export function createDeliveryList(data) {
  const raw = Array.isArray(data)
    ? data
    : pick(data?.items, data?.content, data?.results, data?.data) ?? []
  return raw.map(createDelivery).filter(Boolean)
}
