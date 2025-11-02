<template>
  <div class="token-status">
    <el-card class="status-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>Token状态监控</span>
          <el-button 
            size="small" 
            type="primary" 
            @click="refreshTokenStatus"
            :loading="refreshing"
          >
            刷新状态
          </el-button>
        </div>
      </template>
      
      <div class="status-content">
        <!-- Token有效性状态 -->
        <div class="status-item">
          <div class="status-label">Token有效性:</div>
          <div class="status-value">
            <el-tag 
              :type="tokenStatus.isValid ? 'success' : 'danger'"
              effect="dark"
            >
              {{ tokenStatus.isValid ? '有效' : '无效' }}
            </el-tag>
          </div>
        </div>
        
        <!-- Token过期状态 -->
        <div class="status-item">
          <div class="status-label">Token过期状态:</div>
          <div class="status-value">
            <el-tag 
              :type="tokenStatus.isExpired ? 'danger' : 'success'"
              effect="dark"
            >
              {{ tokenStatus.isExpired ? '已过期' : '未过期' }}
            </el-tag>
          </div>
        </div>
        
        <!-- Token即将过期状态 -->
        <div class="status-item">
          <div class="status-label">即将过期:</div>
          <div class="status-value">
            <el-tag 
              :type="tokenStatus.isExpiringSoon ? 'warning' : 'success'"
              effect="dark"
            >
              {{ tokenStatus.isExpiringSoon ? '是' : '否' }}
            </el-tag>
          </div>
        </div>
        
        <!-- Token剩余时间 -->
        <div class="status-item">
          <div class="status-label">剩余时间:</div>
          <div class="status-value">
            <span :class="{'text-warning': tokenStatus.isExpiringSoon, 'text-danger': tokenStatus.isExpired}">
              {{ formatTimeRemaining(tokenStatus.expiresIn) }}
            </span>
          </div>
        </div>
        
        <!-- Token签发时间 -->
        <div class="status-item">
          <div class="status-label">签发时间:</div>
          <div class="status-value">
            {{ formatDate(tokenStatus.issuedAt) }}
          </div>
        </div>
        
        <!-- Token过期时间 -->
        <div class="status-item">
          <div class="status-label">过期时间:</div>
          <div class="status-value">
            <span :class="{'text-warning': tokenStatus.isExpiringSoon, 'text-danger': tokenStatus.isExpired}">
              {{ formatDate(tokenStatus.expiresAt) }}
            </span>
          </div>
        </div>
        
        <!-- 刷新Token状态 -->
        <div class="status-item">
          <div class="status-label">刷新Token:</div>
          <div class="status-value">
            <el-tag 
              :type="hasRefreshToken ? 'success' : 'danger'"
              effect="dark"
            >
              {{ hasRefreshToken ? '可用' : '不可用' }}
            </el-tag>
          </div>
        </div>
        
        <!-- 操作按钮 -->
        <div class="status-actions">
          <el-button 
            size="small" 
            type="warning" 
            @click="refreshTokens"
            :disabled="!hasRefreshToken || isRefreshing"
            :loading="isRefreshing"
          >
            刷新Token
          </el-button>
          
          <el-button 
            size="small" 
            type="danger" 
            @click="logout"
          >
            登出
          </el-button>
        </div>
      </div>
    </el-card>
    
    <!-- Token详情 -->
    <el-card class="detail-card" shadow="hover" v-if="showDetails">
      <template #header>
        <div class="card-header">
          <span>Token详情</span>
          <el-button 
            size="small" 
            @click="showDetails = false"
          >
            隐藏详情
          </el-button>
        </div>
      </template>
      
      <div class="detail-content">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="用户ID">
            {{ user?.id || '未知' }}
          </el-descriptions-item>
          <el-descriptions-item label="用户名">
            {{ user?.username || '未知' }}
          </el-descriptions-item>
          <el-descriptions-item label="角色">
            <el-tag v-for="role in user?.roles" :key="role" size="small" class="role-tag">
              {{ role }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="权限">
            <el-tag 
              v-for="permission in user?.permissions" 
              :key="permission" 
              size="small" 
              type="info" 
              class="permission-tag"
            >
              {{ permission }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="寝室ID">
            {{ user?.roomId || '未加入寝室' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-card>
    
    <!-- 显示详情按钮 -->
    <div class="detail-toggle" v-if="!showDetails">
      <el-button 
        size="small" 
        type="text" 
        @click="showDetails = true"
      >
        显示Token详情
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'

// 状态
const authStore = useAuthStore()
const refreshing = ref(false)
const showDetails = ref(false)
let statusUpdateTimer = null

// 计算属性
const user = computed(() => authStore.user)
const isAuthenticated = computed(() => authStore.isAuthenticated)
const hasRefreshToken = computed(() => authStore.hasRefreshToken)
const isRefreshing = computed(() => authStore.isRefreshing)
const tokenStatus = computed(() => authStore.getTokenStatus())

// 方法
/**
 * 刷新Token状态
 */
const refreshTokenStatus = async () => {
  refreshing.value = true
  try {
    // 等待一小段时间以确保状态更新
    await new Promise(resolve => setTimeout(resolve, 100))
    ElMessage.success('Token状态已刷新')
  } catch (error) {
    console.error('刷新Token状态失败:', error)
    ElMessage.error('刷新Token状态失败')
  } finally {
    refreshing.value = false
  }
}

/**
 * 刷新Token
 */
const refreshTokens = async () => {
  try {
    await authStore.refreshSession()
    ElMessage.success('Token刷新成功')
  } catch (error) {
    console.error('Token刷新失败:', error)
    ElMessage.error('Token刷新失败')
  }
}

/**
 * 登出
 */
const logout = async () => {
  try {
    await authStore.logout()
    ElMessage.success('已登出')
  } catch (error) {
    console.error('登出失败:', error)
    ElMessage.error('登出失败')
  }
}

/**
 * 格式化剩余时间
 * @param {number} seconds - 剩余秒数
 * @returns {string} 格式化后的时间
 */
const formatTimeRemaining = (seconds) => {
  if (!seconds || seconds <= 0) {
    return '已过期'
  }
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}小时${minutes}分钟`
  } else if (minutes > 0) {
    return `${minutes}分钟${secs}秒`
  } else {
    return `${secs}秒`
  }
}

/**
 * 格式化日期
 * @param {Date|string} date - 日期
 * @returns {string} 格式化后的日期
 */
const formatDate = (date) => {
  if (!date) {
    return '未知'
  }
  
  const d = new Date(date)
  return d.toLocaleString()
}

// 生命周期
onMounted(() => {
  // 设置定时器，每30秒更新一次状态
  statusUpdateTimer = setInterval(() => {
    // 强制更新视图
    refreshTokenStatus()
  }, 30000)
})

onBeforeUnmount(() => {
  // 清除定时器
  if (statusUpdateTimer) {
    clearInterval(statusUpdateTimer)
    statusUpdateTimer = null
  }
})
</script>

<style scoped>
.token-status {
  max-width: 600px;
  margin: 0 auto;
}

.status-card, .detail-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-label {
  font-weight: 500;
  color: #606266;
}

.status-value {
  font-weight: 600;
}

.status-actions {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.detail-toggle {
  text-align: center;
  margin-top: 10px;
}

.role-tag, .permission-tag {
  margin-right: 5px;
  margin-bottom: 5px;
}

.text-warning {
  color: #E6A23C;
}

.text-danger {
  color: #F56C6C;
}
</style>