<script setup>
import AppFeedback from '@/shared/components/AppFeedback.vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  TriangleAlert,
  BusFront,
  CalendarDays,
  CheckCircle2,
  Clock3,
  RefreshCcw,
  Route,
  Users,
  History,
  Sparkles,
  ArrowRight,
} from 'lucide-vue-next'

import {
  getGuardianTrips,
  getMyStudents,
} from '@/modules/parent/services/parentService'

const router = useRouter()

const trips = ref([])
const students = ref([])
const loading = ref(true)
const error = ref('')
const activeFilter = ref('ALL') // 'ALL' | 'IN_PROGRESS' | 'COMPLETED' | 'SCHEDULED'

const studentNames = computed(() => {
  return Object.fromEntries(
    students.value.map((student) => [
      student.id,
      student.fullName,
    ])
  )
})

function normalizeTripStatus(status) {
  const s = String(status ?? '').trim().toUpperCase()
  if (s === 'COMPLETED' || s === 'FINALIZADO') return 'COMPLETED'
  if (s === 'INPROGRESS' || s === 'IN_PROGRESS' || s === 'EN CURSO') return 'IN_PROGRESS'
  return 'SCHEDULED'
}

const filteredTrips = computed(() => {
  if (activeFilter.value === 'ALL') return trips.value
  return trips.value.filter(
    (trip) => normalizeTripStatus(trip.status) === activeFilter.value
  )
})

const counts = computed(() => {
  const summary = { ALL: trips.value.length, IN_PROGRESS: 0, COMPLETED: 0, SCHEDULED: 0 }
  for (const trip of trips.value) {
    const key = normalizeTripStatus(trip.status)
    summary[key] = (summary[key] || 0) + 1
  }
  return summary
})

function statusLabel(status) {
  const labels = {
    Scheduled: 'Programado',
    SCHEDULED: 'Programado',
    InProgress: 'En curso',
    IN_PROGRESS: 'En curso',
    Completed: 'Finalizado',
    COMPLETED: 'Finalizado',
  }
  return labels[status] || status
}

function statusClasses(status) {
  const norm = normalizeTripStatus(status)
  if (norm === 'COMPLETED') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
  }
  if (norm === 'IN_PROGRESS') {
    return 'bg-blue-50 text-blue-700 ring-blue-600/20'
  }
  return 'bg-amber-50 text-amber-700 ring-amber-600/20'
}

function topStripClass(status) {
  const norm = normalizeTripStatus(status)
  if (norm === 'COMPLETED') {
    return 'from-emerald-500 via-teal-400 to-brand-navy-light'
  }
  if (norm === 'IN_PROGRESS') {
    return 'from-brand-navy via-brand-yellow to-brand-navy-light'
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

function formatDate(value) {
  if (!value) return 'No disponible'
  return new Intl.DateTimeFormat('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function formatTime(value) {
  if (!value) return '--:--'
  return new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function passengerStatusLabel(status) {
  const labels = {
    Pending: 'Pendiente',
    PENDING: 'Pendiente',
    Boarded: 'A bordo',
    BOARDED: 'A bordo',
    Alighted: 'Llegó',
    ALIGHTED: 'Llegó',
    Absent: 'Ausente',
    ABSENT: 'Ausente',
  }
  return labels[status] || status
}

function passengerStatusBadgeClass(status) {
  const s = String(status ?? '').toUpperCase()
  if (s === 'ALIGHTED') {
    return 'bg-emerald-100/90 text-emerald-800 ring-emerald-600/20'
  }
  if (s === 'BOARDED') {
    return 'bg-blue-100/90 text-blue-800 ring-blue-600/20'
  }
  if (s === 'ABSENT') {
    return 'bg-red-100/90 text-red-800 ring-red-600/20'
  }
  return 'bg-amber-100/90 text-amber-800 ring-amber-600/20'
}

function getStudentInitials(studentId) {
  const fullName = studentNames.value[studentId] || 'Estudiante'
  const parts = String(fullName).trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase()
}

async function loadHistory() {
  loading.value = true
  error.value = ''

  try {
    const to = new Date()
    const from = new Date(
      to.getTime() - 30 * 24 * 60 * 60 * 1000
    )

    const [tripData, studentData] = await Promise.all([
      getGuardianTrips(
        from.toISOString(),
        to.toISOString()
      ),
      getMyStudents(),
    ])

    trips.value = Array.isArray(tripData)
      ? [...tripData].reverse()
      : []

    students.value = Array.isArray(studentData)
      ? studentData
      : []
  } catch (err) {

    error.value =
      err?.response?.data?.detail ||
      'No fue posible cargar el historial de viajes.'
  } finally {
    loading.value = false
  }
}

onMounted(loadHistory)
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

    <!-- ───────── TOP HERO BANNER (With Animated Timeline Constellation) ───────── -->
    <section
      class="hero-banner reveal relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950 px-6 py-7 text-white shadow-[0_20px_50px_-15px_rgba(2,6,23,0.45)] sm:px-8 lg:px-10 lg:py-8"
      style="--d: 0ms"
    >
      <!-- Ambient glowing orbs -->
      <div class="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl"></div>

      <!-- Animated Timeline Constellation (Upper-Right Sky, Zero Button Collision) -->
      <svg
        class="pointer-events-none absolute right-6 top-2 hidden h-36 w-[340px] opacity-90 lg:block xl:right-10"
        viewBox="0 0 340 135"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="historyGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="50%" stop-color="#10b981" />
            <stop offset="100%" stop-color="#facc15" />
          </linearGradient>

          <filter id="historyGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Base dashed timeline path -->
        <path
          id="historyRoutePath"
          d="M 22 86 C 88 86, 112 28, 180 46 S 258 18, 315 20"
          stroke="rgba(255,255,255,0.14)"
          stroke-width="2.5"
          stroke-dasharray="4 7"
          stroke-linecap="round"
        />

        <!-- Animated glowing energy stream -->
        <path
          d="M 22 86 C 88 86, 112 28, 180 46 S 258 18, 315 20"
          stroke="url(#historyGrad)"
          stroke-width="3"
          stroke-linecap="round"
          class="route-energy-stream"
        />

        <!-- Checkpoint 1: Salida -->
        <g transform="translate(22, 86)">
          <circle r="10" fill="rgba(56, 189, 248, 0.2)" class="node-pulse-1" />
          <circle r="4.5" fill="#0f172a" stroke="#38bdf8" stroke-width="2.5" />
        </g>

        <!-- Checkpoint 2: Abordaje -->
        <g transform="translate(180, 46)">
          <circle r="12" fill="rgba(16, 185, 129, 0.22)" class="node-pulse-2" />
          <circle r="5" fill="#0f172a" stroke="#10b981" stroke-width="2.5" />
        </g>

        <!-- Checkpoint 3: Destino verificado -->
        <g transform="translate(315, 20)">
          <circle r="11" fill="rgba(250, 204, 21, 0.2)" class="node-pulse-1" />
          <circle r="5.5" fill="#0f172a" stroke="#facc15" stroke-width="2.5" />
        </g>

        <!-- Travelling Beacon -->
        <g>
          <circle r="11" fill="rgba(16, 185, 129, 0.28)" class="beacon-halo" />
          <circle r="5" fill="#10b981" stroke="#ffffff" stroke-width="2" filter="url(#historyGlow)" />
          <animateMotion
            dur="5.5s"
            repeatCount="indefinite"
            keyPoints="0;1;0"
            keyTimes="0;0.5;1"
            calcMode="spline"
            keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
          >
            <mpath href="#historyRoutePath" />
          </animateMotion>
        </g>
      </svg>

      <div class="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div class="max-w-xl">
          <div class="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-300">
            <History :size="12" class="text-emerald-400" />
            Registro de Recorridos
          </div>

          <h1 class="mt-3.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Historial de viajes
          </h1>

          <p class="mt-2 max-w-lg text-sm leading-relaxed text-slate-300/90 sm:text-base">
            Consulta los viajes realizados por tus hijos durante los últimos 30 días, incluyendo horarios, sentido de ruta y registro de asistencia.
          </p>
        </div>

        <!-- Flush Right Actions -->
        <div class="flex shrink-0 items-center gap-2.5 pt-2 lg:pt-8">
          <div class="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-xs font-semibold text-slate-300 backdrop-blur-xs">
            <CalendarDays :size="15" class="text-sky-400" />
            <span>Últimos 30 días</span>
          </div>

          <button
            type="button"
            :disabled="loading"
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-300 ring-1 ring-white/10 backdrop-blur-xs transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            aria-label="Actualizar historial"
            title="Actualizar historial"
            @click="loadHistory"
          >
            <RefreshCcw :size="16" :class="{ 'animate-spin': loading }" />
          </button>
        </div>
      </div>
    </section>

    <!-- ───────── ERROR BANNER ───────── -->
    <AppFeedback v-if="error" class="mt-6" kind="error" :message="error" retry-label="Volver a intentar" @retry="loadHistory" />

    <!-- ───────── LOADING SKELETONS ───────── -->
    <AppFeedback v-if="loading" class="mt-6" kind="loading" message="Cargando información…" />

    <!-- ───────── EMPTY STATE ───────── -->
    <section
      v-else-if="trips.length === 0"
      class="reveal mt-7 relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white px-6 py-14 text-center shadow-xs"
      style="--d: 100ms"
    >
      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 ring-1 ring-blue-500/15">
        <Clock3 :size="28" />
      </div>

      <h2 class="mt-4 text-lg font-bold text-slate-900">
        Aún no hay viajes registrados
      </h2>

      <p class="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-slate-500">
        Los recorridos de tus hijos aparecerán aquí automáticamente conforme se programen e inicien sus viajes en las rutas inscritas.
      </p>

      <button
        type="button"
        class="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-blue-600"
        @click="router.push({ name: 'parent-routes' })"
      >
        <Route :size="16" />
        Consultar mis rutas
      </button>
    </section>

    <!-- ───────── LOADED TRIPS TIMELINE ───────── -->
    <section
      v-else
      class="reveal mt-7"
      style="--d: 100ms"
    >
      <!-- Filter Pills Bar -->
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filtrar viajes por estado">
          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all"
            :class="
              activeFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'border border-slate-200/90 bg-white text-slate-600 hover:bg-slate-50'
            "
            @click="activeFilter = 'ALL'"
          >
            <span>Todos</span>
            <span
              class="rounded-full px-1.5 py-0.2 text-[10px]"
              :class="activeFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'"
            >
              {{ counts.ALL }}
            </span>
          </button>

          <button
            type="button"
            class="rs-button-primary inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all"
            :class="
              activeFilter === 'IN_PROGRESS'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'border border-slate-200/90 bg-white text-slate-600 hover:bg-slate-50'
            "
            @click="activeFilter = 'IN_PROGRESS'"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
            <span>En curso</span>
            <span
              class="rounded-full px-1.5 py-0.2 text-[10px]"
              :class="activeFilter === 'IN_PROGRESS' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'"
            >
              {{ counts.IN_PROGRESS }}
            </span>
          </button>

          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all"
            :class="
              activeFilter === 'COMPLETED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'border border-slate-200/90 bg-white text-slate-600 hover:bg-slate-50'
            "
            @click="activeFilter = 'COMPLETED'"
          >
            <span>Finalizados</span>
            <span
              class="rounded-full px-1.5 py-0.2 text-[10px]"
              :class="activeFilter === 'COMPLETED' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'"
            >
              {{ counts.COMPLETED }}
            </span>
          </button>

          <button
            type="button"
            class="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all"
            :class="
              activeFilter === 'SCHEDULED'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'border border-slate-200/90 bg-white text-slate-600 hover:bg-slate-50'
            "
            @click="activeFilter = 'SCHEDULED'"
          >
            <span>Programados</span>
            <span
              class="rounded-full px-1.5 py-0.2 text-[10px]"
              :class="activeFilter === 'SCHEDULED' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'"
            >
              {{ counts.SCHEDULED }}
            </span>
          </button>
        </div>

        <span class="text-xs font-medium text-slate-400">
          Mostrando {{ filteredTrips.length }} de {{ trips.length }} viajes
        </span>
      </div>

      <!-- Empty Filter State -->
      <div
        v-if="filteredTrips.length === 0"
        class="rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center"
      >
        <p class="text-sm font-bold text-slate-800">
          No hay viajes en este estado
        </p>
        <p class="mt-1 text-xs text-slate-500">
          Prueba seleccionando el filtro "Todos" para ver el historial completo.
        </p>
      </div>

      <!-- Trip Cards List -->
      <div v-else class="space-y-4">
        <article
          v-for="trip in filteredTrips"
          :key="trip.tripId"
          class="group relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs ring-1 ring-slate-900/[0.02] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300/80 hover:shadow-md"
        >
          <!-- Status-Colored Top Accent Strip -->
          <div
            class="h-1.5 w-full bg-gradient-to-r"
            :class="topStripClass(trip.status)"
          ></div>

          <div class="p-5 sm:p-6">
            <!-- Trip Header -->
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="flex min-w-0 items-center gap-3.5">
                <div
                  class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-navy to-brand-navy-light text-white shadow-md shadow-blue-600/20"
                >
                  <BusFront :size="21" />
                </div>

                <div class="min-w-0">
                  <h2 class="truncate text-lg font-bold tracking-tight text-slate-900">
                    {{ trip.routeName }}
                  </h2>

                  <p class="mt-0.5 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                    <Route :size="13" class="text-blue-600" />
                    <span>{{ directionLabel(trip.direction) }}</span>
                  </p>
                </div>
              </div>

              <span
                class="shrink-0 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider ring-1"
                :class="statusClasses(trip.status)"
              >
                {{ statusLabel(trip.status) }}
              </span>
            </div>

            <!-- 3-Column Trip Telemetry Grid -->
            <div class="mt-5 grid gap-3 sm:grid-cols-3">
              <div class="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5">
                <div class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <CalendarDays :size="14" class="text-blue-600" />
                  <span>Fecha del viaje</span>
                </div>

                <p class="mt-1.5 text-sm font-bold text-slate-900">
                  {{ formatDate(trip.scheduledStart) }}
                </p>
              </div>

              <div class="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5">
                <div class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <Clock3 :size="14" class="text-emerald-600" />
                  <span>Hora programada</span>
                </div>

                <p class="mt-1.5 font-mono text-sm font-bold text-slate-900">
                  {{ formatTime(trip.scheduledStart) }}
                </p>
              </div>

              <div class="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5">
                <div class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <Route :size="14" class="text-indigo-600" />
                  <span>Estado del recorrido</span>
                </div>

                <p class="mt-1.5 text-sm font-bold text-slate-900">
                  {{ statusLabel(trip.status) }}
                </p>
              </div>
            </div>

            <!-- Students on this Trip -->
            <div
              v-if="trip.myStudents?.length"
              class="mt-5 border-t border-slate-100 pt-4"
            >
              <div class="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <Users :size="14" class="text-blue-600" />
                <span>Mis hijos en este viaje</span>
              </div>

              <div class="flex flex-wrap gap-2.5">
                <div
                  v-for="passenger in trip.myStudents"
                  :key="passenger.studentId"
                  class="flex items-center gap-2.5 rounded-2xl border border-slate-200/80 bg-slate-50/70 py-1.5 pl-2 pr-3 shadow-2xs"
                >
                  <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-[10px] font-bold text-white">
                    {{ getStudentInitials(passenger.studentId) }}
                  </span>

                  <span class="text-xs font-bold text-slate-800 sm:text-sm">
                    {{ studentNames[passenger.studentId] || 'Estudiante' }}
                  </span>

                  <span
                    class="rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1"
                    :class="passengerStatusBadgeClass(passenger.status)"
                  >
                    {{ passengerStatusLabel(passenger.status) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>

  </div>
</template>

<style scoped>
.hero-banner {
  background-image:
    radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom right, var(--rs-navy), var(--rs-navy-light) 60%, var(--rs-navy));
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