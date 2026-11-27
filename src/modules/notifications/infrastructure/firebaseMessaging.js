let sdkPromise
let messaging
let registration

export function pushSupported() {
  return window.isSecureContext && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window
}

async function sdk() {
  if (!sdkPromise) {
    const settings = globalThis.RutaSeguraFcmConfig
    if (!settings?.firebase?.projectId || !settings?.vapidPublicKey) throw new Error('Falta la configuración pública de Firebase.')
    const root = `https://www.gstatic.com/firebasejs/${settings.sdkVersion}`
    sdkPromise = Promise.all([
      import(/* @vite-ignore */ `${root}/firebase-app.js`),
      import(/* @vite-ignore */ `${root}/firebase-messaging.js`),
    ]).then(async ([apps, messages]) => {
      if (!await messages.isSupported()) throw new Error('Este navegador no admite notificaciones push.')
      const name = 'rutasegura-web'
      const app = apps.getApps().find(item => item.name === name) || apps.initializeApp(settings.firebase, name)
      messaging = messages.getMessaging(app)
      return messages
    }).catch(error => { sdkPromise = null; throw error })
  }
  return sdkPromise
}

export async function getBrowserPushToken(onMessage) {
  const messages = await sdk()
  registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', { scope: '/' })
  if (!registration.active) {
    await new Promise((resolve, reject) => {
      const worker = registration.installing || registration.waiting
      const timeout = setTimeout(() => { worker?.removeEventListener('statechange', check); reject(new Error('El receptor no pudo iniciarse. Recarga e inténtalo nuevamente.')) }, 20000)
      function check() {
        if (worker?.state === 'activated') { clearTimeout(timeout); worker.removeEventListener('statechange', check); resolve() }
        else if (worker?.state === 'redundant') { clearTimeout(timeout); worker.removeEventListener('statechange', check); reject(new Error('No se pudo instalar el receptor.')) }
      }
      worker?.addEventListener('statechange', check)
      check()
    })
  }
  const token = await messages.getToken(messaging, {
    vapidKey: globalThis.RutaSeguraFcmConfig.vapidPublicKey,
    serviceWorkerRegistration: registration,
  })
  if (!token) throw new Error('Firebase no devolvió un token para este navegador.')
  return { token, stop: messages.onMessage(messaging, onMessage) }
}

export async function removeBrowserPushToken() {
  const active = registration || await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js')
  await (await active?.pushManager?.getSubscription())?.unsubscribe()
  if (messaging) await (await sdk()).deleteToken(messaging)
}

export async function displayForegroundPush(notificationId) {
  if (!registration || Notification.permission !== 'granted') throw new Error('Activa las notificaciones en este navegador antes de probarlas.')
  await registration.showNotification('RutaSegura', {
    body: notificationId ? 'Tienes un nuevo aviso. Ingresa a RutaSegura para revisarlo.' : 'Esta es una prueba local de notificaciones.',
    tag: notificationId ? notificationId.replaceAll('-', '') : 'rutasegura-desktop-test',
    data: notificationId ? { notificationId } : {},
  })
}
