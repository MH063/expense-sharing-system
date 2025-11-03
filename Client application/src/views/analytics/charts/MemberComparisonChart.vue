<template>
  <div class="member-comparison-chart">
    <div ref="chartRef" class="chart-container"></div>
    <div v-if="loading" class="overlay loading-overlay">加载中...</div>
    <div v-else-if="errorMessage" class="overlay error-overlay">{{ errorMessage }}</div>
    <div v-else-if="isEmpty" class="overlay empty-overlay">暂无数据</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, defineProps } from 'vue'
import * as echarts from 'echarts'

// Props
const props = defineProps({
  dateRange: { type: Array, default: () => [] }
})

// 状态
const chartRef = ref(null)
let chartInstance = null
const loading = ref(false)
const errorMessage = ref('')
const isEmpty = ref(false)
let resizeTimer = null

// 方法
const initChart = () => {
  if (chartRef.value) {
    chartInstance = echarts.init(chartRef.value)
    updateChart()
  }
}

const updateChart = async () => {
  if (!chartInstance || !props.dateRange || props.dateRange.length !== 2) return
  loading.value = true
  errorMessage.value = ''
  isEmpty.value = false
  try {
    // 这里仍使用演示数据；如需真实数据，请接入 API
    const members = [
      { name: '张三', paid: 3500, shared: 2800, balance: 700 },
      { name: '李四', paid: 2200, shared: 2500, balance: -300 },
      { name: '王五', paid: 1800, shared: 1600, balance: 200 },
      { name: '赵六', paid: 1200, shared: 1800, balance: -600 }
    ]
    isEmpty.value = members.length === 0

    const option = {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: { data: ['已支付', '已分摊', '余额'] },
      grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
      xAxis: { type: 'category', data: members.map(m => m.name), axisLine: { lineStyle: { color: '#999' } } },
      yAxis: { type: 'value', axisLine: { lineStyle: { color: '#999' } }, splitLine: { lineStyle: { type: 'dashed' } }, axisLabel: { formatter: '¥{value}' } },
      series: [
        { name: '已支付', type: 'bar', stack: 'total', itemStyle: { color: '#409EFF' }, data: members.map(m => m.paid) },
        { name: '已分摊', type: 'bar', stack: 'total', itemStyle: { color: '#67C23A' }, data: members.map(m => m.shared) },
        { name: '余额', type: 'bar', itemStyle: { color: (p) => (p.value >= 0 ? '#E6A23C' : '#F56C6C') }, data: members.map(m => m.balance) }
      ]
    }
    chartInstance.setOption(option)
  } catch (e) {
    console.error('获取成员消费对比数据失败:', e)
    errorMessage.value = '加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

const resizeChart = () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => { if (chartInstance) chartInstance.resize() }, 150)
}

watch(() => props.dateRange, () => { updateChart() }, { deep: true })

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
.member-comparison-chart { position: relative; width: 100%; height: 300px; }
.chart-container { width: 100%; height: 100%; }
.overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 14px; border-radius: 4px; }
.loading-overlay { background: rgba(255,255,255,0.6); color: #606266; }
.error-overlay { background: rgba(254,240,240,0.9); color: #f56c6c; }
.empty-overlay { background: rgba(240,249,255,0.6); color: #909399; }
</style>