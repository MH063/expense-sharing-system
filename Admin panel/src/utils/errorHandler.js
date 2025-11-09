/**
 * 错误处理工具类
 * 提供统一的错误处理机制和友好的错误提示
 */
import { ElMessage, ElNotification } from 'element-plus'

// 错误类型枚举
export const ErrorType = {
  NETWORK: 'NETWORK', // 网络错误
  SERVER: 'SERVER', // 服务器错误
  VALIDATION: 'VALIDATION', // 验证错误
  PERMISSION: 'PERMISSION', // 权限错误
  BUSINESS: 'BUSINESS', // 业务逻辑错误
  UNKNOWN: 'UNKNOWN' // 未知错误
}

// 错误级别枚举
export const ErrorLevel = {
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error'
}

// 错误码映射表
const ErrorCodeMap = {
  // 网络相关
  NETWORK_ERROR: { message: '网络连接失败，请检查网络设置', type: ErrorType.NETWORK, level: ErrorLevel.ERROR },
  TIMEOUT: { message: '请求超时，请稍后重试', type: ErrorType.NETWORK, level: ErrorLevel.WARNING },
  
  // 认证相关
  UNAUTHORIZED: { message: '未授权，请重新登录', type: ErrorType.PERMISSION, level: ErrorLevel.ERROR },
  TOKEN_EXPIRED: { message: '登录已过期，请重新登录', type: ErrorType.PERMISSION, level: ErrorLevel.ERROR },
  FORBIDDEN: { message: '权限不足，无法执行此操作', type: ErrorType.PERMISSION, level: ErrorLevel.ERROR },
  
  // 服务器相关
  SERVER_ERROR: { message: '服务器内部错误，请稍后重试', type: ErrorType.SERVER, level: ErrorLevel.ERROR },
  NOT_FOUND: { message: '请求的资源不存在', type: ErrorType.SERVER, level: ErrorLevel.WARNING },
  
  // 业务相关
  VALIDATION_FAILED: { message: '数据验证失败，请检查输入', type: ErrorType.VALIDATION, level: ErrorLevel.WARNING },
  BUSINESS_ERROR: { message: '操作失败，请稍后重试', type: ErrorType.BUSINESS, level: ErrorLevel.ERROR },
  DUPLICATE_OPERATION: { message: '重复操作，请勿重复提交', type: ErrorType.BUSINESS, level: ErrorLevel.WARNING }
}

/**
 * 错误处理类
 */
class ErrorHandler {
  /**
   * 处理HTTP错误
   * @param {Object} error - 错误对象
   * @param {Object} options - 配置选项
   * @param {boolean} options.showMessage - 是否显示错误消息，默认true
   * @param {boolean} options.logError - 是否记录错误日志，默认true
   * @param {string} options.customMessage - 自定义错误消息
   * @param {Function} options.callback - 错误处理回调函数
   */
  handleHttpError(error, options = {}) {
    const {
      showMessage = true,
      logError = true,
      customMessage = '',
      callback = null
    } = options

    let errorInfo = {
      message: '未知错误',
      type: ErrorType.UNKNOWN,
      level: ErrorLevel.ERROR,
      code: null
    }

    // 解析错误信息
    if (error.response) {
      // 服务器响应错误
      const { status, data } = error.response
      errorInfo.code = status
      
      // 尝试从响应中获取错误消息
      const serverMessage = data?.message || data?.msg || ''
      
      // 根据状态码确定错误类型和消息
      switch (status) {
        case 400:
          errorInfo = { ...errorInfo, ...ErrorCodeMap.VALIDATION_FAILED, message: serverMessage || '请求参数错误' }
          break
        case 401:
          errorInfo = { ...errorInfo, ...ErrorCodeMap.UNAUTHORIZED }
          // 清除本地存储的认证信息
          localStorage.removeItem('admin-token')
          localStorage.removeItem('admin-user')
          // 跳转到登录页
          setTimeout(() => {
            window.location.href = '/login'
          }, 1500)
          break
        case 403:
          errorInfo = { ...errorInfo, ...ErrorCodeMap.FORBIDDEN }
          break
        case 404:
          errorInfo = { ...errorInfo, ...ErrorCodeMap.NOT_FOUND }
          break
        case 408:
          errorInfo = { ...errorInfo, ...ErrorCodeMap.TIMEOUT }
          break
        case 409:
          errorInfo = { ...errorInfo, ...ErrorCodeMap.DUPLICATE_OPERATION }
          break
        case 500:
        case 502:
        case 503:
        case 504:
          errorInfo = { ...errorInfo, ...ErrorCodeMap.SERVER_ERROR }
          break
        default:
          errorInfo.message = serverMessage || `请求失败 (${status})`
      }
    } else if (error.request) {
      // 请求已发出但没有收到响应
      errorInfo = { ...errorInfo, ...ErrorCodeMap.NETWORK_ERROR }
    } else {
      // 请求设置错误
      errorInfo.message = error.message || '请求配置错误'
    }

    // 使用自定义消息
    if (customMessage) {
      errorInfo.message = customMessage
    }

    // 记录错误日志
    if (logError) {
      this.logError(error, errorInfo)
    }

    // 显示错误消息
    if (showMessage) {
      this.showErrorMessage(errorInfo)
    }

    // 执行回调函数
    if (typeof callback === 'function') {
      callback(error, errorInfo)
    }

    return errorInfo
  }

  /**
   * 处理业务错误
   * @param {string} message - 错误消息
   * @param {Object} options - 配置选项
   */
  handleBusinessError(message, options = {}) {
    const {
      level = ErrorLevel.ERROR,
      type = ErrorType.BUSINESS,
      code = null,
      showMessage = true,
      callback = null
    } = options

    const errorInfo = {
      message,
      type,
      level,
      code
    }

    if (showMessage) {
      this.showErrorMessage(errorInfo)
    }

    if (typeof callback === 'function') {
      callback(errorInfo)
    }

    return errorInfo
  }

  /**
   * 显示错误消息
   * @param {Object} errorInfo - 错误信息对象
   */
  showErrorMessage(errorInfo) {
    const { message, level } = errorInfo

    // 根据错误级别选择不同的展示方式
    switch (level) {
      case ErrorLevel.INFO:
        ElMessage.info(message)
        break
      case ErrorLevel.WARNING:
        ElMessage.warning(message)
        break
      case ErrorLevel.ERROR:
        ElMessage.error(message)
        break
      default:
        ElMessage.error(message)
    }
  }

  /**
   * 显示通知类型的错误消息
   * @param {Object} errorInfo - 错误信息对象
   * @param {Object} notificationOptions - 通知配置选项
   */
  showErrorNotification(errorInfo, notificationOptions = {}) {
    const { message, level } = errorInfo
    const { title = '错误提示', duration = 4500 } = notificationOptions

    ElNotification({
      title,
      message,
      type: level === ErrorLevel.WARNING ? 'warning' : 'error',
      duration
    })
  }

  /**
   * 记录错误日志
   * @param {Object} error - 原始错误对象
   * @param {Object} errorInfo - 处理后的错误信息
   */
  logError(error, errorInfo) {
    const logData = {
      timestamp: new Date().toISOString(),
      error: {
        message: error.message,
        stack: error.stack,
        config: error.config
      },
      errorInfo,
      url: window.location.href,
      userAgent: navigator.userAgent
    }

    console.error('[Admin][错误日志]', logData)

    // 这里可以添加将错误日志发送到服务器的逻辑
    // this.sendErrorLogToServer(logData)
  }

  /**
   * 发送错误日志到服务器
   * @param {Object} logData - 日志数据
   */
  async sendErrorLogToServer(logData) {
    try {
      // 使用同步请求避免循环错误
      const xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/admin/logs/error', false) // 同步请求
      xhr.setRequestHeader('Content-Type', 'application/json')
      xhr.send(JSON.stringify(logData))
    } catch (e) {
      console.error('发送错误日志失败:', e)
    }
  }
}

// 创建单例实例
const errorHandler = new ErrorHandler()

// 导出单例和类
export default errorHandler
export { ErrorHandler }