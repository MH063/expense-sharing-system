/**
 * HTTP请求工具模块
 * 基于axios封装的HTTP请求工具
 */
import axios from 'axios'
import { tokenManager } from './token-manager'
import { ElMessage } from 'element-plus'

// 工具函数：类型与键名转换
const isPlainObject = (value) => Object.prototype.toString.call(value) === '[object Object]'
const toCamel = (str) => str.replace(/_[a-z]/g, (s) => s[1].toUpperCase())
const toSnake = (str) => str
  .replace(/([A-Z])/g, '_$1')
  .replace(/_{2,}/g, '_')
  .toLowerCase()

const deepMapKeys = (input, mapper) => {
  if (Array.isArray(input)) {
    return input.map((item) => deepMapKeys(item, mapper))
  }
  if (isPlainObject(input)) {
    const result = {}
    Object.keys(input).forEach((key) => {
      const mappedKey = mapper(key)
      result[mappedKey] = deepMapKeys(input[key], mapper)
    })
    return result
  }
  return input
}

const deepCamelCase = (input) => deepMapKeys(input, toCamel)
const deepSnakeCase = (input) => deepMapKeys(input, toSnake)

// 过滤空值：undefined、null、空字符串
const filterEmpty = (input) => {
  if (Array.isArray(input)) {
    return input.map((v) => filterEmpty(v))
  }
  if (isPlainObject(input)) {
    const result = {}
    Object.keys(input).forEach((k) => {
      const v = filterEmpty(input[k])
      const isEmptyString = typeof v === 'string' && v.trim() === ''
      if (v !== undefined && v !== null && !isEmptyString) {
        result[k] = v
      }
    })
    return result
  }
  return input
}

// 白名单：跳过大小写转换的 URL（支持字符串前缀或正则）
const caseConvertSkipList = [
  /^\/auth\//, // 登录/刷新等
]
const shouldSkipCaseConvert = (url) => {
  if (!url) return false
  return caseConvertSkipList.some((rule) => {
    if (typeof rule === 'string') return url.startsWith(rule)
    if (rule instanceof RegExp) return rule.test(url)
    return false
  })
}

// 创建axios实例
const http = axios.create({
  baseURL: 'http://localhost:4000/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
})

// 请求拦截器
http.interceptors.request.use(
  (config) => {
    // 在请求发送前添加token
    const token = tokenManager.getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // 路径去重：若 baseURL 已含 /api，且 url 以 /api/ 开头则去掉前缀
    if (typeof config.url === 'string' && config.url.startsWith('/api/')) {
      config.url = config.url.replace(/^\/api\//, '/')
    }

    // 出站：统一 snake_case，并过滤空值（支持按 URL 白名单跳过）
    const skip = shouldSkipCaseConvert(config.url)
    if (config.params) {
      config.params = skip ? filterEmpty(config.params) : deepSnakeCase(filterEmpty(config.params))
    }
    if (config.data) {
      config.data = skip ? filterEmpty(config.data) : deepSnakeCase(filterEmpty(config.data))
    }

    // 打印请求日志
    console.log(`[HTTP请求] ${config.method?.toUpperCase()} ${config.url}`, config.data || config.params)

    return config
  },
  (error) => {
    console.error('[HTTP请求错误]', error)
    // 标准化错误对象并保持兼容结构
    const resp = error.response
    const serverRaw = resp?.data
    const message = (serverRaw && (serverRaw.message || serverRaw.msg)) || error.message || '请求失败'
    const code = resp?.status || error.code
    const normalizedError = { success: false, data: null, message, code, error }
    return Promise.reject({ ...normalizedError, data: normalizedError })
  }
)

// 响应拦截器
http.interceptors.response.use(
  (response) => {
    // 打印响应日志
    console.log(`[HTTP响应] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data)

    const raw = response?.data

    // 标准化：优先解包 { success, data }；否则包裹为 success=true
    let success = true
    let code = response.status
    let message = ''
    let payload

    if (raw && typeof raw === 'object' && 'success' in raw) {
      success = Boolean(raw.success)
      code = raw.code ?? code
      message = raw.message ?? ''
      payload = 'data' in raw ? raw.data : undefined
    } else {
      payload = raw
    }

    // 入站：字段统一 camelCase（支持按 URL 白名单跳过）
    const skip = shouldSkipCaseConvert(response?.config?.url)
    const dataCamel = skip ? payload : deepCamelCase(payload)

    const normalized = {
      success,
      message,
      code,
      payload: dataCamel,
      raw
    }
    // 兼容返回：res.data 保留为后端风格 {success,data,message,code}
    const envelope = {
      success: normalized.success,
      data: normalized.payload,
      message: normalized.message,
      code: normalized.code
    }
    return { ...normalized, data: envelope }
  },
  (error) => {
    console.error('[HTTP响应错误]', error)

    if (error.response) {
      const { status, data } = error.response
      const serverMsg = (data && (data.message || data.msg)) || error.message || '请求失败'
      switch (status) {
        case 401:
          // 检查是否是登录请求，如果是登录请求，不要尝试刷新token
          if (error.config && error.config.url === '/auth/login') {
            break
          }
          // 未授权，尝试刷新token
          tokenManager.refreshToken().catch(() => {
            tokenManager.removeToken()
            window.location.href = '/login'
          })
          break
        case 403:
          ElMessage.error('您没有权限执行此操作')
          break
        case 404:
          ElMessage.error('请求的资源不存在')
          break
        case 500:
          ElMessage.error('服务器内部错误')
          break
        default:
          ElMessage.error(serverMsg)
      }
    } else {
      ElMessage.error('网络错误，请检查网络连接')
    }

    // 标准化错误对象并保持兼容结构
    const resp = error.response
    const serverRaw = resp?.data
    const message = (serverRaw && (serverRaw.message || serverRaw.msg)) || error.message || '请求失败'
    const code = resp?.status || error.code
    const normalizedError = { success: false, data: null, message, code, error }
    return Promise.reject({ ...normalizedError, data: normalizedError })
  }
)

export default http