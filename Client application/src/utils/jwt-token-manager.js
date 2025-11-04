/**
 * JWT Token 管理工具
 * 提供Token的生成、验证、刷新和存储功能
 */

import { Base64 } from 'js-base64'

// Token相关常量
const TOKEN_KEY = 'auth_token'
const REFRESH_TOKEN_KEY = 'refresh_token'
const TOKEN_EXPIRY_KEY = 'token_expiry'
const CURRENT_USER_KEY = 'current_user'

// Token状态枚举
export const TOKEN_STATUS = {
  VALID: 'valid',
  EXPIRED: 'expired',
  EXPIRING_SOON: 'expiring_soon',
  INVALID: 'invalid'
}

/**
 * JWT Token管理类
 */
class JwtTokenManager {
  constructor() {
    this.token = null
    this.refreshToken = null
    this.tokenExpiry = null
    this.refreshPromise = null
    this.refreshListeners = []
    this.refreshCallback = null
  }

  /**
   * 初始化Token管理器
   * @param {Object} options - 配置选项
   * @param {number} options.refreshThreshold - Token刷新阈值(毫秒)，默认5分钟
   * @param {number} options.maxRetries - 最大重试次数，默认3次
   */
  init(options = {}) {
    this.refreshThreshold = options.refreshThreshold || 5 * 60 * 1000 // 5分钟
    this.maxRetries = options.maxRetries || 3
    this.retryCount = 0
    
    // 从本地存储加载Token
    this.loadFromStorage()
    
    // 添加页面卸载事件监听
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.saveToStorage.bind(this))
    }
    
    console.log('Token管理器初始化完成', {
      hasToken: !!this.token,
      hasRefreshToken: !!this.refreshToken,
      tokenExpiry: this.tokenExpiry
    })
  }

  /**
   * 设置Token
   * @param {string} token - JWT访问令牌
   * @param {string} refreshToken - 刷新令牌
   * @param {Date|string} tokenExpiry - Token过期时间
   * @param {string} username - 用户名，用于多用户Token管理
   */
  setTokens(token, refreshToken, tokenExpiry, username) {
    this.token = token
    this.refreshToken = refreshToken
    this.tokenExpiry = tokenExpiry ? new Date(tokenExpiry) : null
    
    // 如果提供了用户名，设置为当前用户
    if (username) {
      this.setCurrentUser(username)
    }
    
    // 重置重试计数
    this.retryCount = 0
    
    // 保存到本地存储
    this.saveToStorage()
    
    // 通知监听器Token已更新
    this.notifyTokenUpdate()
  }

  /**
   * 设置单个Token
   * @param {string} token - JWT访问令牌
   */
  setToken(token) {
    this.token = token
    this.saveToStorage()
    this.notifyTokenUpdate()
  }

  /**
   * 设置刷新Token
   * @param {string} refreshToken - 刷新令牌
   */
  setRefreshToken(refreshToken) {
    this.refreshToken = refreshToken
    this.saveToStorage()
  }

  /**
   * 设置Token刷新回调
   * @param {Function} callback - 刷新回调函数
   */
  setRefreshCallback(callback) {
    this.refreshCallback = callback
  }

  /**
   * 获取当前Token
   * @returns {string|null} 当前Token
   */
  getToken() {
    return this.token
  }

  /**
   * 获取刷新Token
   * @returns {string|null} 刷新Token
   */
  getRefreshToken() {
    return this.refreshToken
  }

  /**
   * 获取Token过期时间
   * @returns {Date|null} Token过期时间
   */
  getTokenExpiry() {
    return this.tokenExpiry
  }

  /**
   * 解析JWT Token
   * @param {string} token - JWT Token
   * @returns {Object|null} 解析后的Token载荷
   */
  parseToken(token) {
    try {
      if (!token) return null
      
      const parts = token.split('.')
      if (parts.length !== 3) return null
      
      const payload = parts[1]
      const decoded = Base64.decode(payload)
      return JSON.parse(decoded)
    } catch (error) {
      console.error('解析Token失败:', error)
      return null
    }
  }

  /**
   * 检查Token状态
   * @param {string} token - 要检查的Token，默认为当前Token
   * @returns {string} Token状态
   */
  checkTokenStatus(token = this.token) {
    if (!token) return TOKEN_STATUS.INVALID
    
    // 如果是模拟Token，总是返回有效
    if (token.startsWith('mock-jwt-token-')) {
      return TOKEN_STATUS.VALID
    }
    
    const payload = this.parseToken(token)
    if (!payload || !payload.exp) return TOKEN_STATUS.INVALID
    
    const now = Math.floor(Date.now() / 1000)
    const expiry = payload.exp
    
    if (now >= expiry) return TOKEN_STATUS.EXPIRED
    
    // 检查是否即将过期（在刷新阈值内）
    const expiryTime = expiry * 1000
    const currentTime = Date.now()
    const timeUntilExpiry = expiryTime - currentTime
    
    if (timeUntilExpiry <= this.refreshThreshold) {
      return TOKEN_STATUS.EXPIRING_SOON
    }
    
    return TOKEN_STATUS.VALID
  }

  /**
   * 检查Token是否有效
   * @returns {boolean} Token是否有效
   */
  isTokenValid() {
    return this.checkTokenStatus() === TOKEN_STATUS.VALID
  }

  /**
   * 检查Token是否即将过期
   * @returns {boolean} Token是否即将过期
   */
  isTokenExpiringSoon() {
    return this.checkTokenStatus() === TOKEN_STATUS.EXPIRING_SOON
  }

  /**
   * 检查Token是否已过期
   * @returns {boolean} Token是否已过期
   */
  isTokenExpired() {
    const status = this.checkTokenStatus()
    return status === TOKEN_STATUS.EXPIRED || status === TOKEN_STATUS.INVALID
  }

  /**
   * 刷新Token
   * @param {Function} refreshFunction - 刷新Token的函数
   * @returns {Promise<Object>} 刷新后的Token信息
   */
  async refreshToken(refreshFunction) {
    // 如果已经在刷新中，返回现有的Promise
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    // 如果有设置回调函数，使用回调函数
    if (this.refreshCallback && typeof this.refreshCallback === 'function') {
      refreshFunction = this.refreshCallback
    }

    // 检查是否超过最大重试次数
    if (this.retryCount >= this.maxRetries) {
      throw new Error(`刷新Token失败，已达到最大重试次数 ${this.maxRetries}`)
    }

    // 创建刷新Promise
    this.refreshPromise = this._performTokenRefresh(refreshFunction)
    
    try {
      const result = await this.refreshPromise
      this.retryCount = 0 // 重置重试计数
      return result
    } finally {
      this.refreshPromise = null
    }
  }

  /**
   * 执行Token刷新
   * @private
   * @param {Function} refreshFunction - 刷新Token的函数
   * @returns {Promise<Object>} 刷新后的Token信息
   */
  async _performTokenRefresh(refreshFunction) {
    try {
      this.retryCount++
      console.log(`尝试刷新Token (第${this.retryCount}次)`)
      
      const result = await refreshFunction(this.refreshToken)
      
      // 更新Token
      this.setTokens(
        result.accessToken,
        result.refreshToken || this.refreshToken,
        result.accessTokenExpiresAt
      )
      
      return result
    } catch (error) {
      console.error(`刷新Token失败 (第${this.retryCount}次):`, error)
      
      // 如果刷新失败，清除Token
      if (this.retryCount >= this.maxRetries) {
        this.clearTokens()
      }
      
      throw error
    }
  }

  /**
   * 获取Token剩余有效时间（毫秒）
   * @returns {number} 剩余有效时间，如果Token无效则返回0
   */
  getTokenTimeToLive() {
    if (!this.token) return 0
    
    // 如果是模拟Token，返回一个较大的值（24小时）
    if (this.token.startsWith('mock-jwt-token-')) {
      return 24 * 60 * 60 * 1000 // 24小时
    }
    
    const payload = this.parseToken(this.token)
    if (!payload || !payload.exp) return 0
    
    const now = Math.floor(Date.now() / 1000)
    const expiry = payload.exp
    
    return Math.max(0, (expiry - now) * 1000)
  }

  /**
   * 获取Token过期时间（秒）
   * @returns {number} Token过期时间（秒）
   */
  getTokenExpiresIn() {
    return Math.floor(this.getTokenTimeToLive() / 1000)
  }

  /**
   * 获取Token签发时间
   * @returns {Date|null} Token签发时间
   */
  getTokenIssuedAt() {
    if (!this.token) return null
    
    const payload = this.parseToken(this.token)
    if (!payload || !payload.iat) return null
    
    return new Date(payload.iat * 1000)
  }

  /**
   * 获取Token过期时间
   * @returns {Date|null} Token过期时间
   */
  getTokenExpiresAt() {
    if (!this.token) return null
    
    const payload = this.parseToken(this.token)
    if (!payload || !payload.exp) return null
    
    return new Date(payload.exp * 1000)
  }

  /**
   * 设置当前用户
   * @param {string} username - 用户名
   */
  setCurrentUser(username) {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(CURRENT_USER_KEY, username)
        console.log('已设置当前用户:', username)
      } catch (error) {
        console.error('设置当前用户失败:', error)
      }
    }
  }

  /**
   * 获取当前用户
   * @returns {string|null} 当前用户名
   */
  getCurrentUser() {
    if (typeof localStorage !== 'undefined') {
      try {
        return localStorage.getItem(CURRENT_USER_KEY)
      } catch (error) {
        console.error('获取当前用户失败:', error)
        return null
      }
    }
    return null
  }

  /**
   * 获取用户特定的Token键名
   * @param {string} key - 基础键名
   * @param {string} username - 用户名
   * @returns {string} 用户特定的键名
   */
  getUserSpecificKey(key, username) {
    return username ? `${key}_${username}` : key
  }

  /**
   * 清除Token
   */
  clearTokens() {
    this.token = null
    this.refreshToken = null
    this.tokenExpiry = null
    this.retryCount = 0
    
    // 从本地存储清除
    this.removeFromStorage()
    
    // 通知监听器Token已清除
    this.notifyTokenClear()
  }

  /**
   * 保存Token到本地存储
   */
  saveToStorage() {
    if (typeof localStorage !== 'undefined') {
      try {
        // 获取当前用户
        const currentUser = this.getCurrentUser()
        
        // 检查是否勾选了记住我
        const rememberMe = localStorage.getItem('remember_me') === 'true'
        
        // 根据记住我状态选择存储方式
        const storage = rememberMe ? localStorage : sessionStorage
        
        // 为当前用户生成特定的键名
        const userTokenKey = this.getUserSpecificKey(TOKEN_KEY, currentUser)
        const userRefreshTokenKey = this.getUserSpecificKey(REFRESH_TOKEN_KEY, currentUser)
        const userTokenExpiryKey = this.getUserSpecificKey(TOKEN_EXPIRY_KEY, currentUser)
        
        if (this.token) storage.setItem(userTokenKey, this.token)
        else {
          localStorage.removeItem(userTokenKey)
          sessionStorage.removeItem(userTokenKey)
        }
        
        if (this.refreshToken) storage.setItem(userRefreshTokenKey, this.refreshToken)
        else {
          localStorage.removeItem(userRefreshTokenKey)
          sessionStorage.removeItem(userRefreshTokenKey)
        }
        
        if (this.tokenExpiry) storage.setItem(userTokenExpiryKey, this.tokenExpiry.toISOString())
        else {
          localStorage.removeItem(userTokenExpiryKey)
          sessionStorage.removeItem(userTokenExpiryKey)
        }
        
        console.log(`Token已保存到${rememberMe ? 'localStorage' : 'sessionStorage'}，用户: ${currentUser}`)
      } catch (error) {
        console.error('保存Token到本地存储失败:', error)
      }
    }
  }

  /**
   * 从本地存储加载Token
   */
  loadFromStorage() {
    if (typeof localStorage !== 'undefined') {
      try {
        // 获取当前用户
        const currentUser = this.getCurrentUser()
        
        // 检查是否勾选了记住我
        const rememberMe = localStorage.getItem('remember_me') === 'true'
        
        // 为当前用户生成特定的键名
        const userTokenKey = this.getUserSpecificKey(TOKEN_KEY, currentUser)
        const userRefreshTokenKey = this.getUserSpecificKey(REFRESH_TOKEN_KEY, currentUser)
        const userTokenExpiryKey = this.getUserSpecificKey(TOKEN_EXPIRY_KEY, currentUser)
        
        // 根据记住我状态选择存储方式，但也要尝试从两种存储中读取
        let token = localStorage.getItem(userTokenKey) || sessionStorage.getItem(userTokenKey)
        let refreshToken = localStorage.getItem(userRefreshTokenKey) || sessionStorage.getItem(userRefreshTokenKey)
        let expiryStr = localStorage.getItem(userTokenExpiryKey) || sessionStorage.getItem(userTokenExpiryKey)
        
        this.token = token
        this.refreshToken = refreshToken
        this.tokenExpiry = expiryStr ? new Date(expiryStr) : null
        
        console.log('从本地存储加载Token:', {
          hasToken: !!this.token,
          hasRefreshToken: !!this.refreshToken,
          tokenExpiry: this.tokenExpiry,
          currentUser,
          rememberMe
        })
        
        // 检查加载的Token是否有效
        if (this.token && this.isTokenExpired()) {
          // 如果是模拟Token，不检查过期
          if (!this.token.startsWith('mock-jwt-token-')) {
            console.warn('从本地存储加载的Token已过期，将清除')
            this.clearTokens()
          }
        }
      } catch (error) {
        console.error('从本地存储加载Token失败:', error)
        this.clearTokens()
      }
    }
  }

  /**
   * 从本地存储移除Token
   */
  removeFromStorage() {
    if (typeof localStorage !== 'undefined') {
      try {
        // 获取当前用户
        const currentUser = this.getCurrentUser()
        
        // 为当前用户生成特定的键名
        const userTokenKey = this.getUserSpecificKey(TOKEN_KEY, currentUser)
        const userRefreshTokenKey = this.getUserSpecificKey(REFRESH_TOKEN_KEY, currentUser)
        const userTokenExpiryKey = this.getUserSpecificKey(TOKEN_EXPIRY_KEY, currentUser)
        
        // 从localStorage和sessionStorage中清除Token
        localStorage.removeItem(userTokenKey)
        localStorage.removeItem(userRefreshTokenKey)
        localStorage.removeItem(userTokenExpiryKey)
        
        sessionStorage.removeItem(userTokenKey)
        sessionStorage.removeItem(userRefreshTokenKey)
        sessionStorage.removeItem(userTokenExpiryKey)
        
        console.log(`已从本地存储清除Token，用户: ${currentUser}`)
      } catch (error) {
        console.error('从本地存储移除Token失败:', error)
      }
    }
  }

  /**
   * 添加Token更新监听器
   * @param {Function} listener - 监听器函数
   */
  addTokenUpdateListener(listener) {
    this.refreshListeners.push(listener)
  }

  /**
   * 移除Token更新监听器
   * @param {Function} listener - 监听器函数
   */
  removeTokenUpdateListener(listener) {
    const index = this.refreshListeners.indexOf(listener)
    if (index !== -1) {
      this.refreshListeners.splice(index, 1)
    }
  }

  /**
   * 通知Token更新
   * @private
   */
  notifyTokenUpdate() {
    this.refreshListeners.forEach(listener => {
      try {
        listener({
          type: 'update',
          token: this.token,
          refreshToken: this.refreshToken,
          tokenExpiry: this.tokenExpiry
        })
      } catch (error) {
        console.error('Token更新监听器执行失败:', error)
      }
    })
  }

  /**
   * 通知Token清除
   * @private
   */
  notifyTokenClear() {
    this.refreshListeners.forEach(listener => {
      try {
        listener({
          type: 'clear'
        })
      } catch (error) {
        console.error('Token清除监听器执行失败:', error)
      }
    })
  }
}

// 创建全局Token管理器实例
const tokenManager = new JwtTokenManager()

export default tokenManager
export { JwtTokenManager }