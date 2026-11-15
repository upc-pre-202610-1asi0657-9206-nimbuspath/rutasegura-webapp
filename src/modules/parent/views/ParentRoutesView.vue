<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  AlertTriangle,
  BusFront,
  Clock3,
  MapPin,
  RefreshCcw,
  Route,
} from 'lucide-vue-next'

import { getMyStudents } from '@/modules/parent/services/parentService'

const students = ref([])
const loading = ref(true)
const error = ref('')

const routes = computed(() => {
  return students.value.flatMap((student) =>
    (student.enrollments ?? []).map((enrollment) => ({
      ...enrollment,
      studentId: student.id,
      studentName: student.fullName,
    })),
  )
})

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
  <main class="mx-auto max-w-7xl px-5 py-8 lg:px-8">
    <div>
      <p class="text-xs font-bold uppercase tracking-wider text-blue-600">
        Transporte
      </p>

      <h1 class="mt-1 text-2xl font-bold text-slate-900">
        Mis rutas
      </h1>

      <p class="mt-1 text-sm text-slate-500">
        Consulta las rutas escolares asociadas a tus hijos.
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
        @click="loadRoutes"
      >
        <RefreshCcw :size="17" />
      </button>
    </div>

    <div
      v-if="loading"
      class="mt-7 grid gap-5 lg:grid-cols-2"
    >
      <div
        v-for="index in 2"
        :key="index"
        class="h-56 animate-pulse rounded-3xl border border-slate-200 bg-white"
      />
    </div>

    <section
      v-else-if="routes.length === 0"
      class="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"
    >
      <div
        class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600"
      >
        <Route :size="25" />
      </div>

      <h2 class="mt-4 font-semibold text-slate-900">
        Aún no tienes rutas asociadas
      </h2>

      <p class="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
        Cuando inscribas a uno de tus hijos utilizando el código
        proporcionado por la empresa de transporte, la ruta aparecerá aquí.
      </p>
    </section>

    <section
      v-else
      class="mt-7 grid gap-5 xl:grid-cols-2"
    >
      <article
        v-for="route in routes"
        :key="route.id"
        class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
      >
        <div class="p-6">
          <div class="flex items-start justify-between gap-4">
            <div class="flex items-center gap-4">
              <div
                class="grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-600"
              >
                <BusFront :size="22" />
              </div>

              <div>
                <h2 class="font-bold text-slate-900">
                  {{ route.routeName }}
                </h2>

                <p class="mt-1 text-sm text-slate-500">
                  {{ route.studentName }}
                </p>
              </div>
            </div>

            <span
              class="rounded-full px-2.5 py-1 text-xs font-bold"
              :class="
                route.status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-100 text-slate-600'
              "
            >
              {{ route.status }}
            </span>
          </div>

          <div class="mt-5 grid gap-3 sm:grid-cols-2">
            <div class="rounded-2xl bg-slate-50 p-4">
              <div class="flex items-center gap-2 text-slate-500">
                <Clock3 :size="16" />

                <span class="text-xs font-semibold">
                  Horario
                </span>
              </div>

              <p class="mt-2 text-sm font-semibold text-slate-800">
                {{ route.departureTime || 'No disponible' }}
              </p>
            </div>

            <div class="rounded-2xl bg-slate-50 p-4">
              <div class="flex items-center gap-2 text-slate-500">
                <Route :size="16" />

                <span class="text-xs font-semibold">
                  Dirección
                </span>
              </div>

              <p class="mt-2 text-sm font-semibold text-slate-800">
                {{ route.direction }}
              </p>
            </div>
          </div>

          <div
            v-if="route.stop"
            class="mt-4 flex gap-3 rounded-2xl border border-slate-100 p-4"
          >
            <MapPin
              :size="18"
              class="mt-0.5 shrink-0 text-blue-600"
            />

            <div>
              <p class="text-xs font-bold text-slate-700">
                Paradero asignado
              </p>

              <p class="mt-1 text-sm text-slate-600">
                {{ route.stop.name }}
              </p>

              <p
                v-if="route.stop.address"
                class="mt-1 text-xs text-slate-400"
              >
                {{ route.stop.address }}
              </p>
            </div>
          </div>

          <p class="mt-4 text-xs text-slate-400">
            {{ route.organizationName || 'Empresa de transporte' }}
          </p>
        </div>
      </article>
    </section>
  </main>
</template>