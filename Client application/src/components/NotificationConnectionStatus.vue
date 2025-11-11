<template>
  <!-- 状态指示器 -->
  <div class="status-container">
    <button @click="toggleDetails" class="status-indicator" :class="statusClass">
      <svg v-if="statusIcon === 'connected'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
      <svg v-else-if="statusIcon === 'connecting'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
      </svg>
      <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
      </svg>
      <span v-if="unreadCount > 0" class="notification-badge">
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <!-- 通知列表面板 -->
    <div v-if="showDetails && showNotificationList" class="notification-list-panel">
      <div class="panel-header">
        <h4>通知中心</h4>
        <button @click="showNotificationList = false" class="close-btn">×</button>
      </div>
      
      <!-- 通知操作栏 -->
      <div class="notification-actions">
        <span class="actions-info">通知管理</span>
      </div>



      <!-- 通知列表 -->
      <div class="notification-items">
        <div v-if="notifications.length === 0" class="empty-notifications">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <p>暂无通知</p>
        </div>
        <div v-else v-for="notification in notifications" :key="notification.id" class="notification-item" :class="{ unread: !notification.read }">
          <div class="notification-content">
            <div class="notification-header">
              <h5>{{ notification.title }}</h5>
              <span class="notification-time">{{ formatTime(notification.createdAt) }}</span>
            </div>
            <p class="notification-message">{{ notification.message }}</p>
          </div>
          <div class="notification-actions-inline">
            <button @click="markAsRead(notification.id)" v-if="!notification.read" class="action-icon" title="标记为已读">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
            <button @click="deleteNotification(notification.id)" class="action-icon" title="删除">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <!-- 连接控制按钮 -->
      <div class="connection-controls">
        <button v-if="!isConnected && !isConnecting" @click="connect" class="btn btn-primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
          </svg>
          连接
        </button>
        <button v-if="isConnected" @click="disconnect" class="btn btn-secondary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            <line x1="12" y1="3" x2="12" y2="21"></line>
          </svg>
          断开
        </button>
        <button v-if="isReconnecting" @click="retryConnection" class="btn btn-warning">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10"></polyline>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
          </svg>
          重连
        </button>
      </div>
    </div>

    <!-- 详细信息面板（点击状态指示器显示） -->
    <div v-if="showDetails && !showNotificationList" class="status-details">
      <div class="details-header">
        <h4>连接状态</h4>
        <button @click="showDetails = false" class="close-btn">×</button>
      </div>
      <div class="details-content">
        <div class="detail-row">
          <span class="label">连接状态：</span>
          <span :class="statusClass">{{ statusText }}</span>
        </div>
        <div class="detail-row">
          <span class="label">服务器地址：</span>
          <span>{{ config.serverUrl }}</span>
        </div>
        <div class="detail-row">
          <span class="label">连接时长：</span>
          <span>{{ connectionDuration }}</span>
        </div>
        <div class="detail-row" v-if="lastError">
          <span class="label">最后错误：</span>
          <span class="error-text">{{ lastError }}</span>
        </div>
        <div class="detail-row">
          <span class="label">未读通知：</span>
          <span>{{ unreadCount }}</span>
        </div>
        <div class="detail-actions">
          <button @click="toggleConnection" class="btn btn-sm btn-primary" :disabled="isConnecting">
            <svg v-if="isConnected" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
            <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 2L11 13"></path>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
            {{ isConnected ? '断开连接' : '连接WebSocket' }}
          </button>
          <div class="secondary-actions">
            <button @click="testConnection" class="btn btn-sm btn-secondary" :disabled="isConnecting">
              测试连接
            </button>
            <button @click="showConfigModal = true" class="btn btn-sm btn-info" title="配置">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 1v6m0 6v6m4.22-13.22l4.24 4.24M1.54 9.96l4.24 4.24M12 23v-6m0-6V1m-4.22 13.22l-4.24-4.24M22.46 14.04l-4.24-4.24"></path>
              </svg>
            </button>
            <button @click="showMarkAllReadModal = true" class="btn btn-sm btn-success" :disabled="unreadCount === 0" title="全部已读">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
            <button @click="showClearAllModal = true" class="btn btn-sm btn-danger" :disabled="notifications.length === 0" title="清空">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 配置弹窗 -->
    <ConfigModal 
      :show="showConfigModal" 
      :config="config"
      @close="showConfigModal = false"
      @save="handleConfigSave"
      @reset="handleConfigReset"
    />

    <!-- 全部已读弹窗 -->
    <MarkAllReadModal 
      :show="showMarkAllReadModal"
      :unread-count="unreadCount"
      @close="showMarkAllReadModal = false"
      @confirm="handleMarkAllRead"
    />

    <!-- 清空弹窗 -->
    <ClearAllModal 
      :show="showClearAllModal"
      :notification-count="notifications.length"
      @close="showClearAllModal = false"
      @confirm="handleClearAll"
    />
  </div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useNotificationStore } from '@/stores/notifications'
import { useRouter } from 'vue-router'
import ConfigModal from './ConfigModal.vue'
import MarkAllReadModal from './MarkAllReadModal.vue'
import ClearAllModal from './ClearAllModal.vue'

// Store和路由器
const notificationStore = useNotificationStore()
const router = useRouter()

// 显示状态
const showDetails = ref(false)
const showConfigModal = ref(false)
const showMarkAllReadModal = ref(false)
const showClearAllModal = ref(false)

// 配置状态
const config = ref({
  serverUrl: 'ws://localhost:4000',
  reconnectInterval: 5000,
  maxReconnectAttempts: 5
})

// 连接时长计算
const connectionStartTime = ref(null)

// 通知Store数据
const notifications = computed(() => notificationStore.notifications)
const unreadCount = computed(() => notificationStore.unreadCount)
const isConnecting = computed(() => notificationStore.isConnecting)
const isReconnecting = computed(() => notificationStore.isReconnecting)
const isConnected = computed(() => notificationStore.isConnected)
const lastError = computed(() => notificationStore.lastError?.message || notificationStore.lastError)

// 计算属性
const statusClass = computed(() => {
  if (isConnected.value) return 'connected'
  if (isReconnecting.value) return 'reconnecting'
  if (isConnecting.value) return 'connecting'
  return 'disconnected'
})

const statusText = computed(() => {
  if (isConnected.value) return '已连接'
  if (isReconnecting.value) return '正在重连...'
  if (isConnecting.value) return '正在连接...'
  return '未连接'
})

const statusIcon = computed(() => {
  if (isConnected.value) return 'connected'
  if (isReconnecting.value || isConnecting.value) return 'connecting'
  return 'disconnected'
})

const connectionDuration = computed(() => {
  if (!connectionStartTime.value || !isConnected.value) return '--'
  
  const now = Date.now()
  const duration = Math.floor((now - connectionStartTime.value) / 1000)
  
  if (duration < 60) return `${duration}秒`
  if (duration < 3600) return `${Math.floor(duration / 60)}分钟`
  return `${Math.floor(duration / 3600)}小时${Math.floor((duration % 3600) / 60)}分钟`
})

// 方法
const toggleDetails = () => {
  showDetails.value = !showDetails.value
}

const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return date.toLocaleDateString('zh-CN')
}

const markAsRead = (id) => {
  notificationStore.markAsRead(id)
}

// 弹窗处理方法
const handleMarkAllRead = () => {
  notificationStore.markAllAsRead()
  console.log('所有通知已标记为已读')
}

const handleClearAll = () => {
  notificationStore.clearAll()
  console.log('所有通知已清空')
}

const handleConfigSave = (newConfig) => {
  // 保存配置到本地存储
  localStorage.setItem('notificationServerUrl', newConfig.serverUrl)
  localStorage.setItem('notificationReconnectInterval', newConfig.reconnectInterval.toString())
  localStorage.setItem('notificationMaxReconnectAttempts', newConfig.maxReconnectAttempts.toString())
  
  // 更新配置状态
  config.value = { ...newConfig }
  
  // 更新WebSocket配置
  notificationStore.updateWebSocketConfig({
    url: newConfig.serverUrl,
    reconnectInterval: newConfig.reconnectInterval,
    maxReconnectAttempts: newConfig.maxReconnectAttempts
  })
  
  console.log('配置已保存:', newConfig)
}

const handleConfigReset = () => {
  const defaultConfig = {
    serverUrl: 'ws://localhost:4000',
    reconnectInterval: 5000,
    maxReconnectAttempts: 5
  }
  
  // 更新本地配置状态
  config.value = { ...defaultConfig }
  
  // 清除本地存储
  localStorage.removeItem('notificationServerUrl')
  localStorage.removeItem('notificationReconnectInterval')
  localStorage.removeItem('notificationMaxReconnectAttempts')
  
  // 更新WebSocket配置
  notificationStore.updateWebSocketConfig(defaultConfig)
  
  console.log('配置已重置为默认值')
}

const deleteNotification = (id) => {
  notificationStore.removeNotification(id)
}



const testConnection = () => {
  if (isConnected.value) {
    alert('连接正常')
  } else {
    connect()
  }
}

const toggleConnection = () => {
  if (isConnected.value) {
    disconnect()
  } else {
    connect()
  }
}

const connect = async () => {
  try {
    await notificationStore.connect()
    connectionStartTime.value = Date.now()
  } catch (error) {
    console.error('连接失败:', error)
  }
}

const disconnect = () => {
  notificationStore.disconnect()
  connectionStartTime.value = null
}

const retryConnection = () => {
  notificationStore.retryConnection()
}

// 组件挂载时加载配置
onMounted(() => {
  const savedServerUrl = localStorage.getItem('notificationServerUrl')
  const savedReconnectInterval = localStorage.getItem('notificationReconnectInterval')
  const savedMaxReconnectAttempts = localStorage.getItem('notificationMaxReconnectAttempts')
  
  if (savedServerUrl) config.value.serverUrl = savedServerUrl
  if (savedReconnectInterval) config.value.reconnectInterval = parseInt(savedReconnectInterval)
  if (savedMaxReconnectAttempts) config.value.maxReconnectAttempts = parseInt(savedMaxReconnectAttempts)
  
  // 更新WebSocket配置
  notificationStore.updateWebSocketConfig(config.value)
})

// 监听连接状态变化
watch(isConnected, (newVal) => {
  if (newVal && !connectionStartTime.value) {
    connectionStartTime.value = Date.now()
  } else if (!newVal) {
    connectionStartTime.value = null
  }
})
</script>

<style scoped>
/* 为导航栏优化的样式 - 紧凑布局 */
.notification-connection-status {
  position: relative;
  z-index: 999;
  display: inline-block;
}

/* 导航栏内的状态指示器 - 紧凑布局 */
.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 1rem;
  padding: 0.375rem 0.75rem;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(8px);
  transition: all 0.2s ease;
  min-width: 70px;
  justify-content: center;
  font-size: 0.75rem;
  height: 28px;
}

.status-indicator:hover {
  background: rgba(255, 255, 255, 1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.status-indicator.connected {
  border-color: rgba(16, 185, 129, 0.3);
}

.status-indicator.connected:hover {
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
}

.status-indicator.connecting,
.status-indicator.reconnecting {
  border-color: rgba(245, 158, 11, 0.3);
}

.status-indicator.disconnected {
  border-color: rgba(239, 68, 68, 0.3);
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #d1d5db;
  flex-shrink: 0;
}

.status-indicator.connected .status-dot {
  background-color: #10b981;
  animation: pulse 2s infinite;
}

.status-indicator.connecting .status-dot,
.status-indicator.reconnecting .status-dot {
  background-color: #f59e0b;
  animation: pulse 1s infinite;
}

.status-indicator.disconnected .status-dot {
  background-color: #ef4444;
}

.status-text {
  font-size: 0.7rem;
  font-weight: 500;
  color: #4b5563;
  white-space: nowrap;
  line-height: 1;
}

.status-indicator.connected .status-text {
  color: #10b981;
}

.status-indicator.connecting .status-text,
.status-indicator.reconnecting .status-text {
  color: #f59e0b;
}

.status-indicator.disconnected .status-text {
  color: #ef4444;
}

.status-icon {
  margin-left: 0.125rem;
}

.retry-btn,
.disconnect-btn {
  background: none;
  border: none;
  font-size: 0.75rem;
  cursor: pointer;
  color: #64748b;
  padding: 0;
  width: 0.875rem;
  height: 0.875rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.125rem;
  transition: all 0.2s ease;
}

.retry-btn:hover,
.disconnect-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: #374151;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 详细信息面板 - 固定定位以显示在导航栏上方 */
.status-details {
  position: fixed;
  top: 70px;
  right: 20px;
  width: 320px;
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(0, 0, 0, 0.1);
  overflow: hidden;
  z-index: 10000;
}

.details-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.details-header h4 {
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  color: #64748b;
  padding: 0;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: #374151;
}

.details-content {
  padding: 1rem;
}

.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  font-size: 0.875rem;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.label {
  color: #6b7280;
  font-weight: 500;
}

.detail-row span:last-child {
  color: #1f2937;
  text-align: right;
}

.detail-row .connected {
  color: #10b981;
  font-weight: 600;
}

.detail-row .connecting,
.detail-row .reconnecting {
  color: #f59e0b;
  font-weight: 600;
}

.detail-row .disconnected {
  color: #ef4444;
  font-weight: 600;
}

.detail-row .error-text {
  color: #ef4444;
  font-weight: 500;
  max-width: 200px;
  word-break: break-all;
}

.detail-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
  align-items: center;
}

.secondary-actions {
  display: flex;
  gap: 0.375rem;
  margin-left: auto;
}

.btn-sm {
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  border-radius: 0.375rem;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: auto;
}

.btn-sm svg {
  flex-shrink: 0;
}

/* 主要按钮样式 */
.btn-secondary {
  background-color: #f1f5f9;
  color: #475569;
  padding: 0.5rem 0.75rem;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #e2e8f0;
  color: #334155;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
}

/* 次要操作按钮样式 - 更紧凑 */
.btn-info {
  background-color: #06b6d4;
  color: white;
  padding: 0.5rem;
  width: 2rem;
  height: 2rem;
}

.btn-info:hover:not(:disabled) {
  background-color: #0891b2;
}

.btn-info:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-success {
  background-color: #10b981;
  color: white;
  padding: 0.5rem;
  width: 2rem;
  height: 2rem;
}

.btn-success:hover:not(:disabled) {
  background-color: #059669;
}

.btn-success:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  background-color: #ef4444;
  color: white;
  padding: 0.5rem;
  width: 2rem;
  height: 2rem;
}

.btn-danger:hover:not(:disabled) {
  background-color: #dc2626;
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 通知操作栏样式 */
.notification-actions {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #e2e8f0;
}

.actions-info {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
}
</style>