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
  CheckCircle2,
  IdCard,
  Plus,
  RefreshCcw,
  ShieldCheck,
  UserRound,
  UserCheck,
  UserPlus,
  Phone,
  Calendar,
  Users,
  Sparkles,
  LoaderCircle,
  X,
} from 'lucide-vue-next'

import {
  getDrivers,
  getOrganizationUsers,
  getVehicles,
  registerDriver,
  registerVehicle,
  verifyDriver,
} from '@/modules/admin/services/adminService'

const users = ref([])
const drivers = ref([])
const vehicles = ref([])

const loading = ref(true)
const error = ref('')

const driverModal = ref(false)
const vehicleModal = ref(false)

const savingDriver = ref(false)
const savingVehicle = ref(false)
const verifyingId = ref(null)

const formError = ref('')
const formErrorKey = ref(0)

const driverForm = reactive({
  userId: '',
  firstName: '',
  lastName: '',
  documentNumber: '',
  licenseNumber: '',
  licenseCategory: 'A-IIB',
  licenseExpiresOn: '',
  phoneNumber: '',
})

const vehicleForm = reactive({
  licensePlate: '',
  seatingCapacity: 20,
  brand: '',
  model: '',
})

const driverAccounts = computed(() => {
  return users.value.filter((user) => {
    return String(user.roleTier).toUpperCase() === 'DRIVER'
  })
})

const registeredUserIds = computed(() => {
  return new Set(drivers.value.map((driver) => driver.userId))
})

const availableDriverAccounts = computed(() => {
  return driverAccounts.value.filter(
    (user) => !registeredUserIds.value.has(user.id)
  )
})

const verifiedDriversCount = computed(() => {
  return drivers.value.filter((d) => d.status === 'VERIFIED').length
})

const enabledVehiclesCount = computed(() => {
  return vehicles.value.filter(
    (v) => !v.status || v.status === 'ENABLED' || v.status === 'ACTIVO'
  ).length
})

function backendError(err, fallback) {
  return (
    err?.response?.data?.detail ||
    err?.response?.data?.title ||
    err?.response?.data?.message ||
    fallback
  )
}

function getInitials(firstName, lastName) {
  const f = firstName?.[0] ?? ''
  const l = lastName?.[0] ?? ''
  return `${f}${l}`.toUpperCase() || 'CD'
}

function driverStatusLabel(status) {
  const labels = {
    PENDING_VERIFICATION: 'Pendiente',
    VERIFIED: 'Verificado',
    SUSPENDED: 'Suspendido',
  }
  return labels[status] || status
}

function driverStatusClass(status) {
  if (status === 'VERIFIED') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
  }
  if (status === 'SUSPENDED') {
    return 'bg-red-50 text-red-700 ring-red-600/20'
  }
  return 'bg-amber-50 text-amber-700 ring-amber-600/20'
}

function vehicleStatusLabel(status) {
  const normalized = String(status ?? '').toUpperCase()
  if (normalized === 'ENABLED' || normalized === 'ACTIVE') return 'Habilitado'
  if (normalized === 'DISABLED' || normalized === 'INACTIVE') return 'Inactivo'
  if (normalized === 'MAINTENANCE') return 'Mantenimiento'
  return status || 'Habilitado'
}

function vehicleStatusClass(status) {
  const normalized = String(status ?? '').toUpperCase()
  if (normalized === 'DISABLED' || normalized === 'INACTIVE') {
    return 'bg-slate-100 text-slate-600 ring-slate-500/15'
  }
  if (normalized === 'MAINTENANCE') {
    return 'bg-amber-50 text-amber-700 ring-amber-600/20'
  }
  return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
}

async function loadData() {
  loading.value = true
  error.value = ''

  try {
    const [userData, driverData, vehicleData] = await Promise.all([
      getOrganizationUsers(),
      getDrivers(),
      getVehicles(),
    ])

    users.value = Array.isArray(userData) ? userData : []
    drivers.value = Array.isArray(driverData) ? driverData : []
    vehicles.value = Array.isArray(vehicleData) ? vehicleData : []
  } catch (err) {
    console.error(err)
    error.value = backendError(
      err,
      'No fue posible cargar los recursos operativos.'
    )
  } finally {
    loading.value = false
  }
}

function openDriverModal(user) {
  formError.value = ''

  driverForm.userId = user.id
  driverForm.firstName = user.firstName
  driverForm.lastName = user.lastName
  driverForm.documentNumber = ''
  driverForm.licenseNumber = ''
  driverForm.licenseCategory = 'A-IIB'
  driverForm.licenseExpiresOn = ''
  driverForm.phoneNumber = ''

  driverModal.value = true
}

function openVehicleModal() {
  formError.value = ''
  vehicleForm.licensePlate = ''
  vehicleForm.seatingCapacity = 20
  vehicleForm.brand = ''
  vehicleForm.model = ''
  vehicleModal.value = true
}

async function submitDriver() {
  savingDriver.value = true
  formError.value = ''

  try {
    await registerDriver({
      userId: driverForm.userId,
      firstName: driverForm.firstName,
      lastName: driverForm.lastName,
      documentNumber: driverForm.documentNumber.trim(),
      licenseNumber: driverForm.licenseNumber.trim().toUpperCase(),
      licenseCategory: driverForm.licenseCategory,
      licenseExpiresOn: driverForm.licenseExpiresOn,
      phoneNumber: driverForm.phoneNumber.trim(),
    })

    driverModal.value = false
    await loadData()
  } catch (err) {
    console.error(err)
    formError.value = backendError(
      err,
      'No fue posible registrar al conductor.'
    )
    formErrorKey.value++
  } finally {
    savingDriver.value = false
  }
}

async function handleVerify(driver) {
  if (verifyingId.value) return

  verifyingId.value = driver.id
  error.value = ''

  try {
    await verifyDriver(driver.id)
    await loadData()
  } catch (err) {
    console.error(err)
    error.value = backendError(
      err,
      'No fue posible verificar al conductor.'
    )
  } finally {
    verifyingId.value = null
  }
}

async function submitVehicle() {
  savingVehicle.value = true
  formError.value = ''

  try {
    await registerVehicle({
      licensePlate: vehicleForm.licensePlate.trim().toUpperCase(),
      seatingCapacity: Number(vehicleForm.seatingCapacity),
      brand: vehicleForm.brand.trim(),
      model: vehicleForm.model.trim(),
    })

    vehicleModal.value = false

    vehicleForm.licensePlate = ''
    vehicleForm.seatingCapacity = 20
    vehicleForm.brand = ''
    vehicleForm.model = ''

    await loadData()
  } catch (err) {
    console.error(err)
    formError.value = backendError(
      err,
      'No fue posible registrar el vehículo.'
    )
    formErrorKey.value++
  } finally {
    savingVehicle.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

    <!-- ───────── HERO BANNER: FLEET & DRIVER SYNCHRONIZATION ───────── -->
    <section
      class="hero-banner reveal relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950 px-6 py-7 text-white shadow-[0_20px_50px_-15px_rgba(2,6,23,0.45)] sm:px-8 lg:px-10 lg:py-8"
      style="--d: 0ms"
    >
      <!-- Ambient glowing orbs -->
      <div class="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl"></div>

      <!-- Animated Driver <-> Vehicle Sync Radar (Upper-Right Sky, Zero Button Collision) -->
      <svg
        class="pointer-events-none absolute right-6 top-2 hidden h-36 w-[350px] opacity-90 lg:block xl:right-10"
        viewBox="0 0 350 135"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="syncArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="50%" stop-color="#10b981" />
            <stop offset="100%" stop-color="#facc15" />
          </linearGradient>

          <filter id="syncGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Connecting Telemetry Wave Between Driver Node & Bus Node -->
        <path
          id="syncLinkPath"
          d="M 55 72 C 125 18, 225 18, 295 62"
          stroke="rgba(255,255,255,0.14)"
          stroke-width="2.5"
          stroke-dasharray="4 7"
          stroke-linecap="round"
        />

        <path
          d="M 55 72 C 125 18, 225 18, 295 62"
          stroke="url(#syncArcGrad)"
          stroke-width="3"
          stroke-linecap="round"
          class="route-energy-stream"
        />

        <!-- Left Node: Verified Driver Hub -->
        <g transform="translate(55, 72)">
          <circle r="18" fill="rgba(56, 189, 248, 0.14)" class="node-pulse-1" />
          <circle r="12" fill="#0f172a" stroke="#38bdf8" stroke-width="2" />
          <circle cx="0" cy="-2.5" r="3" fill="#bae6fd" />
          <path d="M -5.5 6 C -5.5 1.5, 5.5 1.5, 5.5 6" stroke="#bae6fd" stroke-width="1.8" stroke-linecap="round" fill="none" />
        </g>

        <!-- Center Verification Shield Node -->
        <g transform="translate(175, 32)">
          <circle r="13" fill="rgba(16, 185, 129, 0.2)" class="node-pulse-2" />
          <circle r="7" fill="#0f172a" stroke="#10b981" stroke-width="2.2" />
          <circle r="2.5" fill="#34d399" />
        </g>

        <!-- Right Node: Enabled School Bus Unit -->
        <g transform="translate(295, 62)">
          <circle r="18" fill="rgba(250, 204, 21, 0.14)" class="node-pulse-1" />
          <circle r="12" fill="#0f172a" stroke="#facc15" stroke-width="2" />
          <rect x="-6" y="-4" width="12" height="8" rx="2" fill="#fde047" />
          <circle cx="-3.5" cy="5.5" r="1.5" fill="#94a3b8" />
          <circle cx="3.5" cy="5.5" r="1.5" fill="#94a3b8" />
        </g>

        <!-- Travelling Pairing Packet -->
        <g>
          <circle r="9" fill="rgba(16, 185, 129, 0.28)" class="beacon-halo" />
          <circle r="4.5" fill="#10b981" stroke="#ffffff" stroke-width="2" filter="url(#syncGlow)" />
          <animateMotion
            dur="4.8s"
            repeatCount="indefinite"
            keyPoints="0;1;0"
            keyTimes="0;0.5;1"
            calcMode="spline"
            keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
          >
            <mpath href="#syncLinkPath" />
          </animateMotion>
        </g>
      </svg>

      <div class="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div class="max-w-xl">
          <div class="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-300">
            <Sparkles :size="12" class="text-emerald-400" />
            Operación y Flota
          </div>

          <h1 class="mt-3.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Conductores y vehículos
          </h1>

          <p class="mt-2 max-w-lg text-sm leading-relaxed text-slate-300/90 sm:text-base">
            Gestiona y verifica a los conductores de tu institución y registra las unidades autorizadas para operar las rutas escolares.
          </p>
        </div>

        <!-- Flush Right Actions -->
        <div class="flex shrink-0 items-center gap-2.5 pt-2 lg:pt-8">
          <button
            type="button"
            class="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/25 ring-1 ring-white/20 transition-all duration-200 hover:-translate-y-0.5 hover:from-blue-500 hover:to-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 sm:text-sm"
            @click="openVehicleModal"
          >
            <Plus :size="17" class="transition-transform duration-200 group-hover:rotate-90" />
            <span>Registrar vehículo</span>
          </button>

          <button
            type="button"
            :disabled="loading"
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-300 ring-1 ring-white/10 backdrop-blur-xs transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            aria-label="Actualizar recursos"
            title="Actualizar recursos"
            @click="loadData"
          >
            <RefreshCcw :size="16" :class="{ 'animate-spin': loading }" />
          </button>
        </div>
      </div>
    </section>

    <!-- ───────── ERROR BANNER ───────── -->
    <div
      v-if="error"
      role="alert"
      class="shake mt-6 flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50/90 p-4 shadow-xs"
    >
      <div class="flex gap-3">
        <TriangleAlert :size="19" class="mt-0.5 shrink-0 text-red-600" />
        <div>
          <p class="text-sm font-semibold text-red-800">No pudimos procesar la solicitud</p>
          <p class="mt-0.5 text-sm text-red-700">{{ error }}</p>
        </div>
      </div>

      <button
        type="button"
        class="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
        @click="loadData"
      >
        <RefreshCcw :size="14" />
        Reintentar
      </button>
    </div>

    <!-- ───────── LOADING SKELETONS ───────── -->
    <div v-if="loading" class="mt-7 space-y-6">
      <div class="grid gap-4 sm:grid-cols-3">
        <div
          v-for="i in 3"
          :key="i"
          class="h-24 animate-pulse rounded-2xl border border-slate-200/80 bg-white p-5"
        />
      </div>
      <div class="grid gap-6 xl:grid-cols-2">
        <div class="h-96 animate-pulse rounded-3xl border border-slate-200/80 bg-white p-6" />
        <div class="h-96 animate-pulse rounded-3xl border border-slate-200/80 bg-white p-6" />
      </div>
    </div>

    <!-- ───────── LOADED RESOURCES CONTENT ───────── -->
    <template v-else>
      <!-- 3-Pillar Summary Strip -->
      <section class="reveal mt-6 grid gap-4 sm:grid-cols-3" style="--d: 80ms">
        <div class="flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-xs">
          <div class="flex items-center gap-3.5">
            <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/15">
              <UserCheck :size="20" />
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Verificados</p>
              <p class="mt-0.5 text-sm font-bold text-slate-800">Conductores listos</p>
            </div>
          </div>
          <span class="text-2xl font-extrabold text-slate-900">{{ verifiedDriversCount }}</span>
        </div>

        <div class="flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-xs">
          <div class="flex items-center gap-3.5">
            <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 ring-1 ring-amber-500/15">
              <UserPlus :size="20" />
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Por vincular</p>
              <p class="mt-0.5 text-sm font-bold text-slate-800">Cuentas DRIVER</p>
            </div>
          </div>
          <span class="text-2xl font-extrabold text-amber-600">{{ availableDriverAccounts.length }}</span>
        </div>

        <div class="flex items-center justify-between rounded-2xl border border-slate-200/90 bg-white px-5 py-4 shadow-xs">
          <div class="flex items-center gap-3.5">
            <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-500/15">
              <BusFront :size="20" />
            </div>
            <div>
              <p class="text-xs font-bold uppercase tracking-wider text-slate-400">Flota activa</p>
              <p class="mt-0.5 text-sm font-bold text-slate-800">Vehículos habilitados</p>
            </div>
          </div>
          <span class="text-2xl font-extrabold text-slate-900">{{ enabledVehiclesCount }}</span>
        </div>
      </section>

      <!-- ───────── TWO-COLUMN MAIN WORKSPACE ───────── -->
      <div class="reveal mt-6 grid items-start gap-6 xl:grid-cols-2" style="--d: 140ms">

        <!-- COLUMN 1: DRIVERS & ONBOARDING -->
        <section class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs ring-1 ring-slate-900/[0.02]">
          <div class="h-1.5 w-full bg-gradient-to-r from-blue-600 via-sky-400 to-emerald-400"></div>

          <div class="p-5 sm:p-6">
            <div class="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div class="flex items-center gap-3">
                <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-500/15">
                  <UserRound :size="21" />
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h2 class="text-lg font-bold tracking-tight text-slate-900">
                      Conductores
                    </h2>
                    <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                      {{ drivers.length }}
                    </span>
                  </div>
                  <p class="mt-0.5 text-xs text-slate-500">
                    Solo conductores con estado verificado pueden ser asignados a rutas.
                  </p>
                </div>
              </div>
            </div>

            <!-- Registered Drivers List -->
            <div v-if="drivers.length" class="mt-5 space-y-3">
              <article
                v-for="driver in drivers"
                :key="driver.id"
                class="group rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 transition-all hover:border-slate-300 hover:bg-white hover:shadow-xs"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="flex min-w-0 items-center gap-3.5">
                    <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 text-xs font-bold text-white shadow-xs">
                      {{ getInitials(driver.firstName, driver.lastName) }}
                    </div>

                    <div class="min-w-0">
                      <p class="truncate text-sm font-bold text-slate-900 sm:text-base">
                        {{ driver.firstName }} {{ driver.lastName }}
                      </p>

                      <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span class="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 font-mono text-[11px] font-bold text-slate-700 ring-1 ring-slate-200/90">
                          <IdCard :size="12" class="text-blue-600" />
                          {{ driver.licenseCategory }} · {{ driver.licenseNumber }}
                        </span>

                        <span
                          v-if="driver.documentNumber"
                          class="text-[11px] font-medium text-slate-400"
                        >
                          DNI {{ driver.documentNumber }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span
                    class="shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ring-1"
                    :class="driverStatusClass(driver.status)"
                  >
                    {{ driverStatusLabel(driver.status) }}
                  </span>
                </div>

                <!-- Verify Action Button for Pending Drivers -->
                <div
                  v-if="driver.status === 'PENDING_VERIFICATION'"
                  class="mt-4 flex items-center justify-between gap-3 border-t border-slate-200/60 pt-3"
                >
                  <span class="text-[11px] font-medium text-amber-700">
                    Revisa su licencia antes de habilitarlo
                  </span>

                  <button
                    type="button"
                    :disabled="verifyingId === driver.id"
                    class="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-60"
                    @click="handleVerify(driver)"
                  >
                    <LoaderCircle
                      v-if="verifyingId === driver.id"
                      :size="14"
                      class="animate-spin"
                    />
                    <ShieldCheck v-else :size="15" />
                    <span>
                      {{ verifyingId === driver.id ? 'Verificando...' : 'Verificar conductor' }}
                    </span>
                  </button>
                </div>
              </article>
            </div>

            <!-- Empty Drivers State -->
            <div
              v-else
              class="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center"
            >
              <div class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <UserRound :size="22" />
              </div>
              <p class="mt-3 text-sm font-bold text-slate-800">
                Aún no hay conductores con perfil registrado
              </p>
              <p class="mx-auto mt-1 max-w-xs text-xs text-slate-500">
                Selecciona una cuenta DRIVER disponible abajo para completar sus datos de licencia.
              </p>
            </div>

            <!-- Available DRIVER User Accounts Queue -->
            <div
              v-if="availableDriverAccounts.length"
              class="mt-6 border-t border-slate-100 pt-5"
            >
              <div class="flex items-center justify-between">
                <p class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600">
                  <span class="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                  Cuentas DRIVER disponibles ({{ availableDriverAccounts.length }})
                </p>
                <span class="text-[11px] text-slate-400">Pendientes de ficha</span>
              </div>

              <div class="mt-3 space-y-2.5">
                <div
                  v-for="user in availableDriverAccounts"
                  :key="user.id"
                  class="flex items-center justify-between gap-3 rounded-2xl border border-blue-200/60 bg-blue-50/40 p-3.5 transition hover:border-blue-300 hover:bg-blue-50/70"
                >
                  <div class="flex min-w-0 items-center gap-3">
                    <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600/10 text-xs font-bold text-blue-700 ring-1 ring-blue-600/20">
                      {{ getInitials(user.firstName, user.lastName) }}
                    </div>
                    <div class="min-w-0">
                      <p class="truncate text-sm font-bold text-slate-900">
                        {{ user.firstName }} {{ user.lastName }}
                      </p>
                      <p class="truncate text-xs text-slate-500">
                        {{ user.email }}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    class="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-blue-600"
                    @click="openDriverModal(user)"
                  >
                    <IdCard :size="14" />
                    <span>Completar perfil</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- COLUMN 2: VEHICLES FLEET -->
        <section class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs ring-1 ring-slate-900/[0.02]">
          <div class="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-400"></div>

          <div class="p-5 sm:p-6">
            <div class="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div class="flex items-center gap-3">
                <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/15">
                  <BusFront :size="21" />
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <h2 class="text-lg font-bold tracking-tight text-slate-900">
                      Vehículos
                    </h2>
                    <span class="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                      {{ vehicles.length }}
                    </span>
                  </div>
                  <p class="mt-0.5 text-xs text-slate-500">
                    Flota disponible para ser asignada a las rutas escolares.
                  </p>
                </div>
              </div>

              <button
                type="button"
                class="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600 ring-1 ring-blue-500/15 transition hover:bg-blue-600 hover:text-white"
                @click="openVehicleModal"
              >
                <Plus :size="15" />
                <span>Vehículo</span>
              </button>
            </div>

            <!-- Vehicles List -->
            <div v-if="vehicles.length" class="mt-5 space-y-3">
              <article
                v-for="vehicle in vehicles"
                :key="vehicle.id"
                class="group flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4 transition-all hover:border-slate-300 hover:bg-white hover:shadow-xs"
              >
                <div class="flex min-w-0 items-center gap-3.5">
                  <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-sm shadow-blue-600/20">
                    <BusFront :size="20" />
                  </div>

                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <!-- License Plate Badge -->
                      <span class="rounded-lg border border-slate-300 bg-white px-2.5 py-0.5 font-mono text-sm font-black tracking-wider text-slate-900 shadow-2xs">
                        {{ vehicle.licensePlate }}
                      </span>

                      <span class="truncate text-sm font-bold text-slate-800">
                        {{ vehicle.brand }} {{ vehicle.model }}
                      </span>
                    </div>

                    <div class="mt-1.5 flex items-center gap-2 text-xs font-medium text-slate-500">
                      <Users :size="13" class="text-emerald-600" />
                      <span>Capacidad: <strong class="text-slate-700">{{ vehicle.seatingCapacity }} asientos</strong></span>
                    </div>
                  </div>
                </div>

                <span
                  class="shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ring-1"
                  :class="vehicleStatusClass(vehicle.status)"
                >
                  {{ vehicleStatusLabel(vehicle.status) }}
                </span>
              </article>
            </div>

            <!-- Empty Vehicles State -->
            <div
              v-else
              class="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-10 text-center"
            >
              <div class="mx-auto flex h-13 w-13 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <BusFront :size="24" />
              </div>

              <p class="mt-3 text-sm font-bold text-slate-900">
                Aún no hay vehículos registrados
              </p>

              <p class="mx-auto mt-1 max-w-xs text-xs text-slate-500">
                Registra las unidades de transporte indicando su placa, marca, modelo y capacidad de asientos.
              </p>

              <button
                type="button"
                class="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-blue-600"
                @click="openVehicleModal"
              >
                <Plus :size="15" />
                Registrar primer vehículo
              </button>
            </div>
          </div>
        </section>

      </div>
    </template>

    <!-- ───────── MODAL 1: COMPLETAR PERFIL DE CONDUCTOR ───────── -->
    <Transition name="modal-fade">
      <div
        v-if="driverModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="driver-modal-title"
        @click.self="driverModal = false"
      >
        <div class="modal-card relative max-h-[92dvh] w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl">
          <!-- Top Gradient Accent Strip -->
          <div class="h-1.5 w-full bg-gradient-to-r from-blue-600 via-sky-400 to-emerald-400"></div>

          <!-- Modal Header -->
          <div class="flex items-start justify-between border-b border-slate-100 px-6 py-4 sm:px-7">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-500/15">
                <IdCard :size="20" />
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-widest text-blue-600">
                  Perfil de conductor
                </p>
                <h2 id="driver-modal-title" class="text-lg font-bold tracking-tight text-slate-900">
                  {{ driverForm.firstName }} {{ driverForm.lastName }}
                </h2>
              </div>
            </div>

            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Cerrar ventana"
              @click="driverModal = false"
            >
              <X :size="18" />
            </button>
          </div>

          <!-- Modal Form Body -->
          <form
            class="max-h-[calc(92dvh-76px)] space-y-4 overflow-y-auto px-6 py-5 sm:px-7"
            @submit.prevent="submitDriver"
          >
            <!-- Error Banner -->
            <div
              v-if="formError"
              :key="formErrorKey"
              role="alert"
              class="shake flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-xs font-medium text-red-800 sm:text-sm"
            >
              <TriangleAlert :size="17" class="mt-0.5 shrink-0 text-red-600" />
              <span>{{ formError }}</span>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <label class="field">
                <span>DNI / Documento <strong class="text-red-500">*</strong></span>
                <input
                  v-model="driverForm.documentNumber"
                  required
                  placeholder="Ej. 72849102"
                  @input="formError = ''"
                />
              </label>

              <label class="field">
                <span>Teléfono móvil <strong class="text-red-500">*</strong></span>
                <input
                  v-model="driverForm.phoneNumber"
                  required
                  placeholder="+51987654321"
                  @input="formError = ''"
                />
              </label>

              <label class="field">
                <span>Número de licencia <strong class="text-red-500">*</strong></span>
                <input
                  v-model="driverForm.licenseNumber"
                  required
                  placeholder="Ej. Q72849102"
                  class="uppercase"
                  @input="formError = ''"
                />
              </label>

              <label class="field">
                <span>Categoría MTC <strong class="text-red-500">*</strong></span>
                <select v-model="driverForm.licenseCategory">
                  <option>A-I</option>
                  <option>A-IIA</option>
                  <option>A-IIB</option>
                  <option>A-IIIA</option>
                  <option>A-IIIB</option>
                  <option>A-IIIC</option>
                </select>
              </label>

              <label class="field sm:col-span-2">
                <span>Fecha de vencimiento de licencia <strong class="text-red-500">*</strong></span>
                <input
                  v-model="driverForm.licenseExpiresOn"
                  required
                  type="date"
                  @input="formError = ''"
                />
              </label>
            </div>

            <div class="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 sm:text-sm"
                @click="driverModal = false"
              >
                Cancelar
              </button>

              <button
                type="submit"
                :disabled="savingDriver"
                class="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-slate-900/15 transition hover:bg-blue-600 disabled:opacity-60 sm:text-sm"
              >
                <LoaderCircle v-if="savingDriver" :size="16" class="animate-spin" />
                <CheckCircle2 v-else :size="16" />
                <span>
                  {{ savingDriver ? 'Guardando...' : 'Registrar conductor' }}
                </span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- ───────── MODAL 2: REGISTRAR VEHÍCULO ───────── -->
    <Transition name="modal-fade">
      <div
        v-if="vehicleModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vehicle-modal-title"
        @click.self="vehicleModal = false"
      >
        <div class="modal-card relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl">
          <!-- Top Gradient Accent Strip -->
          <div class="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-600"></div>

          <!-- Modal Header -->
          <div class="flex items-start justify-between border-b border-slate-100 px-6 py-4 sm:px-7">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/15">
                <BusFront :size="20" />
              </div>
              <div>
                <p class="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                  Flota escolar
                </p>
                <h2 id="vehicle-modal-title" class="text-lg font-bold tracking-tight text-slate-900">
                  Registrar vehículo
                </h2>
              </div>
            </div>

            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Cerrar ventana"
              @click="vehicleModal = false"
            >
              <X :size="18" />
            </button>
          </div>

          <!-- Modal Form Body -->
          <form
            class="space-y-4 px-6 py-5 sm:px-7"
            @submit.prevent="submitVehicle"
          >
            <!-- Error Banner -->
            <div
              v-if="formError"
              :key="formErrorKey"
              role="alert"
              class="shake flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-xs font-medium text-red-800 sm:text-sm"
            >
              <TriangleAlert :size="17" class="mt-0.5 shrink-0 text-red-600" />
              <span>{{ formError }}</span>
            </div>

            <div class="grid gap-4 sm:grid-cols-2">
              <label class="field">
                <span>Placa de rodaje <strong class="text-red-500">*</strong></span>
                <input
                  v-model="vehicleForm.licensePlate"
                  required
                  placeholder="ABC-123"
                  class="font-mono uppercase tracking-wider"
                  @input="formError = ''"
                />
              </label>

              <label class="field">
                <span>Capacidad (Asientos) <strong class="text-red-500">*</strong></span>
                <input
                  v-model.number="vehicleForm.seatingCapacity"
                  required
                  type="number"
                  min="1"
                  max="60"
                  placeholder="20"
                  @input="formError = ''"
                />
              </label>

              <label class="field">
                <span>Marca <strong class="text-red-500">*</strong></span>
                <input
                  v-model="vehicleForm.brand"
                  required
                  placeholder="Ej. Mercedes-Benz"
                  @input="formError = ''"
                />
              </label>

              <label class="field">
                <span>Modelo <strong class="text-red-500">*</strong></span>
                <input
                  v-model="vehicleForm.model"
                  required
                  placeholder="Ej. Sprinter"
                  @input="formError = ''"
                />
              </label>
            </div>

            <div class="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 sm:text-sm"
                @click="vehicleModal = false"
              >
                Cancelar
              </button>

              <button
                type="submit"
                :disabled="savingVehicle"
                class="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-slate-900/15 transition hover:bg-blue-600 disabled:opacity-60 sm:text-sm"
              >
                <LoaderCircle v-if="savingVehicle" :size="16" class="animate-spin" />
                <Plus v-else :size="16" />
                <span>
                  {{ savingVehicle ? 'Guardando...' : 'Registrar vehículo' }}
                </span>
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

.field {
  display: grid;
  gap: 6px;
}

.field span {
  color: #334155;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.field input,
.field select {
  width: 100%;
  min-height: 44px;
  padding: 0 13px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  outline: none;
  background: #f8fafc;
  color: #0f172a;
  font-size: 14px;
  transition: all 0.15s ease;
}

.field input:hover,
.field select:hover {
  border-color: #cbd5e1;
}

.field input:focus,
.field select:focus {
  border-color: #2563eb;
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
}

/* Animated Route Stream & Pulsing Nodes in Hero Banner */
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

.beacon-halo {
  transform-box: fill-box;
  transform-origin: center;
  animation: nodePulse 1.6s ease-out infinite;
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