<template>
  <div class="notification-container">
    <!-- 通知按钮 -->
    <button 
      class="notification-button" 
      @click="toggleNotifications"
      :class="{ 'has-notifications': unreadCount > 0 }"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
      <span v-if="unreadCount > 0" class="notification-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </button>
    
    <!-- 通知面板 -->
    <div v-if="showNotifications" class="notification-panel">
      <div class="notification-header">
        <h3>通知</h3>
        <div class="notification-actions">
          <button @click="markAllAsRead" class="mark-all-read-btn" v-if="unreadCount > 0">
            全部标记为已读
          </button>
          <button @click="clearAll" class="clear-all-btn">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            清空
          </button>
        </div>
      </div>
      
      <div class="notification-content">
        <!-- 加载状态 -->
        <div v-if="isConnecting" class="notification-loading">
          <div class="loading-spinner"></div>
          <p>连接中...</p>
        </div>
        
        <!-- 重连状态 -->
        <div v-else-if="isReconnecting" class="notification-reconnecting">
          <div class="loading-spinner"></div>
          <p>重新连接中...</p>
          <button @click="retryConnection" class="retry-btn">重试</button>
        </div>
        
        <!-- 通知列表 -->
        <div v-else-if="notifications.length > 0" class="notification-list">
          <NotificationItem
            v-for="notification in notifications"
            :key="notification.id"
            :notification="notification"
            @mark-as-read="markAsRead(notification.id)"
            @delete-notification="deleteNotification(notification.id)"
          />
        </div>
        
        <!-- 空状态 -->
        <div v-else class="notification-empty">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <p>暂无通知</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useNotificationStore } from '@/stores/notifications'
import { useAuthStore } from '@/stores/auth'
import NotificationItem from './NotificationItem.vue'
import {
  ExpenseIcon,
  UpdateIcon,
  DeleteIcon,
  PaymentIcon,
  CompleteIcon,
  ErrorIcon,
  InviteIcon,
  JoinIcon,
  LeaveIcon,
  MemberIcon,
  DefaultIcon
} from './NotificationIcons.js'

// 响应式数据
const showNotifications = ref(false)
const notificationStore = useNotificationStore()
const authStore = useAuthStore()

// 计算属性
const notifications = computed(() => notificationStore.notifications)
const unreadCount = computed(() => notificationStore.unreadCount)
const isConnecting = computed(() => notificationStore.isConnecting)
const isReconnecting = computed(() => notificationStore.isReconnecting)

// 方法
const toggleNotifications = () => {
  showNotifications.value = !showNotifications.value
}

const markAllAsRead = () => {
  notificationStore.markAllAsRead()
}

const clearAll = () => {
  if (confirm('确定要清空所有通知吗？')) {
    notificationStore.clearAll()
  }
}

const markAsRead = (id) => {
  notificationStore.markAsRead(id)
}

const deleteNotification = (id) => {
  notificationStore.removeNotification(id)
}

const retryConnection = () => {
  notificationStore.retryConnection()
}

// 点击外部关闭通知面板
const handleClickOutside = (event) => {
  if (showNotifications.value && !event.target.closest('.notification-container')) {
    showNotifications.value = false
  }
}

// 生命周期
onMounted(() => {
  // 如果用户已认证，连接WebSocket
  if (authStore.isAuthenticated) {
    notificationStore.connect()
  }
  
  // 添加点击外部关闭事件监听
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  // 移除事件监听
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.notification-container {
  position: relative;
  display: inline-block;
}

.notification-button {
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: all 0.2s ease;
}

.notification-button:hover {
  background-color: #f5f5f5;
  color: #333;
}

.notification-button.has-notifications {
  color: #4a6cf7;
}

.notification-badge {
  position: absolute;
  top: 0;
  right: 0;
  background-color: #ff4757;
  color: white;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 5px;
  border-radius: 10px;
  min-width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(25%, -25%);
}

.notification-panel {
  position: absolute;
  top: 100%;
  right: 0;
  width: 360px;
  max-height: 480px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
  margin-top: 8px;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.notification-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.notification-actions {
  display: flex;
  gap: 8px;
}

.mark-all-read-btn, .clear-all-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
}

.mark-all-read-btn:hover, .clear-all-btn:hover {
  background-color: #f5f5f5;
  color: #333;
}

.clear-all-btn {
  color: #ff4757;
}

.clear-all-btn:hover {
  background-color: #ffe0e3;
  color: #ff3838;
}

.notification-content {
  max-height: 400px;
  overflow-y: auto;
}

.notification-loading, .notification-reconnecting {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  color: #666;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #eee;
  border-top: 2px solid #4a6cf7;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.retry-btn {
  margin-top: 12px;
  background-color: #4a6cf7;
  color: white;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.retry-btn:hover {
  background-color: #3a5bd9;
}

.notification-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  color: #999;
}

.notification-empty svg {
  margin-bottom: 12px;
  opacity: 0.5;
}

.notification-empty p {
  margin: 0;
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .notification-panel {
    width: 300px;
  }
}

@media (max-width: 480px) {
  .notification-panel {
    width: 280px;
    right: -20px;
  }
}
</style>