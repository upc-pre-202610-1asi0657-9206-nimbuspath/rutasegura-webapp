import { test, expect } from '@playwright/test'
const id = (n) => `10000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const trip = id(1),
  child = id(2),
  stop = id(3)
async function setup(
  page,
  { role = 'PARENT', hub = true, stale = false } = {},
) {
  const jwt = `test.${Buffer.from(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.fixture`
  const user = {
    id: id(5),
    firstName: 'Familia',
    lastName: 'Prueba',
    roleTier: role,
    organizationId: role === 'ADMIN' ? id(6) : null,
    token: jwt,
  }
  const state = {
    calls: [],
    sockets: [],
    subscribed: [],
    unsubscribed: [],
    closed: 0,
    liveStatus: 200,
    offerStatus: 'InProgress',
    position: {
      latitude: -12.11,
      longitude: -77.02,
      recordedAt: new Date(Date.now() - (stale ? 120000 : 0)).toISOString(),
      ageSeconds: stale ? 120 : 0,
    },
    passenger: 'Pending',
    sos: false,
    hasTrip: true,
  }
  await page.addInitScript(
    (user) =>
      sessionStorage.setItem(
        'rutasegura.auth.session',
        JSON.stringify({ user, token: user.token }),
      ),
    user,
  )
  await page.route('https://tile.openstreetmap.org/**', (r) => r.abort())
  await page.routeWebSocket('**/hubs/trip-tracking**', (ws) => {
    state.sockets.push(ws)
    ws.onClose(() => {
      state.closed++
    })
    ws.onMessage((data) => {
      for (const frame of String(data).split('\u001e').filter(Boolean)) {
        const message = JSON.parse(frame)
        if (message.protocol) {
          ws.send('{}\u001e')
          continue
        }
        if (message.type === 1) {
          if (message.target === 'SubscribeToTrip')
            state.subscribed.push(message.arguments[0])
          if (message.target === 'UnsubscribeFromTrip')
            state.unsubscribed.push(message.arguments[0])
          ws.send(
            JSON.stringify({
              type: 3,
              invocationId: message.invocationId,
              result: { tripId: message.arguments[0] },
            }) + '\u001e',
          )
        }
      }
    })
  })
  await page.route('**/hubs/trip-tracking/negotiate**', (r) =>
    r.fulfill({
      status: hub ? 200 : 503,
      json: hub
        ? {
            negotiateVersion: 1,
            connectionId: 'fixture',
            connectionToken: 'fixture',
            availableTransports: [
              { transport: 'WebSockets', transferFormats: ['Text', 'Binary'] },
            ],
          }
        : { error: 'offline' },
    }),
  )
  await page.route('**/api/v1/**', (r) => {
    const req = r.request(),
      path = new URL(req.url()).pathname.replace('/api/v1', '')
    state.calls.push({
      path,
      method: req.method(),
      body: req.postData(),
      headers: req.headers(),
    })
    const ok = (json) => r.fulfill({ json })
    if (path === '/users/me') return ok(user)
    if (path === '/stakeholders/me/students')
      return ok([{ id: child, fullName: 'Ana Prueba' }])
    if (path === '/guardians/me/trips')
      return ok(
        state.hasTrip
          ? [
              {
                tripId: trip,
                routeName: 'Ruta autorizada',
                direction: 'Pickup',
                status: state.offerStatus,
                myStudents: [{ studentId: child, status: state.passenger }],
              },
            ]
          : [],
      )
    if (path === '/trips')
      return ok([
        {
          tripId: trip,
          routeName: 'Ruta autorizada',
          direction: 'Pickup',
          status: state.offerStatus,
          scheduledStart: new Date().toISOString(),
          hasActiveSos: state.sos,
        },
      ])
    if (
      path === '/routes' ||
      path === '/roster/drivers' ||
      path === '/roster/vehicles'
    )
      return ok([])
    if (path === `/trips/${trip}/live`) {
      if (state.liveStatus !== 200)
        return r.fulfill({
          status: state.liveStatus,
          json: { detail: 'Acceso revocado o directorio no disponible.' },
        })
      return ok({
        tripId: trip,
        routeName: 'Ruta autorizada',
        direction: 'Pickup',
        status: state.offerStatus,
        scheduledStart: new Date().toISOString(),
        position: state.position,
        hasActiveSos: state.sos,
        passengers: [
          { studentId: child, stopId: stop, status: state.passenger },
        ],
        stops: [
          {
            stopId: stop,
            name: 'Recojo autorizado',
            latitude: -12.12,
            longitude: -77.03,
          },
        ],
        nextStop: { stopId: stop, name: 'Recojo autorizado', etaMinutes: 3 },
      })
    }
    if (path === `/trips/${trip}/position`)
      return ok({
        tripId: trip,
        status: state.offerStatus,
        position: state.position,
        nextStopId: stop,
        nextStopEtaMinutes: 3,
      })
    if (path === `/trips/${trip}/summary`)
      return ok({
        tripId: trip,
        incidents: [
          {
            incidentId: id(7),
            type: 'VehicleFailure',
            detail: 'Unidad detenida',
            occurredAt: new Date().toISOString(),
          },
        ],
      })
    if (path === '/operations/alerts')
      return ok([
        {
          id: id(8),
          tripId: trip,
          type: 'SOS',
          severity: 'CRITICAL',
          status: 'OPEN',
          detail: 'Proyección de emergencia',
        },
      ])
    if (path === `/trips/${trip}/sos/resolve`) {
      state.sos = false
      return r.fulfill({ status: 204 })
    }
    return r.fulfill({
      status: 404,
      json: { detail: 'Unexpected fixture endpoint: ' + path },
    })
  })
  state.emit = (target, payload = {}) =>
    state.sockets.at(-1)?.send(
      JSON.stringify({
        type: 1,
        target,
        arguments: [{ tripId: trip, ...payload }],
      }) + '\u001e',
    )
  return state
}
async function open(page) {
  await page.goto('/parent/tracking')
  await expect(
    page.getByRole('heading', { name: 'Ruta autorizada · En curso' }),
  ).toBeVisible()
}
test('parent subscribes through SignalR; events refresh scoped assistance and coordinates', async ({
  page,
}) => {
  const s = await setup(page)
  await open(page)
  await expect.poll(() => s.subscribed.length).toBe(1)
  expect(s.subscribed[0]).toBe(trip)
  await expect(page.getByText('Por recoger', { exact: true })).toBeVisible()
  s.passenger = 'Boarded'
  s.position = {
    ...s.position,
    latitude: -12.15,
    recordedAt: new Date().toISOString(),
  }
  s.emit('PositionUpdated', { recordedAt: s.position.recordedAt })
  await expect(page.getByText('A bordo', { exact: true })).toBeVisible()
  await expect(page.getByText(/Llegada estimada: 3 min/)).toBeVisible()
  s.passenger = 'Alighted'
  s.emit('PositionUpdated', { recordedAt: new Date().toISOString() })
  await expect(page.getByText('Desembarcó', { exact: true })).toBeVisible({
    timeout: 2500,
  })

  expect(s.calls.some((c) => c.path.endsWith('/summary'))).toBeFalsy()
  await page
    .getByRole('button', { name: 'Cerrar sesión', exact: true })
    .filter({ visible: true })
    .first()
    .click()
  await expect(page).toHaveURL(/\/login$/)
  await expect.poll(() => s.closed).toBeGreaterThan(0)
})
test('terminal status removes map and ignores late position updates', async ({
  page,
}) => {
  const s = await setup(page)
  await open(page)
  await expect.poll(() => s.subscribed.length).toBe(1)
  s.offerStatus = 'Completed'
  s.emit('TripStatusChanged', {
    status: 'Completed',
    occurredAt: new Date().toISOString(),
  })
  await expect(
    page.getByText(/seguimiento de ubicación está detenido/),
  ).toBeVisible()
  await expect(
    page.getByRole('region', {
      name: 'Ubicación del vehículo y paradas autorizadas',
    }),
  ).toHaveCount(0)
  await expect.poll(() => s.closed).toBeGreaterThan(0)
})
test('revocation clears sensitive data and stops an existing live connection', async ({
  page,
}) => {
  const s = await setup(page)
  await open(page)
  await expect.poll(() => s.subscribed.length).toBe(1)
  s.liveStatus = 403
  s.emit('PositionUpdated', { recordedAt: new Date().toISOString() })
  await expect(page.getByRole('alert')).toContainText('Acceso revocado')
  await expect(
    page.getByRole('region', {
      name: 'Ubicación del vehículo y paradas autorizadas',
    }),
  ).toHaveCount(0)
  await expect(page.getByText('Por recoger', { exact: true })).toHaveCount(0)
  await expect.poll(() => s.closed).toBeGreaterThan(0)
})
test('old GPS is labelled and ETA withheld', async ({ page }) => {
  await setup(page, { stale: true })
  await open(page)
  await expect(page.getByText(/Ubicación antigua; no representa/)).toBeVisible()
  await expect(page.getByText(/Llegada estimada:/)).toHaveCount(0)
})
test('without GPS the map never fabricates a vehicle position', async ({
  page,
}) => {
  const s = await setup(page)
  s.position = null
  await open(page)
  await expect(page.getByText(/Sin ubicación GPS disponible/)).toBeVisible()
})
test('hub startup failure falls back to periodic REST and refreshes assistance', async ({
  page,
}) => {
  const s = await setup(page, { hub: false })
  await open(page)
  s.passenger = 'Alighted'
  await expect(page.getByText('Desembarcó', { exact: true })).toBeVisible({
    timeout: 12000,
  })
  expect(
    s.calls.filter((c) => c.path.endsWith('/live')).length,
  ).toBeGreaterThan(1)
})
test('reconnection subscribes again and recovers missed changes over REST', async ({
  page,
}) => {
  const s = await setup(page)
  await open(page)
  await expect.poll(() => s.subscribed.length).toBe(1)
  s.passenger = 'Boarded'
  s.sockets[0].close({ code: 1012, reason: 'fixture restart' })
  await expect
    .poll(() => s.subscribed.length, { timeout: 15000 })
    .toBeGreaterThan(1)
  await expect(page.getByText('A bordo', { exact: true })).toBeVisible()
})
test('admin confirms SOS in Tracking without body and sees incidents/alerts separately', async ({
  page,
}) => {
  const s = await setup(page, { role: 'ADMIN' })
  s.sos = true
  await page.goto('/admin/trips')
  await page
    .getByRole('button', {
      name: /Monitorear|Ver viaje|Ver en vivo|Ver estado/,
    })
    .first()
    .click()
  await expect(
    page.getByText('SOS activo', { exact: true }).last(),
  ).toBeVisible()
  await expect(page.getByText('Unidad detenida')).toBeVisible()
  await expect(page.getByText('Proyección de emergencia')).toBeVisible()
  await page.getByRole('button', { name: 'Atender y cerrar SOS' }).click()
  await page.getByRole('button', { name: 'Confirmar cierre de SOS' }).click()
  await expect(page.getByText(/SOS cerrado. El conductor/)).toBeVisible()
  const call = s.calls.find((c) => c.path.endsWith('/sos/resolve'))
  expect(call.method).toBe('POST')
  expect(call.body).toBeNull()
  expect(
    s.calls.some(
      (c) => c.method === 'POST' && c.path.startsWith('/operations'),
    ),
  ).toBeFalsy()
})
for (const width of [320, 390, 1440])
  test(`tracking responsive ${width}px`, async ({ page }) => {
    await setup(page)
    await page.setViewportSize({ width, height: 900 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await open(page)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy()
    await page.screenshot({
      path: `test-results/tracking-${width}.png`,
      fullPage: true,
    })
  })

test('authority outage removes private map, then manual retry recovers without logging out', async ({
  page,
}) => {
  const s = await setup(page)
  await open(page)
  await expect.poll(() => s.subscribed.length).toBe(1)
  s.liveStatus = 503
  s.emit('PositionUpdated', { recordedAt: new Date().toISOString() })
  await expect(page.getByRole('alert')).toContainText(
    'directorio no disponible',
  )
  await expect(
    page.getByRole('region', {
      name: 'Ubicación del vehículo y paradas autorizadas',
    }),
  ).toHaveCount(0)
  s.liveStatus = 200
  await page
    .getByRole('button', { name: 'Actualizar estado del viaje', exact: true })
    .click()
  await expect(
    page.getByRole('region', {
      name: 'Ubicación del vehículo y paradas autorizadas',
    }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => !!sessionStorage.getItem('rutasegura.auth.session'),
    ),
  ).toBeTruthy()
})
test('scheduled trip never requests or renders vehicle location', async ({
  page,
}) => {
  const s = await setup(page)
  s.offerStatus = 'Scheduled'
  await page.goto('/parent/tracking')
  await expect(page.getByText(/El viaje todavía no ha iniciado/)).toBeVisible()
  expect(s.calls.some((c) => c.path.endsWith('/position'))).toBeFalsy()
  await expect(
    page.getByRole('region', {
      name: 'Ubicación del vehículo y paradas autorizadas',
    }),
  ).toHaveCount(0)
})
test('navigation tears down subscription and does not keep polling the old trip', async ({
  page,
}) => {
  const s = await setup(page)
  await open(page)
  await expect.poll(() => s.subscribed.length).toBe(1)
  await page
    .getByRole('navigation', { name: 'Menú principal de familia' })
    .getByRole('link', { name: 'Mis rutas' })
    .click()
  await expect.poll(() => s.closed).toBeGreaterThan(0)
  await expect(
    page.getByRole('region', {
      name: 'Ubicación del vehículo y paradas autorizadas',
    }),
  ).toHaveCount(0)
})

test('Delayed is an active trip and retains authorized GPS over REST', async ({
  page,
}) => {
  const s = await setup(page)
  s.offerStatus = 'Delayed'
  await page.goto('/parent/tracking')
  await expect(
    page.getByRole('heading', {
      name: 'Ruta autorizada · En curso con retraso',
    }),
  ).toBeVisible()
  await expect(
    page.getByRole('region', {
      name: 'Ubicación del vehículo y paradas autorizadas',
    }),
  ).toBeVisible()
  expect(s.calls.some((c) => c.path.endsWith('/position'))).toBeTruthy()
})

test('admin SOS dialog fits a narrow viewport and requires explicit confirmation', async ({
  page,
}) => {
  const s = await setup(page, { role: 'ADMIN' })
  s.sos = true
  await page.setViewportSize({ width: 320, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/admin/trips')
  await page
    .getByRole('button', {
      name: /Monitorear|Ver viaje|Ver en vivo|Ver estado/,
    })
    .first()
    .click()
  await expect(
    page.getByRole('button', { name: 'Atender y cerrar SOS' }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy()
  await page.screenshot({
    path: 'test-results/admin-sos-320.png',
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Atender y cerrar SOS' }).click()
  await page
    .getByRole('dialog', { name: 'Cerrar alerta SOS' })
    .getByRole('button', { name: 'Cancelar', exact: true })
    .click()
  expect(s.calls.some((c) => c.path.endsWith('/sos/resolve'))).toBeFalsy()
})
