<script setup>
import { CircleAlert, CircleCheck, Info, LoaderCircle, X } from 'lucide-vue-next'
defineProps({ kind: { type: String, default: 'info' }, title: String, message: String, retryLabel: String, dismissible: Boolean })
defineEmits(['retry', 'dismiss'])
const icons = { loading: LoaderCircle, error: CircleAlert, success: CircleCheck, info: Info, empty: Info }
</script>
<template>
  <div class="app-feedback" :data-kind="kind" :role="kind === 'error' ? 'alert' : 'status'" :aria-busy="kind === 'loading'">
    <component :is="icons[kind] || Info" :size="20" :class="{ 'animate-spin': kind === 'loading' }" aria-hidden="true" />
    <div class="min-w-0 flex-1">
      <p v-if="title" class="font-semibold">{{ title }}</p>
      <p v-if="message">{{ message }}</p><slot />
      <button v-if="retryLabel" type="button" class="mt-2 font-semibold underline underline-offset-4" @click="$emit('retry')">{{ retryLabel }}</button>
    </div>
    <button v-if="dismissible" type="button" class="rounded p-1" aria-label="Cerrar aviso" @click="$emit('dismiss')"><X :size="18" /></button>
  </div>
</template>
