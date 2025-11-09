/**
 * 消息提示工具
 * 提供统一的消息提示管理
 */
import { ElMessage, ElNotification, ElMessageBox } from 'element-plus'

// 消息类型枚举
export const MessageType = {
  SUCCESS: 'success',
  WARNING: 'warning',
  INFO: 'info',
  ERROR: 'error'
}

/**
 * 消息提示类
 */
class MessageManager {
  constructor() {
    this.messageQueue = []
    this.isShowing = false
  }

  /**
   * 显示成功消息
   * @param {string} message - 消息内容
   * @param {Object} options - 配置选项
   */
  success(message, options = {}) {
    return this.showMessage(message, MessageType.SUCCESS, options)
  }

  /**
   * 显示警告消息
   * @param {string} message - 消息内容
   * @param {Object} options - 配置选项
   */
  warning(message, options = {}) {
    return this.showMessage(message, MessageType.WARNING, options)
  }

  /**
   * 显示信息消息
   * @param {string} message - 消息内容
   * @param {Object} options - 配置选项
   */
  info(message, options = {}) {
    return this.showMessage(message, MessageType.INFO, options)
  }

  /**
   * 显示错误消息
   * @param {string} message - 消息内容
   * @param {Object} options - 配置选项
   */
  error(message, options = {}) {
    return this.showMessage(message, MessageType.ERROR, options)
  }

  /**
   * 显示消息
   * @param {string} message - 消息内容
   * @param {string} type - 消息类型
   * @param {Object} options - 配置选项
   */
  showMessage(message, type, options = {}) {
    const {
      duration = 3000,
      showClose = true,
      center = false,
      onClose = null,
      grouping = true
    } = options

    return ElMessage({
      message,
      type,
      duration,
      showClose,
      center,
      grouping,
      onClose
    })
  }

  /**
   * 显示成功通知
   * @param {string} title - 通知标题
   * @param {string} message - 通知内容
   * @param {Object} options - 配置选项
   */
  notifySuccess(title, message, options = {}) {
    return this.showNotification(title, message, MessageType.SUCCESS, options)
  }

  /**
   * 显示警告通知
   * @param {string} title - 通知标题
   * @param {string} message - 通知内容
   * @param {Object} options - 配置选项
   */
  notifyWarning(title, message, options = {}) {
    return this.showNotification(title, message, MessageType.WARNING, options)
  }

  /**
   * 显示信息通知
   * @param {string} title - 通知标题
   * @param {string} message - 通知内容
   * @param {Object} options - 配置选项
   */
  notifyInfo(title, message, options = {}) {
    return this.showNotification(title, message, MessageType.INFO, options)
  }

  /**
   * 显示错误通知
   * @param {string} title - 通知标题
   * @param {string} message - 通知内容
   * @param {Object} options - 配置选项
   */
  notifyError(title, message, options = {}) {
    return this.showNotification(title, message, MessageType.ERROR, options)
  }

  /**
   * 显示通知
   * @param {string} title - 通知标题
   * @param {string} message - 通知内容
   * @param {string} type - 通知类型
   * @param {Object} options - 配置选项
   */
  showNotification(title, message, type, options = {}) {
    const {
      duration = 4500,
      position = 'top-right',
      showClose = true,
      onClose = null
    } = options

    return ElNotification({
      title,
      message,
      type,
      duration,
      position,
      showClose,
      onClose
    })
  }

  /**
   * 显示确认对话框
   * @param {string} message - 确认内容
   * @param {string} title - 对话框标题
   * @param {Object} options - 配置选项
   */
  confirm(message, title = '确认操作', options = {}) {
    const {
      confirmButtonText = '确定',
      cancelButtonText = '取消',
      type = 'warning'
    } = options

    return ElMessageBox.confirm(message, title, {
      confirmButtonText,
      cancelButtonText,
      type
    })
  }

  /**
   * 显示提示对话框
   * @param {string} message - 提示内容
   * @param {string} title - 对话框标题
   * @param {Object} options - 配置选项
   */
  alert(message, title = '提示', options = {}) {
    const {
      confirmButtonText = '确定',
      type = 'info'
    } = options

    return ElMessageBox.alert(message, title, {
      confirmButtonText,
      type
    })
  }

  /**
   * 显示输入对话框
   * @param {string} message - 输入提示内容
   * @param {string} title - 对话框标题
   * @param {Object} options - 配置选项
   */
  prompt(message, title = '输入', options = {}) {
    const {
      confirmButtonText = '确定',
      cancelButtonText = '取消',
      inputType = 'text',
      inputValue = ''
    } = options

    return ElMessageBox.prompt(message, title, {
      confirmButtonText,
      cancelButtonText,
      inputType,
      inputValue
    })
  }

  /**
   * 关闭所有消息
   */
  closeAll() {
    ElMessage.closeAll()
  }
}

// 创建单例实例
const messageManager = new MessageManager()

// 导出单例和类
export default messageManager
export { MessageManager }