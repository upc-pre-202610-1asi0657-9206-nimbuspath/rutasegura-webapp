import { watch } from 'vue'
import { onAuthSessionChange, readAuthSession } from '@/shared/api/authSessionStorage'
import { loadNotificationScope, notificationScope } from '../infrastructure/notificationScope'
import { createNotificationConnection } from '../infrastructure/notificationConnection'

// Independent of FCM/permissions. Only an authorized, selected company can join its server-owned group.
export function startNotificationLifecycle(store) {
  let hub = null
  let hubKey = ''
  let generation = 0
  let retry = null
  let closed = false
  let reloadTimer = null
  const stopHub = () => {
    const previous = hub
    hub = null
    hubKey = ''
    clearTimeout(retry)
    if (previous) void previous.stop().catch(() => {})
  }
  const reload = () => {
    clearTimeout(reloadTimer)
    reloadTimer = setTimeout(() => {
      if (closed || !notificationScope.selectedId || !readAuthSession()) return
      void store.load()
      if (store.paginated) void store.loadPage()
    }, 80)
  }
  async function reconcile({ force = false } = {}) {
    const current = ++generation
    const session = readAuthSession()
    if (closed || !session || document.hidden) { stopHub(); return }
    try { await loadNotificationScope({ force }) }
    catch { if (current === generation) { stopHub(); store.reset() } return }
    if (closed || current !== generation || readAuthSession()?.token !== session.token) return
    const organizationId = notificationScope.selectedId
    if (!organizationId) { stopHub(); store.reset(); return }
    const key = `${session.token}:${organizationId}`
    if (hubKey === key && hub) { reload(); return }
    stopHub()
    hubKey = key
    const connection = createNotificationConnection(organizationId, session.token)
    hub = connection
    const stillCurrent = () => !closed && hub === connection &&
      readAuthSession()?.token === session.token && notificationScope.selectedId === organizationId
    connection.on('NotificationAvailable', hint => {
      if (stillCurrent() && /^[0-9a-f-]{36}$/i.test(hint?.notificationId || '')) reload()
    })
    connection.onreconnected(() => { if (stillCurrent()) reload() })
    connection.onclose(() => {
      if (!stillCurrent()) return
      hub = null
      hubKey = ''
      retry = setTimeout(() => { void reconcile({ force: true }) }, 15000)
    })
    reload()
    try { await connection.start(); if (stillCurrent()) reload(); else await connection.stop() }
    catch {
      if (stillCurrent()) {
        hub = null; hubKey = ''
        retry = setTimeout(() => { void reconcile({ force: true }) }, 15000)
      }
    }
  }
  const stopScope = watch(() => notificationScope.selectedId, () => {
    store.reset()
    stopHub()
    void reconcile()
  })
  const stopSession = onAuthSessionChange(() => {
    store.reset()
    stopHub()
    void reconcile()
  })
  const visible = () => { void reconcile({ force: true }) }
  const periodic = setInterval(() => { if (!document.hidden) void reconcile({ force: true }) }, 30000)
  document.addEventListener('visibilitychange', visible)
  window.addEventListener('online', visible)
  void reconcile()
  return () => {
    closed = true; generation++
    clearInterval(periodic); clearTimeout(reloadTimer)
    stopScope(); stopSession(); stopHub()
    document.removeEventListener('visibilitychange', visible)
    window.removeEventListener('online', visible)
  }
}
