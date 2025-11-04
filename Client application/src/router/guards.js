import { useAuthStore } from '@/stores'

const requiresAuthMetaKey = 'requiresAuth'
const requiresGuestMetaKey = 'requiresGuest'
const allowedRolesMetaKey = 'allowedRoles'

export const createAuthGuard = (router) => {
  router.beforeEach((to, from, next) => {
    const authStore = useAuthStore()
    const requiresAuth = to.matched.some(record => record.meta?.[requiresAuthMetaKey])
    const requiresGuest = to.matched.some(record => record.meta?.[requiresGuestMetaKey])

    // 如果页面要求只有未登录用户才能访问，且用户已登录，则重定向到首页
    if (requiresGuest && authStore.isAuthenticated) {
      return next({ path: '/' })
    }

    // 如果页面不需要认证，直接通过
    if (!requiresAuth) {
      return next()
    }

    // 如果页面需要认证但用户未登录，重定向到登录页
    if (!authStore.isAuthenticated) {
      return next({ name: 'Login', query: { redirect: to.fullPath } })
    }

    // 检查角色权限
    const allowedRoles = to.meta?.[allowedRolesMetaKey]
    if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
      // 如果用户拥有'all'权限，则具有所有角色权限
      if (authStore.permissions && authStore.permissions.includes('all')) {
        return next()
      }
      
      const hasRequiredRole = allowedRoles.some(role => authStore.hasRole(role))
      if (!hasRequiredRole) {
        return next({ name: 'Forbidden' })
      }
    }

    return next()
  })
}
