/**
 * HTTP请求工具模块
 * 基于axios封装的HTTP请求工具
 */
import axios from 'axios'
import { tokenManager } from './token-manager'
import { ElMessage } from 'element-plus'

// 创建axios实例
const http = axios.create({
  baseURL: 'http://localhost:4000', // 后端API基础URL
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
    
    // 处理后端返回的双层嵌套结构 {success: true, data: {xxx: []}}
    const res = response.data
    
    // 如果返回的数据结构是 {success: true, data: {...}}，则返回res.data
    if (res && typeof res === 'object' && 'success' in res && 'data' in res) {
      return res.data
    }
    
    // 否则返回原始响应数据
    return res
  },
  error => {
    console.error('[HTTP响应错误]', error)
    
    // 处理401未授权错误
    if (error.response && error.response.status === 401) {
      // 尝试刷新token
      tokenManager.refreshToken().catch(() => {
        // 刷新失败，清除token并跳转到登录页
        tokenManager.removeToken()
        window.location.href = '/login'
      })
    }
    
    // 显示错误消息
    const message = error.response?.data?.message || error.message || '请求失败'
    ElMessage.error(message)
    
    return Promise.reject(error)
  }
)

export default http