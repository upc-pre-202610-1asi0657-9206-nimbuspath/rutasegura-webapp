<script setup>
import AppFeedback from '@/shared/components/AppFeedback.vue'
import AppConfirmDialog from '@/shared/components/AppConfirmDialog.vue'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  TriangleAlert,
  BusFront,
  MapPin,
  Plus,
  RefreshCcw,
  School,
  Trash2,
  UserRoundPlus,
  X,
  Users,
  Route,
  Calendar,
  GraduationCap,
  Search,
  CheckCircle2,
  LoaderCircle,
  LocateFixed,
  Building2,
  Clock,
  Sparkles,
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

// Modals
const showStudentModal = ref(false)
const showEnrollmentModal = ref(false)
const studentToDelete = ref(null)

// Async states
const savingStudent = ref(false)
const deletingStudent = ref(false)
const enrolling = ref(false)
const locatingGps = ref(false)

// Modal-specific errors & state
const studentFormError = ref('')
const studentErrorKey = ref(0)

const selectedStudent = ref(null)
const enrollmentCode = ref('')
const routeOffer = ref(null)
const enrollmentError = ref('')
const enrollmentErrorKey = ref(0)

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

const totalActiveRoutes = computed(() =>
  students.value.reduce((acc, s) => {
    const active =
      s.enrollments?.filter((e) => e.status === 'ACTIVE').length ?? 0
    return acc + active
  }, 0)
)

function getStudentInitials(fullName) {
  if (!fullName) return 'EST'
  const parts = String(fullName).trim().split(/\s+/)
  return parts
    .slice(0, 2)
    .map((p) => p[0] ?? '')
    .join('')
    .toUpperCase()
}

function formatStatus(status) {
  const normalized = String(status ?? '').toUpperCase()
  if (normalized === 'ACTIVE') return 'Activa'
  if (normalized === 'PENDING') return 'Pendiente'
  if (normalized === 'INACTIVE') return 'Inactiva'
  return status || 'Sin estado'
}

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
  studentFormError.value = ''
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

    error.value = getApiError(
      err,
      'No fue posible cargar los estudiantes.'
    )
  } finally {
    loading.value = false
  }
}

function openStudentModal() {
  resetStudentForm()
  showStudentModal.value = true
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    studentFormError.value = 'Tu navegador no soporta geolocalización automática.'
    studentErrorKey.value++
    return
  }

  locatingGps.value = true
  studentFormError.value = ''

  navigator.geolocation.getCurrentPosition(
    (position) => {
      form.latitude = Number(position.coords.latitude.toFixed(6))
      form.longitude = Number(position.coords.longitude.toFixed(6))
      locatingGps.value = false
    },
    () => {
      // Fallback to Lima center coordinates if permission denied on desktop
      form.latitude = -12.111665
      form.longitude = -77.015625
      locatingGps.value = false
    },
    { enableHighAccuracy: true, timeout: 6000 }
  )
}

async function submitStudent() {
  if (
    !form.firstName.trim() ||
    !form.lastName.trim() ||
    !form.address.trim() ||
    form.latitude === '' ||
    form.longitude === ''
  ) {
    studentFormError.value =
      'Completa los campos obligatorios: nombre, apellido, dirección y coordenadas de recojo.'
    studentErrorKey.value++
    return
  }

  savingStudent.value = true
  studentFormError.value = ''

  try {
    const created = await registerStudent(form)
    students.value.push(created)

    showStudentModal.value = false
    resetStudentForm()
  } catch (err) {

    studentFormError.value = getApiError(
      err,
      'No fue posible registrar al estudiante.'
    )
    studentErrorKey.value++
  } finally {
    savingStudent.value = false
  }
}

function promptRemoveStudent(student) {
  studentToDelete.value = student
}

async function confirmRemoveStudent() {
  if (!studentToDelete.value || deletingStudent.value) return

  deletingStudent.value = true
  const target = studentToDelete.value

  try {
    await deleteStudent(target.id)
    students.value = students.value.filter((item) => item.id !== target.id)
    studentToDelete.value = null
  } catch (err) {

    error.value = getApiError(
      err,
      'No fue posible eliminar al estudiante.'
    )
    studentToDelete.value = null
  } finally {
    deletingStudent.value = false
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
  if (!enrollmentCode.value.trim()) {
    enrollmentError.value = 'Ingresa un código de inscripción para buscar la ruta.'
    enrollmentErrorKey.value++
    return
  }

  enrolling.value = true
  enrollmentError.value = ''
  routeOffer.value = null

  try {
    routeOffer.value = await getRouteOffer(enrollmentCode.value.trim())
  } catch (err) {

    enrollmentError.value = getApiError(
      err,
      'No encontramos una ruta con ese código.'
    )
    enrollmentErrorKey.value++
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
      enrollmentCode.value.trim()
    )

    showEnrollmentModal.value = false
    await loadStudents()
  } catch (err) {

    enrollmentError.value = getApiError(
      err,
      'No fue posible inscribir al estudiante en la ruta.'
    )
    enrollmentErrorKey.value++
  } finally {
    enrolling.value = false
  }
}

onMounted(loadStudents)
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

    <!-- ───────── TOP SECTION BANNER ───────── -->
    <!-- ───────── TOP SECTION BANNER (With Animated Route Constellation) ───────── -->
    <section
      class="hero-banner reveal relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950 px-6 py-7 text-white shadow-[0_20px_50px_-15px_rgba(2,6,23,0.45)] sm:px-8 lg:px-10 lg:py-8"
      style="--d: 0ms"
    >
      <!-- Ambient glowing orbs -->
      <div class="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl"></div>

      <!-- Animated Route Constellation (Positioned so it never collides with buttons) -->
      <svg
        class="pointer-events-none absolute right-6 top-2 hidden h-36 w-[340px] opacity-90 lg:block xl:right-10"
        viewBox="0 0 340 135"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="studentsRouteGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="50%" stop-color="#10b981" />
            <stop offset="100%" stop-color="#facc15" />
          </linearGradient>

          <filter id="beaconGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Base dashed route track -->
        <path
          id="studentsRoutePath"
          d="M 20 88 C 85 88, 105 26, 175 44 S 260 18, 315 18"
          stroke="rgba(255,255,255,0.14)"
          stroke-width="2.5"
          stroke-dasharray="4 7"
          stroke-linecap="round"
        />

        <!-- Animated glowing energy stream along the route -->
        <path
          d="M 20 88 C 85 88, 105 26, 175 44 S 260 18, 315 18"
          stroke="url(#studentsRouteGrad)"
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
          <circle r="5" fill="#10b981" stroke="#ffffff" stroke-width="2" filter="url(#beaconGlow)" />
          <animateMotion
            dur="5.5s"
            repeatCount="indefinite"
            keyPoints="0;1;0"
            keyTimes="0;0.5;1"
            calcMode="spline"
            keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
          >
            <mpath href="#studentsRoutePath" />
          </animateMotion>
        </g>
      </svg>

      <div class="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div class="max-w-xl">
          <div class="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-300">
            <Users :size="12" class="text-emerald-400" />
            Gestión Familiar
          </div>

          <h1 class="mt-3.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Mis hijos
          </h1>

          <p class="mt-2 max-w-lg text-sm leading-relaxed text-slate-300/90 sm:text-base">
            Registra a tus hijos, configura su dirección de recojo y vincúlalos con sus rutas escolares mediante código de inscripción.
          </p>
        </div>

        <!-- Flush Right Actions -->
        <div class="flex shrink-0 items-center gap-2.5 pt-2 lg:pt-8">
          <button
            type="button"
            class="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-navy to-brand-navy-light px-5 py-3 text-xs font-bold text-white shadow-lg shadow-blue-600/25 ring-1 ring-white/20 transition-all duration-200 hover:-translate-y-0.5 hover:from-brand-navy hover:to-brand-navy-light focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 sm:text-sm"
            @click="openStudentModal"
          >
            <Plus :size="17" class="transition-transform duration-200 group-hover:rotate-90" />
            <span>Registrar hijo</span>
          </button>

          <button
            type="button"
            :disabled="loading"
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-300 ring-1 ring-white/10 backdrop-blur-xs transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            aria-label="Actualizar lista de hijos"
            title="Actualizar lista"
            @click="loadStudents"
          >
            <RefreshCcw :size="16" :class="{ 'animate-spin': loading }" />
          </button>
        </div>
      </div>
    </section>

    <!-- ───────── PAGE ERROR BANNER ───────── -->
    <AppFeedback v-if="error" class="mt-6" kind="error" :message="error" retry-label="Volver a intentar" @retry="loadStudents" />

    <!-- ───────── LOADING SKELETONS ───────── -->
    <AppFeedback v-if="loading" class="mt-6" kind="loading" message="Cargando información…" />

    <!-- ───────── EMPTY STATE ───────── -->
    <section
      v-else-if="!hasStudents"
      class="reveal mt-7 relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white px-6 py-14 text-center shadow-xs"
      style="--d: 100ms"
    >
      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 ring-1 ring-blue-500/15">
        <UserRoundPlus :size="28" />
      </div>

      <h2 class="mt-4 text-lg font-bold text-slate-900">
        Aún no tienes hijos registrados
      </h2>

      <p class="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-slate-500">
        Registra a tu primer hijo indicando su colegio y dirección de recojo para poder inscribirlo en una ruta escolar.
      </p>

      <button
        type="button"
        class="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-blue-600"
        @click="openStudentModal"
      >
        <Plus :size="17" />
        Registrar primer hijo
      </button>
    </section>

    <!-- ───────── STUDENT CARDS GRID ───────── -->
    <section
      v-else
      class="reveal mt-7 grid gap-5 xl:grid-cols-2"
      style="--d: 100ms"
    >
      <article
        v-for="student in students"
        :key="student.id"
        class="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs ring-1 ring-slate-900/[0.02] transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300/80 hover:shadow-lg"
      >
        <!-- Top Gradient Accent Strip -->
        <div class="h-1.5 w-full bg-gradient-to-r from-brand-navy via-brand-yellow to-brand-navy-light"></div>

        <div class="flex flex-1 flex-col justify-between p-5 sm:p-6">
          <div>
            <!-- Student Card Header -->
            <div class="flex items-start justify-between gap-4">
              <div class="flex min-w-0 items-center gap-3.5">
                <div
                  class="flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-navy to-brand-navy-light text-sm font-bold text-white shadow-md shadow-blue-600/20"
                >
                  {{ getStudentInitials(student.fullName) }}
                </div>

                <div class="min-w-0">
                  <h2 class="truncate text-lg font-bold tracking-tight text-slate-900">
                    {{ student.fullName }}
                  </h2>

                  <div class="mt-1 flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
                    <span class="inline-flex items-center gap-1 truncate">
                      <School :size="13" class="shrink-0 text-blue-600" />
                      {{ student.schoolName || 'Colegio no registrado' }}
                    </span>

                    <span
                      v-if="student.schoolGrade"
                      class="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700"
                    >
                      <GraduationCap :size="12" class="text-slate-500" />
                      {{ student.schoolGrade }}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-transparent text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                aria-label="Eliminar estudiante"
                title="Eliminar estudiante"
                @click="promptRemoveStudent(student)"
              >
                <Trash2 :size="16" />
              </button>
            </div>

            <!-- Pickup Location Card -->
            <div
              v-if="student.pickupLocation"
              class="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3.5"
            >
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100/80 text-blue-600">
                <MapPin :size="17" />
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Punto de recojo
                  </p>
                  <span
                    v-if="student.pickupLocation.latitude && student.pickupLocation.longitude"
                    class="font-mono text-[10px] text-slate-400"
                  >
                    {{ Number(student.pickupLocation.latitude).toFixed(4) }}, {{ Number(student.pickupLocation.longitude).toFixed(4) }}
                  </span>
                </div>

                <p class="mt-0.5 text-sm font-semibold text-slate-800">
                  {{ student.pickupLocation.address }}
                </p>

                <p
                  v-if="student.pickupLocation.reference"
                  class="mt-0.5 text-xs text-slate-500"
                >
                  Ref: {{ student.pickupLocation.reference }}
                </p>
              </div>
            </div>
          </div>

          <!-- Routes / Enrollments Section -->
          <div class="mt-5 border-t border-slate-100 pt-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Rutas asignadas
                </h3>
                <span class="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                  {{ student.enrollments?.length || 0 }}
                </span>
              </div>

              <button
                type="button"
                class="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-bold text-blue-600 ring-1 ring-blue-500/15 transition hover:bg-blue-600 hover:text-white"
                @click="openEnrollment(student)"
              >
                <Plus :size="14" />
                Inscribir en ruta
              </button>
            </div>

            <div
              v-if="student.enrollments?.length"
              class="mt-3 space-y-2"
            >
              <div
                v-for="enrollment in student.enrollments"
                :key="enrollment.id"
                class="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 transition hover:border-slate-300"
              >
                <div class="flex min-w-0 items-center gap-3">
                  <div
                    class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 ring-1 ring-emerald-500/20"
                  >
                    <BusFront :size="17" />
                  </div>

                  <div class="min-w-0">
                    <p class="truncate text-sm font-semibold text-slate-900">
                      {{ enrollment.routeName }}
                    </p>
                    <p class="text-xs text-slate-500">
                      {{ enrollment.direction }}
                    </p>
                  </div>
                </div>

                <span
                  class="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ring-1"
                  :class="
                    enrollment.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                      : 'bg-slate-100 text-slate-600 ring-slate-500/15'
                  "
                >
                  {{ formatStatus(enrollment.status) }}
                </span>
              </div>
            </div>

            <div
              v-else
              class="mt-3 flex items-center justify-between gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 px-4 py-3 text-xs text-slate-500"
            >
              <span class="flex items-center gap-2">
                <Route :size="15" class="text-slate-400" />
                Este estudiante aún no está inscrito en una ruta.
              </span>
            </div>
          </div>
        </div>
      </article>
    </section>

    <!-- ───────── MODAL 1: REGISTRAR HIJO ───────── -->
    <Transition name="modal-fade">
      <div
        v-if="showStudentModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-register-title"
        @click.self="showStudentModal = false"
      >
        <div class="modal-card relative max-h-[92dvh] w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl">
          <!-- Top Gradient Accent -->
          <div class="h-1.5 w-full bg-gradient-to-r from-brand-navy via-brand-yellow to-brand-navy-light"></div>

          <!-- Modal Header -->
          <div class="flex items-start justify-between border-b border-slate-100 px-6 py-4 sm:px-7">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-500/15">
                <UserRoundPlus :size="20" />
              </div>
              <div>
                <h2 id="modal-register-title" class="text-lg font-bold tracking-tight text-slate-900">
                  Registrar hijo
                </h2>
                <p class="text-xs text-slate-500">
                  Ingresa los datos escolares y el punto de recojo de tu hijo.
                </p>
              </div>
            </div>

            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Cerrar ventana"
              @click="showStudentModal = false"
            >
              <X :size="18" />
            </button>
          </div>

          <!-- Modal Scrollable Form Body -->
          <form
            class="max-h-[calc(92dvh-76px)] overflow-y-auto px-6 py-5 sm:px-7"
            novalidate
            @submit.prevent="submitStudent"
          >
            <!-- In-Modal Validation Error Banner -->
            <div
              v-if="studentFormError"
              :key="studentErrorKey"
              role="alert"
              class="shake mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-xs font-medium text-red-800 sm:text-sm"
            >
              <TriangleAlert :size="17" class="mt-0.5 shrink-0 text-red-600" />
              <span>{{ studentFormError }}</span>
            </div>

            <!-- Section 1: Datos del estudiante -->
            <div class="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-blue-600">
              <School :size="13" />
              <span>1. Datos personales y escolares</span>
            </div>

            <div class="grid gap-3.5 sm:grid-cols-2">
              <label class="field">
                <span>Nombre <strong class="text-red-500">*</strong></span>
                <input
                  v-model="form.firstName"
                  required
                  placeholder="Ej. Mateo"
                  @input="studentFormError = ''"
                />
              </label>

              <label class="field">
                <span>Apellido <strong class="text-red-500">*</strong></span>
                <input
                  v-model="form.lastName"
                  required
                  placeholder="Ej. Chávez"
                  @input="studentFormError = ''"
                />
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
                <span>Colegio / Institución educativa</span>
                <input
                  v-model="form.schoolName"
                  placeholder="Ej. Colegio San Marcos"
                />
              </label>
            </div>

            <!-- Section 2: Punto de recojo -->
            <div class="mt-6 mb-2 flex flex-wrap items-center justify-between gap-2">
              <div class="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                <MapPin :size="13" />
                <span>2. Ubicación de recojo</span>
              </div>

              <button
                type="button"
                :disabled="locatingGps"
                class="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50/70 px-2.5 py-1 text-[11px] font-bold text-blue-700 transition hover:bg-blue-100 disabled:opacity-60"
                @click="useCurrentLocation"
              >
                <LocateFixed :size="12" :class="{ 'animate-spin': locatingGps }" />
                <span>{{ locatingGps ? 'Obteniendo GPS...' : 'Usar mi ubicación actual' }}</span>
              </button>
            </div>

            <div class="grid gap-3.5 sm:grid-cols-2">
              <label class="field sm:col-span-2">
                <span>Dirección de recojo <strong class="text-red-500">*</strong></span>
                <input
                  v-model="form.address"
                  required
                  placeholder="Ej. Av. Los Alisos 245, Surquillo"
                  @input="studentFormError = ''"
                />
              </label>

              <label class="field sm:col-span-2">
                <span>Referencia (Opcional)</span>
                <input
                  v-model="form.reference"
                  placeholder="Ej. Portón negro frente al parque"
                />
              </label>

              <label class="field">
                <span>Latitud <strong class="text-red-500">*</strong></span>
                <input
                  v-model="form.latitude"
                  type="number"
                  step="any"
                  required
                  placeholder="-12.111665"
                  @input="studentFormError = ''"
                />
              </label>

              <label class="field">
                <span>Longitud <strong class="text-red-500">*</strong></span>
                <input
                  v-model="form.longitude"
                  type="number"
                  step="any"
                  required
                  placeholder="-77.015625"
                  @input="studentFormError = ''"
                />
              </label>
            </div>

            <p class="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
              <Sparkles :size="12" class="shrink-0 text-blue-500" />
              <span>Puedes usar el botón "Usar mi ubicación actual" para autocompletar la latitud y longitud.</span>
            </p>

            <!-- Modal Footer Actions -->
            <div class="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                class="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 sm:text-sm"
                @click="showStudentModal = false"
              >
                Cancelar
              </button>

              <button
                type="submit"
                :disabled="savingStudent"
                class="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-slate-900/15 transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
              >
                <LoaderCircle v-if="savingStudent" :size="16" class="animate-spin" />
                <span>{{ savingStudent ? 'Guardando...' : 'Registrar hijo' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>

    <!-- ───────── MODAL 2: INSCRIBIR EN RUTA ───────── -->
    <Transition name="modal-fade">
      <div
        v-if="showEnrollmentModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-enroll-title"
        @click.self="showEnrollmentModal = false"
      >
        <div class="modal-card relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl">
          <!-- Top Gradient Accent -->
          <div class="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-brand-yellow to-brand-navy-light"></div>

          <div class="p-6 sm:p-7">
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-center gap-3">
                <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-500/20">
                  <BusFront :size="20" />
                </div>
                <div>
                  <h2 id="modal-enroll-title" class="text-lg font-bold tracking-tight text-slate-900">
                    Inscribir en una ruta
                  </h2>
                  <p class="text-xs font-medium text-slate-500">
                    Estudiante: <strong class="text-slate-800">{{ selectedStudent?.fullName }}</strong>
                  </p>
                </div>
              </div>

              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Cerrar ventana"
                @click="showEnrollmentModal = false"
              >
                <X :size="18" />
              </button>
            </div>

            <!-- Code Search Input -->
            <div class="mt-5">
              <label for="enrollment-code-input" class="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600">
                Código de inscripción proporcionado por el colegio
              </label>

              <div class="flex gap-2">
                <div class="relative min-w-0 flex-1">
                  <Search
                    :size="16"
                    class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    id="enrollment-code-input"
                    v-model="enrollmentCode"
                    class="w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2.5 pl-10 pr-4 font-mono text-sm uppercase tracking-wider text-slate-900 outline-none transition placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/12"
                    placeholder="Ej. RUTA-2026-A"
                    @input="enrollmentError = ''"
                    @keyup.enter="searchRoute"
                  />
                </div>

                <button
                  type="button"
                  class="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-600 disabled:opacity-60 sm:text-sm"
                  :disabled="enrolling"
                  @click="searchRoute"
                >
                  <LoaderCircle v-if="enrolling && !routeOffer" :size="15" class="animate-spin" />
                  <span>Buscar</span>
                </button>
              </div>
            </div>

            <!-- Enrollment Error -->
            <div
              v-if="enrollmentError"
              :key="enrollmentErrorKey"
              role="alert"
              class="shake mt-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/90 px-3.5 py-2.5 text-xs font-medium text-red-800"
            >
              <TriangleAlert :size="16" class="mt-0.5 shrink-0 text-red-600" />
              <span>{{ enrollmentError }}</span>
            </div>

            <!-- Route Offer Preview Ticket -->
            <div
              v-if="routeOffer"
              class="mt-5 overflow-hidden rounded-2xl border border-blue-200/80 bg-gradient-to-br from-brand-navy/70 via-white to-brand-navy-light/40 p-5 shadow-xs"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <span class="inline-flex items-center gap-1 rounded-full bg-emerald-100/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                    <CheckCircle2 :size="11" />
                    Ruta encontrada
                  </span>

                  <h3 class="mt-2 text-base font-bold text-slate-900">
                    {{ routeOffer.routeName }}
                  </h3>

                  <p class="mt-0.5 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <Building2 :size="13" class="text-blue-600" />
                    {{ routeOffer.organizationName }}
                  </p>
                </div>
              </div>

              <div class="mt-4 grid grid-cols-3 gap-2 border-t border-slate-200/60 pt-3.5 text-xs">
                <div class="rounded-xl bg-white p-2.5 ring-1 ring-slate-200/70">
                  <span class="block text-[10px] font-bold uppercase text-slate-400">Sentido</span>
                  <strong class="mt-0.5 block truncate font-semibold text-slate-800">{{ routeOffer.direction }}</strong>
                </div>

                <div class="rounded-xl bg-white p-2.5 ring-1 ring-slate-200/70">
                  <span class="block text-[10px] font-bold uppercase text-slate-400">Salida</span>
                  <strong class="mt-0.5 block truncate font-semibold text-slate-800">{{ routeOffer.departureTime }}</strong>
                </div>

                <div class="rounded-xl bg-white p-2.5 ring-1 ring-slate-200/70">
                  <span class="block text-[10px] font-bold uppercase text-slate-400">Cupos disp.</span>
                  <strong class="mt-0.5 block truncate font-semibold text-emerald-600">
                    {{ routeOffer.availableSeats ?? 'N/D' }}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                class="rs-button-primary mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 disabled:shadow-none"
                :disabled="enrolling || !routeOffer.acceptsEnrollments"
                @click="confirmEnrollment"
              >
                <LoaderCircle v-if="enrolling" :size="16" class="animate-spin" />
                <span>
                  {{
                    routeOffer.acceptsEnrollments
                      ? 'Confirmar inscripción en esta ruta'
                      : 'La ruta no acepta inscripciones actualmente'
                  }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <AppConfirmDialog
      :open="Boolean(studentToDelete)"
      :title="`¿Eliminar a ${studentToDelete?.fullName || 'este estudiante'}?`"
      message="Se retirará al estudiante de tu cuenta. Si tiene inscripciones activas, deberás retirarlo de sus rutas antes de eliminarlo."
      :busy="deletingStudent"
      confirm-label="Sí, eliminar" danger
      @cancel="studentToDelete = null" @confirm="confirmRemoveStudent"
    />

  </div>
</template>

<style scoped>
.hero-banner {
  background-image:
    radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom right, var(--rs-navy), var(--rs-navy-light) 60%, var(--rs-navy));
  background-size: 26px 26px, 100% 100%;
}

.field {
  display: grid;
  gap: 6px;
}

.field span {
  color: #334155;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.field input {
  width: 100%;
  min-height: 44px;
  padding: 0 13px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  outline: none;
  background: var(--rs-background);
  color: var(--rs-navy-light);
  font-size: 14px;
  transition: all 0.15s ease;
}

.field input:hover {
  border-color: #cbd5e1;
}

.field input:focus {
  border-color: var(--rs-navy);
  background: #ffffff;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
}

/* Entrance & Modal Transitions */
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

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-active .modal-card {
  animation: modalPop 0.25s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

@keyframes modalPop {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
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
</style>