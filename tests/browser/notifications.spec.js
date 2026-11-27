import { test, expect } from '@playwright/test'

const organization = '33333333-3333-4333-8333-333333333333'
const otherOrganization = '44444444-4444-4444-8444-444444444444'
const userId = '22222222-2222-4222-8222-222222222222'
const subscriptionId = '55555555-5555-4555-8555-555555555555'
const noticeId = '66666666-6666-4666-8666-666666666666'
const storageKey = 'rutasegura.push.installation'

test.beforeEach(async ({ page }) => {
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.testPushErrors = errors
})
test.afterEach(async ({ page }) => { expect(page.testPushErrors).toEqual([]) })

async function setup(page, { permission = 'default', contexts = [organization], detailStatus = 200 } = {}) {
  const user = { id: userId, firstName: 'Familia', lastName: 'Prueba', roleTier: 'PARENT', organizationId: null }
  const expiry = Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')
  const token = `test.${expiry}.fixture`
  const state = { registrations: [], deletions: [], notice: null, pageCalls: 0 }
  await page.addInitScript(({ user, token, permission }) => {
    sessionStorage.setItem('rutasegura.auth.session', JSON.stringify({ user, token }))
    window.pushTest = { permission, permissionRequests: 0, registrations: [], shown: [], removed: 0, token: localStorage.getItem('fixture-next-fcm-token') || 'fixture-fcm-token' }
    Object.defineProperty(Notification, 'permission', { configurable: true, get: () => window.pushTest.permission })
    Notification.requestPermission = async () => {
      window.pushTest.permissionRequests++
      if (window.pushTest.permission !== 'denied') window.pushTest.permission = 'granted'
      return window.pushTest.permission
    }
    const registration = {
      active: { state: 'activated' },
      showNotification: async (title, options) => window.pushTest.shown.push({ title, ...options }),
      pushManager: { getSubscription: async () => ({ unsubscribe: async () => { window.pushTest.removed++; return true } }) },
    }
    navigator.serviceWorker.register = async (url, options) => {
      window.pushTest.registrations.push({ url, options })
      return registration
    }
    navigator.serviceWorker.getRegistration = async () => registration
  }, { user, token, permission })
  await page.route('https://www.gstatic.com/firebasejs/**/firebase-app.js', route => route.fulfill({
    contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' },
    body: 'export const getApps = () => []; export const initializeApp = (settings, name) => ({ settings, name });',
  }))
  await page.route('https://www.gstatic.com/firebasejs/**/firebase-messaging.js', route => route.fulfill({
    contentType: 'text/javascript', headers: { 'Access-Control-Allow-Origin': '*' },
    body: `
      export const isSupported = async () => true;
      export const getMessaging = app => ({ app });
      export const getToken = async () => window.pushTest.token;
      export const deleteToken = async () => true;
      export function onMessage(messaging, callback) {
        window.pushTest.message = callback;
        return () => { if (window.pushTest.message === callback) window.pushTest.message = null; };
      }
    `,
  }))
  await page.route('**/api/v1/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname.replace('/api/v1', '')
    if (path === '/users/me') return route.fulfill({ json: user })
    if (path === '/notifications/contexts') return route.fulfill({ json: { organizationIds: contexts } })
    if (path.startsWith('/push-subscriptions/') && request.method() === 'PUT') {
      state.registrations.push({ body: request.postDataJSON(), headers: request.headers(), url: request.url() })
      return route.fulfill({ json: { id: subscriptionId, installationId: path.split('/').at(-1), isEnabled: true } })
    }
    if (path.startsWith('/push-subscriptions/') && request.method() === 'DELETE') {
      state.deletions.push({ url: request.url(), headers: request.headers() })
      return route.fulfill({ status: 204 })
    }
    if (path === '/notifications/page') {
      state.pageCalls++
      const cursor = new URL(request.url()).searchParams.get('cursor')
      return route.fulfill({ json: {
        items: cursor ? [{ id: '77777777-7777-4777-8777-777777777777', title: 'Aviso anterior', body: 'Segunda página' }] : state.notice ? [state.notice] : [],
        nextCursor: cursor ? null : 'next-page', hasMore: !cursor,
      } })
    }
    if (path === '/notifications') return route.fulfill({ json: state.notice ? [state.notice] : [] })
    if (path === `/notifications/${noticeId}`) return route.fulfill({
      status: detailStatus,
      json: detailStatus === 200 ? state.notice : { detail: 'Vínculo revocado.' },
    })
    return route.fulfill({ json: [] })
  })
  return { state, token }
}

async function activate(page) {
  await page.goto('/parent/notifications')
  await page.getByRole('button', { name: 'Activar notificaciones', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Desactivar notificaciones', exact: true })).toBeVisible()
}

test('registers the browser only after consent and sends the authorized organization', async ({ page }) => {
  const { state } = await setup(page)
  await page.goto('/parent/notifications')
  await expect(page.getByRole('button', { name: 'Activar notificaciones', exact: true })).toBeEnabled()
  expect(state.registrations).toHaveLength(0)
  expect(await page.evaluate(() => window.pushTest.permissionRequests)).toBe(0)
  await page.getByRole('button', { name: 'Activar notificaciones', exact: true }).click()
  await expect.poll(() => state.registrations.length).toBe(1)
  expect(state.registrations[0].body).toEqual({ token: 'fixture-fcm-token', platform: 'Web' })
  expect(state.registrations[0].headers['x-organization-id']).toBe(organization)
  const stored = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), storageKey)
  expect(stored.subscriptionId).toBe(subscriptionId)
  expect(stored).not.toHaveProperty('token')
  expect(await page.evaluate(() => window.pushTest.registrations[0].url)).toBe('/firebase-messaging-sw.js')
})

test('denied permission leaves the inbox usable and creates no subscription', async ({ page }) => {
  const { state } = await setup(page, { permission: 'denied' })
  await page.goto('/parent/notifications')
  await page.getByRole('button', { name: 'Activar notificaciones', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('bloqueadas')
  expect(state.registrations).toHaveLength(0)
  await expect(page.getByRole('button', { name: 'Actualizar', exact: true })).toBeEnabled()
})

test('desktop test requests a local alert without creating a server notification', async ({ page }) => {
  const { state } = await setup(page)
  await activate(page)
  await page.getByRole('button', { name: 'Probar aviso de escritorio', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.pushTest.shown.length)).toBe(1)
  expect(await page.evaluate(() => window.pushTest.shown[0].body)).toBe('Esta es una prueba local de notificaciones.')
  expect(await page.evaluate(() => window.pushTest.shown[0].data)).toEqual({})
  expect(state.notice).toBeNull()
  expect(state.registrations).toHaveLength(1)
  await expect(page.getByRole('status').filter({ hasText: 'El navegador aceptó la prueba' })).toBeVisible()
})

test('renews the token for the same installation on reload without asking permission again', async ({ page }) => {
  const { state } = await setup(page, { permission: 'granted' })
  await activate(page)
  await expect.poll(() => state.registrations.length).toBe(1)
  const first = state.registrations[0].url
  await page.evaluate(() => localStorage.setItem('fixture-next-fcm-token', 'fixture-refreshed-token'))
  await page.reload()
  await expect.poll(() => state.registrations.length).toBe(2)
  expect(state.registrations[1].url).toBe(first)
  expect(state.registrations[1].body.token).toBe('fixture-refreshed-token')
  expect(await page.evaluate(() => window.pushTest.permissionRequests)).toBe(0)
})

test('logout removes the endpoint and uses the captured JWT for the server-side deletion', async ({ page }) => {
  const { state, token } = await setup(page)
  await activate(page)
  await expect.poll(() => state.registrations.length).toBe(1)
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).filter({ visible: true }).first().click()
  await expect(page).toHaveURL(/\/login$/)
  await expect.poll(() => state.deletions.length).toBe(1)
  expect(state.deletions[0].headers.authorization).toBe(`Bearer ${token}`)
  expect(state.deletions[0].headers['x-organization-id']).toBe(organization)
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), storageKey)).toBeNull()
  expect(await page.evaluate(() => window.pushTest.removed)).toBe(1)
})

test('foreground push fetches authorized content and deduplicates desktop alerts', async ({ page }) => {
  const { state } = await setup(page)
  await activate(page)
  state.notice = { id: noticeId, title: 'Abordaje confirmado', body: 'Aviso de prueba', createdAt: new Date().toISOString() }
  await page.evaluate(async id => {
    await window.pushTest.message({ data: { notificationId: id } })
    await window.pushTest.message({ data: { notificationId: id } })
  }, noticeId)
  await expect(page.getByText('Abordaje confirmado', { exact: true }).first()).toBeVisible()
  await expect.poll(() => page.evaluate(() => window.pushTest.shown.length)).toBe(1)
  expect(await page.evaluate(() => window.pushTest.shown[0].body)).toBe('Tienes un nuevo aviso. Ingresa a RutaSegura para revisarlo.')
})

test('a revoked notice does not display content or a foreground desktop notification', async ({ page }) => {
  await setup(page, { detailStatus: 403 })
  await activate(page)
  await page.evaluate(id => window.pushTest.message({ data: { notificationId: id } }), noticeId)
  await expect(page.getByRole('status').filter({ hasText: 'Tu sesión sigue activa' })).toBeVisible()
  expect(await page.evaluate(() => window.pushTest.shown)).toHaveLength(0)
})

test('multiple organizations require an explicit authorized selection', async ({ page }) => {
  const { state } = await setup(page, { contexts: [organization, otherOrganization] })
  await page.goto('/parent/notifications')
  await expect(page.getByLabel('Empresa de tus notificaciones')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Activar notificaciones', exact: true })).toBeDisabled()
  await page.getByLabel('Empresa de tus notificaciones').selectOption(otherOrganization)
  await page.getByRole('button', { name: 'Activar notificaciones', exact: true }).click()
  await expect.poll(() => state.registrations.length).toBe(1)
  expect(state.registrations[0].headers['x-organization-id']).toBe(otherOrganization)
})

test('a different account cannot silently take over an existing browser registration', async ({ page }) => {
  const { state } = await setup(page)
  await page.addInitScript(({ key, organization }) => localStorage.setItem(key, JSON.stringify({
    userId: '88888888-8888-4888-8888-888888888888', organizationId: organization,
    installationId: '99999999-9999-4999-8999-999999999999', subscriptionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', enabled: true,
  })), { key: storageKey, organization })
  await page.goto('/parent/notifications')
  await page.getByRole('button', { name: 'Activar notificaciones', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('otra cuenta')
  expect(state.registrations).toHaveLength(0)
})

test('opening the push link checks authorization and loads the target notice', async ({ page }) => {
  const { state } = await setup(page)
  state.notice = { id: noticeId, title: 'Comunicado de prueba', body: 'Detalle autorizado' }
  await page.goto(`/notifications/open?notificationId=${noticeId}`)
  await expect(page).toHaveURL(new RegExp(`/parent/notifications\\?notificationId=${noticeId}`))
  await expect(page.getByText('Detalle autorizado', { exact: true }).first()).toBeVisible()
})

test('opening the bell retains the second page of the inbox', async ({ page }) => {
  await setup(page)
  await page.goto('/parent/notifications')
  await page.getByRole('button', { name: 'Cargar más', exact: true }).click()
  await expect(page.getByText('Segunda página', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: /^Notificaciones/ }).filter({ visible: true }).first().click()
  await expect(page.getByText('Segunda página', { exact: true })).toBeVisible()
})

test('notification settings fit a mobile viewport', async ({ page }) => {
  await setup(page, { contexts: [organization, otherOrganization] })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/parent/notifications')
  await expect(page.getByLabel('Empresa de tus notificaciones')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: 'test-results/notification-settings-mobile.png', fullPage: true })
})
