<template>
  <div class="overview-tab">
    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ overviewData.totalUsers }}</div>
              <div class="stat-label">总用户数</div>
            </div>
            <div class="stat-icon users">
              <el-icon><User /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ overviewData.totalRooms }}</div>
              <div class="stat-label">总房间数</div>
            </div>
            <div class="stat-icon rooms">
              <el-icon><House /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">¥{{ overviewData.totalExpenses }}</div>
              <div class="stat-label">总支出金额</div>
            </div>
            <div class="stat-icon expenses">
              <el-icon><Money /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ overviewData.activeUsers }}</div>
              <div class="stat-label">活跃用户数</div>
            </div>
            <div class="stat-icon active">
              <el-icon><UserFilled /></el-icon>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 图表区域 -->
    <div class="charts-container">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card shadow="hover" class="chart-card">
            <template #header>
              <div class="chart-header">
                <span>支出趋势</span>
              </div>
            </template>
            <div class="chart-container">
              <ExpenseTrendChart :date-range="dateRange" />
            </div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card shadow="hover" class="chart-card">
            <template #header>
              <div class="chart-header">
                <span>用户增长趋势</span>
              </div>
            </template>
            <div class="chart-container">
              <UserGrowthChart :date-range="dateRange" />
            </div>
          </el-card>
        </el-col>
      </el-row>
      <el-row :gutter="20" style="margin-top: 20px;">
        <el-col :span="12">
          <el-card shadow="hover" class="chart-card">
            <template #header>
              <div class="chart-header">
                <span>支出分类统计</span>
              </div>
            </template>
            <div class="chart-container">
              <ExpenseCategoryChart :date-range="dateRange" />
            </div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card shadow="hover" class="chart-card">
            <template #header>
              <div class="chart-header">
                <span>房间活跃度排行</span>
              </div>
            </template>
            <div class="chart-container">
              <RoomActivityChart :date-range="dateRange" />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 最近活动 -->
    <div class="recent-activities">
      <el-card shadow="hover">
        <template #header>
          <div class="chart-header">
            <span>最近活动</span>
            <el-button type="text" @click="viewAllActivities">查看全部</el-button>
          </div>
        </template>
        <el-timeline>
          <el-timeline-item
            v-for="(activity, index) in recentActivities"
            :key="index"
            :timestamp="formatDate(activity.timestamp)"
            :type="getActivityType(activity.type)"
          >
            <div class="activity-content">
              <div class="activity-title">{{ activity.title }}</div>
              <div class="activity-description">{{ activity.description }}</div>
            </div>
          </el-timeline-item>
        </el-timeline>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, defineProps } from 'vue'
import { useRouter } from 'vue-router'
import { User, House, Money, UserFilled } from '@element-plus/icons-vue'
import { analyticsApi } from '@/api/analytics'
import ExpenseTrendChart from '../charts/ExpenseTrendChart.vue'
import UserGrowthChart from '../charts/UserGrowthChart.vue'
import ExpenseCategoryChart from '../charts/ExpenseCategoryChart.vue'
import RoomActivityChart from '../charts/RoomActivityChart.vue'

// Props
const props = defineProps({
  dateRange: {
    type: Array,
    default: () => []
  }
})

// 路由
const router = useRouter()

// 状态
const loading = ref(false)
const overviewData = reactive({
  totalUsers: 0,
  totalRooms: 0,
  totalExpenses: 0,
  activeUsers: 0
})
const recentActivities = ref([])

// 方法
/**
 * 加载概览数据
 */
const loadOverviewData = async () => {
  loading.value = true
  try {
    const params = {
      startDate: props.dateRange[0],
      endDate: props.dateRange[1]
    }
    
    const response = await analyticsApi.getOverviewData(params)
    if (response.success) {
      Object.assign(overviewData, response.data)
    } else {
      console.error('加载概览数据失败')
    }
  } catch (error) {
    console.error('加载概览数据失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 加载最近活动
 */
const loadRecentActivities = async () => {
  try {
    const params = {
      limit: 10
    }
    
    const response = await analyticsApi.getRecentActivities(params)
    if (response.success) {
      recentActivities.value = response.data || []
    } else {
      console.error('加载最近活动失败')
    }
  } catch (error) {
    console.error('加载最近活动失败:', error)
  }
}

/**
 * 格式化日期
 */
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

/**
 * 获取活动类型
 */
const getActivityType = (type) => {
  const typeMap = {
    expense: 'primary',
    payment: 'success',
    room: 'warning',
    user: 'info',
    dispute: 'danger'
  }
  return typeMap[type] || 'primary'
}

/**
 * 查看全部活动
 */
const viewAllActivities = () => {
  router.push('/activities')
}

// 监听刷新事件
onMounted(() => {
  loadOverviewData()
  loadRecentActivities()
  
  // 监听刷新数据事件
  window.addEventListener('refresh-analytics-data', () => {
    loadOverviewData()
    loadRecentActivities()
  })
})
</script>

<style scoped>
.overview-tab {
  padding: 0;
}

.stats-cards {
  margin-bottom: 20px;
}

.stat-card {
  position: relative;
  overflow: hidden;
}

.stat-content {
  position: relative;
  z-index: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.stat-icon {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 40px;
  opacity: 0.2;
}

.stat-icon.users {
  color: #409eff;
}

.stat-icon.rooms {
  color: #67c23a;
}

.stat-icon.expenses {
  color: #e6a23c;
}

.stat-icon.active {
  color: #f56c6c;
}

.charts-container {
  margin-bottom: 20px;
}

.chart-card {
  height: 400px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 320px;
}

.recent-activities {
  margin-top: 20px;
}

.activity-content {
  padding: 5px 0;
}

.activity-title {
  font-weight: bold;
  margin-bottom: 5px;
}

.activity-description {
  color: #666;
  font-size: 14px;
}
</style>