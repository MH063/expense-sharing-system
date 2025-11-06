<template>
  <div class="user-analysis-tab">
    <div class="stats-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ stats.totalUsers }}</div>
              <div class="stat-label">总用户数</div>
            </div>
            <div class="stat-icon">
              <el-icon><User /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ stats.activeUsers }}</div>
              <div class="stat-label">活跃用户</div>
            </div>
            <div class="stat-icon">
              <el-icon><UserFilled /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ stats.newUsers }}</div>
              <div class="stat-label">新增用户</div>
            </div>
            <div class="stat-icon">
              <el-icon><Plus /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ stats.avgExpense }}</div>
              <div class="stat-label">人均消费</div>
            </div>
            <div class="stat-icon">
              <el-icon><Money /></el-icon>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <div class="charts-section">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card class="chart-card">
            <div class="chart-title">用户增长趋势</div>
            <UserGrowthChart :date-range="dateRange" />
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card class="chart-card">
            <div class="chart-title">用户活跃度分布</div>
            <div ref="activityChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <div class="user-list-section">
      <el-card>
        <div class="card-header">
          <span>用户列表</span>
          <el-button type="primary" size="small" @click="refreshUserData" :loading="loading">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
        <el-table :data="userList" v-loading="loading" stripe>
          <el-table-column prop="name" label="姓名" width="120" />
          <el-table-column prop="email" label="邮箱" />
          <el-table-column prop="room" label="寝室" width="120" />
          <el-table-column prop="totalExpense" label="总消费" width="120">
            <template #default="scope">
              ¥{{ scope.row.totalExpense }}
            </template>
          </el-table-column>
          <el-table-column prop="expenseCount" label="消费次数" width="120" />
          <el-table-column prop="lastActive" label="最后活跃" width="150" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="scope">
              <el-tag :type="scope.row.status === '活跃' ? 'success' : 'info'">
                {{ scope.row.status }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, defineProps } from 'vue'
import { ElMessage } from 'element-plus'
import { User, UserFilled, Plus, Money, Refresh } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { userApi } from '@/api/user'
import UserGrowthChart from '../charts/UserGrowthChart.vue'

// Props
const props = defineProps({
  dateRange: {
    type: Array,
    default: () => []
  }
})

// 状态
const stats = ref({
  totalUsers: 0,
  activeUsers: 0,
  newUsers: 0,
  avgExpense: 0
})
const userList = ref([])
const loading = ref(false)
const activityChartRef = ref(null)
let activityChartInstance = null

// 方法
/**
 * 刷新用户数据（包括用户列表、统计数据和图表）
 */
const refreshUserData = async () => {
  loading.value = true
  try {
    // 并行获取所有数据
    await Promise.all([
      fetchUserStats(),
      fetchUserList(),
      updateActivityChart()
    ])
    
    ElMessage.success('用户数据刷新成功')
  } catch (error) {
    console.error('刷新用户数据失败:', error)
    ElMessage.error('刷新用户数据失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

/**
 * 获取用户统计数据
 */
const fetchUserStats = async () => {
  if (!props.dateRange || props.dateRange.length !== 2) return
  
  loading.value = true
  try {
    const params = {
      startDate: props.dateRange[0],
      endDate: props.dateRange[1]
    }
    
    // 模拟API调用，实际项目中应该调用真实的API
    // const response = await userApi.getUserStats(params)
    
    // 模拟数据
    stats.value = {
      totalUsers: 156,
      activeUsers: 98,
      newUsers: 12,
      avgExpense: 340.50
    }
  } catch (error) {
    console.error('获取用户统计数据失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 获取用户列表
 */
const fetchUserList = async () => {
  loading.value = true
  try {
    // 实际项目中应该调用真实的API
    // const response = await userApi.getUserList()
    // userList.value = response.data
  } catch (error) {
    console.error('获取用户列表失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 初始化用户活跃度图表
 */
const initActivityChart = () => {
  if (activityChartRef.value) {
    activityChartInstance = echarts.init(activityChartRef.value)
    updateActivityChart()
  }
}

/**
 * 更新用户活跃度图表
 */
const updateActivityChart = async () => {
  if (!activityChartInstance) return
  
  try {
    // 实际项目中应该调用真实的API获取数据
    // const response = await userApi.getUserActivityStats()
    // const data = response.data
    
    // 暂时使用模拟数据
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: {c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        data: ['非常活跃', '活跃', '一般', '不活跃']
      },
      series: [
        {
          name: '用户活跃度',
          type: 'pie',
          radius: ['50%', '70%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 10,
            borderColor: '#fff',
            borderWidth: 2
          },
          label: {
            show: false,
            position: 'center'
          },
          emphasis: {
            label: {
              show: true,
              fontSize: '18',
              fontWeight: 'bold'
            }
          },
          labelLine: {
            show: false
          },
          data: [
            { value: 8, name: '非常活跃', itemStyle: { color: '#5470C6' } },
            { value: 15, name: '活跃', itemStyle: { color: '#91CC75' } },
            { value: 3, name: '一般', itemStyle: { color: '#FAC858' } },
            { value: 2, name: '不活跃', itemStyle: { color: '#EE6666' } }
          ]
        }
      ]
    }
    
    activityChartInstance.setOption(option)
  } catch (error) {
    console.error('更新用户活跃度图表失败:', error)
  }
}

/**
 * 调整图表大小
 */
const resizeCharts = () => {
  if (activityChartInstance) {
    activityChartInstance.resize()
  }
}

// 监听日期范围变化
watch(() => props.dateRange, () => {
  fetchUserStats()
}, { deep: true })

// 生命周期
onMounted(() => {
  fetchUserStats()
  fetchUserList()
  initActivityChart()
  window.addEventListener('resize', resizeCharts)
  
  // 监听刷新数据事件
  window.addEventListener('refresh-analytics-data', () => {
    fetchUserStats()
    fetchUserList()
    updateActivityChart()
  })
})

onUnmounted(() => {
  if (activityChartInstance) {
    activityChartInstance.dispose()
  }
  window.removeEventListener('resize', resizeCharts)
  window.removeEventListener('refresh-analytics-data', () => {
    fetchUserStats()
    fetchUserList()
    updateActivityChart()
  })
})
</script>

<style scoped>
.user-analysis-tab {
  padding: 20px;
}

.stats-cards {
  margin-bottom: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  height: 100px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.stat-icon {
  font-size: 40px;
  color: #409EFF;
  opacity: 0.8;
}

.charts-section {
  margin-bottom: 20px;
}

.chart-card {
  height: 350px;
}

.chart-title {
  font-size: 16px;
  font-weight: bold;
  margin-bottom: 15px;
  color: #303133;
}

.chart-container {
  width: 100%;
  height: 280px;
}

.user-list-section {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
</style>