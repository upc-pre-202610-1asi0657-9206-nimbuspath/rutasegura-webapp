<script setup>
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ArrowLeft,
  ArrowRight,
  BusFront,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
  TriangleAlert,
  CheckCircle2,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  Users,
  Smartphone,
} from 'lucide-vue-next'

import AppFeedback from '@/shared/components/AppFeedback.vue'

import { signUp } from '@/modules/auth/services/authService'

const router = useRouter()

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const loading = ref(false)
const error = ref('')
const errorKey = ref(0)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const capsLock = ref(false)

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const hasLength = computed(() => form.password.length >= 8 && form.password.length <= 72)
const hasAlphaNumeric = computed(() => /[A-Za-z]/.test(form.password) && /\d/.test(form.password))
const passwordsMatch = computed(
  () => Boolean(form.confirmPassword) && form.password === form.confirmPassword
)

const passwordValid = computed(() => hasLength.value && hasAlphaNumeric.value)

function checkCapsLock(event) {
  capsLock.value = event.getModifierState?.('CapsLock') ?? false
}

function clearError() {
  if (error.value) error.value = ''
}

function validate() {
  error.value = ''

  if (
    !form.firstName.trim() ||
    !form.lastName.trim() ||
    !form.email.trim() ||
    !form.password ||
    !form.confirmPassword
  ) {
    error.value = 'Completa todos los campos obligatorios.'
    errorKey.value++
    return false
  }

  if (!emailPattern.test(form.email.trim())) {
    error.value = 'Ingresa un correo electrónico válido.'
    errorKey.value++
    return false
  }

  if (!passwordValid.value) {
    error.value =
      'La contraseña debe tener entre 8 y 72 caracteres e incluir al menos una letra y un número.'
    errorKey.value++
    return false
  }

  if (form.password !== form.confirmPassword) {
    error.value = 'Las contraseñas no coinciden.'
    errorKey.value++
    return false
  }

  return true
}

function getErrorMessage(err) {
  const code = err?.response?.data?.code

  if (code === 'EmailAlreadyRegistered') {
    return 'Ya existe una cuenta registrada con este correo electrónico.'
  }

  if (code === 'WeakPassword') {
    return 'La contraseña no cumple con los requisitos de seguridad.'
  }

  if (code === 'InvalidIamData') {
    return 'Revisa los datos ingresados e inténtalo nuevamente.'
  }

  if (err?.response?.status === 429) {
    return 'Demasiadas solicitudes. Espera un momento e inténtalo nuevamente.'
  }

  if (!err?.response) {
    return 'No fue posible conectar con el servidor.'
  }

  return (
    err?.response?.data?.detail ||
    'No fue posible crear la cuenta. Inténtalo nuevamente.'
  )
}

async function submit() {
  if (loading.value || !validate()) return

  loading.value = true
  error.value = ''

  try {
    await signUp(form)

    await router.replace({
      name: 'login',
      query: {
        registered: '1',
        email: form.email.trim(),
      },
    })
  } catch (err) {
    error.value = getErrorMessage(err)
    errorKey.value++
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <main id="main-content" tabindex="-1" class="register-page grid min-h-dvh bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white lg:h-dvh lg:grid-cols-12 lg:overflow-hidden">

    <!-- ───────── LEFT PANEL: FAMILY ECOSYSTEM DIORAMA ───────── -->
    <aside class="brand-panel relative hidden flex-col justify-between overflow-hidden border-r border-slate-800/80 bg-slate-950 text-white lg:col-span-6 lg:flex lg:h-dvh xl:col-span-7">

      <!-- Ambient glowing orbs -->
      <div class="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl"></div>

      <!-- Brand Header -->
      <div class="reveal relative z-10 flex shrink-0 items-center justify-between" style="--d: 0ms">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-navy to-brand-navy-light text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/20">
            <BusFront :size="21" aria-hidden="true" />
          </div>
          <div>
            <span class="text-lg font-bold tracking-tight text-white xl:text-xl">
              RutaSegura
            </span>
          </div>
        </div>

        <div class="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 ring-1 ring-white/10">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
          Plataforma escolar
        </div>
      </div>

      <!-- Main Hero & Animated Family Hub Ecosystem -->
      <div class="brand-content relative z-10 my-auto flex min-h-0 max-w-2xl flex-col justify-center">

        <div class="reveal inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-wider text-emerald-300" style="--d: 80ms">
          <Users :size="13" class="text-emerald-400" />
          Portal de familias
        </div>

        <h1 class="brand-title reveal font-bold tracking-tight" style="--d: 160ms">
          Empieza a acompañar cada
          <span class="bg-gradient-to-r from-amber-300 via-brand-yellow to-brand-navy-light bg-clip-text text-transparent">
            viaje de tu familia.
          </span>
        </h1>

        <p class="brand-subtitle reveal max-w-lg text-slate-300/90" style="--d: 240ms">
          Crea tu cuenta para registrar a tus hijos y acceder a la información de sus rutas escolares desde un solo lugar.
        </p>

        <!-- ───────── NEW ANIMATION: SMART FAMILY ECOSYSTEM & BOARDING HUB ───────── -->
        <div
          class="route-preview reveal overflow-hidden rounded-2xl border border-white/15 bg-slate-900/90 shadow-[0_20px_50px_rgba(2,6,23,0.7)] ring-1 ring-white/5 backdrop-blur-xl"
          :class="{ 'is-authenticating': loading }"
          style="--d: 320ms"
        >
          <!-- Card Header -->
          <div class="route-card-header flex items-center justify-between border-b border-white/10 bg-slate-950/60">
            <div class="flex items-center gap-2.5">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/15 text-blue-400 ring-1 ring-blue-500/25">
                <Smartphone :size="15" />
              </div>
              <div>
                <p class="text-[11px] font-medium text-slate-300">
                  Ecosistema conectado entre tu familia, la ruta y el colegio
                </p>
              </div>
            </div>

            <div class="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[11px] font-medium text-slate-300 sm:flex">
              <Sparkles :size="12" class="text-emerald-400" />
              <span>Vista ilustrativa</span>
            </div>
          </div>

          <!-- Framed SVG Viewport with Tech Corner Brackets -->
          <div class="bg-slate-950/60 p-2.5">
            <div class="relative w-full overflow-hidden rounded-xl border border-emerald-400/20 bg-slate-950 shadow-inner ring-1 ring-white/5">
              <!-- HUD Corner Brackets -->
              <span class="pointer-events-none absolute left-2 top-2 z-10 h-2.5 w-2.5 rounded-tl-xs border-l-2 border-t-2 border-emerald-400/40"></span>
              <span class="pointer-events-none absolute right-2 top-2 z-10 h-2.5 w-2.5 rounded-tr-xs border-r-2 border-t-2 border-sky-400/40"></span>
              <span class="pointer-events-none absolute bottom-2 left-2 z-10 h-2.5 w-2.5 rounded-bl-xs border-b-2 border-l-2 border-emerald-400/40"></span>
              <span class="pointer-events-none absolute bottom-2 right-2 z-10 h-2.5 w-2.5 rounded-br-xs border-b-2 border-r-2 border-sky-400/40"></span>

              <svg
                viewBox="0 0 640 215"
                preserveAspectRatio="xMidYMid slice"
                class="route-svg block w-full select-none"
                role="img"
                aria-label="Ilustración interactiva que conecta la cuenta familiar, el abordaje seguro de los hijos y la llegada al colegio"
              >
                <defs>
                  <linearGradient id="hubBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#020617" />
                    <stop offset="50%" stop-color="#0f172a" />
                    <stop offset="100%" stop-color="#06192d" />
                  </linearGradient>

                  <linearGradient id="arcCyanEmerald" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#38bdf8" />
                    <stop offset="50%" stop-color="#10b981" />
                    <stop offset="100%" stop-color="#facc15" />
                  </linearGradient>

                  <linearGradient id="scanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#10b981" stop-opacity="0" />
                    <stop offset="50%" stop-color="#34d399" stop-opacity="0.35" />
                    <stop offset="100%" stop-color="#10b981" stop-opacity="0" />
                  </linearGradient>

                  <linearGradient id="hubBusYellow" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stop-color="#facc15" />
                    <stop offset="100%" stop-color="#ca8a04" />
                  </linearGradient>
                </defs>

                <!-- 1. Deep Perspective Blueprint Grid -->
                <rect width="640" height="215" fill="url(#hubBgGrad)" />
                <g stroke="rgba(56, 189, 248, 0.05)" stroke-width="1">
                  <line x1="0" y1="35" x2="640" y2="35" />
                  <line x1="0" y1="75" x2="640" y2="75" />
                  <line x1="0" y1="115" x2="640" y2="115" />
                  <line x1="0" y1="155" x2="640" y2="155" />
                  <line x1="90" y1="0" x2="90" y2="215" />
                  <line x1="205" y1="0" x2="205" y2="215" />
                  <line x1="320" y1="0" x2="320" y2="215" />
                  <line x1="435" y1="0" x2="435" y2="215" />
                  <line x1="550" y1="0" x2="550" y2="215" />
                </g>

                <!-- Ambient Radar Rings Behind Central Hub -->
                <g transform="translate(320, 128)">
                  <circle r="48" fill="none" stroke="rgba(16, 185, 129, 0.14)" stroke-width="1" stroke-dasharray="4 6" class="orbit-spin" />
                  <circle r="72" fill="none" stroke="rgba(56, 189, 248, 0.1)" stroke-width="1" />
                </g>

                <!-- 2. Glowing Ground Isometric Track -->
                <path
                  d="M 60 176 L 580 176"
                  stroke="#1e293b"
                  stroke-width="6"
                  stroke-linecap="round"
                />
                <path
                  d="M 95 176 L 545 176"
                  stroke="url(#arcCyanEmerald)"
                  stroke-width="2"
                  stroke-dasharray="8 8"
                  class="track-flow"
                />

                <!-- 3. Overhead Data Arcs Connecting Nodes -->
                <!-- Arc 1: Family App (Left) <-> Smart Boarding Bus (Center) -->
                <path
                  id="familyArc"
                  d="M 105 92 C 165 24, 250 24, 310 88"
                  fill="none"
                  stroke="rgba(56, 189, 248, 0.25)"
                  stroke-width="2"
                  stroke-dasharray="4 6"
                />
                <path
                  d="M 105 92 C 165 24, 250 24, 310 88"
                  fill="none"
                  stroke="#38bdf8"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  class="arc-pulse-left"
                />

                <!-- Arc 2: Smart Boarding Bus (Center) <-> School Campus (Right) -->
                <path
                  d="M 330 88 C 390 24, 475 24, 535 92"
                  fill="none"
                  stroke="rgba(16, 185, 129, 0.25)"
                  stroke-width="2"
                  stroke-dasharray="4 6"
                />
                <path
                  d="M 330 88 C 390 24, 475 24, 535 92"
                  fill="none"
                  stroke="#10b981"
                  stroke-width="2.5"
                  stroke-linecap="round"
                  class="arc-pulse-right"
                />

                <!-- Travelling Data Packets Along Arcs -->
                <circle r="4.5" fill="#38bdf8" class="packet-left">
                  <animateMotion dur="2.6s" repeatCount="indefinite" path="M 310 88 C 250 24, 165 24, 105 92" />
                </circle>
                <circle r="4.5" fill="#10b981" class="packet-right">
                  <animateMotion dur="2.8s" repeatCount="indefinite" path="M 330 88 C 390 24, 475 24, 535 92" />
                </circle>

                <!-- ───────── NODE 1 (LEFT): FAMILY ACCOUNT & SMARTPHONE HUB ───────── -->
                <g transform="translate(42, 70)">
                  <!-- Glowing Platform Base -->
                  <ellipse cx="58" cy="106" rx="46" ry="8" fill="rgba(56, 189, 248, 0.16)" stroke="#38bdf8" stroke-width="1" />

                  <!-- Floating Smartphone / Family App Card -->
                  <g class="float-slow">
                    <rect x="20" y="6" width="76" height="90" rx="11" fill="#0f172a" stroke="#38bdf8" stroke-width="1.8" />
                    <rect x="25" y="13" width="66" height="76" rx="7" fill="#020617" />
                    <!-- Speaker notch -->
                    <rect x="48" y="9.5" width="20" height="2" rx="1" fill="#475569" />

                    <!-- App UI: Parent & Student Avatar -->
                    <circle cx="42" cy="30" r="8" fill="#1e3a8a" stroke="#60a5fa" stroke-width="1.2" />
                    <circle cx="42" cy="28" r="2.8" fill="#93c5fd" />
                    <path d="M37 35 C37 31.5 47 31.5 47 35" fill="#93c5fd" />

                    <!-- Verified Check Badge on Phone -->
                    <circle cx="48" cy="35" r="3.5" fill="#10b981" />

                    <!-- App UI Lines -->
                    <rect x="55" y="24" width="28" height="4.5" rx="2" fill="#e2e8f0" />
                    <rect x="55" y="32" width="20" height="3.5" rx="1.5" fill="#38bdf8" />

                    <!-- Mini Route Progress Bar inside Phone -->
                    <rect x="31" y="46" width="54" height="16" rx="4" fill="#0f172a" stroke="#1e293b" stroke-width="1" />
                    <line x1="37" y1="54" x2="79" y2="54" stroke="#334155" stroke-width="2" />
                    <line x1="37" y1="54" x2="64" y2="54" stroke="#10b981" stroke-width="2" />
                    <circle cx="37" cy="54" r="2.5" fill="#38bdf8" />
                    <circle cx="64" cy="54" r="3" fill="#10b981" />
                    <circle cx="79" cy="54" r="2.5" fill="#64748b" />

                    <!-- Bottom Notification Pill inside Phone -->
                    <rect x="31" y="67" width="54" height="14" rx="4" fill="rgba(16, 185, 129, 0.15)" stroke="#10b981" stroke-width="0.8" />
                    <circle cx="38" cy="74" r="2.2" fill="#34d399" />
                    <rect x="44" y="72" width="35" height="4" rx="2" fill="#a7f3d0" />
                  </g>

                  <!-- Node Label -->
                  <rect x="14" y="114" width="88" height="16" rx="5" fill="#0f172a" stroke="#38bdf8" stroke-width="1" />
                  <text x="58" y="125" text-anchor="middle" fill="#e0f2fe" font-size="7.5" font-family="monospace" font-weight="bold">
                    1. CUENTA FAMILIAR
                  </text>
                </g>

                <!-- ───────── NODE 2 (CENTER): SMART BUS & STUDENT CHECK-IN HUB ───────── -->
                <g transform="translate(218, 66)">
                  <!-- Glowing Hex / Radar Platform -->
                  <ellipse cx="102" cy="110" rx="86" ry="12" fill="rgba(16, 185, 129, 0.18)" stroke="#10b981" stroke-width="1.2" />
                  <ellipse cx="102" cy="110" rx="65" ry="7" fill="none" stroke="#34d399" stroke-width="0.8" stroke-dasharray="4 4" />

                  <!-- Vertical Laser Scan Beam over Boarding Zone -->
                  <rect x="28" y="18" width="148" height="88" fill="url(#scanGradient)" class="scanner-sweep" />

                  <!-- Top Floating Callout Badge -->
                  <g transform="translate(45, -14)" class="hud-float-center">
                    <rect x="0" y="0" width="114" height="20" rx="6" fill="rgba(15, 23, 42, 0.95)" stroke="#10b981" stroke-width="1.2" />
                    <circle cx="11" cy="10" r="3" fill="#10b981" class="ping-dot" />
                    <text x="20" y="13" fill="#ecfdf5" font-size="7.5" font-family="monospace" font-weight="bold">
                      VINCULACIÓN SEGURA
                    </text>
                  </g>

                  <!-- Compact Detailed RutaSegura Bus at Boarding Stop -->
                  <g transform="translate(30, 44)" class="bus-idle">
                    <!-- Shadow -->
                    <ellipse cx="72" cy="58" rx="68" ry="4" fill="#020617" opacity="0.7" />

                    <!-- Roof Antenna Waves -->
                    <g transform="translate(72, -2)">
                      <circle cx="0" cy="0" r="12" fill="none" stroke="#38bdf8" stroke-width="1.2" class="gps-wave-1" />
                      <circle cx="0" cy="0" r="20" fill="none" stroke="#10b981" stroke-width="1" class="gps-wave-2" />
                      <rect x="-8" y="-3" width="16" height="5" rx="2.5" fill="#e2e8f0" />
                      <circle cx="0" cy="-3" r="2.5" fill="#10b981" />
                    </g>

                    <!-- Bus Body -->
                    <path
                      d="M 8 6 L 116 6 Q 128 6 133 18 L 140 27 Q 144 30 144 37 L 144 48 Q 144 52 139 52 L 7 52 Q 3 52 3 47 L 3 12 Q 3 6 8 6 Z"
                      fill="url(#hubBusYellow)"
                      stroke="#fef08a"
                      stroke-width="0.7"
                    />
                    <!-- Roof Cap -->
                    <path d="M 10 6 L 115 6 Q 123 6 126 10 L 5 10 Z" fill="#fef9c3" opacity="0.85" />

                    <!-- Black Safety Stripes -->
                    <rect x="3" y="33" width="140" height="4" fill="#0f172a" />
                    <text x="40" y="30" fill="#0f172a" font-size="6" font-weight="900" letter-spacing="1" font-family="sans-serif">
                      RUTASEGURA
                    </text>

                    <!-- Illuminated Windows -->
                    <g fill="#bae6fd" stroke="#0f172a" stroke-width="1.3">
                      <rect x="10" y="13" width="16" height="12" rx="2" />
                      <rect x="30" y="13" width="16" height="12" rx="2" />
                      <rect x="50" y="13" width="16" height="12" rx="2" />
                      <rect x="70" y="13" width="16" height="12" rx="2" />
                      <rect x="90" y="13" width="16" height="12" rx="2" />
                    </g>

                    <!-- Open Boarding Door with Green Welcome Glow -->
                    <rect x="110" y="13" width="11" height="34" rx="1.5" fill="#064e3b" stroke="#10b981" stroke-width="1" />
                    <circle cx="115.5" cy="24" r="3" fill="#34d399" />

                    <!-- Windshield -->
                    <path d="M 124 13 L 131 13 L 137 25 L 124 25 Z" fill="#7dd3fc" stroke="#0f172a" stroke-width="1.2" />

                    <!-- Wheels -->
                    <g transform="translate(32, 52)">
                      <circle r="9.5" fill="#0f172a" />
                      <circle r="6" fill="#1e293b" stroke="#94a3b8" stroke-width="1.5" />
                      <circle r="2.2" fill="#eab308" />
                    </g>
                    <g transform="translate(116, 52)">
                      <circle r="9.5" fill="#0f172a" />
                      <circle r="6" fill="#1e293b" stroke="#94a3b8" stroke-width="1.5" />
                      <circle r="2.2" fill="#eab308" />
                    </g>
                  </g>

                  <!-- Node Label -->
                  <rect x="44" y="118" width="116" height="16" rx="5" fill="#064e3b" stroke="#10b981" stroke-width="1" />
                  <text x="102" y="129" text-anchor="middle" fill="#ecfdf5" font-size="7.5" font-family="monospace" font-weight="bold">
                    2. REGISTRO DE HIJOS
                  </text>
                </g>

                <!-- ───────── NODE 3 (RIGHT): VERIFIED SCHOOL CAMPUS ───────── -->
                <g transform="translate(492, 70)">
                  <!-- Glowing Platform Base -->
                  <ellipse cx="52" cy="106" rx="46" ry="8" fill="rgba(250, 204, 21, 0.14)" stroke="#facc15" stroke-width="1" />

                  <!-- Modern School Building Illustration -->
                  <g class="float-slow-delayed">
                    <!-- Main Building Block -->
                    <rect x="16" y="36" width="72" height="62" rx="3" fill="#1e293b" stroke="#475569" stroke-width="1.2" />
                    <!-- Center Tower -->
                    <rect x="34" y="22" width="36" height="76" rx="2" fill="#0f172a" stroke="#60a5fa" stroke-width="1.2" />
                    <!-- Pitched Roof -->
                    <polygon points="28,22 52,6 76,22" fill="#1d4ed8" stroke="#93c5fd" stroke-width="1" />

                    <!-- School Clock / Shield Emblem -->
                    <circle cx="52" cy="34" r="6" fill="#020617" stroke="#facc15" stroke-width="1.5" />
                    <polyline points="52,31 52,34 54.5,35" fill="none" stroke="#facc15" stroke-width="1.2" stroke-linecap="round" />

                    <!-- Illuminated Classroom Windows -->
                    <g fill="#38bdf8" opacity="0.75">
                      <rect x="22" y="45" width="7" height="9" rx="1" />
                      <rect x="22" y="60" width="7" height="9" rx="1" />
                      <rect x="75" y="45" width="7" height="9" rx="1" />
                      <rect x="75" y="60" width="7" height="9" rx="1" />
                    </g>
                    <g fill="#fde047" opacity="0.85">
                      <rect x="41" y="46" width="8" height="9" rx="1" />
                      <rect x="55" y="46" width="8" height="9" rx="1" />
                      <rect x="41" y="60" width="8" height="9" rx="1" />
                      <rect x="55" y="60" width="8" height="9" rx="1" />
                    </g>

                    <!-- School Entrance Doors -->
                    <rect x="44" y="77" width="16" height="21" rx="2" fill="#065f46" stroke="#34d399" stroke-width="1.2" />
                  </g>

                  <!-- Node Label -->
                  <rect x="8" y="114" width="88" height="16" rx="5" fill="#0f172a" stroke="#facc15" stroke-width="1" />
                  <text x="52" y="125" text-anchor="middle" fill="#fef9c3" font-size="7.5" font-family="monospace" font-weight="bold">
                    3. RUTA Y COLEGIO
                  </text>
                </g>
              </svg>
            </div>
          </div>

          <!-- 3 Family Benefits at Bottom of Card -->
          <div class="route-card-footer grid grid-cols-3 gap-2.5 border-t border-white/10 bg-slate-900/90">
            <div class="rounded-xl border border-white/5 bg-white/[0.03] p-2.5 transition hover:border-white/15 hover:bg-white/[0.06]">
              <div class="flex items-center gap-1.5">
                <CheckCircle2 :size="15" class="text-emerald-400" />
                <p class="text-xs font-semibold text-white">Tus hijos</p>
              </div>
              <p class="mt-0.5 text-[11px] leading-tight text-slate-400">Información de tus hijos</p>
            </div>

            <div class="rounded-xl border border-white/5 bg-white/[0.03] p-2.5 transition hover:border-white/15 hover:bg-white/[0.06]">
              <div class="flex items-center gap-1.5">
                <CheckCircle2 :size="15" class="text-sky-400" />
                <p class="text-xs font-semibold text-white">Rutas</p>
              </div>
              <p class="mt-0.5 text-[11px] leading-tight text-slate-400">Rutas e inscripciones</p>
            </div>

            <div class="rounded-xl border border-white/5 bg-white/[0.03] p-2.5 transition hover:border-white/15 hover:bg-white/[0.06]">
              <div class="flex items-center gap-1.5">
                <CheckCircle2 :size="15" class="text-amber-300" />
                <p class="text-xs font-semibold text-white">Seguimiento</p>
              </div>
              <p class="mt-0.5 text-[11px] leading-tight text-slate-400">Desde un solo lugar</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="reveal relative z-10 flex shrink-0 items-center justify-between text-xs text-slate-400" style="--d: 400ms">
        <span>
          © {{ new Date().getFullYear() }} RutaSegura
        </span>

        <span class="flex items-center gap-2 text-slate-300">
          <ShieldCheck :size="15" class="text-emerald-400" />
          RutaSegura • Plataforma Escolar Segura
        </span>
      </div>

    </aside>

    <!-- ───────── RIGHT PANEL: FRAMED REGISTRATION PORTAL ───────── -->
    <section class="form-panel relative flex min-h-dvh flex-col justify-between overflow-y-auto lg:col-span-6 lg:h-dvh lg:overflow-hidden xl:col-span-5">

      <!-- Ambient Right-Panel Background Glows -->
      <div class="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-500/[0.07] blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-emerald-500/[0.07] blur-3xl"></div>

      <!-- Subtle Topographic Route Lines in Right Background -->
      <svg
        class="pointer-events-none absolute inset-0 h-full w-full opacity-60"
        viewBox="0 0 600 900"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <path
          d="M-60 140 C 120 160, 220 40, 420 90 S 560 240, 680 210"
          stroke="url(#regBgRoute1)"
          stroke-width="1.5"
          stroke-dasharray="6 10"
        />
        <path
          d="M-80 760 C 90 700, 240 820, 410 730 S 540 590, 660 630"
          stroke="url(#regBgRoute2)"
          stroke-width="1.5"
          stroke-dasharray="5 9"
        />
        <circle cx="420" cy="90" r="4" fill="#3b82f6" fill-opacity="0.25" />
        <circle cx="155" cy="118" r="3.5" fill="#10b981" fill-opacity="0.25" />
        <circle cx="410" cy="730" r="4" fill="#10b981" fill-opacity="0.25" />
        <defs>
          <linearGradient id="regBgRoute1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#94a3b8" stop-opacity="0" />
            <stop offset="50%" stop-color="#3b82f6" stop-opacity="0.22" />
            <stop offset="100%" stop-color="#10b981" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="regBgRoute2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#10b981" stop-opacity="0" />
            <stop offset="50%" stop-color="#64748b" stop-opacity="0.2" />
            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
          </linearGradient>
        </defs>
      </svg>

      <!-- Mobile Brand Header -->
      <div class="relative z-10 mb-4 flex shrink-0 items-center justify-between lg:hidden">
        <div class="flex items-center gap-2.5">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
            <BusFront :size="21" aria-hidden="true" />
          </div>
          <span class="text-lg font-bold tracking-tight text-slate-900">
            RutaSegura
          </span>
        </div>
      </div>

      <!-- Framed & Bordered Registration Card -->
      <div class="auth-card-wrapper reveal relative z-10 mx-auto my-auto w-full max-w-[475px]" style="--d: 120ms">
        <div class="auth-card relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-[0_24px_60px_-15px_rgba(15,23,42,0.09)] ring-1 ring-slate-900/[0.04] backdrop-blur-xl">

          <!-- Top Accent Gradient Bar on Card -->
          <div class="h-1.5 w-full bg-gradient-to-r from-brand-navy via-brand-yellow to-brand-navy-light"></div>

          <div class="auth-card-body">
            <!-- Top Navigation Row -->
            <div class="flex items-center justify-between">
              <button
                type="button"
                :disabled="loading"
                class="group inline-flex items-center gap-1.5 rounded-lg py-1 pr-2 text-xs font-semibold text-slate-500 transition-colors hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                @click="router.push({ name: 'login' })"
              >
                <ArrowLeft :size="15" class="transition-transform duration-200 group-hover:-translate-x-0.5" />
                Iniciar sesión
              </button>

              <div class="inline-flex items-center gap-1.5 rounded-full border border-blue-200/60 bg-blue-50/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                <span class="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                CREAR CUENTA
              </div>
            </div>

            <header class="mt-2">
              <h2 class="auth-title font-bold tracking-tight text-slate-900">
                Crea tu cuenta de familia
              </h2>
              <p class="mt-1 text-xs leading-relaxed text-slate-500 sm:text-sm">
                Ingresa tus datos para comenzar a utilizar RutaSegura.
              </p>
            </header>

            <AppFeedback v-if="error" :key="errorKey" class="mt-3.5" kind="error" :message="error" />

            <form
              class="auth-form"
              novalidate
              :aria-busy="loading"
              @submit.prevent="submit"
            >
              <fieldset :disabled="loading" class="form-fieldset">

                <!-- First & Last Name Grid -->
                <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div>
                    <label
                      for="firstName"
                      class="field-label block text-[11px] font-semibold uppercase tracking-wider text-slate-700"
                    >
                      Nombre
                    </label>
                    <div class="group relative">
                      <UserRound
                        :size="16"
                        class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600"
                        aria-hidden="true"
                      />
                      <input
                        id="firstName"
                        v-model="form.firstName"
                        required
                        autocomplete="given-name"
                        placeholder="Rosita"
                        class="auth-input w-full rounded-xl border border-slate-200/90 bg-slate-50/50 pl-10 pr-3.5 text-sm text-slate-900 shadow-xs outline-none transition duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/12 disabled:cursor-not-allowed disabled:bg-slate-100"
                        @input="clearError"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      for="lastName"
                      class="field-label block text-[11px] font-semibold uppercase tracking-wider text-slate-700"
                    >
                      Apellido
                    </label>
                    <div class="group relative">
                      <UserRound
                        :size="16"
                        class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600"
                        aria-hidden="true"
                      />
                      <input
                        id="lastName"
                        v-model="form.lastName"
                        required
                        autocomplete="family-name"
                        placeholder="Nery"
                        class="auth-input w-full rounded-xl border border-slate-200/90 bg-slate-50/50 pl-10 pr-3.5 text-sm text-slate-900 shadow-xs outline-none transition duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/12 disabled:cursor-not-allowed disabled:bg-slate-100"
                        @input="clearError"
                      />
                    </div>
                  </div>
                </div>

                <!-- Email -->
                <div>
                  <label
                    for="email"
                    class="field-label block text-[11px] font-semibold uppercase tracking-wider text-slate-700"
                  >
                    Correo electrónico
                  </label>
                  <div class="group relative">
                    <Mail
                      :size="16"
                      class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600"
                      aria-hidden="true"
                    />
                    <input
                      id="email"
                      v-model="form.email"
                      required
                      type="email"
                      autocomplete="email"
                      placeholder="nombre@correo.com"
                      class="auth-input w-full rounded-xl border border-slate-200/90 bg-slate-50/50 pl-10 pr-4 text-sm text-slate-900 shadow-xs outline-none transition duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/12 disabled:cursor-not-allowed disabled:bg-slate-100"
                      @input="clearError"
                    />
                  </div>
                </div>

                <!-- Password & Confirm Password Grid -->
                <div class="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div>
                    <label
                      for="password"
                      class="field-label block text-[11px] font-semibold uppercase tracking-wider text-slate-700"
                    >
                      Contraseña
                    </label>
                    <div class="group relative">
                      <LockKeyhole
                        :size="16"
                        class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600"
                        aria-hidden="true"
                      />
                      <input
                        id="password"
                        v-model="form.password"
                        required
                        aria-describedby="password-help"
                        :type="showPassword ? 'text' : 'password'"
                        autocomplete="new-password"
                        placeholder="Mínimo 8 caracteres"
                        class="auth-input w-full rounded-xl border border-slate-200/90 bg-slate-50/50 pl-10 pr-10 text-sm text-slate-900 shadow-xs outline-none transition duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/12 disabled:cursor-not-allowed disabled:bg-slate-100"
                        @input="clearError"
                        @keydown="checkCapsLock"
                        @keyup="checkCapsLock"
                      />
                      <button
                        type="button"
                        class="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600"
                        :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                        :aria-pressed="showPassword"
                        @click="showPassword = !showPassword"
                      >
                        <component :is="showPassword ? EyeOff : Eye" :size="16" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      for="confirmPassword"
                      class="field-label block text-[11px] font-semibold uppercase tracking-wider text-slate-700"
                    >
                      Confirmar contraseña
                    </label>
                    <div class="group relative">
                      <LockKeyhole
                        :size="16"
                        class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600"
                        aria-hidden="true"
                      />
                      <input
                        id="confirmPassword"
                        v-model="form.confirmPassword"
                        required
                        :type="showConfirmPassword ? 'text' : 'password'"
                        autocomplete="new-password"
                        placeholder="Repite tu contraseña"
                        class="auth-input w-full rounded-xl border border-slate-200/90 bg-slate-50/50 pl-10 pr-10 text-sm text-slate-900 shadow-xs outline-none transition duration-150 placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-600 focus:bg-white focus:ring-4 focus:ring-blue-600/12 disabled:cursor-not-allowed disabled:bg-slate-100"
                        @input="clearError"
                        @keydown="checkCapsLock"
                        @keyup="checkCapsLock"
                      />
                      <button
                        type="button"
                        class="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600"
                        :aria-label="showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                        :aria-pressed="showConfirmPassword"
                        @click="showConfirmPassword = !showConfirmPassword"
                      >
                        <component :is="showConfirmPassword ? EyeOff : Eye" :size="16" />
                      </button>
                    </div>
                  </div>
                </div>

                <!-- Interactive Password Validation Pills & CapsLock Alert -->
                <div id="password-help" class="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
                  <div class="flex flex-wrap items-center gap-1.5">
                    <span
                      class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors"
                      :class="hasLength ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20' : 'bg-slate-100 text-slate-500'"
                    >
                      <span class="h-1.5 w-1.5 rounded-full" :class="hasLength ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                      Entre 8 y 72 caracteres
                    </span>

                    <span
                      class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors"
                      :class="hasAlphaNumeric ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20' : 'bg-slate-100 text-slate-500'"
                    >
                      <span class="h-1.5 w-1.5 rounded-full" :class="hasAlphaNumeric ? 'bg-emerald-500' : 'bg-slate-400'"></span>
                      Letra y número
                    </span>

                    <span
                      v-if="form.confirmPassword"
                      class="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors"
                      :class="passwordsMatch ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-500/20'"
                    >
                      <span class="h-1.5 w-1.5 rounded-full" :class="passwordsMatch ? 'bg-emerald-500' : 'bg-amber-500'"></span>
                      {{ passwordsMatch ? 'Coinciden' : 'No coinciden' }}
                    </span>
                  </div>

                  <span
                    v-if="capsLock"
                    class="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700"
                  >
                    <TriangleAlert :size="12" class="text-amber-600" aria-hidden="true" />
                    Mayús activo
                  </span>
                </div>

                <!-- Submit Button -->
                <button
                  type="submit"
                  :disabled="loading"
                  class="auth-submit group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-600 hover:shadow-blue-600/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:bg-slate-900"
                >
                  <LoaderCircle
                    v-if="loading"
                    :size="18"
                    class="animate-spin"
                    aria-hidden="true"
                  />
                  <span>
                    {{ loading ? 'Creando cuenta...' : 'Crear mi cuenta' }}
                  </span>
                  <ArrowRight
                    v-if="!loading"
                    :size="17"
                    class="transition-transform duration-200 group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </button>
              </fieldset>
            </form>

            <!-- Login Redirect Footer -->
            <div class="login-redirect flex items-center justify-center gap-1.5 border-t border-slate-200/80 text-xs text-slate-600">
              <span>¿Ya tienes una cuenta?</span>
              <button
                type="button"
                :disabled="loading"
                class="font-bold text-blue-600 underline-offset-2 transition-colors hover:text-blue-800 hover:underline disabled:opacity-60"
                @click="router.push({ name: 'login' })"
              >
                Iniciar sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Footer -->
      <div class="relative z-10 flex shrink-0 items-center justify-center gap-2 pt-2 text-xs text-slate-400">
        <ShieldCheck :size="14" class="text-emerald-600" />
        <span>RutaSegura • Plataforma Escolar Segura</span>
      </div>

    </section>
  </main>
</template>

<style scoped>
/* =========================================
   FLUID ZOOM-RESILIENT LAYOUT SIZING
========================================= */

.brand-panel {
  padding: clamp(18px, 3.2dvh, 44px) clamp(24px, 3.5vw, 56px);
  background-image:
    radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px),
    linear-gradient(to bottom right, var(--rs-navy), var(--rs-navy-light) 60%, var(--rs-navy));
  background-size: 28px 28px, 100% 100%;
}

.brand-content {
  padding-top: clamp(8px, 1.5dvh, 24px);
  padding-bottom: clamp(8px, 1.5dvh, 24px);
}

.brand-title {
  margin-top: clamp(10px, 1.8dvh, 20px);
  font-size: clamp(26px, min(3.2vw, 4.6dvh), 44px);
  line-height: 1.12;
}

.brand-subtitle {
  margin-top: clamp(8px, 1.4dvh, 16px);
  font-size: clamp(13.5px, 1.8dvh, 16px);
  line-height: 1.5;
}

.route-preview {
  margin-top: clamp(14px, 2.4dvh, 28px);
}

.route-card-header {
  padding: clamp(8px, 1.2dvh, 12px) 16px;
}

.route-svg {
  aspect-ratio: 640 / 215;
  max-height: clamp(105px, 20.5dvh, 175px);
}

.route-card-footer {
  padding: clamp(8px, 1.2dvh, 12px);
}

.form-panel {
  padding: clamp(12px, 2.2dvh, 28px) clamp(18px, 2.8vw, 40px);
  background-color: var(--rs-background);
  background-image: none;
  box-shadow: inset 12px 0 24px -12px rgba(15, 23, 42, 0.06);
}

.auth-card-body {
  padding: clamp(18px, 2.8dvh, 30px) clamp(20px, 2.6vw, 32px);
}

.auth-title {
  font-size: clamp(22px, 3.2dvh, 27px);
}

.auth-form {
  margin-top: clamp(14px, 2.2dvh, 22px);
}

.form-fieldset {
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(11px, 1.8dvh, 16px);
}

.field-label {
  margin-bottom: clamp(5px, 0.9dvh, 8px);
}

.auth-input {
  padding-top: clamp(8.5px, 1.25dvh, 11px);
  padding-bottom: clamp(8.5px, 1.25dvh, 11px);
}

.auth-submit {
  margin-top: clamp(2px, 0.5dvh, 6px);
  padding-top: clamp(10px, 1.45dvh, 13px);
  padding-bottom: clamp(10px, 1.45dvh, 13px);
}

.login-redirect {
  margin-top: clamp(14px, 2.2dvh, 22px);
  padding-top: clamp(12px, 1.8dvh, 16px);
}

/* =========================================
   SMOOTH STAGGERED ENTRANCE (MATCHES LOGIN)
========================================= */

.reveal {
  opacity: 0;
  transform: translateY(10px);
  animation: reveal 0.55s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  animation-delay: var(--d, 0ms);
}

@keyframes reveal {
  to {
    opacity: 1;
    transform: translateY(0);
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

/* =========================================
   FAMILY ECOSYSTEM HUB ANIMATIONS
========================================= */

.orbit-spin {
  transform-box: fill-box;
  transform-origin: center;
  animation: spinSlow 24s linear infinite;
}

@keyframes spinSlow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.track-flow {
  animation: trackDash 1.4s linear infinite;
}

.is-authenticating .track-flow {
  animation-duration: 0.45s;
}

@keyframes trackDash {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -32px; }
}

.arc-pulse-left {
  stroke-dasharray: 45 240;
  animation: arcTravelLeft 2.6s linear infinite;
}

.arc-pulse-right {
  stroke-dasharray: 45 240;
  animation: arcTravelRight 2.8s linear infinite;
}

@keyframes arcTravelLeft {
  from { stroke-dashoffset: -260; }
  to { stroke-dashoffset: 40; }
}

@keyframes arcTravelRight {
  from { stroke-dashoffset: 260; }
  to { stroke-dashoffset: -40; }
}

.float-slow {
  animation: nodeFloat 3s ease-in-out infinite alternate;
}

.float-slow-delayed {
  animation: nodeFloat 3.2s ease-in-out 0.8s infinite alternate;
}

@keyframes nodeFloat {
  from { transform: translateY(0px); }
  to { transform: translateY(-4px); }
}

.bus-idle {
  animation: busIdleBounce 1.4s ease-in-out infinite alternate;
}

@keyframes busIdleBounce {
  from { transform: translate(30px, 44px); }
  to { transform: translate(30px, 42.2px); }
}

.scanner-sweep {
  animation: scanSweep 3.2s ease-in-out infinite alternate;
}

@keyframes scanSweep {
  0% {
    opacity: 0.25;
    transform: translateY(-6px);
  }
  100% {
    opacity: 0.75;
    transform: translateY(6px);
  }
}

.hud-float-center {
  animation: hudCenterFloat 2.2s ease-in-out infinite alternate;
}

@keyframes hudCenterFloat {
  from { transform: translate(45px, -14px); }
  to { transform: translate(45px, -18px); }
}

.gps-wave-1 {
  transform-box: fill-box;
  transform-origin: center;
  animation: gpsPulse 2.2s ease-out infinite;
}

.gps-wave-2 {
  transform-box: fill-box;
  transform-origin: center;
  animation: gpsPulse 2.2s ease-out 0.7s infinite;
}

@keyframes gpsPulse {
  0% {
    transform: scale(0.3);
    opacity: 0.95;
  }
  100% {
    transform: scale(1.85);
    opacity: 0;
  }
}

/* =========================================
   EXTREME ZOOM-IN FALLBACK (< 560px height)
========================================= */

@media (min-width: 1024px) and (max-height: 560px) {
  .register-page {
    height: auto;
    min-height: 100dvh;
    overflow-y: auto;
  }

  .brand-panel,
  .form-panel {
    height: auto;
    min-height: 100dvh;
    overflow: visible;
  }
}

/* =========================================
   ACCESSIBILITY
========================================= */

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