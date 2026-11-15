<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  BusFront,
  Mail,
  LockKeyhole,
  Eye,
  EyeOff,
  ArrowRight,
  TriangleAlert,
  LoaderCircle,
  ShieldCheck,
  Navigation,
  Users,
  MapPin,
} from 'lucide-vue-next'

import { useAuthStore } from '@/modules/auth/stores/authStore'
import { roleHome } from '@/modules/auth/services/sessionLifecycle'
import AppFeedback from '@/shared/components/AppFeedback.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const form = reactive({
  email: '',
  password: '',
})

const touched = reactive({
  email: false,
  password: false,
})

const showPassword = ref(false)
const capsLock = ref(false)
const loginMessage = ref('')
const registered = ref(false)

watch(() => [route.query.registered, route.query.email], ([status, email]) => {
  registered.value = status === '1'
  if (registered.value && typeof email === 'string') {
    form.email = email
  }
}, { immediate: true })

const displayError = computed(() => loginMessage.value || auth.error)

async function restoreSession() {
  await auth.initialize({ retry: true })
  if (auth.isAuthenticated) await router.replace({ name: roleHome(auth.userRole) })
}

const emailError = computed(() => {
  if (!touched.email) return ''

  if (!form.email.trim()) {
    return 'Ingresa tu correo electrónico.'
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    return 'Ingresa un correo electrónico válido.'
  }

  return ''
})

const passwordError = computed(() => {
  if (touched.password && !form.password) {
    return 'Ingresa tu contraseña.'
  }

  return ''
})

function checkCapsLock(event) {
  capsLock.value = event.getModifierState?.('CapsLock') ?? false
}

function clearLoginError() {
  loginMessage.value = ''
  auth.clearError()
}

async function handleSubmit() {
  touched.email = true
  touched.password = true

  if (emailError.value || passwordError.value || auth.loading) {
    return
  }

  clearLoginError()

  try {
    await auth.login({
      email: form.email.trim(),
      password: form.password,
    })

    if (!auth.isAuthenticated) return
    const target = typeof route.query.redirect === 'string' ? router.resolve(route.query.redirect) : null
    const allowed = target?.matched.some((record) => record.meta.requiresAuth) &&
      target.matched.every((record) => !record.meta.roles || record.meta.roles.includes(auth.userRole))
    await router.replace(allowed ? target.fullPath : { name: roleHome(auth.userRole) })
  } catch {
    // The authentication store handles login errors.
  }
}
</script>

<template>
  <main id="main-content" tabindex="-1" class="login-page grid min-h-dvh bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white lg:h-dvh lg:grid-cols-12 lg:overflow-hidden">

    <!-- ───────── LEFT PANEL: SMART TRANSIT DIORAMA ───────── -->
    <aside class="brand-panel relative hidden flex-col justify-between overflow-hidden border-r border-slate-800/80 bg-slate-950 text-white lg:col-span-6 lg:flex lg:h-dvh xl:col-span-7">

      <!-- Ambient glowing orbs -->
      <div class="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-blue-600/25 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-32 right-0 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl"></div>

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
          <span class="h-1.5 w-1.5 rounded-full bg-blue-400"></span>
          Plataforma escolar
        </div>
      </div>

      <!-- Main Hero & Animated Bus Landscape -->
      <div class="brand-content relative z-10 my-auto flex min-h-0 max-w-2xl flex-col justify-center">

        <div class="reveal inline-flex w-fit items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300" style="--d: 80ms">
          <BusFront :size="13" class="text-emerald-400" />
          Gestión de transporte escolar
        </div>

        <h2 class="brand-title reveal font-bold tracking-tight" style="--d: 160ms">
          El transporte escolar,
          <span class="bg-gradient-to-r from-amber-300 via-brand-yellow to-brand-navy-light bg-clip-text text-transparent">
            más cerca de tu familia.
          </span>
        </h2>

        <p class="brand-subtitle reveal max-w-lg text-slate-300/90" style="--d: 240ms">
          Una plataforma para consultar información de rutas, viajes y estudiantes desde un mismo lugar.
        </p>

        <!-- Animated Bus Landscape Card -->
        <div
          class="route-preview reveal overflow-hidden rounded-2xl border border-white/15 bg-slate-900/85 shadow-2xl backdrop-blur-xl"
          :class="{ 'is-authenticating': auth.loading }"
          style="--d: 320ms"
        >
          <!-- Illustration Header inside Card -->
          <div class="route-card-header flex items-center justify-between border-b border-white/10 bg-slate-950/60">
            <div class="flex items-center gap-2.5">
              <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25">
                <Navigation :size="15" />
              </div>
              <div>
                <p class="text-[11px] text-slate-400">
                  Información organizada para cada cuenta
                </p>
              </div>
            </div>

            <div class="hidden items-center gap-1.5 text-xs font-medium text-slate-400 sm:flex">
              <MapPin :size="13" class="text-blue-400" />
              <span>Vista ilustrativa</span>
            </div>
          </div>

          <!-- Animated SVG Landscape Viewport -->
          <div class="relative w-full bg-slate-950">
            <svg
              viewBox="0 0 640 215"
              preserveAspectRatio="xMidYMid slice"
              class="route-svg block w-full select-none"
              role="img"
              aria-label="Ilustración animada de un autobús escolar de RutaSegura recorriendo su ruta hacia el colegio"
            >
              <defs>
                <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#020617" />
                  <stop offset="55%" stop-color="#0f172a" />
                  <stop offset="100%" stop-color="#1e293b" />
                </linearGradient>

                <linearGradient id="mountainGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#1e293b" />
                  <stop offset="100%" stop-color="#0f172a" />
                </linearGradient>

                <linearGradient id="headlightBeam" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stop-color="#fde047" stop-opacity="0.55" />
                  <stop offset="60%" stop-color="#fef08a" stop-opacity="0.15" />
                  <stop offset="100%" stop-color="#fef08a" stop-opacity="0" />
                </linearGradient>

                <linearGradient id="telemetryBeam" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.42" />
                  <stop offset="100%" stop-color="#10b981" stop-opacity="0.02" />
                </linearGradient>

                <linearGradient id="busYellow" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#facc15" />
                  <stop offset="55%" stop-color="#eab308" />
                  <stop offset="100%" stop-color="#ca8a04" />
                </linearGradient>

                <linearGradient id="windowGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#bae6fd" />
                  <stop offset="100%" stop-color="#38bdf8" />
                </linearGradient>
              </defs>

              <!-- 1. Sky Background & Map Grid -->
              <rect width="640" height="215" fill="url(#skyGrad)" />
              <g stroke="rgba(56, 189, 248, 0.05)" stroke-width="1">
                <line x1="0" y1="35" x2="640" y2="35" />
                <line x1="0" y1="75" x2="640" y2="75" />
                <line x1="0" y1="115" x2="640" y2="115" />
                <line x1="120" y1="0" x2="120" y2="160" />
                <line x1="280" y1="0" x2="280" y2="160" />
                <line x1="440" y1="0" x2="440" y2="160" />
                <line x1="580" y1="0" x2="580" y2="160" />
              </g>

              <!-- Stars -->
              <g fill="#e2e8f0" opacity="0.5">
                <circle cx="70" cy="24" r="1" />
                <circle cx="165" cy="16" r="1.4" opacity="0.8" />
                <circle cx="340" cy="26" r="1" />
                <circle cx="490" cy="18" r="1.2" />
                <circle cx="590" cy="30" r="1" />
              </g>

              <!-- 2. Distant Mountains -->
              <path
                d="M0 160 L0 112 L85 72 L175 122 L270 64 L385 124 L475 78 L565 116 L640 84 L640 160 Z"
                fill="url(#mountainGrad)"
                opacity="0.85"
              />

              <!-- 3. Parallax City Skyline & School Campus -->
              <g class="parallax-city" fill="#1e293b" opacity="0.9">
                <g>
                  <rect x="30" y="106" width="38" height="54" rx="2" />
                  <rect x="75" y="90" width="46" height="70" rx="2" />
                  <rect x="130" y="116" width="32" height="44" rx="2" />
                  <rect x="210" y="103" width="75" height="57" rx="2" fill="#172554" />
                  <polygon points="205,103 247,82 290,103" fill="#1e3a8a" />
                  <rect x="241" y="70" width="12" height="14" fill="#1e3a8a" />
                  <g fill="#38bdf8" opacity="0.35">
                    <rect x="83" y="98" width="6" height="6" />
                    <rect x="95" y="98" width="6" height="6" />
                    <rect x="83" y="110" width="6" height="6" />
                    <rect x="107" y="110" width="6" height="6" />
                    <rect x="222" y="113" width="10" height="8" fill="#fde047" opacity="0.6" />
                    <rect x="242" y="113" width="10" height="8" fill="#fde047" opacity="0.6" />
                    <rect x="262" y="113" width="10" height="8" fill="#fde047" opacity="0.6" />
                  </g>
                  <rect x="340" y="98" width="42" height="62" rx="2" />
                  <rect x="390" y="114" width="35" height="46" rx="2" />
                  <rect x="480" y="94" width="50" height="66" rx="2" />
                  <rect x="540" y="110" width="38" height="50" rx="2" />
                </g>
                <g transform="translate(640, 0)">
                  <rect x="30" y="106" width="38" height="54" rx="2" />
                  <rect x="75" y="90" width="46" height="70" rx="2" />
                  <rect x="130" y="116" width="32" height="44" rx="2" />
                  <rect x="210" y="103" width="75" height="57" rx="2" fill="#172554" />
                  <polygon points="205,103 247,82 290,103" fill="#1e3a8a" />
                  <rect x="241" y="70" width="12" height="14" fill="#1e3a8a" />
                  <g fill="#38bdf8" opacity="0.35">
                    <rect x="83" y="98" width="6" height="6" />
                    <rect x="95" y="98" width="6" height="6" />
                    <rect x="83" y="110" width="6" height="6" />
                    <rect x="107" y="110" width="6" height="6" />
                    <rect x="222" y="113" width="10" height="8" fill="#fde047" opacity="0.6" />
                    <rect x="242" y="113" width="10" height="8" fill="#fde047" opacity="0.6" />
                    <rect x="262" y="113" width="10" height="8" fill="#fde047" opacity="0.6" />
                  </g>
                  <rect x="340" y="98" width="42" height="62" rx="2" />
                  <rect x="390" y="114" width="35" height="46" rx="2" />
                  <rect x="480" y="94" width="50" height="66" rx="2" />
                  <rect x="540" y="110" width="38" height="50" rx="2" />
                </g>
              </g>

              <!-- 4. Midground Trees & Smart Pickup Stop -->
              <g class="parallax-trees">
                <g>
                  <g fill="#064e3b">
                    <polygon points="55,160 65,129 75,160" />
                    <polygon points="180,160 192,123 204,160" />
                    <polygon points="315,160 325,131 335,160" />
                    <polygon points="445,160 458,121 471,160" />
                    <polygon points="595,160 606,130 617,160" />
                  </g>
                  <g transform="translate(500, 119)">
                    <ellipse cx="18" cy="42" rx="28" ry="5" fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" stroke-width="1" stroke-dasharray="3 3" />
                    <rect x="4" y="10" width="28" height="31" rx="2" fill="rgba(15, 23, 42, 0.85)" stroke="#38bdf8" stroke-width="1.5" />
                    <rect x="0" y="7" width="36" height="4" rx="2" fill="#38bdf8" />
                    <circle cx="18" cy="21" r="3.5" fill="#34d399" />
                    <path d="M12 34 C12 27 24 27 24 34" fill="#34d399" />
                    <rect x="-18" y="-14" width="72" height="15" rx="4" fill="#065f46" stroke="#34d399" stroke-width="1" />
                    <text x="18" y="-4" text-anchor="middle" fill="#ecfdf5" font-size="7" font-family="monospace" font-weight="bold">
                      PARADERO
                    </text>
                  </g>
                </g>

                <g transform="translate(640, 0)">
                  <g fill="#064e3b">
                    <polygon points="55,160 65,129 75,160" />
                    <polygon points="180,160 192,123 204,160" />
                    <polygon points="315,160 325,131 335,160" />
                    <polygon points="445,160 458,121 471,160" />
                    <polygon points="595,160 606,130 617,160" />
                  </g>
                  <g transform="translate(500, 119)">
                    <ellipse cx="18" cy="42" rx="28" ry="5" fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" stroke-width="1" stroke-dasharray="3 3" />
                    <rect x="4" y="10" width="28" height="31" rx="2" fill="rgba(15, 23, 42, 0.85)" stroke="#38bdf8" stroke-width="1.5" />
                    <rect x="0" y="7" width="36" height="4" rx="2" fill="#38bdf8" />
                    <circle cx="18" cy="21" r="3.5" fill="#34d399" />
                    <path d="M12 34 C12 27 24 27 24 34" fill="#34d399" />
                    <rect x="-18" y="-14" width="72" height="15" rx="4" fill="#065f46" stroke="#34d399" stroke-width="1" />
                    <text x="18" y="-4" text-anchor="middle" fill="#ecfdf5" font-size="7" font-family="monospace" font-weight="bold">
                      PARADERO
                    </text>
                  </g>
                </g>
              </g>

              <!-- 5. Highway & Animated Lane Stripes -->
              <rect x="0" y="160" width="640" height="55" fill="#090d16" />
              <line x1="0" y1="160" x2="640" y2="160" stroke="#0284c7" stroke-width="2" opacity="0.65" />
              <line x1="0" y1="206" x2="640" y2="206" stroke="#1e293b" stroke-width="1.5" />
              <line
                x1="0"
                y1="184"
                x2="640"
                y2="184"
                stroke="#38bdf8"
                stroke-width="2.5"
                stroke-dasharray="28 36"
                stroke-linecap="round"
                opacity="0.55"
                class="road-stripes"
              />

              <!-- 6. Orbital GPS Satellite & Signal Cone -->
              <g>
                <polygon
                  points="115,24 245,112 305,112"
                  fill="url(#telemetryBeam)"
                  class="telemetry-cone"
                />
                <g transform="translate(105, 14)">
                  <rect x="-14" y="4" width="10" height="6" rx="1" fill="#38bdf8" />
                  <rect x="14" y="4" width="10" height="6" rx="1" fill="#38bdf8" />
                  <rect x="-3" y="2" width="16" height="10" rx="2" fill="#e2e8f0" />
                  <circle cx="5" cy="7" r="2.5" fill="#10b981" />
                </g>
              </g>

              <!-- 7. THE RUTASEGURA SCHOOL BUS -->
              <g transform="translate(175, 103)">
                <g class="bus-chassis">
                  <polygon points="184,38 355,14 355,68 184,54" fill="url(#headlightBeam)" />
                  <ellipse cx="95" cy="68" rx="92" ry="5" fill="#000000" opacity="0.65" />

                  <g transform="translate(115, 0)">
                    <circle cx="0" cy="0" r="14" fill="none" stroke="#10b981" stroke-width="1.5" class="gps-wave-1" />
                    <circle cx="0" cy="0" r="24" fill="none" stroke="#38bdf8" stroke-width="1" class="gps-wave-2" />
                    <rect x="-10" y="-4" width="20" height="6" rx="3" fill="#e2e8f0" />
                    <circle cx="0" cy="-4" r="3" fill="#10b981" />
                  </g>

                  <g transform="translate(26, -31)" class="hud-float">
                    <rect x="0" y="0" width="104" height="22" rx="6" fill="rgba(15, 23, 42, 0.92)" stroke="#10b981" stroke-width="1.2" />
                    <circle cx="11" cy="11" r="3.5" fill="#10b981" />
                    <text x="21" y="14" fill="#f8fafc" font-size="8" font-family="monospace" font-weight="bold">
                      RUTA ESCOLAR
                    </text>
                    <polygon points="50,22 55,22 52.5,27" fill="#10b981" />
                  </g>

                  <path
                    d="M 10 8
                       L 152 8
                       Q 166 8 172 22
                       L 182 32
                       Q 188 35 188 43
                       L 188 55
                       Q 188 59 182 59
                       L 8 59
                       Q 4 59 4 54
                       L 4 14
                       Q 4 8 10 8 Z"
                    fill="url(#busYellow)"
                    stroke="#fef08a"
                    stroke-width="0.75"
                  />

                  <path
                    d="M 12 8 L 150 8 Q 160 8 164 13 L 6 13 Q 7 8 12 8 Z"
                    fill="#fef9c3"
                    opacity="0.85"
                  />

                  <rect x="4" y="38" width="182" height="4.5" fill="#0f172a" />
                  <rect x="4" y="45" width="174" height="2.5" fill="#0f172a" opacity="0.8" />

                  <text x="58" y="35" fill="#0f172a" font-size="6.5" font-weight="900" letter-spacing="1.2" font-family="sans-serif">
                    RUTASEGURA
                  </text>

                  <g fill="url(#windowGlow)" stroke="#0f172a" stroke-width="1.5">
                    <rect x="12" y="15" width="20" height="14" rx="2.5" />
                    <rect x="36" y="15" width="20" height="14" rx="2.5" />
                    <rect x="60" y="15" width="20" height="14" rx="2.5" />
                    <rect x="84" y="15" width="20" height="14" rx="2.5" />
                    <rect x="108" y="15" width="20" height="14" rx="2.5" />
                  </g>

                  <rect x="133" y="15" width="13" height="38" rx="2" fill="#0f172a" />
                  <rect x="135" y="17" width="9" height="16" rx="1" fill="url(#windowGlow)" opacity="0.85" />
                  <rect x="135" y="35" width="9" height="15" rx="1" fill="url(#windowGlow)" opacity="0.45" />

                  <path
                    d="M 150 15 L 164 15 L 171 29 L 150 29 Z"
                    fill="url(#windowGlow)"
                    stroke="#0f172a"
                    stroke-width="1.5"
                  />

                  <circle cx="129" cy="36" r="4.5" fill="#ef4444" stroke="#ffffff" stroke-width="1" />
                  <rect x="3" y="32" width="3" height="8" rx="1" fill="#ef4444" />
                  <rect x="3" y="21" width="3" height="5" rx="1" fill="#f97316" />
                  <rect x="184" y="42" width="5" height="8" rx="2" fill="#fef08a" />

                  <rect x="1" y="53" width="10" height="5" rx="2" fill="#1e293b" />
                  <rect x="181" y="53" width="10" height="5" rx="2" fill="#1e293b" />
                </g>

                <!-- Rear Wheel -->
                <g transform="translate(42, 59)">
                  <circle r="12" fill="#0f172a" />
                  <g class="wheel-spin">
                    <circle r="8" fill="#1e293b" stroke="#94a3b8" stroke-width="1.5" />
                    <line x1="-8" y1="0" x2="8" y2="0" stroke="#94a3b8" stroke-width="1.5" />
                    <line x1="0" y1="-8" x2="0" y2="8" stroke="#94a3b8" stroke-width="1.5" />
                    <circle r="3" fill="#eab308" />
                  </g>
                </g>

                <!-- Front Wheel -->
                <g transform="translate(152, 59)">
                  <circle r="12" fill="#0f172a" />
                  <g class="wheel-spin">
                    <circle r="8" fill="#1e293b" stroke="#94a3b8" stroke-width="1.5" />
                    <line x1="-8" y1="0" x2="8" y2="0" stroke="#94a3b8" stroke-width="1.5" />
                    <line x1="0" y1="-8" x2="0" y2="8" stroke="#94a3b8" stroke-width="1.5" />
                    <circle r="3" fill="#eab308" />
                  </g>
                </g>
              </g>
            </svg>
          </div>

          <!-- 3 Pillar Cards at Bottom of Route Preview -->
          <div class="route-card-footer grid grid-cols-3 gap-2.5 border-t border-white/10 bg-slate-900/90">
            <div class="rounded-xl bg-white/[0.04] p-2.5 ring-1 ring-white/5 transition hover:bg-white/[0.07]">
              <div class="flex items-center gap-1.5">
                <Navigation :size="15" class="text-blue-400" />
                <p class="text-xs font-semibold text-white">Rutas</p>
              </div>
              <p class="mt-0.5 text-[11px] leading-tight text-slate-400">Paraderos y horarios claros</p>
            </div>

            <div class="rounded-xl bg-white/[0.04] p-2.5 ring-1 ring-white/5 transition hover:bg-white/[0.07]">
              <div class="flex items-center gap-1.5">
                <BusFront :size="15" class="text-emerald-400" />
                <p class="text-xs font-semibold text-white">Viajes</p>
              </div>
              <p class="mt-0.5 text-[11px] leading-tight text-slate-400">Información de recorridos</p>
            </div>

            <div class="rounded-xl bg-white/[0.04] p-2.5 ring-1 ring-white/5 transition hover:bg-white/[0.07]">
              <div class="flex items-center gap-1.5">
                <Users :size="15" class="text-amber-300" />
                <p class="text-xs font-semibold text-white">Estudiantes</p>
              </div>
              <p class="mt-0.5 text-[11px] leading-tight text-slate-400">Control de asistencia seguro</p>
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

    <!-- ───────── RIGHT PANEL: FRAMED AUTHENTICATION PORTAL ───────── -->
    <section class="form-panel relative flex min-h-dvh flex-col justify-between overflow-hidden lg:col-span-6 lg:h-dvh lg:overflow-y-auto xl:col-span-5">

      <!-- Ambient Right-Panel Background Landscape / Route Contours -->
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
          stroke="url(#bgRoute1)"
          stroke-width="1.5"
          stroke-dasharray="6 10"
        />
        <path
          d="M-80 760 C 90 700, 240 820, 410 730 S 540 590, 660 630"
          stroke="url(#bgRoute2)"
          stroke-width="1.5"
          stroke-dasharray="5 9"
        />
        <circle cx="420" cy="90" r="4" fill="#3b82f6" fill-opacity="0.25" />
        <circle cx="155" cy="118" r="3.5" fill="#10b981" fill-opacity="0.25" />
        <circle cx="410" cy="730" r="4" fill="#10b981" fill-opacity="0.25" />
        <defs>
          <linearGradient id="bgRoute1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#94a3b8" stop-opacity="0" />
            <stop offset="50%" stop-color="#3b82f6" stop-opacity="0.22" />
            <stop offset="100%" stop-color="#10b981" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="bgRoute2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#10b981" stop-opacity="0" />
            <stop offset="50%" stop-color="#64748b" stop-opacity="0.2" />
            <stop offset="100%" stop-color="#3b82f6" stop-opacity="0" />
          </linearGradient>
        </defs>
      </svg>

      <!-- Mobile Brand Header -->
      <div class="relative z-10 flex shrink-0 items-center justify-between lg:hidden">
        <div class="flex items-center gap-2.5">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-600/20">
            <BusFront :size="21" aria-hidden="true" />
          </div>
          <span class="text-lg font-bold tracking-tight text-slate-900">
            RutaSegura
          </span>
        </div>
      </div>

      <!-- Framed & Bordered Authentication Card -->
      <div class="auth-card-wrapper reveal relative z-10 mx-auto my-auto w-full max-w-[440px]" style="--d: 120ms">
        <div class="auth-card relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-[0_24px_60px_-15px_rgba(15,23,42,0.09)] ring-1 ring-slate-900/[0.04] backdrop-blur-xl">

          <!-- Top Accent Gradient Bar on Card -->
          <div class="h-1.5 w-full bg-gradient-to-r from-brand-navy via-brand-yellow to-brand-navy-light"></div>

          <div class="auth-card-body">
            <header>
              <div class="inline-flex items-center gap-2 rounded-full border border-blue-200/60 bg-blue-50/80 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-700">
                <span class="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
                BIENVENIDO
              </div>

              <h1 class="auth-title font-bold tracking-tight text-slate-900">
                Iniciar sesión
              </h1>

              <p class="mt-1.5 text-sm leading-relaxed text-slate-500">
                Ingresa con el correo asociado a tu cuenta de RutaSegura.
              </p>
            </header>

            <AppFeedback v-if="registered" class="mt-5" kind="success" message="Tu cuenta se creó correctamente. Inicia sesión para continuar." />
            <AppFeedback v-if="auth.sessionReason === 'expired'" class="mt-5" message="Tu sesión ha vencido. Inicia sesión nuevamente para continuar." />
            <AppFeedback v-if="auth.sessionReason === 'invalid'" class="mt-5" kind="error" message="Tu cuenta no tiene acceso a esta plataforma." />
            <AppFeedback v-if="displayError" class="mt-5" kind="error" :message="displayError"
              :retry-label="auth.restoreUnavailable ? 'Reintentar conexión' : undefined" @retry="restoreSession" />

            <form
              class="auth-form"
              :aria-busy="auth.loading"
              novalidate
              @submit.prevent="handleSubmit"
            >

              <!-- Email -->
              <div class="field-group">
                <label
                  for="email"
                  class="field-label block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Correo electrónico
                </label>

                <div class="group relative">
                  <Mail
                    :size="17"
                    class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600"
                    :class="{ '!text-red-500': emailError }"
                    aria-hidden="true"
                  />

                  <input
                    id="email"
                    v-model="form.email"
                    type="email"
                    autocomplete="username"
                    placeholder="nombre@correo.com"
                    class="auth-input w-full rounded-xl border bg-slate-50/50 pl-11 pr-4 text-sm text-slate-900 shadow-xs outline-none transition duration-150 placeholder:text-slate-400 focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100"
                    :class="emailError
                      ? 'border-red-400 bg-red-50/15 focus:border-red-500 focus:ring-red-500/15'
                      : 'border-slate-200/90 hover:border-slate-300 focus:border-blue-600 focus:ring-blue-600/12'"
                    :aria-invalid="Boolean(emailError)"
                    :aria-describedby="emailError ? 'email-error' : undefined"
                    :disabled="auth.loading"
                    @blur="touched.email = true"
                    @input="clearLoginError"
                  />
                </div>

                <p
                  v-if="emailError"
                  id="email-error"
                  class="mt-1.5 text-xs font-medium text-red-600"
                >
                  {{ emailError }}
                </p>
              </div>

              <!-- Password -->
              <div class="field-group">
                <label
                  for="password"
                  class="field-label block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Contraseña
                </label>

                <div class="group relative">
                  <LockKeyhole
                    :size="17"
                    class="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-600"
                    :class="{ '!text-red-500': passwordError }"
                    aria-hidden="true"
                  />

                  <input
                    id="password"
                    v-model="form.password"
                    :type="showPassword ? 'text' : 'password'"
                    autocomplete="current-password"
                    placeholder="Ingresa tu contraseña"
                    class="auth-input w-full rounded-xl border bg-slate-50/50 pl-11 pr-12 text-sm text-slate-900 shadow-xs outline-none transition duration-150 placeholder:text-slate-400 focus:bg-white focus:ring-4 disabled:cursor-not-allowed disabled:bg-slate-100"
                    :class="passwordError
                      ? 'border-red-400 bg-red-50/15 focus:border-red-500 focus:ring-red-500/15'
                      : 'border-slate-200/90 hover:border-slate-300 focus:border-blue-600 focus:ring-blue-600/12'"
                    :aria-invalid="Boolean(passwordError)"
                    :aria-describedby="passwordError ? 'password-error' : undefined"
                    :disabled="auth.loading"
                    @blur="touched.password = true"
                    @input="clearLoginError"
                    @keydown="checkCapsLock"
                    @keyup="checkCapsLock"
                  />

                  <button
                    type="button"
                    class="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600"
                    :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
                    :aria-pressed="showPassword"
                    @click="showPassword = !showPassword"
                  >
                    <component
                      :is="showPassword ? EyeOff : Eye"
                      :size="17"
                    />
                  </button>
                </div>

                <p
                  v-if="passwordError"
                  id="password-error"
                  class="mt-1.5 text-xs font-medium text-red-600"
                >
                  {{ passwordError }}
                </p>

                <p
                  v-else-if="capsLock"
                  class="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-amber-700"
                >
                  <TriangleAlert :size="14" class="text-amber-600" aria-hidden="true" />
                  Bloq Mayús está activado.
                </p>
              </div>

              <!-- Submit Button -->
              <button
                type="submit"
                :disabled="auth.loading"
                class="auth-submit group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-600 hover:shadow-blue-600/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:translate-y-0 disabled:hover:bg-slate-900"
              >
                <LoaderCircle
                  v-if="auth.loading"
                  :size="18"
                  class="animate-spin"
                  aria-hidden="true"
                />

                <span>
                  {{ auth.loading ? 'Autenticando...' : 'Ingresar a RutaSegura' }}
                </span>

                <ArrowRight
                  v-if="!auth.loading"
                  :size="17"
                  class="transition-transform duration-200 group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </button>

              <div class="register-link flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-center text-sm text-slate-500">
                <span>¿No tienes una cuenta?</span>

                <button
                  type="button"
                  class="rounded-md px-1 py-1 font-semibold text-blue-600 transition hover:text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="auth.loading"
                  @click="router.push({ name: 'register' })"
                >
                  Regístrate
                </button>
              </div>
            </form>

            <!-- Help Card -->
            <div class="help-card rounded-xl border border-slate-200/80 bg-slate-50/90 text-center">
              <p class="text-xs leading-relaxed text-slate-600">
                Si tienes problemas para acceder, comunícate con tu institución educativa.
              </p>
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
  margin-top: clamp(14px, 2.6dvh, 30px);
}

.route-card-header {
  padding: clamp(8px, 1.2dvh, 12px) 16px;
}

.route-svg {
  aspect-ratio: 640 / 215;
  max-height: clamp(110px, 22dvh, 185px);
}

.route-card-footer {
  padding: clamp(8px, 1.2dvh, 12px);
}

/* Framed & Atmospheric Right Panel */
.form-panel {
  padding: clamp(14px, 2.6dvh, 32px) clamp(20px, 3vw, 44px);
  background-color: var(--rs-background);
  background-image: none;
  box-shadow: inset 12px 0 24px -12px rgba(15, 23, 42, 0.06);
}

.auth-card-body {
  padding: clamp(22px, 3.6dvh, 38px) clamp(22px, 2.8vw, 36px);
}

.auth-title {
  margin-top: clamp(10px, 1.6dvh, 16px);
  font-size: clamp(24px, 3.5dvh, 30px);
}

/* Generous spacing between header, CORREO ELECTRÓNICO, CONTRASEÑA, and button */
.auth-form {
  margin-top: clamp(22px, 3.4dvh, 32px);
  display: flex;
  flex-direction: column;
  gap: clamp(18px, 2.7dvh, 24px);
}

/* Extra breathing room between label ("CORREO ELECTRÓNICO") and its input box */
.field-label {
  margin-bottom: clamp(8px, 1.2dvh, 11px);
}

.auth-input {
  padding-top: clamp(10px, 1.45dvh, 13px);
  padding-bottom: clamp(10px, 1.45dvh, 13px);
}

.auth-submit {
  margin-top: clamp(2px, 0.5dvh, 6px);
  padding-top: clamp(11px, 1.6dvh, 14px);
  padding-bottom: clamp(11px, 1.6dvh, 14px);
}

.help-card {
  margin-top: clamp(16px, 2.6dvh, 26px);
  padding: clamp(10px, 1.4dvh, 14px) 14px;
}

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

.road-stripes {
  animation: roadMove 0.65s linear infinite;
}

.is-authenticating .road-stripes {
  animation-duration: 0.28s;
}

@keyframes roadMove {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -64px; }
}

.parallax-trees {
  animation: scrollLandscape 9s linear infinite;
}

.is-authenticating .parallax-trees {
  animation-duration: 4.5s;
}

.parallax-city {
  animation: scrollLandscape 26s linear infinite;
}

@keyframes scrollLandscape {
  from { transform: translateX(0); }
  to { transform: translateX(-640px); }
}

.bus-chassis {
  animation: suspensionBounce 1.1s ease-in-out infinite alternate;
}

@keyframes suspensionBounce {
  0% { transform: translateY(0px); }
  100% { transform: translateY(-2.2px); }
}

.wheel-spin {
  animation: spin 0.7s linear infinite;
}

.is-authenticating .wheel-spin {
  animation-duration: 0.3s;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.gps-wave-1 {
  transform-box: fill-box;
  transform-origin: center;
  animation: gpsPulse 2s ease-out infinite;
}

.gps-wave-2 {
  transform-box: fill-box;
  transform-origin: center;
  animation: gpsPulse 2s ease-out 0.6s infinite;
}

@keyframes gpsPulse {
  0% {
    transform: scale(0.3);
    opacity: 0.95;
  }
  100% {
    transform: scale(1.9);
    opacity: 0;
  }
}

.telemetry-cone {
  animation: beamPulse 2.4s ease-in-out infinite alternate;
}

@keyframes beamPulse {
  0% { opacity: 0.55; }
  100% { opacity: 0.95; }
}

.hud-float {
  animation: hudFloat 2s ease-in-out infinite alternate;
}

@keyframes hudFloat {
  from { transform: translate(26px, -31px); }
  to { transform: translate(26px, -35px); }
}

@media (min-width: 1024px) and (max-height: 520px) {
  .login-page {
    height: auto;
    min-height: 100dvh;
    overflow-y: auto;
  }

  .brand-panel,
  .form-panel {
    height: auto;
    min-height: 100dvh;
  }
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
