import { ref } from 'vue'
import { createApp } from 'vue'
import PermissionToast from '@/components/PermissionToast.vue'

// 创建全局权限提示实例
let permissionToastInstance = null
let permissionToastApp = null

// 权限提示状态
const isVisible = ref(false)

/**
 * 初始化权限提示服务
 * @param {Object} app - Vue应用实例
 */
export function initPermissionService(app) {
  // 创建权限提示组件容器
  const container = document.createElement('div')
  container.id = 'permission-toast-container'
  document.body.appendChild(container)
  
  // 创建权限提示应用实例
  permissionToastApp = createApp(PermissionToast)
  permissionToastInstance = permissionToastApp.mount('#permission-toast-container')
  
  // 将实例添加到全局属性，方便在任何地方访问
  app.config.globalProperties.$permissionToast = permissionToastInstance
}

/**
 * 显示权限错误提示
 * @param {Object} options - 提示选项
 * @param {string} options.type - 提示类型：error, warning, info
 * @param {string} options.title - 提示标题
 * @param {string} options.message - 提示消息
 * @param {string} options.suggestion - 建议信息
 * @param {boolean} options.showLoginButton - 是否显示登录按钮
 * @param {boolean} options.showBackButton - 是否显示返回按钮
 * @param {boolean} options.autoClose - 是否自动关闭
 * @param {number} options.duration - 自动关闭时间（毫秒）
 */
export function showPermissionError(options = {}) {
  if (!permissionToastInstance) {
    console.error('权限提示服务未初始化，请先调用 initPermissionService')
    return
  }
  
  isVisible.value = true
  permissionToastInstance.show(options)
}

/**
 * 显示无权限访问提示
 * @param {string} resource - 资源名称
 * @param {string} action - 操作名称
 * @param {Object} options - 其他选项
 */
export function showNoPermission(resource, action = '访问', options = {}) {
  showPermissionError({
    type: 'error',
    title: '无权限访问',
    message: `您没有权限${action} ${resource}`,
    suggestion: '请联系管理员获取相应权限，或使用有权限的账号登录',
    ...options
  })
}

/**
 * 显示需要登录提示
 * @param {Object} options - 其他选项
 */
export function showLoginRequired(options = {}) {
  showPermissionError({
    type: 'warning',
    title: '需要登录',
    message: '您需要登录后才能执行此操作',
    suggestion: '请点击下方按钮前往登录页面',
    showLoginButton: true,
    showBackButton: false,
    ...options
  })
}

/**
 * 显示会话过期提示
 * @param {Object} options - 其他选项
 */
export function showSessionExpired(options = {}) {
  showPermissionError({
    type: 'warning',
    title: '会话已过期',
    message: '您的登录会话已过期，请重新登录',
    suggestion: '为了您的账户安全，请重新登录',
    showLoginButton: true,
    showBackButton: false,
    autoClose: false, // 不自动关闭，需要用户主动操作
    ...options
  })
}

/**
 * 显示角色权限不足提示
 * @param {string} requiredRole - 需要的角色
 * @param {string} currentRole - 当前角色
 * @param {Object} options - 其他选项
 */
export function showInsufficientRole(requiredRole, currentRole, options = {}) {
  showPermissionError({
    type: 'error',
    title: '角色权限不足',
    message: `当前角色(${currentRole})无法执行此操作，需要${requiredRole}或更高权限`,
    suggestion: '请联系管理员提升您的角色权限，或使用有权限的账号登录',
    ...options
  })
}

/**
 * 显示寝室权限不足提示
 * @param {string} roomName - 寝室名称
 * @param {string} requiredRole - 需要的寝室角色
 * @param {Object} options - 其他选项
 */
export function showRoomPermissionDenied(roomName, requiredRole, options = {}) {
  showPermissionError({
    type: 'error',
    title: '寝室权限不足',
    message: `您没有权限在"${roomName}"寝室执行此操作，需要${requiredRole}权限`,
    suggestion: '请联系寝室管理员获取相应权限',
    ...options
  })
}

/**
 * 关闭权限提示
 */
export function closePermissionToast() {
  if (permissionToastInstance) {
    permissionToastInstance.close()
    isVisible.value = false
  }
}

/**
 * 检查权限提示是否可见
 * @returns {boolean}
 */
export function isPermissionToastVisible() {
  return isVisible.value
}

// 导出默认对象，方便按需导入
export default {
  init: initPermissionService,
  show: showPermissionError,
  showError: showNoPermission,
  showLogin: showLoginRequired,
  showExpired: showSessionExpired,
  showRoleError: showInsufficientRole,
  showRoomError: showRoomPermissionDenied,
  close: closePermissionToast,
  isVisible: isPermissionToastVisible
}