import { createServer } from 'vite'

// A local frontend/proxy for the existing test deployment; no EC2 or DNS changes.
const target = process.env.RUTASEGURA_TEST_GATEWAY || 'http://ec2-3-216-48-246.compute-1.amazonaws.com'
const url = new URL(target)
if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
  throw new Error('RUTASEGURA_TEST_GATEWAY must contain only the Gateway origin.')
}
process.env.VITE_API_BASE_URL = '/api/v1'
process.env.VITE_API_PROXY_TARGET = url.origin
const server = await createServer({ server: { host: '127.0.0.1', port: 5174, strictPort: true } })
await server.listen()
server.printUrls()
console.log(`API and WebSockets proxy to ${url.origin}. Use fictional test accounts only on HTTP.`)
