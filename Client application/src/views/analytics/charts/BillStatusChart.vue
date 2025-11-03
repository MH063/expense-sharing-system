<template>
  <div class="bill-status-chart">
    <div ref="chartRef" class="chart-container"></div>
    <div v-if="loading" class="overlay loading-overlay">加载中...</div>
    <div v-else-if="errorMessage" class="overlay error-overlay">{{ errorMessage }}</div>
    <div v-else-if="isEmpty" class="overlay empty-overlay">暂无数据</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, defineProps } from 'vue'
import * as echarts from 'echarts'
import { billForecastApi } from '@/api/bill-forecast'

// Props
const props = defineProps({
  dateRange: {
    type: Array,
    default: () => []
  },
  roomId: {
    type: String,
    default: ''
  }
})

// 状态
const chartRef = ref(null)
let chartInstance = null
const loading = ref(false)
const errorMessage = ref('')
const isEmpty = ref(false)
let resizeTimer = null

// 方法
/**
 * 初始化图表
 */
const initChart = () => {
  if (chartRef.value) {
    chartInstance = echarts.init(chartRef.value)
    updateChart()
  }
}

/**
 * 更新图表数据
 */
const updateChart = async () => {
  if (!chartInstance || !props.dateRange || props.dateRange.length !== 2) return
  
  loading.value = true
  errorMessage.value = ''
  isEmpty.value = false
  try {
    const params = {
      startDate: props.dateRange[0],
      endDate: props.dateRange[1]
    }
    
    if (props.roomId) {
      params.roomId = props.roomId
    }
    
    const response = await billForecastApi.getBillStatusDistribution(params)
    if (response.success && response.data) {
      const { statusData = [] } = response.data
      
      // 准备饼图数据
      const chartData = statusData.map(item => ({
        name: getStatusName(item.status),
        value: item.count
      }))
      
      isEmpty.value = !chartData.length
      
      const option = {
        title: {
          text: '账单状态分布',
          left: 'center'
        },
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
          orient: 'vertical',
          left: 10,
          top: 'center',
          data: chartData.map(item => item.name)
        },
        series: [
          {
            name: '账单状态',
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['60%', '50%'],
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
                fontSize: '16',
                fontWeight: 'bold'
              }
            },
            labelLine: {
              show: false
            },
            data: chartData,
            color: ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C']
          }
        ]
      }
      
      chartInstance.setOption(option)
    } else {
      errorMessage.value = response.message || '获取数据失败'
    }
  } catch (error) {
    console.error('获取账单状态分布数据失败:', error)
    errorMessage.value = '加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

/**
 * 获取状态名称
 */
const getStatusName = (status) => {
  const statusMap = {
    'paid': '已支付',
    'partial': '部分支付',
    'pending': '待支付',
    'overdue': '逾期'
  }
  return statusMap[status] || status
}

/**
 * 调整图表大小（防抖）
 */
const resizeChart = () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    if (chartInstance) chartInstance.resize()
  }, 150)
}

// 监听日期范围变化
watch(() => props.dateRange, () => { updateChart() }, { deep: true })

// 生命周期
onMounted(() => {
  initChart()
  window.addEventListener('resize', resizeChart)
  window.addEventListener('refresh-analytics-data', updateChart)
})

onUnmounted(() => {
  if (chartInstance) chartInstance.dispose()
  window.removeEventListener('resize', resizeChart)
  window.removeEventListener('refresh-analytics-data', updateChart)
  clearTimeout(resizeTimer)
})
</script>

<style scoped>
.bill-status-chart {
  position: relative;
  width: 100%;
  height: 300px;
}

.chart-container {
  width: 100%;
  height: 100%;
}

.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  border-radius: 4px;
}

.loading-overlay {
  background: rgba(255,255,255,0.6);
  color: #606266;
}

.error-overlay {
  background: rgba(254,240,240,0.9);
  color: #f56c6c;
}

.empty-overlay {
  background: rgba(240,249,255,0.6);
  color: #909399;
}
</style>