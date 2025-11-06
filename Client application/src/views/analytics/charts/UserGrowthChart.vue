<template>
  <div class="user-growth-chart">
    <div ref="chartRef" class="chart-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, defineProps } from 'vue'
import * as echarts from 'echarts'
import { userApi } from '@/api/user'

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
      groupBy: 'day'
    }
    
    // 模拟API调用，实际项目中应该调用真实的API
    // const response = await userApi.getUserGrowth(params)
    
    // 模拟数据
    const dates = []
    const newUsers = []
    const totalUsers = []
    
    const startDate = new Date(props.dateRange[0])
    const endDate = new Date(props.dateRange[1])
    
    // 生成日期序列
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      dates.push(date.toISOString().split('T')[0])
      
      // 模拟数据
      const newCount = Math.floor(Math.random() * 10) + 1
      const totalCount = totalUsers.length > 0 ? totalUsers[totalUsers.length - 1] + newCount : newCount
      
      newUsers.push(newCount)
      totalUsers.push(totalCount)
    }
    
    const option = {
      tooltip: {
        trigger: 'axis',
        formatter: (params) => {
          let result = params[0].name + '<br/>'
          params.forEach(param => {
            result += `${param.seriesName}: ${param.value}<br/>`
          })
          return result
        }
      },
      legend: {
        data: ['新增用户', '累计用户']
      },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        }
      },
      yAxis: {
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
        }
      },
      series: [
        {
          name: '新增用户',
          type: 'bar',
          itemStyle: {
            color: '#67C23A'
          },
          data: newUsers
        },
        {
          name: '累计用户',
          type: 'line',
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: {
            color: '#E6A23C'
          },
          lineStyle: {
            width: 3
          },
          data: totalUsers
        }
      ],
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      }
    }
    
    chartInstance.setOption(option)
  } catch (error) {
      console.error('获取用户增长数据失败:', error)
      // 不再使用模拟数据，直接显示错误信息
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
.user-growth-chart {
  width: 100%;
  height: 300px;
}

.chart-container {
  width: 100%;
  height: 100%;
}
</style>