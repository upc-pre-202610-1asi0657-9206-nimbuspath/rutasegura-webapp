
const AUTH_SESSION_KEY = 'rutasegura.auth.session'

export function readAuthSession() {
  try {
    const stored = sessionStorage.getItem(AUTH_SESSION_KEY)

    if (!stored) return null

    const session = JSON.parse(stored)

    if (!session?.token || !session?.user) {
      clearAuthSession()
      return null
    }

    return session
  } catch {
    clearAuthSession()
    return null
  }
}

export function readAuthToken() {
  return readAuthSession()?.token ?? null
}

export function saveAuthSession(session) {
  sessionStorage.setItem(
    AUTH_SESSION_KEY,
    JSON.stringify(session),
  )
}

export function clearAuthSession() {
  sessionStorage.removeItem(AUTH_SESSION_KEY)
}
