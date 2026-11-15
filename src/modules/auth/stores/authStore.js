import { defineStore } from 'pinia'
import { getCurrentUser, signIn } from '../services/authService'
import { clearAuthSession, isTokenExpired, readAuthSession, readAuthToken, saveAuthSession } from '@/shared/api/authSessionStorage'

const WEB_ROLES = ['ADMIN', 'PARENT']
const normalizeRole = (role) => String(role ?? '').trim().toUpperCase()
let restorePromise = null
let sessionVersion = 0
function getErrorMessage(error) {
  const status = error?.response?.status
  if (status === 401) return 'Correo electrónico o contraseña incorrectos.'
  if (status === 429) return 'Demasiados intentos. Espera un momento e inténtalo nuevamente.'
  if (error?.response?.data?.code === 'OrganizationNotActive') return 'La organización no se encuentra activa.'
  if (status === 403) return 'Tu cuenta no tiene acceso a esta operación.'
  if ((!error?.response && error?.isAxiosError) || status >= 500) return 'No fue posible conectar con el servidor. Comprueba tu conexión e inténtalo nuevamente.'
  return error?.response?.data?.detail || error?.message || 'No fue posible iniciar sesión.'
}
function accountUser(account) {
  return { id: account.id, firstName: account.firstName, lastName: account.lastName,
    email: account.email, roleTier: normalizeRole(account.roleTier), organizationId: account.organizationId }
}
export const useAuthStore = defineStore('auth', {
  state: () => ({ user: null, token: null, loading: false, verifying: false, initialized: false,
    error: null, notice: null, sessionReason: null, restoreUnavailable: false }),
  getters: {
    isAuthenticated: (state) => Boolean(state.token && state.user),
    userRole: (state) => normalizeRole(state.user?.roleTier),
    isAdmin: (state) => state.user?.roleTier === 'ADMIN',
    isParent: (state) => state.user?.roleTier === 'PARENT',
  },
  actions: {
    async login(credentials) {
      const version = ++sessionVersion
      this.loading = true
      this.error = null
      this.notice = null
      this.sessionReason = null
      this.restoreUnavailable = false
      try {
        const response = await signIn(credentials)
        if (version !== sessionVersion) return null
        const role = normalizeRole(response?.roleTier)
        if (!WEB_ROLES.includes(role)) throw new Error(role === 'DRIVER'
          ? 'Las cuentas de conductor deben ingresar desde la aplicación móvil de RutaSegura.'
          : 'Tu cuenta no tiene un perfil habilitado para acceder a la plataforma web.')
        if (!response?.id || !response?.token || isTokenExpired(response.token))
          throw new Error('El servidor devolvió una sesión inválida o vencida.')
        const user = accountUser(response)
        saveAuthSession({ token: response.token, user })
        this.user = user
        this.token = response.token
        this.initialized = true
        return user
      } catch (error) {
        if (version === sessionVersion) {
          clearAuthSession()
          this.user = null
          this.token = null
          this.error = getErrorMessage(error)
        }
        throw error
      } finally { if (version === sessionVersion) this.loading = false }
    },
    async initialize({ retry = false } = {}) {
      if (this.token && isTokenExpired(this.token)) this.logout('expired')
      if (this.initialized && !retry) return
      if (restorePromise) return restorePromise
      const session = readAuthSession()
      if (!session || isTokenExpired(session.token)) { this.logout(session ? 'expired' : null); return }
      const version = ++sessionVersion
      this.verifying = true
      this.error = null
      this.restoreUnavailable = false
      restorePromise = (async () => {
        try {
          const account = await getCurrentUser()
          if (version !== sessionVersion || readAuthToken() !== session.token) return
          const role = normalizeRole(account?.roleTier)
          if (account?.id !== session.user.id || !WEB_ROLES.includes(role)) { this.logout('invalid'); return }
          const user = accountUser(account)
          saveAuthSession({ token: session.token, user })
          this.user = user
          this.token = session.token
          this.sessionReason = null
        } catch (error) {
          if (version !== sessionVersion) return
          if ([401, 403].includes(error?.response?.status)) this.logout('expired')
          else {
            // Preserve the stored credential for an explicit retry; never expose unverified protected views.
            this.user = null
            this.token = null
            this.restoreUnavailable = true
            this.error = 'No pudimos verificar tu sesión. Revisa tu conexión y vuelve a intentarlo.'
          }
        } finally {
          if (version === sessionVersion) { this.initialized = true; this.verifying = false }
        }
      })()
      try { await restorePromise } finally { restorePromise = null }
    },
    logout(reason = null) {
      sessionVersion++
      clearAuthSession(reason)
      this.user = null
      this.token = null
      this.loading = false
      this.verifying = false
      this.error = null
      this.notice = null
      this.restoreUnavailable = false
      this.sessionReason = reason
      this.initialized = true
    },
    clearError() { this.error = null },
  },
})
