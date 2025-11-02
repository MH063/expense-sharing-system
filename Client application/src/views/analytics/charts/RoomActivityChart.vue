<template>
  <div class="room-activity-chart">
    <div ref="chartRef" class="chart-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, defineProps } from 'vue'
import * as echarts from 'echarts'
import { roomsApi } from '@/api/rooms'

// Props
const props = defineProps({
  dateRange: {
    type: Array,
    default: () => []
  }
})

// 状态
const chartRef = ref(null)
let chartInstance = null
const loading = ref(false)

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
  try {
    const params = {
      startDate: props.dateRange[0],
      endDate: props.dateRange[1],
      limit: 10
    }
    
    // 模拟API调用，实际项目中应该调用真实的API
    // const response = await roomsApi.getRoomActivity(params)
    
    // 模拟数据
    const rooms = [
      { name: '302寝室', activity: 95, expenses: 5800 },
      { name: '205寝室', activity: 88, expenses: 4200 },
      { name: '418寝室', activity: 76, expenses: 3500 },
      { name: '101寝室', activity: 65, expenses: 2800 },
      { name: '312寝室', activity: 58, expenses: 2200 },
      { name: '227寝室', activity: 45, expenses: 1800 },
      { name: '509寝室', activity: 38, expenses: 1500 },
      { name: '403寝室', activity: 30, expenses: 1200 }
    ]
    
    const option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: (params) => {
          let result = params[0].name + '<br/>'
          params.forEach(param => {
            if (param.seriesName === '活跃度') {
              result += `${param.seriesName}: ${param.value}%<br/>`
            } else {
              result += `${param.seriesName}: ¥${param.value}<br/>`
            }
          })
          return result
        }
      },
      legend: {
        data: ['活跃度', '支出金额']
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'value',
        max: 100,
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        },
        splitLine: {
          lineStyle: {
            type: 'dashed'
          }
        }
      },
      yAxis: {
        type: 'category',
        data: rooms.map(room => room.name),
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        }
      },
      series: [
        {
          name: '活跃度',
          type: 'bar',
          itemStyle: {
            color: '#409EFF'
          },
          data: rooms.map(room => room.activity)
        },
        {
          name: '支出金额',
          type: 'bar',
          itemStyle: {
            color: '#67C23A'
          },
          data: rooms.map(room => (room.expenses / 100).toFixed(1))
        }
      ]
    }
    
    chartInstance.setOption(option)
  } catch (error) {
    console.error('获取房间活跃度数据失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 调整图表大小
 */
const resizeChart = () => {
  if (chartInstance) {
    chartInstance.resize()
  }
}

// 监听日期范围变化
watch(() => props.dateRange, () => {
  updateChart()
}, { deep: true })

// 生命周期
onMounted(() => {
  initChart()
  window.addEventListener('resize', resizeChart)
  
  // 监听刷新数据事件
  window.addEventListener('refresh-analytics-data', updateChart)
})

onUnmounted(() => {
  if (chartInstance) {
    chartInstance.dispose()
  }
  window.removeEventListener('resize', resizeChart)
  window.removeEventListener('refresh-analytics-data', updateChart)
})
</script>

<style scoped>
.room-activity-chart {
  width: 100%;
  height: 300px;
}

.chart-container {
  width: 100%;
  height: 100%;
}
</style>