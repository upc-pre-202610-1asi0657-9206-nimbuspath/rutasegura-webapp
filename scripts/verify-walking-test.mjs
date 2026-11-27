import fs from 'node:fs/promises'
import { HubConnectionBuilder, HttpTransportType, LogLevel } from '@microsoft/signalr'

const manifestPath = process.argv[2]
if (!manifestPath) throw new Error('Usage: node scripts/verify-walking-test.mjs <accounts.json>')
const fixture = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
const evidence = { checkedAt: new Date().toISOString(), baseUrl: fixture.baseUrl, results: [] }
async function request(path, { token, organizationId, body, expected = 200 } = {}) {
  const response = await fetch(`${fixture.baseUrl}${path}`, {
    method: body ? 'POST' : 'GET', signal: AbortSignal.timeout(20000),
    headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(organizationId ? { 'X-Organization-Id': organizationId } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
  const accepted = Array.isArray(expected) ? expected.includes(response.status) : response.status === expected
  evidence.results.push({ path, status: response.status, accepted })
  if (!accepted) throw new Error(`${path}: unexpected status ${response.status}`)
  if (response.status !== 200) return null
  const text = await response.text()
  try { return JSON.parse(text) } catch { return text }
}
async function socket(path, token) {
  const connection = new HubConnectionBuilder().withUrl(`${fixture.baseUrl}${path}`, {
    transport: HttpTransportType.LongPolling, accessTokenFactory: () => token,
  }).configureLogging(LogLevel.None).build()
  let timer
  try {
    await Promise.race([connection.start(), new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('WebSocket timeout')), 15000)
    })])
    evidence.results.push({ path: path.split('?')[0], kind: 'authenticated-signalr-longpolling', accepted: true })
  } finally { clearTimeout(timer); await connection.stop().catch(() => {}) }
}
try {
  await request('/health/ready')
  await request('/api/v1/notifications', { expected: 401 })
  const parent = await request('/api/v1/users/sign-in', { body: { email: fixture.parent.email, password: fixture.parent.password } })
  const driver = await request('/api/v1/users/sign-in', { body: { email: fixture.driver.email, password: fixture.driver.password } })
  const children = await request('/api/v1/stakeholders/me/students', { token: parent.token })
  if (!fixture.students.every(s => children.some(c => c.id === s.id))) throw new Error('Missing test child')
  await request('/api/v1/notifications/contexts', { token: parent.token })
  await request('/api/v1/notifications/page?limit=25', { token: parent.token, organizationId: fixture.organizationId })
  await request('/api/v1/notifications/page?limit=25', { token: driver.token })
  await request('/api/v1/roster/drivers/me', { token: driver.token })
  await request('/api/v1/drivers/me/trips', { token: driver.token })
  await request('/api/v1/guardians/me/trips', { token: parent.token })
  await request('/api/v1/drivers/me/trips', { token: parent.token, expected: [401, 403] })
  await request('/api/v1/stakeholders/me/students', { token: driver.token, expected: [401, 403] })
  await request('/api/v1/stakeholders/me/students/11111111-1111-4111-8111-111111111111', { token: parent.token, expected: 404 })
  await request('/api/v1/notifications', { token: parent.token, organizationId: '11111111-1111-4111-8111-111111111111', expected: [401, 403] })
  await socket(`/hubs/notifications?organizationId=${fixture.organizationId}`, parent.token)
  await socket('/hubs/notifications', driver.token)
  await socket('/hubs/trip-tracking', driver.token)
  evidence.accepted = true
} catch (error) { evidence.accepted = false; evidence.error = error.message; process.exitCode = 1 }
await fs.mkdir('artifacts/walking', { recursive: true })
await fs.writeFile('artifacts/walking/cloud-contracts.json', JSON.stringify(evidence, null, 2))
console.log(JSON.stringify(evidence, null, 2))
