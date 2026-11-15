<script setup>
import AppFeedback from '@/shared/components/AppFeedback.vue'
import { computed, onMounted, ref } from 'vue'
import {
  AlertTriangle,
  BusFront,
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  RefreshCcw,
  Route,
  Users,
  Activity,
  ShieldAlert,
  Play,
  Plus,
  Sparkles,
  LoaderCircle,
  X,
  Navigation,
  Radio,
} from 'lucide-vue-next'
import {
  useRoute,
  useRouter,
} from 'vue-router'
const currentRoute = useRoute()
const router = useRouter()
import {
  getAdminRoutes,
  getDrivers,
  getVehicles,
} from '@/modules/admin/services/adminService'

import {
  getOrganizationTrips,
  getTripLive,
  scheduleTrip,
} from '@/modules/admin/services/tripMonitoringService'

// ============================================================
// STATE
// ============================================================

const trips = ref([])
const routes = ref([])
const drivers = ref([])
const vehicles = ref([])

const loading = ref(true)
const error = ref('')

const statusFilter = ref('')

const selectedDate = ref(
  typeof currentRoute.query.date === 'string'
    ? currentRoute.query.date
    : getLimaDate(),
)

const scheduleModal = ref(false)

const scheduleRouteId = ref('')
const scheduleDate = ref(
  getLimaDate(),
)

const scheduling = ref(false)
const scheduleError = ref('')
const scheduleErrorKey = ref(0)

const liveModal = ref(false)
const liveTrip = ref(null)
const liveLoading = ref(false)
const liveError = ref('')

// ============================================================
// HELPERS
// ============================================================

function getLimaDate() {
  const formatter =
    new Intl.DateTimeFormat(
      'en-CA',
      {
        timeZone: 'America/Lima',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      },
    )

  const parts =
    formatter.formatToParts(
      new Date(),
    )

  const year =
    parts.find(
      (part) => part.type === 'year',
    )?.value

  const month =
    parts.find(
      (part) => part.type === 'month',
    )?.value

  const day =
    parts.find(
      (part) => part.type === 'day',
    )?.value

  return `${year}-${month}-${day}`
}

function dateRange(dateString) {
  const from = new Date(
    `${dateString}T00:00:00-05:00`,
  )

  const to = new Date(
    from.getTime() +
      24 * 60 * 60 * 1000,
  )

  return {
    from: from.toISOString(),
    to: to.toISOString(),
  }
}

function backendError(
  err,
  fallback,
) {
  return (
    err?.response?.data?.detail ||
    err?.response?.data?.title ||
    err?.response?.data?.message ||
    fallback
  )
}

function statusLabel(status) {
  const values = {
    Scheduled: 'Programado',
    InProgress: 'En curso',
    Completed: 'Completado',
    Cancelled: 'Cancelado',
  }

  return values[status] || status
}

function statusClass(status) {
  if (status === 'InProgress') {
    return 'bg-blue-50 text-blue-700 ring-blue-600/20'
  }

  if (status === 'Completed') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
  }

  if (status === 'Cancelled') {
    return 'bg-red-50 text-red-700 ring-red-600/20'
  }

  return 'bg-amber-50 text-amber-700 ring-amber-600/20'
}

function topStripClass(status) {
  if (status === 'InProgress') {
    return 'from-brand-navy via-brand-yellow to-brand-navy-light'
  }

  if (status === 'Completed') {
    return 'from-emerald-500 via-teal-400 to-brand-navy-light'
  }

  if (status === 'Cancelled') {
    return 'from-red-500 to-orange-400'
  }

  return 'from-amber-400 via-orange-400 to-brand-navy-light'
}

function directionLabel(direction) {
  if (direction === 'Pickup' || direction === 'PICKUP') {
    return 'Ida al colegio'
  }

  if (direction === 'Return' || direction === 'RETURN') {
    return 'Retorno a casa'
  }

  return direction
}

function formatDateTime(value) {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat(
    'es-PE',
    {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(new Date(value))
}

function formatTime(value) {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat(
    'es-PE',
    {
      timeZone: 'America/Lima',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(new Date(value))
}

function driverName(driverId) {
  const driver = drivers.value.find(
    (item) =>
      item.id === driverId ||
      item.userId === driverId,
  )

  if (!driver) {
    return 'Conductor'
  }

  return `${driver.firstName} ${driver.lastName}`
}

function vehicleName(vehicleId) {
  const vehicle =
    vehicles.value.find(
      (item) => item.id === vehicleId,
    )

  if (!vehicle) {
    return 'Vehículo sin asignar'
  }

  return `${vehicle.licensePlate} · ${vehicle.brand} ${vehicle.model}`
}

async function changeDate() {
  await router.replace({
    query: {
      ...currentRoute.query,
      date: selectedDate.value,
    },
  })

  await loadTrips()
}
// ============================================================
// COMPUTED
// ============================================================

const activeRoutes = computed(() => {
  return routes.value.filter(
    (route) =>
      route.status === 'ACTIVE',
  )
})

const totalTrips = computed(
  () => trips.value.length,
)

const scheduledTrips = computed(
  () =>
    trips.value.filter(
      (trip) =>
        trip.status === 'Scheduled',
    ).length,
)

const inProgressTrips = computed(
  () =>
    trips.value.filter(
      (trip) =>
        trip.status === 'InProgress',
    ).length,
)

const completedTrips = computed(
  () =>
    trips.value.filter(
      (trip) =>
        trip.status === 'Completed',
    ).length,
)

const sosTrips = computed(
  () =>
    trips.value.filter(
      (trip) =>
        trip.hasActiveSos,
    ).length,
)

const canSchedule = computed(() => {
  return (
    scheduleRouteId.value &&
    scheduleDate.value &&
    !scheduling.value
  )
})

// ============================================================
// LOAD
// ============================================================

async function loadTrips() {
  loading.value = true
  error.value = ''

  try {
    const range =
      dateRange(
        selectedDate.value,
      )

    const [
      tripData,
      routeData,
      driverData,
      vehicleData,
    ] = await Promise.all([
      getOrganizationTrips({
        from: range.from,
        to: range.to,
        status:
          statusFilter.value ||
          null,
      }),

      getAdminRoutes(),

      getDrivers(),

      getVehicles(),
    ])

    trips.value =
      Array.isArray(tripData)
        ? tripData
        : []

    routes.value =
      Array.isArray(routeData)
        ? routeData
        : []

    drivers.value =
      Array.isArray(driverData)
        ? driverData
        : []

    vehicles.value =
      Array.isArray(vehicleData)
        ? vehicleData
        : []
  } catch (err) {

    error.value = backendError(
      err,
      'No fue posible cargar los viajes.',
    )
  } finally {
    loading.value = false
  }
}

// ============================================================
// SCHEDULE
// ============================================================

function openScheduleModal() {
  scheduleError.value = ''

  scheduleRouteId.value =
    activeRoutes.value[0]?.id ||
    ''

  scheduleDate.value =
    selectedDate.value

  scheduleModal.value = true
}

function closeScheduleModal() {
  if (scheduling.value) {
    return
  }

  scheduleModal.value = false
  scheduleError.value = ''
}

async function submitSchedule() {
  if (!canSchedule.value) {
    return
  }

  scheduling.value = true
  scheduleError.value = ''

  try {
    await scheduleTrip(
      scheduleRouteId.value,
      scheduleDate.value,
    )

    selectedDate.value =
    scheduleDate.value

    await router.replace({
    query: {
        ...currentRoute.query,
        date: selectedDate.value,
    },
    })

    scheduleModal.value = false

    await loadTrips()
  } catch (err) {

    scheduleError.value =
      backendError(
        err,
        'No fue posible programar el viaje.',
      )
    scheduleErrorKey.value++
  } finally {
    scheduling.value = false
  }
}

// ============================================================
// LIVE
// ============================================================

async function openLiveTrip(
  trip,
) {
  liveModal.value = true
  liveTrip.value = null
  liveError.value = ''
  liveLoading.value = true

  try {
    liveTrip.value =
      await getTripLive(
        trip.tripId,
      )
  } catch (err) {

    liveError.value =
      backendError(
        err,
        'No fue posible consultar el estado del viaje.',
      )
  } finally {
    liveLoading.value = false
  }
}

function closeLiveModal() {
  liveModal.value = false
  liveTrip.value = null
  liveError.value = ''
}

// ============================================================
// FILTERS
// ============================================================

async function changeStatus(
  value,
) {
  statusFilter.value = value

  await loadTrips()
}

onMounted(loadTrips)
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

    <!-- ───────── HERO DISPATCH BANNER (With Animated Radar Constellation) ───────── -->
    <section
      class="hero-banner reveal relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950 px-6 py-7 text-white shadow-[0_20px_50px_-15px_rgba(2,6,23,0.45)] sm:px-8 lg:px-10 lg:py-8"
      style="--d: 0ms"
    >
      <!-- Ambient glowing orbs -->
      <div class="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl"></div>

      <!-- Animated Live Telemetry Radar Constellation -->
      <svg
        class="pointer-events-none absolute right-6 top-2 hidden h-36 w-[350px] opacity-90 lg:block xl:right-10"
        viewBox="0 0 350 135"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="tripsRouteGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="50%" stop-color="#10b981" />
            <stop offset="100%" stop-color="#facc15" />
          </linearGradient>

          <filter id="tripsBeaconGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Base dashed route track -->
        <path
          id="tripsPrimaryPath"
          d="M 20 92 C 90 92, 115 28, 185 46 S 265 18, 325 18"
          stroke="rgba(255,255,255,0.14)"
          stroke-width="2.5"
          stroke-dasharray="4 7"
          stroke-linecap="round"
        />

        <!-- Animated glowing energy stream -->
        <path
          d="M 20 92 C 90 92, 115 28, 185 46 S 265 18, 325 18"
          stroke="url(#tripsRouteGrad)"
          stroke-width="3"
          stroke-linecap="round"
          class="route-energy-stream"
        />

        <!-- Hub Nodes -->
        <g transform="translate(20, 92)">
          <circle r="10" fill="rgba(56, 189, 248, 0.2)" class="node-pulse-1" />
          <circle r="4.5" fill="#0f172a" stroke="#38bdf8" stroke-width="2.5" />
        </g>

        <g transform="translate(185, 46)">
          <circle r="12" fill="rgba(16, 185, 129, 0.22)" class="node-pulse-2" />
          <circle r="5" fill="#0f172a" stroke="#10b981" stroke-width="2.5" />
        </g>

        <g transform="translate(325, 18)">
          <circle r="11" fill="rgba(250, 204, 21, 0.2)" class="node-pulse-1" />
          <circle r="5.5" fill="#0f172a" stroke="#facc15" stroke-width="2.5" />
        </g>

        <!-- Moving Live Telemetry Beacon -->
        <g>
          <circle r="11" fill="rgba(16, 185, 129, 0.28)" class="beacon-halo" />
          <circle r="5" fill="#10b981" stroke="#ffffff" stroke-width="2" filter="url(#tripsBeaconGlow)" />
          <animateMotion
            dur="4.5s"
            repeatCount="indefinite"
            keyPoints="0;1;0"
            keyTimes="0;0.5;1"
            calcMode="spline"
            keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
          >
            <mpath href="#tripsPrimaryPath" />
          </animateMotion>
        </g>
      </svg>

      <div class="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div class="max-w-xl">
          <div class="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-300">
            <Radio :size="12" class="text-emerald-400 animate-pulse" />
            Monitoreo en Tiempo Real
          </div>

          <h1 class="mt-3.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Monitoreo de viajes
          </h1>

          <p class="mt-2 max-w-lg text-sm leading-relaxed text-slate-300/90 sm:text-base">
            Supervisa los viajes programados y en curso de tu organización, consulta ubicaciones GPS y mantén el control operativo de la flota.
          </p>
        </div>

        <!-- Flush Right Actions -->
        <div class="flex shrink-0 items-center gap-2.5 pt-2 lg:pt-8">
          <button
            type="button"
            class="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-navy to-brand-navy-light px-5 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/25 ring-1 ring-white/20 transition-all duration-200 hover:-translate-y-0.5 hover:from-brand-navy hover:to-brand-navy-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 sm:text-sm"
            @click="openScheduleModal"
          >
            <Plus :size="17" class="transition-transform duration-200 group-hover:rotate-90" />
            <span>Programar viaje</span>
          </button>

          <button
            type="button"
            :disabled="loading"
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-300 ring-1 ring-white/10 backdrop-blur-xs transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            aria-label="Actualizar viajes"
            title="Actualizar viajes"
            @click="loadTrips"
          >
            <RefreshCcw :size="16" :class="{ 'animate-spin': loading }" />
          </button>
        </div>
      </div>
    </section>

    <!-- ───────── FILTERS BAR ───────── -->
    <section
      class="reveal mt-6 flex flex-col gap-4 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs ring-1 ring-slate-900/[0.02] sm:flex-row sm:items-center sm:justify-between"
      style="--d: 80ms"
    >
      <div class="flex flex-wrap items-center gap-4">
        <div>
          <label for="trip-date-input" class="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Fecha de servicio
          </label>
          <div class="relative mt-1.5">
            <input
              id="trip-date-input"
              v-model="selectedDate"
              type="date"
              class="rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-xs font-semibold text-slate-800 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/12"
              @change="loadTrips"
            />
          </div>
        </div>

        <div>
          <span class="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            Filtrar por estado
          </span>
          <div class="flex flex-wrap gap-1.5" role="tablist" aria-label="Filtrar viajes por estado">
            <button
              type="button"
              class="rs-button-primary rounded-xl border px-3 py-2 text-xs font-bold transition-all"
              :class="
                statusFilter === ''
                  ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                  : 'border-slate-200/90 bg-white text-slate-600 hover:bg-slate-50'
              "
              @click="changeStatus('')"
            >
              Todos
            </button>

            <button
              type="button"
              class="rounded-xl border px-3 py-2 text-xs font-bold transition-all"
              :class="
                statusFilter === 'Scheduled'
                  ? 'border-amber-500 bg-amber-500 text-white shadow-xs'
                  : 'border-slate-200/90 bg-white text-slate-600 hover:bg-slate-50'
              "
              @click="changeStatus('Scheduled')"
            >
              Programados
            </button>

            <button
              type="button"
              class="rs-button-primary rounded-xl border px-3 py-2 text-xs font-bold transition-all"
              :class="
                statusFilter === 'InProgress'
                  ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                  : 'border-slate-200/90 bg-white text-slate-600 hover:bg-slate-50'
              "
              @click="changeStatus('InProgress')"
            >
              En curso
            </button>

            <button
              type="button"
              class="rounded-xl border px-3 py-2 text-xs font-bold transition-all"
              :class="
                statusFilter === 'Completed'
                  ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                  : 'border-slate-200/90 bg-white text-slate-600 hover:bg-slate-50'
              "
              @click="changeStatus('Completed')"
            >
              Completados
            </button>
          </div>
        </div>
      </div>

      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:border-slate-300 hover:bg-slate-50 sm:self-end"
        @click="loadTrips"
      >
        <RefreshCcw :size="15" :class="{ 'animate-spin': loading }" />
        <span>Actualizar</span>
      </button>
    </section>

    <!-- ───────── 5-PILLAR TELEMETRY STATS ───────── -->
    <section
      class="reveal mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
      style="--d: 120ms"
    >
      <div class="flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total</p>
          <p class="mt-1 text-xl font-extrabold text-slate-900">{{ totalTrips }}</p>
        </div>
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <CalendarDays :size="18" />
        </div>
      </div>

      <div class="flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Programados</p>
          <p class="mt-1 text-xl font-extrabold text-amber-600">{{ scheduledTrips }}</p>
        </div>
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <Clock3 :size="18" />
        </div>
      </div>

      <div class="flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">En curso</p>
          <p class="mt-1 text-xl font-extrabold text-blue-600">{{ inProgressTrips }}</p>
        </div>
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Activity :size="18" />
        </div>
      </div>

      <div class="flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Completados</p>
          <p class="mt-1 text-xl font-extrabold text-emerald-600">{{ completedTrips }}</p>
        </div>
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <CheckCircle2 :size="18" />
        </div>
      </div>

      <div class="flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs sm:col-span-2 xl:col-span-1">
        <div>
          <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">SOS activos</p>
          <p class="mt-1 text-xl font-extrabold text-red-600">{{ sosTrips }}</p>
        </div>
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
          <ShieldAlert :size="18" />
        </div>
      </div>
    </section>

    <!-- ───────── ERROR BANNER ───────── -->
    <AppFeedback v-if="error" class="mt-6" kind="error" :message="error" retry-label="Volver a intentar" @retry="loadTrips" />

    <!-- ───────── LOADING SKELETONS ───────── -->
    <AppFeedback v-if="loading" class="mt-6" kind="loading" message="Cargando información…" />

    <!-- ───────── EMPTY STATE ───────── -->
    <section
      v-else-if="trips.length === 0"
      class="reveal mt-6 relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white px-6 py-16 text-center shadow-xs"
      style="--d: 160ms"
    >
      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 ring-1 ring-blue-500/15">
        <CalendarDays :size="28" />
      </div>

      <h2 class="mt-4 text-lg font-bold text-slate-900">
        No hay viajes para esta fecha
      </h2>

      <p class="mx-auto mt-1.5 max-w-lg text-sm leading-relaxed text-slate-500">
        Puedes programar manualmente un viaje de una ruta activa para verificar el flujo operativo de la flota.
      </p>

      <button
        type="button"
        class="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-blue-600"
        @click="openScheduleModal"
      >
        <Plus :size="17" />
        Programar viaje
      </button>
    </section>

    <!-- ───────── TRIPS FEED ───────── -->
    <section
      v-else
      class="reveal mt-6 space-y-4"
      style="--d: 160ms"
    >
      <article
        v-for="trip in trips"
        :key="trip.tripId"
        class="group relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs ring-1 ring-slate-900/[0.02] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300/80 hover:shadow-lg"
      >
        <!-- Status-Colored Top Accent Strip -->
        <div
          class="h-1.5 w-full bg-gradient-to-r"
          :class="topStripClass(trip.status)"
        ></div>

        <div class="p-5 sm:p-6">
          <div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
            <div class="flex items-start gap-3.5">
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-navy to-brand-navy-light text-white shadow-md shadow-blue-600/20"
              >
                <BusFront :size="21" />
              </div>

              <div>
                <div class="flex flex-wrap items-center gap-2.5">
                  <h2 class="text-lg font-bold tracking-tight text-slate-900">
                    {{ trip.routeName }}
                  </h2>

                  <span
                    class="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ring-1"
                    :class="statusClass(trip.status)"
                  >
                    {{ statusLabel(trip.status) }}
                  </span>

                  <span
                    v-if="trip.hasActiveSos"
                    class="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-700 ring-1 ring-red-500/25 animate-pulse"
                  >
                    <ShieldAlert :size="13" />
                    SOS
                  </span>
                </div>

                <p class="mt-0.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <Route :size="13" class="text-blue-600" />
                  <span>{{ directionLabel(trip.direction) }}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              @click="openLiveTrip(trip)"
            >
              <Activity :size="16" class="text-blue-600" />
              <span>Ver estado en vivo</span>
            </button>
          </div>

          <!-- Trip Metrics Grid -->
          <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div class="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5">
              <div class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <Clock3 :size="14" class="text-blue-600" />
                <span>Salida programada</span>
              </div>
              <p class="mt-1.5 font-mono text-sm font-bold text-slate-900">
                {{ formatTime(trip.scheduledStart) }}
              </p>
            </div>

            <div class="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5">
              <div class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <Users :size="14" class="text-emerald-600" />
                <span>Pasajeros a bordo</span>
              </div>
              <p class="mt-1.5 text-sm font-bold text-slate-900">
                {{ trip.studentsOnBoard }} / {{ trip.totalStudents }}
                <span class="text-xs font-normal text-slate-500">estudiantes</span>
              </p>
            </div>

            <div class="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5">
              <div class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <Users :size="14" class="text-indigo-600" />
                <span>Conductor</span>
              </div>
              <p class="mt-1.5 truncate text-sm font-bold text-slate-900">
                {{ driverName(trip.driverId) }}
              </p>
            </div>

            <div class="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5">
              <div class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <BusFront :size="14" class="text-teal-600" />
                <span>Vehículo</span>
              </div>
              <p class="mt-1.5 truncate text-sm font-bold text-slate-900">
                {{ vehicleName(trip.vehicleId) }}
              </p>
            </div>
          </div>

          <!-- Footer Metadata -->
          <div class="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3.5 text-xs text-slate-500">
            <div class="flex flex-wrap items-center gap-4">
              <span>
                Incidentes reportados: <strong class="text-slate-800">{{ trip.incidentCount }}</strong>
              </span>

              <span>
                Inicio efectivo: <strong class="text-slate-800">{{ trip.startedAt ? formatDateTime(trip.startedAt) : 'Pendiente' }}</strong>
              </span>
            </div>

            <span class="font-medium text-slate-400">
              Última señal GPS: {{ trip.lastPositionAt ? formatDateTime(trip.lastPositionAt) : 'Sin datos recientes' }}
            </span>
          </div>
        </div>
      </article>
    </section>

    <!-- ───────── SCHEDULE TRIP MODAL ───────── -->
    <Transition name="modal-fade">
      <div
        v-if="scheduleModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-trip-title"
        @click.self="closeScheduleModal"
      >
        <div class="modal-card relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl">
          <!-- Top Gradient Accent Strip -->
          <div class="h-1.5 w-full bg-gradient-to-r from-brand-navy via-brand-yellow to-brand-navy-light"></div>

          <!-- Modal Header -->
          <div class="flex items-start justify-between border-b border-slate-100 px-6 py-4 sm:px-7">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-500/15">
                <Play :size="19" />
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                  Trip Tracking
                </p>
                <h2 id="schedule-trip-title" class="text-lg font-bold tracking-tight text-slate-900">
                  Programar viaje
                </h2>
              </div>
            </div>

            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Cerrar ventana"
              @click="closeScheduleModal"
            >
              <X :size="18" />
            </button>
          </div>

          <!-- Modal Form Body -->
          <div class="space-y-5 px-6 py-5 sm:px-7">
            <!-- Schedule Error -->
            <div
              v-if="scheduleError"
              :key="scheduleErrorKey"
              role="alert"
              class="shake flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-xs font-medium text-red-800 sm:text-sm"
            >
              <AlertTriangle  :size="17" class="mt-0.5 shrink-0 text-red-600" />
              <span>{{ scheduleError }}</span>
            </div>

            <div>
              <label for="schedule-route-select" class="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Ruta escolar activa <strong class="text-red-500">*</strong>
              </label>

              <div class="relative mt-2">
                <select
                  id="schedule-route-select"
                  v-model="scheduleRouteId"
                  class="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/12"
                  @change="scheduleError = ''"
                >
                  <option value="" disabled>
                    Selecciona una ruta activa
                  </option>

                  <option
                    v-for="route in activeRoutes"
                    :key="route.id"
                    :value="route.id"
                  >
                    {{ route.name }} ({{ directionLabel(route.direction) }})
                  </option>
                </select>
              </div>

              <p
                v-if="activeRoutes.length === 0"
                class="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-700"
              >
                <TriangleAlert :size="13" class="text-amber-600" />
                No hay rutas con estado activo disponibles para programar.
              </p>
            </div>

            <div>
              <label for="schedule-date-input" class="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Fecha de servicio <strong class="text-red-500">*</strong>
              </label>
              <input
                id="schedule-date-input"
                v-model="scheduleDate"
                type="date"
                class="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/12"
                @input="scheduleError = ''"
              />
            </div>

            <!-- Modal Footer Buttons -->
            <div class="flex gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                class="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 sm:text-sm"
                @click="closeScheduleModal"
              >
                Cancelar
              </button>

              <button
                type="button"
                :disabled="!canSchedule"
                class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-lg shadow-slate-900/15 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                @click="submitSchedule"
              >
                <LoaderCircle v-if="scheduling" :size="16" class="animate-spin" />
                <Play v-else :size="16" />
                <span>{{ scheduling ? 'Programando...' : 'Programar viaje' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ───────── LIVE TRIP MODAL ───────── -->
    <Transition name="modal-fade">
      <div
        v-if="liveModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="live-trip-title"
        @click.self="closeLiveModal"
      >
        <div class="modal-card relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl">
          <!-- Top Gradient Accent Strip -->
          <div class="h-1.5 w-full bg-gradient-to-r from-brand-navy via-brand-yellow to-brand-navy-light"></div>

          <!-- Modal Header -->
          <div class="flex items-start justify-between border-b border-slate-100 px-6 py-4 sm:px-7">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-500/15">
                <Activity :size="20" class="animate-pulse" />
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                  Telemetry Live Tracking
                </p>
                <h2 id="live-trip-title" class="text-lg font-bold tracking-tight text-slate-900">
                  {{ liveTrip?.routeName || 'Consultando viaje...' }}
                </h2>
              </div>
            </div>

            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Cerrar ventana"
              @click="closeLiveModal"
            >
              <X :size="18" />
            </button>
          </div>

          <!-- Modal Body -->
          <div class="px-6 py-5 sm:px-7">
            <div v-if="liveLoading" class="py-12 text-center">
              <RefreshCcw :size="26" class="mx-auto animate-spin text-blue-600" />
              <p class="mt-3 text-xs font-medium text-slate-500">Obteniendo coordenadas GPS en tiempo real...</p>
            </div>

            <div
              v-else-if="liveError"
              role="alert"
              class="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 p-4 text-xs font-medium text-red-800"
            >
              <TriangleAlert :size="17" class="mt-0.5 shrink-0 text-red-600" />
              <span>{{ liveError }}</span>
            </div>

            <div v-else-if="liveTrip" class="space-y-4">
              <div class="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3.5">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Estado operativo</span>
                <span class="rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ring-1" :class="statusClass(liveTrip.status)">
                  {{ statusLabel(liveTrip.status) }}
                </span>
              </div>

              <div class="grid gap-3 sm:grid-cols-2">
                <div class="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5">
                  <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Estudiantes a bordo</p>
                  <p class="mt-1 text-base font-extrabold text-slate-900">
                    {{ liveTrip.studentsOnBoard }} / {{ liveTrip.totalStudents }}
                  </p>
                </div>

                <div class="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5">
                  <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">Estado de seguridad</p>
                  <p
                    class="mt-1 text-base font-extrabold"
                    :class="liveTrip.hasActiveSos ? 'text-red-600' : 'text-emerald-600'"
                  >
                    {{ liveTrip.hasActiveSos ? 'Alerta SOS Activa' : 'Sin alertas SOS' }}
                  </p>
                </div>
              </div>

              <div
                v-if="liveTrip.nextStop"
                class="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-4"
              >
                <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                  <MapPin :size="18" />
                </div>
                <div>
                  <p class="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                    Próxima parada programada
                  </p>
                  <p class="mt-0.5 text-sm font-bold text-slate-900">
                    {{ liveTrip.nextStop.name }}
                  </p>
                  <p class="mt-0.5 text-xs text-slate-500">
                    Parada {{ liveTrip.nextStop.sequence }} de {{ liveTrip.nextStop.totalStops }}
                  </p>
                </div>
              </div>

              <div
                v-if="liveTrip.position"
                class="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5"
              >
                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Última posición GPS reportada
                </p>
                <p class="mt-1 font-mono text-xs font-bold text-slate-800">
                  Lat: {{ liveTrip.position.latitude }}, Lng: {{ liveTrip.position.longitude }}
                </p>
              </div>

              <div class="flex items-center justify-center gap-2 rounded-xl bg-slate-100/80 py-3 text-xs font-semibold text-slate-600">
                <Navigation :size="15" class="text-blue-600" />
                <span>{{ liveTrip.passengers?.length || 0 }} pasajeros registrados en telemetría</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.hero-banner {
  background-image:
    radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom right, var(--rs-navy), var(--rs-navy-light) 60%, var(--rs-navy));
  background-size: 26px 26px, 100% 100%;
}

/* Animated Radar Stream & Pulsing Stop Nodes */
.route-energy-stream {
  stroke-dasharray: 65 240;
  animation: streamFlow 3s linear infinite;
}

@keyframes streamFlow {
  from {
    stroke-dashoffset: 305;
  }
  to {
    stroke-dashoffset: 0;
  }
}

.node-pulse-1 {
  transform-box: fill-box;
  transform-origin: center;
  animation: nodePulse 2.4s ease-out infinite;
}

.node-pulse-2 {
  transform-box: fill-box;
  transform-origin: center;
  animation: nodePulse 2.4s ease-out 0.8s infinite;
}

@keyframes nodePulse {
  0% {
    transform: scale(0.5);
    opacity: 0.85;
  }
  100% {
    transform: scale(1.75);
    opacity: 0;
  }
}

/* Entrance & Feedback Animations */
.reveal {
  opacity: 0;
  transform: translateY(10px);
  animation: reveal 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: var(--d, 0ms);
}

@keyframes reveal {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-active .modal-card {
  animation: modalPop 0.25s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@keyframes modalPop {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.shake {
  animation: shake 0.4s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

@keyframes shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-6px); }
  40%, 60% { transform: translateX(6px); }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>