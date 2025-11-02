import { useAuthStore } from '@/stores'

const requiresAuthMetaKey = 'requiresAuth'
const allowedRolesMetaKey = 'allowedRoles'

export const createAuthGuard = (router) => {
  router.beforeEach((to, from, next) => {
    const authStore = useAuthStore()
    const requiresAuth = to.matched.some(record => record.meta?.[requiresAuthMetaKey])

    if (!requiresAuth) {
      return next()
    }

    if (!authStore.isAuthenticated) {
      return next({ name: 'Login', query: { redirect: to.fullPath } })
    }

    const allowedRoles = to.meta?.[allowedRolesMetaKey]
    if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
      const hasRequiredRole = allowedRoles.some(role => authStore.hasRole(role))
      if (!hasRequiredRole) {
        return next({ name: 'Forbidden' })
      }
    }

    return next()
  })
}
