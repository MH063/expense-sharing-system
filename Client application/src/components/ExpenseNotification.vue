<template>
  <div class="expense-notification">
    <div class="notification-header">
      <h3>实时通知</h3>
      <div class="connection-status" :class="{ connected: isConnected, disconnected: !isConnected }">
        {{ isConnected ? '已连接' : '未连接' }}
      </div>
    </div>
    
    <div class="notifications-list">
      <div 
        v-for="notification in notifications" 
        :key="notification.id"
        class="notification-item"
        :class="notification.type"
      >
        <div class="notification-content">
          <div class="notification-title">{{ notification.title }}</div>
          <div class="notification-message">{{ notification.message }}</div>
          <div class="notification-time">{{ formatTime(notification.timestamp) }}</div>
        </div>
      </div>
    </div>
    
    <div v-if="notifications.length === 0" class="no-notifications">
      暂无通知
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import websocketClient from '@/utils/websocket-client';

// 响应式数据
const isConnected = ref(false);
const notifications = ref([]);
const maxNotifications = 50; // 最大通知数量

// 方法
const addNotification = (notification) => {
  // 添加ID如果不存在
  if (!notification.id) {
    notification.id = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }
  
  // 添加到通知列表开头
  notifications.value.unshift(notification);
  
  // 限制通知数量
  if (notifications.value.length > maxNotifications) {
    notifications.value = notifications.value.slice(0, maxNotifications);
  }
};

const removeNotification = (id) => {
  notifications.value = notifications.value.filter(notification => notification.id !== id);
};

const formatTime = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

// 初始化WebSocket连接
const initWebSocket = () => {
  // 监听连接状态
  websocketClient.on('connected', () => {
    isConnected.value = true;
    console.log('WebSocket已连接');
    
    // 订阅费用相关事件
    websocketClient.subscribe(['expenses', 'bills', 'payments', 'reviews', 'disputes']);
  });
  
  websocketClient.on('disconnected', () => {
    isConnected.value = false;
    console.log('WebSocket已断开');
  });
  
  websocketClient.on('error', (error) => {
    console.error('WebSocket错误:', error);
  });
  
  // 监听费用创建事件
  websocketClient.on('expense_created', (data) => {
    addNotification({
      id: Date.now() + '_expense_created',
      type: 'info',
      title: '新费用记录',
      message: `创建了新的费用记录: ${data.data.description} (¥${data.data.amount})`,
      timestamp: data.timestamp
    });
  });
  
  // 监听费用更新事件
  websocketClient.on('expense_updated', (data) => {
    addNotification({
      id: Date.now() + '_expense_updated',
      type: 'info',
      title: '费用记录更新',
      message: `费用记录已更新: ${data.data.description}`,
      timestamp: data.timestamp
    });
  });
  
  // 监听账单创建事件
  websocketClient.on('bill_created', (data) => {
    addNotification({
      id: Date.now() + '_bill_created',
      type: 'success',
      title: '新账单',
      message: `创建了新的账单: ${data.data.title} (¥${data.data.total_amount})`,
      timestamp: data.timestamp
    });
  });
  
  // 监听支付记录创建事件
  websocketClient.on('payment_created', (data) => {
    addNotification({
      id: Date.now() + '_payment_created',
      type: 'success',
      title: '新支付',
      message: `收到新的支付: ¥${data.data.amount}`,
      timestamp: data.timestamp
    });
  });
  
  // 监听审核状态更新事件
  websocketClient.on('review_status_updated', (data) => {
    addNotification({
      id: Date.now() + '_review_updated',
      type: 'warning',
      title: '审核状态更新',
      message: `费用审核状态已更新: ${data.data.status}`,
      timestamp: data.timestamp
    });
  });
  
  // 监听争议处理事件
  websocketClient.on('dispute_processed', (data) => {
    addNotification({
      id: Date.now() + '_dispute_processed',
      type: 'warning',
      title: '争议处理',
      message: `争议已处理: ${data.data.description}`,
      timestamp: data.timestamp
    });
  });
  
  // 监听通用通知事件
  websocketClient.on('notification', (data) => {
    addNotification({
      id: data.data.id,
      type: data.data.type || 'info',
      title: data.data.title || '系统通知',
      message: data.data.message,
      timestamp: data.timestamp
    });
  });
  
  // 连接到WebSocket服务器
  websocketClient.connect();
};

// 生命周期钩子
onMounted(() => {
  initWebSocket();
});

onUnmounted(() => {
  websocketClient.disconnect();
});
</script>
</script>

<style scoped>
.expense-notification {
  width: 100%;
  max-width: 400px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
}

.connection-status {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.connection-status.connected {
  background-color: #e8f5e9;
  color: #4caf50;
}

.connection-status.disconnected {
  background-color: #ffebee;
  color: #f44336;
}

.notifications-list {
  max-height: 300px;
  overflow-y: auto;
}

.notification-item {
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  transition: background-color 0.2s;
}

.notification-item:hover {
  background-color: #f9f9f9;
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-item.info {
  border-left: 4px solid #2196f3;
}

.notification-item.success {
  border-left: 4px solid #4caf50;
}

.notification-item.warning {
  border-left: 4px solid #ff9800;
}

.notification-item.error {
  border-left: 4px solid #f44336;
}

.notification-title {
  font-weight: 600;
  margin-bottom: 4px;
  color: #333;
}

.notification-message {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.notification-time {
  font-size: 12px;
  color: #999;
}

.no-notifications {
  padding: 32px;
  text-align: center;
  color: #999;
  font-style: italic;
}
</style>