import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

function worker() {
  const listeners = new Map()
  const shown = []
  const opened = []
  const messages = []
  let background
  const context = {
    URL,
    importScripts() {},
    firebase: { initializeApp() {}, messaging: () => ({ onBackgroundMessage(callback) { background = callback } }) },
    self: {
      location: { origin: 'https://rutasegura.example' },
      RutaSeguraFcmConfig: { sdkVersion: 'fixture', firebase: {} },
      addEventListener(name, callback) { listeners.set(name, callback) },
      registration: { async showNotification(title, options) { shown.push({ title, ...options }) } },
      clients: {
        async matchAll() { return [{ url: 'https://rutasegura.example/parent', postMessage(value) { messages.push(value) }, async navigate(url) { opened.push(url) }, async focus() {} }] },
        async openWindow(url) { opened.push(url) },
      },
    },
  }
  vm.runInNewContext(readFileSync(new URL('../public/firebase-messaging-sw.js', import.meta.url), 'utf8'), context)
  return { listeners, shown, opened, messages, background }
}

test('background notification payload is forwarded without displaying a second alert', async () => {
  const state = worker()
  await state.background({ notification: { title: 'RutaSegura' }, data: { notificationId: '66666666-6666-4666-8666-666666666666' } })
  assert.equal(state.shown.length, 0)
  assert.equal(state.messages[0].notificationId, '66666666-6666-4666-8666-666666666666')
})

test('data-only push displays generic copy without child data', async () => {
  const state = worker()
  await state.background({ data: { notificationId: '66666666-6666-4666-8666-666666666666', studentName: 'Private name', body: 'Private detail' } })
  assert.equal(state.shown.length, 1)
  assert.equal(state.shown[0].body, 'Tienes un nuevo aviso. Ingresa a RutaSegura para revisarlo.')
  assert.equal(JSON.stringify(state.shown).includes('Private'), false)
})

test('notification click navigates within this site and preserves only the notification identifier', async () => {
  const state = worker()
  let done
  state.listeners.get('notificationclick')({
    stopImmediatePropagation() {},
    notification: {
      close() {},
      data: { FCM_MSG: { data: { notificationId: '66666666-6666-4666-8666-666666666666' }, fcmOptions: { link: 'https://untrusted.example' } } },
    },
    waitUntil(promise) { done = promise },
  })
  await done
  assert.equal(state.opened[0], 'https://rutasegura.example/notifications/open?notificationId=66666666-6666-4666-8666-666666666666')
})
