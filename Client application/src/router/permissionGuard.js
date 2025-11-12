/**
 * 权限控制路由守卫
 * 用于保护需要特定权限的路由
 */

import { useAuthStore } from '@/stores/auth'
import { hasPermission, canAccessRoom, ROLES } from '@/utils/permissions'
import { showNoPermission, showLoginRequired, showInsufficientRole, showRoomPermissionDenied } from '@/utils/permissionToast'

/**
 * 检查路由权限
 * @param {Object} to - 目标路由
 * @param {Object} from - 来源路由
 * @param {Function} next - 路由跳转函数
 * @param {Object} store - Pinia store
 */
export function checkRoutePermission(to, from, next, store) {
  // 获取当前用户
  const user = store?.currentUser || null
  
  // 检查是否需要登录
  if (to.meta.requiresAuth && !user) {
    console.log('路由需要登录，重定向到登录页')
    showLoginRequired({
      showBackButton: false,
      autoClose: false
    })
    next({
      path: '/auth/login',
      query: { redirect: to.fullPath }
    })
    return
  }
  
  // 检查是否需要特定角色
  if (to.meta.requiresRole && user) {
    // 从auth store获取角色信息
    const userRoles = store?.roles || []
    const userRole = userRoles.length > 0 ? userRoles[0] : (user.role || 'guest')
    
    let hasRequiredRole = false
    
    if (Array.isArray(to.meta.requiresRole)) {
      hasRequiredRole = to.meta.requiresRole.includes(userRole)
    } else {
      hasRequiredRole = to.meta.requiresRole === userRole
    }
    
    if (!hasRequiredRole) {
      const requiredRoles = Array.isArray(to.meta.requiresRole) 
        ? to.meta.requiresRole.join(' 或 ') 
        : to.meta.requiresRole
        
      console.log(`路由需要角色 ${requiredRoles}，当前角色: ${userRole}`)
      
      showInsufficientRole(requiredRoles, userRole, {
        showBackButton: true,
        autoClose: false
      })
      
      next({ path: '/403' })
      return
    }
  }
  
  // 检查是否需要特定权限
  if (to.meta.requiresPermission && user) {
    let hasRequiredPermission = false
    
    // 从auth store获取权限信息
    const userPermissions = store?.permissions || []
    
    // 如果用户拥有'all'权限，则具有所有权限
    if (userPermissions.includes('all')) {
      hasRequiredPermission = true
    } else {
      // 创建用户对象，包含角色和权限信息
      const userWithPermissions = {
        ...user,
        role: store?.roles?.length > 0 ? store.roles[0] : (user.role || 'guest'),
        permissions: userPermissions
      }
      
      if (Array.isArray(to.meta.requiresPermission)) {
        // 检查是否具有任一权限
        hasRequiredPermission = to.meta.requiresPermission.some(permission => 
          hasPermission(userWithPermissions, permission)
        )
      } else {
        // 检查是否具有指定权限
        hasRequiredPermission = hasPermission(userWithPermissions, to.meta.requiresPermission)
      }
    }
    
    if (!hasRequiredPermission) {
      const requiredPermissions = Array.isArray(to.meta.requiresPermission) 
        ? to.meta.requiresPermission.join(' 或 ') 
        : to.meta.requiresPermission
        
      console.log(`路由需要权限 ${requiredPermissions}，权限不足`)
      console.log('当前用户权限:', userPermissions)
      
      showNoPermission(to.meta.title || '此页面', '访问', {
        showBackButton: true,
        autoClose: false
      })
      
      next({ path: '/403' })
      return
    }
  }
  
  // 检查是否需要寝室权限
  if (to.meta.requiresRoomPermission && user) {
    const roomId = to.params.roomId || to.query.roomId
    
    if (!roomId) {
      console.log('路由需要寝室权限，但未提供寝室ID')
      showNoPermission('寝室相关功能', '访问', {
        showBackButton: true,
        autoClose: false
      })
      next({ path: '/403' })
      return
    }
    
    const permission = to.meta.requiresRoomPermission
    
    // 创建用户对象，包含角色和权限信息
    const userWithPermissions = {
      ...user,
      role: store?.roles?.length > 0 ? store.roles[0] : (user.role || 'guest'),
      permissions: store?.permissions || []
    }
    
    const canAccess = canAccessRoom(userWithPermissions, roomId, permission)
    
    if (!canAccess) {
      console.log(`路由需要寝室权限 ${permission}，权限不足`)
      
      showRoomPermissionDenied(`寝室 ${roomId}`, permission, {
        showBackButton: true,
        autoClose: false
      })
      
      next({ path: '/403' })
      return
    }
  }
  
  // 所有检查通过，继续导航
  next()
}

/**
 * 创建路由守卫
 * @param {Object} router - Vue Router 实例
 * @param {Object} store - Vuex store
 */
export function createPermissionGuard(router, store) {
  router.beforeEach(async (to, from, next) => {
    // 如果store为null，尝试获取最新的store
    let currentStore = store
    if (!currentStore) {
      // 动态导入store
      try {
        const { useAuthStore } = await import('@/stores/auth')
        currentStore = useAuthStore()
      } catch (error) {
        console.error('无法获取auth store:', error)
        // 如果无法获取store，只进行基本的认证检查
        if (to.meta.requiresAuth) {
          showLoginRequired({
            showBackButton: false,
            autoClose: false
          })
          next({ path: '/auth/login', query: { redirect: to.fullPath } })
          return
        }
        next()
        return
      }
    }
    
    // 检查路由权限
    checkRoutePermission(to, from, next, currentStore)
  })
  
  // 路由错误处理
  router.onError((error) => {
    console.error('路由错误:', error)
    
    // 如果是权限相关错误，重定向到403页面
    if (error.message && error.message.includes('权限')) {
      showNoPermission('请求的路由', '访问', {
        showBackButton: true,
        autoClose: false
      })
      router.push('/403')
    }
  })
}

/**
 * 权限检查混入
 * 可以在组件中使用 this.checkPermission(permission)
 */
export const permissionMixin = {
  methods: {
    /**
     * 检查用户是否具有指定权限
     * @param {string} permission - 权限标识
     * @param {Object} resource - 资源对象（可选）
     * @returns {boolean} 是否具有权限
     */
    checkPermission(permission, resource = null) {
      const authStore = useAuthStore()
      const user = authStore.currentUser
      
      if (!user) return false
      
      // 创建用户对象，包含角色和权限信息
      const userWithPermissions = {
        ...user,
        role: authStore.roles?.length > 0 ? authStore.roles[0] : (user.role || 'guest'),
        permissions: authStore.permissions || []
      }
      
      return hasPermission(userWithPermissions, permission, resource)
    },
    
    /**
     * 检查用户是否具有任一权限
     * @param {Array} permissions - 权限标识数组
     * @param {Object} resource - 资源对象（可选）
     * @returns {boolean} 是否具有任一权限
     */
    checkAnyPermission(permissions, resource = null) {
      const authStore = useAuthStore()
      const user = authStore.currentUser
      
      if (!user) return false
      
      // 创建用户对象，包含角色和权限信息
      const userWithPermissions = {
        ...user,
        role: authStore.roles?.length > 0 ? authStore.roles[0] : (user.role || 'guest'),
        permissions: authStore.permissions || []
      }
      
      return permissions.some(permission => 
        hasPermission(userWithPermissions, permission, resource)
      )
    },
    
    /**
     * 检查用户是否具有所有权限
     * @param {Array} permissions - 权限标识数组
     * @param {Object} resource - 资源对象（可选）
     * @returns {boolean} 是否具有所有权限
     */
    checkAllPermissions(permissions, resource = null) {
      const authStore = useAuthStore()
      const user = authStore.currentUser
      
      if (!user) return false
      
      // 创建用户对象，包含角色和权限信息
      const userWithPermissions = {
        ...user,
        role: authStore.roles?.length > 0 ? authStore.roles[0] : (user.role || 'guest'),
        permissions: authStore.permissions || []
      }
      
      return permissions.every(permission => 
        hasPermission(userWithPermissions, permission, resource)
      )
    },
    
    /**
     * 检查用户是否可以访问指定寝室
     * @param {string} roomId - 寝室ID
     * @param {string} permission - 寝室权限
     * @returns {boolean} 是否可以访问
     */
    checkRoomAccess(roomId, permission = 'read') {
      const authStore = useAuthStore()
      const user = authStore.currentUser
      
      if (!user) return false
      
      // 创建用户对象，包含角色和权限信息
      const userWithPermissions = {
        ...user,
        role: authStore.roles?.length > 0 ? authStore.roles[0] : (user.role || 'guest'),
        permissions: authStore.permissions || []
      }
      
      return canAccessRoom(userWithPermissions, roomId, permission)
    },
    
    /**
     * 检查用户是否具有指定角色
     * @param {string|Array} roles - 角色或角色数组
     * @returns {boolean} 是否具有角色
     */
    checkRole(roles) {
      const authStore = useAuthStore()
      const userRoles = authStore.roles || []
      const userRole = userRoles.length > 0 ? userRoles[0] : (authStore.user?.role || 'guest')
      
      if (Array.isArray(roles)) {
        return roles.includes(userRole)
      }
      
      return userRole === roles
    }
  }
}

/**
 * 权限检查指令
 * 用于在模板中根据权限控制元素显示
 */
export const permissionDirective = {
  mounted(el, binding) {
    const { value } = binding
    const authStore = useAuthStore()
    const user = authStore.currentUser
    
    if (!user) {
      el.style.display = 'none'
      return
    }
    
    // 创建用户对象,包含角色和权限信息
    const userWithPermissions = {
      ...user,
      role: authStore.roles?.length > 0 ? authStore.roles[0] : (user.role || 'guest'),
      permissions: authStore.permissions || []
    }
    
    let hasRequiredPermission = false
    
    if (Array.isArray(value)) {
      hasRequiredPermission = value.some(permission => hasPermission(userWithPermissions, permission))
    } else {
      hasRequiredPermission = hasPermission(userWithPermissions, value)
    }
    
    if (!hasRequiredPermission) {
      el.style.display = 'none'
    }
  },
  
  updated(el, binding) {
    // 重新检查权限
    const { value } = binding
    const authStore = useAuthStore()
    const user = authStore.currentUser
    
    if (!user) {
      el.style.display = 'none'
      return
    }
    
    // 创建用户对象,包含角色和权限信息
    const userWithPermissions = {
      ...user,
      role: authStore.roles?.length > 0 ? authStore.roles[0] : (user.role || 'guest'),
      permissions: authStore.permissions || []
    }
    
    let hasRequiredPermission = false
    
    if (Array.isArray(value)) {
      hasRequiredPermission = value.some(permission => hasPermission(userWithPermissions, permission))
    } else {
      hasRequiredPermission = hasPermission(userWithPermissions, value)
    }
    
    el.style.display = hasRequiredPermission ? '' : 'none'
  }
}

/**
 * 注册权限指令
 * @param {Object} app - Vue应用实例
 */
export function registerPermissionDirective(app) {
  app.directive('permission', permissionDirective)
}