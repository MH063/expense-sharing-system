<template>
  <div class="dashboard">
    <div class="dashboard-header">
      <div class="welcome-center">
        <span class="welcome-text">欢迎回来，{{ userName }}</span>
      </div>
    </div>

    <!-- 统计卡片区域 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">¥{{ stats.totalExpense }}</div>
              <div class="stat-label">本月总支出</div>
            </div>
            <div class="stat-icon expense">
              <el-icon><Money /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">¥{{ stats.myExpense }}</div>
              <div class="stat-label">我的支出</div>
            </div>
            <div class="stat-icon my-expense">
              <el-icon><User /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">¥{{ stats.owedAmount }}</div>
              <div class="stat-label">待收金额</div>
            </div>
            <div class="stat-icon owed">
              <el-icon><ArrowDown /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">¥{{ stats.owingAmount }}</div>
              <div class="stat-label">待付金额</div>
            </div>
            <div class="stat-icon owing">
              <el-icon><ArrowUp /></el-icon>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 图表和活动区域 -->
    <el-row :gutter="20" class="content-section">
      <!-- 费用趋势图表 -->
      <el-col :span="16">
        <el-card shadow="hover" class="chart-card">
          <template #header>
            <div class="card-header">
              <span>费用趋势</span>
              <el-radio-group v-model="trendPeriod" size="small">
                <el-radio-button label="week">本周</el-radio-button>
                <el-radio-button label="month">本月</el-radio-button>
                <el-radio-button label="year">本年</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="chart-container">
            <div v-loading="chartLoading" class="chart-placeholder">
              <div ref="trendChartRef" class="chart"></div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 最近活动 -->
      <el-col :span="8">
        <el-card shadow="hover" class="activity-card">
          <template #header>
            <div class="card-header">
              <span>最近活动</span>
              <el-button type="text" @click="viewAllActivities">查看全部</el-button>
            </div>
          </template>
          <div class="activity-list">
            <div v-for="(activity, index) in recentActivities" :key="index" class="activity-item">
              <div class="activity-icon" :class="activity.type">
                <el-icon v-if="activity.type === 'expense'"><Money /></el-icon>
                <el-icon v-else-if="activity.type === 'payment'"><CircleCheck /></el-icon>
                <el-icon v-else><Bell /></el-icon>
              </div>
              <div class="activity-content">
                <div class="activity-title">{{ activity.title }}</div>
                <div class="activity-time">{{ formatTime(activity.timestamp) }}</div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 快捷操作和待办事项 -->
    <el-row :gutter="20" class="content-section">
      <!-- 快捷操作 -->
      <el-col :span="12">
        <el-card shadow="hover" class="quick-actions-card">
          <template #header>
            <div class="card-header">
              <span>快捷操作</span>
            </div>
          </template>
          <div class="quick-actions">
            <el-button type="primary" @click="addExpense">
              <el-icon><Plus /></el-icon>
              添加费用
            </el-button>
            <el-button type="success" @click="viewExpenses">
              <el-icon><List /></el-icon>
              查看费用
            </el-button>
            <el-button type="warning" @click="viewBills">
              <el-icon><Document /></el-icon>
              账单管理
            </el-button>
            <el-button type="info" @click="viewRooms">
              <el-icon><House /></el-icon>
              寝室管理
            </el-button>
          </div>
        </el-card>
      </el-col>

      <!-- 待办事项 -->
      <el-col :span="12">
        <el-card shadow="hover" class="todo-card">
          <template #header>
            <div class="card-header">
              <span>待办事项</span>
              <el-badge :value="todoCount" class="todo-badge" />
            </div>
          </template>
          <div class="todo-list">
            <div v-for="(todo, index) in todoList" :key="index" class="todo-item" @click="handleTodoClick(todo)">
              <div class="todo-icon" :class="todo.type">
                <el-icon v-if="todo.type === 'payment'"><Clock /></el-icon>
                <el-icon v-else-if="todo.type === 'review'"><View /></el-icon>
                <el-icon v-else><Bell /></el-icon>
              </div>
              <div class="todo-content">
                <div class="todo-title">{{ todo.title }}</div>
                <div class="todo-desc">{{ todo.description }}</div>
              </div>
              <div class="todo-action">
                <el-button type="text" size="small">处理</el-button>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick, computed, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage } from 'element-plus'
import { 
  User, Money, ArrowDown, ArrowUp, Plus, List, Document, House,
  CircleCheck, Bell, Clock, View
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { statsApi } from '@/api/stats'
import { notificationApi } from '@/api/notifications'
import { billApi } from '@/api/bills'

// 路由和状态管理
const router = useRouter()
const authStore = useAuthStore()

// 响应式数据
const chartLoading = ref(false)
const trendPeriod = ref('month')
const trendChartRef = ref(null)
let trendChart = null

// 计算属性 - 从authStore获取用户信息
const userName = computed(() => authStore.currentUser?.username || '用户')
const userAvatar = computed(() => authStore.currentUser?.avatar || '')

// 统计数据
const stats = reactive({
  totalExpense: '0.00',
  myExpense: '0.00',
  owedAmount: '0.00',
  owingAmount: '0.00'
})

// 最近活动数据
const recentActivities = ref([])

// 待办事项数据
const todoList = ref([])

// 待办事项数量
const todoCount = computed(() => {
  return todoList.value.length
})

/**
 * 初始化费用趋势图表
 */
const initTrendChart = () => {
  if (!trendChartRef.value) return
  
  chartLoading.value = true
  
  // 空的图表数据
  const chartData = {
    week: {
      categories: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      values: [0, 0, 0, 0, 0, 0, 0]
    },
    month: {
      categories: ['第1周', '第2周', '第3周', '第4周'],
      values: [0, 0, 0, 0]
    },
    year: {
      categories: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
      values: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    }
  }
  
  nextTick(() => {
    if (trendChart) {
      trendChart.dispose()
    }
    
    trendChart = echarts.init(trendChartRef.value)
    const data = chartData[trendPeriod.value]
    
    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: data.categories,
        axisTick: {
          alignWithLabel: true
        }
      },
      yAxis: {
        type: 'value'
      },
      series: [
        {
          name: '费用',
          type: 'bar',
          barWidth: '60%',
          data: data.values,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: '#83bff6' },
              { offset: 0.5, color: '#188df0' },
              { offset: 1, color: '#188df0' }
            ])
          }
        }
      ]
    }
    
    trendChart.setOption(option)
    chartLoading.value = false
  })
}

/**
 * 加载统计数据
 */
const loadStats = async () => {
  try {
    console.log('开始加载用户统计数据')
    const response = await statsApi.getUserStats()
    console.log('用户统计数据响应:', response)
    
    // 处理后端返回的数据结构 {success: true, data: {...}}
    if (response.success && response.data) {
      const data = response.data
      stats.totalExpense = data.totalExpense || '0.00'
      stats.myExpense = data.myExpense || '0.00'
      stats.owedAmount = data.owedAmount || '0.00'
      stats.owingAmount = data.owingAmount || '0.00'
      console.log('统计数据已更新:', stats)
    } else {
      console.error('统计数据响应格式错误:', response)
      ElMessage.error('统计数据格式错误')
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
    ElMessage.error('加载统计数据失败')
  }
}

/**
 * 加载最近活动数据
 */
const loadRecentActivities = async () => {
  try {
    console.log('开始加载最近活动数据')
    const response = await notificationApi.getNotifications({ limit: 5 })
    console.log('最近活动数据响应:', response)
    
    // 处理后端返回的数据结构 {success: true, data: {...}}
    if (response.success && response.data) {
      // 将通知数据转换为活动数据格式
      recentActivities.value = response.data.map(notification => {
        return {
          type: 'notification',
          title: notification.title || '新通知',
          timestamp: notification.createdAt || new Date().toISOString()
        }
      })
      console.log('最近活动数据已更新:', recentActivities.value)
    } else {
      console.error('最近活动数据响应格式错误:', response)
    }
  } catch (error) {
    console.error('加载最近活动数据失败:', error)
  }
}

/**
 * 加载待办事项数据
 */
const loadTodoList = async () => {
  try {
    console.log('开始加载待办事项数据')
    const response = await billApi.getBills({ status: 'pending', limit: 5 })
    console.log('待办事项数据响应:', response)
    
    // 处理后端返回的数据结构 {success: true, data: {...}}
    if (response.success && response.data) {
      // 将账单数据转换为待办事项数据格式
      todoList.value = response.data.map(bill => {
        return {
          type: 'payment',
          title: bill.title || '待支付账单',
          description: `金额: ¥${bill.amount || '0.00'}`,
          action: 'view-bills',
          id: bill.id
        }
      })
      console.log('待办事项数据已更新:', todoList.value)
    } else {
      console.error('待办事项数据响应格式错误:', response)
    }
  } catch (error) {
    console.error('加载待办事项数据失败:', error)
  }
}

/**
 * 加载图表数据
 */
const loadChartData = async () => {
  if (!trendPeriod.value) return
  
  try {
    chartLoading.value = true
    console.log('开始加载图表数据，周期:', trendPeriod.value)
    
    // 获取房间统计数据，用于图表展示
    const response = await statsApi.getRoomStats({
      startDate: getDateRange(trendPeriod.value).start,
      endDate: getDateRange(trendPeriod.value).end
    })
    console.log('图表数据响应:', response)
    
    // 处理后端返回的数据结构 {success: true, data: {...}}
    if (response.success && response.data) {
      // 根据周期更新图表数据
      updateChartData(response.data)
    } else {
      console.error('图表数据响应格式错误:', response)
    }
    
    chartLoading.value = false
  } catch (error) {
    console.error('加载图表数据失败:', error)
    chartLoading.value = false
  }
}

/**
 * 根据周期获取日期范围
 */
const getDateRange = (period) => {
  const now = new Date()
  let start, end
  
  switch (period) {
    case 'week':
      // 本周
      const dayOfWeek = now.getDay()
      start = new Date(now)
      start.setDate(now.getDate() - dayOfWeek)
      end = new Date(now)
      end.setDate(now.getDate() + (6 - dayOfWeek))
      break
    case 'month':
      // 本月
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      break
    case 'year':
      // 本年
      start = new Date(now.getFullYear(), 0, 1)
      end = new Date(now.getFullYear(), 11, 31)
      break
    default:
      // 默认本月
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  }
  
  // 格式化为 YYYY-MM-DD
  const formatDate = (date) => {
    return date.toISOString().split('T')[0]
  }
  
  return {
    start: formatDate(start),
    end: formatDate(end)
  }
}

/**
 * 更新图表数据
 */
const updateChartData = (data) => {
  if (!trendChart || !data) return
  
  let categories, values
  
  switch (trendPeriod.value) {
    case 'week':
      categories = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
      // 如果后端提供了周数据，使用后端数据，否则使用默认0
      values = data.weeklyData || [0, 0, 0, 0, 0, 0, 0]
      break
    case 'month':
      categories = ['第1周', '第2周', '第3周', '第4周']
      // 如果后端提供了月数据，使用后端数据，否则使用默认0
      values = data.monthlyData || [0, 0, 0, 0]
      break
    case 'year':
      categories = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
      // 如果后端提供了年数据，使用后端数据，否则使用默认0
      values = data.yearlyData || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
      break
    default:
      return
  }
  
  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisTick: {
        alignWithLabel: true
      }
    },
    yAxis: {
      type: 'value'
    },
    series: [
      {
        name: '费用',
        type: 'bar',
        barWidth: '60%',
        data: values,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#83bff6' },
            { offset: 0.5, color: '#188df0' },
            { offset: 1, color: '#188df0' }
          ])
        }
      }
    ]
  }
  
  trendChart.setOption(option)
}

/**
 * 格式化时间
 */
const formatTime = (timestamp) => {
  const now = new Date()
  const time = new Date(timestamp)
  const diff = now - time
  
  if (diff < 1000 * 60) {
    return '刚刚'
  } else if (diff < 1000 * 60 * 60) {
    return `${Math.floor(diff / (1000 * 60))}分钟前`
  } else if (diff < 1000 * 60 * 60 * 24) {
    return `${Math.floor(diff / (1000 * 60 * 60))}小时前`
  } else {
    return `${Math.floor(diff / (1000 * 60 * 60 * 24))}天前`
  }
}

/**
 * 查看所有活动
 */
const viewAllActivities = () => {
  router.push('/notifications')
}

/**
 * 添加费用
 */
const addExpense = () => {
  router.push('/expenses/create')
}

/**
 * 查看费用
 */
const viewExpenses = () => {
  router.push('/expenses')
}

/**
 * 查看账单
 */
const viewBills = () => {
  router.push('/bills')
}

/**
 * 查看寝室
 */
const viewRooms = () => {
  router.push('/rooms')
}

/**
 * 处理待办事项点击
 */
const handleTodoClick = (todo) => {
  switch (todo.action) {
    case 'view-bills':
      router.push('/bills')
      break
    case 'review-expenses':
      router.push('/expenses')
      break
    case 'view-notifications':
      router.push('/notifications/center')
      break
    default:
      break
  }
}

// 监听趋势周期变化
watch(trendPeriod, () => {
  initTrendChart()
  loadChartData()
})

// 组件挂载时初始化
onMounted(() => {
  loadStats()
  loadRecentActivities()
  loadTodoList()
  initTrendChart()
  loadChartData()
  
  // 监听窗口大小变化，调整图表大小
  window.addEventListener('resize', () => {
    if (trendChart) {
      trendChart.resize()
    }
  })
})

// 组件卸载时清理
onUnmounted(() => {
  if (trendChart) {
    trendChart.dispose()
  }
  window.removeEventListener('resize', () => {
    if (trendChart) {
      trendChart.resize()
    }
  })
})
</script>

<style scoped>
.dashboard {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.dashboard-header {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 20px;
}

.welcome-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.welcome-text {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.stats-section {
  margin-bottom: 20px;
}

.stat-card {
  position: relative;
  overflow: hidden;
  height: 120px;
}

.stat-content {
  position: relative;
  z-index: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.stat-icon {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 40px;
  opacity: 0.8;
}

.stat-icon.expense {
  color: #409EFF;
}

.stat-icon.my-expense {
  color: #67C23A;
}

.stat-icon.owed {
  color: #E6A23C;
}

.stat-icon.owing {
  color: #F56C6C;
}

.content-section {
  margin-bottom: 20px;
}

.chart-card {
  height: 400px;
}

.activity-card {
  height: 400px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 320px;
}

.chart-placeholder {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.chart {
  width: 100%;
  height: 100%;
}

.activity-list {
  height: 320px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  padding: 12px 0;
  border-bottom: 1px solid #EBEEF5;
}

.activity-item:last-child {
  border-bottom: none;
}

.activity-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  flex-shrink: 0;
}

.activity-icon.expense {
  background-color: #ECF5FF;
  color: #409EFF;
}

.activity-icon.payment {
  background-color: #F0F9FF;
  color: #67C23A;
}

.activity-icon.notification {
  background-color: #FDF6EC;
  color: #E6A23C;
}

.activity-content {
  flex: 1;
}

.activity-title {
  font-size: 14px;
  color: #303133;
  margin-bottom: 4px;
}

.activity-time {
  font-size: 12px;
  color: #909399;
}

.quick-actions-card {
  height: 200px;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.quick-actions .el-button {
  flex: 1;
  min-width: 120px;
}

.todo-card {
  height: 200px;
}

.todo-badge {
  margin-left: 8px;
}

.todo-list {
  height: 120px;
  overflow-y: auto;
}

.todo-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #EBEEF5;
  cursor: pointer;
  transition: background-color 0.3s;
}

.todo-item:hover {
  background-color: #F5F7FA;
}

.todo-item:last-child {
  border-bottom: none;
}

.todo-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  flex-shrink: 0;
}

.todo-icon.payment {
  background-color: #FDF6EC;
  color: #E6A23C;
}

.todo-icon.review {
  background-color: #ECF5FF;
  color: #409EFF;
}

.todo-icon.notification {
  background-color: #F0F9FF;
  color: #67C23A;
}

.todo-content {
  flex: 1;
}

.todo-title {
  font-size: 14px;
  color: #303133;
  margin-bottom: 2px;
}

.todo-desc {
  font-size: 12px;
  color: #909399;
}

.todo-action {
  flex-shrink: 0;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .content-section .el-col:first-child {
    margin-bottom: 20px;
  }
}

@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    align-items: center;
    gap: 12px;
  }
  
  .stats-section .el-col {
    margin-bottom: 12px;
  }
  
  .quick-actions {
    flex-direction: column;
  }
  
  .quick-actions .el-button {
    width: 100%;
  }
}
</style>