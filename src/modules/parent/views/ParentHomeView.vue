<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  BusFront,
  Users,
  Route,
  MapPin,
  School,
  LogOut,
  UserRound,
  ChevronRight,
  RefreshCcw,
  AlertTriangle,
} from 'lucide-vue-next'

import { useAuthStore } from '@/modules/auth/stores/authStore'
import {
  getMyStudents,
  getParentProfile,
} from '@/modules/parent/services/parentService'

const auth = useAuthStore()
const router = useRouter()

const profile = ref(null)
const students = ref([])
const loading = ref(true)
const error = ref('')

const parentName = computed(() => {
  const firstName = auth.user?.firstName ?? ''
  const lastName = auth.user?.lastName ?? ''

  return `${firstName} ${lastName}`.trim() || 'Familia RutaSegura'
})

const activeEnrollments = computed(() =>
  students.value.reduce((total, student) => {
    const active = student.enrollments?.filter(
      (enrollment) => enrollment.status === 'ACTIVE',
    ).length ?? 0

    return total + active
  }, 0),
)

const profileComplete = computed(() =>
  Boolean(profile.value?.isComplete),
)

async function loadDashboard() {
  loading.value = true
  error.value = ''

  try {
    const [profileData, studentsData] = await Promise.all([
      getParentProfile(),
      getMyStudents(),
    ])

    profile.value = profileData
    students.value = Array.isArray(studentsData)
      ? studentsData
      : []
  } catch (err) {
    console.error(err)

    error.value =
      err?.response?.data?.detail ||
      'No fue posible cargar la información de tu cuenta.'
  } finally {
    loading.value = false
  }
}

async function logout() {
  auth.logout()
  await router.replace({ name: 'login' })
}

onMounted(loadDashboard)
</script>

<template>
  <div class="min-h-dvh bg-slate-50 text-slate-900">
    <!-- Header -->
    <header
      class="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl"
    >
      <div
        class="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-600/20"
          >
            <BusFront :size="21" />
          </div>

          <div>
            <p class="text-base font-bold tracking-tight">
              RutaSegura
            </p>

            <p class="text-xs text-slate-500">
              Portal de familias
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="hidden text-right sm:block">
            <p class="text-sm font-semibold">
              {{ parentName }}
            </p>

            <p class="text-xs text-slate-500">
              {{ auth.user?.email }}
            </p>
          </div>

          <button
            type="button"
            class="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            aria-label="Cerrar sesión"
            @click="logout"
          >
            <LogOut :size="18" />
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-5 py-7 lg:px-8 lg:py-10">
      <!-- Welcome -->
      <section
        class="relative overflow-hidden rounded-3xl bg-slate-950 px-6 py-7 text-white shadow-xl sm:px-8 lg:px-10 lg:py-9"
      >
        <div
          class="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-blue-500/20 blur-3xl"
        />

        <div
          class="pointer-events-none absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl"
        />

        <div class="relative z-10 max-w-2xl">
          <span
            class="inline-flex rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-300 ring-1 ring-blue-400/20"
          >
            PORTAL DE FAMILIAS
          </span>

          <h1 class="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
            Hola, {{ auth.user?.firstName }}.
          </h1>

          <p class="mt-2 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Consulta la información de tus hijos, sus rutas asignadas
            y el estado de tu perfil desde un solo lugar.
          </p>
        </div>
      </section>

      <!-- Error -->
      <div
        v-if="error"
        class="mt-6 flex items-start justify-between gap-4 rounded-2xl border border-red-200 bg-red-50 p-4"
      >
        <div class="flex gap-3">
          <AlertTriangle
            :size="19"
            class="mt-0.5 shrink-0 text-red-600"
          />

          <div>
            <p class="text-sm font-semibold text-red-800">
              No pudimos cargar el portal
            </p>

            <p class="mt-0.5 text-sm text-red-700">
              {{ error }}
            </p>
          </div>
        </div>

        <button
          type="button"
          class="shrink-0 rounded-lg p-2 text-red-700 transition hover:bg-red-100"
          @click="loadDashboard"
        >
          <RefreshCcw :size="17" />
        </button>
      </div>

      <!-- Loading -->
      <div
        v-if="loading"
        class="mt-7 grid gap-4 sm:grid-cols-3"
      >
        <div
          v-for="index in 3"
          :key="index"
          class="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white"
        />
      </div>

      <template v-else>
        <!-- KPI cards -->
        <section class="mt-7 grid gap-4 sm:grid-cols-3">
          <article
            class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div class="flex items-center justify-between">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600"
              >
                <Users :size="20" />
              </div>

              <span class="text-2xl font-bold">
                {{ students.length }}
              </span>
            </div>

            <p class="mt-4 text-sm font-semibold">
              Hijos registrados
            </p>

            <p class="mt-1 text-xs text-slate-500">
              Estudiantes asociados a tu cuenta
            </p>
          </article>

          <article
            class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div class="flex items-center justify-between">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"
              >
                <Route :size="20" />
              </div>

              <span class="text-2xl font-bold">
                {{ activeEnrollments }}
              </span>
            </div>

            <p class="mt-4 text-sm font-semibold">
              Inscripciones activas
            </p>

            <p class="mt-1 text-xs text-slate-500">
              Rutas actualmente asociadas
            </p>
          </article>

          <article
            class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div class="flex items-center justify-between">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"
              >
                <UserRound :size="20" />
              </div>

              <span
                class="rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="
                  profileComplete
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-700'
                "
              >
                {{ profileComplete ? 'Completo' : 'Pendiente' }}
              </span>
            </div>

            <p class="mt-4 text-sm font-semibold">
              Perfil familiar
            </p>

            <p class="mt-1 text-xs text-slate-500">
              Información de contacto
            </p>
          </article>
        </section>

        <!-- Students -->
        <section class="mt-8">
          <div class="flex items-end justify-between gap-4">
            <div>
              <p
                class="text-xs font-bold uppercase tracking-wider text-blue-600"
              >
                Familia
              </p>

              <h2 class="mt-1 text-xl font-bold tracking-tight">
                Mis hijos
              </h2>

              <p class="mt-1 text-sm text-slate-500">
                Información registrada en RutaSegura.
              </p>
            </div>
          </div>

          <!-- Empty -->
          <div
            v-if="students.length === 0"
            class="mt-5 rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center"
          >
            <div
              class="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600"
            >
              <Users :size="22" />
            </div>

            <h3 class="mt-4 font-semibold">
              Aún no tienes estudiantes registrados
            </h3>

            <p class="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Cuando registres a tus hijos, podrás consultar aquí
              su información y las rutas asociadas.
            </p>
          </div>

          <!-- Student cards -->
          <div
            v-else
            class="mt-5 grid gap-5 lg:grid-cols-2"
          >
            <article
              v-for="student in students"
              :key="student.id"
              class="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div class="p-5 sm:p-6">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex min-w-0 items-center gap-4">
                    <div
                      class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700"
                    >
                      <School :size="21" />
                    </div>

                    <div class="min-w-0">
                      <h3
                        class="truncate text-base font-bold text-slate-900"
                      >
                        {{ student.fullName }}
                      </h3>

                      <p class="mt-0.5 truncate text-sm text-slate-500">
                        {{ student.schoolName || 'Colegio no registrado' }}
                      </p>
                    </div>
                  </div>

                  <span
                    class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600"
                  >
                    {{ student.schoolGrade || 'Sin grado' }}
                  </span>
                </div>

                <div
                  v-if="student.pickupLocation"
                  class="mt-5 flex gap-3 rounded-2xl bg-slate-50 p-3.5"
                >
                  <MapPin
                    :size="17"
                    class="mt-0.5 shrink-0 text-blue-600"
                  />

                  <div class="min-w-0">
                    <p class="text-xs font-semibold text-slate-700">
                      Punto de recojo
                    </p>

                    <p class="mt-0.5 text-sm text-slate-500">
                      {{ student.pickupLocation.address }}
                    </p>
                  </div>
                </div>

                <div class="mt-5 border-t border-slate-100 pt-4">
                  <div
                    v-if="student.enrollments?.length"
                    class="space-y-2"
                  >
                    <div
                      v-for="enrollment in student.enrollments"
                      :key="enrollment.id"
                      class="flex items-center justify-between gap-3 rounded-xl px-2 py-2"
                    >
                      <div class="flex min-w-0 items-center gap-3">
                        <div
                          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"
                        >
                          <BusFront :size="16" />
                        </div>

                        <div class="min-w-0">
                          <p
                            class="truncate text-sm font-semibold text-slate-800"
                          >
                            {{ enrollment.routeName }}
                          </p>

                          <p class="text-xs text-slate-500">
                            {{ enrollment.direction }}
                          </p>
                        </div>
                      </div>

                      <span
                        class="rounded-full px-2 py-1 text-[10px] font-bold"
                        :class="
                          enrollment.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                        "
                      >
                        {{ enrollment.status }}
                      </span>
                    </div>
                  </div>

                  <p
                    v-else
                    class="py-2 text-sm text-slate-400"
                  >
                    Sin rutas asociadas.
                  </p>
                </div>

                <button
                  type="button"
                  class="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 transition hover:text-blue-700"
                >
                  Ver detalles
                  <ChevronRight :size="16" />
                </button>
              </div>
            </article>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>