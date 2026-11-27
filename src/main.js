
import { createApp } from 'vue'
import { createPinia } from 'pinia'

import PrimeVue from 'primevue/config'
import MobilePreset from './styles/primePreset'

import App from './App.vue'
import router from './app/router'
import { useAuthStore } from '@/modules/auth/stores/authStore'
import { startSessionLifecycle } from '@/modules/auth/services/sessionLifecycle'
import { usePushNotificationsStore, startPushLifecycle } from '@/modules/notifications/application/pushNotificationsStore'
import { useNotificationsStore } from '@/modules/notifications/application/notificationsStore'
import { startNotificationLifecycle } from '@/modules/notifications/application/notificationLifecycle'

import './styles/main.css'

const app = createApp(App)

app.use(createPinia())

const stopSessionLifecycle = startSessionLifecycle(useAuthStore(), router)
const stopPushLifecycle = startPushLifecycle(usePushNotificationsStore())
const stopNotificationsLifecycle = startNotificationLifecycle(useNotificationsStore())
if (import.meta.hot) import.meta.hot.dispose(stopSessionLifecycle)
if (import.meta.hot) import.meta.hot.dispose(stopPushLifecycle)
if (import.meta.hot) import.meta.hot.dispose(stopNotificationsLifecycle)

app.use(router)

app.use(PrimeVue, {
  theme: {
    preset: MobilePreset,
    options: {
      prefix: 'p',
      darkModeSelector: '.app-dark',
      cssLayer: true,
    },
  },
})

app.mount('#app')
