
import apiClient from '@/shared/api/apiClient'

/**
 * Authenticates a user through the RutaSegura IAM API.
 *
 * @param {{ email: string, password: string }} credentials
 * @returns {Promise<{
 *   id: string,
 *   firstName: string,
 *   lastName: string,
 *   email: string,
 *   roleTier: string,
 *   organizationId: string | null,
 *   token: string
 * }>}
 */
export async function signIn(credentials) {
  const { data } = await apiClient.post('/users/sign-in', {
    email: credentials.email.trim(),
    password: credentials.password,
  })

  return data
}

/**
 * Retrieves the authenticated account from the backend.
 */
export async function getCurrentUser() {
  const { data } = await apiClient.get('/users/me')

  return data
}
