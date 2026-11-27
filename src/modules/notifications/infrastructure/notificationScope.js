import { reactive } from 'vue'
import apiClient from '@/shared/api/apiClient'
import { getSessionSignal, readAuthSession } from '@/shared/api/authSessionStorage'

export const notificationScope = reactive({ organizationIds: [], selectedId: '', error: '' })
let currentToken = null
let pending = null

export function resetNotificationScope() {
  currentToken = null
  pending = null
  notificationScope.organizationIds = []
  notificationScope.selectedId = ''
  notificationScope.error = ''
}

export async function loadNotificationScope() {
  const session = readAuthSession()
  if (!session) throw new Error('Inicia sesión para consultar tus notificaciones.')
  if (currentToken === session.token && pending) return pending
  currentToken = session.token
  const token = session.token
  pending = (async () => {
    try {
      const ids = session.user.organizationId ? [session.user.organizationId]
        : (await apiClient.get('/notifications/contexts', { signal: getSessionSignal() })).data.organizationIds || []
      if (readAuthSession()?.token !== token) throw new Error('La sesión cambió.')
      notificationScope.organizationIds = [...new Set(ids)]
      const saved = sessionStorage.getItem(`rutasegura.notifications.context.${session.user.id}`)
      notificationScope.selectedId = ids.includes(saved) ? saved : ids.length === 1 ? ids[0] : ''
      notificationScope.error = ''
    } catch (error) {
      if (currentToken === token) {
        pending = null
        notificationScope.error = 'No pudimos comprobar las empresas autorizadas. Vuelve a intentarlo.'
      }
      throw error
    }
  })()
  return pending
}

export function selectNotificationScope(id) {
  if (!notificationScope.organizationIds.includes(id)) throw new Error('Selecciona una empresa autorizada.')
  notificationScope.selectedId = id
  sessionStorage.setItem(`rutasegura.notifications.context.${readAuthSession().user.id}`, id)
}

export async function notificationOptions(options = {}) {
  await loadNotificationScope()
  const id = notificationScope.selectedId
  if (!id) throw new Error(notificationScope.organizationIds.length
    ? 'Selecciona una empresa para ver sus notificaciones.'
    : 'Necesitas un vínculo verificado con una empresa para recibir notificaciones.')
  return { ...options, headers: { ...options.headers, 'X-Organization-Id': id } }
}
