<script setup>
import { computed, onBeforeUnmount, ref, toRef, watch } from 'vue'
import AppFeedback from '@/shared/components/AppFeedback.vue'
import AppConfirmDialog from '@/shared/components/AppConfirmDialog.vue'
import RouteMap from '@/shared/components/RouteMap.vue'
import { apiError, validPoint } from '@/shared/utils/forms'
import { useLiveTrip } from '../composables/useLiveTrip'
import {
  resolveSos,
  tripSummary,
  operationalAlerts,
  tripStatus,
  passengerStatus,
  isActiveTrip,
  incidentLabel,
  severityLabel,
  alertStatusLabel,
  acknowledgeAlert,
  resolveAlert,
  tripTrack,
  tripOperationalDetails,
  trackToGeometry,
} from '../services/trackingService'
const props = defineProps({
  tripId: { type: String, required: true },
  administrator: Boolean,
  studentId: String,
  studentNames: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['changed'])
const { live, position, loading, error, channel, age, stale, refresh, denied } =
  useLiveTrip(toRef(props, 'tripId'))
const confirm = ref(false),
  resolving = ref(false),
  actionError = ref(''),
  notice = ref(''),
  incidents = ref([]),
  alerts = ref([]),
  detailError = ref('')
let detailsController,
  detailsVersion = 0,
  detailsRunning = false
const passengers = computed(() =>
  (live.value?.passengers || []).filter(
    (p) => props.administrator || p.studentId === props.studentId,
  ),
)
const hasStudentAccess = computed(
  () => props.administrator || passengers.value.length > 0,
)
const operation = ref(null)
const operationError = ref(false)
let operationRequest, operationKey, loadedAt = 0
const passengerNames = computed(() => new Map(
  (operation.value?.students || []).map((student) => [student.studentId, student.fullName]),
))
const plannedGeometry = computed(() => operation.value?.itinerary?.geometry || null)
async function loadOperation(force = false) {
  if (!props.administrator || !live.value || denied.value) {
    operationRequest?.abort()
    operationRequest = undefined
    operation.value = null
    operationKey = undefined
    operationError.value = false
    return
  }
  const key = JSON.stringify([
    props.tripId,
    (live.value.passengers || []).map((p) => p.studentId),
    (live.value.stops || []).map((s) => [s.stopId, s.latitude, s.longitude]),
  ])
  if (operationKey === key && !force &&
      (operationRequest || Date.now() - loadedAt < 30_000)) return
  if (operationKey !== key) operation.value = null
  operationRequest?.abort()
  operationKey = key
  const request = (operationRequest = new AbortController())
  operationError.value = false
  try {
    const data = await tripOperationalDetails(props.tripId, request.signal)
    if (operationRequest === request) operation.value = data
  } catch {
    if (operationRequest === request) {
      operation.value = null
      operationError.value = true
    }
  } finally {
    if (operationRequest === request) {
      loadedAt = Date.now()
      operationRequest = undefined
    }
  }
}
const points = computed(() => {
  if (!isActiveTrip(live.value?.status)) return []
  const allowedStops = new Set(passengers.value.map((p) => p.stopId))
  const stops = (live.value.stops || []).filter(
    (s) =>
      (props.administrator || allowedStops.has(s.stopId)) &&
      validPoint(s.latitude, s.longitude),
  )
  return position.value
    ? [
        ...stops,
        {
          ...position.value,
          kind: 'vehicle',
          name: stale.value
            ? 'Última ubicación conocida (antigua)'
            : 'Vehículo',
        },
      ]
    : stops
})
const ownNextStop = computed(() =>
  props.administrator ||
  passengers.value.some((p) => p.stopId === live.value?.nextStop?.stopId)
    ? live.value?.nextStop
    : null,
)
async function details() {
  if (detailsRunning && live.value && !denied.value) return
  const version = ++detailsVersion
  detailsController?.abort()
  incidents.value = []
  alerts.value = []
  detailError.value = ''
  if (!props.administrator || !live.value || denied.value) {
    detailsRunning = false
    return
  }
  detailsRunning = true
  detailsController = new AbortController()
  const results = await Promise.allSettled([
    tripSummary(props.tripId, detailsController.signal),
    operationalAlerts(detailsController.signal),
  ])
  if (version !== detailsVersion) return
  detailsRunning = false
  if (results[0].status === 'fulfilled')
    incidents.value = results[0].value.incidents || []
  if (results[1].status === 'fulfilled')
    alerts.value = results[1].value.filter((a) => a.tripId === props.tripId)
  if (
    results.some(
      (r) => r.status === 'rejected' && r.reason.code !== 'ERR_CANCELED',
    )
  )
    detailError.value =
      'No se pudo actualizar alguna fuente de incidencias/alertas. No equivale a ausencia de incidentes.'
}
const geometry = ref(null)
let trackController
async function loadTrack() {
  trackController?.abort()
  if (!props.administrator || !live.value || denied.value || live.value.status === 'Scheduled') {
    trackController = undefined
    geometry.value = null
    return
  }
  const request = (trackController = new AbortController())
  try {
    const data = await tripTrack(props.tripId, request.signal)
    if (trackController === request) geometry.value = trackToGeometry(data)
  } catch {
    // The recorded track is supplementary; absence never fabricates a path.
    if (trackController === request) geometry.value = null
  }
}
watch([live, denied, () => props.tripId, () => props.administrator], () => {
  void details()
  void loadTrack()
  void loadOperation()
}, { immediate: true })
const alertBusy = ref('')
async function alertAction(alert, task, notice_) {
  if (alertBusy.value) return
  alertBusy.value = alert.id
  actionError.value = ''
  notice.value = ''
  try {
    await task(alert.id)
    notice.value = notice_
    detailsRunning = false
    await details()
    emit('changed')
  } catch (e) {
    actionError.value = apiError(e)
  } finally {
    alertBusy.value = ''
  }
}
const acknowledge = (a) => alertAction(a, acknowledgeAlert, 'Alerta reconocida.')
const resolveIncident = (a) => alertAction(a, resolveAlert, 'Incidente resuelto.')
onBeforeUnmount(() => trackController?.abort())
onBeforeUnmount(() => {
  operationRequest?.abort()
  operationRequest = undefined
})
onBeforeUnmount(() => {
  ++detailsVersion
  detailsController?.abort()
})
async function resolve() {
  if (resolving.value || !props.administrator || !live.value?.hasActiveSos)
    return
  resolving.value = true
  actionError.value = ''
  notice.value = ''
  try {
    await resolveSos(props.tripId)
    await refresh()
    emit('changed')
    notice.value =
      live.value && !live.value.hasActiveSos
        ? 'SOS cerrado. El conductor podrá continuar con el cierre del viaje si cumple las demás reglas.'
        : 'Cierre enviado. Actualiza para comprobar el estado actual.'
  } catch (e) {
    actionError.value = apiError(e)
  } finally {
    resolving.value = false
    confirm.value = false
  }
}
const format = (value) =>
  value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString('es-PE', { timeZone: 'America/Lima' })
    : 'No disponible'
</script>
<template>
  <section class="rs-stack" aria-label="Seguimiento del viaje">
    <p class="rs-badge" role="status">{{ channel }}</p>
    <AppFeedback
      v-if="loading"
      kind="loading"
      message="Comprobando estado y permisos…"
    />
    <AppFeedback
      v-if="error"
      kind="error"
      :message="error"
      :retry-label="denied ? undefined : 'Actualizar estado'"
      @retry="refresh"
    />
    <AppFeedback
      v-if="actionError"
      kind="error"
      :message="actionError"
    /><AppFeedback v-if="notice" kind="success" :message="notice" />
    <AppFeedback
      v-if="live && !hasStudentAccess"
      kind="error"
      message="El alumno seleccionado ya no está autorizado en este viaje. Selecciona otro viaje o consulta a la empresa."
    />
    <template v-if="live && hasStudentAccess">
      <h2>{{ live.routeName }} · {{ tripStatus(live.status) }}</h2>
      <p class="rs-hint">
        {{
          live.direction === 'Return' || live.direction === 'RETURN'
            ? 'Retorno a casa'
            : 'Ida al colegio'
        }}
        · Inicio previsto {{ format(live.scheduledStart) }}
      </p>
      <section v-if="live.hasActiveSos" class="rs-emergency" role="alert">
        <h3>SOS activo</h3>
        <p>
          {{
            administrator
              ? 'Contacta al conductor y atiende la emergencia antes de confirmar el cierre del SOS.'
              : 'La empresa está gestionando una alerta SOS de este viaje.'
          }}
        </p>
        <button
          v-if="administrator"
          class="rs-button-danger"
          :disabled="resolving"
          @click="confirm = true"
        >
          Atender y cerrar SOS
        </button>
      </section>
      <template v-if="isActiveTrip(live.status)">
        <RouteMap
          :points="points"
          :geometry="geometry"
          :planned-geometry="plannedGeometry"
          label="Ubicación del vehículo y paradas autorizadas"
        />
        <p class="rs-hint">Azul: vehículo. Amarillo: paradas autorizadas.</p>
        <p v-if="administrator && plannedGeometry" class="rs-hint">
          Violeta discontinuo: itinerario previsto. La línea azul, cuando aparece, muestra el recorrido GPS.
        </p>
        <p v-else-if="administrator && operation && !plannedGeometry" class="rs-hint">
          Este viaje no tiene un itinerario vial disponible para sus paradas.
        </p>
        <p v-if="!position" class="rs-hint" role="status">
          Sin ubicación GPS disponible. No se muestra una posición estimada o
          ficticia.
        </p>
        <div v-else class="rs-stack">
          <p :class="stale ? 'rs-error' : 'rs-hint'" role="status">
            {{
              stale
                ? 'Ubicación antigua; no representa la posición actual.'
                : 'Última ubicación recibida'
            }}
            Antigüedad: {{ age == null ? 'desconocida' : age + ' s' }} ·
            {{ format(position.recordedAt) }}
          </p>
          <p v-if="ownNextStop && !stale" class="rs-hint">
            {{ ownNextStop.name }} ·
            {{
              ownNextStop.etaMinutes == null
                ? 'ETA no disponible'
                : 'Llegada estimada: ' + ownNextStop.etaMinutes + ' min'
            }}. Estimación orientativa, sin tráfico en tiempo real.
          </p>
        </div>
      </template>
      <p v-else class="rs-hint" role="status">
        {{
          live.status === 'Scheduled'
            ? 'El viaje todavía no ha iniciado. La ubicación se habilita durante la ruta activa.'
            : 'Viaje finalizado o cancelado. El seguimiento de ubicación está detenido.'
        }}
      </p>
      <RouteMap
        v-if="!isActiveTrip(live.status) && (geometry || plannedGeometry)"
        :points="[]"
        :geometry="geometry"
        :planned-geometry="plannedGeometry"
        label="Mapa del viaje"
      />
      <section class="rs-panel rs-stack">
        <h3>
          {{ administrator ? 'Asistencia del viaje' : 'Estado de tu hijo' }}
        </h3>
        <p v-if="!passengers.length" class="rs-hint">
          No hay datos de asistencia autorizados para esta selección.
        </p>
        <p v-if="administrator && operationError" class="rs-hint" role="status">
          No se pudo consultar el padrón y el itinerario.
          <button type="button" class="rs-button-secondary" @click="loadOperation(true)">
            Reintentar
          </button>
        </p>
        <p v-else-if="administrator && !operation && passengers.length" class="rs-hint" role="status">
          Consultando los nombres del padrón…
        </p>
        <article
          v-for="p in passengers"
          :key="p.studentId"
          class="rs-row"
        >
          <strong>{{
            passengerNames.get(p.studentId) || studentNames[p.studentId] ||
            (administrator ? 'Nombre no disponible' : 'Alumno seleccionado')
          }}</strong><span class="rs-badge">{{
            passengerStatus(p.status)
          }}</span>
          <p v-if="p.boardedAt" class="rs-hint">
            Abordaje: {{ format(p.boardedAt) }}
          </p>
          <p v-if="p.alightedAt" class="rs-hint">
            Desembarque: {{ format(p.alightedAt) }}
          </p>
          <p v-if="p.absenceNote" class="rs-hint">{{ p.absenceNote }}</p>
        </article>
      </section>
      <template v-if="administrator"
        ><AppFeedback v-if="detailError" kind="error" :message="detailError" />
        <section class="rs-panel rs-stack">
          <h3>Incidencias de Tracking</h3>
          <p v-if="!incidents.length" class="rs-hint">
            Sin incidencias recibidas de esta fuente.
          </p>
          <article v-for="i in incidents" :key="i.incidentId" class="rs-row">
            <strong>{{ incidentLabel(i.type) }}</strong>
            <p>{{ i.detail }}</p>
            <p class="rs-hint">{{ format(i.occurredAt) }}</p>
          </article>
        </section>
        <section class="rs-panel rs-stack">
          <h3>Alertas operativas abiertas</h3>
          <p class="rs-hint">
            La proyección de Administration puede tardar en actualizarse. Su
            estado no sustituye el SOS de Tracking.
          </p>
          <p v-if="!alerts.length" class="rs-hint">
            No hay alertas abiertas recibidas para este viaje.
          </p>
          <article v-for="a in alerts" :key="a.id" class="rs-row">
            <strong
              >{{ incidentLabel(a.type) }} ·
              {{ severityLabel(a.severity) }}</strong
            >
            <p>{{ a.detail }}</p>
            <p class="rs-hint">
              {{ alertStatusLabel(a.status) }} · {{ format(a.occurredAt) }}
            </p>
            <div class="rs-actions">
              <button
                v-if="a.status === 'OPEN'"
                type="button"
                class="rs-button-secondary"
                :disabled="!!alertBusy"
                @click="acknowledge(a)"
              >
                Reconocer
              </button>
              <button
                v-if="a.status === 'OPEN' || a.status === 'ACKNOWLEDGED'"
                type="button"
                class="rs-button-primary"
                :disabled="!!alertBusy"
                @click="resolveIncident(a)"
              >
                Resolver incidente
              </button>
            </div>
          </article>
        </section></template
      >
    </template>
    <button
      class="rs-button-secondary"
      :disabled="loading || denied"
      @click="refresh"
    >
      Actualizar estado del viaje
    </button>
    <AppConfirmDialog
      :open="confirm"
      title="Cerrar alerta SOS"
      message="Confirma que la empresa ya atendió la situación con el conductor. Esta acción cierra el SOS; no finaliza el viaje ni sustituye la atención de la emergencia."
      confirm-label="Confirmar cierre de SOS"
      :busy="resolving"
      danger
      @cancel="confirm = false"
      @confirm="resolve"
    />
  </section>
</template>
