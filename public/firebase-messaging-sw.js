/* global firebase */
const notificationPath = '/notifications/open'
// Register before Firebase, which installs its own notificationclick handler.
self.addEventListener('notificationclick', (event) => {
  event.stopImmediatePropagation()
  event.notification.close()
  const payload = event.notification.data
  const id = payload?.notificationId || payload?.FCM_MSG?.data?.notificationId
  const destination = new URL(notificationPath, self.location.origin)
  if (/^[0-9a-f-]{36}$/i.test(id || '')) destination.searchParams.set('notificationId', id)
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = windows.find(client => new URL(client.url).origin === self.location.origin)
    if (existing) {
      await existing.navigate(destination.href)
      await existing.focus()
    } else await self.clients.openWindow(destination.href)
  })())
})
importScripts('/firebase-config.js')
const settings = self.RutaSeguraFcmConfig
importScripts(
  `https://www.gstatic.com/firebasejs/${settings.sdkVersion}/firebase-app-compat.js`,
  `https://www.gstatic.com/firebasejs/${settings.sdkVersion}/firebase-messaging-compat.js`,
)
firebase.initializeApp(settings.firebase)
const messaging = firebase.messaging()
messaging.onBackgroundMessage(async payload => {
  const notificationId = payload.data?.notificationId
  const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  for (const client of windows) client.postMessage({ kind: 'rutasegura-notification', notificationId })
  // Firebase displays notification payloads automatically. Data-only payloads use the same generic copy.
  if (!payload.notification && /^[0-9a-f-]{36}$/i.test(notificationId || '')) {
    await self.registration.showNotification('RutaSegura', {
      body: 'Tienes un nuevo aviso. Ingresa a RutaSegura para revisarlo.',
      tag: notificationId.replaceAll('-', ''),
      data: { notificationId },
    })
  }
})
