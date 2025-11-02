import axios from 'axios'
import { createHttpClient } from '@/utils/token-interceptor'
import { useAuthStore } from '@/stores'

// 创建基础HTTP客户端
const http = axios.create({
  baseURL: '/api',
  timeout: 15000
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

// 导出配置好的HTTP客户端
export default httpClient
