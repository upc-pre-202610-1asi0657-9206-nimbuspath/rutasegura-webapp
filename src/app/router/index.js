import {
  createRouter,
  createWebHistory,
} from 'vue-router'

import { useAuthStore } from '@/modules/auth/stores/authStore'

import LoginView from '@/modules/auth/views/LoginView.vue'
const RegisterView = () => import('@/modules/auth/views/RegisterView.vue')

const ParentLayout = () => import('@/modules/parent/layouts/ParentLayout.vue')
const ParentHomeView = () => import('@/modules/parent/views/ParentHomeView.vue')
const ParentStudentsView = () => import('@/modules/parent/views/ParentStudentsView.vue')
const ParentRoutesView = () => import('@/modules/parent/views/ParentRoutesView.vue')
const ParentTrackingView = () => import('@/modules/parent/views/ParentTrackingView.vue')
const ParentHistoryView = () => import('@/modules/parent/views/ParentHistoryView.vue')
const ParentProfileView = () => import('@/modules/parent/views/ParentProfileView.vue')

const AdminLayout = () => import('@/modules/admin/layouts/AdminLayout.vue')
const AdminRoutesView = () => import('@/modules/admin/views/AdminRoutesView.vue')
const AdminResourcesView = () => import('@/modules/admin/views/AdminResourcesView.vue')
const AdminFamiliesView = () => import('@/modules/admin/views/AdminFamiliesView.vue')
const AdminTripsView = () => import('@/modules/admin/views/AdminTripsView.vue')

const NotificationsInboxView = () =>
  import('@/modules/notifications/presentation/views/NotificationsInboxView.vue')

const AdminAnnouncementsView = () =>
  import('@/modules/notifications/presentation/views/AdminAnnouncementsView.vue')
const AdminSubscriptionView = () =>
  import('@/modules/subscription/presentation/views/AdminSubscriptionView.vue')

const AdminOrganizationView = () =>
  import('@/modules/organization/presentation/views/AdminOrganizationView.vue')

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

  // ADMIN
  {
    path: '/admin',
    component: AdminLayout,
    meta: {
      requiresAuth: true,
      roles: ['ADMIN'],
    },
    children: [
      {
        path: '',
        redirect: {
          name: 'admin-routes',
        },
      },
      {
        path: 'routes',
        name: 'admin-routes',
        component: AdminRoutesView,
      },
      {
        path: 'resources',
        name: 'admin-resources',
        component: AdminResourcesView,
      },
      { path: 'families', name: 'admin-families', component: AdminFamiliesView },
      { path: 'notifications', name: 'admin-notifications', component: NotificationsInboxView },
      { path: 'announcements', name: 'admin-announcements', component: AdminAnnouncementsView },
      { path: 'subscription', name: 'admin-subscription', component: AdminSubscriptionView },
      { path: 'organization', name: 'admin-organization', component: AdminOrganizationView },
      {
        path: 'trips',
        name: 'admin-trips',
        component: AdminTripsView,
      },
    ],
  },

  // PARENT
  {
    path: '/parent',
    component: ParentLayout,
    meta: {
      requiresAuth: true,
      roles: ['PARENT'],
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
      { path: 'tracking', name: 'parent-tracking', component: ParentTrackingView },
      { path: 'notifications', name: 'parent-notifications', component: NotificationsInboxView },
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
  history: createWebHistory(
    import.meta.env.BASE_URL,
  ),
  routes,

  scrollBehavior() {
    return {
      top: 0,
    }
  },
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  await auth.initialize()

  if (
    to.meta.requiresAuth &&
    !auth.isAuthenticated
  ) {
    return {
      name: 'login',
      query: {
        redirect: to.fullPath,
      },
    }
  }

  if (
    to.meta.roles &&
    !to.meta.roles.includes(auth.userRole)
  ) {
    if (auth.isAdmin) {
      return {
        name: 'admin-routes',
      }
    }

    if (auth.isParent) {
      return {
        name: 'parent-home',
      }
    }

    return {
      name: 'login',
    }
  }

  if (
    to.meta.guestOnly &&
    auth.isAuthenticated
  ) {
    return auth.isAdmin
      ? {
          name: 'admin-routes',
        }
      : {
          name: 'parent-home',
        }
  }

  return true
})

export default router