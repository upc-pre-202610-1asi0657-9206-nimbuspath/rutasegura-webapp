import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr'
import { readAuthToken } from '@/shared/api/authSessionStorage'
export function trackingHubUrl() {
  const explicit = import.meta.env.VITE_TRACKING_HUB_URL
  if (explicit) return explicit
  const base = import.meta.env.VITE_API_BASE_URL || '/api/v1'
  // REST and hubs use the same Gateway, even when the API uses an absolute URL.
  const url = new URL(base, window.location.origin)
  url.pathname =
    url.pathname.replace(/\/api\/v1\/?$/, '') + '/hubs/trip-tracking'
  url.search = ''
  url.hash = ''
  return url.href
}
export function createTripConnection() {
  return new HubConnectionBuilder()
    .withUrl(trackingHubUrl(), {
      accessTokenFactory: () => readAuthToken() || '',
    })
    .withAutomaticReconnect([0, 2000, 10000, 30000])
    .configureLogging(LogLevel.None)
    .build()
}
