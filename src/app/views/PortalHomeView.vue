
<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { BusFront, LogOut } from 'lucide-vue-next'

import { useAuthStore } from '@/modules/auth/stores/authStore'

const router = useRouter()
const auth = useAuthStore()

const fullName = computed(() =>
  [auth.user?.firstName, auth.user?.lastName]
    .filter(Boolean)
    .join(' ')
)

const portalTitle = computed(() =>
  auth.isAdmin
    ? 'Panel de administración'
    : 'Panel de familia'
)

async function handleLogout() {
  auth.logout()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <main class="min-h-screen bg-slate-50">
    <header class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div class="flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white">
            <BusFront :size="23" />
          </div>

          <div>
            <h1 class="font-bold text-slate-900">
              RutaSegura
            </h1>
            <p class="text-xs text-slate-500">
              {{ portalTitle }}
            </p>
          </div>
        </div>

        <button
          type="button"
          class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          @click="handleLogout"
        >
          <LogOut :size="17" />
          Cerrar sesión
        </button>
      </div>
    </header>

    <section class="mx-auto max-w-7xl px-6 py-12">
      <h2 class="text-2xl font-bold tracking-tight text-slate-900">
        Hola, {{ auth.user?.firstName }}
      </h2>

      <p class="mt-2 text-slate-600">
        Bienvenido a RutaSegura.
      </p>

      <div class="mt-8 max-w-xl rounded-xl border border-slate-200 bg-white p-6">
        <h3 class="font-semibold text-slate-900">
          Información de la cuenta
        </h3>

        <dl class="mt-5 space-y-4 text-sm">
          <div>
            <dt class="text-slate-500">Nombre completo</dt>
            <dd class="mt-1 font-medium text-slate-900">
              {{ fullName }}
            </dd>
          </div>

          <div>
            <dt class="text-slate-500">Correo electrónico</dt>
            <dd class="mt-1 font-medium text-slate-900">
              {{ auth.user?.email }}
            </dd>
          </div>

          <div>
            <dt class="text-slate-500">Tipo de cuenta</dt>
            <dd class="mt-1 font-medium text-slate-900">
              {{ auth.user?.roleTier }}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  </main>
</template>
