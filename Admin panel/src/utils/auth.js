import { ref } from 'vue'

/**
 * 权限验证工具
 * 用于管理用户登录状态和权限验证
 */

// 模拟登录状态
const isLoggedIn = ref(true)

// 模拟用户信息
const currentUser = ref({
  id: 'admin-001',
  username: 'admin',
  name: '系统管理员',
  role: 'admin',
  permissions: ['all']
})

/**
 * 检查用户是否已登录
 * @returns {boolean} 登录状态
 */
export const checkAuth = () => {
  return isLoggedIn.value
}

/**
 * 获取当前用户信息
 * @returns {Object} 用户信息
 */
export const getCurrentUser = () => {
  return currentUser.value
}

/**
 * 模拟登录操作
 * @param {Object} userInfo - 用户信息
 */
export const login = (userInfo) => {
  isLoggedIn.value = true
  currentUser.value = { ...currentUser.value, ...userInfo }
  localStorage.setItem('admin-user', JSON.stringify(currentUser.value))
}

/**
 * 模拟登出操作
 */
export const logout = () => {
  isLoggedIn.value = false
  currentUser.value = null
  localStorage.removeItem('admin-user')
}

/**
 * 检查用户是否有特定权限
 * @param {string} permission - 权限名称
 * @returns {boolean} 是否有权限
 */
export const hasPermission = (permission) => {
  if (!isLoggedIn.value) return false
  if (currentUser.value.permissions.includes('all')) return true
  return currentUser.value.permissions.includes(permission)
}

/**
 * 初始化用户状态
 */
export const initAuth = () => {
  const savedUser = localStorage.getItem('admin-user')
  if (savedUser) {
    try {
      currentUser.value = JSON.parse(savedUser)
      isLoggedIn.value = true
    } catch (e) {
      console.error('解析用户信息失败', e)
      isLoggedIn.value = false
    }
  } else {
    // 默认设置为已登录状态，用于模拟环境
    isLoggedIn.value = true
  }
}

// 导出响应式变量
export { isLoggedIn, currentUser }