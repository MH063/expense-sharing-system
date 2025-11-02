/**
 * 用户状态管理
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  login as loginApi,
  register as registerApi,
  logout as logoutApi,
  getCurrentUser,
  updateProfile,
  changePassword,
  uploadAvatar
} from '@/api/user'

export const useUserStore = defineStore('user', () => {
  // 状态
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || '')
  const refreshTokenValue = ref(localStorage.getItem('refreshToken') || '')
  const isLoading = ref(false)
  
  // 计算属性
  const isAuthenticated = computed(() => !!token.value && !!user.value)
  const userRole = computed(() => user.value?.role || '')
  const userName = computed(() => user.value?.name || '')
  const userAvatar = computed(() => user.value?.avatar || '')
  
  // 方法
  /**
   * 用户登录
   * @param {Object} credentials - 登录凭据
   * @returns {Promise} 登录结果
   */
  async function login(credentials) {
    isLoading.value = true
    try {
      const response = await loginApi(credentials)
      const { token: accessToken, refreshToken: refresh, user: userData } = response.data.data
      
      token.value = accessToken
      refreshTokenValue.value = refresh
      user.value = userData
      
      // 保存到本地存储
      localStorage.setItem('token', accessToken)
      localStorage.setItem('refreshToken', refresh)
      
      return response
    } catch (error) {
      console.error('登录失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * 用户注册
   * @param {Object} userData - 用户数据
   * @returns {Promise} 注册结果
   */
  async function register(userData) {
    isLoading.value = true
    try {
      const response = await registerApi(userData)
      // 检查响应是否成功
      if (response.data && response.data.success) {
        return response.data
      } else {
        throw new Error(response.data?.message || '注册失败')
      }
    } catch (error) {
      console.error('注册失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * 用户登出
   * @returns {Promise} 登出结果
   */
  async function logout() {
    try {
      await logoutApi()
    } catch (error) {
      console.error('登出请求失败:', error)
    } finally {
      // 清除本地状态
      clearUserData()
    }
  }
  
  /**
   * 获取当前用户信息
   * @returns {Promise} 用户信息
   */
  async function fetchCurrentUser() {
    if (!token.value) return
    
    isLoading.value = true
    try {
      const response = await getCurrentUser()
      user.value = response.data.data
      return response
    } catch (error) {
      console.error('获取用户信息失败:', error)
      // 如果token无效，清除用户数据
      if (error.response?.status === 401) {
        clearUserData()
      }
      throw error
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * 更新用户信息
   * @param {Object} userData - 用户数据
   * @returns {Promise} 更新结果
   */
  async function updateUserProfile(userData) {
    isLoading.value = true
    try {
      const response = await updateProfile(userData)
      // 更新本地用户信息
      if (response.data.success) {
        user.value = { ...user.value, ...response.data.data }
      }
      return response
    } catch (error) {
      console.error('更新用户信息失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * 修改密码
   * @param {Object} passwordData - 密码数据
   * @returns {Promise} 修改结果
   */
  async function changeUserPassword(passwordData) {
    isLoading.value = true
    try {
      const response = await changePassword(passwordData)
      return response
    } catch (error) {
      console.error('修改密码失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * 上传头像
   * @param {FormData} formData - 头像文件
   * @returns {Promise} 上传结果
   */
  async function uploadUserAvatar(formData) {
    isLoading.value = true
    try {
      const response = await uploadAvatar(formData)
      // 更新本地用户头像
      if (response.data.success) {
        user.value.avatar = response.data.data.avatar
      }
      return response
    } catch (error) {
      console.error('上传头像失败:', error)
      throw error
    } finally {
      isLoading.value = false
    }
  }
  
  /**
   * 清除用户数据
   */
  function clearUserData() {
    user.value = null
    token.value = ''
    refreshTokenValue.value = ''
    localStorage.removeItem('token')
    localStorage.removeItem('refreshToken')
  }
  
  /**
   * 刷新令牌
   * @returns {Promise} 刷新结果
   */
  async function refreshAccessToken() {
    if (!refreshTokenValue.value) {
      throw new Error('没有刷新令牌')
    }
    
    try {
      const response = await refreshTokenApi()
      const { token: accessToken, refreshToken: refresh } = response.data.data
      
      token.value = accessToken
      refreshTokenValue.value = refresh
      
      // 保存到本地存储
      localStorage.setItem('token', accessToken)
      localStorage.setItem('refreshToken', refresh)
      
      return response
    } catch (error) {
      console.error('刷新令牌失败:', error)
      clearUserData()
      throw error
    }
  }
  
  /**
   * 初始化认证状态
   */
  async function initializeAuth() {
    if (token.value) {
      try {
        await fetchCurrentUser()
      } catch (error) {
        console.error('初始化认证状态失败:', error)
        clearUserData()
      }
    }
  }
  
  /**
   * 检查用户权限
   * @param {string} permission - 权限标识
   * @returns {boolean} 是否有权限
   */
  function hasPermission(permission) {
    if (!user.value) return false
    
    // 管理员拥有所有权限
    if (user.value.role === 'admin') return true
    
    // 检查用户权限列表
    return user.value.permissions?.includes(permission) || false
  }
  
  /**
   * 检查用户角色
   * @param {string} role - 角色标识
   * @returns {boolean} 是否是指定角色
   */
  function hasRole(role) {
    return user.value?.role === role
  }
  
  return {
    // 状态
    user,
    token,
    refreshTokenValue,
    isLoading,
    
    // 计算属性
    isAuthenticated,
    userRole,
    userName,
    userAvatar,
    
    // 方法
    login,
    register,
    logout,
    fetchCurrentUser,
    updateUserProfile,
    changeUserPassword,
    uploadUserAvatar,
    clearUserData,
    refreshAccessToken,
    initializeAuth,
    hasPermission,
    hasRole
  }
})