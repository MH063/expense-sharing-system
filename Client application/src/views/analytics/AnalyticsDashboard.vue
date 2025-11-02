<template>
  <div class="analytics-dashboard">
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
      <el-tab-pane label="用户分析" name="users">
        <UserAnalysisTab :date-range="dateRange" />
      </el-tab-pane>
      <el-tab-pane label="房间分析" name="rooms">
        <RoomAnalysisTab :date-range="dateRange" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import OverviewTab from './tabs/OverviewTab.vue'
import ExpenseAnalysisTab from './tabs/ExpenseAnalysisTab.vue'
import UserAnalysisTab from './tabs/UserAnalysisTab.vue'
import RoomAnalysisTab from './tabs/RoomAnalysisTab.vue'

// 状态
const activeTab = ref('overview')
const dateRange = ref([
  // 默认显示最近30天
  new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
  new Date().toISOString().split('T')[0]
])

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
</style>