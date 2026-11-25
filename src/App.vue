<script setup>
import { useAuthStore } from '@/modules/auth/stores/authStore'
import AppFeedback from '@/shared/components/AppFeedback.vue'
import { useRoute } from 'vue-router'
const auth = useAuthStore()
const route = useRoute()
</script>
<template>
  <a href="#main-content" class="skip-link">Ir al contenido</a>
  <div v-if="auth.notice && auth.isAuthenticated" class="session-notice">
    <AppFeedback :message="auth.notice" dismissible @dismiss="auth.notice = null" />
  </div>
  <div v-if="auth.verifying" class="mx-auto max-w-lg p-6"><AppFeedback kind="loading" message="Verificando tu sesión…" /></div>
  <RouterView v-else-if="auth.isAuthenticated || !route.matched.some(record => record.meta.requiresAuth)" :key="auth.user?.id || 'guest'" />
</template>
