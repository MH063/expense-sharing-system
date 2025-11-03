<template>
  <div class="notification-center">
    <el-card class="notification-card">
      <template #header>
        <div class="card-header">
          <span>通知中心</span>
          <div class="header-actions">
            <el-badge :value="unreadCount" :hidden="unreadCount === 0" class="unread-badge">
              <el-button size="small" @click="markAllAsRead" :disabled="unreadCount === 0">
                全部标记已读
              </el-button>
            </el-badge>
            <el-button size="small" @click="refreshNotifications">
              <el-icon><Refresh /></el-icon>
            </el-button>
          </div>
        </div>
      </template>

      <div class="notification-filters">
        <el-radio-group v-model="filterType" @change="handleFilterChange" size="small">
          <el-radio-button label="all">全部</el-radio-button>
          <el-radio-button label="unread">未读</el-radio-button>
          <el-radio-button label="bill_due">账单到期</el-radio-button>
          <el-radio-button label="payment_status">支付状态</el-radio-button>
          <el-radio-button label="expense_added">费用添加</el-radio-button>
          <el-radio-button label="system">系统通知</el-radio-button>
        </el-radio-group>
      </div>

      <div class="notification-list" v-loading="loading">
        <div v-if="filteredNotifications.length === 0" class="empty-state">
          <el-empty description="暂无通知" />
        </div>
        <div v-else>
          <div
            v-for="notification in filteredNotifications"
            :key="notification.id"
            class="notification-item"
            :class="{ 'is-unread': !notification.isRead }"
            @click="handleNotificationClick(notification)"
          >
            <div class="notification-icon">
              <el-icon :size="20" :class="getNotificationIconClass(notification.type)">
                <component :is="getNotificationIcon(notification.type)" />
              </el-icon>
            </div>
            <div class="notification-content">
              <div class="notification-title">{{ notification.title }}</div>
              <div class="notification-desc">{{ notification.content }}</div>
              <div class="notification-time">{{ formatTime(notification.createdAt) }}</div>
            </div>
            <div class="notification-actions">
              <el-button
                v-if="!notification.isRead"
                size="small"
                text
                @click.stop="markAsRead(notification.id)"
              >
                标记已读
              </el-button>
              <el-dropdown @command="handleActionCommand" trigger="click" @click.stop>
                <el-button size="small" text>
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :command="{ action: 'delete', id: notification.id }">
                      删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </div>
      </div>

      <div class="pagination-container" v-if="total > pageSize">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Refresh, MoreFilled, Bell, Money, Warning, Info } from '@element-plus/icons-vue';
import notificationApi from '@/api/notifications';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 响应式数据
const loading = ref(false);
const notifications = ref([]);
const unreadCount = ref(0);
const currentPage = ref(1);
const pageSize = ref(20);
const total = ref(0);
const filterType = ref('all');

// 计算属性
const filteredNotifications = computed(() => {
  if (filterType.value === 'all') {
    return notifications.value;
  } else if (filterType.value === 'unread') {
    return notifications.value.filter(n => !n.isRead);
  } else {
    return notifications.value.filter(n => n.type === filterType.value);
  }
});

// 方法
const loadNotifications = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value
    };

    if (filterType.value !== 'all' && filterType.value !== 'unread') {
      params.type = filterType.value;
    } else if (filterType.value === 'unread') {
      params.isRead = false;
    }

    const response = await notificationApi.getNotifications(params);
    console.log('获取通知列表响应:', response);
    
    if (response.data && response.data.success) {
      notifications.value = response.data.data.notifications || [];
      total.value = response.data.data.total || 0;
    } else {
      console.error('获取通知列表失败:', response);
      ElMessage.error('获取通知列表失败');
    }
  } catch (error) {
    console.error('获取通知列表出错:', error);
    ElMessage.error('获取通知列表出错');
  } finally {
    loading.value = false;
  }
};

const loadUnreadCount = async () => {
  try {
    const response = await notificationApi.getUnreadCount();
    console.log('获取未读通知数量响应:', response);
    
    if (response.data && response.data.success) {
      unreadCount.value = response.data.data.count || 0;
    }
  } catch (error) {
    console.error('获取未读通知数量出错:', error);
  }
};

const markAsRead = async (id) => {
  try {
    const response = await notificationApi.markAsRead(id);
    console.log('标记通知已读响应:', response);
    
    if (response.data && response.data.success) {
      // 更新本地状态
      const notification = notifications.value.find(n => n.id === id);
      if (notification) {
        notification.isRead = true;
      }
      unreadCount.value = Math.max(0, unreadCount.value - 1);
      ElMessage.success('已标记为已读');
    } else {
      ElMessage.error('标记已读失败');
    }
  } catch (error) {
    console.error('标记通知已读出错:', error);
    ElMessage.error('标记已读出错');
  }
};

const markAllAsRead = async () => {
  try {
    const response = await notificationApi.markAllAsRead();
    console.log('批量标记已读响应:', response);
    
    if (response.data && response.data.success) {
      // 更新本地状态
      notifications.value.forEach(n => {
        n.isRead = true;
      });
      unreadCount.value = 0;
      ElMessage.success('已全部标记为已读');
    } else {
      ElMessage.error('批量标记已读失败');
    }
  } catch (error) {
    console.error('批量标记已读出错:', error);
    ElMessage.error('批量标记已读出错');
  }
};

const deleteNotification = async (id) => {
  try {
    await ElMessageBox.confirm('确定要删除这条通知吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    });

    const response = await notificationApi.deleteNotification(id);
    console.log('删除通知响应:', response);
    
    if (response.data && response.data.success) {
      // 更新本地状态
      const index = notifications.value.findIndex(n => n.id === id);
      if (index !== -1) {
        const notification = notifications.value[index];
        if (!notification.isRead) {
          unreadCount.value = Math.max(0, unreadCount.value - 1);
        }
        notifications.value.splice(index, 1);
        total.value = Math.max(0, total.value - 1);
      }
      ElMessage.success('通知已删除');
    } else {
      ElMessage.error('删除通知失败');
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除通知出错:', error);
      ElMessage.error('删除通知出错');
    }
  }
};

const handleNotificationClick = (notification) => {
  if (!notification.isRead) {
    markAsRead(notification.id);
  }
  
  // 如果有操作链接，则跳转
  if (notification.actionUrl) {
    window.location.href = notification.actionUrl;
  }
};

const handleActionCommand = (command) => {
  if (command.action === 'delete') {
    deleteNotification(command.id);
  }
};

const handleFilterChange = () => {
  currentPage.value = 1;
  loadNotifications();
};

const handleCurrentChange = (page) => {
  currentPage.value = page;
  loadNotifications();
};

const handleSizeChange = (size) => {
  pageSize.value = size;
  currentPage.value = 1;
  loadNotifications();
};

const refreshNotifications = () => {
  loadNotifications();
  loadUnreadCount();
};

const formatTime = (time) => {
  return formatDistanceToNow(new Date(time), { 
    addSuffix: true, 
    locale: zhCN 
  });
};

const getNotificationIcon = (type) => {
  switch (type) {
    case 'bill_due':
      return Money;
    case 'payment_status':
      return Warning;
    case 'expense_added':
      return Bell;
    default:
      return Info;
  }
};

const getNotificationIconClass = (type) => {
  switch (type) {
    case 'bill_due':
      return 'icon-bill-due';
    case 'payment_status':
      return 'icon-payment-status';
    case 'expense_added':
      return 'icon-expense-added';
    default:
      return 'icon-system';
  }
};

// 生命周期
onMounted(() => {
  loadNotifications();
  loadUnreadCount();
});

// 监听过滤类型变化
watch(filterType, () => {
  currentPage.value = 1;
  loadNotifications();
});
</script>

<style scoped>
.notification-center {
  padding: 20px;
}

.notification-card {
  max-width: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.unread-badge {
  margin-right: 10px;
}

.notification-filters {
  margin-bottom: 20px;
}

.notification-list {
  min-height: 400px;
}

.notification-item {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  border-bottom: 1px solid #ebeef5;
  cursor: pointer;
  transition: background-color 0.3s;
}

.notification-item:hover {
  background-color: #f5f7fa;
}

.notification-item.is-unread {
  background-color: #f0f9ff;
  border-left: 3px solid #409eff;
}

.notification-icon {
  margin-right: 12px;
  margin-top: 2px;
}

.notification-content {
  flex: 1;
}

.notification-title {
  font-weight: 500;
  margin-bottom: 4px;
  color: #303133;
}

.notification-desc {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
  line-height: 1.4;
}

.notification-time {
  font-size: 12px;
  color: #909399;
}

.notification-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.empty-state {
  padding: 40px 0;
  text-align: center;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

/* 图标样式 */
.icon-bill-due {
  color: #e6a23c;
}

.icon-payment-status {
  color: #f56c6c;
}

.icon-expense-added {
  color: #409eff;
}

.icon-system {
  color: #909399;
}
</style>