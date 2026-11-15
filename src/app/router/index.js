
import { createRouter, createWebHistory } from 'vue-router'

import { useAuthStore } from '@/modules/auth/stores/authStore'

import LoginView from '@/modules/auth/views/LoginView.vue'
import RegisterView from '@/modules/auth/views/RegisterView.vue'
import PortalHomeView from '@/app/views/PortalHomeView.vue'
import ParentHomeView from '@/modules/parent/views/ParentHomeView.vue'
import ParentLayout from '@/modules/parent/layouts/ParentLayout.vue'
import ParentStudentsView from '@/modules/parent/views/ParentStudentsView.vue'
import ParentRoutesView from '@/modules/parent/views/ParentRoutesView.vue'
import ParentHistoryView from '@/modules/parent/views/ParentHistoryView.vue'
import ParentProfileView from '@/modules/parent/views/ParentProfileView.vue'
const routes = [
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: {
      guestOnly: true,
    },
  },
  {
  path: '/register',
  name: 'register',
  component: RegisterView,
  meta: {
    guestOnly: true,
  },
  },
  {
    path: '/admin',
    name: 'admin-home',
    component: PortalHomeView,
    meta: {
      requiresAuth: true,
      roles: ['ADMIN'],
    },
  },
  {
    path: '/parent',
    name: 'parent-home',
    component: PortalHomeView,
    meta: {
      requiresAuth: true,
      roles: ['PARENT'],
    },
  },
  {
  path: '/parent',
  component: ParentLayout,
  meta: {
    requiresAuth: true,
    role: 'PARENT',
  },
  children: [
    {
      path: '',
      name: 'parent-home',
      component: ParentHomeView,
    },
    {
      path: 'students',
      name: 'parent-students',
      component: ParentStudentsView,
    },
    {
      path: 'routes',
      name: 'parent-routes',
      component: ParentRoutesView,
    },
    {
      path: 'history',
      name: 'parent-history',
      component: ParentHistoryView,
    },
    {
      path: 'profile',
      name: 'parent-profile',
      component: ParentProfileView,
    },
  ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  await auth.initialize()

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return {
      name: 'login',
      query: { redirect: to.fullPath },
    }
  }

  if (to.meta.roles && !to.meta.roles.includes(auth.userRole)) {
    if (auth.isAdmin) return { name: 'admin-home' }
    if (auth.isParent) return { name: 'parent-home' }

    return { name: 'login' }
  }

  if (to.meta.guestOnly && auth.isAuthenticated) {
    return auth.isAdmin
      ? { name: 'admin-home' }
      : { name: 'parent-home' }
  }

  return true
})

export default router
