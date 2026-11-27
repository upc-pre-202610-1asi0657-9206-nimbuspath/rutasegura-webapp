import { HubConnectionBuilder, HttpTransportType, LogLevel } from '@microsoft/signalr'
import { readAuthSession } from '@/shared/api/authSessionStorage'

export function createNotificationConnection(organizationId, token) {
  const base = import.meta.env.VITE_API_BASE_URL || '/api/v1'
  const url = new URL(base, window.location.origin)
  url.pathname = url.pathname.replace(/\/api\/v1\/?$/, '') + '/hubs/notifications'
  url.search = ''
  url.hash = ''
  url.searchParams.set('organizationId', organizationId)
  return new HubConnectionBuilder().withUrl(url.href, {
    // Keep the same Gateway when a reverse proxy does not forward WebSocket Upgrade.
    transport: HttpTransportType.WebSockets | HttpTransportType.LongPolling,
    accessTokenFactory: () => readAuthSession()?.token === token ? token : '',
  }).withAutomaticReconnect([0, 2000, 10000, 30000]).configureLogging(LogLevel.None).build()
}
