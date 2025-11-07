import axios from 'axios'
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
const request = axios.create({
  baseURL: '/api', // 统一设置 baseURL 为 /api
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' }
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // token
    const token = localStorage.getItem('admin-token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    // 路径去重：若 baseURL 已含 /api，且 url 以 /api/ 开头则去掉前缀
    if (typeof config.url === 'string' && config.url.startsWith('/api/')) {
      config.url = config.url.replace(/^\/api\//, '/')
    }

    // 出站：统一转换为 snake_case，并过滤空值
    if (config.params) {
      config.params = deepSnakeCase(filterEmpty(config.params))
    }
    if (config.data) {
      config.data = deepSnakeCase(filterEmpty(config.data))
    }

    return config
  },
  (error) => {
    console.error('[Admin][HTTP请求错误]', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const raw = response?.data

    // 标准化：解包 {success,data} 的二次 data；其余包裹为 success=true
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

    // 字段命名：入站转换为 camelCase（支持按 URL 白名单跳过）
    const skip = shouldSkipCaseConvert(response?.config?.url)
    const dataCamel = skip ? payload : deepCamelCase(payload)

    const normalized = {
      success,
      data: dataCamel,
      message,
      code,
      raw
    }

    // 兼容旧用法：调用方仍可用 response.data.xxx 访问
    return normalized
  },
  (error) => {
    console.error('[Admin][HTTP响应错误]', error)
    if (error.response) {
      const { status, data } = error.response
      const serverMsg = (data && (data.message || data.msg)) || error.message || '请求失败'
      switch (status) {
        case 401:
          ElMessage.error('未授权，请重新登录')
          localStorage.removeItem('admin-token')
          localStorage.removeItem('admin-user')
          window.location.href = '/login'
          break
        case 403:
          ElMessage.error('拒绝访问')
          break
        case 404:
          ElMessage.error('请求地址不存在')
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
    return Promise.reject(error)
  }
)

export default request