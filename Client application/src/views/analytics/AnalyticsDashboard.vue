<template>
  <div class="analytics-dashboard" v-if="canViewAnalytics">
    <div class="dashboard-header">
      <h1>数据分析</h1>
      <div class="header-actions">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          @change="handleDateRangeChange"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
        />
        <el-button type="primary" @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="analytics-tabs">
      <el-tab-pane label="概览" name="overview">
        <OverviewTab :date-range="dateRange" />
      </el-tab-pane>
      <el-tab-pane label="费用分析" name="expenses">
        <ExpenseAnalysisTab :date-range="dateRange" />
      </el-tab-pane>
      <el-tab-pane label="账单分析" name="bills">
        <BillAnalysisTab :date-range="dateRange" />
      </el-tab-pane>
      <el-tab-pane label="用户分析" name="users">
        <UserAnalysisTab :date-range="dateRange" />
      </el-tab-pane>
      <el-tab-pane label="房间分析" name="rooms">
        <RoomAnalysisTab :date-range="dateRange" />
      </el-tab-pane>
    </el-tabs>
  </div>
  
  <!-- 无权限访问提示 -->
  <div v-else class="no-permission-container">
    <div class="no-permission-content">
      <el-icon class="no-permission-icon"><Lock /></el-icon>
      <h2>访问受限</h2>
      <p>您没有权限访问数据分析功能</p>
      <el-button type="primary" @click="$router.push('/dashboard')">返回首页</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Refresh, Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { PERMISSIONS } from '@/utils/permissions'
import OverviewTab from './tabs/OverviewTab.vue'
import ExpenseAnalysisTab from './tabs/ExpenseAnalysisTab.vue'
import BillAnalysisTab from './tabs/BillAnalysisTab.vue'
import UserAnalysisTab from './tabs/UserAnalysisTab.vue'
import RoomAnalysisTab from './tabs/RoomAnalysisTab.vue'

// 状态
const activeTab = ref('overview')
const dateRange = ref([
  // 默认显示最近30天
  new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
  new Date().toISOString().split('T')[0]
])

// 权限检查
const authStore = useAuthStore()
const canViewAnalytics = computed(() => {
  return authStore.hasPermission(PERMISSIONS.SYSTEM_VIEW) || 
         authStore.hasPermission(PERMISSIONS.ROOM_VIEW)
})

// 方法
/**
 * 处理日期范围变化
 */
const handleDateRangeChange = () => {
  // 日期范围变化时，子组件会通过props自动更新
}

/**
 * 刷新数据
 */
const refreshData = () => {
  // 触发子组件刷新数据
  // 这里可以使用事件总线或其他方式通知子组件
  window.dispatchEvent(new CustomEvent('refresh-analytics-data'))
}

// 生命周期
onMounted(() => {
  // 初始化数据
})
</script>

<style scoped>
.analytics-dashboard {
  padding: 20px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.analytics-tabs {
  margin-top: 20px;
}

.no-permission-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 70vh;
  padding: 20px;
}

.no-permission-content {
  text-align: center;
  max-width: 400px;
}

.no-permission-icon {
  font-size: 64px;
  color: #e6a23c;
  margin-bottom: 20px;
}

.no-permission-content h2 {
  margin: 0 0 16px 0;
  color: #303133;
}

.no-permission-content p {
  margin: 0 0 24px 0;
  color: #606266;
  font-size: 16px;
}
</style>