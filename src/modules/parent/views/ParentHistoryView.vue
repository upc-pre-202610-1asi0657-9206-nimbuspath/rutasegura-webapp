<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  AlertTriangle,
  BusFront,
  CalendarDays,
  CheckCircle2,
  Clock3,
  RefreshCcw,
  Route,
  Users,
} from 'lucide-vue-next'

import {
  getGuardianTrips,
  getMyStudents,
} from '@/modules/parent/services/parentService'

const trips = ref([])
const students = ref([])
const loading = ref(true)
const error = ref('')

const studentNames = computed(() => {
  return Object.fromEntries(
    students.value.map((student) => [
      student.id,
      student.fullName,
    ]),
  )
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
  if (status === 'Completed' || status === 'COMPLETED') {
    return 'bg-emerald-50 text-emerald-700'
  }

  if (status === 'InProgress' || status === 'IN_PROGRESS') {
    return 'bg-blue-50 text-blue-700'
  }

  return 'bg-amber-50 text-amber-700'
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

async function loadHistory() {
  loading.value = true
  error.value = ''

  try {
    const to = new Date()
    const from = new Date(
      to.getTime() - 30 * 24 * 60 * 60 * 1000,
    )

    const [tripData, studentData] = await Promise.all([
      getGuardianTrips(
        from.toISOString(),
        to.toISOString(),
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
    console.error(err)

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
  <main class="mx-auto max-w-7xl px-5 py-8 lg:px-8">
    <div>
      <p
        class="text-xs font-bold uppercase tracking-wider text-blue-600"
      >
        Viajes
      </p>

      <h1 class="mt-1 text-2xl font-bold text-slate-900">
        Historial de viajes
      </h1>

      <p class="mt-1 text-sm text-slate-500">
        Consulta los viajes de tus hijos durante los últimos
        30 días.
      </p>
    </div>

    <div
      v-if="error"
      class="mt-6 flex items-start justify-between rounded-2xl border border-red-200 bg-red-50 p-4"
    >
      <div class="flex gap-3">
        <AlertTriangle
          :size="18"
          class="mt-0.5 text-red-600"
        />

        <p class="text-sm text-red-700">
          {{ error }}
        </p>
      </div>

      <button
        type="button"
        class="text-red-600"
        @click="loadHistory"
      >
        <RefreshCcw :size="17" />
      </button>
    </div>

    <div
      v-if="loading"
      class="mt-7 space-y-4"
    >
      <div
        v-for="index in 3"
        :key="index"
        class="h-36 animate-pulse rounded-3xl border border-slate-200 bg-white"
      />
    </div>

    <section
      v-else-if="trips.length === 0"
      class="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"
    >
      <div
        class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600"
      >
        <Clock3 :size="25" />
      </div>

      <h2 class="mt-4 font-semibold text-slate-900">
        Aún no hay viajes registrados
      </h2>

      <p
        class="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500"
      >
        Los viajes de tus hijos aparecerán aquí cuando estén
        inscritos en una ruta escolar.
      </p>
    </section>

    <section
      v-else
      class="mt-7 space-y-4"
    >
      <article
        v-for="trip in trips"
        :key="trip.tripId"
        class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:p-6"
      >
        <div
          class="flex flex-wrap items-start justify-between gap-4"
        >
          <div class="flex items-start gap-4">
            <div
              class="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600"
            >
              <BusFront :size="22" />
            </div>

            <div>
              <h2 class="font-bold text-slate-900">
                {{ trip.routeName }}
              </h2>

              <p class="mt-1 text-sm text-slate-500">
                {{ directionLabel(trip.direction) }}
              </p>
            </div>
          </div>

          <span
            class="rounded-full px-3 py-1 text-xs font-bold"
            :class="statusClasses(trip.status)"
          >
            {{ statusLabel(trip.status) }}
          </span>
        </div>

        <div
          class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          <div class="rounded-2xl bg-slate-50 p-4">
            <div
              class="flex items-center gap-2 text-xs font-semibold text-slate-500"
            >
              <CalendarDays :size="15" />
              Fecha
            </div>

            <p class="mt-2 text-sm font-semibold text-slate-800">
              {{ formatDate(trip.scheduledStart) }}
            </p>
          </div>

          <div class="rounded-2xl bg-slate-50 p-4">
            <div
              class="flex items-center gap-2 text-xs font-semibold text-slate-500"
            >
              <Clock3 :size="15" />
              Hora programada
            </div>

            <p class="mt-2 text-sm font-semibold text-slate-800">
              {{ formatTime(trip.scheduledStart) }}
            </p>
          </div>

          <div class="rounded-2xl bg-slate-50 p-4">
            <div
              class="flex items-center gap-2 text-xs font-semibold text-slate-500"
            >
              <Route :size="15" />
              Estado
            </div>

            <p class="mt-2 text-sm font-semibold text-slate-800">
              {{ statusLabel(trip.status) }}
            </p>
          </div>
        </div>

        <div
          v-if="trip.myStudents?.length"
          class="mt-5 border-t border-slate-100 pt-4"
        >
          <div
            class="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400"
          >
            <Users :size="15" />
            Mis hijos en este viaje
          </div>

          <div class="flex flex-wrap gap-2">
            <div
              v-for="passenger in trip.myStudents"
              :key="passenger.studentId"
              class="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
            >
              <CheckCircle2
                :size="15"
                class="text-blue-600"
              />

              <span class="text-sm font-semibold text-slate-700">
                {{
                  studentNames[passenger.studentId] ||
                  'Estudiante'
                }}
              </span>

              <span class="text-xs text-slate-400">
                · {{ passengerStatusLabel(passenger.status) }}
              </span>
            </div>
          </div>
        </div>
      </article>
    </section>
  </main>
</template>