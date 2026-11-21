<script setup>
import { computed, ref, watch } from 'vue'
import {
  RouterLink,
  RouterView,
  useRoute,
  useRouter,
} from 'vue-router'
import {
  Activity,
  BusFront,
  ChevronRight,
  LogOut,
  Menu,
  Route,
  ShieldCheck,
  Sparkles,
  Megaphone,
  CreditCard,
  Building2,
  Users,
  X,
} from 'lucide-vue-next'

import { useModalFocus } from '@/shared/composables/useModalFocus'

import { useAuthStore } from '@/modules/auth/stores/authStore'
import NotificationBellMenu from '@/modules/notifications/presentation/components/NotificationBellMenu.vue'

const auth = useAuthStore()
const router = useRouter()
const currentRoute = useRoute()

const mobileMenuOpen = ref(false)
const drawerPanel = ref(null)
useModalFocus(mobileMenuOpen, drawerPanel)

const fullName = computed(() => {
  const name = `${auth.user?.firstName ?? ''} ${auth.user?.lastName ?? ''}`.trim()
  return name || auth.user?.email || ''
})

const userInitials = computed(() => {
  const first = auth.user?.firstName?.[0] ?? ''
  const last = auth.user?.lastName?.[0] ?? ''
  return `${first}${last}`.toUpperCase() || (auth.user?.email?.[0] ?? '').toUpperCase()
})

const items = [
  { label: 'Familias y alumnos', route: { name: 'admin-families' }, icon: Users },
  { label: 'Comunicados', route: { name: 'admin-announcements' }, icon: Megaphone },
  { label: 'Suscripción', route: { name: 'admin-subscription' }, icon: CreditCard },
  { label: 'Organización', route: { name: 'admin-organization' }, icon: Building2 },
  {
    label: 'Rutas escolares',
    route: {
      name: 'admin-routes',
    },
    icon: Route,
  },
  {
    label: 'Conductores y vehículos',
    route: {
      name: 'admin-resources',
    },
    icon: Users,
  },
  {
    label: 'Monitoreo de viajes',
    route: {
      name: 'admin-trips',
    },
    icon: Activity,
  },
]

const activeItem = computed(() => {
  return (
    items.find((item) => item.route.name === currentRoute.name) ?? items[0]
  )
})

watch(
  () => currentRoute.fullPath,
  () => {
    mobileMenuOpen.value = false
  }
)

async function logout() {
  mobileMenuOpen.value = false
  await auth.logout()
  await router.replace({
    name: 'login',
  })
}
</script>

<template>
  <div class="admin-shell min-h-dvh bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white">

    <!-- ───────── DESKTOP SIDEBAR (Fixed to viewport, zero scrollbar) ───────── -->
    <aside
      class="sidebar hidden border-r border-slate-800/80 bg-slate-950 text-white lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-[268px] lg:flex-col lg:justify-between lg:overflow-y-auto"
    >
      <!-- Ambient glowing orbs (Blue + Indigo/Cyan Admin Accent) -->
      <div class="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-blue-600/25 blur-3xl"></div>
      <div class="pointer-events-none absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl"></div>

      <!-- Top Brand Header & Navigation -->
      <div class="relative z-10 min-h-0">
        <div class="sidebar-brand flex items-center gap-3 px-2">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-navy to-brand-navy-light text-white shadow-lg shadow-blue-500/25 ring-1 ring-white/20">
            <BusFront :size="20" aria-hidden="true" />
          </div>

          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <strong class="block truncate text-base font-bold tracking-tight text-white">
                RutaSegura
              </strong>
              <span class="rounded bg-blue-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-sky-300 ring-1 ring-sky-400/30">
                ADMIN
              </span>
            </div>

            <span class="mt-0.5 inline-flex items-center gap-1.5 text-[11px] font-medium text-sky-300/90">
              <ShieldCheck :size="12" class="text-emerald-400" />
              Panel administrativo
            </span>
          </div>
        </div>

        <div class="mb-2 px-2.5">
          <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400/80">
            Administración
          </span>
        </div>

        <!-- Navigation Links -->
        <nav class="sidebar-nav flex flex-col" aria-label="Menú administrativo">
          <RouterLink
            v-for="item in items"
            :key="item.label"
            :to="item.route"
            class="nav-item group relative flex items-center justify-between rounded-xl px-3 text-sm font-semibold text-slate-300 transition-all duration-200 hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            <span
              class="active-bar absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-brand-navy to-brand-navy-light opacity-0 transition-opacity"
              aria-hidden="true"
            ></span>

            <div class="flex items-center gap-3">
              <div class="nav-icon-box flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-slate-400 ring-1 ring-white/[0.06] transition-colors group-hover:text-white">
                <component :is="item.icon" :size="17" aria-hidden="true" />
              </div>
              <span>{{ item.label }}</span>
            </div>

            <ChevronRight
              :size="15"
              class="nav-chevron text-slate-500 opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-70"
              aria-hidden="true"
            />
          </RouterLink>
        </nav>

        <!-- Subtle Operational Info Box inside Sidebar -->
        <div class="mt-6 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3.5">
          <div class="flex items-center gap-2 text-xs font-semibold text-sky-300">
            <Sparkles :size="13" class="text-emerald-400" />
            <span>Consola de Transporte</span>
          </div>
          <p class="mt-1 text-[11px] leading-relaxed text-slate-400">
            Administra las rutas de tu institución, asigna conductores y comparte códigos de acceso con las familias.
          </p>
        </div>
      </div>

      <!-- Bottom User Dock & Logout -->
      <div class="relative z-10 shrink-0">
        <div class="mb-2 flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-1.5 text-[11px] text-slate-400">
          <ShieldCheck :size="14" class="shrink-0 text-emerald-400" aria-hidden="true" />
          <span class="truncate">Credenciales de administrador</span>
        </div>

        <div class="rounded-2xl border border-white/10 bg-slate-900/85 p-2.5 shadow-xl backdrop-blur-md">
          <div class="flex items-center gap-2.5 pb-2.5">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-navy/25 to-brand-navy-light/25 text-xs font-bold text-sky-300 ring-1 ring-sky-400/30">
              {{ userInitials }}
            </div>

            <div class="min-w-0 flex-1">
              <strong class="block truncate text-xs font-semibold text-white">
                {{ fullName }}
              </strong>
              <span class="block truncate text-[11px] text-slate-400">
                {{ auth.user?.email }}
              </span>
            </div>
          </div>

          <button
            type="button"
            class="group flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-200 transition-all duration-200 hover:border-red-500/30 hover:bg-red-500/15 hover:text-red-200 focus-visible:outline-2 focus-visible:outline-blue-500"
            @click="logout"
          >
            <LogOut :size="14" class="transition-transform duration-200 group-hover:-translate-x-0.5" aria-hidden="true" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
    </aside>

    <!-- ───────── MOBILE SLIDE-OVER DRAWER ───────── -->
    <Transition name="drawer-fade">
      <div
        v-if="mobileMenuOpen"
        class="fixed inset-0 z-50 flex lg:hidden"
        ref="drawerPanel"
        role="dialog"
        aria-modal="true"
        aria-label="Menú administrativo"
      >
        <div
          class="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
          @click="mobileMenuOpen = false"
        ></div>

        <aside class="sidebar relative z-10 flex w-72 max-w-[82vw] flex-col justify-between overflow-y-auto bg-slate-950 p-5 text-white shadow-2xl">
          <div>
            <div class="flex items-center justify-between pb-6">
              <div class="flex items-center gap-2.5">
                <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-navy to-brand-navy-light text-white shadow-md ring-1 ring-white/20">
                  <BusFront :size="19" aria-hidden="true" />
                </div>
                <div>
                  <strong class="block text-base font-bold text-white">RutaSegura</strong>
                  <span class="block text-[11px] text-sky-300">Panel administrativo</span>
                </div>
              </div>

              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                aria-label="Cerrar menú"
                @click="mobileMenuOpen = false"
              >
                <X :size="18" />
              </button>
            </div>

            <nav class="space-y-1.5">
              <RouterLink
                v-for="item in items"
                :key="item.label"
                :to="item.route"
                class="nav-item flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                <component :is="item.icon" :size="18" aria-hidden="true" />
                <span>{{ item.label }}</span>
              </RouterLink>
            </nav>
          </div>

          <div class="mt-6 border-t border-white/10 pt-4">
            <div class="mb-3 flex items-center gap-3 px-1">
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xs font-bold text-sky-300 ring-1 ring-sky-400/30">
                {{ userInitials }}
              </div>
              <div class="min-w-0">
                <strong class="block truncate text-xs font-semibold text-white">{{ fullName }}</strong>
                <span class="block truncate text-[11px] text-slate-400">{{ auth.user?.email }}</span>
              </div>
            </div>

            <button
              type="button"
              class="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-red-500/20 hover:text-red-200"
              @click="logout"
            >
              <LogOut :size="15" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </aside>
      </div>
    </Transition>

    <!-- ───────── MAIN CONTENT COLUMN ───────── -->
    <div class="content-area flex min-h-dvh min-w-0 flex-col lg:pl-[268px]">

      <!-- Mobile Top Bar -->
      <header class="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:hidden">
        <div class="flex items-center gap-3">
          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-2xs transition hover:bg-slate-50"
            aria-label="Abrir menú administrativo"
            @click="mobileMenuOpen = true"
          >
            <Menu :size="18" />
          </button>

          <div class="flex items-center gap-2">
            <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
              <BusFront :size="17" aria-hidden="true" />
            </div>
            <div>
              <strong class="block text-sm font-bold leading-none text-slate-900">RutaSegura</strong>
              <span class="text-[11px] font-medium text-slate-500">{{ activeItem.label }}</span>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <NotificationBellMenu inbox-route="admin-notifications" />

          <span class="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-xs font-bold text-slate-700 ring-1 ring-slate-200/80">
            {{ userInitials }}
          </span>

          <button
            type="button"
            class="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            aria-label="Cerrar sesión"
            @click="logout"
          >
            <LogOut :size="16" />
          </button>
        </div>
      </header>

      <!-- Desktop Contextual Top Bar -->
      <header class="sticky top-0 z-30 hidden items-center justify-between border-b border-slate-200/80 bg-white/90 px-8 py-3.5 backdrop-blur-md lg:flex">
        <div>
          <div class="flex items-center gap-2 text-xs font-semibold text-blue-600">
            <span>Administración</span>
            <span class="text-slate-300">/</span>
            <span class="text-slate-600">{{ activeItem.label }}</span>
          </div>
          <h1 class="mt-0.5 text-lg font-bold tracking-tight text-slate-900">
            {{ activeItem.label }}
          </h1>
        </div>

        <div class="flex items-center gap-3">
          <NotificationBellMenu inbox-route="admin-notifications" />

          <div class="hidden items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-xs font-semibold text-emerald-700 xl:inline-flex">
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            Sesión administrativa
          </div>

          <div class="flex items-center gap-2.5 rounded-xl border border-slate-200/90 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs">
            <span class="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-brand-navy to-brand-navy-light text-[11px] font-bold text-white">
              {{ userInitials }}
            </span>
            <span class="max-w-[160px] truncate">{{ fullName }}</span>
          </div>
        </div>
      </header>

      <!-- Child Views Render Here -->
      <main id="main-content" tabindex="-1" class="relative flex-1">
        <RouterView v-slot="{ Component }">
          <Transition name="page-reveal" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>

    </div>
  </div>
</template>

<style scoped>
/* =========================================
   ZOOM-RESILIENT FIXED SIDEBAR
========================================= */

.sidebar {
  padding: clamp(14px, 2.2dvh, 22px) 16px;
  background-image:
    radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, var(--rs-navy), var(--rs-navy-light) 65%, var(--rs-navy));
  background-size: 26px 26px, 100% 100%;
}

.sidebar-brand {
  padding-bottom: clamp(14px, 2.2dvh, 24px);
}

.sidebar-nav {
  gap: clamp(3px, 0.6dvh, 6px);
}

.nav-item {
  padding-top: clamp(8px, 1.2dvh, 11px);
  padding-bottom: clamp(8px, 1.2dvh, 11px);
}

.content-area {
  background-color: var(--rs-background);
}

/* =========================================
   ACTIVE ROUTER LINK STYLING
========================================= */

.nav-item.router-link-exact-active,
.nav-item.router-link-active {
  color: #ffffff;
  background: linear-gradient(135deg, rgba(242, 183, 5, 0.18), rgba(242, 183, 5, 0.1));
  box-shadow:
    inset 0 0 0 1px rgba(242, 183, 5, 0.4),
    0 10px 24px -8px rgba(2, 6, 23, 0.6);
}

.nav-item.router-link-exact-active .active-bar,
.nav-item.router-link-active .active-bar {
  opacity: 1;
}

.nav-item.router-link-exact-active .nav-icon-box,
.nav-item.router-link-active .nav-icon-box {
  background: linear-gradient(135deg, var(--rs-navy), var(--rs-navy-light));
  color: #ffffff;
  box-shadow: 0 4px 12px rgba(21, 36, 59, 0.25);
}

.nav-item.router-link-exact-active .nav-chevron,
.nav-item.router-link-active .nav-chevron {
  opacity: 1;
  color: var(--rs-yellow);
}

/* =========================================
   SMOOTH ROUTE & DRAWER TRANSITIONS
========================================= */

.page-reveal-enter-active {
  transition:
    opacity 0.25s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}

.page-reveal-leave-active {
  transition:
    opacity 0.15s ease-in,
    transform 0.15s ease-in;
}

.page-reveal-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.page-reveal-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.22s ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
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