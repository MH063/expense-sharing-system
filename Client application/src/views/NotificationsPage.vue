<template>
  <div class="notifications-page">
    <div class="page-header">
      <h1>通知中心</h1>
      <p>查看和管理所有通知</p>
      
      <!-- 连接状态显示 -->
      <div class="connection-status">
        <div class="status-indicator" :class="connectionStatusClass">
          <span class="status-dot"></span>
          <span class="status-text">{{ connectionStatusText }}</span>
        </div>
        
        <!-- 错误信息显示 -->
        <div v-if="lastError" class="error-message">
          <div class="error-header">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>连接错误</span>
          </div>
          <div class="error-content">{{ lastError.message || '未知错误' }}</div>
        </div>
      </div>
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
      
      <!-- 连接配置按钮 -->
      <button 
        @click="toggleConfigPanel" 
        class="action-btn config-btn"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M12 1v6m0 6v6m4.22-13.22l4.24 4.24M1.54 9.96l4.24 4.24M12 23v-6m0-6V1m-4.22 13.22l-4.24-4.24M22.46 14.04l-4.24-4.24"></path>
        </svg>
        连接配置
      </button>
      
      <!-- 连接/断开连接按钮 -->
      <button 
        v-if="!isConnected && !isConnecting"
        @click="connect" 
        class="action-btn connect-btn"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
        </svg>
        连接通知服务
      </button>
      
      <button 
        v-if="isConnected"
        @click="disconnect" 
        class="action-btn disconnect-btn"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          <line x1="12" y1="3" x2="12" y2="21"></line>
        </svg>
        断开连接
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
    
    <!-- 连接配置面板 -->
    <div v-if="showConfigPanel" class="config-panel">
      <h3>连接配置</h3>
      <div class="config-form">
        <div class="form-group">
          <label for="serverUrl">WebSocket服务器地址</label>
          <input 
            id="serverUrl"
            v-model="serverUrl" 
            type="text" 
            placeholder="ws://localhost:4000"
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label for="reconnectInterval">重连间隔（毫秒）</label>
          <input 
            id="reconnectInterval"
            v-model.number="reconnectInterval" 
            type="number" 
            min="1000"
            step="1000"
            class="form-input"
          />
        </div>
        <div class="form-group">
          <label for="maxReconnectAttempts">最大重连次数</label>
          <input 
            id="maxReconnectAttempts"
            v-model.number="maxReconnectAttempts" 
            type="number" 
            min="1"
            max="10"
            class="form-input"
          />
        </div>
        <div class="form-actions">
          <button @click="saveConfig" class="btn btn-primary">保存配置</button>
          <button @click="resetConfig" class="btn btn-reset">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
            </svg>
            重置默认
          </button>
        </div>
      </div>
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
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useNotificationStore } from '@/stores/notifications'
import NotificationItem from '@/components/NotificationItem.vue'

// 路由和Store
const router = useRouter()
const notificationStore = useNotificationStore()

// 配置面板状态
const showConfigPanel = ref(false)
const serverUrl = ref('ws://localhost:4000')
const reconnectInterval = ref(5000)
const maxReconnectAttempts = ref(5)

// 计算属性
const notifications = computed(() => notificationStore.notifications)
const unreadCount = computed(() => notificationStore.unreadCount)
const isConnecting = computed(() => notificationStore.isConnecting)
const isReconnecting = computed(() => notificationStore.isReconnecting)
const isConnected = computed(() => notificationStore.isConnected)
const lastError = computed(() => notificationStore.lastError)

// 连接状态计算属性
const connectionStatusClass = computed(() => {
  if (isConnected.value) return 'connected'
  if (isReconnecting.value) return 'reconnecting'
  if (isConnecting.value) return 'connecting'
  return 'disconnected'
})

const connectionStatusText = computed(() => {
  if (isConnected.value) return '已连接'
  if (isReconnecting.value) return '正在重连...'
  if (isConnecting.value) return '正在连接...'
  return '未连接'
})

// 方法
const toggleConfigPanel = () => {
  showConfigPanel.value = !showConfigPanel.value
}

const saveConfig = () => {
  // 保存配置到本地存储
  localStorage.setItem('notificationServerUrl', serverUrl.value)
  localStorage.setItem('notificationReconnectInterval', reconnectInterval.value.toString())
  localStorage.setItem('notificationMaxReconnectAttempts', maxReconnectAttempts.value.toString())
  
  // 如果已连接，断开后重新连接以应用新配置
  if (isConnected.value) {
    notificationStore.disconnect()
    // 更新WebSocket客户端配置
    updateWebSocketConfig()
    // 重新连接
    notificationStore.connect()
  } else {
    // 只更新配置，不连接
    updateWebSocketConfig()
  }
  
  // 显示保存成功提示
  showConfigPanel.value = false
  alert('配置已保存')
}

const resetConfig = () => {
  // 添加确认对话框
  if (!confirm('确定要重置所有连接配置为默认值吗？这将清除您当前的设置。')) {
    return
  }
  
  // 保存当前连接状态
  const wasConnected = isConnected.value
  
  // 如果已连接，先断开连接
  if (wasConnected) {
    notificationStore.disconnect()
  }
  
  // 重置为默认值
  serverUrl.value = 'ws://localhost:4000'
  reconnectInterval.value = 5000
  maxReconnectAttempts.value = 5
  
  // 清除本地存储
  localStorage.removeItem('notificationServerUrl')
  localStorage.removeItem('notificationReconnectInterval')
  localStorage.removeItem('notificationMaxReconnectAttempts')
  
  // 更新WebSocket客户端配置
  updateWebSocketConfig()
  
  // 隐藏配置面板
  showConfigPanel.value = false
  
  // 如果之前已连接，询问是否重新连接
  if (wasConnected) {
    if (confirm('配置已重置为默认值。是否要重新连接到通知服务？')) {
      notificationStore.connect()
    }
  } else {
    alert('配置已重置为默认值')
  }
}

const updateWebSocketConfig = () => {
  // 更新WebSocket客户端配置
  notificationStore.updateWebSocketConfig({
    url: serverUrl.value,
    reconnectInterval: reconnectInterval.value,
    maxReconnectAttempts: maxReconnectAttempts.value
  })
}

// 组件挂载时加载配置
onMounted(() => {
  const savedServerUrl = localStorage.getItem('notificationServerUrl')
  const savedReconnectInterval = localStorage.getItem('notificationReconnectInterval')
  const savedMaxReconnectAttempts = localStorage.getItem('notificationMaxReconnectAttempts')
  
  if (savedServerUrl) serverUrl.value = savedServerUrl
  if (savedReconnectInterval) reconnectInterval.value = parseInt(savedReconnectInterval)
  if (savedMaxReconnectAttempts) maxReconnectAttempts.value = parseInt(savedMaxReconnectAttempts)
  
  // 更新WebSocket客户端配置
  updateWebSocketConfig()
})

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

const connect = () => {
  notificationStore.connect()
}

const disconnect = () => {
  notificationStore.disconnect()
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

.connection-status {
  margin-top: 1rem;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 2rem;
  font-size: 0.875rem;
  font-weight: 500;
  width: fit-content;
}

.error-message {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background-color: #ffebee;
  border-radius: 0.375rem;
  border-left: 4px solid #f44336;
  font-size: 0.875rem;
  max-width: 500px;
}

.error-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #c62828;
  margin-bottom: 0.25rem;
}

.error-content {
  color: #d32f2f;
  line-height: 1.4;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-indicator.connected {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.status-indicator.connected .status-dot {
  background-color: #4caf50;
}

.status-indicator.connecting {
  background-color: #e3f2fd;
  color: #1565c0;
}

.status-indicator.connecting .status-dot {
  background-color: #2196f3;
  animation: pulse 1.5s infinite;
}

.status-indicator.reconnecting {
  background-color: #fff8e1;
  color: #f57f17;
}

.status-indicator.reconnecting .status-dot {
  background-color: #ffc107;
  animation: pulse 1.5s infinite;
}

.status-indicator.disconnected {
  background-color: #ffebee;
  color: #c62828;
}

.status-indicator.disconnected .status-dot {
  background-color: #f44336;
}

@keyframes pulse {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
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

.connect-btn {
  background-color: #e8f5e9;
  border-color: #4caf50;
  color: #2e7d32;
}

.connect-btn:hover {
  background-color: #4caf50;
  color: white;
}

.disconnect-btn {
  background-color: #ffebee;
  border-color: #f44336;
  color: #c62828;
}

.disconnect-btn:hover {
  background-color: #f44336;
  color: white;
}

/* 配置面板样式 */
.config-panel {
  background-color: white;
  border-radius: 8px;
  padding: 20px;
  margin-top: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.config-panel h3 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 20px;
  color: #333;
}

.config-form {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: #555;
}

.form-input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.form-input:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.2);
}

.form-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.form-actions .btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-primary {
  background-color: #4CAF50;
  color: white;
}

.btn-primary:hover {
  background-color: #45a049;
}

.btn-secondary {
  background-color: #f44336;
  color: white;
}

.btn-secondary:hover {
  background-color: #d32f2f;
}

.btn-reset {
  background-color: #ff9800;
  color: white;
  border: 1px solid #f57c00;
}

.btn-reset:hover {
  background-color: #f57c00;
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