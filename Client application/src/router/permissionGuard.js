/**
 * 权限控制路由守卫
 * 用于保护需要特定权限的路由
 */

import { useAuthStore } from '@/stores/auth'
import { hasPermission, canAccessRoom } from '@/utils/permissions'

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
    next({
      path: '/auth/login',
      query: { redirect: to.fullPath }
    })
    return
  }
  
  // 检查是否需要特定角色
  if (to.meta.requiresRole && user) {
    const userRole = user.role || 'guest'
    
    if (Array.isArray(to.meta.requiresRole)) {
      if (!to.meta.requiresRole.includes(userRole)) {
        console.log(`路由需要角色 ${to.meta.requiresRole.join(' 或 ')}，当前角色: ${userRole}`)
        next({ path: '/403' }) // 403 Forbidden
        return
      }
    } else if (to.meta.requiresRole !== userRole) {
      console.log(`路由需要角色 ${to.meta.requiresRole}，当前角色: ${userRole}`)
      next({ path: '/403' })
      return
    }
  }
  
  // 检查是否需要特定权限
  if (to.meta.requiresPermission && user) {
    let hasRequiredPermission = false
    
    if (Array.isArray(to.meta.requiresPermission)) {
      // 检查是否具有任一权限
      hasRequiredPermission = to.meta.requiresPermission.some(permission => 
        hasPermission(user, permission)
      )
    } else {
      // 检查是否具有指定权限
      hasRequiredPermission = hasPermission(user, to.meta.requiresPermission)
    }
    
    if (!hasRequiredPermission) {
      console.log(`路由需要权限 ${to.meta.requiresPermission}，权限不足`)
      next({ path: '/403' })
      return
    }
  }
  
  // 检查是否需要寝室权限
  if (to.meta.requiresRoomPermission && user) {
    const roomId = to.params.roomId || to.query.roomId
    
    if (!roomId) {
      console.log('路由需要寝室权限，但未提供寝室ID')
      next({ path: '/403' })
      return
    }
    
    const permission = to.meta.requiresRoomPermission
    const canAccess = canAccessRoom(user, roomId, permission)
    
    if (!canAccess) {
      console.log(`路由需要寝室权限 ${permission}，权限不足`)
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
      return hasPermission(user, permission, resource)
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
      return permissions.some(permission => hasPermission(user, permission, resource))
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
      return permissions.every(permission => hasPermission(user, permission, resource))
    },
    
    /**
     * 检查用户是否可以访问指定寝室
     * @param {string} roomId - 寝室ID
     * @param {string} permission - 权限标识
     * @returns {boolean} 是否可以访问
     */
    checkRoomAccess(roomId, permission) {
      const authStore = useAuthStore()
      const user = authStore.currentUser
      return canAccessRoom(user, roomId, permission)
    },
    
    /**
     * 检查用户角色
     * @param {string} role - 角色标识
     * @returns {boolean} 是否是指定角色
     */
    checkRole(role) {
      const authStore = useAuthStore()
      const user = authStore.currentUser
      return user && user.role === role
    },
    
    /**
     * 检查用户是否是管理员
     * @returns {boolean} 是否是管理员
     */
    isAdmin() {
      return this.checkRole('admin')
    },
    
    /**
     * 检查用户是否是寝室所有者
     * @param {string} roomId - 寝室ID
     * @returns {boolean} 是否是寝室所有者
     */
    isRoomOwner(roomId) {
      const authStore = useAuthStore()
      const user = authStore.currentUser
      if (!user || !roomId) return false
      
      const roomMembership = user.rooms && user.rooms.find(room => room.id === roomId)
      return roomMembership && roomMembership.role === 'owner'
    },
    
    /**
     * 检查用户是否是寝室成员
     * @param {string} roomId - 寝室ID
     * @returns {boolean} 是否是寝室成员
     */
    isRoomMember(roomId) {
      const authStore = useAuthStore()
      const user = authStore.currentUser
      if (!user || !roomId) return false
      
      const roomMembership = user.rooms && user.rooms.find(room => room.id === roomId)
      return !!roomMembership
    }
  }
}

/**
 * 权限检查指令
 * 使用方式：v-permission="'room:edit'"
 */
export const permissionDirective = {
  mounted(el, binding, vnode) {
    checkPermission(el, binding, vnode)
  },
  
  updated(el, binding, vnode) {
    checkPermission(el, binding, vnode)
  }
}

/**
 * 检查元素权限
 * @param {Element} el - DOM元素
 * @param {Object} binding - 指令绑定对象
 * @param {Object} vnode - Vue虚拟节点
 */
function checkPermission(el, binding, vnode) {
  const { value, modifiers } = binding
  
  // 尝试从组件实例获取用户信息
  let user = null
  try {
    const authStore = useAuthStore()
    user = authStore.currentUser
  } catch (error) {
    console.error('无法获取用户信息:', error)
    // 如果无法获取用户信息，隐藏元素
    el.style.display = 'none'
    return
  }
  
  if (!user) {
    // 用户未登录，隐藏元素
    el.style.display = 'none'
    return
  }
  
  let hasRequiredPermission = false
  
  if (Array.isArray(value)) {
    // 检查是否具有任一权限
    hasRequiredPermission = value.some(permission => hasPermission(user, permission))
  } else {
    // 检查是否具有指定权限
    hasRequiredPermission = hasPermission(user, value)
  }
  
  // 根据权限和修饰符决定元素显示状态
  if (modifiers.hide) {
    // hide修饰符：有权限时隐藏，无权限时显示
    el.style.display = hasRequiredPermission ? 'none' : ''
  } else {
    // 默认：有权限时显示，无权限时隐藏
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