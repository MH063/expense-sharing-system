import axios from 'axios'
import { createHttpClient } from '@/utils/token-interceptor'
import { useAuthStore } from '@/stores'
import { handleRequestPermissionError } from '@/utils/permissionErrorHandler'

// 创建基础HTTP客户端
const http = axios.create({
  baseURL: 'http://localhost:4000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 集成Token拦截器
const httpClient = createHttpClient(http, {
  onTokenExpired: () => {
    console.warn('Token已过期，请重新登录')
    const authStore = useAuthStore()
    authStore.clearSession()
    
    // 如果不在登录页，则重定向到登录页
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  },
  onRefreshFailed: (error) => {
    console.error('Token刷新失败:', error)
    const authStore = useAuthStore()
    authStore.clearSession()
    
    // 如果不在登录页，则重定向到登录页
    if (window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
  }
})

// 添加响应拦截器，处理响应结构
httpClient.interceptors.response.use(
  (response) => {
    // 处理成功响应
    const data = response.data
    
    // 如果后端返回的是标准格式 {success, data, message}
    if (data && typeof data === 'object' && 'success' in data) {
      return data
    }
    
    // 否则包装为标准格式
    return {
      success: true,
      data: data,
      message: ''
    }
  },
  (error) => {
    // 处理错误响应
    console.error('HTTP请求错误:', error)
    
    // 处理权限相关错误
    if (error.response) {
      const status = error.response.status
      const errorData = error.response.data
      
      // 处理权限错误 (401, 403)
      if (status === 401 || status === 403) {
        const handled = handleRequestPermissionError(error)
        if (handled) {
          return Promise.reject(handled)
        }
      }
      
      // 如果有响应数据，返回标准错误格式
      if (errorData && typeof errorData === 'object' && 'success' in errorData) {
        return Promise.reject(errorData)
      }
      
      return Promise.reject({
        success: false,
        data: null,
        message: errorData.message || error.message || '请求失败',
        status: status
      })
    }
    
    // 网络错误或其他错误
    return Promise.reject({
      success: false,
      data: null,
      message: error.message || '网络连接失败'
    })
  }
)

// 导出配置好的HTTP客户端
export default httpClient
