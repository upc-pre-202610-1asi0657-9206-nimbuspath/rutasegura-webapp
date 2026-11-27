<script setup>
import { onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/modules/auth/stores/authStore'
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
onMounted(() => router.replace({
  name: auth.isAdmin ? 'admin-notifications' : 'parent-notifications',
  query: typeof route.query.notificationId === 'string' ? { notificationId: route.query.notificationId } : {},
}))
</script>
<template><p class="p-6" role="status">Abriendo notificaciones…</p></template>
