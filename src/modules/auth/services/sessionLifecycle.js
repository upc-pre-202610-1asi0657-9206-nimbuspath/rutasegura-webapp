import { watch } from 'vue'
import { configureApiSessionHandlers } from '@/shared/api/apiClient'
import { tokenExpiresAt } from '@/shared/api/authSessionStorage'

export const roleHome = (role) => role === 'ADMIN' ? 'admin-routes' : 'parent-home'
export function startSessionLifecycle(auth, router) {
  let expiryTimer
  const checkExpiry = () => {
    if (auth.token && tokenExpiresAt(auth.token) <= Date.now()) auth.logout('expired')
  }
  configureApiSessionHandlers({
    onUnauthorized: (reason) => auth.logout(reason),
    onForbidden: () => { auth.notice = 'No tienes permiso para realizar esta operación. Tu sesión sigue activa.' },
  })
  const stop = watch(() => auth.token, (token, previous) => {
    clearTimeout(expiryTimer)
    if (token) expiryTimer = setTimeout(checkExpiry, Math.min(Math.max(0, tokenExpiresAt(token) - Date.now()), 2147483647))
    else if (previous && router.currentRoute.value.matched.some((route) => route.meta.requiresAuth))
      void router.replace({ name: 'login' })
  }, { immediate: true, flush: 'sync' })
  document.addEventListener('visibilitychange', checkExpiry)
  window.addEventListener('focus', checkExpiry)
  return () => {
    stop()
    clearTimeout(expiryTimer)
    document.removeEventListener('visibilitychange', checkExpiry)
    window.removeEventListener('focus', checkExpiry)
    configureApiSessionHandlers({})
  }
}
