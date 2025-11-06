/**
 * HTTP请求工具模块
 * 基于axios封装的HTTP请求工具
 */
import axios from 'axios'
import { tokenManager } from './token-manager'
import { ElMessage } from 'element-plus'

// 创建axios实例
const http = axios.create({
  baseURL: 'http://localhost:4000/api', // 统一后端API基础URL
  timeout: 10000, // 请求超时时间
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
http.interceptors.request.use(
  config => {
    // 在请求发送前添加token
    const token = tokenManager.getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // 打印请求日志
    console.log(`[HTTP请求] ${config.method?.toUpperCase()} ${config.url}`, config.data || config.params)
    
    return config
  },
  error => {
    console.error('[HTTP请求错误]', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
http.interceptors.response.use(
  response => {
    // 打印响应日志
    console.log(`[HTTP响应] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data)
    
    // 直接返回原始响应，让各个模块自己处理数据结构
    return response
  },
  error => {
    console.error('[HTTP响应错误]', error)
    
    // 处理错误响应
    if (error.response) {
      const { status, data } = error.response
      
      switch (status) {
        case 401:
          // 检查是否是登录请求，如果是登录请求，不要尝试刷新token
          if (error.config.url === '/auth/login') {
            // 登录请求失败，直接传递错误
            break
          }
          // 未授权，尝试刷新token
          tokenManager.refreshToken().catch(() => {
            // 刷新失败，清除token并跳转到登录页
            tokenManager.removeToken()
            window.location.href = '/login'
          })
          break
        case 403:
          // 权限不足
          ElMessage.error('您没有权限执行此操作')
          break
        case 404:
          // 请求的资源不存在
          ElMessage.error('请求的资源不存在')
          break
        case 500:
          // 服务器内部错误
          ElMessage.error('服务器内部错误')
          break
        default:
          // 其他错误
          ElMessage.error(data?.message || error.message || '请求失败')
      }
    } else {
      // 网络错误
      ElMessage.error('网络错误，请检查网络连接')
    }
    
    return Promise.reject(error)
  }
)

export default http