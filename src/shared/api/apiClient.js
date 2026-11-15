import axios from 'axios'
import { getSessionSignal, isTokenExpired, readAuthToken } from './authSessionStorage'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 15000,
  headers: { Accept: 'application/json' },
})
let sessionHandlers = {}
// The composition root registers handlers: HTTP does not import stores or routing.
export function configureApiSessionHandlers(handlers) { sessionHandlers = handlers }

apiClient.interceptors.request.use((config) => {
  const token = config.skipSession ? null : readAuthToken()
  if (token) {
    if (isTokenExpired(token)) {
      sessionHandlers.onUnauthorized?.('expired')
      throw new axios.CanceledError('La sesión ha vencido.')
    }
    config.headers.Authorization = `Bearer ${token}`
    config.sessionToken = token
    const sessionSignal = getSessionSignal()
    config.signal = config.signal ? AbortSignal.any([config.signal, sessionSignal]) : sessionSignal
  }
  return config
})
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const { config, response } = error
    const current = config?.sessionToken && config.sessionToken === readAuthToken()
    if (current && response?.status === 401) sessionHandlers.onUnauthorized?.('expired')
    else if (current && response?.status === 403) sessionHandlers.onForbidden?.()
    // 403 denies a resource; network/5xx errors do not invalidate the account.
    return Promise.reject(error)
  },
)
export default apiClient
