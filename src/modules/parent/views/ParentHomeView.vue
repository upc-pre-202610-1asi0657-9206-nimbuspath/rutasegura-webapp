<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  BusFront,
  Users,
  Route,
  MapPin,
  School,
  UserRound,
  ChevronRight,
  RefreshCcw,
  TriangleAlert,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Plus,
} from 'lucide-vue-next'

import { useAuthStore } from '@/modules/auth/stores/authStore'
import {
  getMyStudents,
  getParentProfile,
} from '@/modules/parent/services/parentService'

const auth = useAuthStore()
const router = useRouter()

const profile = ref(null)
const students = ref([])
const loading = ref(true)
const error = ref('')

const firstName = computed(() => {
  return auth.user?.firstName?.trim() || 'Familia'
})

const activeEnrollments = computed(() =>
  students.value.reduce((total, student) => {
    const active =
      student.enrollments?.filter(
        (enrollment) => enrollment.status === 'ACTIVE'
      ).length ?? 0

    return total + active
  }, 0)
)

const profileComplete = computed(() => Boolean(profile.value?.isComplete))

function formatStatus(status) {
  const normalized = String(status ?? '').toUpperCase()
  if (normalized === 'ACTIVE') return 'Activa'
  if (normalized === 'PENDING') return 'Pendiente'
  if (normalized === 'INACTIVE') return 'Inactiva'
  return status || 'Sin estado'
}

function getStudentInitials(fullName) {
  if (!fullName) return 'EST'
  const parts = String(fullName).trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase()
}

async function loadDashboard() {
  loading.value = true
  error.value = ''

  try {
    const [profileData, studentsData] = await Promise.all([
      getParentProfile(),
      getMyStudents(),
    ])

    profile.value = profileData
    students.value = Array.isArray(studentsData) ? studentsData : []
  } catch (err) {
    console.error(err)

    error.value =
      err?.response?.data?.detail ||
      'No fue posible cargar la información de tu cuenta.'
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboard)
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

    <!-- ───────── HERO WELCOME BANNER ───────── -->
    <section
      class="hero-banner reveal relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950 px-6 py-7 text-white shadow-[0_20px_50px_-15px_rgba(2,6,23,0.5)] sm:px-8 lg:px-10 lg:py-9"
      style="--d: 0ms"
    >
      <!-- Ambient glowing orbs -->
      <div class="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-blue-500/25 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl"></div>

      <!-- Decorative Right-Side SVG Route Illustration (Desktop) -->
      <svg
        class="pointer-events-none absolute right-6 top-1/2 hidden h-36 w-72 -translate-y-1/2 opacity-85 lg:block"
        viewBox="0 0 280 130"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="heroRouteLine" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.2" />
            <stop offset="50%" stop-color="#10b981" />
            <stop offset="100%" stop-color="#facc15" />
          </linearGradient>
        </defs>
        <path
          d="M 15 100 C 75 100, 95 35, 155 55 S 225 25, 265 25"
          stroke="rgba(255,255,255,0.12)"
          stroke-width="3"
          stroke-dasharray="4 7"
          stroke-linecap="round"
        />
        <path
          d="M 15 100 C 75 100, 95 35, 155 55 S 225 25, 265 25"
          stroke="url(#heroRouteLine)"
          stroke-width="3"
          stroke-linecap="round"
          class="hero-route-draw"
        />
        <circle cx="15" cy="100" r="5" fill="#0f172a" stroke="#38bdf8" stroke-width="2.5" />
        <circle cx="155" cy="55" r="6" fill="#0f172a" stroke="#10b981" stroke-width="2.5" />
        <circle cx="265" cy="25" r="6" fill="#0f172a" stroke="#facc15" stroke-width="2.5" />
      </svg>

      <div class="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div class="max-w-xl">
          <div class="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-300">
            <Sparkles :size="12" class="text-emerald-400" />
            PORTAL DE FAMILIAS
          </div>

          <h2 class="mt-3.5 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-[32px]">
            Hola,
            <span class="bg-gradient-to-r from-amber-300 via-emerald-300 to-sky-400 bg-clip-text text-transparent">
              {{ firstName }}.
            </span>
          </h2>

          <p class="mt-2 max-w-lg text-sm leading-relaxed text-slate-300/90 sm:text-base">
            Consulta la información de tus hijos, sus rutas asignadas y el estado de tu perfil desde un solo lugar.
          </p>
        </div>

        <!-- Quick Hero Actions -->
        <div class="flex flex-wrap items-center gap-2.5">
          <button
            v-if="!loading && !profileComplete"
            type="button"
            class="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3.5 py-2.5 text-xs font-semibold text-amber-200 backdrop-blur-sm transition hover:bg-amber-400/20"
            @click="router.push({ name: 'parent-profile' })"
          >
            <Clock :size="14" class="text-amber-300" />
            Completar mi perfil
          </button>

          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white ring-1 ring-white/15 backdrop-blur-sm transition hover:bg-white/15"
            @click="router.push({ name: 'parent-students' })"
          >
            <Users :size="15" class="text-sky-300" />
            Gestionar mis hijos
          </button>

          <button
            type="button"
            :disabled="loading"
            class="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-300 ring-1 ring-white/10 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            aria-label="Actualizar panel"
            title="Actualizar información"
            @click="loadDashboard"
          >
            <RefreshCcw :size="15" :class="{ 'animate-spin': loading }" />
          </button>
        </div>
      </div>
    </section>

    <!-- ───────── ERROR BANNER ───────── -->
    <div
      v-if="error"
      role="alert"
      class="reveal mt-6 flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50/90 p-4 shadow-xs"
      style="--d: 60ms"
    >
      <div class="flex gap-3">
        <TriangleAlert
          :size="19"
          class="mt-0.5 shrink-0 text-red-600"
        />
        <div>
          <p class="text-sm font-semibold text-red-800">
            No pudimos cargar el portal
          </p>
          <p class="mt-0.5 text-sm text-red-700">
            {{ error }}
          </p>
        </div>
      </div>

      <button
        type="button"
        class="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 shadow-2xs transition hover:bg-red-100"
        @click="loadDashboard"
      >
        <RefreshCcw :size="14" />
        Reintentar
      </button>
    </div>

    <!-- ───────── LOADING SKELETONS ───────── -->
    <div v-if="loading" class="mt-7 space-y-7">
      <div class="grid gap-4 sm:grid-cols-3">
        <div
          v-for="index in 3"
          :key="index"
          class="h-36 animate-pulse rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs"
        >
          <div class="flex items-center justify-between">
            <div class="h-11 w-11 rounded-xl bg-slate-100"></div>
            <div class="h-7 w-10 rounded-lg bg-slate-100"></div>
          </div>
          <div class="mt-5 h-4 w-32 rounded bg-slate-100"></div>
          <div class="mt-2 h-3 w-44 rounded bg-slate-100"></div>
        </div>
      </div>

      <div class="h-64 animate-pulse rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs"></div>
    </div>

    <!-- ───────── LOADED DASHBOARD CONTENT ───────── -->
    <template v-else>
      <!-- KPI Summary Cards -->
      <section class="reveal mt-7 grid gap-4 sm:grid-cols-3" style="--d: 100ms">

        <!-- KPI 1: Hijos registrados -->
        <article
          class="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs ring-1 ring-slate-900/[0.02] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
          @click="router.push({ name: 'parent-students' })"
        >
          <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-600 to-sky-400"></div>

          <div class="flex items-center justify-between">
            <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-500/15 transition-colors group-hover:bg-blue-600 group-hover:text-white">
              <Users :size="20" />
            </div>

            <span class="text-3xl font-extrabold tracking-tight text-slate-900">
              {{ students.length }}
            </span>
          </div>

          <div class="mt-4 flex items-end justify-between">
            <div>
              <p class="text-sm font-bold text-slate-900">
                Hijos registrados
              </p>
              <p class="mt-0.5 text-xs text-slate-500">
                Estudiantes asociados a tu cuenta
              </p>
            </div>

            <ArrowUpRight :size="16" class="text-slate-400 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-blue-600" />
          </div>
        </article>

        <!-- KPI 2: Inscripciones activas -->
        <article
          class="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs ring-1 ring-slate-900/[0.02] transition-all duration-200 hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md"
          @click="router.push({ name: 'parent-routes' })"
        >
          <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400"></div>

          <div class="flex items-center justify-between">
            <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/15 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
              <Route :size="20" />
            </div>

            <span class="text-3xl font-extrabold tracking-tight text-slate-900">
              {{ activeEnrollments }}
            </span>
          </div>

          <div class="mt-4 flex items-end justify-between">
            <div>
              <p class="text-sm font-bold text-slate-900">
                Inscripciones activas
              </p>
              <p class="mt-0.5 text-xs text-slate-500">
                Rutas actualmente asociadas
              </p>
            </div>

            <ArrowUpRight :size="16" class="text-slate-400 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-emerald-600" />
          </div>
        </article>

        <!-- KPI 3: Perfil familiar -->
        <article
          class="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs ring-1 ring-slate-900/[0.02] transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
          @click="router.push({ name: 'parent-profile' })"
        >
          <div
            class="absolute inset-x-0 top-0 h-1"
            :class="profileComplete ? 'bg-gradient-to-r from-emerald-500 to-sky-400' : 'bg-gradient-to-r from-amber-400 to-orange-400'"
          ></div>

          <div class="flex items-center justify-between">
            <div
              class="flex h-11 w-11 items-center justify-center rounded-xl ring-1 transition-colors"
              :class="
                profileComplete
                  ? 'bg-emerald-50 text-emerald-600 ring-emerald-500/15 group-hover:bg-emerald-600 group-hover:text-white'
                  : 'bg-amber-50 text-amber-600 ring-amber-500/15 group-hover:bg-amber-500 group-hover:text-white'
              "
            >
              <UserRound :size="20" />
            </div>

            <span
              class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1"
              :class="
                profileComplete
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                  : 'bg-amber-50 text-amber-700 ring-amber-600/20'
              "
            >
              <CheckCircle2 v-if="profileComplete" :size="13" />
              <Clock v-else :size="13" />
              {{ profileComplete ? 'Completo' : 'Pendiente' }}
            </span>
          </div>

          <div class="mt-4 flex items-end justify-between">
            <div>
              <p class="text-sm font-bold text-slate-900">
                Perfil familiar
              </p>
              <p class="mt-0.5 text-xs text-slate-500">
                {{ profileComplete ? 'Datos de contacto verificados' : 'Completa tus datos de contacto' }}
              </p>
            </div>

            <ArrowUpRight :size="16" class="text-slate-400 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-amber-600" />
          </div>
        </article>
      </section>

      <!-- ───────── MIS HIJOS SECTION ───────── -->
      <section class="reveal mt-9" style="--d: 180ms">
        <div class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div class="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-blue-600">
              <span class="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
              Familia
            </div>

            <h2 class="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Mis hijos
            </h2>

            <p class="mt-0.5 text-sm text-slate-500">
              Información registrada en RutaSegura y estado de sus rutas.
            </p>
          </div>

          <button
            type="button"
            class="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-blue-300 hover:text-blue-600"
            @click="router.push({ name: 'parent-students' })"
          >
            <span>Ver sección Mis hijos</span>
            <ChevronRight :size="15" />
          </button>
        </div>

        <!-- Empty State -->
        <div
          v-if="students.length === 0"
          class="mt-5 relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white px-6 py-12 text-center shadow-xs"
        >
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-emerald-50 text-blue-600 ring-1 ring-blue-500/15">
            <Users :size="24" />
          </div>

          <h3 class="mt-4 text-base font-bold text-slate-900">
            Aún no tienes estudiantes registrados
          </h3>

          <p class="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-slate-500">
            Cuando registres a tus hijos, podrás consultar aquí su colegio, punto de recojo y las rutas escolares asociadas.
          </p>

          <button
            type="button"
            class="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-md shadow-slate-900/10 transition hover:-translate-y-0.5 hover:bg-blue-600"
            @click="router.push({ name: 'parent-students' })"
          >
            <Plus :size="15" />
            Ir a Mis hijos
          </button>
        </div>

        <!-- Student Cards Grid -->
        <div
          v-else
          class="mt-5 grid gap-5 lg:grid-cols-2"
        >
          <article
            v-for="student in students"
            :key="student.id"
            class="group relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300/80 hover:shadow-lg"
          >
            <!-- Top Accent Strip -->
            <div class="h-1.5 w-full bg-gradient-to-r from-blue-600 via-sky-400 to-emerald-400"></div>

            <div class="p-5 sm:p-6">
              <!-- Student Header -->
              <div class="flex items-start justify-between gap-4">
                <div class="flex min-w-0 items-center gap-3.5">
                  <div
                    class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-sm font-bold text-white shadow-md shadow-blue-600/20"
                  >
                    {{ getStudentInitials(student.fullName) }}
                  </div>

                  <div class="min-w-0">
                    <h3 class="truncate text-base font-bold text-slate-900">
                      {{ student.fullName }}
                    </h3>

                    <p class="mt-0.5 flex items-center gap-1.5 truncate text-xs font-medium text-slate-500">
                      <School :size="13" class="shrink-0 text-blue-600" />
                      <span class="truncate">{{ student.schoolName || 'Colegio no registrado' }}</span>
                    </p>
                  </div>
                </div>

                <span
                  class="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700"
                >
                  {{ student.schoolGrade || 'Sin grado' }}
                </span>
              </div>

              <!-- Pickup Location Box -->
              <div
                v-if="student.pickupLocation"
                class="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3.5"
              >
                <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-100/80 text-blue-600">
                  <MapPin :size="16" />
                </div>

                <div class="min-w-0">
                  <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Punto de recojo
                  </p>
                  <p class="mt-0.5 text-sm font-medium text-slate-800">
                    {{ student.pickupLocation.address }}
                  </p>
                </div>
              </div>

              <!-- Associated Routes / Enrollments -->
              <div class="mt-4 border-t border-slate-100 pt-4">
                <p class="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Rutas asociadas
                </p>

                <div
                  v-if="student.enrollments?.length"
                  class="space-y-2"
                >
                  <div
                    v-for="enrollment in student.enrollments"
                    :key="enrollment.id"
                    class="flex items-center justify-between gap-3 rounded-xl border border-slate-200/60 bg-slate-50/60 px-3 py-2.5"
                  >
                    <div class="flex min-w-0 items-center gap-3">
                      <div
                        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/20"
                      >
                        <BusFront :size="16" />
                      </div>

                      <div class="min-w-0">
                        <p class="truncate text-sm font-semibold text-slate-900">
                          {{ enrollment.routeName }}
                        </p>
                        <p class="text-xs text-slate-500">
                          {{ enrollment.direction }}
                        </p>
                      </div>
                    </div>

                    <span
                      class="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1"
                      :class="
                        enrollment.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                          : 'bg-slate-100 text-slate-600 ring-slate-500/15'
                      "
                    >
                      {{ formatStatus(enrollment.status) }}
                    </span>
                  </div>
                </div>

                <div
                  v-else
                  class="flex items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 px-3.5 py-2.5 text-xs text-slate-500"
                >
                  <Route :size="14" class="text-slate-400" />
                  <span>Sin rutas asociadas actualmente.</span>
                </div>
              </div>

              <!-- Card Footer Action -->
              <div class="mt-4 flex justify-end border-t border-slate-100 pt-3">
                <button
                  type="button"
                  class="group/btn inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-blue-600 transition hover:bg-blue-50 hover:text-blue-700"
                  @click="router.push({ name: 'parent-students' })"
                >
                  <span>Ver detalles del estudiante</span>
                  <ChevronRight :size="15" class="transition-transform group-hover/btn:translate-x-0.5" />
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </template>

  </div>
</template>

<style scoped>
.hero-banner {
  background-image:
    radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom right, #020617, #0f172a 60%, #09152b);
  background-size: 26px 26px, 100% 100%;
}

.hero-route-draw {
  stroke-dasharray: 280;
  stroke-dashoffset: 280;
  animation: drawRoute 1.6s cubic-bezier(0.22, 1, 0.36, 1) 0.2s forwards;
}

@keyframes drawRoute {
  to {
    stroke-dashoffset: 0;
  }
}

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