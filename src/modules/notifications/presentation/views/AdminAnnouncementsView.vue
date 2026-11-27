<script setup>
import { onMounted, reactive, ref } from 'vue'
import { LoaderCircle, Megaphone, RefreshCcw, RotateCcw, Send } from 'lucide-vue-next'
import { useNotificationsStore } from '../../application/notificationsStore'
import { validateAnnouncement } from '../../domain/notification'

const store = useNotificationsStore()
const form = reactive({ title: '', message: '' })
const errors = ref({})

function formatDate(value) {
  const time = Date.parse(value)
  return Number.isFinite(time)
    ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(time)
    : ''
}

async function submit() {
  const result = validateAnnouncement(form)
  errors.value = result.errors
  if (!result.valid) return
  if (await store.publishAnnouncement(form)) {
    form.title = ''
    form.message = ''
  }
}

onMounted(() => {
  store.announcementNotice = ''
  store.announcementError = ''
  void store.loadFailedDeliveries()
})
</script>

<template>
  <div class="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
      <header class="mb-4 flex items-center gap-2.5">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Megaphone :size="17" aria-hidden="true" />
        </span>
        <h2 class="text-base font-bold text-slate-900">Enviar comunicado</h2>
      </header>

      <p class="mb-4 text-sm text-slate-600">El comunicado se envía a las familias con inscripción vigente y a los conductores verificados de tu empresa.</p>

      <form class="space-y-3" novalidate @submit.prevent="submit">
        <div>
          <label for="announcement-title" class="mb-1 block text-xs font-semibold text-slate-700">Título</label>
          <input
            id="announcement-title"
            v-model="form.title"
            type="text"
            autocomplete="off"
            class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-500"
            :aria-invalid="Boolean(errors.title)"
          />
          <p v-if="errors.title" class="mt-1 text-xs text-red-600">{{ errors.title }}</p>
        </div>
        <div>
          <label for="announcement-message" class="mb-1 block text-xs font-semibold text-slate-700">Mensaje</label>
          <textarea
            id="announcement-message"
            v-model="form.message"
            rows="4"
            class="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-blue-500"
            :aria-invalid="Boolean(errors.message)"
          ></textarea>
          <p v-if="errors.message" class="mt-1 text-xs text-red-600">{{ errors.message }}</p>
        </div>

        <p v-if="store.announcementError" role="alert" class="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {{ store.announcementError }}
        </p>
        <p v-if="store.announcementNotice" role="status" class="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
          {{ store.announcementNotice }}
        </p>

        <button
          type="submit"
          class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
          :disabled="store.sending"
        >
          <LoaderCircle v-if="store.sending" :size="15" class="animate-spin" aria-hidden="true" />
          <Send v-else :size="15" aria-hidden="true" />
          Enviar comunicado
        </button>
      </form>
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
      <header class="mb-4 flex items-center justify-between">
        <h2 class="text-base font-bold text-slate-900">Entregas fallidas</h2>
        <button
          type="button"
          class="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          :disabled="store.failedLoading"
          @click="store.loadFailedDeliveries()"
        >
          <LoaderCircle v-if="store.failedLoading" :size="14" class="animate-spin" aria-hidden="true" />
          <RefreshCcw v-else :size="14" aria-hidden="true" />
          Actualizar
        </button>
      </header>

      <p v-if="store.failedError" role="alert" class="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
        {{ store.failedError }}
      </p>
      <p v-if="store.replayNotice" role="status" class="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
        {{ store.replayNotice }}
      </p>

      <p
        v-if="store.failedLoaded && !store.failedDeliveries.length && !store.failedError"
        class="py-6 text-center text-sm text-slate-500"
      >
        No hay entregas fallidas.
      </p>

      <ul v-else class="divide-y divide-slate-100">
        <li v-for="delivery in store.failedDeliveries" :key="delivery.id" class="flex items-start gap-3 py-3">
          <div class="min-w-0 flex-1 text-xs text-slate-600">
            <strong v-if="delivery.channel" class="block text-sm font-semibold text-slate-900">{{ delivery.channel }}</strong>
            <p v-if="delivery.status">Estado: {{ delivery.status }}</p>
            <p v-if="delivery.reason" class="text-red-700">{{ delivery.reason }}</p>
            <p v-if="delivery.attempts !== null">Intentos: {{ delivery.attempts }}<span v-if="delivery.replays"> · Reintentos manuales: {{ delivery.replays }}</span></p>
            <span v-if="delivery.failedAt" class="text-slate-400">{{ formatDate(delivery.failedAt) }}</span>
          </div>
          <button
            type="button"
            class="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-blue-600 disabled:opacity-50"
            :disabled="store.replayingIds.includes(delivery.id)"
            @click="store.replay(delivery.id)"
          >
            <RotateCcw :size="14" aria-hidden="true" />
            Reintentar
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>
