<script setup>
import { onMounted } from 'vue'
import { BellRing, BellOff } from 'lucide-vue-next'
import { usePushNotificationsStore } from '../../application/pushNotificationsStore'
import { loadNotificationScope, notificationScope } from '../../infrastructure/notificationScope'

const push = usePushNotificationsStore()
onMounted(() => { void loadNotificationScope().catch(() => {}) })
</script>

<template>
  <div class="rs-panel rs-stack mb-4 p-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h3 class="font-semibold">Notificaciones de escritorio</h3>
        <p class="text-sm text-slate-600">{{ push.enabled ? 'Activadas en este navegador.' : 'Recibe avisos aunque esta pestaña esté en segundo plano.' }}</p>
      </div>
      <button v-if="push.enabled || push.registered" type="button" class="rs-button-secondary" :disabled="push.busy" @click="push.disable()">
        <BellOff :size="16" aria-hidden="true" /> Desactivar notificaciones
      </button>
      <button v-if="push.enabled" type="button" class="rs-button-secondary" :disabled="push.busy" @click="push.testDesktopNotification()">
        Probar aviso de escritorio
      </button>
      <button v-if="!push.enabled" type="button" class="rs-button-primary" :disabled="push.busy || !push.supported || !notificationScope.selectedId" @click="push.synchronize({ requestPermission: true })">
        <BellRing :size="16" aria-hidden="true" /> {{ push.busy ? 'Activando…' : 'Activar notificaciones' }}
      </button>
    </div>
    <p v-if="notificationScope.error" role="alert" class="text-sm text-red-700">{{ notificationScope.error }}</p>
    <p v-else-if="!notificationScope.organizationIds.length" class="text-sm text-slate-600">Necesitas un vínculo verificado con una empresa para activar los avisos.</p>
    <p v-if="!push.supported" class="text-sm text-slate-600">Este navegador requiere HTTPS o localhost y soporte de notificaciones. Puedes seguir consultando la bandeja.</p>
    <p v-if="push.error" role="alert" class="text-sm text-red-700">{{ push.error }}</p>
    <p v-else-if="push.notice" role="status" class="text-sm text-slate-700">{{ push.notice }}</p>
  </div>
</template>
