/**
 * 权限指令
 * 用于在模板中根据权限控制元素的显示和隐藏
 */

import { useAuthStore } from '@/stores/auth'
import { hasPermission, hasAnyPermission, hasAllPermissions, canAccessRoom, ROLES } from '@/utils/permissions'
import { handlePermissionError, PERMISSION_ERROR_TYPES } from '@/utils/permissionErrorHandler'

/**
 * 权限指令实现
 * 用法:
 * - v-permission="'room:edit'" - 需要特定权限
 * - v-permission="['room:edit', 'room:delete']" - 需要任一权限
 * - v-permission.all="['room:edit', 'room:delete']" - 需要所有权限
 * - v-permission.room="{ roomId: '123', permission: 'room:edit' }" - 需要寝室权限
 * - v-permission.role="'admin'" - 需要特定角色
 * - v-permission.hide="'room:edit'" - 有权限时隐藏，无权限时显示
 */
export const permissionDirective = {
  mounted(el, binding) {
    checkAndUpdateElement(el, binding)
  },
  updated(el, binding) {
    checkAndUpdateElement(el, binding)
  }
}

/**
 * 检查并更新元素显示状态
 * @param {Element} el - DOM元素
 * @param {Object} binding - 指令绑定对象
 */
function checkAndUpdateElement(el, binding) {
  try {
    const authStore = useAuthStore()
    const user = authStore.currentUser
    
    // 如果用户未登录，根据指令类型决定是否显示元素
    if (!user) {
      // 对于.hide修饰符，未登录用户应该显示元素（因为没有权限）
      // 对于普通指令，未登录用户应该隐藏元素
      el.style.display = binding.modifiers.hide ? '' : 'none'
      return
    }
    
    // 创建用户对象，包含角色和权限信息
    const userRoles = authStore.roles || []
    const userPermissions = authStore.permissions || []
    
    const userWithPermissions = {
      ...user,
      role: userRoles.length > 0 ? userRoles[0] : (user.role || 'guest'),
      permissions: userPermissions
    }
    
    let hasRequiredPermission = false
    
    // 处理不同类型的权限检查
    if (binding.modifiers.all) {
      // 检查是否具有所有权限
      hasRequiredPermission = hasAllPermissions(userWithPermissions, binding.value)
    } else if (binding.modifiers.room) {
      // 检查寝室权限
      const { roomId, permission } = binding.value
      hasRequiredPermission = canAccessRoom(userWithPermissions, roomId, permission)
    } else if (binding.modifiers.role) {
      // 检查角色
      const requiredRole = binding.value
      hasRequiredPermission = userWithPermissions.role === requiredRole
    } else if (binding.arg === 'any') {
      // 检查是否具有任一权限
      hasRequiredPermission = hasAnyPermission(userWithPermissions, binding.value)
    } else if (binding.arg === 'all') {
      // 检查是否具有所有权限
      hasRequiredPermission = hasAllPermissions(userWithPermissions, binding.value)
    } else {
      // 默认：检查是否具有特定权限或任一权限（如果是数组）
      if (Array.isArray(binding.value)) {
        hasRequiredPermission = hasAnyPermission(userWithPermissions, binding.value)
      } else {
        hasRequiredPermission = hasPermission(userWithPermissions, binding.value)
      }
    }
    
    // 根据.hide修饰符和权限状态决定元素显示
    if (binding.modifiers.hide) {
      // .hide修饰符：有权限时隐藏，无权限时显示
      el.style.display = hasRequiredPermission ? 'none' : ''
    } else {
      // 默认：有权限时显示，无权限时隐藏
      el.style.display = hasRequiredPermission ? '' : 'none'
    }
    
    // 如果元素被隐藏，添加aria-hidden属性以提高可访问性
    if (el.style.display === 'none') {
      el.setAttribute('aria-hidden', 'true')
    } else {
      el.removeAttribute('aria-hidden')
    }
  } catch (error) {
    console.error('权限指令执行错误:', error)
    // 出错时默认隐藏元素
    el.style.display = 'none'
  }
}

/**
 * 点击权限指令
 * 用于在点击时检查权限，如果没有权限则阻止默认行为并显示错误
 * 用法: v-permission-click="'room:edit'"
 */
export const permissionClickDirective = {
  mounted(el, binding) {
    el.addEventListener('click', (event) => {
      try {
        const authStore = useAuthStore()
        const user = authStore.currentUser
        
        if (!user) {
          event.preventDefault()
          handlePermissionError(PERMISSION_ERROR_TYPES.UNAUTHORIZED)
          return
        }
        
        // 创建用户对象，包含角色和权限信息
        const userRoles = authStore.roles || []
        const userPermissions = authStore.permissions || []
        
        const userWithPermissions = {
          ...user,
          role: userRoles.length > 0 ? userRoles[0] : (user.role || 'guest'),
          permissions: userPermissions
        }
        
        let hasRequiredPermission = false
        
        if (Array.isArray(binding.value)) {
          hasRequiredPermission = hasAnyPermission(userWithPermissions, binding.value)
        } else {
          hasRequiredPermission = hasPermission(userWithPermissions, binding.value)
        }
        
        if (!hasRequiredPermission) {
          event.preventDefault()
          handlePermissionError(PERMISSION_ERROR_TYPES.INSUFFICIENT_PERMISSION)
        }
      } catch (error) {
        console.error('权限点击指令执行错误:', error)
        event.preventDefault()
        handlePermissionError(PERMISSION_ERROR_TYPES.INSUFFICIENT_PERMISSION)
      }
    })
  }
}

/**
 * 角色指令
 * 用于根据角色控制元素显示
 * 用法: v-role="'admin'" 或 v-role="['admin', 'sysadmin']"
 */
export const roleDirective = {
  mounted(el, binding) {
    checkAndUpdateRoleElement(el, binding)
  },
  updated(el, binding) {
    checkAndUpdateRoleElement(el, binding)
  }
}

/**
 * 检查并更新基于角色的元素显示状态
 * @param {Element} el - DOM元素
 * @param {Object} binding - 指令绑定对象
 */
function checkAndUpdateRoleElement(el, binding) {
  try {
    const authStore = useAuthStore()
    const user = authStore.currentUser
    
    if (!user) {
      el.style.display = binding.modifiers.hide ? '' : 'none'
      return
    }
    
    const userRoles = authStore.roles || []
    const userRole = userRoles.length > 0 ? userRoles[0] : (user.role || 'guest')
    
    let hasRequiredRole = false
    
    if (Array.isArray(binding.value)) {
      hasRequiredRole = binding.value.includes(userRole)
    } else {
      hasRequiredRole = userRole === binding.value
    }
    
    if (binding.modifiers.hide) {
      el.style.display = hasRequiredRole ? 'none' : ''
    } else {
      el.style.display = hasRequiredRole ? '' : 'none'
    }
    
    if (el.style.display === 'none') {
      el.setAttribute('aria-hidden', 'true')
    } else {
      el.removeAttribute('aria-hidden')
    }
  } catch (error) {
    console.error('角色指令执行错误:', error)
    el.style.display = 'none'
  }
}

/**
 * 注册权限相关指令
 * @param {Object} app - Vue应用实例
 */
export function registerPermissionDirectives(app) {
  app.directive('permission', permissionDirective)
  app.directive('permission-click', permissionClickDirective)
  app.directive('role', roleDirective)
}

// 导出指令对象，用于单独注册
export default {
  permission: permissionDirective,
  'permission-click': permissionClickDirective,
  role: roleDirective,
  install: registerPermissionDirectives
}