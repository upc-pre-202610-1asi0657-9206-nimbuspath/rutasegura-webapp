import { defineStore } from 'pinia'
import { onAuthSessionChange, onAuthSessionEnding, readAuthSession } from '@/shared/api/authSessionStorage'
import { useNotificationsStore } from './notificationsStore'
import { fetchNotification } from '../infrastructure/notificationRepository'
import { notificationScope, loadNotificationScope, resetNotificationScope, selectNotificationScope } from '../infrastructure/notificationScope'
import { getBrowserPushToken, removeBrowserPushToken, displayForegroundPush, pushSupported } from '../infrastructure/firebaseMessaging'
import { registerPushSubscription, disablePushSubscription } from '../infrastructure/pushSubscriptionRepository'

const storageKey = 'rutasegura.push.installation'
let stopMessages
let queue = Promise.resolve()
function readInstallation() {
  try { return JSON.parse(localStorage.getItem(storageKey) || 'null') } catch { return null }
}
function exclusive(action) {
  queue = queue.catch(() => {}).then(() => navigator.locks
    ? navigator.locks.request('rutasegura-push', action) : action())
  return queue
}
function ownedBy(record, session) { return Boolean(record?.userId && session?.user?.id && record.userId === session.user.id) }
function explain(error) {
  if (error?.code === 'messaging/permission-blocked') return 'Habilita las notificaciones en los permisos del sitio y vuelve a intentarlo.'
  if (error?.code === 'messaging/token-subscribe-failed') return 'Firebase rechazó el registro. Comprueba el proyecto, la clave VAPID y tu conexión.'
  if (error?.response?.status === 409) return 'Esta instalación ya está asociada a otra cuenta. Desactiva sus notificaciones antes de cambiar de cuenta.'
  return error?.response?.data?.detail || error?.message || 'No pudimos activar las notificaciones. Vuelve a intentarlo.'
}

export const usePushNotificationsStore = defineStore('push-notifications', {
  state: () => ({ enabled: false, registered: false, busy: false, error: '', notice: '', permission: 'default', supported: pushSupported() }),
  actions: {
    async testDesktopNotification() {
      this.error = ''
      this.notice = ''
      try {
        await displayForegroundPush()
        this.notice = 'El navegador aceptó la prueba. Revisa el aviso de Windows o abre el centro de notificaciones con Win + N.'
      } catch (error) { this.error = explain(error) }
    },
    async synchronize({ requestPermission = false } = {}) {
      if (this.busy) return
      this.error = ''
      this.notice = ''
      this.supported = pushSupported()
      if (!this.supported) { this.error = 'Usa Chrome o Edge con HTTPS o localhost para recibir notificaciones.'; return }
      const session = readAuthSession()
      if (!session) return
      this.permission = Notification.permission
      // Run before awaiting SDK/network requests so browsers retain the click gesture.
      const permission = requestPermission ? Notification.requestPermission() : Promise.resolve(this.permission)
      this.busy = true
      try {
        this.permission = await permission
        if (this.permission !== 'granted') {
          this.error = this.permission === 'denied'
            ? 'Las notificaciones están bloqueadas. Habilítalas en los permisos de este sitio.'
            : 'Puedes activar las notificaciones cuando quieras.'
          return
        }
        await exclusive(async () => {
          await loadNotificationScope()
          const organizationId = notificationScope.selectedId
          if (!organizationId) throw new Error('Selecciona una empresa autorizada antes de activar las notificaciones.')
          if (readAuthSession()?.token !== session.token) return
          const existing = readInstallation()
          if (existing && (!ownedBy(existing, session) || existing.organizationId !== organizationId)) {
            throw new Error('Las notificaciones de este navegador están asociadas a otra cuenta o empresa. Desactívalas desde esa sesión primero.')
          }
          stopMessages?.()
          stopMessages = null
          const installation = existing || { userId: session.user.id, organizationId, installationId: crypto.randomUUID(), enabled: false }
          localStorage.setItem(storageKey, JSON.stringify(installation))
          this.registered = true
          const browser = await getBrowserPushToken(payload => { void this.receive(payload.data?.notificationId, true) })
          stopMessages = browser.stop
          const subscription = await registerPushSubscription(installation.installationId, browser.token)
          if (readAuthSession()?.token !== session.token) {
            browser.stop()
            await disablePushSubscription({ ...installation, subscriptionId: subscription.id }, session.token)
            await removeBrowserPushToken()
            return
          }
          if (!subscription?.id) throw new Error('El servidor devolvió una suscripción inválida.')
          localStorage.setItem(storageKey, JSON.stringify({ ...installation, subscriptionId: subscription.id, enabled: true }))
          this.enabled = true
          this.notice = 'Las notificaciones están activadas en este navegador.'
        })
      } catch (error) {
        stopMessages?.()
        stopMessages = null
        this.enabled = false
        this.error = explain(error)
      } finally { this.busy = false }
    },
    async resume() {
      const record = readInstallation()
      const session = readAuthSession()
      this.registered = ownedBy(record, session)
      this.enabled = Boolean(ownedBy(record, session) && record.enabled)
      this.permission = window.Notification?.permission || 'default'
      if (!this.enabled) return
      if (this.permission !== 'granted') { await this.disable(session); return }
      await this.synchronize()
    },
    async disable(session = readAuthSession()) {
      stopMessages?.()
      stopMessages = null
      this.enabled = false
      this.notice = ''
      return exclusive(async () => {
        const record = readInstallation()
        if (!record || !ownedBy(record, session)) return
        try {
          await removeBrowserPushToken()
          try { await disablePushSubscription(record, session.token) }
          catch { this.error = 'Se retiró el registro del navegador. No pudimos confirmar la baja en el servidor.' }
          localStorage.removeItem(storageKey)
          this.registered = false
          this.notice = 'Las notificaciones están desactivadas en este navegador.'
        } catch (error) { this.error = explain(error) }
      })
    },
    async changeOrganization(id) {
      await this.disable()
      if (readInstallation()) return
      selectNotificationScope(id)
      useNotificationsStore().reset()
      await useNotificationsStore().load()
    },
    async receive(id, foreground = false) {
      if (!/^[0-9a-f-]{36}$/i.test(id || '')) return
      const session = readAuthSession()
      const record = readInstallation()
      if (!ownedBy(record, session) || !record.enabled || record.organizationId !== notificationScope.selectedId) return
      try {
        const notification = await fetchNotification(id)
        if (readAuthSession()?.token !== session.token) return
        useNotificationsStore().accept(notification)
        void useNotificationsStore().load()
        if (foreground && Notification.permission === 'granted') {
          await exclusive(async () => {
            const latest = readInstallation()
            if (!ownedBy(latest, readAuthSession()) || !latest.enabled || (latest.shownIds || []).includes(id)) return
            await displayForegroundPush(id)
            localStorage.setItem(storageKey, JSON.stringify({ ...latest, shownIds: [...(latest.shownIds || []), id].slice(-50) }))
          })
        }
      } catch { /* Permission is rechecked by REST. Revoked and expired notices stay hidden. */ }
    },
  },
})

export function startPushLifecycle(store) {
  const stopEnding = onAuthSessionEnding(session => { void store.disable(session) })
  const stopSession = onAuthSessionChange(() => {
    resetNotificationScope()
    store.$reset()
    void store.resume()
  })
  let lastRefresh = 0
  const refresh = () => {
    if (document.hidden || Date.now() - lastRefresh < 60000) return
    lastRefresh = Date.now()
    void store.resume()
  }
  const workerMessage = event => {
    if (event.data?.kind === 'rutasegura-notification') void store.receive(event.data.notificationId)
  }
  const storageChanged = event => {
    if (event.key === storageKey) {
      const session = readAuthSession()
      const record = readInstallation()
      store.enabled = Boolean(ownedBy(record, session) && record.enabled)
      store.registered = ownedBy(record, session)
      if (!store.enabled) { stopMessages?.(); stopMessages = null }
    }
  }
  document.addEventListener('visibilitychange', refresh)
  window.addEventListener('online', refresh)
  window.addEventListener('storage', storageChanged)
  navigator.serviceWorker?.addEventListener('message', workerMessage)
  return () => {
    stopEnding()
    stopSession()
    stopMessages?.()
    document.removeEventListener('visibilitychange', refresh)
    window.removeEventListener('online', refresh)
    window.removeEventListener('storage', storageChanged)
    navigator.serviceWorker?.removeEventListener('message', workerMessage)
  }
}
