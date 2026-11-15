<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  TriangleAlert,
  BusFront,
  Clock3,
  MapPin,
  RefreshCcw,
  Route,
  Users,
  Building2,
  Sparkles,
  Plus,
  ChevronRight,
  GraduationCap,
} from 'lucide-vue-next'

import { getMyStudents } from '@/modules/parent/services/parentService'

const router = useRouter()

const students = ref([])
const loading = ref(true)
const error = ref('')

const routes = computed(() => {
  return students.value.flatMap((student) =>
    (student.enrollments ?? []).map((enrollment) => ({
      ...enrollment,
      studentId: student.id,
      studentName: student.fullName,
      studentSchool: student.schoolName,
      studentPickup: student.pickupLocation,
    }))
  )
})

function formatDirection(direction) {
  const normalized = String(direction ?? '').trim().toUpperCase()
  if (normalized === 'PICKUP') return 'Ida al colegio'
  if (normalized === 'RETURN') return 'Retorno a casa'
  return direction || 'Recorrido escolar'
}

function isRouteActive(status) {
  const normalized = String(status ?? '').trim().toUpperCase()
  return (
    normalized === 'ACTIVE' ||
    normalized === 'ACTIVA' ||
    normalized === 'ACTIVO'
  )
}

function formatTime(value) {
  if (!value) return 'Por confirmar'
  return String(value).slice(0, 5)
}

async function loadRoutes() {
  loading.value = true
  error.value = ''

  try {
    const data = await getMyStudents()
    students.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error(err)

    error.value =
      err?.response?.data?.detail ||
      'No fue posible cargar las rutas.'
  } finally {
    loading.value = false
  }
}

onMounted(loadRoutes)
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

    <!-- ───────── TOP HERO BANNER (With Animated Route Constellation) ───────── -->
    <section
      class="hero-banner reveal relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950 px-6 py-7 text-white shadow-[0_20px_50px_-15px_rgba(2,6,23,0.45)] sm:px-8 lg:px-10 lg:py-8"
      style="--d: 0ms"
    >
      <!-- Ambient glowing orbs -->
      <div class="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl"></div>

      <!-- Animated Route Constellation (Upper-Right Sky, Zero Button Collision) -->
      <svg
        class="pointer-events-none absolute right-6 top-2 hidden h-36 w-[340px] opacity-90 lg:block xl:right-10"
        viewBox="0 0 340 135"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="parentRoutesGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="50%" stop-color="#10b981" />
            <stop offset="100%" stop-color="#facc15" />
          </linearGradient>

          <filter id="parentRoutesGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Base dashed route track -->
        <path
          id="parentRoutesPath"
          d="M 20 88 C 85 88, 105 26, 175 44 S 260 18, 315 18"
          stroke="rgba(255,255,255,0.14)"
          stroke-width="2.5"
          stroke-dasharray="4 7"
          stroke-linecap="round"
        />

        <!-- Animated glowing energy stream along the route -->
        <path
          d="M 20 88 C 85 88, 105 26, 175 44 S 260 18, 315 18"
          stroke="url(#parentRoutesGrad)"
          stroke-width="3"
          stroke-linecap="round"
          class="route-energy-stream"
        />

        <!-- Stop 1: Hogar (Cyan) -->
        <g transform="translate(20, 88)">
          <circle r="10" fill="rgba(56, 189, 248, 0.2)" class="node-pulse-1" />
          <circle r="4.5" fill="#0f172a" stroke="#38bdf8" stroke-width="2.5" />
        </g>

        <!-- Stop 2: Paradero (Emerald) -->
        <g transform="translate(175, 44)">
          <circle r="12" fill="rgba(16, 185, 129, 0.22)" class="node-pulse-2" />
          <circle r="5" fill="#0f172a" stroke="#10b981" stroke-width="2.5" />
        </g>

        <!-- Stop 3: Colegio (Amber) -->
        <g transform="translate(315, 18)">
          <circle r="11" fill="rgba(250, 204, 21, 0.2)" class="node-pulse-1" />
          <circle r="5.5" fill="#0f172a" stroke="#facc15" stroke-width="2.5" />
        </g>

        <!-- Moving Bus Telemetry Beacon -->
        <g>
          <circle r="11" fill="rgba(16, 185, 129, 0.28)" class="beacon-halo" />
          <circle r="5" fill="#10b981" stroke="#ffffff" stroke-width="2" filter="url(#parentRoutesGlow)" />
          <animateMotion
            dur="5.5s"
            repeatCount="indefinite"
            keyPoints="0;1;0"
            keyTimes="0;0.5;1"
            calcMode="spline"
            keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
          >
            <mpath href="#parentRoutesPath" />
          </animateMotion>
        </g>
      </svg>

      <div class="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div class="max-w-xl">
          <div class="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
            <Route :size="12" class="text-emerald-400" />
            Transporte Escolar
          </div>

          <h1 class="mt-3.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Mis rutas
          </h1>

          <p class="mt-2 max-w-lg text-sm leading-relaxed text-slate-300/90 sm:text-base">
            Consulta las rutas escolares asociadas a tus hijos, sus horarios de salida, el sentido del recorrido y los paraderos asignados.
          </p>
        </div>

        <!-- Flush Right Actions -->
        <div class="flex shrink-0 items-center gap-2.5 pt-2 lg:pt-8">
          <button
            type="button"
            class="group inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white ring-1 ring-white/15 backdrop-blur-xs transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/15 sm:text-sm"
            @click="router.push({ name: 'parent-students' })"
          >
            <Plus :size="16" class="text-emerald-400 transition-transform duration-200 group-hover:rotate-90" />
            <span>Inscribir en ruta</span>
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

    <!-- ───────── ERROR BANNER ───────── -->
    <div
      v-if="error"
      role="alert"
      class="shake mt-6 flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50/90 p-4 shadow-xs"
    >
      <div class="flex gap-3">
        <TriangleAlert :size="19" class="mt-0.5 shrink-0 text-red-600" />
        <div>
          <p class="text-sm font-semibold text-red-800">No pudimos cargar tus rutas</p>
          <p class="mt-0.5 text-sm text-red-700">{{ error }}</p>
        </div>
      </div>

      <button
        type="button"
        class="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
        @click="loadRoutes"
      >
        <RefreshCcw :size="14" />
        Reintentar
      </button>
    </div>

    <!-- ───────── LOADING SKELETONS ───────── -->
    <div
      v-if="loading"
      class="mt-7 grid gap-5 lg:grid-cols-2"
    >
      <div
        v-for="index in 2"
        :key="index"
        class="h-64 animate-pulse rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs"
      >
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3.5">
            <div class="h-12 w-12 rounded-2xl bg-slate-100"></div>
            <div class="space-y-2">
              <div class="h-4 w-40 rounded bg-slate-100"></div>
              <div class="h-3 w-28 rounded bg-slate-100"></div>
            </div>
          </div>
          <div class="h-6 w-16 rounded-full bg-slate-100"></div>
        </div>
        <div class="mt-6 grid grid-cols-2 gap-3">
          <div class="h-20 rounded-2xl bg-slate-100"></div>
          <div class="h-20 rounded-2xl bg-slate-100"></div>
        </div>
        <div class="mt-4 h-16 rounded-2xl bg-slate-100"></div>
      </div>
    </div>

    <!-- ───────── EMPTY STATE ───────── -->
    <section
      v-else-if="routes.length === 0"
      class="reveal mt-7 relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white px-6 py-14 text-center shadow-xs"
      style="--d: 100ms"
    >
      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-emerald-50 text-blue-600 ring-1 ring-blue-500/15">
        <Route :size="28" />
      </div>

      <h2 class="mt-4 text-lg font-bold text-slate-900">
        Aún no tienes rutas asociadas
      </h2>

      <p class="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-slate-500">
        Cuando inscribas a uno de tus hijos utilizando el código proporcionado por la empresa de transporte o institución educativa, la ruta aparecerá aquí.
      </p>

      <button
        type="button"
        class="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-blue-600"
        @click="router.push({ name: 'parent-students' })"
      >
        <Users :size="16" />
        Ir a Mis hijos para inscribir ruta
      </button>
    </section>

    <!-- ───────── ROUTES CARDS GRID ───────── -->
    <section
      v-else
      class="reveal mt-7 grid gap-5 xl:grid-cols-2"
      style="--d: 100ms"
    >
      <article
        v-for="route in routes"
        :key="`${route.studentId}-${route.id}`"
        class="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs ring-1 ring-slate-900/[0.02] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300/80 hover:shadow-lg"
      >
        <!-- Top Gradient Accent Strip -->
        <div
          class="h-1.5 w-full bg-gradient-to-r"
          :class="
            isRouteActive(route.status)
              ? 'from-emerald-500 via-teal-400 to-sky-400'
              : 'from-slate-400 to-slate-300'
          "
        ></div>

        <div class="flex flex-1 flex-col justify-between p-5 sm:p-6">
          <div>
            <!-- Route Card Header -->
            <div class="flex items-start justify-between gap-4">
              <div class="flex min-w-0 items-center gap-3.5">
                <div
                  class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-md shadow-blue-600/20"
                >
                  <BusFront :size="21" />
                </div>

                <div class="min-w-0">
                  <h2 class="truncate text-lg font-bold tracking-tight text-slate-900">
                    {{ route.routeName }}
                  </h2>

                  <div class="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                    <span class="inline-flex items-center gap-1.5 font-semibold text-blue-700">
                      <GraduationCap :size="13" class="shrink-0 text-blue-600" />
                      {{ route.studentName }}
                    </span>

                    <span v-if="route.studentSchool" class="text-slate-300">•</span>
                    <span v-if="route.studentSchool" class="truncate text-slate-500">
                      {{ route.studentSchool }}
                    </span>
                  </div>
                </div>
              </div>

              <span
                class="shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ring-1"
                :class="
                  isRouteActive(route.status)
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                    : 'bg-slate-100 text-slate-600 ring-slate-500/15'
                "
              >
                {{ route.status }}
              </span>
            </div>

            <!-- Schedule & Direction Grid -->
            <div class="mt-5 grid gap-3 sm:grid-cols-2">
              <div class="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5">
                <div class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <Clock3 :size="14" class="text-blue-600" />
                  <span>Horario de salida</span>
                </div>

                <p class="mt-1.5 font-mono text-sm font-bold text-slate-900">
                  {{ formatTime(route.departureTime) }}
                </p>
              </div>

              <div class="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3.5">
                <div class="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <Route :size="14" class="text-emerald-600" />
                  <span>Sentido</span>
                </div>

                <p class="mt-1.5 text-sm font-bold text-slate-900">
                  {{ formatDirection(route.direction) }}
                </p>
              </div>
            </div>

            <!-- Assigned Stop or Registered Student Pickup Location -->
            <div
              v-if="route.stop || route.studentPickup"
              class="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3.5"
            >
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100/80 text-blue-600">
                <MapPin :size="17" />
              </div>

              <div class="min-w-0 flex-1">
                <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {{ route.stop ? 'Paradero asignado' : 'Punto de recojo registrado' }}
                </p>

                <p class="mt-0.5 text-sm font-semibold text-slate-800">
                  {{ route.stop?.name || route.studentPickup?.address }}
                </p>

                <p
                  v-if="route.stop?.address || route.studentPickup?.reference"
                  class="mt-0.5 text-xs text-slate-500"
                >
                  {{ route.stop?.address || `Ref: ${route.studentPickup?.reference}` }}
                </p>
              </div>
            </div>
          </div>

          <!-- Card Footer: Organization & Student Link -->
          <div class="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5 text-xs">
            <span class="inline-flex items-center gap-1.5 font-medium text-slate-500">
              <Building2 :size="14" class="text-slate-400" />
              {{ route.organizationName || 'Servicio de transporte escolar' }}
            </span>

            <button
              type="button"
              class="group/btn inline-flex items-center gap-1 font-bold text-blue-600 transition hover:text-blue-700"
              @click="router.push({ name: 'parent-students' })"
            >
              <span>Ver estudiante</span>
              <ChevronRight :size="14" class="transition-transform group-hover/btn:translate-x-0.5" />
            </button>
          </div>
        </div>
      </article>
    </section>

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