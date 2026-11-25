<script setup>
import { onMounted } from 'vue'
import { Bell, CheckCheck, LoaderCircle, RefreshCcw } from 'lucide-vue-next'
import { useNotificationsStore } from '../../application/notificationsStore'

const store = useNotificationsStore()

function formatDate(value) {
  const time = Date.parse(value)
  return Number.isFinite(time)
    ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium', timeStyle: 'short' }).format(time)
    : ''
}

const reload = () => store.loadPage()
onMounted(reload)
</script>

<template>
  <section class="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
    <header class="mb-4 flex items-center justify-between">
      <div class="flex items-center gap-2.5">
        <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
          <Bell :size="17" aria-hidden="true" />
        </span>
        <div>
          <h2 class="text-base font-bold text-slate-900">Notificaciones</h2>
          <p class="text-xs text-slate-500">{{ store.unreadCount }} sin leer</p>
        </div>
      </div>
      <button
        type="button"
        class="flex h-9 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        :disabled="store.loading"
        @click="reload"
      >
        <LoaderCircle v-if="store.loading" :size="14" class="animate-spin" aria-hidden="true" />
        <RefreshCcw v-else :size="14" aria-hidden="true" />
        Actualizar
      </button>
    </header>

    <p v-if="store.error" role="alert" class="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
      {{ store.error }}
    </p>

    <p
      v-else-if="store.loaded && !store.items.length"
      class="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500"
    >
      No tienes notificaciones.
    </p>

    <ul v-else class="space-y-2">
      <li
        v-for="item in store.items"
        :key="item.id"
        class="flex items-start gap-3 rounded-2xl border bg-white p-4 shadow-2xs"
        :class="item.read ? 'border-slate-200' : 'border-blue-200 ring-1 ring-blue-100'"
      >
        <span
          class="mt-1.5 h-2 w-2 shrink-0 rounded-full"
          :class="item.read ? 'bg-slate-300' : 'bg-blue-600'"
          aria-hidden="true"
        ></span>
        <div class="min-w-0 flex-1">
          <strong v-if="item.title" class="block text-sm font-semibold text-slate-900">{{ item.title }}</strong>
          <p v-if="item.message" class="mt-0.5 text-sm text-slate-600">{{ item.message }}</p>
          <span class="mt-1 block text-xs text-slate-400">{{ formatDate(item.createdAt) }}</span>
        </div>
        <button
          v-if="!item.read"
          type="button"
          class="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-blue-600 disabled:opacity-50"
          :disabled="store.isMarking(item.id)"
          @click="store.markAsRead(item.id)"
        >
          <CheckCheck :size="14" aria-hidden="true" />
          Marcar leída
        </button>
      </li>
    </ul>

    <button
      v-if="store.pageMeta.hasMore"
      type="button"
      class="mt-3 w-full rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
      :disabled="store.loading"
      @click="store.loadMore()"
    >
      Cargar más
    </button>
  </section>
</template>
