<template>
  <div class="expense-category-chart">
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
    // const response = await expenseApi.getExpenseCategories(params)
    
    // 模拟数据
    const categories = [
      { name: '餐饮', value: 3500, color: '#5470c6' },
      { name: '日用品', value: 1200, color: '#91cc75' },
      { name: '交通', value: 800, color: '#fac858' },
      { name: '娱乐', value: 1500, color: '#ee6666' },
      { name: '购物', value: 2000, color: '#73c0de' },
      { name: '其他', value: 600, color: '#3ba272' }
    ]
    
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: ¥{c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        right: 10,
        top: 'center',
        data: categories.map(item => item.name)
      },
      series: [
        {
          name: '支出分类',
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
          data: categories,
          color: categories.map(item => item.color)
        }
      ]
    }
    
    chartInstance.setOption(option)
  } catch (error) {
    console.error('获取支出分类数据失败:', error)
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
.expense-category-chart {
  width: 100%;
  height: 300px;
}

.chart-container {
  width: 100%;
  height: 100%;
}
</style>