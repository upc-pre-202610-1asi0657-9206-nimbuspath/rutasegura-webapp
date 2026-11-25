const AUTH_SESSION_KEY = 'rutasegura.auth.session'
const listeners = new Set()
let sessionController = new AbortController()

// Decoding exp only schedules client-side expiry; IAM remains the authority for identity and permissions.
export function tokenExpiresAt(token) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const { exp } = JSON.parse(atob(payload))
    return Number.isFinite(exp) && exp > 0 ? exp * 1000 : 0
  } catch { return 0 }
}
export const isTokenExpired = (token) => tokenExpiresAt(token) <= Date.now()

export function readAuthSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY) || 'null')
    return typeof session?.token === 'string' && session?.user?.id ? session : null
  } catch { return null }
}
export const readAuthToken = () => readAuthSession()?.token ?? null
export const getSessionSignal = () => sessionController.signal
export function onAuthSessionChange(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
function notifySessionChange(reason) {
  // An old account's requests must not populate another account's views.
  sessionController.abort()
  sessionController = new AbortController()
  listeners.forEach((listener) => listener(reason))
}
export function saveAuthSession(session) {
  try { sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session)) }
  catch { throw new Error('Tu navegador no permite guardar la sesión. Habilita el almacenamiento para este sitio e inténtalo nuevamente.') }
  notifySessionChange('signed-in')
}
export function clearAuthSession(reason = 'signed-out') {
  try {
    sessionStorage.removeItem(AUTH_SESSION_KEY)
    for (const key of Object.keys(sessionStorage)) if (key.startsWith('rutasegura.operation-draft.')) sessionStorage.removeItem(key)
  }
  catch { /* Storage may be unavailable; always invalidate in-memory requests and state. */ }
  finally { notifySessionChange(reason) }
}

// Only recovery IDs, never credentials or child/contact data. Scoped to the current account and operation.
function operationDraftKey(name) {
  const user = readAuthSession()?.user
  return user?.id && user?.organizationId && user.roleTier === 'ADMIN'
    ? `rutasegura.operation-draft.${user.id}.${user.organizationId}.${name}` : null
}
export function readOperationDraft(name) {
  try { const key = operationDraftKey(name); return key ? sessionStorage.getItem(key) || '' : '' } catch { return '' }
}
export function writeOperationDraft(name, id) {
  try { const key = operationDraftKey(name); if (key) sessionStorage.setItem(key, id) } catch { /* Keep the ID visible for manual recovery when storage is unavailable. */ }
}
export function clearOperationDraft(name) {
  try { const key = operationDraftKey(name); if (key) sessionStorage.removeItem(key) } catch { /* The current UI still completes the operation. */ }
}
