/**
 * 权限错误处理工具
 * 提供统一的权限错误处理机制，包括错误类型定义、错误消息映射和错误处理函数
 */

import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { 
  showNoPermission, 
  showLoginRequired, 
  showSessionExpired,
  showInsufficientRole,
  showRoomPermissionDenied
} from './permissionToast'

/**
 * 权限错误类型枚举
 */
export const PERMISSION_ERROR_TYPES = {
  // 认证错误
  UNAUTHORIZED: 'UNAUTHORIZED', // 401 - 未认证
  TOKEN_EXPIRED: 'TOKEN_EXPIRED', // 令牌过期
  TOKEN_INVALID: 'TOKEN_INVALID', // 令牌无效
  
  // 授权错误
  FORBIDDEN: 'FORBIDDEN', // 403 - 权限不足
  ROLE_INSUFFICIENT: 'ROLE_INSUFFICIENT', // 角色权限不足
  ROOM_PERMISSION_DENIED: 'ROOM_PERMISSION_DENIED', // 寝室权限不足
  
  // 资源错误
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND', // 资源不存在
  RESOURCE_ACCESS_DENIED: 'RESOURCE_ACCESS_DENIED', // 资源访问被拒绝
  
  // 操作错误
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED', // 操作不允许
  ACTION_NOT_PERMITTED: 'ACTION_NOT_PERMITTED' // 动作未授权
}

/**
 * 错误消息映射表
 */
export const ERROR_MESSAGES = {
  [PERMISSION_ERROR_TYPES.UNAUTHORIZED]: '您需要登录才能访问此资源',
  [PERMISSION_ERROR_TYPES.TOKEN_EXPIRED]: '您的登录会话已过期，请重新登录',
  [PERMISSION_ERROR_TYPES.TOKEN_INVALID]: '您的登录凭证无效，请重新登录',
  [PERMISSION_ERROR_TYPES.FORBIDDEN]: '您没有权限访问此资源',
  [PERMISSION_ERROR_TYPES.ROLE_INSUFFICIENT]: '您的角色权限不足，无法执行此操作',
  [PERMISSION_ERROR_TYPES.ROOM_PERMISSION_DENIED]: '您没有权限在此寝室中执行此操作',
  [PERMISSION_ERROR_TYPES.RESOURCE_NOT_FOUND]: '请求的资源不存在',
  [PERMISSION_ERROR_TYPES.RESOURCE_ACCESS_DENIED]: '您没有权限访问此资源',
  [PERMISSION_ERROR_TYPES.OPERATION_NOT_ALLOWED]: '当前状态下不允许执行此操作',
  [PERMISSION_ERROR_TYPES.ACTION_NOT_PERMITTED]: '您没有权限执行此操作'
}

/**
 * 获取权限错误类型
 * @param {Object} error - 错误对象
 * @returns {string} 错误类型
 */
export function getPermissionErrorType(error) {
  if (!error.response) {
    return PERMISSION_ERROR_TYPES.FORBIDDEN
  }
  
  const { status, data } = error.response
  
  // 根据HTTP状态码确定错误类型
  switch (status) {
    case 401:
      if (data?.code === 'TOKEN_EXPIRED') {
        return PERMISSION_ERROR_TYPES.TOKEN_EXPIRED
      } else if (data?.code === 'TOKEN_INVALID') {
        return PERMISSION_ERROR_TYPES.TOKEN_INVALID
      }
      return PERMISSION_ERROR_TYPES.UNAUTHORIZED
      
    case 403:
      if (data?.code === 'ROLE_INSUFFICIENT') {
        return PERMISSION_ERROR_TYPES.ROLE_INSUFFICIENT
      } else if (data?.code === 'ROOM_PERMISSION_DENIED') {
        return PERMISSION_ERROR_TYPES.ROOM_PERMISSION_DENIED
      } else if (data?.code === 'RESOURCE_ACCESS_DENIED') {
        return PERMISSION_ERROR_TYPES.RESOURCE_ACCESS_DENIED
      }
      return PERMISSION_ERROR_TYPES.FORBIDDEN
      
    case 404:
      return PERMISSION_ERROR_TYPES.RESOURCE_NOT_FOUND
      
    default:
      return PERMISSION_ERROR_TYPES.FORBIDDEN
  }
}

/**
 * 处理权限错误
 * @param {Object} error - 错误对象
 * @param {Object} options - 处理选项
 * @returns {Object} 处理后的错误对象
 */
export function handlePermissionError(error, options = {}) {
  const errorType = getPermissionErrorType(error)
  const authStore = useAuthStore()
  const router = useRouter()
  
  // 获取错误消息
  let message = ERROR_MESSAGES[errorType]
  if (error.response?.data?.message) {
    message = error.response.data.message
  }
  
  // 构建错误对象
  const errorObj = {
    type: errorType,
    message,
    status: error.response?.status,
    code: error.response?.data?.code,
    details: error.response?.data?.details || {},
    originalError: error
  }
  
  // 根据错误类型执行不同的处理逻辑
  switch (errorType) {
    case PERMISSION_ERROR_TYPES.UNAUTHORIZED:
    case PERMISSION_ERROR_TYPES.TOKEN_EXPIRED:
    case PERMISSION_ERROR_TYPES.TOKEN_INVALID:
      // 清除认证状态
      authStore.clearSession()
      
      // 显示登录提示
      if (options.showToast !== false) {
        if (errorType === PERMISSION_ERROR_TYPES.TOKEN_EXPIRED) {
          showSessionExpired()
        } else {
          showLoginRequired()
        }
      }
      
      // 重定向到登录页
      if (options.redirect !== false && router.currentRoute.value.path !== '/auth/login') {
        router.push('/auth/login')
      }
      break
      
    case PERMISSION_ERROR_TYPES.FORBIDDEN:
    case PERMISSION_ERROR_TYPES.RESOURCE_ACCESS_DENIED:
      // 显示权限不足提示
      if (options.showToast !== false) {
        const resourceName = error.response?.data?.resource || '此资源'
        showNoPermission(resourceName)
      }
      
      // 重定向到403页面
      if (options.redirect !== false && router.currentRoute.value.path !== '/forbidden') {
        router.push('/forbidden')
      }
      break
      
    case PERMISSION_ERROR_TYPES.ROLE_INSUFFICIENT:
      // 显示角色权限不足提示
      if (options.showToast !== false) {
        const currentRole = authStore.user?.role || '未知'
        const requiredRole = error.response?.data?.requiredRole || '更高权限'
        showInsufficientRole(requiredRole, currentRole)
      }
      
      // 重定向到403页面
      if (options.redirect !== false && router.currentRoute.value.path !== '/forbidden') {
        router.push('/forbidden')
      }
      break
      
    case PERMISSION_ERROR_TYPES.ROOM_PERMISSION_DENIED:
      // 显示寝室权限不足提示
      if (options.showToast !== false) {
        const roomName = error.response?.data?.roomName || '寝室'
        const requiredRole = error.response?.data?.requiredRole || '相应权限'
        showRoomPermissionDenied(roomName, requiredRole)
      }
      
      // 重定向到403页面
      if (options.redirect !== false && router.currentRoute.value.path !== '/forbidden') {
        router.push('/forbidden')
      }
      break
      
    default:
      // 默认处理
      if (options.showToast !== false) {
        showNoPermission('请求的资源')
      }
      
      // 重定向到403页面
      if (options.redirect !== false && router.currentRoute.value.path !== '/forbidden') {
        router.push('/forbidden')
      }
  }
  
  return errorObj
}

/**
 * 处理请求中的权限错误
 * @param {Object} error - 错误对象
 * @returns {Object} 处理后的错误对象
 */
export function handleRequestPermissionError(error) {
  return handlePermissionError(error, {
    showToast: true,
    redirect: true
  })
}

/**
 * 权限检查装饰器
 * 用于包装函数，在执行前检查权限
 * @param {Function} permissionCheck - 权限检查函数
 * @param {Object} options - 选项
 * @returns {Function} 装饰后的函数
 */
export function withPermissionCheck(permissionCheck, options = {}) {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value
    
    descriptor.value = function(...args) {
      // 执行权限检查
      const hasPermission = permissionCheck.call(this, ...args)
      
      if (!hasPermission) {
        // 处理权限错误
        const error = new Error('权限不足')
        error.type = PERMISSION_ERROR_TYPES.FORBIDDEN
        
        if (options.handleError !== false) {
          handlePermissionError(error, options)
        }
        
        return Promise.reject(error)
      }
      
      // 执行原方法
      return originalMethod.apply(this, args)
    }
    
    return descriptor
  }
}

/**
 * 创建权限检查函数
 * @param {string|Function} permission - 权限标识或权限检查函数
 * @returns {Function} 权限检查函数
 */
export function createPermissionChecker(permission) {
  if (typeof permission === 'function') {
    return permission
  }
  
  return function() {
    const authStore = useAuthStore()
    return authStore.hasPermission(permission)
  }
}

// 导出默认对象
export default {
  PERMISSION_ERROR_TYPES,
  ERROR_MESSAGES,
  getPermissionErrorType,
  handlePermissionError,
  handleRequestPermissionError,
  withPermissionCheck,
  createPermissionChecker
}