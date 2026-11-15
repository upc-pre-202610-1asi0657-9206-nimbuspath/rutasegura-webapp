<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import {
  AlertTriangle,
  BusFront,
  MapPin,
  Plus,
  RefreshCcw,
  School,
  Trash2,
  UserRoundPlus,
  X,
} from 'lucide-vue-next'

import {
  deleteStudent,
  enrollStudent,
  getMyStudents,
  getRouteOffer,
  registerStudent,
} from '@/modules/parent/services/parentService'

const students = ref([])
const loading = ref(true)
const error = ref('')

const showStudentModal = ref(false)
const showEnrollmentModal = ref(false)

const savingStudent = ref(false)
const enrolling = ref(false)

const selectedStudent = ref(null)
const enrollmentCode = ref('')
const routeOffer = ref(null)
const enrollmentError = ref('')

const form = reactive({
  firstName: '',
  lastName: '',
  birthDate: '',
  schoolGrade: '',
  schoolName: '',
  address: '',
  reference: '',
  latitude: '',
  longitude: '',
})

const hasStudents = computed(() => students.value.length > 0)

function resetStudentForm() {
  Object.assign(form, {
    firstName: '',
    lastName: '',
    birthDate: '',
    schoolGrade: '',
    schoolName: '',
    address: '',
    reference: '',
    latitude: '',
    longitude: '',
  })
}

function getApiError(err, fallback) {
  return (
    err?.response?.data?.detail ||
    err?.response?.data?.title ||
    fallback
  )
}

async function loadStudents() {
  loading.value = true
  error.value = ''

  try {
    const data = await getMyStudents()
    students.value = Array.isArray(data) ? data : []
  } catch (err) {
    console.error(err)

    error.value = getApiError(
      err,
      'No fue posible cargar los estudiantes.',
    )
  } finally {
    loading.value = false
  }
}

function openStudentModal() {
  resetStudentForm()
  showStudentModal.value = true
}

async function submitStudent() {
  if (
    !form.firstName.trim() ||
    !form.lastName.trim() ||
    !form.address.trim() ||
    form.latitude === '' ||
    form.longitude === ''
  ) {
    error.value =
      'Completa nombre, apellido, dirección y coordenadas del punto de recojo.'
    return
  }

  savingStudent.value = true
  error.value = ''

  try {
    const created = await registerStudent(form)

    students.value.push(created)

    showStudentModal.value = false
    resetStudentForm()
  } catch (err) {
    console.error(err)

    error.value = getApiError(
      err,
      'No fue posible registrar al estudiante.',
    )
  } finally {
    savingStudent.value = false
  }
}

async function removeStudent(student) {
  const confirmed = window.confirm(
    `¿Deseas eliminar a ${student.fullName}? También se retirará de sus rutas.`,
  )

  if (!confirmed) return

  try {
    await deleteStudent(student.id)

    students.value = students.value.filter(
      (item) => item.id !== student.id,
    )
  } catch (err) {
    console.error(err)

    error.value = getApiError(
      err,
      'No fue posible eliminar al estudiante.',
    )
  }
}

function openEnrollment(student) {
  selectedStudent.value = student
  enrollmentCode.value = ''
  routeOffer.value = null
  enrollmentError.value = ''
  showEnrollmentModal.value = true
}

async function searchRoute() {
  if (!enrollmentCode.value.trim()) return

  enrolling.value = true
  enrollmentError.value = ''
  routeOffer.value = null

  try {
    routeOffer.value = await getRouteOffer(
      enrollmentCode.value,
    )
  } catch (err) {
    console.error(err)

    enrollmentError.value = getApiError(
      err,
      'No encontramos una ruta con ese código.',
    )
  } finally {
    enrolling.value = false
  }
}

async function confirmEnrollment() {
  if (!selectedStudent.value || !routeOffer.value) return

  enrolling.value = true
  enrollmentError.value = ''

  try {
    await enrollStudent(
      selectedStudent.value.id,
      enrollmentCode.value,
    )

    showEnrollmentModal.value = false
    await loadStudents()
  } catch (err) {
    console.error(err)

    enrollmentError.value = getApiError(
      err,
      'No fue posible inscribir al estudiante en la ruta.',
    )
  } finally {
    enrolling.value = false
  }
}

onMounted(loadStudents)
</script>

<template>
  <main class="mx-auto max-w-7xl px-5 py-8 lg:px-8">
    <div class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-xs font-bold uppercase tracking-wider text-blue-600">
          Familia
        </p>

        <h1 class="mt-1 text-2xl font-bold text-slate-900">
          Mis hijos
        </h1>

        <p class="mt-1 text-sm text-slate-500">
          Registra y administra la información de tus hijos.
        </p>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        @click="openStudentModal"
      >
        <Plus :size="17" />
        Registrar hijo
      </button>
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
        class="text-red-700"
        @click="loadStudents"
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
        class="h-64 animate-pulse rounded-3xl border border-slate-200 bg-white"
      />
    </div>

    <section
      v-else-if="!hasStudents"
      class="mt-7 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center"
    >
      <div
        class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600"
      >
        <UserRoundPlus :size="25" />
      </div>

      <h2 class="mt-4 font-semibold text-slate-900">
        Aún no tienes hijos registrados
      </h2>

      <p class="mx-auto mt-2 max-w-md text-sm text-slate-500">
        Registra a tu primer hijo para asociarlo posteriormente
        a una ruta escolar.
      </p>

      <button
        type="button"
        class="mt-5 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white"
        @click="openStudentModal"
      >
        <Plus :size="17" />
        Registrar hijo
      </button>
    </section>

    <section
      v-else
      class="mt-7 grid gap-5 xl:grid-cols-2"
    >
      <article
        v-for="student in students"
        :key="student.id"
        class="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
      >
        <div class="p-6">
          <div class="flex items-start justify-between gap-4">
            <div class="flex min-w-0 items-center gap-4">
              <div
                class="grid h-13 w-13 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600"
              >
                <School :size="23" />
              </div>

              <div class="min-w-0">
                <h2 class="truncate text-lg font-bold text-slate-900">
                  {{ student.fullName }}
                </h2>

                <p class="mt-1 text-sm text-slate-500">
                  {{ student.schoolName || 'Colegio no registrado' }}
                </p>

                <p
                  v-if="student.schoolGrade"
                  class="mt-0.5 text-xs text-slate-400"
                >
                  {{ student.schoolGrade }}
                </p>
              </div>
            </div>

            <button
              type="button"
              class="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
              aria-label="Eliminar estudiante"
              @click="removeStudent(student)"
            >
              <Trash2 :size="17" />
            </button>
          </div>

          <div
            v-if="student.pickupLocation"
            class="mt-5 flex gap-3 rounded-2xl bg-slate-50 p-4"
          >
            <MapPin
              :size="18"
              class="mt-0.5 shrink-0 text-blue-600"
            />

            <div>
              <p class="text-xs font-bold text-slate-700">
                Punto de recojo
              </p>

              <p class="mt-1 text-sm text-slate-600">
                {{ student.pickupLocation.address }}
              </p>

              <p
                v-if="student.pickupLocation.reference"
                class="mt-1 text-xs text-slate-400"
              >
                {{ student.pickupLocation.reference }}
              </p>
            </div>
          </div>

          <div class="mt-5 border-t border-slate-100 pt-5">
            <div class="flex items-center justify-between">
              <h3 class="text-sm font-bold text-slate-800">
                Rutas
              </h3>

              <button
                type="button"
                class="text-xs font-bold text-blue-600 hover:text-blue-700"
                @click="openEnrollment(student)"
              >
                + Inscribir en ruta
              </button>
            </div>

            <div
              v-if="student.enrollments?.length"
              class="mt-3 space-y-2"
            >
              <div
                v-for="enrollment in student.enrollments"
                :key="enrollment.id"
                class="flex items-center justify-between gap-3 rounded-xl border border-slate-100 p-3"
              >
                <div class="flex min-w-0 items-center gap-3">
                  <div
                    class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600"
                  >
                    <BusFront :size="17" />
                  </div>

                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-slate-800">
                      {{ enrollment.routeName }}
                    </p>

                    <p class="text-xs text-slate-500">
                      {{ enrollment.direction }}
                    </p>
                  </div>
                </div>

                <span
                  class="rounded-full px-2.5 py-1 text-[10px] font-bold"
                  :class="
                    enrollment.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-500'
                  "
                >
                  {{ enrollment.status }}
                </span>
              </div>
            </div>

            <p
              v-else
              class="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-400"
            >
              Este estudiante aún no está inscrito en una ruta.
            </p>
          </div>
        </div>
      </article>
    </section>

    <!-- Register student modal -->
    <div
      v-if="showStudentModal"
      class="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm"
    >
      <div
        class="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl"
      >
        <div class="flex items-start justify-between border-b border-slate-100 p-6">
          <div>
            <h2 class="text-xl font-bold text-slate-900">
              Registrar hijo
            </h2>

            <p class="mt-1 text-sm text-slate-500">
              Ingresa la información del estudiante.
            </p>
          </div>

          <button
            type="button"
            class="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
            @click="showStudentModal = false"
          >
            <X :size="19" />
          </button>
        </div>

        <form
          class="p-6"
          @submit.prevent="submitStudent"
        >
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="field">
              <span>Nombre *</span>
              <input v-model="form.firstName" />
            </label>

            <label class="field">
              <span>Apellido *</span>
              <input v-model="form.lastName" />
            </label>

            <label class="field">
              <span>Fecha de nacimiento</span>
              <input
                v-model="form.birthDate"
                type="date"
              />
            </label>

            <label class="field">
              <span>Grado escolar</span>
              <input
                v-model="form.schoolGrade"
                placeholder="Ej. 4.º de Primaria"
              />
            </label>

            <label class="field sm:col-span-2">
              <span>Colegio</span>
              <input v-model="form.schoolName" />
            </label>

            <label class="field sm:col-span-2">
              <span>Dirección de recojo *</span>
              <input
                v-model="form.address"
                placeholder="Av. Los Alisos 245"
              />
            </label>

            <label class="field sm:col-span-2">
              <span>Referencia</span>
              <input
                v-model="form.reference"
                placeholder="Referencia opcional"
              />
            </label>

            <label class="field">
              <span>Latitud *</span>
              <input
                v-model="form.latitude"
                type="number"
                step="any"
                placeholder="-12.000000"
              />
            </label>

            <label class="field">
              <span>Longitud *</span>
              <input
                v-model="form.longitude"
                type="number"
                step="any"
                placeholder="-77.000000"
              />
            </label>
          </div>

          <p class="mt-3 text-xs text-slate-400">
            Por ahora ingresamos las coordenadas manualmente. Después
            podemos reemplazar estos campos por un selector en mapa.
          </p>

          <div class="mt-6 flex justify-end gap-3">
            <button
              type="button"
              class="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600"
              @click="showStudentModal = false"
            >
              Cancelar
            </button>

            <button
              type="submit"
              :disabled="savingStudent"
              class="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {{ savingStudent ? 'Guardando...' : 'Registrar hijo' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Enrollment modal -->
    <div
      v-if="showEnrollmentModal"
      class="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm"
    >
      <div class="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-xl font-bold text-slate-900">
              Inscribir en una ruta
            </h2>

            <p class="mt-1 text-sm text-slate-500">
              {{ selectedStudent?.fullName }}
            </p>
          </div>

          <button
            type="button"
            class="rounded-lg p-2 text-slate-400"
            @click="showEnrollmentModal = false"
          >
            <X :size="19" />
          </button>
        </div>

        <div class="mt-6 flex gap-2">
          <input
            v-model="enrollmentCode"
            class="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
            placeholder="Código de inscripción"
            @keyup.enter="searchRoute"
          />

          <button
            type="button"
            class="rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"
            :disabled="enrolling"
            @click="searchRoute"
          >
            Buscar
          </button>
        </div>

        <p
          v-if="enrollmentError"
          class="mt-3 text-sm text-red-600"
        >
          {{ enrollmentError }}
        </p>

        <div
          v-if="routeOffer"
          class="mt-5 rounded-2xl border border-blue-100 bg-blue-50/50 p-4"
        >
          <p class="font-bold text-slate-900">
            {{ routeOffer.routeName }}
          </p>

          <p class="mt-1 text-sm text-slate-600">
            {{ routeOffer.organizationName }}
          </p>

          <div class="mt-3 flex flex-wrap gap-2 text-xs">
            <span class="rounded-full bg-white px-3 py-1.5">
              {{ routeOffer.direction }}
            </span>

            <span class="rounded-full bg-white px-3 py-1.5">
              {{ routeOffer.departureTime }}
            </span>

            <span class="rounded-full bg-white px-3 py-1.5">
              Cupos:
              {{ routeOffer.availableSeats ?? 'No disponible' }}
            </span>
          </div>

          <button
            type="button"
            class="mt-5 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white disabled:opacity-60"
            :disabled="enrolling || !routeOffer.acceptsEnrollments"
            @click="confirmEnrollment"
          >
            {{
              routeOffer.acceptsEnrollments
                ? 'Confirmar inscripción'
                : 'La ruta no acepta inscripciones'
            }}
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.field {
  display: grid;
  gap: 7px;
}

.field span {
  color: #475569;
  font-size: 12px;
  font-weight: 700;
}

.field input {
  width: 100%;
  min-height: 45px;
  padding: 0 13px;
  border: 1px solid #dbe3ee;
  border-radius: 11px;
  outline: none;
  background: white;
  color: #0f172a;
  font-size: 14px;
}

.field input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgb(59 130 246 / 10%);
}
</style>