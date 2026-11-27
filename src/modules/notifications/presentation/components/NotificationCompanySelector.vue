<script setup>
import { onMounted } from 'vue'
import { usePushNotificationsStore } from '../../application/pushNotificationsStore'
import { loadNotificationScope, notificationScope } from '../../infrastructure/notificationScope'
const push = usePushNotificationsStore()
onMounted(() => { void loadNotificationScope().catch(() => {}) })
const retry = () => { void loadNotificationScope({ force: true }).catch(() => {}) }
</script>
<template>
  <div v-if="notificationScope.organizationIds.length > 1" class="rs-stack mb-3 min-w-0">
    <label class="text-sm font-semibold">Empresa de tus notificaciones
      <select class="rs-input mt-1 w-full min-w-0 max-w-full" :value="notificationScope.selectedId" :disabled="push.busy" @change="push.changeOrganization($event.target.value)">
        <option disabled value="">Selecciona una empresa</option>
        <option v-for="id in notificationScope.organizationIds" :key="id" :value="id">Empresa {{ id }}</option>
      </select>
    </label>
  </div>
  <div v-if="notificationScope.error" role="alert" class="mb-3 text-sm text-red-700">
    {{ notificationScope.error }} <button type="button" class="underline" @click="retry">Reintentar empresas</button>
  </div>
</template>
