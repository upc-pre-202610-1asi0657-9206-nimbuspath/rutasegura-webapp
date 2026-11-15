<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppFeedback from '@/shared/components/AppFeedback.vue'
import LiveTripPanel from '@/modules/tracking/components/LiveTripPanel.vue'
import {
  dayRange,
  limaDay,
  tripStatus,
  isActiveTrip,
} from '@/modules/tracking/services/trackingService'
import { getMyStudents } from '../services/parentService'
import api from '@/shared/api/apiClient'
import { apiError } from '@/shared/utils/forms'
const date = ref(limaDay()),
  students = ref([]),
  trips = ref([]),
  studentId = ref(''),
  tripId = ref(''),
  loading = ref(false),
  error = ref('')
let controller,
  version = 0,
  timer,
  stopped = false,
  running = false
const names = computed(() =>
  Object.fromEntries(students.value.map((s) => [s.id, s.fullName])),
)
const ownTrips = computed(() =>
  trips.value.filter((t) =>
    (t.myStudents || []).some((s) => s.studentId === studentId.value),
  ),
)
watch(studentId, () => {
  tripId.value =
    ownTrips.value.find((t) => isActiveTrip(t.status))?.tripId ||
    ownTrips.value[0]?.tripId ||
    ''
})
async function load(quiet = false) {
  if (running || document.hidden || stopped) return
  running = true
  const current = ++version
  controller = new AbortController()
  loading.value = !quiet
  error.value = ''
  try {
    const range = dayRange(date.value)
    const [children, result] = await Promise.all([
      getMyStudents(),
      api
        .get('/guardians/me/trips', {
          params: range,
          signal: controller.signal,
        })
        .then((r) => r.data),
    ])
    if (current !== version) return
    students.value = children
    trips.value = result
    if (!children.some((s) => s.id === studentId.value))
      studentId.value = children[0]?.id || ''
    if (!ownTrips.value.some((t) => t.tripId === tripId.value))
      tripId.value =
        ownTrips.value.find((t) => isActiveTrip(t.status))?.tripId ||
        ownTrips.value[0]?.tripId ||
        ''
  } catch (e) {
    if (current === version && e.code !== 'ERR_CANCELED') {
      students.value = []
      trips.value = []
      tripId.value = ''
      error.value = apiError(e)
    }
  } finally {
    if (current === version) {
      loading.value = false
      running = false
    }
  }
}
function changeDate() {
  ++version
  controller?.abort()
  running = false
  tripId.value = ''
  trips.value = []
  void load()
}
const visible = () => {
  if (document.hidden) {
    ++version
    controller?.abort()
    running = false
    trips.value = []
    tripId.value = ''
  } else void load()
}
onMounted(() => {
  void load()
  timer = setInterval(() => void load(true), 15000)
  document.addEventListener('visibilitychange', visible)
})
onBeforeUnmount(() => {
  stopped = true
  ++version
  controller?.abort()
  clearInterval(timer)
  document.removeEventListener('visibilitychange', visible)
})
</script>
<template>
  <div class="rs-workspace">
    <header class="rs-page-header">
      <h1>Seguimiento de mis hijos</h1>
      <p>
        Consulta asistencia y ubicación durante un viaje activo con vínculo
        verificado.
      </p>
    </header>
    <AppFeedback
      v-if="error"
      kind="error"
      :message="error"
      retry-label="Volver a intentar"
      @retry="load()"
    />
    <div class="rs-panel rs-stack">
      <div class="rs-grid">
        <label for="tracking-day"
          >Fecha del servicio (Lima)<input
            id="tracking-day"
            v-model="date"
            type="date"
            required
            @change="changeDate"
        /></label>
        <div>
          <label for="tracking-student">Hijo</label
          ><select id="tracking-student" v-model="studentId">
            <option value="" disabled>Selecciona un hijo</option>
            <option v-for="s in students" :key="s.id" :value="s.id">
              {{ s.fullName }}
            </option>
          </select>
        </div>
      </div>
      <div>
        <label for="tracking-trip">Viaje autorizado</label
        ><select id="tracking-trip" v-model="tripId">
          <option value="" disabled>Selecciona un viaje</option>
          <option v-for="t in ownTrips" :key="t.tripId" :value="t.tripId">
            {{ t.routeName }} ·
            {{
              t.direction === 'Return' || t.direction === 'RETURN'
                ? 'Retorno'
                : 'Ida'
            }}
            · {{ tripStatus(t.status) }}
          </option>
        </select>
      </div>
      <button class="rs-button-secondary" :disabled="loading" @click="load()">
        Actualizar viajes
      </button>
    </div>
    <AppFeedback
      v-if="loading"
      kind="loading"
      message="Consultando viajes autorizados…"
    />
    <AppFeedback
      v-else-if="!ownTrips.length && !error"
      kind="empty"
      message="No hay viajes autorizados para este hijo y fecha. Comprueba la inscripción y la revisión del vínculo con la empresa."
    />
    <LiveTripPanel
      v-if="tripId && studentId"
      :key="tripId + studentId"
      :trip-id="tripId"
      :student-id="studentId"
      :student-names="names"
    />
  </div>
</template>
