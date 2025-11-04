<template>
  <div class="room-analysis-tab">
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
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, defineProps } from 'vue'
import * as echarts from 'echarts'
import { roomsApi } from '@/api/rooms'
import { House, HomeFilled, User, Money, Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import RoomActivityChart from '../charts/RoomActivityChart.vue'

// Props
const props = defineProps({
  dateRange: {
    type: Array,
    default: () => []
  }
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
  if (!props.dateRange || props.dateRange.length !== 2) return
  
  loading.value = true
  try {
    const params = {
      startDate: props.dateRange[0],
      endDate: props.dateRange[1]
    }
    
    // 模拟API调用，实际项目中应该调用真实的API
    // const response = await roomsApi.getRoomStats(params)
    
    // 模拟数据
    stats.value = {
      totalRooms: 12,
      activeRooms: 10,
      avgMembers: 4,
      avgRoomExpense: 5250
    }
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
  loading.value = true
  try {
    // 模拟API调用，实际项目中应该调用真实的API
    // const response = await roomsApi.getRoomList()
    
    // 模拟数据
    roomList.value = [
      { 
        name: '101', 
        members: ['张三', '王五', '孙七', '周九'], 
        totalExpense: 5300, 
        expenseCount: 18, 
        lastActive: '2023-06-15', 
        status: '活跃' 
      },
      { 
        name: '102', 
        members: ['李四', '钱七', '吴十'], 
        totalExpense: 5000, 
        expenseCount: 15, 
        lastActive: '2023-06-14', 
        status: '活跃' 
      },
      { 
        name: '103', 
        members: ['赵六', '郑十一', '冯十二', '陈十三'], 
        totalExpense: 4600, 
        expenseCount: 12, 
        lastActive: '2023-06-10', 
        status: '一般' 
      },
      { 
        name: '104', 
        members: ['褚十四', '卫十五'], 
        totalExpense: 2800, 
        expenseCount: 8, 
        lastActive: '2023-06-08', 
        status: '一般' 
      },
      { 
        name: '105', 
        members: ['蒋十六', '沈十七', '韩十八', '杨十九'], 
        totalExpense: 6200, 
        expenseCount: 20, 
        lastActive: '2023-06-15', 
        status: '活跃' 
      }
    ]
  } catch (error) {
    console.error('获取寝室列表失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 初始化寝室消费分布图表
 */
const initExpenseChart = () => {
  if (expenseChartRef.value) {
    expenseChartInstance = echarts.init(expenseChartRef.value)
    updateExpenseChart()
  }
}

/**
 * 更新寝室消费分布图表
 */
const updateExpenseChart = () => {
  if (!expenseChartInstance) return
  
  // 模拟数据
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
</style>