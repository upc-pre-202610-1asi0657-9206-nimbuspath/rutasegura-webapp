<script setup>
import { computed, onMounted, ref } from "vue";
import AppConfirmDialog from "@/shared/components/AppConfirmDialog.vue";
import AppFormDialog from "@/shared/components/AppFormDialog.vue";
import AppFeedback from "@/shared/components/AppFeedback.vue";
import RouteMap from "@/shared/components/RouteMap.vue";
import PickupLocationFields from "@/shared/components/PickupLocationFields.vue";
import { apiError, validPoint } from "@/shared/utils/forms";
import {
  getRouteById,
  deactivateRoute,
  releaseRouteResources,
  regenerateEnrollmentCode,
  renameRoute,
  changeRouteSchedule,
  getRouteTripRecords,
} from "../services/adminService";
import {
  getOperationStudents,
  addStop,
  updateStop,
  removeStop,
  reorderStops,
  assignStudent,
  unassignStudent,
  calculateItinerary,
} from "../services/administrationService";
const props = defineProps({ routeId: { type: String, required: true } });
const emit = defineEmits(["close", "changed"]);
const route = ref(null),
  students = ref([]),
  loading = ref(true),
  busy = ref(false),
  error = ref(""),
  notice = ref("");
const editing = ref(null),
  selectedStop = ref(""),
  selectedStudent = ref("");
const empty = () => ({
  name: "",
  address: "",
  reference: "",
  latitude: "",
  longitude: "",
  locationConfirmed: false,
});
const stop = ref(empty());
const stops = computed(() =>
  [...(route.value?.stops || [])].sort((a, b) => a.sequence - b.sequence),
);
async function load() {
  loading.value = true;
  error.value = "";
  try {
    [route.value, students.value] = await Promise.all([
      getRouteById(props.routeId),
      getOperationStudents(),
    ]);
    syncRouteForms();
  } catch (e) {
    error.value = apiError(e);
  } finally {
    loading.value = false;
  }
}
async function mutate(
  fn,
  message = "Cambio guardado. La agenda y las inscripciones pueden tardar unos segundos en reflejarlo.",
) {
  if (busy.value) return;
  busy.value = true;
  error.value = "";
  notice.value = "";
  try {
    await fn();
    await load();
    notice.value = message;
    emit("changed");
  } catch (e) {
    error.value = apiError(e);
  } finally {
    busy.value = false;
  }
}
function edit(s) {
  editing.value = s.id;
  stop.value = {
    ...empty(),
    name: s.name,
    address: s.address || "",
    latitude: s.latitude,
    longitude: s.longitude,
  };
}
async function saveStop() {
  if (
    !validPoint(stop.value.latitude, stop.value.longitude) ||
    !stop.value.locationConfirmed
  ) {
    error.value = "Confirma las coordenadas y dirección de la parada.";
    return;
  }
  const payload = {
    name: stop.value.name.trim(),
    address: stop.value.address.trim(),
    latitude: Number(stop.value.latitude),
    longitude: Number(stop.value.longitude),
  };
  await mutate(async () => {
    if (editing.value) await updateStop(props.routeId, editing.value, payload);
    else await addStop(props.routeId, payload);
    editing.value = null;
    stop.value = empty();
  }, "Parada guardada. El itinerario anterior quedó invalidado; vuelve a calcularlo cuando termines los cambios.");
}
function move(index, delta) {
  const ids = stops.value.map((s) => s.id);
  [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
  return mutate(
    () => reorderStops(props.routeId, ids),
    "Orden guardado. Vuelve a calcular el itinerario.",
  );
}
const pending = ref(null);
function ask(label, action) {
  pending.value = { label, action };
}
async function confirmPending() {
  const action = pending.value?.action;
  if (!action || busy.value) return;
  await mutate(action);
  pending.value = null;
}

// Name/schedule forms are initialized only from the route returned by the backend.
const WEEK_DAYS = [
  { value: "Monday", label: "Lun" },
  { value: "Tuesday", label: "Mar" },
  { value: "Wednesday", label: "Mié" },
  { value: "Thursday", label: "Jue" },
  { value: "Friday", label: "Vie" },
  { value: "Saturday", label: "Sáb" },
  { value: "Sunday", label: "Dom" },
];
const nameForm = ref(""),
  scheduleForm = ref({ departureTime: "", estimatedArrivalTime: "", operatingDays: [] });
function syncRouteForms() {
  const schedule = route.value?.schedule;
  nameForm.value = route.value?.name ?? "";
  scheduleForm.value = {
    departureTime: String(schedule?.departureTime ?? "").slice(0, 5),
    estimatedArrivalTime: String(schedule?.estimatedArrivalTime ?? "").slice(0, 5),
    operatingDays: Array.isArray(schedule?.operatingDays) ? [...schedule.operatingDays] : [],
  };
}
function toggleOperatingDay(day) {
  const days = scheduleForm.value.operatingDays;
  scheduleForm.value.operatingDays = days.includes(day)
    ? days.filter((d) => d !== day)
    : [...days, day];
}
const canRename = computed(
  () => nameForm.value.trim() && nameForm.value.trim() !== route.value?.name,
);
const canChangeSchedule = computed(
  () =>
    scheduleForm.value.departureTime &&
    scheduleForm.value.estimatedArrivalTime &&
    scheduleForm.value.operatingDays.length > 0,
);
const records = ref([]),
  recordsLoading = ref(false),
  recordsError = ref(""),
  recordsLoaded = ref(false);
async function loadRecords() {
  recordsLoading.value = true;
  recordsError.value = "";
  try {
    records.value = await getRouteTripRecords(props.routeId);
    recordsLoaded.value = true;
  } catch (e) {
    recordsError.value = apiError(e);
  } finally {
    recordsLoading.value = false;
  }
}
const recordId = (r, i) => r.tripId ?? r.id ?? i;
const recordDate = (r) => r.serviceDate ?? r.completedAt ?? r.endedAt ?? r.startedAt ?? null;
const recordDetails = (r) =>
  Object.entries(r).filter(
    ([k, v]) =>
      !/(^id$|Id$)/.test(k) &&
      !["serviceDate", "completedAt", "endedAt", "startedAt"].includes(k) &&
      ["string", "number", "boolean"].includes(typeof v),
  );

onMounted(() => {
  load();
  loadRecords();
});
</script>
<template>
  <AppFormDialog
    :title="`Plan de ruta${route ? ': ' + route.name : ''}`"
    :busy="busy"
    @close="emit('close')"
  >
    <div class="rs-stack">
      <AppFeedback v-if="loading" kind="loading" message="Cargando plan…" />
      <AppFeedback v-if="error" kind="error" :message="error" />
      <AppFeedback v-if="notice" kind="success" :message="notice" />
      <template v-if="route">
        <form
          class="rs-panel rs-stack"
          @submit.prevent="mutate(() => renameRoute(routeId, nameForm), 'Nombre de la ruta actualizado.')"
        >
          <h3>Nombre de la ruta</h3>
          <label
            >Nombre<input v-model="nameForm" required :disabled="busy"
          /></label>
          <button class="rs-button-secondary" :disabled="busy || !canRename">
            Renombrar ruta
          </button>
        </form>
        <form
          class="rs-panel rs-stack"
          @submit.prevent="mutate(() => changeRouteSchedule(routeId, { ...scheduleForm, timeZoneId: route.schedule?.timeZoneId }), 'Horario actualizado.')"
        >
          <h3>Horario</h3>
          <label
            >Salida<input v-model="scheduleForm.departureTime" type="time" required :disabled="busy"
          /></label>
          <label
            >Llegada estimada<input v-model="scheduleForm.estimatedArrivalTime" type="time" required :disabled="busy"
          /></label>
          <fieldset class="rs-actions">
            <legend>Días de operación</legend>
            <label v-for="d in WEEK_DAYS" :key="d.value">
              <input
                type="checkbox"
                :checked="scheduleForm.operatingDays.includes(d.value)"
                :disabled="busy"
                @change="toggleOperatingDay(d.value)"
              />
              {{ d.label }}
            </label>
          </fieldset>
          <button class="rs-button-secondary" :disabled="busy || !canChangeSchedule">
            Guardar horario
          </button>
        </form>
        <section class="rs-panel rs-stack">
          <h3>Historial de viajes completados</h3>
          <AppFeedback v-if="recordsLoading" kind="loading" message="Cargando historial…" />
          <AppFeedback v-if="recordsError" kind="error" :message="recordsError" retry-label="Volver a intentar" @retry="loadRecords" />
          <p v-if="recordsLoaded && !records.length && !recordsError" class="rs-hint">
            Esta ruta aún no tiene viajes completados.
          </p>
          <article v-for="(r, i) in records" :key="recordId(r, i)" class="rs-row">
            <strong v-if="recordDate(r)">{{ new Date(recordDate(r)).toLocaleString("es-PE") }}</strong>
            <p v-for="[k, v] in recordDetails(r)" :key="k" class="rs-hint">{{ k }}: {{ v }}</p>
          </article>
        </section>
        <RouteMap :points="stops" :geometry="route.itinerary?.geometry" />
        <p v-if="route.itinerary" class="rs-hint">
          {{ (route.itinerary.distanceMeters / 1000).toFixed(2) }} km ·
          {{ Math.ceil(route.itinerary.durationSeconds / 60) }} min estimados ·
          calculado
          {{ new Date(route.itinerary.calculatedAt).toLocaleString("es-PE") }}
        </p>
        <p v-else class="rs-hint">
          Sin itinerario vial calculado. Las paradas no se unen con una ruta
          ficticia.
        </p>
        <button
          class="rs-button-primary"
          :disabled="busy || stops.length < 2"
          @click="
            mutate(
              () => calculateItinerary(routeId),
              'Itinerario vial calculado y guardado.',
            )
          "
        >
          Calcular itinerario vial
        </button>
        <p v-if="stops.length < 2" class="rs-hint">
          Agrega al menos dos paradas para calcular el itinerario.
        </p>
        <section class="rs-stack">
          <h3>Paradas en orden</h3>
          <p v-if="!stops.length" class="rs-hint">
            Agrega la primera parada para preparar la ruta desde cero.
          </p>
          <article v-for="(s, index) in stops" :key="s.id" class="rs-row">
            <strong>{{ index + 1 }}. {{ s.name }}</strong>
            <p class="rs-hint">
              {{ s.address }} · {{ s.studentIds?.length || 0 }} alumnos
            </p>
            <div class="rs-actions">
              <button
                type="button"
                class="rs-button-secondary"
                :disabled="busy"
                @click="edit(s)"
              >
                Editar {{ s.name }}</button
              ><button
                type="button"
                class="rs-button-secondary"
                :disabled="busy || index === 0"
                :aria-label="`Subir ${s.name}`"
                @click="move(index, -1)"
              >
                Subir</button
              ><button
                type="button"
                class="rs-button-secondary"
                :disabled="busy || index === stops.length - 1"
                :aria-label="`Bajar ${s.name}`"
                @click="move(index, 1)"
              >
                Bajar</button
              ><button
                type="button"
                class="rs-button-secondary"
                :disabled="busy || !!s.studentIds?.length"
                @click="
                  ask('Eliminar parada vacía', () => removeStop(routeId, s.id))
                "
              >
                Eliminar parada
              </button>
            </div>
            <div
              v-for="sid in s.studentIds || []"
              :key="sid"
              class="rs-actions"
            >
              <span>{{
                students.find((st) => st.studentId === sid)?.fullName ||
                "Alumno asignado"
              }}</span
              ><button
                class="rs-button-secondary"
                :disabled="busy"
                @click="
                  ask(
                    'Quitar alumno del plan (no cancela su inscripción)',
                    () => unassignStudent(routeId, sid),
                  )
                "
              >
                Quitar del plan
              </button>
            </div>
          </article>
        </section>
        <form class="rs-panel rs-stack" @submit.prevent="saveStop">
          <h3>{{ editing ? "Editar parada" : "Agregar parada" }}</h3>
          <label
            >Nombre de parada<input
              v-model="stop.name"
              required
              maxlength="100" /></label
          ><PickupLocationFields v-model="stop" />
          <div class="rs-actions">
            <button class="rs-button-primary" :disabled="busy">
              Guardar parada</button
            ><button
              v-if="editing"
              class="rs-button-secondary"
              type="button"
              @click="
                editing = null;
                stop = empty();
              "
            >
              Cancelar edición
            </button>
          </div>
        </form>
        <form
          class="rs-panel rs-stack"
          @submit.prevent="
            mutate(() => assignStudent(routeId, selectedStop, selectedStudent))
          "
        >
          <h3>Asignar alumno a una parada</h3>
          <p class="rs-hint">
            El padrón está limitado a tu operación. Esta asignación no verifica
            tutela ni crea una inscripción.
          </p>
          <label
            >Alumno del padrón<select v-model="selectedStudent" required>
              <option value="" disabled>Selecciona un alumno</option>
              <option
                v-for="s in students.filter((s) => s.status === 'ACTIVE')"
                :key="s.studentId"
                :value="s.studentId"
              >
                {{ s.fullName }}
              </option>
            </select></label
          ><label
            >Parada<select v-model="selectedStop" aria-label="Parada" required>
              <option value="" disabled>Selecciona una parada</option>
              <option v-for="s in stops" :key="s.id" :value="s.id">
                {{ s.sequence }} · {{ s.name }}
              </option>
            </select></label
          ><button
            class="rs-button-secondary"
            :disabled="busy || !selectedStop || !selectedStudent"
          >
            Asignar alumno
          </button>
        </form>
        <section class="rs-panel rs-stack">
          <h3>Publicación y recursos</h3>
          <p class="rs-hint">
            Desactivar detiene nuevas inscripciones. Liberar recursos o cambiar
            el código puede afectar la planificación y los códigos compartidos.
          </p>
          <div class="rs-actions">
            <button
              v-if="route.status === 'ACTIVE'"
              class="rs-button-secondary"
              :disabled="busy"
              @click="ask('Desactivar ruta', () => deactivateRoute(routeId))"
            >
              Desactivar ruta</button
            ><button
              v-if="route.assignment"
              class="rs-button-secondary"
              :disabled="busy"
              @click="
                ask('Liberar conductor y vehículo', () =>
                  releaseRouteResources(routeId),
                )
              "
            >
              Liberar recursos</button
            ><button
              class="rs-button-secondary"
              :disabled="busy"
              @click="
                ask('Generar código nuevo e invalidar el anterior', () =>
                  regenerateEnrollmentCode(routeId),
                )
              "
            >
              Renovar código
            </button>
          </div>
        </section>
        <AppConfirmDialog :open="!!pending" title="Confirmar cambio de plan" :message="pending?.label" confirm-label="Confirmar cambio" :busy="busy" danger @cancel="pending = null" @confirm="confirmPending" />
      </template>
    </div>
  </AppFormDialog>
</template>
