<template>
  <div class="notifications-page">
    <div class="page-header">
      <h1>通知中心</h1>
      <p>查看和管理所有通知</p>
    </div>
    
    <div class="notifications-actions">
      <button 
        @click="markAllAsRead" 
        class="action-btn mark-all-btn"
        :disabled="unreadCount === 0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        全部标记为已读
      </button>
      
      <button 
        @click="clearAll" 
        class="action-btn clear-all-btn"
        :disabled="notifications.length === 0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
        清空所有通知
      </button>
      
      <button 
        v-if="isReconnecting"
        @click="retryConnection" 
        class="action-btn retry-btn"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="23 4 23 10 17 10"></polyline>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
        重新连接
      </button>
    </div>
    
    <!-- 加载状态 -->
    <div v-if="isConnecting" class="loading-container">
      <div class="loading-spinner"></div>
      <p>正在连接通知服务...</p>
    </div>
    
    <!-- 重连状态 -->
    <div v-else-if="isReconnecting" class="loading-container">
      <div class="loading-spinner"></div>
      <p>正在重新连接通知服务...</p>
      <p class="loading-hint">连接可能已断开，请稍候或尝试重新连接</p>
    </div>
    
    <!-- 通知列表 -->
    <div v-else-if="notifications.length > 0" class="notifications-list">
      <div class="list-header">
        <span class="total-count">共 {{ notifications.length }} 条通知</span>
        <span v-if="unreadCount > 0" class="unread-count">{{ unreadCount }} 条未读</span>
      </div>
      
      <div class="notification-items">
        <NotificationItem
          v-for="notification in notifications"
          :key="notification.id"
          :notification="notification"
          @mark-as-read="markAsRead(notification.id)"
          @delete-notification="deleteNotification(notification.id)"
          @notification-click="handleNotificationClick"
        />
      </div>
    </div>
    
    <!-- 空状态 -->
    <div v-else class="empty-container">
      <div class="empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
      </div>
      <h2>暂无通知</h2>
      <p>您目前没有任何通知消息</p>
      <button v-if="!isConnected" @click="retryConnection" class="btn btn-primary">
        连接通知服务
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notifications'
import NotificationItem from '@/components/NotificationItem.vue'

// 路由和Store
const router = useRouter()
const notificationStore = useNotificationStore()

// 计算属性
const notifications = computed(() => notificationStore.notifications)
const unreadCount = computed(() => notificationStore.unreadCount)
const isConnecting = computed(() => notificationStore.isConnecting)
const isReconnecting = computed(() => notificationStore.isReconnecting)
const isConnected = computed(() => notificationStore.isConnected)

// 方法
const markAllAsRead = () => {
  notificationStore.markAllAsRead()
}

const clearAll = () => {
  if (confirm('确定要清空所有通知吗？此操作不可恢复。')) {
    notificationStore.clearNotifications()
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

const handleNotificationClick = (notification) => {
  // 如果通知有关联的URL，则导航到该页面
  if (notification.url) {
    router.push(notification.url)
  }
}
</script>

<style scoped>
.notifications-page {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: #333;
}

.page-header p {
  color: #666;
  font-size: 1rem;
}

.notifications-actions {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  border-radius: 0.375rem;
  background-color: white;
  color: #333;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover:not(:disabled) {
  background-color: #f5f5f5;
  border-color: #ccc;
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mark-all-btn:hover:not(:disabled) {
  background-color: #e8f5e9;
  border-color: #2ed573;
  color: #2ed573;
}

.clear-all-btn:hover:not(:disabled) {
  background-color: #ffebee;
  border-color: #ff4757;
  color: #ff4757;
}

.retry-btn {
  background-color: #fff3cd;
  border-color: #ffc107;
  color: #856404;
}

.retry-btn:hover {
  background-color: #ffc107;
  color: #fff;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1rem;
  text-align: center;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #eee;
  border-top: 3px solid #4a6cf7;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.loading-hint {
  color: #666;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.notifications-list {
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #eee;
  background-color: #f8f9fa;
}

.total-count {
  font-weight: 600;
  color: #333;
}

.unread-count {
  background-color: #4a6cf7;
  color: white;
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
  border-radius: 1rem;
}

.notification-items {
  max-height: 600px;
  overflow-y: auto;
}

.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 1rem;
  text-align: center;
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.empty-icon {
  margin-bottom: 1.5rem;
  color: #ccc;
}

.empty-container h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #333;
}

.empty-container p {
  color: #666;
  margin-bottom: 1.5rem;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.375rem;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-block;
  text-align: center;
}

.btn-primary {
  background-color: #4a6cf7;
  color: white;
}

.btn-primary:hover {
  background-color: #3a5bd9;
  transform: translateY(-1px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header h1 {
    font-size: 1.75rem;
  }
  
  .notifications-actions {
    gap: 0.75rem;
  }
  
  .action-btn {
    padding: 0.6rem 0.8rem;
    font-size: 0.85rem;
  }
  
  .list-header {
    padding: 0.75rem 1rem;
  }
}

@media (max-width: 576px) {
  .notifications-actions {
    flex-direction: column;
  }
  
  .action-btn {
    justify-content: center;
  }
  
  .empty-container {
    padding: 3rem 1rem;
  }
}
</style>