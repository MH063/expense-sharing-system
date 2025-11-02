<template>
  <div class="member-comparison-chart">
    <div ref="chartRef" class="chart-container"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, defineProps } from 'vue'
import * as echarts from 'echarts'
import { expenseApi } from '@/api/expenses'

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
      endDate: props.dateRange[1]
    }
    
    // 模拟API调用，实际项目中应该调用真实的API
    // const response = await expenseApi.getMemberExpenseComparison(params)
    
    // 模拟数据
    const members = [
      { name: '张三', paid: 3500, shared: 2800, balance: 700 },
      { name: '李四', paid: 2200, shared: 2500, balance: -300 },
      { name: '王五', paid: 1800, shared: 1600, balance: 200 },
      { name: '赵六', paid: 1200, shared: 1800, balance: -600 }
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
            if (param.seriesName === '余额') {
              const value = param.value
              const color = value >= 0 ? '#67C23A' : '#F56C6C'
              result += `<span style="color:${color}">${param.seriesName}: ¥${value}</span><br/>`
            } else {
              result += `${param.seriesName}: ¥${param.value}<br/>`
            }
          })
          return result
        }
      },
      legend: {
        data: ['已支付', '已分摊', '余额']
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: members.map(member => member.name),
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
        },
        axisLabel: {
          formatter: '¥{value}'
        }
      },
      series: [
        {
          name: '已支付',
          type: 'bar',
          stack: 'total',
          itemStyle: {
            color: '#409EFF'
          },
          data: members.map(member => member.paid)
        },
        {
          name: '已分摊',
          type: 'bar',
          stack: 'total',
          itemStyle: {
            color: '#67C23A'
          },
          data: members.map(member => member.shared)
        },
        {
          name: '余额',
          type: 'bar',
          itemStyle: {
            color: (params) => {
              return params.value >= 0 ? '#E6A23C' : '#F56C6C'
            }
          },
          data: members.map(member => member.balance)
        }
      ]
    }
    
    chartInstance.setOption(option)
  } catch (error) {
    console.error('获取成员消费对比数据失败:', error)
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
.member-comparison-chart {
  width: 100%;
  height: 300px;
}

.chart-container {
  width: 100%;
  height: 100%;
}
</style>