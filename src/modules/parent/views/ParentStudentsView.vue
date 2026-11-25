<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import AppFeedback from "@/shared/components/AppFeedback.vue";
import AppFormDialog from "@/shared/components/AppFormDialog.vue";
import AppConfirmDialog from "@/shared/components/AppConfirmDialog.vue";
import StudentFields from "@/shared/components/StudentFields.vue";
import PickupLocationFields from "@/shared/components/PickupLocationFields.vue";
import PrivateStudentPhoto from "@/shared/components/PrivateStudentPhoto.vue";
import {
  apiError,
  emptyStudent,
  studentPayload,
  validPoint,
  statusLabel,
} from "@/shared/utils/forms";
import {
  deleteStudent,
  enrollStudent,
  getMyStudents,
  getRouteOffer,
  registerStudent,
  getParentProfile,
  getMyGuardianLinks,
  updateStudent,
  uploadStudentPhoto,
  removeStudentPhoto,
  changeStudentPickup,
  withdrawStudent,
} from "../services/parentService";
const students = ref([]),
  links = ref([]),
  profile = ref(null),
  loading = ref(true),
  busy = ref(false),
  error = ref(""),
  notice = ref(""),
  formError = ref("");
const mode = ref(""),
  form = ref(emptyStudent()),
  selected = ref(null),
  code = ref(""),
  offer = ref(null),
  searchedCode = ref(""),
  pending = ref(null);
const profileError = ref(""),
  linksError = ref("");
const photo = ref(null),
  preview = ref("");
let offerGeneration = 0;
function clearPhoto() {
  if (preview.value) URL.revokeObjectURL(preview.value);
  preview.value = "";
  photo.value = null;
}
onBeforeUnmount(clearPhoto);
async function load() {
  loading.value = true;
  error.value = "";
  profileError.value = "";
  linksError.value = "";
  const results = await Promise.allSettled([
    getMyStudents(),
    getParentProfile(),
    getMyGuardianLinks(),
  ]);
  if (results[0].status === "fulfilled") students.value = results[0].value;
  else {
    students.value = [];
    error.value = apiError(results[0].reason);
  }
  if (results[1].status === "fulfilled") profile.value = results[1].value;
  else {
    profile.value = null;
    profileError.value =
      "No se pudo comprobar tu perfil. Reintenta antes de inscribir.";
  }
  if (results[2].status === "fulfilled") links.value = results[2].value;
  else {
    links.value = [];
    linksError.value =
      "No se pudieron consultar las revisiones. No se presupone autorización.";
  }
  loading.value = false;
}
function open(value, student = null) {
  selected.value = student;
  mode.value = value;
  formError.value = "";
  clearPhoto();
}
async function saveStudent() {
  if (busy.value) return;
  busy.value = true;
  formError.value = "";
  try {
    if (mode.value === "edit") {
      if (!form.value.firstName.trim() || !form.value.lastName.trim())
        throw new Error("Ingresa los nombres y apellidos del alumno.");
      await updateStudent(selected.value.id, form.value);
    } else {
      const payload = studentPayload(form.value);
      if (mode.value === "pickup")
        await changeStudentPickup(selected.value.id, payload.pickupLocation);
      else await registerStudent(form.value);
    }
    mode.value = "";
    notice.value =
      "Datos guardados. La revisión del vínculo y la inscripción se realizan por separado.";
    await load();
  } catch (e) {
    formError.value = apiError(e);
  } finally {
    busy.value = false;
  }
}
function editStudent(s) {
  // Prefilled only with the real data of the selected student.
  form.value = {
    firstName: s.firstName ?? "",
    lastName: s.lastName ?? "",
    birthDate: s.birthDate ? String(s.birthDate).slice(0, 10) : "",
    schoolName: s.schoolName ?? "",
    schoolGrade: s.schoolGrade ?? "",
  };
  open("edit", s);
}
function editPickup(s) {
  form.value = {
    ...emptyStudent(),
    firstName: s.firstName || s.fullName,
    lastName: s.lastName || "",
    ...s.pickupLocation,
  };
  open("pickup", s);
}
function openEnrollment(s) {
  code.value = "";
  offer.value = null;
  searchedCode.value = "";
  ++offerGeneration;
  open("enroll", s);
}
function invalidateOffer() {
  offer.value = null;
  searchedCode.value = "";
  ++offerGeneration;
}
async function search() {
  if (busy.value || !code.value.trim()) return;
  const version = ++offerGeneration,
    requested = code.value.trim();
  busy.value = true;
  formError.value = "";
  offer.value = null;
  try {
    const result = await getRouteOffer(requested);
    if (version === offerGeneration && requested === code.value.trim()) {
      offer.value = result;
      searchedCode.value = requested;
    }
  } catch (e) {
    if (version === offerGeneration) formError.value = apiError(e);
  } finally {
    busy.value = false;
  }
}
const canEnroll = computed(
  () =>
    !busy.value &&
    profile.value?.isComplete &&
    offer.value?.acceptsEnrollments &&
    offer.value?.status === "ACTIVE" &&
    searchedCode.value === code.value.trim(),
);
async function enroll() {
  if (!canEnroll.value) return;
  busy.value = true;
  formError.value = "";
  try {
    // Profile may have changed in another tab; check it again before writing.
    profile.value = await getParentProfile();
    if (!profile.value?.isComplete)
      throw new Error(
        "Completa tu perfil de contacto antes de inscribir al alumno.",
      );
    await enrollStudent(selected.value.id, searchedCode.value);
    mode.value = "";
    notice.value =
      "Inscripción registrada. El seguimiento requiere que la empresa verifique tu vínculo con el alumno. La parada puede tardar unos segundos en aparecer.";
    await load();
  } catch (e) {
    formError.value = apiError(e);
  } finally {
    busy.value = false;
  }
}
function choosePhoto(event) {
  clearPhoto();
  formError.value = "";
  const file = event.target.files?.[0];
  if (!file) return;
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size > 1024 * 1024 ||
    !file.size
  ) {
    formError.value = "Selecciona una imagen JPEG, PNG o WebP de hasta 1 MB.";
    event.target.value = "";
    return;
  }
  photo.value = file;
  preview.value = URL.createObjectURL(file);
}
async function savePhoto() {
  if (busy.value || !photo.value) return;
  busy.value = true;
  formError.value = "";
  try {
    await uploadStudentPhoto(selected.value.id, photo.value);
    clearPhoto();
    mode.value = "";
    notice.value = "Foto guardada de forma privada.";
    await load();
  } catch (e) {
    formError.value = apiError(e);
  } finally {
    busy.value = false;
  }
}
async function confirm() {
  if (!pending.value || busy.value) return;
  busy.value = true;
  error.value = "";
  try {
    await pending.value.action();
    notice.value = "Cambio guardado.";
    await load();
  } catch (e) {
    error.value = apiError(e);
  } finally {
    pending.value = null;
    busy.value = false;
  }
}
const studentLinks = (id) =>
  links.value.filter((link) => link.studentId === id);
onMounted(load);
</script>
<template>
  <div class="rs-workspace">
    <header class="rs-page-header">
      <h1>Mis estudiantes</h1>
      <p>
        Administra sus datos, el punto de recojo y las inscripciones al
        transporte escolar.
      </p>
    </header>
    <AppFeedback
      v-if="error"
      kind="error"
      :message="error"
      retry-label="Volver a intentar"
      @retry="load"
    /><AppFeedback v-if="notice" kind="success" :message="notice" />
    <AppFeedback
      v-if="profileError"
      kind="error"
      :message="profileError"
      retry-label="Volver a intentar"
      @retry="load"
    /><AppFeedback
      v-if="linksError"
      kind="error"
      :message="linksError"
      retry-label="Volver a intentar"
      @retry="load"
    />
    <div v-if="!loading && !profile?.isComplete" class="rs-panel">
      <p>
        Completa tu teléfono y datos de contacto antes de inscribir a un alumno.
      </p>
      <RouterLink
        class="rs-button-secondary mt-3"
        :to="{ name: 'parent-profile' }"
        >Completar mi perfil</RouterLink
      >
    </div>
    <div class="rs-actions">
      <button
        class="rs-button-primary"
        @click="
          form = emptyStudent();
          open('student');
        "
      >
        Registrar estudiante</button
      ><button
        class="rs-button-secondary"
        :disabled="loading || busy"
        @click="load"
      >
        Actualizar estudiantes
      </button>
    </div>
    <AppFeedback
      v-if="loading"
      kind="loading"
      message="Cargando estudiantes…"
    />
    <AppFeedback
      v-else-if="!students.length && !error"
      kind="empty"
      message="Aún no registraste estudiantes."
    />
    <section v-else class="rs-stack">
      <article
        v-for="s in students"
        :key="s.id"
        class="rs-panel rs-stack"
        :aria-label="`Estudiante ${s.fullName}`"
      >
        <PrivateStudentPhoto
          v-if="s.photo"
          :student-id="s.id"
          :version="s.photo.version"
        />
        <h2>{{ s.fullName }}</h2>
        <p>
          {{ s.schoolName || "Colegio no registrado" }} ·
          {{ s.schoolGrade || "Grado no registrado" }}
        </p>
        <p class="rs-hint">{{ s.pickupLocation?.address }}</p>
        <div class="rs-actions">
          <button
            class="rs-button-primary"
            :disabled="busy || !profile?.isComplete"
            @click="openEnrollment(s)"
          >
            Inscribir a {{ s.firstName || s.fullName }}</button
          ><button class="rs-button-secondary" :disabled="busy" @click="editStudent(s)">
            Editar datos de {{ s.firstName || s.fullName }}</button
          ><button class="rs-button-secondary" @click="editPickup(s)">
            Editar recojo de {{ s.firstName || s.fullName }}</button
          ><button class="rs-button-secondary" @click="open('photo', s)">
            {{ s.photo ? "Cambiar foto" : "Agregar foto" }}</button
          ><button
            v-if="s.photo"
            class="rs-button-secondary"
            @click="
              pending = {
                title: 'Eliminar foto',
                message: 'Se eliminará la foto privada del alumno.',
                action: () => removeStudentPhoto(s.id),
              }
            "
          >
            Eliminar foto</button
          ><button
            class="rs-button-secondary"
            :disabled="busy"
            @click="
              pending = {
                title: 'Eliminar estudiante',
                message:
                  'Se retirará al alumno de sus rutas. Esta acción afecta su servicio de transporte.',
                action: () => deleteStudent(s.id),
              }
            "
          >
            Eliminar estudiante
          </button>
        </div>
        <section>
          <h3>Revisión de acceso</h3>
          <p v-if="!studentLinks(s.id).length" class="rs-hint">
            Sin revisión asociada a una operación. La inscripción no autoriza el
            seguimiento por sí sola.
          </p>
          <p
            v-for="l in studentLinks(s.id)"
            :key="l.organizationId"
            class="rs-hint"
          >
            {{
              s.enrollments?.find((e) => e.organizationId === l.organizationId)
                ?.organizationName || "Empresa de transporte"
            }}: <span class="rs-badge" :data-status="l.status">{{ statusLabel(l.status) }}</span>
          </p>
        </section>
        <section v-if="s.enrollments?.length">
          <h3>Inscripciones</h3>
          <div v-for="e in s.enrollments" :key="e.id" class="rs-row">
            <strong
              >{{ e.routeName }} ·
              {{ e.direction === "RETURN" ? "Retorno" : "Ida" }}</strong
            ><span class="rs-badge" :data-status="e.status">{{ statusLabel(e.status) }}</span>
            <p class="rs-hint">
              {{
                e.stop?.name || "Parada pendiente de asignación o propagación"
              }}
            </p>
            <button
              v-if="e.status === 'ACTIVE'"
              class="rs-button-secondary"
              :disabled="busy"
              @click="
                pending = {
                  title: 'Retirar inscripción',
                  message:
                    'Se dejará de prestar este servicio. La autorización de acceso al historial se administra por separado.',
                  action: () => withdrawStudent(s.id, e.id),
                }
              "
            >
              Retirar de {{ e.routeName }}
            </button>
          </div>
        </section>
      </article>
    </section>
    <AppFormDialog
      v-if="mode"
      :title="
        {
          student: 'Registrar estudiante',
          edit: 'Editar datos del estudiante',
          pickup: 'Editar ubicación de recojo',
          enroll: 'Inscribir en una ruta',
          photo: 'Foto privada del alumno',
        }[mode]
      "
      :busy="busy"
      @close="
        mode = '';
        clearPhoto();
        invalidateOffer();
      "
    >
      <AppFeedback
        v-if="formError"
        kind="error"
        :message="formError"
        class="mb-4"
      />
      <form
        v-if="mode === 'student' || mode === 'pickup'"
        class="rs-stack"
        @submit.prevent="saveStudent"
      >
        <StudentFields
          v-if="mode === 'student'"
          v-model="form"
        /><PickupLocationFields v-else v-model="form" /><button
          class="rs-button-primary"
          :disabled="busy"
        >
          {{ busy ? "Guardando…" : "Guardar estudiante" }}
        </button>
      </form>
      <form v-if="mode === 'edit'" class="rs-stack" @submit.prevent="saveStudent">
        <label>Nombres<input v-model="form.firstName" required :disabled="busy" /></label>
        <label>Apellidos<input v-model="form.lastName" required :disabled="busy" /></label>
        <label>Fecha de nacimiento<input v-model="form.birthDate" type="date" :disabled="busy" /></label>
        <label>Colegio<input v-model="form.schoolName" :disabled="busy" /></label>
        <label>Grado<input v-model="form.schoolGrade" :disabled="busy" /></label>
        <button class="rs-button-primary" :disabled="busy">
          {{ busy ? "Guardando…" : "Guardar cambios" }}
        </button>
      </form>
      <div v-if="mode === 'enroll'" class="rs-stack">
        <form class="rs-stack" @submit.prevent="search">
          <label
            >Código de inscripción<input
              v-model="code"
              required
              maxlength="40"
              :disabled="busy"
              @input="invalidateOffer" /></label
          ><button class="rs-button-secondary" :disabled="busy || !code.trim()">
            Consultar ruta
          </button>
        </form>
        <div v-if="offer" class="rs-panel rs-stack">
          <h3>{{ offer.routeName }}</h3>
          <p>
            {{ offer.organizationName }} ·
            {{ offer.direction === "RETURN" ? "Retorno" : "Ida" }} ·
            {{ offer.departureTime?.slice(0, 5) }}–{{
              offer.estimatedArrivalTime?.slice(0, 5)
            }}
          </p>
          <p>
            {{
              offer.availableSeats == null
                ? "Cupos sujetos a validación"
                : offer.availableSeats + " cupos disponibles"
            }}
          </p>
          <p v-if="!offer.acceptsEnrollments" class="rs-error">
            Esta ruta no acepta inscripciones en este momento.
          </p>
          <p class="rs-hint">
            La empresa debe verificar tu vínculo para habilitar el seguimiento.
            La inscripción puede crear tu parada de recojo automáticamente.
          </p>
          <button
            class="rs-button-primary"
            :disabled="!canEnroll"
            @click="enroll"
          >
            Confirmar inscripción
          </button>
        </div>
      </div>
      <form
        v-if="mode === 'photo'"
        class="rs-stack"
        @submit.prevent="savePhoto"
      >
        <p class="rs-hint">
          JPEG, PNG o WebP, hasta 1 MB. Solo las cuentas autorizadas pueden
          descargarla.
        </p>
        <label
          >Imagen del alumno<input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            :disabled="busy"
            @change="choosePhoto" /></label
        ><img
          v-if="preview"
          :src="preview"
          alt="Vista previa de la foto"
          class="rs-private-photo"
        /><button class="rs-button-primary" :disabled="busy || !photo">
          Guardar foto
        </button>
      </form>
    </AppFormDialog>
    <AppConfirmDialog
      :open="!!pending"
      :title="pending?.title"
      :message="pending?.message"
      :busy="busy"
      danger
      @cancel="pending = null"
      @confirm="confirm"
    />
  </div>
</template>
