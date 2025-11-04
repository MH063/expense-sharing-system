import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import websocketClient from '@/utils/websocket-client'
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

  const connect = () => {
    if (isConnected.value || isConnecting.value) {
      return
    }

    isConnecting.value = true
    const authStore = useAuthStore()

    try {
      // WebSocket连接事件处理
      websocketClient.on('connected', () => {
        isConnected.value = true
        isConnecting.value = false
        connectionAttempts.value = 0
        lastError.value = null
        isReconnecting.value = false
        
        // 重新订阅之前订阅的事件
        if (channels.value.size > 0) {
          websocketClient.subscribe([...channels.value])
        }
      })

      websocketClient.on('disconnected', () => {
        isConnected.value = false
        isConnecting.value = false
      })

      websocketClient.on('reconnecting', () => {
        isReconnecting.value = true
        isConnecting.value = false
      })

      websocketClient.on('reconnect_failed', () => {
        isReconnecting.value = false
        isConnecting.value = false
        lastError.value = new Error('WebSocket重连失败，已达到最大重试次数')
      })

      websocketClient.on('error', (error) => {
        lastError.value = error
        isConnecting.value = false
      })

      const handlePayload = (payload) => {
        addNotification({
          id: payload.data?.id,
          title: payload.data?.title || '系统通知',
          message: payload.data?.message,
          type: payload.data?.type || 'info',
          timestamp: payload.timestamp || new Date().toISOString(),
          read: false,
          payload
        })
      }

      const eventTypes = [
        'expense_created',
        'expense_updated',
        'bill_created',
        'payment_created',
        'review_status_updated',
        'dispute_processed',
        'notification',
        'payment_confirmed',
        'qr_code_uploaded',
        'payment_status_changed'
      ]

      eventTypes.forEach(eventType => {
        websocketClient.on(eventType, (data) => {
          handlePayload({ ...data, type: data.data?.type || eventType })
        })
      })

      // 使用认证令牌连接WebSocket
      websocketClient.connect(authStore.accessToken).catch(error => {
        console.error('WebSocket连接失败:', error)
        lastError.value = error
        connectionAttempts.value += 1
        isConnecting.value = false
      })
    } catch (error) {
      lastError.value = error
      connectionAttempts.value += 1
      isConnecting.value = false
    }
  }

  const disconnect = () => {
    websocketClient.disconnect()
    isConnected.value = false
    isReconnecting.value = false
  }

  const subscribeChannels = (newChannels) => {
    const normalizedChannels = Array.isArray(newChannels) ? newChannels : [newChannels]
    normalizedChannels.forEach(channel => channels.value.add(channel))
    if (isConnected.value) {
      websocketClient.subscribe(normalizedChannels)
    }
  }

  const unsubscribeChannels = (removedChannels) => {
    const normalizedChannels = Array.isArray(removedChannels) ? removedChannels : [removedChannels]
    normalizedChannels.forEach(channel => channels.value.delete(channel))
    if (isConnected.value) {
      websocketClient.unsubscribe(normalizedChannels)
    }
  }

  const retryConnection = () => {
    const authStore = useAuthStore()
    connectionAttempts.value = 0
    lastError.value = null
    isConnecting.value = true
    websocketClient.connect(authStore.accessToken).catch(error => {
      console.error('WebSocket重连失败:', error)
      lastError.value = error
      connectionAttempts.value += 1
      isConnecting.value = false
    })
  }

  const updateWebSocketConfig = (config = {}) => {
    websocketClient.updateConfig(config)
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
    updateWebSocketConfig
  }
})
