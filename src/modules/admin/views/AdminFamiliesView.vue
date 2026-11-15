<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import AppFeedback from "@/shared/components/AppFeedback.vue";
import AppFormDialog from "@/shared/components/AppFormDialog.vue";
import {
  readOperationDraft,
  writeOperationDraft,
  clearOperationDraft,
} from "@/shared/api/authSessionStorage";
import StudentFields from "@/shared/components/StudentFields.vue";
import PrivateStudentPhoto from "@/shared/components/PrivateStudentPhoto.vue";
import {
  apiError,
  emptyStudent,
  studentPayload,
  statusLabel,
} from "@/shared/utils/forms";
import {
  getOperationGuardians,
  getOperationStudents,
  getGuardianLinks,
  createParentAccount,
  registerOperationGuardian,
  registerOperationStudent,
  reviewGuardianLink,
  getEnrollments,
  cancelEnrollment,
} from "../services/administrationService";
const guardians = ref([]),
  students = ref([]),
  links = ref([]),
  enrollments = ref([]);
const loading = ref(true),
  busy = ref(false),
  error = ref(""),
  notice = ref(""),
  mode = ref(""),
  formError = ref("");
const account = reactive({
  firstName: "",
  lastName: "",
  email: "",
  password: "",
});
const pendingContactId = ref(readOperationDraft("parent-contact"));
const guardian = reactive({
  guardianUserId: pendingContactId.value,
  phoneNumber: "",
  documentNumber: "",
});
const student = ref(emptyStudent()),
  guardianId = ref(""),
  reference = ref(""),
  selected = ref(null),
  verify = ref(true),
  showEnded = ref(false);
const studentName = (id) =>
  students.value.find((s) => s.studentId === id)?.fullName || "Alumno";
const guardianName = (id) =>
  guardians.value.find((g) => g.userId === id)?.fullName || "Tutor vinculado";
const visibleEnrollments = computed(() =>
  enrollments.value.filter(
    (e) => showEnded.value || e.enrollmentStatus === "ACTIVE",
  ),
);
async function load() {
  loading.value = true;
  error.value = "";
  try {
    [guardians.value, students.value, links.value, enrollments.value] =
      await Promise.all([
        getOperationGuardians(),
        getOperationStudents(),
        getGuardianLinks(),
        getEnrollments(undefined, false),
      ]);
  } catch (e) {
    guardians.value = [];
    students.value = [];
    links.value = [];
    enrollments.value = [];
    error.value = apiError(e);
  } finally {
    loading.value = false;
  }
}
function open(value) {
  if (value === "account")
    Object.assign(account, {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    });
  mode.value = value;
  formError.value = "";
}
async function createAccount() {
  if (busy.value) return;
  busy.value = true;
  formError.value = "";
  try {
    const result = await createParentAccount({ ...account });
    guardian.guardianUserId = result.id;
    guardian.phoneNumber = "";
    guardian.documentNumber = "";
    pendingContactId.value = result.id;
    writeOperationDraft("parent-contact", result.id);
    account.password = "";
    mode.value = "contact";
    notice.value =
      "Cuenta creada. Falta registrar el contacto en tu operación. Puedes retomar este paso con el identificador recibido.";
  } catch (e) {
    formError.value = apiError(e);
  } finally {
    busy.value = false;
  }
}
async function save() {
  if (busy.value) return;
  busy.value = true;
  formError.value = "";
  try {
    if (mode.value === "contact") {
      await registerOperationGuardian({
        ...guardian,
        documentNumber: guardian.documentNumber.trim() || null,
      });
      if (guardian.guardianUserId === pendingContactId.value) {
        clearOperationDraft("parent-contact");
        pendingContactId.value = "";
      }
    } else if (mode.value === "student")
      await registerOperationStudent(
        guardianId.value,
        studentPayload(student.value),
      );
    else if (mode.value === "review")
      await reviewGuardianLink(
        selected.value,
        verify.value,
        reference.value.trim(),
      );
    else
      await cancelEnrollment(
        selected.value.enrollmentId,
        reference.value.trim() || null,
      );
    notice.value =
      mode.value === "contact"
        ? "Contacto registrado o ya existente en la operación. El vínculo con el alumno requiere una revisión aparte."
        : mode.value === "review"
          ? "Revisión guardada. El permiso se vuelve a comprobar al consultar o recibir actualizaciones."
          : "Cambio guardado. La agenda y las inscripciones pueden tardar unos segundos en actualizarse.";
    mode.value = "";
    await load();
  } catch (e) {
    formError.value = apiError(e);
  } finally {
    busy.value = false;
  }
}
function review(link, approve) {
  selected.value = link;
  verify.value = approve;
  reference.value = "";
  open("review");
}
onMounted(load);
</script>
<template>
  <div class="rs-workspace">
    <header class="rs-page-header">
      <h1>Familias y alumnos</h1>
      <p>
        Registra el contacto, incorpora al alumno y revisa su vínculo antes de
        autorizar el seguimiento.
      </p>
    </header>
    <AppFeedback
      v-if="error"
      kind="error"
      :message="error"
      retry-label="Volver a intentar"
      @retry="load"
    /><AppFeedback v-if="notice" kind="success" :message="notice" />
    <section v-if="pendingContactId" class="rs-panel rs-stack">
      <strong>Cuenta creada con contacto pendiente</strong>
      <p class="rs-hint">
        Identificador de recuperación: {{ pendingContactId }}. Retoma el
        contacto sin volver a crear la cuenta. Este recordatorio se elimina al
        cerrar sesión.
      </p>
      <button
        class="rs-button-secondary"
        @click="
          guardian.guardianUserId = pendingContactId;
          open('contact');
        "
      >
        Retomar contacto pendiente
      </button>
    </section>
    <div class="rs-actions">
      <button class="rs-button-primary" @click="open('account')">
        Crear cuenta de tutor</button
      ><button
        class="rs-button-secondary"
        @click="
          guardian.guardianUserId = '';
          guardian.phoneNumber = '';
          guardian.documentNumber = '';
          open('contact');
        "
      >
        Registrar contacto existente</button
      ><button
        class="rs-button-secondary"
        @click="
          student = emptyStudent();
          guardianId = '';
          open('student');
        "
      >
        Registrar alumno</button
      ><button
        class="rs-button-secondary"
        :disabled="loading || busy"
        @click="load"
      >
        Actualizar familias
      </button>
    </div>
    <AppFeedback v-if="loading" kind="loading" message="Cargando familias…" />
    <template v-else>
      <section class="rs-panel rs-stack">
        <h2>Tutores de la operación</h2>
        <p v-if="!guardians.length" class="rs-hint">
          No hay contactos registrados ni solicitudes asociadas.
        </p>
        <article v-for="g in guardians" :key="g.userId" class="rs-row">
          <h3>{{ g.fullName || "Tutor" }}</h3>
          <p>{{ g.email }} · {{ g.phoneNumber || "Contacto pendiente" }}</p>
          <button
            class="rs-button-secondary"
            @click="
              guardian.guardianUserId = g.userId;
              guardian.phoneNumber = g.phoneNumber || '';
              guardian.documentNumber = g.documentNumber || '';
              open('contact');
            "
          >
            Registrar contacto de {{ g.fullName || "tutor" }}
          </button>
        </article>
      </section>
      <section class="rs-panel rs-stack">
        <h2>Alumnos del padrón</h2>
        <p v-if="!students.length" class="rs-hint">
          Aún no hay alumnos en tu operación.
        </p>
        <article v-for="s in students" :key="s.studentId" class="rs-row">
          <PrivateStudentPhoto
            v-if="s.photoUrl"
            :student-id="s.studentId"
            :version="s.photoUrl"
          />
          <h3>{{ s.fullName }}</h3>
          <p>
            {{ s.schoolName || "Colegio no registrado" }} ·
            {{ guardianName(s.guardianUserId) }}
          </p>
          <p class="rs-hint">{{ s.pickupLocation?.address }}</p>
          <span class="rs-badge" :data-status="s.status">{{ statusLabel(s.status) }}</span>
        </article>
      </section>
      <section class="rs-panel rs-stack">
        <h2>Verificación de vínculos</h2>
        <p class="rs-hint">
          Inscribir al alumno no acredita tutela. Revisa la relación según la
          política de tu operación y deja una referencia. Revocar acceso no
          cancela la inscripción al servicio.
        </p>
        <p v-if="!links.length" class="rs-hint">No hay vínculos por revisar.</p>
        <article
          v-for="link in links"
          :key="`${link.guardianUserId}-${link.studentId}`"
          class="rs-row"
        >
          <h3>
            {{ studentName(link.studentId) }} ·
            {{ guardianName(link.guardianUserId) }}
          </h3>
          <span class="rs-badge" :data-status="link.status">{{ statusLabel(link.status) }}</span>
          <p v-if="link.reviewedAt" class="rs-hint">
            Revisado {{ new Date(link.reviewedAt).toLocaleString("es-PE") }} ·
            {{ link.reference }}
          </p>
          <div class="rs-actions">
            <button
              v-if="link.status !== 'VERIFIED'"
              class="rs-button-primary"
              :disabled="busy"
              @click="review(link, true)"
            >
              Verificar vínculo de {{ studentName(link.studentId) }}</button
            ><button
              v-if="link.status !== 'REVOKED'"
              class="rs-button-secondary"
              :disabled="busy"
              @click="review(link, false)"
            >
              Revocar acceso de {{ studentName(link.studentId) }}
            </button>
          </div>
        </article>
      </section>
      <section class="rs-panel rs-stack">
        <h2>Inscripciones al servicio</h2>
        <p class="rs-hint">
          La familia confirma su inscripción con el código de una ruta activa.
          Cancelar libera el servicio; la autorización histórica se revoca por
          separado.
        </p>
        <label class="rs-check"
          ><input v-model="showEnded" type="checkbox" />Mostrar también
          finalizadas</label
        >
        <p v-if="!visibleEnrollments.length" class="rs-hint">
          Sin inscripciones para este filtro.
        </p>
        <article
          v-for="e in visibleEnrollments"
          :key="e.enrollmentId"
          class="rs-row"
        >
          <h3>{{ e.fullName }} · {{ e.routeName }}</h3>
          <span class="rs-badge" :data-status="e.enrollmentStatus">{{ statusLabel(e.enrollmentStatus) }}</span>
          <p class="rs-hint">
            {{ e.guardian?.fullName }} ·
            {{ e.stop?.name || "Parada pendiente de propagación"
            }}<span v-if="e.endReason"> · {{ e.endReason }}</span>
          </p>
          <button
            v-if="e.enrollmentStatus === 'ACTIVE'"
            class="rs-button-secondary"
            @click="
              selected = e;
              reference = '';
              open('cancel');
            "
          >
            Cancelar inscripción de {{ e.fullName }}
          </button>
        </article>
      </section>
    </template>
    <AppFormDialog
      v-if="mode"
      :title="
        {
          account: 'Crear cuenta de tutor',
          contact: 'Registrar contacto en la operación',
          student: 'Registrar alumno',
          review: verify ? 'Verificar vínculo' : 'Revocar acceso',
          cancel: 'Cancelar inscripción',
        }[mode]
      "
      :busy="busy"
      @close="
        mode = '';
        account.password = '';
      "
    >
      <AppFeedback
        v-if="formError"
        kind="error"
        :message="formError"
        class="mb-4"
      />
      <form
        v-if="mode === 'account'"
        class="rs-stack"
        @submit.prevent="createAccount"
      >
        <div class="rs-grid">
          <label
            >Nombres del tutor<input
              v-model="account.firstName"
              required
              maxlength="80" /></label
          ><label
            >Apellidos del tutor<input
              v-model="account.lastName"
              required
              maxlength="80"
          /></label>
        </div>
        <label
          >Correo del tutor<input
            v-model="account.email"
            type="email"
            required /></label
        ><label
          >Contraseña inicial<input
            v-model="account.password"
            type="password"
            minlength="8"
            required
            autocomplete="new-password"
        /></label>
        <p class="rs-hint">
          Si el tutor ya tiene una cuenta, usa Registrar contacto existente.
        </p>
        <button class="rs-button-primary" :disabled="busy">
          Crear cuenta y continuar
        </button>
      </form>
      <form v-else class="rs-stack" @submit.prevent="save">
        <template v-if="mode === 'contact'"
          ><p class="rs-hint">
            Para una cuenta creada previamente, utiliza su identificador PARENT.
            No se creará otra cuenta. Si el contacto ya está registrado, se
            conservarán sus datos actuales. El servidor comprueba el rol.
          </p>
          <label
            >Identificador de cuenta del tutor<input
              v-model="guardian.guardianUserId"
              required
              pattern="[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}" /></label
          ><label
            >Teléfono de contacto<input
              v-model="guardian.phoneNumber"
              type="tel"
              required
              maxlength="20" /></label
          ><label
            >Documento (opcional)<input
              v-model="guardian.documentNumber"
              maxlength="30" /></label
        ></template>
        <template v-if="mode === 'student'"
          ><label
            >Tutor del alumno<select v-model="guardianId" required>
              <option value="" disabled>Selecciona un tutor</option>
              <option v-for="g in guardians" :key="g.userId" :value="g.userId">
                {{ g.fullName }} · {{ g.email }}
              </option>
            </select></label
          ><StudentFields v-model="student" />
          <p class="rs-hint">
            Se creará un vínculo pendiente. La foto y la inscripción las
            administra el tutor desde su cuenta.
          </p></template
        >
        <template v-if="mode === 'review'"
          ><p>
            {{
              verify
                ? "Confirma que revisaste el vínculo según la política de tu operación."
                : "Se bloqueará el acceso del tutor al menor en esta operación. Su inscripción seguirá vigente."
            }}
          </p>
          <label
            >{{ verify ? "Referencia de revisión" : "Motivo de revocación"
            }}<textarea
              v-model="reference"
              required
              maxlength="300"
              rows="3"
            ></textarea></label
        ></template>
        <template v-if="mode === 'cancel'"
          ><p>
            Se cancelará la inscripción de {{ selected.fullName }} en
            {{ selected.routeName }}. Esta acción no revoca el vínculo.
          </p>
          <label
            >Motivo de cancelación<textarea
              v-model="reference"
              required
              maxlength="300"
              rows="3"
            ></textarea></label
        ></template>
        <button
          :class="
            mode === 'cancel' || (mode === 'review' && !verify)
              ? 'rs-button-danger'
              : 'rs-button-primary'
          "
          :disabled="busy"
        >
          {{
            busy
              ? "Guardando…"
              : mode === "review"
                ? "Confirmar revisión"
                : mode === "cancel"
                  ? "Confirmar cancelación"
                  : "Guardar"
          }}
        </button>
      </form>
    </AppFormDialog>
  </div>
</template>
