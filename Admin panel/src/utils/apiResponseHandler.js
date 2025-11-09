/**
 * API响应处理工具
 * 提供统一的API响应处理机制
 */
import messageManager from './messageManager'

// 响应状态码枚举
export const ResponseStatus = {
  SUCCESS: 'success',
  ERROR: 'error',
  LOADING: 'loading'
}

/**
 * API响应处理类
 */
class ApiResponseHandler {
  /**
   * 处理API响应
   * @param {Object} response - API响应对象
   * @param {Object} options - 配置选项
   * @param {boolean} options.showMessage - 是否显示消息，默认true
   * @param {string} options.successMessage - 成功消息
   * @param {boolean} options.showError - 是否显示错误消息，默认true
   * @param {Function} options.onSuccess - 成功回调
   * @param {Function} options.onError - 错误回调
   * @param {Function} options.onComplete - 完成回调
   */
  handleResponse(response, options = {}) {
    const {
      showMessage = true,
      successMessage = '',
      showError = true,
      onSuccess = null,
      onError = null,
      onComplete = null
    } = options

    // 检查响应是否存在
    if (!response) {
      const error = new Error('响应数据为空')
      if (showError) {
        messageManager.error('响应数据为空')
      }
      if (typeof onError === 'function') {
        onError(error)
      }
      if (typeof onComplete === 'function') {
        onComplete()
      }
      return { success: false, data: null, error }
    }

    // 检查响应状态
    if (response.success) {
      // 成功响应
      if (showMessage && successMessage) {
        messageManager.success(successMessage)
      }
      
      if (typeof onSuccess === 'function') {
        onSuccess(response.data, response)
      }
      
      if (typeof onComplete === 'function') {
        onComplete()
      }
      
      return {
        success: true,
        data: response.data,
        message: response.message,
        code: response.code
      }
    } else {
      // 失败响应
      const errorMessage = response.message || '操作失败'
      if (showError) {
        messageManager.error(errorMessage)
      }
      
      if (typeof onError === 'function') {
        onError(response)
      }
      
      if (typeof onComplete === 'function') {
        onComplete()
      }
      
      return {
        success: false,
        data: response.data || null,
        message: errorMessage,
        code: response.code
      }
    }
  }

  /**
   * 处理API错误
   * @param {Object} error - 错误对象
   * @param {Object} options - 配置选项
   * @param {boolean} options.showMessage - 是否显示错误消息，默认true
   * @param {string} options.errorMessage - 自定义错误消息
   * @param {Function} options.onError - 错误回调
   */
  handleError(error, options = {}) {
    const {
      showMessage = true,
      errorMessage = '',
      onError = null
    } = options

    let message = errorMessage || '操作失败'
    
    // 尝试从错误对象中获取消息
    if (error) {
      if (error.message) {
        message = error.message
      } else if (error.response?.data?.message) {
        message = error.response.data.message
      } else if (error.response?.data?.msg) {
        message = error.response.data.msg
      }
    }

    if (showMessage) {
      messageManager.error(message)
    }

    if (typeof onError === 'function') {
      onError(error)
    }

    return {
      success: false,
      data: null,
      message,
      error
    }
  }

  /**
   * 处理分页响应
   * @param {Object} response - API响应对象
   * @param {Object} options - 配置选项
   */
  handlePaginatedResponse(response, options = {}) {
    const result = this.handleResponse(response, options)
    
    if (result.success && result.data) {
      // 标准化分页数据结构
      const { data, pagination, total, page, pageSize } = result.data
      
      return {
        ...result,
        data: {
          items: data || [],
          pagination: pagination || {
            current: page || 1,
            pageSize: pageSize || 10,
            total: total || 0
          }
        }
      }
    }
    
    return result
  }

  /**
   * 创建API请求包装器
   * @param {Function} apiCall - API调用函数
   * @param {Object} options - 配置选项
   */
  createApiWrapper(apiCall, options = {}) {
    return async (...args) => {
      const {
        loadingMessage = '加载中...',
        successMessage = '',
        errorMessage = '',
        showLoading = true,
        showMessage = true,
        onSuccess = null,
        onError = null,
        onComplete = null
      } = options

      try {
        // 显示加载状态
        if (showLoading) {
          // 这里可以集成全局加载状态
          console.log(loadingMessage)
        }

        // 执行API调用
        const response = await apiCall(...args)
        
        // 处理响应
        const result = this.handleResponse(response, {
          showMessage,
          successMessage,
          onSuccess,
          onError,
          onComplete
        })

        return result
      } catch (error) {
        // 处理错误
        const result = this.handleError(error, {
          showMessage,
          errorMessage,
          onError
        })

        if (typeof onComplete === 'function') {
          onComplete()
        }

        return result
      }
    }
  }
}

// 创建单例实例
const apiResponseHandler = new ApiResponseHandler()

// 导出单例和类
export default apiResponseHandler
export { ApiResponseHandler }