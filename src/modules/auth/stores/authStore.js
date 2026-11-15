
import { defineStore } from 'pinia'

import {
  signIn,
  getCurrentUser,
} from '../services/authService'

import {
  readAuthSession,
  saveAuthSession,
  clearAuthSession,
} from '@/shared/api/authSessionStorage'

const WEB_ROLES = ['ADMIN', 'PARENT']
const KNOWN_ROLES = ['ADMIN', 'PARENT', 'DRIVER']

function normalizeRole(role) {
  return String(role ?? '').trim().toUpperCase()
}


function getErrorMessage(error) {
  const status = error?.response?.status
  const code = error?.response?.data?.code

  if (status === 401 || code === 'InvalidCredentials') {
    return 'Correo electrónico o contraseña incorrectos.'
  }

  if (status === 429 || code === 'TOO_MANY_REQUESTS') {
    return 'Demasiados intentos. Espera un momento e inténtalo nuevamente.'
  }

  if (code === 'OrganizationNotActive') {
    return 'La organización no se encuentra activa.'
  }

  if (!error?.response) {
    if (error?.code === 'ERR_NETWORK' || error?.message === 'Network Error') {
      return 'No fue posible conectar con el servidor. Comprueba tu conexión.'
    }

    return error?.message ||
      'No fue posible conectar con el servidor.'
  }

  return error?.message ||
    'No fue posible iniciar sesión. Inténtalo nuevamente.'
}


export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null,
    token: null,
    loading: false,
    initialized: false,
    error: null,
  }),

  getters: {
    isAuthenticated: (state) =>
      Boolean(state.token && state.user),

    userRole: (state) =>
      normalizeRole(state.user?.roleTier),

    isAdmin: (state) =>
      normalizeRole(state.user?.roleTier) === 'ADMIN',

    isParent: (state) =>
      normalizeRole(state.user?.roleTier) === 'PARENT',

    isDriver: (state) =>
      normalizeRole(state.user?.roleTier) === 'DRIVER',
  },

  actions: {
    async login(credentials) {
      this.loading = true
      this.error = null

      try {
        const response = await signIn(credentials)

        if (!response?.token || !response?.id) {
          throw new Error(
            'El servidor devolvió una respuesta de autenticación inválida.'
          )
        }

        const role = normalizeRole(response.roleTier)

        if (!KNOWN_ROLES.includes(role)) {
          throw new Error(
            'Tu cuenta no tiene un perfil reconocido en RutaSegura.'
          )
        }

        const user = {
          id: response.id,
          firstName: response.firstName,
          lastName: response.lastName,
          email: response.email,
          roleTier: role,
          organizationId: response.organizationId,
        }

        const session = {
          token: response.token,
          user,
        }

        saveAuthSession(session)

        this.token = response.token
        this.user = user
        this.initialized = true

        return user
      } catch (error) {
        this.error = getErrorMessage(error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async initialize() {
      if (this.initialized) return

      const session = readAuthSession()

      if (!session?.token) {
        this.initialized = true
        return
      }

      this.loading = true
      this.error = null

      try {
        const user = await getCurrentUser()
        const role = normalizeRole(user?.roleTier)

        if (!WEB_ROLES.includes(role)) {
          clearAuthSession()
          this.user = null
          this.token = null
          this.initialized = true
          return
        }

        this.token = session.token
        this.user = {
          ...user,
          roleTier: role,
        }

        saveAuthSession({
          token: session.token,
          user: this.user,
        })

        this.initialized = true
      } catch (error) {
        const status = error?.response?.status

        this.user = null
        this.token = null

        if (status === 401 || status === 403) {
          clearAuthSession()
          this.initialized = true
        } else {
          this.error =
            'No fue posible verificar tu sesión. Comprueba tu conexión.'
          this.initialized = false
        }
      } finally {
        this.loading = false
      }
    },

    logout() {
      clearAuthSession()

      this.user = null
      this.token = null
      this.error = null
      this.initialized = true
    },

    clearError() {
      this.error = null
    },
  },
})
