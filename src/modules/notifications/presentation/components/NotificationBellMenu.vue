<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import Popover from 'primevue/popover'
import { Bell, CheckCheck, LoaderCircle } from 'lucide-vue-next'
import { onAuthSessionChange } from '@/shared/api/authSessionStorage'
import { useNotificationsStore } from '../../application/notificationsStore'

const props = defineProps({
  // Route name of the inbox for the current role; provided by the layout.
  inboxRoute: { type: String, required: true },
})

const store = useNotificationsStore()
const popover = ref(null)

const latest = computed(() => store.summaryItems.slice(0, 5))
const badge = computed(() => (store.unreadCount > 99 ? '99+' : String(store.unreadCount)))
const label = computed(() =>
  store.unreadCount
    ? `Notificaciones, ${store.unreadCount} sin leer`
    : 'Notificaciones',
)

function toggle(event) {
  popover.value?.toggle(event)
  void store.load()
}

function formatDate(value) {
  const time = Date.parse(value)
  return Number.isFinite(time)
    ? new Intl.DateTimeFormat('es-PE', { dateStyle: 'short', timeStyle: 'short' }).format(time)
    : ''
}

const onVisible = () => {
  if (!document.hidden) void store.load()
}
const stopSession = onAuthSessionChange(() => store.reset())

onMounted(() => {
  void store.load()
  document.addEventListener('visibilitychange', onVisible)
})
onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisible)
  stopSession()
})
</script>

<template>
  <div class="relative">
    <button
      type="button"
      class="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-500"
      :aria-label="label"
      aria-haspopup="true"
      @click="toggle"
    >
      <Bell :size="17" aria-hidden="true" />
      <span
        v-if="store.unreadCount"
        class="absolute -right-1.5 -top-1.5 min-w-[18px] rounded-full bg-red-600 px-1 text-center text-[10px] font-bold leading-[18px] text-white ring-2 ring-white"
      >
        {{ badge }}
      </span>
    </button>

    <Popover ref="popover" append-to="body">
      <div class="w-[min(22rem,85vw)]">
        <div class="flex items-center justify-between pb-2">
          <strong class="text-sm font-bold text-slate-900">Notificaciones</strong>
          <LoaderCircle v-if="store.summaryLoading" :size="15" class="animate-spin text-slate-400" aria-hidden="true" />
        </div>

        <p v-if="store.summaryError" role="alert" class="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {{ store.summaryError }}
        </p>

        <p v-else-if="store.summaryLoaded && !latest.length" class="px-1 py-4 text-center text-xs text-slate-500">
          No tienes notificaciones.
        </p>

        <ul v-else class="max-h-80 divide-y divide-slate-100 overflow-y-auto">
          <li v-for="item in latest" :key="item.id" class="flex items-start gap-2 py-2.5">
            <span
              class="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              :class="item.read ? 'bg-transparent' : 'bg-blue-600'"
              aria-hidden="true"
            ></span>
            <div class="min-w-0 flex-1">
              <strong v-if="item.title" class="block truncate text-xs font-semibold text-slate-900">{{ item.title }}</strong>
              <p v-if="item.message" class="line-clamp-2 text-xs text-slate-600">{{ item.message }}</p>
              <span class="text-[11px] text-slate-400">{{ formatDate(item.createdAt) }}</span>
            </div>
            <button
              v-if="!item.read"
              type="button"
              class="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-blue-600 disabled:opacity-50"
              :disabled="store.isMarking(item.id)"
              aria-label="Marcar como leída"
              @click="store.markAsRead(item.id)"
            >
              <CheckCheck :size="15" aria-hidden="true" />
            </button>
          </li>
        </ul>

        <RouterLink
          :to="{ name: props.inboxRoute }"
          class="mt-2 block rounded-lg bg-slate-50 py-2 text-center text-xs font-semibold text-blue-600 transition hover:bg-slate-100"
          @click="popover?.hide()"
        >
          Ver todas
        </RouterLink>
      </div>
    </Popover>
  </div>
</template>
