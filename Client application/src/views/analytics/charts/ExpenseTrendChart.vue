<template>
  <div class="expense-trend-chart">
    <div ref="chartRef" class="chart-container"></div>
    <div v-if="loading" class="overlay loading-overlay">加载中...</div>
    <div v-else-if="errorMessage" class="overlay error-overlay">{{ errorMessage }}</div>
    <div v-else-if="isEmpty" class="overlay empty-overlay">暂无数据</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, defineProps } from 'vue'
import * as echarts from 'echarts'
import { analyticsApi } from '@/api/analytics'

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
      endDate: props.dateRange[1],
      groupBy: 'day'
    }
    
    const response = await analyticsApi.getExpenseTrendsData(params)
    if (response.success) {
      const { dates = [], amounts = [] } = response.data || {}
      isEmpty.value = !dates.length || !amounts.length
      
      const option = {
        tooltip: { trigger: 'axis', formatter: '{b}<br />支出: ¥{c}' },
        xAxis: { type: 'category', data: dates, axisLine: { lineStyle: { color: '#999' } } },
        yAxis: { type: 'value', axisLine: { lineStyle: { color: '#999' } }, splitLine: { lineStyle: { type: 'dashed' } }, axisLabel: { formatter: '¥{value}' } },
        series: [ { name: '支出金额', type: 'line', smooth: true, symbol: 'circle', symbolSize: 8, itemStyle: { color: '#409EFF' }, areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [ { offset: 0, color: 'rgba(64, 158, 255, 0.5)' }, { offset: 1, color: 'rgba(64, 158, 255, 0.1)' } ] } }, data: amounts } ],
        grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true }
      }
      
      chartInstance.setOption(option)
    } else {
      errorMessage.value = response.message || '获取数据失败'
    }
  } catch (error) {
    console.error('获取支出趋势数据失败:', error)
    errorMessage.value = '加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
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
.expense-trend-chart { position: relative; width: 100%; height: 300px; }
.chart-container { width: 100%; height: 100%; }
.overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; border-radius: 4px; }
.loading-overlay { background: rgba(255,255,255,0.6); color: #606266; }
.error-overlay { background: rgba(254,240,240,0.9); color: #f56c6c; }
.empty-overlay { background: rgba(240,249,255,0.6); color: #909399; }
</style>