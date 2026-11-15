import { test, expect } from '@playwright/test'

// HTTP fixtures only. No real accounts, credentials or AWS writes are involved.
const key = 'rutasegura.auth.session'
function account(role = 'ADMIN', expiresIn = 3600) {
  const id = role === 'ADMIN' ? '11111111-1111-4111-8111-111111111111' : '22222222-2222-4222-8222-222222222222'
  const payload = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expiresIn })).toString('base64url')
  return { id, firstName: role === 'ADMIN' ? 'Admin' : 'Familia', lastName: 'Prueba', email: 'fixture@example.test', roleTier: role,
    organizationId: role === 'ADMIN' ? '33333333-3333-4333-8333-333333333333' : null,
    token: `test.${payload}.fixture` }
}
async function mockApi(page, options = {}) {
  const state = { meStatus: 200, routesStatus: 200, failSignIn: false, user: account(), ...options }
  await page.route('**/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '')
    if (path === '/users/sign-in') {
      if (state.failSignIn) return route.fulfill({ status: 401, json: { detail: 'Credenciales inválidas.' } })
      const email = route.request().postDataJSON().email
      state.user = account(email.startsWith('driver') ? 'DRIVER' : email.startsWith('parent') ? 'PARENT' : 'ADMIN', state.expiresIn ?? 3600)
      return route.fulfill({ json: state.user })
    }
    if (path === '/users/me') return route.fulfill({ status: state.meStatus, json: state.meStatus === 200 ? state.user : { detail: 'Servicio no disponible.' } })
    if (path === '/routes' && state.routesStatus !== 200) return route.fulfill({ status: state.routesStatus, json: { detail: 'No disponible.' } })
    if (path === '/routes/quota') return route.fulfill({ json: { activeRoutes: 0, maxActiveRoutes: 3 } })
    if (path === '/stakeholders/me/profile') return route.fulfill({ json: { isComplete: true, phoneNumber: '999999999' } })
    if (path === '/stakeholders/me/students') return route.fulfill({ json: state.students || [] })
    return route.fulfill({ json: [] })
  })
  return state
}
async function login(page, role = 'admin') {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico', { exact: true }).fill(`${role}@example.test`)
  await page.getByLabel('Contraseña', { exact: true }).fill('Fixture123')
  await page.getByRole('button', { name: 'Ingresar a RutaSegura' }).click()
}
async function seedSession(page, user) {
  await page.addInitScript(({ key, user }) => sessionStorage.setItem(key, JSON.stringify({ token: user.token, user })), { key, user })
}

test('ADMIN logs in, restores after reload and cannot use PARENT routes', async ({ page }) => {
  await mockApi(page)
  await login(page)
  await expect(page).toHaveURL(/\/admin\/routes$/)
  await page.reload()
  await expect(page.getByRole('navigation', { name: 'Menú administrativo' })).toBeVisible()
  await page.goto('/parent/students')
  await expect(page).toHaveURL(/\/admin\/routes$/)
})

test('PARENT logs in and is kept out of ADMIN routes', async ({ page }) => {
  await mockApi(page)
  await login(page, 'parent')
  await expect(page).toHaveURL(/\/parent$/)
  await page.goto('/admin/resources')
  await expect(page).toHaveURL(/\/parent$/)
  await page.reload()
  await expect(page).toHaveURL(/\/parent$/)
})

test('DRIVER is rejected without persisting its token', async ({ page }) => {
  await mockApi(page)
  await login(page, 'driver')
  await expect(page.getByRole('alert')).toContainText('aplicación móvil')
  expect(await page.evaluate((key) => sessionStorage.getItem(key), key)).toBeNull()
  await expect(page).toHaveURL(/\/login$/)
})

test('invalid credentials are shown without persisting a session', async ({ page }) => {
  await mockApi(page, { failSignIn: true })
  await login(page)
  await expect(page.getByRole('alert')).toContainText('incorrectos')
  expect(await page.evaluate((key) => sessionStorage.getItem(key), key)).toBeNull()
})

test('expired stored token never opens protected data', async ({ page }) => {
  await mockApi(page)
  await seedSession(page, account('ADMIN', -10))
  await page.goto('/admin/routes')
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('status')).toContainText('sesión ha vencido')
  expect(await page.evaluate((key) => sessionStorage.getItem(key), key)).toBeNull()
})

test('an open page expires without requiring another request', async ({ page }) => {
  await mockApi(page, { expiresIn: 4 })
  await login(page)
  await expect(page).toHaveURL(/\/admin\/routes$/)
  await expect(page).toHaveURL(/\/login$/, { timeout: 8000 })
  await expect(page.getByRole('status')).toContainText('sesión ha vencido')
})

test('401 on a resource ends the current session', async ({ page }) => {
  const state = await mockApi(page)
  await login(page)
  await expect(page).toHaveURL(/\/admin\/routes$/)
  // Wait for the initial successful load before making the next request unauthorized.
  await expect(page.getByRole('heading', { name: 'Aún no hay rutas escolares' })).toBeVisible()
  state.routesStatus = 401
  await page.getByRole('button', { name: 'Actualizar rutas', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(await page.evaluate((key) => sessionStorage.getItem(key), key)).toBeNull()
})

test('403 denies a resource but keeps the session', async ({ page }) => {
  await mockApi(page, { routesStatus: 403 })
  await login(page)
  await expect(page).toHaveURL(/\/admin\/routes$/)
  await expect(page.getByRole('status')).toContainText('Tu sesión sigue activa')
  expect(await page.evaluate((key) => sessionStorage.getItem(key), key)).not.toBeNull()
})

test('temporary IAM outage preserves the credential and supports retry', async ({ page }) => {
  const user = account('PARENT')
  const state = await mockApi(page, { user, meStatus: 503 })
  await seedSession(page, user)
  await page.goto('/parent')
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('alert')).toContainText('verificar tu sesión')
  expect(await page.evaluate((key) => sessionStorage.getItem(key), key)).not.toBeNull()
  state.meStatus = 200
  await page.getByRole('button', { name: 'Reintentar conexión' }).click()
  await expect(page).toHaveURL(/\/parent$/)
})

test('logout clears storage and Back cannot restore protected views', async ({ page }) => {
  await mockApi(page)
  await login(page)
  await expect(page).toHaveURL(/\/admin\/routes$/)
  await page.getByRole('navigation', { name: 'Menú administrativo' }).getByRole('link', { name: 'Conductores y vehículos' }).click()
  await expect(page).toHaveURL(/\/admin\/resources$/)
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).filter({ visible: true }).first().click()
  await expect(page).toHaveURL(/\/login$/)
  expect(await page.evaluate((key) => sessionStorage.getItem(key), key)).toBeNull()
  await page.goBack()
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole('navigation', { name: 'Menú administrativo' })).toHaveCount(0)
})

test('logout cancels old requests before another account signs in', async ({ page }) => {
  await mockApi(page)
  let release
  let started
  const requested = new Promise((resolve) => { started = resolve })
  const deferred = new Promise((resolve) => { release = resolve })
  await page.route('**/api/v1/delayed', async (route) => {
    started()
    await deferred
    await route.fulfill({ status: 401, json: { detail: 'Old account' } }).catch(() => {})
  })
  await login(page)
  await expect(page).toHaveURL(/\/admin\/routes$/)
  await page.evaluate(async () => {
    const { default: client } = await import('/src/shared/api/apiClient.js')
    window.pendingResult = null
    void client.get('/delayed').then(() => { window.pendingResult = 'unexpected-success' })
      .catch((error) => { window.pendingResult = error.code })
  })
  await requested
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).filter({ visible: true }).first().click()
  await expect(page).toHaveURL(/\/login$/)
  await expect.poll(() => page.evaluate(() => window.pendingResult)).toBe('ERR_CANCELED')
  await login(page, 'parent')
  await expect(page).toHaveURL(/\/parent$/)
  release()
  expect(await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key)).user.roleTier, key)).toBe('PARENT')
})

test('a temporary resource outage does not clear a signed-in account', async ({ page }) => {
  await mockApi(page, { routesStatus: 503 })
  await login(page)
  await expect(page).toHaveURL(/\/admin\/routes$/)
  expect(await page.evaluate((key) => sessionStorage.getItem(key), key)).not.toBeNull()
  await expect(page.getByText('No disponible.', { exact: true })).toBeVisible()
})

test('font assets and mobile design tokens load locally', async ({ page }) => {
  await page.goto('/login')
  await page.evaluate(() => document.fonts.ready)
  const result = await page.evaluate(() => ({
    body: getComputedStyle(document.body).fontFamily,
    title: getComputedStyle(document.querySelector('h1')).fontFamily,
    button: getComputedStyle(document.querySelector('.auth-submit')).backgroundColor,
    color: getComputedStyle(document.querySelector('.auth-submit')).color,
    loaded: document.fonts.check('16px Archivo') && document.fonts.check('700 20px "Archivo Expanded"'),
  }))
  expect(result.body).toContain('Archivo')
  expect(result.title).toContain('Archivo Expanded')
  expect(result.button).toBe('rgb(242, 183, 5)')
  expect(result.color).toBe('rgb(21, 36, 59)')
  expect(result.loaded).toBeTruthy()
})

test('mobile login and navigation fit and support keyboard dismissal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockApi(page)
  await login(page)
  await expect(page).toHaveURL(/\/admin\/routes$/)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy()
  const opener = page.getByRole('button', { name: 'Abrir menú administrativo' })
  await opener.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(opener).toBeFocused()
})

test('delete confirmation focuses Cancel and Escape returns focus', async ({ page }) => {
  await mockApi(page, { students: [{ id: 'student-fixture', fullName: 'Alumno Prueba', schoolName: 'Colegio', enrollments: [], pickupLocation: { address: 'Ubicación de prueba', latitude: -12, longitude: -77 } }] })
  await login(page, 'parent')
  await expect(page).toHaveURL(/\/parent$/)
  await page.goto('/parent/students')
  const remove = page.getByRole('button', { name: /Eliminar/ }).first()
  await remove.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cancelar', exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(remove).toBeFocused()
})
