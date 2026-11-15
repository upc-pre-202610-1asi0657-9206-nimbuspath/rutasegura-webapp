<script setup>
import { computed } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import {
  BusFront,
  Home,
  Users,
  Route,
  History,
  UserRound,
  LogOut,
} from 'lucide-vue-next'

import { useAuthStore } from '@/modules/auth/stores/authStore'

const auth = useAuthStore()
const router = useRouter()

const fullName = computed(() =>
  `${auth.user?.firstName ?? ''} ${auth.user?.lastName ?? ''}`.trim(),
)

async function logout() {
  auth.logout()
  await router.replace({ name: 'login' })
}

const items = [
  {
    label: 'Inicio',
    route: { name: 'parent-home' },
    icon: Home,
  },
  {
    label: 'Mis hijos',
    route: { name: 'parent-students' },
    icon: Users,
  },
  {
    label: 'Mis rutas',
    route: { name: 'parent-routes' },
    icon: Route,
  },
  {
    label: 'Historial de viajes',
    route: { name: 'parent-history' },
    icon: History,
  },
  {
    label: 'Mi perfil',
    route: { name: 'parent-profile' },
    icon: UserRound,
  },
]
</script>

<template>
  <div class="parent-shell">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-icon">
          <BusFront :size="24" />
        </div>

        <div>
          <strong>RutaSegura</strong>
          <span>Portal de familias</span>
        </div>
      </div>

      <nav class="nav">
        <RouterLink
          v-for="item in items"
          :key="item.label"
          :to="item.route"
          class="nav-item"
        >
          <component
            :is="item.icon"
            :size="20"
          />

          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="sidebar-footer">
        <div class="user">
          <div class="avatar">
            <UserRound :size="20" />
          </div>

          <div class="user-copy">
            <strong>{{ fullName }}</strong>
            <span>{{ auth.user?.email }}</span>
          </div>
        </div>

        <button
          type="button"
          class="logout"
          @click="logout"
        >
          <LogOut :size="18" />
          Cerrar sesión
        </button>
      </div>
    </aside>

    <div class="content">
      <header class="mobile-header">
        <div class="mobile-brand">
          <BusFront :size="20" />
          <strong>RutaSegura</strong>
        </div>

        <button
          type="button"
          aria-label="Cerrar sesión"
          @click="logout"
        >
          <LogOut :size="18" />
        </button>
      </header>

      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.parent-shell {
  min-height: 100dvh;
  display: grid;
  grid-template-columns: 250px minmax(0, 1fr);
  background: #f7f9fc;
}

.sidebar {
  position: sticky;
  top: 0;
  height: 100dvh;
  display: flex;
  flex-direction: column;
  padding: 24px 18px;
  color: #dbeafe;
  background:
    radial-gradient(circle at 20% 80%, rgba(37, 99, 235, 0.18), transparent 28%),
    linear-gradient(180deg, #08224a 0%, #071c3d 55%, #092654 100%);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 8px 25px;
}

.brand-icon {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border-radius: 13px;
  color: white;
  background: linear-gradient(145deg, #3b82f6, #155eef);
  box-shadow: 0 10px 25px rgba(37, 99, 235, 0.3);
}

.brand strong,
.brand span {
  display: block;
}

.brand strong {
  color: white;
  font-size: 17px;
}

.brand span {
  margin-top: 2px;
  color: #93afd1;
  font-size: 12px;
}

.nav {
  display: grid;
  gap: 6px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 13px;
  min-height: 48px;
  padding: 0 14px;
  border-radius: 12px;
  color: #d7e4f5;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  transition: 0.18s ease;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.07);
  color: white;
}

.nav-item.router-link-exact-active {
  color: white;
  background: linear-gradient(135deg, #2563eb, #1683ff);
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.28);
}

.sidebar-footer {
  margin-top: auto;
  padding-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.13);
}

.user {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 7px 15px;
}

.avatar {
  width: 40px;
  height: 40px;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  color: #2563eb;
  background: #eff6ff;
}

.user-copy {
  min-width: 0;
}

.user-copy strong,
.user-copy span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-copy strong {
  color: white;
  font-size: 13px;
}

.user-copy span {
  margin-top: 2px;
  color: #93afd1;
  font-size: 11px;
}

.logout {
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 0 13px;
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.04);
  color: #e7eef9;
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
}

.logout:hover {
  background: rgba(255, 255, 255, 0.09);
}

.content {
  min-width: 0;
}

.mobile-header {
  display: none;
}

@media (max-width: 850px) {
  .parent-shell {
    display: block;
  }

  .sidebar {
    display: none;
  }

  .mobile-header {
    min-height: 60px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    border-bottom: 1px solid #e2e8f0;
    background: white;
  }

  .mobile-brand {
    display: flex;
    align-items: center;
    gap: 9px;
    color: #0f172a;
  }

  .mobile-header button {
    display: grid;
    place-items: center;
    padding: 9px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: white;
    color: #64748b;
  }
}
</style>