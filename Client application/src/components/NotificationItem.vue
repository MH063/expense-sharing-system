<template>
  <div 
    class="notification-item" 
    :class="{ 'unread': !notification.read }"
    @click="handleClick"
  >
    <div class="notification-icon">
      <component :is="getNotificationIcon" />
    </div>
    
    <div class="notification-content">
      <div class="notification-title">{{ notification.title }}</div>
      <div class="notification-message">{{ notification.message }}</div>
      <div class="notification-time">{{ formatTime(notification.timestamp) }}</div>
    </div>
    
    <div class="notification-actions">
      <button 
        v-if="!notification.read" 
        @click.stop="markAsRead" 
        class="mark-read-btn"
        title="标记为已读"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      </button>
      
      <button 
        @click.stop="deleteNotification" 
        class="delete-btn"
        title="删除"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
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

// 定义组件属性
const props = defineProps({
  notification: {
    type: Object,
    required: true
  }
})

// 定义事件
const emit = defineEmits(['mark-as-read', 'delete-notification', 'notification-click'])

// 路由实例
const router = useRouter()

// 计算属性 - 根据通知类型获取对应的图标组件
const getNotificationIcon = computed(() => {
  const { type } = props.notification
  
  switch (type) {
    case 'expense_created':
      return ExpenseIcon
    case 'expense_updated':
      return UpdateIcon
    case 'expense_deleted':
      return DeleteIcon
    case 'payment_created':
      return PaymentIcon
    case 'payment_completed':
      return CompleteIcon
    case 'payment_failed':
      return ErrorIcon
    case 'dormitory_invitation':
      return InviteIcon
    case 'dormitory_joined':
      return JoinIcon
    case 'dormitory_left':
      return LeaveIcon
    case 'member_added':
      return MemberIcon
    default:
      return DefaultIcon
  }
})

// 方法
const formatTime = (timestamp) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  
  if (diffMins < 1) {
    return '刚刚'
  } else if (diffMins < 60) {
    return `${diffMins}分钟前`
  } else if (diffHours < 24) {
    return `${diffHours}小时前`
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
}

const markAsRead = () => {
  emit('mark-as-read', props.notification.id)
}

const deleteNotification = () => {
  emit('delete-notification', props.notification.id)
}

const handleClick = () => {
  // 如果通知有关联的URL，则导航到该页面
  if (props.notification.url) {
    router.push(props.notification.url)
  }
  
  // 如果通知未读，则标记为已读
  if (!props.notification.read) {
    markAsRead()
  }
  
  // 触发点击事件
  emit('notification-click', props.notification)
}
</script>



<style scoped>
.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.notification-item:hover {
  background-color: #f9f9f9;
}

.notification-item.unread {
  background-color: #f8f9ff;
  border-left: 3px solid #4a6cf7;
}

.notification-icon {
  flex-shrink: 0;
  margin-right: 12px;
  margin-top: 2px;
}

.notification-content {
  flex-grow: 1;
  min-width: 0;
}

.notification-title {
  font-weight: 600;
  font-size: 14px;
  color: #333;
  margin-bottom: 4px;
  line-height: 1.4;
}

.notification-message {
  font-size: 13px;
  color: #666;
  margin-bottom: 4px;
  line-height: 1.4;
  word-wrap: break-word;
}

.notification-time {
  font-size: 11px;
  color: #999;
}

.notification-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-left: 8px;
}

.mark-read-btn, .delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  transition: all 0.2s ease;
}

.mark-read-btn:hover {
  background-color: #e8f5e9;
  color: #2ed573;
}

.delete-btn:hover {
  background-color: #ffebee;
  color: #ff4757;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .notification-item {
    padding: 10px 12px;
  }
  
  .notification-title {
    font-size: 13px;
  }
  
  .notification-message {
    font-size: 12px;
  }
}
</style>