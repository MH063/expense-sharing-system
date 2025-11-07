<template>
  <div class="room-analysis-tab" v-if="canViewAnalytics">
    <div class="stats-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ stats.totalRooms }}</div>
              <div class="stat-label">总寝室数</div>
            </div>
            <div class="stat-icon">
              <el-icon><House /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ stats.activeRooms }}</div>
              <div class="stat-label">活跃寝室</div>
            </div>
            <div class="stat-icon">
              <el-icon><HomeFilled /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ stats.avgMembers }}</div>
              <div class="stat-label">平均人数</div>
            </div>
            <div class="stat-icon">
              <el-icon><User /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ stats.avgRoomExpense }}</div>
              <div class="stat-label">寝室均消费</div>
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
            <div class="chart-title">寝室活跃度</div>
            <RoomActivityChart :date-range="dateRange" />
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card class="chart-card">
            <div class="chart-title">寝室消费分布</div>
            <div ref="expenseChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <div class="room-list-section">
      <el-card>
        <div class="card-header">
          <span>寝室列表</span>
          <el-button type="primary" size="small" :loading="loading" @click="refreshRoomData">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
        <el-table :data="roomList" v-loading="loading" stripe>
          <el-table-column prop="name" label="寝室" width="120" />
          <el-table-column prop="members" label="成员" width="200">
            <template #default="scope">
              <el-tag v-for="member in scope.row.members" :key="member" size="small" style="margin-right: 5px;">
                {{ member }}
              </el-tag>
            </template>
          </el-table-column>
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
  
  <!-- 无权限访问提示 -->
  <div v-else class="no-permission-container">
    <div class="no-permission-content">
      <el-icon class="no-permission-icon"><Lock /></el-icon>
      <h2>访问受限</h2>
      <p>您没有权限查看房间分析数据</p>
      <el-button type="primary" @click="$router.push('/dashboard')">返回首页</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, defineProps } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { roomsApi } from '@/api/rooms'
import { House, HomeFilled, User, Money, Refresh, Lock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { PERMISSIONS } from '@/utils/permissions'
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

// 权限检查
const authStore = useAuthStore()
const canViewAnalytics = computed(() => {
  return authStore.hasPermission(PERMISSIONS.SYSTEM_VIEW) || 
         authStore.hasPermission(PERMISSIONS.ROOM_VIEW)
})

// 状态
const stats = ref({
  totalRooms: 0,
  activeRooms: 0,
  avgMembers: 0,
  avgRoomExpense: 0
})
const roomList = ref([])
const loading = ref(false)
const expenseChartRef = ref(null)
let expenseChartInstance = null

// 方法
/**
 * 刷新寝室数据（列表、统计数据和图表）
 */
const refreshRoomData = async () => {
  if (!canViewAnalytics.value) {
    console.log('用户没有权限刷新寝室数据')
    return
  }
  
  loading.value = true
  try {
    // 并行获取所有数据
    await Promise.all([
      fetchRoomStats(),
      fetchRoomList(),
      updateExpenseChart()
    ])
    
    ElMessage.success('寝室数据刷新成功')
  } catch (error) {
    console.error('刷新寝室数据失败:', error)
    ElMessage.error('刷新寝室数据失败')
  } finally {
    loading.value = false
  }
}

/**
 * 获取寝室统计数据
 */
const fetchRoomStats = async () => {
  if (!canViewAnalytics.value) {
    console.log('用户没有权限获取寝室统计数据')
    return
  }
  
  if (!props.dateRange || props.dateRange.length !== 2) return
  
  loading.value = true
  try {
    const params = {
      startDate: props.dateRange[0],
      endDate: props.dateRange[1]
    }
    
    // 模拟API调用，实际项目中应该调用真实的API
    // const response = await roomsApi.getRoomStats(params)
  } catch (error) {
    console.error('获取寝室统计数据失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 获取寝室列表
 */
const fetchRoomList = async () => {
  if (!canViewAnalytics.value) {
    console.log('用户没有权限获取寝室列表')
    return
  }
  
  loading.value = true
  try {
    // 实际项目中应该调用真实的API
    const response = await roomsApi.getRoomList()
    roomList.value = response.data
  } catch (error) {
    console.error('获取寝室列表失败:', error)
    ElMessage.error('获取寝室列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 初始化寝室消费分布图表
 */
const initExpenseChart = () => {
  if (!canViewAnalytics.value) {
    console.log('用户没有权限查看寝室消费分布图表')
    return
  }
  
  if (expenseChartRef.value) {
    expenseChartInstance = echarts.init(expenseChartRef.value)
    updateExpenseChart()
  }
}

/**
   * 更新寝室消费分布图表
   */
  const updateExpenseChart = async () => {
    if (!canViewAnalytics.value) {
      console.log('用户没有权限更新寝室消费分布图表')
      return
    }
    
    if (!expenseChartInstance) return
    
    try {
      // 实际项目中应该调用真实的API获取数据
      // const response = await roomsApi.getRoomExpenseStats()
      // const data = response.data
      
      // 暂时使用模拟数据
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
          type: 'value',
          axisLine: {
            lineStyle: {
              color: '#999'
            }
          },
          splitLine: {
            lineStyle: {
              type: 'dashed'
            }
          },
          axisLabel: {
            formatter: '¥{value}'
          }
        },
        yAxis: {
          type: 'category',
          data: ['105', '101', '102', '103', '104'],
          axisLine: {
            lineStyle: {
              color: '#999'
            }
          }
        },
        series: [
          {
            name: '寝室消费',
            type: 'bar',
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: '#83bff6' },
                { offset: 0.5, color: '#188df0' },
                { offset: 1, color: '#188df0' }
              ])
            },
            emphasis: {
              itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                  { offset: 0, color: '#2378f7' },
                  { offset: 0.7, color: '#2378f7' },
                  { offset: 1, color: '#83bff6' }
                ])
              }
            },
            data: [6200, 5300, 5000, 4600, 2800]
          }
        ]
      }
      
      expenseChartInstance.setOption(option)
    } catch (error) {
      console.error('更新寝室消费分布图表失败:', error)
      ElMessage.error('更新寝室消费分布图表失败')
    }
  }

/**
 * 调整图表大小
 */
const resizeCharts = () => {
  if (expenseChartInstance) {
    expenseChartInstance.resize()
  }
}

// 监听日期范围变化
watch(() => props.dateRange, () => {
  fetchRoomStats()
}, { deep: true })

// 生命周期
onMounted(() => {
  fetchRoomStats()
  fetchRoomList()
  initExpenseChart()
  window.addEventListener('resize', resizeCharts)
  
  // 监听刷新数据事件
  window.addEventListener('refresh-analytics-data', () => {
    fetchRoomStats()
    fetchRoomList()
    updateExpenseChart()
  })
})

onUnmounted(() => {
  if (expenseChartInstance) {
    expenseChartInstance.dispose()
  }
  window.removeEventListener('resize', resizeCharts)
  window.removeEventListener('refresh-analytics-data', () => {
    fetchRoomStats()
    fetchRoomList()
    updateExpenseChart()
  })
})
</script>

<style scoped>
.room-analysis-tab {
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

.room-list-section {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
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