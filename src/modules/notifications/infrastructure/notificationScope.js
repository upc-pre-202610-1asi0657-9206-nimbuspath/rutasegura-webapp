import { reactive } from 'vue'
import apiClient from '@/shared/api/apiClient'
import { getSessionSignal, readAuthSession } from '@/shared/api/authSessionStorage'

export const notificationScope = reactive({ organizationIds: [], selectedId: '', error: '' })
let currentToken = null
let pending = null
let scopeController = new AbortController()
let generation = 0
let loadedAt = 0
let loading = false
let loadVersion = 0

export function notificationScopeKey() { return `${generation}:${readAuthSession()?.token || ''}:${notificationScope.selectedId}` }

function cancelScopeRequests() {
  generation++
  scopeController.abort()
  scopeController = new AbortController()
}

export function resetNotificationScope() {
  loadVersion++
  cancelScopeRequests()
  loadedAt = 0
  loading = false
  currentToken = null
  pending = null
  notificationScope.organizationIds = []
  notificationScope.selectedId = ''
  notificationScope.error = ''
}

export async function loadNotificationScope({ force = false } = {}) {
  const session = readAuthSession()
  if (!session) throw new Error('Inicia sesión para consultar tus notificaciones.')
  if (currentToken === session.token && pending && (loading || (!force && Date.now() - loadedAt < 60000))) return pending
  currentToken = session.token
  const token = session.token
  const loadId = ++loadVersion
  loading = true
  pending = (async () => {
    try {
      const ids = session.user.roleTier !== 'PARENT' && session.user.organizationId ? [session.user.organizationId]
        : (await apiClient.get('/notifications/contexts', { signal: getSessionSignal() })).data.organizationIds || []
      if (readAuthSession()?.token !== token || loadId !== loadVersion) throw new Error('La sesión cambió.')
      notificationScope.organizationIds = [...new Set(ids)]
      const saved = sessionStorage.getItem(`rutasegura.notifications.context.${session.user.id}`)
      const selected = ids.includes(notificationScope.selectedId) ? notificationScope.selectedId
        : ids.includes(saved) ? saved : ids.length === 1 ? ids[0] : ''
      if (selected !== notificationScope.selectedId) cancelScopeRequests()
      notificationScope.selectedId = selected
      loadedAt = Date.now()
      notificationScope.error = ''
    } catch (error) {
      if (currentToken === token && loadId === loadVersion) {
        pending = null
        notificationScope.error = 'No pudimos comprobar las empresas autorizadas. Vuelve a intentarlo.'
      }
      throw error
    } finally {
      if (currentToken === token && loadId === loadVersion) loading = false
    }
  })()
  return pending
}

export function selectNotificationScope(id) {
  if (!notificationScope.organizationIds.includes(id)) throw new Error('Selecciona una empresa autorizada.')
  cancelScopeRequests()
  notificationScope.selectedId = id
  sessionStorage.setItem(`rutasegura.notifications.context.${readAuthSession().user.id}`, id)
}

export async function notificationOptions(options = {}) {
  await loadNotificationScope()
  const id = notificationScope.selectedId
  if (!id) throw new Error(notificationScope.organizationIds.length
    ? 'Selecciona una empresa para ver sus notificaciones.'
    : 'Necesitas un vínculo verificado con una empresa para recibir notificaciones.')
  const signals = [getSessionSignal(), scopeController.signal, options.signal].filter(Boolean)
  return { ...options, signal: AbortSignal.any(signals), headers: { ...options.headers, 'X-Organization-Id': id } }
}
