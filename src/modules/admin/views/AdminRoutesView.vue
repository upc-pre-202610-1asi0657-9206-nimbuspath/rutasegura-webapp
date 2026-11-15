<script setup>
import {
  computed,
  onMounted,
  reactive,
  ref,
} from 'vue'

import {
  TriangleAlert,
  BusFront,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  Plus,
  RefreshCcw,
  Route,
  Users,
  X,
  Sparkles,
  ArrowRight,
  Globe,
  MapPin,
  LoaderCircle,
  UserCheck,
  ShieldCheck,
  Power,
  Settings2,
} from 'lucide-vue-next'

import {
  activateRoute,
  assignRouteResources,
  createRoute,
  getAdminRoutes,
  getDrivers,
  getRouteQuota,
  getVehicles,
} from '@/modules/admin/services/adminService'

const routes = ref([])
const quota = ref(null)
const drivers = ref([])
const vehicles = ref([])

const loading = ref(true)
const error = ref('')
const actionError = ref('')

const showCreateModal = ref(false)
const creating = ref(false)
const createError = ref('')
const createErrorKey = ref(0)

const createdRoute = ref(null)
const copiedCode = ref('')

// ============================================================
// ASSIGNMENT & ACTIVATION
// ============================================================

const showAssignmentModal = ref(false)
const assignmentRoute = ref(null)

const selectedDriverId = ref('')
const selectedVehicleId = ref('')

const assigning = ref(false)
const assignmentError = ref('')
const assignmentErrorKey = ref(0)

const activatingRouteId = ref(null)

// ============================================================
// ROUTE FORM
// ============================================================

const days = [
  { value: 'Monday', label: 'Lun' },
  { value: 'Tuesday', label: 'Mar' },
  { value: 'Wednesday', label: 'Mié' },
  { value: 'Thursday', label: 'Jue' },
  { value: 'Friday', label: 'Vie' },
  { value: 'Saturday', label: 'Sáb' },
  { value: 'Sunday', label: 'Dom' },
]

const form = reactive({
  name: '',
  direction: 'PICKUP',
  departureTime: '06:30',
  estimatedArrivalTime: '07:30',
  timeZoneId: 'America/Lima',
  operatingDays: [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
  ],
})

// ============================================================
// COMPUTED
// ============================================================

const canCreate = computed(() => {
  return (
    form.name.trim().length >= 3 &&
    form.direction &&
    form.departureTime &&
    form.estimatedArrivalTime &&
    form.operatingDays.length > 0 &&
    !creating.value
  )
})

const verifiedDrivers = computed(() => {
  return drivers.value.filter(
    (driver) => driver.status === 'VERIFIED'
  )
})

const enabledVehicles = computed(() => {
  return vehicles.value.filter(
    (vehicle) => vehicle.status === 'ENABLED'
  )
})

const canAssign = computed(() => {
  return (
    selectedDriverId.value &&
    selectedVehicleId.value &&
    !assigning.value
  )
})

const quotaPercentage = computed(() => {
  if (!quota.value || !quota.value.maxActiveRoutes) return 0
  return Math.min(
    100,
    Math.round((quota.value.activeRoutes / quota.value.maxActiveRoutes) * 100)
  )
})

// ============================================================
// DISPLAY HELPERS
// ============================================================

function statusLabel(status) {
  const labels = {
    DRAFT: 'Borrador',
    ACTIVE: 'Activa',
    INACTIVE: 'Inactiva',
  }
  return labels[status] || status
}

function statusClasses(status) {
  if (status === 'ACTIVE') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
  }
  if (status === 'INACTIVE') {
    return 'bg-slate-100 text-slate-600 ring-slate-500/15'
  }
  return 'bg-amber-50 text-amber-700 ring-amber-600/20'
}

function topStripClass(status) {
  if (status === 'ACTIVE') {
    return 'from-emerald-500 via-teal-400 to-sky-400'
  }
  if (status === 'INACTIVE') {
    return 'from-slate-400 to-slate-300'
  }
  return 'from-amber-400 via-orange-400 to-blue-500'
}

function directionLabel(direction) {
  if (direction === 'PICKUP') return 'Ida al colegio'
  if (direction === 'RETURN') return 'Retorno a casa'
  return direction
}

function formatTime(value) {
  if (!value) return '--:--'
  return String(value).slice(0, 5)
}

function formatDays(values = []) {
  if (!Array.isArray(values)) return ''
  return values
    .map((day) => days.find((item) => item.value === day)?.label ?? day)
    .join(', ')
}

function isDayActive(routeItem, dayValue) {
  const list = routeItem?.schedule?.operatingDays
  return Array.isArray(list) && list.includes(dayValue)
}

function driverName(driverId) {
  const driver = drivers.value.find((item) => item.id === driverId)
  if (!driver) return 'Conductor asignado'
  return `${driver.firstName} ${driver.lastName}`
}

function vehicleName(vehicleId) {
  const vehicle = vehicles.value.find((item) => item.id === vehicleId)
  if (!vehicle) return 'Vehículo asignado'
  return `${vehicle.licensePlate} · ${vehicle.brand} ${vehicle.model}`
}

function backendErrorMessage(err, fallback) {
  return (
    err?.response?.data?.detail ||
    err?.response?.data?.title ||
    err?.response?.data?.message ||
    fallback
  )
}

// ============================================================
// LOAD
// ============================================================

async function loadRoutes() {
  loading.value = true
  error.value = ''

  try {
    const [routeData, quotaData, driverData, vehicleData] =
      await Promise.all([
        getAdminRoutes(),
        getRouteQuota(),
        getDrivers(),
        getVehicles(),
      ])

    routes.value = Array.isArray(routeData) ? routeData : []
    quota.value = quotaData ?? null
    drivers.value = Array.isArray(driverData) ? driverData : []
    vehicles.value = Array.isArray(vehicleData) ? vehicleData : []
  } catch (err) {
    console.error(err)
    error.value = backendErrorMessage(
      err,
      'No fue posible cargar las rutas.'
    )
  } finally {
    loading.value = false
  }
}

// ============================================================
// CREATE ROUTE
// ============================================================

function toggleDay(day) {
  if (form.operatingDays.includes(day)) {
    form.operatingDays = form.operatingDays.filter((item) => item !== day)
    return
  }
  form.operatingDays = [...form.operatingDays, day]
}

function setWeekdaysPreset(includeSaturday = false) {
  const base = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  form.operatingDays = includeSaturday ? [...base, 'Saturday'] : base
}

function resetForm() {
  form.name = ''
  form.direction = 'PICKUP'
  form.departureTime = '06:30'
  form.estimatedArrivalTime = '07:30'
  form.timeZoneId = 'America/Lima'
  form.operatingDays = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
  ]
  createError.value = ''
}

function openCreateModal() {
  resetForm()
  showCreateModal.value = true
}

function closeCreateModal() {
  if (creating.value) return
  showCreateModal.value = false
  createError.value = ''
}

async function submitRoute() {
  if (!canCreate.value) return

  creating.value = true
  createError.value = ''

  try {
    const route = await createRoute({
      ...form,
      operatingDays: [...form.operatingDays],
    })

    createdRoute.value = route
    showCreateModal.value = false

    await loadRoutes()
  } catch (err) {
    console.error(err)
    createError.value = backendErrorMessage(
      err,
      'No fue posible crear la ruta.'
    )
    createErrorKey.value++
  } finally {
    creating.value = false
  }
}

// ============================================================
// ASSIGN DRIVER + VEHICLE
// ============================================================

function openAssignment(routeItem) {
  assignmentRoute.value = routeItem
  selectedDriverId.value = routeItem.assignment?.driverId || ''
  selectedVehicleId.value = routeItem.assignment?.vehicleId || ''
  assignmentError.value = ''
  actionError.value = ''
  showAssignmentModal.value = true
}

function closeAssignment() {
  if (assigning.value) return
  showAssignmentModal.value = false
  assignmentRoute.value = null
  selectedDriverId.value = ''
  selectedVehicleId.value = ''
  assignmentError.value = ''
}

async function submitAssignment() {
  if (!assignmentRoute.value || !canAssign.value) {
    return
  }

  assigning.value = true
  assignmentError.value = ''

  try {
    await assignRouteResources(
      assignmentRoute.value.id,
      selectedDriverId.value,
      selectedVehicleId.value
    )

    showAssignmentModal.value = false
    assignmentRoute.value = null
    selectedDriverId.value = ''
    selectedVehicleId.value = ''

    await loadRoutes()
  } catch (err) {
    console.error(err)
    assignmentError.value = backendErrorMessage(
      err,
      'No fue posible asignar los recursos.'
    )
    assignmentErrorKey.value++
  } finally {
    assigning.value = false
  }
}

// ============================================================
// ACTIVATE ROUTE
// ============================================================

async function handleActivate(routeItem) {
  actionError.value = ''
  activatingRouteId.value = routeItem.id

  try {
    await activateRoute(routeItem.id)
    await loadRoutes()
  } catch (err) {
    console.error(err)
    actionError.value = backendErrorMessage(
      err,
      'No fue posible activar la ruta.'
    )
  } finally {
    activatingRouteId.value = null
  }
}

// ============================================================
// COPY CODE
// ============================================================

async function copyEnrollmentCode(code) {
  if (!code) return

  try {
    await navigator.clipboard.writeText(code)
    copiedCode.value = code

    window.setTimeout(() => {
      if (copiedCode.value === code) {
        copiedCode.value = ''
      }
    }, 1800)
  } catch (err) {
    console.error(err)
  }
}

onMounted(loadRoutes)
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

    <!-- ───────── HERO DISPATCH BANNER (With Animated Dual-Route Constellation) ───────── -->
    <section
      class="hero-banner reveal relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950 px-6 py-7 text-white shadow-[0_20px_50px_-15px_rgba(2,6,23,0.45)] sm:px-8 lg:px-10 lg:py-8"
      style="--d: 0ms"
    >
      <!-- Ambient glowing orbs -->
      <div class="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl"></div>

      <!-- Animated Fleet Dispatch Constellation -->
      <svg
        class="pointer-events-none absolute right-6 top-2 hidden h-36 w-[350px] opacity-90 lg:block xl:right-10"
        viewBox="0 0 350 135"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="adminRouteGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="50%" stop-color="#10b981" />
            <stop offset="100%" stop-color="#facc15" />
          </linearGradient>

          <linearGradient id="adminRouteGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#818cf8" stop-opacity="0.3" />
            <stop offset="100%" stop-color="#38bdf8" stop-opacity="0.7" />
          </linearGradient>

          <filter id="adminBeaconGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Secondary Dispatch Branch -->
        <path
          d="M 45 30 C 110 30, 130 50, 185 46 S 265 70, 320 62"
          stroke="url(#adminRouteGrad2)"
          stroke-width="1.8"
          stroke-dasharray="3 6"
          stroke-linecap="round"
        />

        <!-- Primary Route Track -->
        <path
          id="adminPrimaryPath"
          d="M 20 92 C 90 92, 115 28, 185 46 S 265 18, 325 18"
          stroke="rgba(255,255,255,0.14)"
          stroke-width="2.5"
          stroke-dasharray="4 7"
          stroke-linecap="round"
        />

        <!-- Animated Energy Stream -->
        <path
          d="M 20 92 C 90 92, 115 28, 185 46 S 265 18, 325 18"
          stroke="url(#adminRouteGrad1)"
          stroke-width="3"
          stroke-linecap="round"
          class="route-energy-stream"
        />

        <!-- Hub Nodes -->
        <g transform="translate(20, 92)">
          <circle r="10" fill="rgba(56, 189, 248, 0.2)" class="node-pulse-1" />
          <circle r="4.5" fill="#0f172a" stroke="#38bdf8" stroke-width="2.5" />
        </g>

        <g transform="translate(45, 30)">
          <circle r="3.5" fill="#0f172a" stroke="#818cf8" stroke-width="2" />
        </g>

        <g transform="translate(185, 46)">
          <circle r="12" fill="rgba(16, 185, 129, 0.22)" class="node-pulse-2" />
          <circle r="5" fill="#0f172a" stroke="#10b981" stroke-width="2.5" />
        </g>

        <g transform="translate(320, 62)">
          <circle r="3.5" fill="#0f172a" stroke="#38bdf8" stroke-width="2" />
        </g>

        <g transform="translate(325, 18)">
          <circle r="11" fill="rgba(250, 204, 21, 0.2)" class="node-pulse-1" />
          <circle r="5.5" fill="#0f172a" stroke="#facc15" stroke-width="2.5" />
        </g>

        <!-- Moving Dispatch Beacon -->
        <g>
          <circle r="11" fill="rgba(16, 185, 129, 0.28)" class="beacon-halo" />
          <circle r="5" fill="#10b981" stroke="#ffffff" stroke-width="2" filter="url(#adminBeaconGlow)" />
          <animateMotion
            dur="5.5s"
            repeatCount="indefinite"
            keyPoints="0;1;0"
            keyTimes="0;0.5;1"
            calcMode="spline"
            keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
          >
            <mpath href="#adminPrimaryPath" />
          </animateMotion>
        </g>
      </svg>

      <div class="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div class="max-w-xl">
          <div class="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-300">
            <Sparkles :size="12" class="text-emerald-400" />
            Consola de Administración
          </div>

          <h1 class="mt-3.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Rutas escolares
          </h1>

          <p class="mt-2 max-w-lg text-sm leading-relaxed text-slate-300/90 sm:text-base">
            Crea y administra las rutas de tu organización, asigna conductores y vehículos habilitados y comparte los códigos de inscripción.
          </p>
        </div>

        <!-- Flush Right Actions -->
        <div class="flex shrink-0 items-center gap-2.5 pt-2 lg:pt-8">
          <button
            type="button"
            class="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/25 ring-1 ring-white/20 transition-all duration-200 hover:-translate-y-0.5 hover:from-blue-500 hover:to-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 sm:text-sm"
            @click="openCreateModal"
          >
            <Plus :size="17" class="transition-transform duration-200 group-hover:rotate-90" />
            <span>Nueva ruta</span>
          </button>

          <button
            type="button"
            :disabled="loading"
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-300 ring-1 ring-white/10 backdrop-blur-xs transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            aria-label="Actualizar rutas"
            title="Actualizar rutas"
            @click="loadRoutes"
          >
            <RefreshCcw :size="16" :class="{ 'animate-spin': loading }" />
          </button>
        </div>
      </div>
    </section>

    <!-- ───────── PLAN QUOTA TELEMETRY BAR ───────── -->
    <section
      v-if="quota"
      class="reveal mt-6 overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs ring-1 ring-slate-900/[0.02]"
      style="--d: 80ms"
    >
      <div class="flex flex-col justify-between gap-5 p-5 sm:flex-row sm:items-center lg:px-7 lg:py-5">
        <div class="flex items-start gap-4 sm:items-center">
          <div class="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 ring-1 ring-blue-500/15">
            <Route :size="24" />
          </div>

          <div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-blue-700 ring-1 ring-blue-600/15">
                Plan {{ quota.planCode }}
              </span>
              <span class="text-xs font-medium text-slate-400">•</span>
              <span class="text-xs font-semibold text-slate-500">
                Capacidad de flota escolar
              </span>
            </div>

            <p class="mt-1 text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl">
              {{ quota.activeRoutes }}
              <span class="font-medium text-slate-400">de</span>
              {{ quota.maxActiveRoutes }}
              <span class="text-base font-bold text-slate-700">rutas activas</span>
            </p>
          </div>
        </div>

        <div class="flex items-center justify-between gap-4 border-t border-slate-100 pt-3 sm:border-t-0 sm:pt-0">
          <div class="text-left sm:text-right">
            <span class="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Disponibilidad
            </span>
            <strong class="text-sm font-bold text-emerald-600">
              {{ quota.remainingActiveRoutes }} rutas disponibles en el plan
            </strong>
          </div>

          <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 font-mono text-xs font-extrabold text-slate-700 ring-1 ring-slate-200/80">
            {{ quotaPercentage }}%
          </div>
        </div>
      </div>

      <div class="h-1.5 w-full bg-slate-100">
        <div
          class="h-full bg-gradient-to-r from-blue-600 via-sky-400 to-emerald-400 transition-all duration-500"
          :style="{ width: `${quotaPercentage}%` }"
        />
      </div>
    </section>

    <!-- ───────── NEWLY CREATED ROUTE HIGHLIGHT BANNER ───────── -->
    <Transition name="modal-fade">
      <section
        v-if="createdRoute"
        class="mt-6 overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/90 via-white to-teal-50/60 p-5 shadow-md ring-1 ring-emerald-500/15 sm:p-6"
      >
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-3.5">
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md shadow-emerald-500/25">
              <CheckCircle2 :size="20" />
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-base font-bold text-slate-900">
                  ¡Ruta creada correctamente!
                </h2>
                <span class="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                  Borrador
                </span>
              </div>

              <p class="mt-0.5 text-sm text-slate-600">
                <strong class="font-semibold text-slate-900">{{ createdRoute.name }}</strong> ya está disponible como borrador. Comparte este código con las familias o asigna sus recursos abajo:
              </p>

              <div
                v-if="createdRoute.enrollmentCode"
                class="mt-4 flex flex-col gap-3 rounded-2xl border border-emerald-200/90 bg-white p-3.5 shadow-2xs sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div>
                  <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Código de inscripción
                  </p>
                  <p class="mt-0.5 font-mono text-xl font-black tracking-widest text-slate-900">
                    {{ createdRoute.enrollmentCode }}
                  </p>
                </div>

                <button
                  type="button"
                  class="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all"
                  :class="
                    copiedCode === createdRoute.enrollmentCode
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-900 text-white hover:bg-blue-600'
                  "
                  @click="copyEnrollmentCode(createdRoute.enrollmentCode)"
                >
                  <CheckCircle2
                    v-if="copiedCode === createdRoute.enrollmentCode"
                    :size="15"
                  />
                  <Copy v-else :size="15" />
                  <span>
                    {{
                      copiedCode === createdRoute.enrollmentCode
                        ? '¡Código copiado!'
                        : 'Copiar código'
                    }}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Cerrar aviso"
            @click="createdRoute = null"
          >
            <X :size="18" />
          </button>
        </div>
      </section>
    </Transition>

    <!-- ───────── ERROR / ACTION ERROR BANNER ───────── -->
    <div
      v-if="error || actionError"
      role="alert"
      class="shake mt-6 flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50/90 p-4 shadow-xs"
    >
      <div class="flex gap-3">
        <TriangleAlert :size="19" class="mt-0.5 shrink-0 text-red-600" />
        <div>
          <p class="text-sm font-semibold text-red-800">No se pudo completar la operación</p>
          <p class="mt-0.5 text-sm text-red-700">{{ error || actionError }}</p>
        </div>
      </div>

      <button
        type="button"
        class="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
        @click="error ? loadRoutes() : (actionError = '')"
      >
        <RefreshCcw v-if="error" :size="14" />
        <X v-else :size="14" />
        <span>{{ error ? 'Reintentar' : 'Cerrar' }}</span>
      </button>
    </div>

    <!-- ───────── LOADING SKELETONS ───────── -->
    <div
      v-if="loading"
      class="mt-7 grid gap-5 xl:grid-cols-2"
    >
      <div
        v-for="index in 4"
        :key="index"
        class="h-96 animate-pulse rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3.5">
            <div class="h-12 w-12 rounded-2xl bg-slate-100"></div>
            <div class="space-y-2">
              <div class="h-4 w-40 rounded bg-slate-100"></div>
              <div class="h-3 w-24 rounded bg-slate-100"></div>
            </div>
          </div>
          <div class="h-6 w-20 rounded-full bg-slate-100"></div>
        </div>
        <div class="mt-6 grid grid-cols-2 gap-3">
          <div class="h-20 rounded-2xl bg-slate-100"></div>
          <div class="h-20 rounded-2xl bg-slate-100"></div>
        </div>
        <div class="mt-4 h-32 rounded-2xl bg-slate-100"></div>
      </div>
    </div>

    <!-- ───────── EMPTY STATE ───────── -->
    <section
      v-else-if="routes.length === 0"
      class="reveal mt-7 relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white px-6 py-16 text-center shadow-xs"
      style="--d: 140ms"
    >
      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 ring-1 ring-blue-500/15">
        <BusFront :size="28" />
      </div>

      <h2 class="mt-4 text-lg font-bold text-slate-900">
        Aún no hay rutas escolares
      </h2>

      <p class="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-slate-500">
        Crea la primera ruta de tu organización para generar un código de inscripción y asignar conductor y unidad.
      </p>

      <button
        type="button"
        class="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-blue-600"
        @click="openCreateModal"
      >
        <Plus :size="17" />
        Crear primera ruta
      </button>
    </section>

    <!-- ───────── ROUTES GRID ───────── -->
    <section
      v-else
      class="reveal mt-7 grid gap-5 xl:grid-cols-2"
      style="--d: 140ms"
    >
      <article
        v-for="routeItem in routes"
        :key="routeItem.id"
        class="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs ring-1 ring-slate-900/[0.02] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300/80 hover:shadow-lg"
      >
        <!-- Status-Colored Top Accent Strip -->
        <div
          class="h-1.5 w-full bg-gradient-to-r"
          :class="topStripClass(routeItem.status)"
        ></div>

        <div class="flex flex-1 flex-col justify-between p-5 sm:p-6">
          <div>
            <!-- Card Header -->
            <div class="flex items-start justify-between gap-4">
              <div class="flex min-w-0 items-center gap-3.5">
                <div
                  class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-600/20"
                >
                  <BusFront :size="21" />
                </div>

                <div class="min-w-0">
                  <h2 class="truncate text-lg font-bold tracking-tight text-slate-900">
                    {{ routeItem.name }}
                  </h2>

                  <p class="mt-0.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <Route :size="13" class="text-blue-600" />
                    <span>{{ directionLabel(routeItem.direction) }}</span>
                  </p>
                </div>
              </div>

              <span
                class="shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ring-1"
                :class="statusClasses(routeItem.status)"
              >
                {{ statusLabel(routeItem.status) }}
              </span>
            </div>

            <!-- Metrics Grid: Horario & Estudiantes -->
            <div class="mt-5 grid gap-3 sm:grid-cols-2">
              <div class="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5">
                <div class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <Clock3 :size="14" class="text-blue-600" />
                  <span>Horario programado</span>
                </div>

                <div class="mt-1.5 flex items-center gap-2 font-mono text-sm font-bold text-slate-900">
                  <span>{{ formatTime(routeItem.schedule?.departureTime) }}</span>
                  <ArrowRight :size="14" class="text-slate-400" />
                  <span class="text-emerald-700">{{ formatTime(routeItem.schedule?.estimatedArrivalTime) }}</span>
                </div>
              </div>

              <div class="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5">
                <div class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <Users :size="14" class="text-emerald-600" />
                  <span>Estudiantes inscritos</span>
                </div>

                <p class="mt-1.5 text-sm font-bold text-slate-900">
                  {{ routeItem.studentCount ?? 0 }}
                  <span class="text-xs font-normal text-slate-500">estudiantes</span>
                </p>
              </div>
            </div>

            <!-- Operating Days Pills -->
            <div class="mt-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5">
              <div class="flex items-center justify-between gap-2">
                <div class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <CalendarDays :size="14" class="text-indigo-600" />
                  <span>Días de operación</span>
                </div>
                <span class="text-[11px] font-semibold text-slate-500">
                  {{ formatDays(routeItem.schedule?.operatingDays) || 'No definidos' }}
                </span>
              </div>

              <div class="mt-2.5 grid grid-cols-7 gap-1.5">
                <span
                  v-for="day in days"
                  :key="day.value"
                  class="flex items-center justify-center rounded-lg py-1 text-[11px] font-bold transition-colors"
                  :class="
                    isDayActive(routeItem, day.value)
                      ? 'bg-blue-600/10 text-blue-700 ring-1 ring-blue-600/20'
                      : 'bg-slate-200/50 text-slate-400'
                  "
                >
                  {{ day.label }}
                </span>
              </div>
            </div>

            <!-- Ticket-Style Enrollment Code Box -->
            <div class="mt-4">
              <div class="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-3">
                <div class="min-w-0">
                  <p class="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    Código de inscripción
                  </p>
                  <p class="mt-0.5 truncate font-mono text-base font-black tracking-widest text-slate-900 sm:text-lg">
                    {{ routeItem.enrollmentCode || 'No disponible' }}
                  </p>
                </div>

                <button
                  v-if="routeItem.enrollmentCode"
                  type="button"
                  class="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all"
                  :class="
                    copiedCode === routeItem.enrollmentCode
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'border border-slate-200/90 bg-white text-slate-700 shadow-2xs hover:border-blue-300 hover:text-blue-600'
                  "
                  @click="copyEnrollmentCode(routeItem.enrollmentCode)"
                >
                  <CheckCircle2
                    v-if="copiedCode === routeItem.enrollmentCode"
                    :size="14"
                  />
                  <Copy v-else :size="14" />
                  <span>
                    {{
                      copiedCode === routeItem.enrollmentCode
                        ? 'Copiado'
                        : 'Copiar'
                    }}
                  </span>
                </button>
              </div>
            </div>

            <!-- ASSIGNED RESOURCES BOX -->
            <div
              v-if="routeItem.assignment"
              class="mt-4 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/40 p-4"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  <ShieldCheck :size="14" class="text-emerald-600" />
                  Recursos asignados
                </span>

                <button
                  v-if="routeItem.status !== 'ACTIVE'"
                  type="button"
                  class="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold text-slate-500 transition hover:bg-slate-100 hover:text-blue-600"
                  @click="openAssignment(routeItem)"
                >
                  <Settings2 :size="12" />
                  Cambiar
                </button>
              </div>

              <div class="mt-3 grid gap-2 sm:grid-cols-2">
                <div class="flex items-center gap-2.5 rounded-xl bg-white p-2.5 ring-1 ring-emerald-500/15">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <UserCheck :size="15" />
                  </div>
                  <div class="min-w-0">
                    <span class="block text-[10px] font-bold uppercase text-slate-400">Conductor</span>
                    <p class="truncate text-xs font-bold text-slate-800">
                      {{ driverName(routeItem.assignment.driverId) }}
                    </p>
                  </div>
                </div>

                <div class="flex items-center gap-2.5 rounded-xl bg-white p-2.5 ring-1 ring-emerald-500/15">
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <BusFront :size="15" />
                  </div>
                  <div class="min-w-0">
                    <span class="block text-[10px] font-bold uppercase text-slate-400">Vehículo</span>
                    <p class="truncate text-xs font-bold text-slate-800">
                      {{ vehicleName(routeItem.assignment.vehicleId) }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- ROUTE FOOTER & ACTION BUTTONS (ASIGNAR / ACTIVAR / ACTIVA) -->
          <div class="mt-5 flex flex-col gap-3.5 border-t border-slate-100 pt-4">
            <div class="flex items-center justify-between text-xs font-medium text-slate-400">
              <span class="inline-flex items-center gap-1.5">
                <MapPin :size="13" class="text-slate-400" />
                {{ routeItem.stops?.length ?? 0 }} paradas registradas
              </span>

              <span
                class="inline-flex items-center gap-1.5"
                :class="routeItem.assignment ? 'text-emerald-600 font-semibold' : 'text-slate-400'"
              >
                <span
                  class="h-1.5 w-1.5 rounded-full"
                  :class="routeItem.assignment ? 'bg-emerald-500' : 'bg-slate-300'"
                ></span>
                {{
                  routeItem.assignment
                    ? 'Recursos listos'
                    : 'Sin conductor ni vehículo'
                }}
              </span>
            </div>

            <!-- 1. ASIGNAR RECURSOS BUTTON -->
            <button
              v-if="!routeItem.assignment && routeItem.status !== 'ACTIVE'"
              type="button"
              class="group/btn inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-xs font-bold text-white shadow-md shadow-slate-900/10 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-600 hover:shadow-blue-600/20 sm:text-sm"
              @click="openAssignment(routeItem)"
            >
              <UserCheck :size="16" class="text-sky-300 transition-colors group-hover/btn:text-white" />
              <span>Asignar recursos</span>
              <ArrowRight :size="15" class="transition-transform duration-200 group-hover/btn:translate-x-0.5" />
            </button>

            <!-- 2. ACTIVAR RUTA BUTTON -->
            <button
              v-else-if="routeItem.assignment && routeItem.status === 'DRAFT'"
              type="button"
              :disabled="activatingRouteId === routeItem.id"
              class="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 py-3 text-xs font-bold text-white shadow-md shadow-emerald-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:from-emerald-500 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
              @click="handleActivate(routeItem)"
            >
              <LoaderCircle
                v-if="activatingRouteId === routeItem.id"
                :size="16"
                class="animate-spin"
              />
              <Power v-else :size="16" />
              <span>
                {{
                  activatingRouteId === routeItem.id
                    ? 'Activando ruta...'
                    : 'Activar ruta'
                }}
              </span>
            </button>

            <!-- 3. RUTA ACTIVA BADGE -->
            <div
              v-else-if="routeItem.status === 'ACTIVE'"
              class="flex items-center justify-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/80 py-2.5 text-xs font-bold text-emerald-700 sm:text-sm"
            >
              <CheckCircle2 :size="16" class="text-emerald-600" />
              <span>Ruta activa en operación</span>
            </div>
          </div>
        </div>
      </article>
    </section>

    <!-- ───────── MODAL 1: ASIGNAR RECURSOS (DRIVER + VEHICLE) ───────── -->
    <Transition name="modal-fade">
      <div
        v-if="showAssignmentModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-modal-title"
        @click.self="closeAssignment"
      >
        <div class="modal-card relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl">
          <!-- Top Gradient Accent Strip -->
          <div class="h-1.5 w-full bg-gradient-to-r from-blue-600 via-sky-400 to-emerald-400"></div>

          <!-- Modal Header -->
          <div class="flex items-start justify-between border-b border-slate-100 px-6 py-4 sm:px-7">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-500/15">
                <UserCheck :size="20" />
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                  Recursos operativos
                </p>
                <h2 id="assign-modal-title" class="text-lg font-bold tracking-tight text-slate-900">
                  Asignar recursos
                </h2>
                <p class="text-xs font-medium text-slate-500">
                  Ruta: <strong class="text-slate-800">{{ assignmentRoute?.name }}</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Cerrar ventana"
              @click="closeAssignment"
            >
              <X :size="18" />
            </button>
          </div>

          <!-- Modal Body -->
          <div class="space-y-5 px-6 py-5 sm:px-7">
            <!-- Assignment Error Banner -->
            <div
              v-if="assignmentError"
              :key="assignmentErrorKey"
              role="alert"
              class="shake flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-xs font-medium text-red-800 sm:text-sm"
            >
              <TriangleAlert :size="17" class="mt-0.5 shrink-0 text-red-600" />
              <span>{{ assignmentError }}</span>
            </div>

            <!-- Select Driver -->
            <div>
              <label for="select-driver" class="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Conductor verificado <strong class="text-red-500">*</strong>
              </label>

              <div class="relative mt-2">
                <select
                  id="select-driver"
                  v-model="selectedDriverId"
                  class="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/12"
                  @change="assignmentError = ''"
                >
                  <option value="" disabled>
                    Selecciona un conductor
                  </option>

                  <option
                    v-for="driver in verifiedDrivers"
                    :key="driver.id"
                    :value="driver.id"
                  >
                    {{ driver.firstName }} {{ driver.lastName }} — Lic. {{ driver.licenseCategory }}
                  </option>
                </select>
              </div>

              <p
                v-if="verifiedDrivers.length === 0"
                class="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-700"
              >
                <TriangleAlert :size="13" class="text-amber-600" />
                No hay conductores con estado verificado disponibles.
              </p>
            </div>

            <!-- Select Vehicle -->
            <div>
              <label for="select-vehicle" class="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Vehículo habilitado <strong class="text-red-500">*</strong>
              </label>

              <div class="relative mt-2">
                <select
                  id="select-vehicle"
                  v-model="selectedVehicleId"
                  class="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/12"
                  @change="assignmentError = ''"
                >
                  <option value="" disabled>
                    Selecciona un vehículo
                  </option>

                  <option
                    v-for="vehicle in enabledVehicles"
                    :key="vehicle.id"
                    :value="vehicle.id"
                  >
                    {{ vehicle.licensePlate }} — {{ vehicle.brand }} {{ vehicle.model }} ({{ vehicle.seatingCapacity }} asientos)
                  </option>
                </select>
              </div>

              <p
                v-if="enabledVehicles.length === 0"
                class="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber-700"
              >
                <TriangleAlert :size="13" class="text-amber-600" />
                No hay vehículos habilitados disponibles.
              </p>
            </div>

            <!-- Modal Footer Buttons -->
            <div class="flex gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                class="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 sm:text-sm"
                @click="closeAssignment"
              >
                Cancelar
              </button>

              <button
                type="button"
                :disabled="!canAssign"
                class="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-lg shadow-slate-900/15 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
                @click="submitAssignment"
              >
                <LoaderCircle v-if="assigning" :size="16" class="animate-spin" />
                <CheckCircle2 v-else :size="16" />
                <span>{{ assigning ? 'Asignando...' : 'Asignar recursos' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <!-- ───────── MODAL 2: CREAR RUTA ESCOLAR ───────── -->
    <Transition name="modal-fade">
      <div
        v-if="showCreateModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-route-title"
        @click.self="closeCreateModal"
      >
        <div class="modal-card relative max-h-[92dvh] w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl">
          <div class="h-1.5 w-full bg-gradient-to-r from-blue-600 via-sky-400 to-emerald-400"></div>

          <div class="flex items-start justify-between border-b border-slate-100 px-6 py-4 sm:px-7">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-500/15">
                <Route :size="20" />
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                  Nueva ruta
                </p>
                <h2 id="create-route-title" class="text-lg font-bold tracking-tight text-slate-900">
                  Crear ruta escolar
                </h2>
              </div>
            </div>

            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Cerrar ventana"
              @click="closeCreateModal"
            >
              <X :size="18" />
            </button>
          </div>

          <form
            class="max-h-[calc(92dvh-76px)] space-y-5 overflow-y-auto px-6 py-5 sm:px-7"
            @submit.prevent="submitRoute"
          >
            <div
              v-if="createError"
              :key="createErrorKey"
              role="alert"
              class="shake flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-xs font-medium text-red-800 sm:text-sm"
            >
              <TriangleAlert :size="17" class="mt-0.5 shrink-0 text-red-600" />
              <span>{{ createError }}</span>
            </div>

            <div>
              <label for="route-name" class="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Nombre de la ruta <strong class="text-red-500">*</strong>
              </label>
              <input
                id="route-name"
                v-model="form.name"
                type="text"
                required
                placeholder="Ej. Ruta San Borja - Mañana"
                class="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/12"
                @input="createError = ''"
              />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Sentido del recorrido
              </label>

              <div class="mt-2 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  class="relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all"
                  :class="
                    form.direction === 'PICKUP'
                      ? 'border-blue-600 bg-blue-50/60 shadow-2xs ring-2 ring-blue-600/15'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                  "
                  @click="form.direction = 'PICKUP'"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-bold text-slate-900">
                      Ida al colegio
                    </span>
                    <CheckCircle2
                      v-if="form.direction === 'PICKUP'"
                      :size="16"
                      class="text-blue-600"
                    />
                  </div>
                  <p class="mt-1 text-xs leading-relaxed text-slate-500">
                    Recoger estudiantes en sus paraderos y llevarlos al colegio.
                  </p>
                </button>

                <button
                  type="button"
                  class="relative flex flex-col justify-between rounded-2xl border p-4 text-left transition-all"
                  :class="
                    form.direction === 'RETURN'
                      ? 'border-blue-600 bg-blue-50/60 shadow-2xs ring-2 ring-blue-600/15'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                  "
                  @click="form.direction = 'RETURN'"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-sm font-bold text-slate-900">
                      Retorno a casa
                    </span>
                    <CheckCircle2
                      v-if="form.direction === 'RETURN'"
                      :size="16"
                      class="text-blue-600"
                    />
                  </div>
                  <p class="mt-1 text-xs leading-relaxed text-slate-500">
                    Recoger estudiantes a la salida del colegio y llevarlos a casa.
                  </p>
                </button>
              </div>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label for="departure-time" class="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Hora de salida
                </label>
                <input
                  id="departure-time"
                  v-model="form.departureTime"
                  type="time"
                  class="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/12"
                />
              </div>

              <div>
                <label for="arrival-time" class="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Llegada estimada
                </label>
                <input
                  id="arrival-time"
                  v-model="form.estimatedArrivalTime"
                  type="time"
                  class="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/12"
                />
              </div>
            </div>

            <div>
              <div class="flex flex-wrap items-center justify-between gap-2">
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Días de operación
                </label>

                <div class="flex items-center gap-1.5 text-[11px]">
                  <button
                    type="button"
                    class="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
                    @click="setWeekdaysPreset(false)"
                  >
                    Lun–Vie
                  </button>
                  <button
                    type="button"
                    class="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-600 transition hover:bg-blue-50 hover:text-blue-600"
                    @click="setWeekdaysPreset(true)"
                  >
                    Lun–Sáb
                  </button>
                </div>
              </div>

              <div class="mt-2 grid grid-cols-7 gap-2">
                <button
                  v-for="day in days"
                  :key="day.value"
                  type="button"
                  class="flex items-center justify-center rounded-xl border py-2.5 text-xs font-bold transition-all"
                  :class="
                    form.operatingDays.includes(day.value)
                      ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  "
                  @click="toggleDay(day.value)"
                >
                  {{ day.label }}
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
              <div class="flex items-center gap-2.5">
                <Globe :size="16" class="text-blue-600" />
                <div>
                  <p class="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Zona horaria configurada
                  </p>
                  <p class="text-xs font-bold text-slate-800">
                    {{ form.timeZoneId }} (Hora oficial de Perú)
                  </p>
                </div>
              </div>

              <span class="rounded-lg bg-white px-2.5 py-1 font-mono text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
                UTC-5
              </span>
            </div>

            <div class="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 sm:text-sm"
                @click="closeCreateModal"
              >
                Cancelar
              </button>

              <button
                type="submit"
                :disabled="!canCreate"
                class="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-slate-900/15 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm"
              >
                <LoaderCircle
                  v-if="creating"
                  :size="16"
                  class="animate-spin"
                />
                <Plus v-else :size="17" />
                <span>{{ creating ? 'Creando...' : 'Crear ruta' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

  </div>
</template>

<style scoped>
.hero-banner {
  background-image:
    radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom right, #020617, #0f172a 60%, #09152b);
  background-size: 26px 26px, 100% 100%;
}

/* Animated Route Stream & Pulsing Stop Nodes in Hero Banner */
.route-energy-stream {
  stroke-dasharray: 70 260;
  animation: streamFlow 3.2s linear infinite;
}

@keyframes streamFlow {
  from {
    stroke-dashoffset: 330;
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

.beacon-halo {
  transform-box: fill-box;
  transform-origin: center;
  animation: nodePulse 1.6s ease-out infinite;
}

@keyframes nodePulse {
  0% {
    transform: scale(0.4);
    opacity: 0.9;
  }
  100% {
    transform: scale(1.9);
    opacity: 0;
  }
}

/* Entrance & Modal Transitions */
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