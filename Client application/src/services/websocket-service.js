/**
 * 全局WebSocket服务管理器
 * 负责在整个应用生命周期内维护WebSocket连接，确保页面切换时连接不中断
 */
class WebSocketService {
  constructor() {
    this.ws = null
    this.url = 'ws://localhost:4000'
    this.reconnectInterval = 5000
    this.maxReconnectAttempts = 5
    this.reconnectAttempts = 0
    this.listeners = new Map()
    this.isConnected = false
    this.isConnecting = false
    this.isManualClose = false
    this.heartbeatInterval = null
    this.heartbeatIntervalMs = 30000
    this.reconnectTimer = null
    this.authToken = null
    this.connectionPromise = null
    this.pendingMessages = []
    this.connectionTimeout = 10000
    this.subscribedEvents = new Set()
  }

  /**
   * 获取服务实例（单例模式）
   */
  static getInstance() {
    if (!this.instance) {
      this.instance = new WebSocketService()
    }
    return this.instance
  }

  /**
   * 添加事件监听器
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(callback)
  }

  /**
   * 移除事件监听器
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback)
    }
  }

  /**
   * 触发事件
   */
  emit(event, data) {
    console.log(`WebSocket服务触发事件: ${event}`, data)
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`事件处理器错误 (${event}):`, error)
        }
      })
    }
  }

  /**
   * 启动WebSocket连接
   */
  async connect(authToken = null) {
    // 如果已在连接中，返回现有Promise
    if (this.connectionPromise) {
      console.log('WebSocket连接正在进行中，等待结果...')
      return this.connectionPromise
    }

    // 如果已经连接，直接返回成功
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket已连接')
      return Promise.resolve()
    }

    // 如果正在连接中但没有Promise，则创建新的连接
    if (this.isConnecting) {
      console.log('WebSocket正在连接中，创建新的连接Promise')
      this.connectionPromise = new Promise((resolve, reject) => {
        const checkConnection = () => {
          if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
            resolve()
          } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(new Error('WebSocket连接失败'))
          } else {
            setTimeout(checkConnection, 100)
          }
        }
        checkConnection()
      })
      return this.connectionPromise
    }

    console.log('初始化WebSocket连接...')
    this.isManualClose = false
    this.authToken = authToken
    this.isConnecting = true
    this.reconnectAttempts = 0

    this.connectionPromise = new Promise((resolve, reject) => {
      try {
        // 设置连接超时
        const timeoutId = setTimeout(() => {
          this.ws = null
          this.connectionPromise = null
          this.isConnecting = false
          const error = new Error('WebSocket连接超时')
          console.error(error.message)
          this.emit('error', error)
          reject(error)
          this.handleReconnect()
        }, this.connectionTimeout)

        // 创建WebSocket连接
        this.ws = new WebSocket(this.url)

        this.ws.onopen = (event) => {
          clearTimeout(timeoutId)
          console.log('✅ WebSocket连接已建立')
          this.isConnected = true
          this.isConnecting = false
          this.reconnectAttempts = 0
          this.connectionPromise = null

          // 发送认证信息
          if (this.authToken) {
            this.send({
              type: 'auth',
              token: this.authToken
            })
          }

          // 重新订阅已订阅的事件
          if (this.subscribedEvents.size > 0) {
            console.log(`重新订阅 ${this.subscribedEvents.size} 个事件`)
            this.subscribe([...this.subscribedEvents])
          }

          // 发送待发送的消息
          this.flushPendingMessages()

          // 启动心跳机制
          this.startHeartbeat()

          // 触发连接成功事件
          this.emit('connected', event)
          resolve()
        }

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            console.log('📨 收到WebSocket消息:', data.type, data)
            this.handleMessage(data)
          } catch (error) {
            console.error('❌ 解析WebSocket消息失败:', error)
          }
        }

        this.ws.onclose = (event) => {
          clearTimeout(timeoutId)
          console.log('🔌 WebSocket连接已关闭:', event.code, event.reason)
          this.isConnected = false
          this.isConnecting = false
          this.connectionPromise = null

          // 停止心跳
          this.stopHeartbeat()

          // 如果不是手动关闭且不是正常关闭，则尝试重连
          if (!this.isManualClose && !event.wasClean && event.code !== 1000) {
            this.handleReconnect()
          }

          // 触发断开连接事件
          this.emit('disconnected', event)
        }

        this.ws.onerror = (error) => {
          clearTimeout(timeoutId)
          console.error('❌ WebSocket错误:', error)
          this.isConnecting = false
          this.connectionPromise = null
          this.emit('error', error)
          reject(error)
        }
      } catch (error) {
        console.error('❌ 创建WebSocket连接失败:', error)
        this.isConnecting = false
        this.connectionPromise = null
        this.emit('error', error)
        reject(error)
        this.handleReconnect()
      }
    })

    return this.connectionPromise
  }

  /**
   * 处理重连逻辑
   */
  handleReconnect() {
    // 清除之前的重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    // 如果已达到最大重连次数
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('❌ 达到最大重连次数，停止重连')
      this.emit('reconnect_failed', {
        attempts: this.reconnectAttempts,
        maxAttempts: this.maxReconnectAttempts
      })
      return
    }

    // 增加重连次数
    this.reconnectAttempts++
    const remainingAttempts = this.maxReconnectAttempts - this.reconnectAttempts

    console.log(`🔄 尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts}), 剩余 ${remainingAttempts} 次`)
    this.emit('reconnecting', {
      attempt: this.reconnectAttempts,
      maxAttempts: this.maxReconnectAttempts,
      remainingAttempts
    })

    // 设置重连定时器
    this.reconnectTimer = setTimeout(() => {
      this.connect(this.authToken)
    }, this.reconnectInterval)
  }

  /**
   * 手动断开连接
   */
  disconnect() {
    console.log('🔌 手动断开WebSocket连接')
    this.isManualClose = true

    // 清除重连定时器
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    // 停止心跳
    this.stopHeartbeat()

    // 关闭WebSocket连接
    if (this.ws) {
      this.ws.close(1000, '手动断开连接')
    }

    // 重置状态
    this.isConnected = false
    this.isConnecting = false
    this.connectionPromise = null
    this.reconnectAttempts = 0
  }

  /**
   * 更新认证令牌
   */
  updateAuthToken(token) {
    console.log('🔑 更新认证令牌')
    this.authToken = token
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      this.send({
        type: 'auth',
        token: this.authToken
      })
    }
  }

  /**
   * 刷新待发送的消息队列
   */
  flushPendingMessages() {
    if (this.pendingMessages.length > 0) {
      console.log(`📤 发送 ${this.pendingMessages.length} 条待发送消息`)
      const messages = [...this.pendingMessages]
      this.pendingMessages = []
      messages.forEach(message => {
        this.send(message)
      })
    }
  }

  /**
   * 启动心跳机制
   */
  startHeartbeat() {
    this.stopHeartbeat()
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
        this.send({ type: 'heartbeat', timestamp: Date.now() })
      }
    }, this.heartbeatIntervalMs)
    console.log('❤️ 启动心跳机制')
  }

  /**
   * 停止心跳机制
   */
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
      console.log('❤️ 停止心跳机制')
    }
  }

  /**
   * 处理接收到的消息
   */
  handleMessage(data) {
    const type = data.type

    // 心跳响应处理
    if (type === 'heartbeat_response') {
      console.log('💓 收到心跳响应:', data.timestamp)
      return
    }

    // 认证响应处理
    if (type === 'auth_response') {
      console.log('🔑 认证响应:', data.success ? '成功' : '失败')
      return
    }

    // 订阅响应处理
    if (type === 'subscription_response') {
      console.log('📡 订阅响应:', data.success ? '成功' : '失败', data.events)
      return
    }

    // 通知消息处理
    if (type === 'notification') {
      console.log('📢 收到通知消息:', data.notification)
      this.emit('notification', data.notification)
      return
    }

    // 其他消息类型
    this.emit('message', data)
  }

  /**
   * 发送消息
   */
  send(message) {
    if (this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message))
        console.log('📤 发送消息:', message.type, message)
      } catch (error) {
        console.error('❌ 发送消息失败:', error)
        this.pendingMessages.push(message)
      }
    } else {
      console.log('📋 添加到待发送队列:', message.type)
      this.pendingMessages.push(message)
    }
  }

  /**
   * 订阅事件
   */
  subscribe(events) {
    if (!Array.isArray(events)) {
      events = [events]
    }

    // 添加到已订阅列表
    events.forEach(event => {
      this.subscribedEvents.add(event)
    })

    console.log('📡 订阅事件:', events)
    this.send({
      type: 'subscribe',
      events: events
    })
  }

  /**
   * 取消订阅事件
   */
  unsubscribe(events) {
    if (!Array.isArray(events)) {
      events = [events]
    }

    // 从已订阅列表移除
    events.forEach(event => {
      this.subscribedEvents.delete(event)
    })

    console.log('📡 取消订阅事件:', events)
    this.send({
      type: 'unsubscribe',
      events: events
    })
  }

  /**
   * 更新配置
   */
  updateConfig(config = {}) {
    if (config.url) {
      this.url = config.url
      console.log('更新WebSocket URL:', this.url)
    }
    if (config.reconnectInterval) {
      this.reconnectInterval = config.reconnectInterval
      console.log('更新重连间隔:', this.reconnectInterval)
    }
    if (config.maxReconnectAttempts) {
      this.maxReconnectAttempts = config.maxReconnectAttempts
      console.log('更新最大重连次数:', this.maxReconnectAttempts)
    }
  }

  /**
   * 获取连接状态
   */
  getConnectionState() {
    return {
      isConnected: this.isConnected,
      isConnecting: this.isConnecting,
      isManualClose: this.isManualClose,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      subscribedEvents: [...this.subscribedEvents],
      pendingMessagesCount: this.pendingMessages.length
    }
  }

  /**
   * 重试连接
   */
  retryConnection() {
    console.log('🔄 重试WebSocket连接')
    this.reconnectAttempts = 0
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    return this.connect(this.authToken)
  }
}

// 导出单例实例
export default WebSocketService.getInstance()