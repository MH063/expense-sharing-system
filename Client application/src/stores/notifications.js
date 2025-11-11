import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import websocketService from '@/services/websocket-service'
import { useAuthStore } from '@/stores/auth'

const MAX_NOTIFICATIONS = 50

export const useNotificationStore = defineStore('notifications', () => {
  const isConnected = ref(false)
  const notifications = ref([])
  const channels = ref(new Set())
  const connectionAttempts = ref(0)
  const lastError = ref(null)
  const isReconnecting = ref(false)
  const isConnecting = ref(false)

  const orderedNotifications = computed(() => notifications.value)
  const unreadCount = computed(() => orderedNotifications.value.filter(item => !item.read).length)

  const addNotification = (notification) => {
    const id = notification.id || `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    const timestamp = notification.timestamp || new Date().toISOString()

    notifications.value.unshift({
      ...notification,
      id,
      timestamp,
      read: Boolean(notification.read)
    })

    if (notifications.value.length > MAX_NOTIFICATIONS) {
      notifications.value = notifications.value.slice(0, MAX_NOTIFICATIONS)
    }
  }

  const markAsRead = (notificationId) => {
    notifications.value = notifications.value.map(item => {
      if (item.id === notificationId) {
        return { ...item, read: true }
      }
      return item
    })
  }

  const markAllAsRead = () => {
    notifications.value = notifications.value.map(item => ({ ...item, read: true }))
  }

  const clearAll = () => {
    notifications.value = []
  }

  const removeNotification = (notificationId) => {
    notifications.value = notifications.value.filter(item => item.id !== notificationId)
  }

  const connect = async () => {
    if (isConnected.value || isConnecting.value) {
      console.log('通知Store: 连接已在进行中或已连接')
      return
    }

    console.log('通知Store: 初始化WebSocket连接')
    isConnecting.value = true
    const authStore = useAuthStore()

    try {
      // 设置全局WebSocket连接事件处理
      websocketService.on('connected', () => {
        console.log('✅ 通知Store: WebSocket连接成功')
        isConnected.value = true
        isConnecting.value = false
        connectionAttempts.value = 0
        lastError.value = null
        isReconnecting.value = false
        
        // 重新订阅之前订阅的事件
        if (channels.value.size > 0) {
          console.log(`📡 通知Store: 重新订阅 ${channels.value.size} 个事件`)
          websocketService.subscribe([...channels.value])
        }
      })

      websocketService.on('disconnected', () => {
        console.log('🔌 通知Store: WebSocket连接断开')
        isConnected.value = false
        isConnecting.value = false
      })

      websocketService.on('reconnecting', (data) => {
        console.log('🔄 通知Store: 正在重连', data)
        isReconnecting.value = true
        isConnecting.value = false
      })

      websocketService.on('reconnect_failed', (data) => {
        console.log('❌ 通知Store: 重连失败', data)
        isReconnecting.value = false
        isConnecting.value = false
        lastError.value = new Error(`WebSocket重连失败，已达到最大重试次数 (${data.maxAttempts}次)`)
      })

      websocketService.on('error', (error) => {
        console.error('❌ 通知Store: WebSocket错误', error)
        lastError.value = error
        isConnecting.value = false
      })

      // 监听通知消息
      websocketService.on('notification', (notification) => {
        console.log('📢 通知Store: 收到通知消息', notification)
        addNotification({
          id: notification.id || `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
          title: notification.title || '系统通知',
          message: notification.message,
          type: notification.type || 'info',
          timestamp: notification.timestamp || new Date().toISOString(),
          read: false,
          data: notification.data,
          url: notification.url
        })
      })

      // 订阅常见的事件类型
      const eventTypes = [
        'expense_created',
        'expense_updated', 
        'expense_deleted',
        'bill_created',
        'bill_updated',
        'payment_created',
        'payment_completed',
        'payment_failed',
        'review_status_updated',
        'dispute_processed',
        'dormitory_invitation',
        'dormitory_joined',
        'dormitory_left',
        'member_added',
        'payment_confirmed',
        'qr_code_uploaded',
        'payment_status_changed'
      ]

      // 订阅所有事件类型
      console.log('📡 通知Store: 订阅事件类型', eventTypes)
      websocketService.subscribe(eventTypes)

      // 使用认证令牌连接全局WebSocket服务
      await websocketService.connect(authStore.accessToken)
      console.log('✅ 通知Store: WebSocket连接初始化完成')
    } catch (error) {
      console.error('❌ 通知Store: WebSocket连接失败', error)
      lastError.value = error
      connectionAttempts.value += 1
      isConnecting.value = false
      isReconnecting.value = false
    }
  }

  const disconnect = () => {
    console.log('🔌 通知Store: 手动断开WebSocket连接')
    websocketService.disconnect()
    isConnected.value = false
    isReconnecting.value = false
    isConnecting.value = false
  }

  const subscribeChannels = (newChannels) => {
    const normalizedChannels = Array.isArray(newChannels) ? newChannels : [newChannels]
    console.log('📡 通知Store: 订阅频道', normalizedChannels)
    
    normalizedChannels.forEach(channel => channels.value.add(channel))
    
    if (isConnected.value) {
      websocketService.subscribe(normalizedChannels)
    }
  }

  const unsubscribeChannels = (removedChannels) => {
    const normalizedChannels = Array.isArray(removedChannels) ? removedChannels : [removedChannels]
    console.log('📡 通知Store: 取消订阅频道', normalizedChannels)
    
    normalizedChannels.forEach(channel => channels.value.delete(channel))
    
    if (isConnected.value) {
      websocketService.unsubscribe(normalizedChannels)
    }
  }

  const retryConnection = async () => {
    console.log('🔄 通知Store: 重试WebSocket连接')
    const authStore = useAuthStore()
    connectionAttempts.value = 0
    lastError.value = null
    isConnecting.value = true
    
    try {
      await websocketService.retryConnection()
      console.log('✅ 通知Store: 重连成功')
    } catch (error) {
      console.error('❌ 通知Store: 重连失败', error)
      lastError.value = error
      connectionAttempts.value += 1
      isConnecting.value = false
      isReconnecting.value = false
    }
  }

  const updateWebSocketConfig = (config = {}) => {
    console.log('⚙️ 通知Store: 更新WebSocket配置', config)
    websocketService.updateConfig(config)
  }

  /**
   * 初始化通知Store（应用启动时自动调用）
   */
  const initialize = async () => {
    console.log('🚀 通知Store: 初始化通知服务')
    try {
      await connect()
      console.log('✅ 通知Store: 初始化完成')
    } catch (error) {
      console.error('❌ 通知Store: 初始化失败', error)
    }
  }

  return {
    isConnected,
    isConnecting,
    notifications,
    orderedNotifications,
    unreadCount,
    lastError,
    isReconnecting,
    connect,
    disconnect,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
    removeNotification,
    subscribeChannels,
    unsubscribeChannels,
    retryConnection,
    updateWebSocketConfig,
    initialize
  }
})
