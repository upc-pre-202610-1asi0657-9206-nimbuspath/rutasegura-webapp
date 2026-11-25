<script setup>
import AppFeedback from '@/shared/components/AppFeedback.vue'
import { computed, onMounted, reactive, ref } from 'vue'
import {
  TriangleAlert,
  CheckCircle2,
  Phone,
  CreditCard,
  Save,
  UserRound,
  Mail,
  ShieldCheck,
  Sparkles,
  LoaderCircle,
  RefreshCcw,
  Clock,
} from 'lucide-vue-next'

import { useAuthStore } from '@/modules/auth/stores/authStore'
import {
  getParentProfile,
  updateParentProfile,
} from '@/modules/parent/services/parentService'

const auth = useAuthStore()

const loading = ref(true)
const saving = ref(false)
const error = ref('')
const errorKey = ref(0)
const success = ref('')

const form = reactive({
  phoneNumber: '',
  documentNumber: '',
})

const fullName = computed(() => {
  const name = `${auth.user?.firstName ?? ''} ${auth.user?.lastName ?? ''}`.trim()
  return name || 'Cuenta Familiar'
})

const userInitials = computed(() => {
  const first = auth.user?.firstName?.[0] ?? ''
  const last = auth.user?.lastName?.[0] ?? ''
  return `${first}${last}`.toUpperCase() || 'RS'
})

const isProfileComplete = computed(() => {
  const digits = form.phoneNumber.replace(/[^\d]/g, '')
  return digits.length >= 7
})

function clearMessages() {
  if (error.value) error.value = ''
  if (success.value) success.value = ''
}

async function loadProfile() {
  loading.value = true
  error.value = ''

  try {
    const profile = await getParentProfile()

    form.phoneNumber = profile?.phoneNumber || ''
    form.documentNumber = profile?.documentNumber || ''
  } catch (err) {

    error.value =
      err?.response?.data?.detail ||
      'No fue posible cargar tu perfil.'
    errorKey.value++
  } finally {
    loading.value = false
  }
}

async function saveProfile() {
  error.value = ''
  success.value = ''

  const normalizedPhone = form.phoneNumber.replace(/[^\d+]/g, '')
  const digits = normalizedPhone.replace('+', '')

  if (digits.length < 7 || digits.length > 15) {
    error.value = 'El teléfono debe tener entre 7 y 15 dígitos.'
    errorKey.value++
    return
  }

  saving.value = true

  try {
    await updateParentProfile({
      phoneNumber: form.phoneNumber.trim(),
      documentNumber: form.documentNumber.trim(),
    })

    success.value = 'Perfil actualizado correctamente.'
  } catch (err) {

    error.value =
      err?.response?.data?.detail ||
      'No fue posible actualizar tu perfil.'
    errorKey.value++
  } finally {
    saving.value = false
  }
}

onMounted(loadProfile)
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

    <!-- ───────── TOP HERO BANNER (With Animated Identity Constellation) ───────── -->
    <section
      class="hero-banner reveal relative overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-950 px-6 py-7 text-white shadow-[0_20px_50px_-15px_rgba(2,6,23,0.45)] sm:px-8 lg:px-10 lg:py-8"
      style="--d: 0ms"
    >
      <!-- Ambient glowing orbs -->
      <div class="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-blue-500/20 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl"></div>

      <!-- Animated Identity Verification Constellation (Upper-Right Sky) -->
      <svg
        class="pointer-events-none absolute right-6 top-2 hidden h-36 w-[340px] opacity-90 lg:block xl:right-10"
        viewBox="0 0 340 135"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="profileArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#38bdf8" />
            <stop offset="50%" stop-color="#10b981" />
            <stop offset="100%" stop-color="#facc15" />
          </linearGradient>

          <filter id="profileBeaconGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Base dashed link -->
        <path
          id="profileSyncPath"
          d="M 35 84 C 105 84, 125 26, 190 42 S 265 20, 310 24"
          stroke="rgba(255,255,255,0.14)"
          stroke-width="2.5"
          stroke-dasharray="4 7"
          stroke-linecap="round"
        />

        <!-- Animated glowing stream -->
        <path
          d="M 35 84 C 105 84, 125 26, 190 42 S 265 20, 310 24"
          stroke="url(#profileArcGrad)"
          stroke-width="3"
          stroke-linecap="round"
          class="route-energy-stream"
        />

        <!-- Node 1: User Account -->
        <g transform="translate(35, 84)">
          <circle r="11" fill="rgba(56, 189, 248, 0.2)" class="node-pulse-1" />
          <circle r="5" fill="#0f172a" stroke="#38bdf8" stroke-width="2.5" />
        </g>

        <!-- Node 2: Contact Verification -->
        <g transform="translate(190, 42)">
          <circle r="13" fill="rgba(16, 185, 129, 0.22)" class="node-pulse-2" />
          <circle r="5.5" fill="#0f172a" stroke="#10b981" stroke-width="2.5" />
        </g>

        <!-- Node 3: Security Shield -->
        <g transform="translate(310, 24)">
          <circle r="11" fill="rgba(250, 204, 21, 0.2)" class="node-pulse-1" />
          <circle r="5.5" fill="#0f172a" stroke="#facc15" stroke-width="2.5" />
        </g>

        <!-- Travelling Verification Beacon -->
        <g>
          <circle r="10" fill="rgba(16, 185, 129, 0.28)" class="beacon-halo" />
          <circle r="4.5" fill="#10b981" stroke="#ffffff" stroke-width="2" filter="url(#profileBeaconGlow)" />
          <animateMotion
            dur="5.2s"
            repeatCount="indefinite"
            keyPoints="0;1;0"
            keyTimes="0;0.5;1"
            calcMode="spline"
            keySplines="0.42 0 0.58 1; 0.42 0 0.58 1"
          >
            <mpath href="#profileSyncPath" />
          </animateMotion>
        </g>
      </svg>

      <div class="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div class="max-w-xl">
          <div class="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-300">
            <Sparkles :size="12" class="text-emerald-400" />
            Configuración de Cuenta
          </div>

          <h1 class="mt-3.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Mi perfil
          </h1>

          <p class="mt-2 max-w-lg text-sm leading-relaxed text-slate-300/90 sm:text-base">
            Administra tu información de contacto y documento de identidad para mantener comunicada a tu familia con el servicio de transporte.
          </p>
        </div>

        <!-- Flush Right Status & Refresh -->
        <div class="flex shrink-0 items-center gap-2.5 pt-2 lg:pt-8">
          <span
            v-if="!loading"
            class="inline-flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-bold ring-1 backdrop-blur-xs"
            :class="
              isProfileComplete
                ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/30'
                : 'bg-amber-500/15 text-amber-200 ring-amber-400/30'
            "
          >
            <CheckCircle2 v-if="isProfileComplete" :size="15" class="text-emerald-400" />
            <Clock v-else :size="15" class="text-amber-300" />
            <span>{{ isProfileComplete ? 'Perfil completo' : 'Teléfono pendiente' }}</span>
          </span>

          <button
            type="button"
            :disabled="loading"
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-300 ring-1 ring-white/10 backdrop-blur-xs transition hover:bg-white/10 hover:text-white disabled:opacity-50"
            aria-label="Recargar perfil"
            title="Recargar datos"
            @click="loadProfile"
          >
            <RefreshCcw :size="16" :class="{ 'animate-spin': loading }" />
          </button>
        </div>
      </div>
    </section>

    <!-- ───────── ERROR BANNER ───────── -->
    <AppFeedback v-if="error" class="mt-6" kind="error" :message="error" retry-label="Volver a intentar" @retry="loadProfile" />

    <!-- ───────── SUCCESS BANNER ───────── -->
    <Transition name="fade-slide">
      <div
        v-if="success"
        role="status"
        class="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/90 p-4 shadow-xs"
      >
        <div class="flex items-center gap-3">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
            <CheckCircle2 :size="17" />
          </div>
          <p class="text-sm font-semibold text-emerald-900">
            {{ success }}
          </p>
        </div>

        <button
          type="button"
          class="rounded-lg px-2 py-1 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
          @click="success = ''"
        >
          Listo
        </button>
      </div>
    </Transition>

    <!-- ───────── MAIN PROFILE GRID ───────── -->
    <div class="reveal mt-7 grid items-start gap-6 lg:grid-cols-12" style="--d: 100ms">

      <!-- Left Card: Account Identity Summary (5 Cols) -->
      <aside class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs ring-1 ring-slate-900/[0.02] lg:col-span-5">
        <div class="h-1.5 w-full bg-gradient-to-r from-brand-navy to-brand-navy-light"></div>

        <div class="p-6">
          <div class="flex items-center gap-4">
            <div class="flex h-15 w-15 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-navy to-brand-navy-light text-lg font-extrabold text-white shadow-md shadow-blue-600/20">
              {{ userInitials }}
            </div>

            <div class="min-w-0">
              <span class="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 ring-1 ring-blue-600/15">
                Titular Familiar
              </span>
              <h2 class="mt-1.5 truncate text-lg font-bold tracking-tight text-slate-900">
                {{ fullName }}
              </h2>
              <p class="truncate text-xs font-medium text-slate-500">
                {{ auth.user?.email || 'familia@rutasegura.com' }}
              </p>
            </div>
          </div>

          <div class="mt-6 space-y-3 border-t border-slate-100 pt-5">
            <div class="flex items-center justify-between rounded-2xl bg-slate-50/80 px-4 py-3 ring-1 ring-slate-200/60">
              <div class="flex items-center gap-2.5">
                <UserRound :size="16" class="text-blue-600" />
                <span class="text-xs font-semibold text-slate-600">Nombre registrado</span>
              </div>
              <span class="truncate text-xs font-bold text-slate-900">{{ fullName }}</span>
            </div>

            <div class="flex items-center justify-between rounded-2xl bg-slate-50/80 px-4 py-3 ring-1 ring-slate-200/60">
              <div class="flex items-center gap-2.5">
                <Mail :size="16" class="text-emerald-600" />
                <span class="text-xs font-semibold text-slate-600">Correo de acceso</span>
              </div>
              <span class="max-w-[160px] truncate text-xs font-bold text-slate-900">
                {{ auth.user?.email || 'Verificado' }}
              </span>
            </div>
          </div>

          <!-- Security Note -->
          <div class="mt-5 flex items-start gap-2.5 rounded-2xl border border-emerald-200/60 bg-emerald-50/40 p-3.5 text-xs text-slate-600">
            <ShieldCheck :size="16" class="mt-0.5 shrink-0 text-emerald-600" />
            <p class="leading-relaxed">
              Tus datos están protegidos y solo son compartidos con la administración del transporte escolar en el que inscribas a tus hijos.
            </p>
          </div>
        </div>
      </aside>

      <!-- Right Card: Editable Contact Form (7 Cols) -->
      <section class="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs ring-1 ring-slate-900/[0.02] lg:col-span-7">
        <div class="h-1.5 w-full bg-gradient-to-r from-brand-navy via-brand-yellow to-brand-navy-light"></div>

        <div class="p-6 sm:p-8">
          <div class="border-b border-slate-100 pb-4">
            <h2 class="text-lg font-bold tracking-tight text-slate-900">
              Información de contacto e identidad
            </h2>
            <p class="mt-0.5 text-xs text-slate-500">
              Mantén actualizado tu teléfono para recibir avisos importantes sobre los recorridos.
            </p>
          </div>

          <!-- Loading Skeletons -->
          <AppFeedback v-if="loading" class="mt-6" kind="loading" message="Cargando información…" />

          <!-- Form -->
          <form
            v-else
            class="mt-6 space-y-6"
            novalidate
            @submit.prevent="saveProfile"
          >
            <!-- Phone Field -->
            <div>
              <label
                for="phone"
                class="block text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                Teléfono de contacto <strong class="text-red-500">*</strong>
              </label>

              <div class="group relative mt-2">
                <Phone
                  :size="17"
                  class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600"
                  aria-hidden="true"
                />

                <input
                  id="phone"
                  v-model="form.phoneNumber"
                  type="tel"
                  autocomplete="tel"
                  class="w-full rounded-xl border border-slate-200/90 bg-slate-50/50 py-3 pl-11 pr-4 text-sm font-medium text-slate-900 shadow-2xs outline-none transition duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/12"
                  placeholder="+51987654321"
                  @input="clearMessages"
                />
              </div>

              <p class="mt-2 text-xs leading-relaxed text-slate-400">
                Este número puede ser utilizado por la empresa de transporte o institución educativa para contactarte ante cualquier novedad en la ruta.
              </p>
            </div>

            <!-- Document Field -->
            <div>
              <div class="flex items-center justify-between">
                <label
                  for="document"
                  class="block text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Documento de identidad (DNI / CE)
                </label>
                <span class="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                  Opcional
                </span>
              </div>

              <div class="group relative mt-2">
                <CreditCard
                  :size="17"
                  class="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600"
                  aria-hidden="true"
                />

                <input
                  id="document"
                  v-model="form.documentNumber"
                  type="text"
                  class="w-full rounded-xl border border-slate-200/90 bg-slate-50/50 py-3 pl-11 pr-4 text-sm font-medium text-slate-900 shadow-2xs outline-none transition duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/12"
                  placeholder="Ej. 72849102"
                  @input="clearMessages"
                />
              </div>

              <p class="mt-2 text-xs text-slate-400">
                Facilita tu identificación como apoderado autorizado en el padrón escolar.
              </p>
            </div>

            <!-- Submit Button -->
            <div class="flex items-center justify-end border-t border-slate-100 pt-5">
              <button
                type="submit"
                :disabled="saving"
                class="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-slate-900/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-600 hover:shadow-blue-600/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm"
              >
                <LoaderCircle
                  v-if="saving"
                  :size="17"
                  class="animate-spin"
                  aria-hidden="true"
                />
                <Save v-else :size="17" aria-hidden="true" />
                <span>{{ saving ? 'Guardando cambios...' : 'Guardar cambios' }}</span>
              </button>
            </div>
          </form>
        </div>
      </section>

    </div>

  </div>
</template>

<style scoped>
.hero-banner {
  background-image:
    radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom right, var(--rs-navy), var(--rs-navy-light) 60%, var(--rs-navy));
  background-size: 26px 26px, 100% 100%;
}

/* Animated Stream & Pulsing Nodes in Hero Banner */
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

/* Entrance & Feedback Animations */
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

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.25s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-6px);
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
</style>