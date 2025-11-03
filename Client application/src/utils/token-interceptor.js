/**
 * HTTP请求Token拦截器
 * 自动在请求中添加Token，处理Token刷新和错误
 */

import { ElMessage } from 'element-plus'
import tokenManager from './jwt-token-manager'
import { useAuthStore } from '@/stores/auth'

// 拦截器状态
let isRefreshing = false
let failedQueue = []

/**
 * 处理失败的请求队列
 * @param {Error} error - 错误对象
 */
const processQueue = (error) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve()
    }
  })
  
  failedQueue = []
}

/**
 * 创建Token拦截器
 * @param {Object} axiosInstance - Axios实例
 * @param {Function} onTokenExpired - Token过期回调
 * @param {Function} onRefreshFailed - Token刷新失败回调
 */
export const createTokenInterceptor = (
  axiosInstance,
  onTokenExpired,
  onRefreshFailed
) => {
  // 请求拦截器
  axiosInstance.interceptors.request.use(
    (config) => {
      // 添加Token到请求头
      const token = tokenManager.getToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      
      // 添加请求ID用于追踪
      config.metadata = { startTime: new Date() }
      config.headers['X-Request-ID'] = generateRequestId()
      
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // 响应拦截器
  axiosInstance.interceptors.response.use(
    (response) => {
      // 计算请求耗时
      const endTime = new Date()
      const duration = endTime - response.config.metadata.startTime
      console.log(`请求 ${response.config.url} 耗时: ${duration}ms`)
      
      return response
    },
    async (error) => {
      const originalRequest = error.config
      
      // 如果没有响应或响应配置，直接返回错误
      if (!error.response) {
        console.error('网络错误或服务器无响应:', error)
        return Promise.reject(error)
      }
      
      const { status, data } = error.response
      
      // 处理Token相关错误
      if (status === 401) {
        // 如果是刷新Token的请求失败，直接登出
        if (originalRequest.url === '/api/auth/refresh') {
          console.error('刷新Token请求失败')
          processQueue(error)
          isRefreshing = false
          
          if (onRefreshFailed) {
            onRefreshFailed(error)
          }
          
          return Promise.reject(error)
        }
        
        // 如果已经尝试刷新Token，直接返回错误
        if (originalRequest._retry) {
          console.error('Token刷新后仍然失败')
          processQueue(error)
          
          if (onTokenExpired) {
            onTokenExpired()
          }
          
          return Promise.reject(error)
        }
        
        // 如果Token即将过期或已过期，尝试刷新
        if (tokenManager.isTokenExpired() || tokenManager.isTokenExpiringSoon()) {
          if (isRefreshing) {
            // 如果正在刷新，将请求加入队列
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject })
            }).then(() => {
              // Token刷新成功后，重新发送原始请求
              return axiosInstance(originalRequest)
            }).catch((err) => {
              return Promise.reject(err)
            })
          }
          
          isRefreshing = true
          originalRequest._retry = true
          
          try {
            // 尝试刷新Token
            const authStore = useAuthStore()
            await authStore.refreshSession()
            
            // 处理队列中的请求
            processQueue(null)
            
            // 重新发送原始请求
            return axiosInstance(originalRequest)
          } catch (refreshError) {
            console.error('Token刷新失败:', refreshError)
            
            // 处理队列中的请求
            processQueue(refreshError)
            
            // 通知Token刷新失败
            if (onRefreshFailed) {
              onRefreshFailed(refreshError)
            }
            
            return Promise.reject(refreshError)
          } finally {
            isRefreshing = false
          }
        } else {
          // Token无效但不需要刷新，直接通知Token过期
          if (onTokenExpired) {
            onTokenExpired()
          }
          
          return Promise.reject(error)
        }
      }
      
      // 处理其他HTTP错误
      handleHttpError(status, data)
      
      return Promise.reject(error)
    }
  )
}

/**
 * 处理HTTP错误
 * @param {number} status - HTTP状态码
 * @param {Object} data - 响应数据
 */
const handleHttpError = (status, data) => {
  let message = '请求失败'
  
  switch (status) {
    case 400:
      message = data.message || '请求参数错误'
      break
    case 401:
      message = '未授权，请重新登录'
      break
    case 403:
      message = '拒绝访问，权限不足'
      break
    case 404:
      message = '请求的资源不存在'
      break
    case 500:
      message = '服务器内部错误'
      break
    case 502:
      message = '网关错误'
      break
    case 503:
      message = '服务不可用'
      break
    case 504:
      message = '网关超时'
      break
    default:
      message = data.message || `请求失败 (${status})`
  }
  
  // 显示错误消息
  if (status !== 401) { // 401错误由Token拦截器处理
    ElMessage.error(message)
  }
  
  console.error(`HTTP错误 ${status}:`, data)
}

/**
 * 生成请求ID
 * @returns {string} 请求ID
 */
const generateRequestId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

/**
 * 创建带有Token拦截器的HTTP客户端
 * @param {Object} axios - Axios实例
 * @param {Object} options - 配置选项
 * @returns {Object} 配置好的Axios实例
 */
export const createHttpClient = (axios, options = {}) => {
  const {
    onTokenExpired = () => {
      console.warn('Token已过期，请重新登录')
      // 可以在这里添加自动跳转到登录页的逻辑
    },
    onRefreshFailed = (error) => {
      console.error('Token刷新失败:', error)
      // 可以在这里添加自动登出的逻辑
    }
  } = options
  
  // 创建Token拦截器
  createTokenInterceptor(axios, onTokenExpired, onRefreshFailed)
  
  // 添加请求重试功能
  axios.defaults.retry = 2
  axios.defaults.retryDelay = 1000
  
  // 添加请求超时
  axios.defaults.timeout = 30000 // 30秒
  
  return axios
}

/**
 * 检查Token是否需要刷新
 * @returns {boolean} 是否需要刷新
 */
export const shouldRefreshToken = () => {
  return tokenManager.isTokenExpiringSoon() || tokenManager.isTokenExpired()
}

/**
 * 手动刷新Token
 * @param {Function} refreshFunction - 刷新函数
 * @returns {Promise} 刷新结果
 */
export const refreshToken = (refreshFunction) => {
  return tokenManager.refreshToken(refreshFunction)
}

export default {
  createTokenInterceptor,
  createHttpClient,
  shouldRefreshToken,
  refreshToken
}