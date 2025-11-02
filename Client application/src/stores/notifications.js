import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import websocketClient from '@/utils/websocket-client'

const MAX_NOTIFICATIONS = 50

export const useNotificationStore = defineStore('notifications', () => {
  const isConnected = ref(false)
  const notifications = ref([])
  const channels = ref(new Set())
  const connectionAttempts = ref(0)
  const lastError = ref(null)

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

  const clearAll = () => {
    notifications.value = []
  }

  const connect = () => {
    if (isConnected.value) {
      return
    }

    try {
      websocketClient.on('connected', () => {
        isConnected.value = true
        connectionAttempts.value = 0
        lastError.value = null
        if (channels.value.size > 0) {
          websocketClient.subscribe([...channels.value])
        }
      })

      websocketClient.on('disconnected', () => {
        isConnected.value = false
      })

      websocketClient.on('error', (error) => {
        lastError.value = error
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

      websocketClient.connect()
    } catch (error) {
      lastError.value = error
      connectionAttempts.value += 1
    }
  }

  const disconnect = () => {
    websocketClient.disconnect()
    isConnected.value = false
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

  return {
    isConnected,
    notifications,
    orderedNotifications,
    unreadCount,
    lastError,
    connect,
    disconnect,
    addNotification,
    markAsRead,
    clearAll,
    subscribeChannels,
    unsubscribeChannels
  }
})
