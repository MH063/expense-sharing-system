<template>
  <div class="bill-forecast-chart">
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
    
    const response = await billForecastApi.getBillForecast(params)
    if (response.success && response.data) {
      const { historicalData = [], forecastData = [] } = response.data
      
      // 合并历史数据和预测数据
      const allDates = [...historicalData.map(item => item.date), ...forecastData.map(item => item.date)]
      const allAmounts = [...historicalData.map(item => item.amount), ...forecastData.map(item => item.amount)]
      
      // 确定历史数据和预测数据的分界点
      const historicalCount = historicalData.length
      
      isEmpty.value = !allDates.length || !allAmounts.length
      
      const option = {
        title: {
          text: '账单预测分析',
          left: 'center'
        },
        tooltip: {
          trigger: 'axis',
          formatter: function(params) {
            let result = params[0].name + '<br/>'
            params.forEach(param => {
              result += `${param.seriesName}: ¥${param.value}<br/>`
            })
            return result
          }
        },
        legend: {
          data: ['历史账单', '预测账单'],
          top: 30
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: allDates,
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
            name: '历史账单',
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 8,
            itemStyle: {
              color: '#409EFF'
            },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  {
                    offset: 0,
                    color: 'rgba(64, 158, 255, 0.5)'
                  },
                  {
                    offset: 1,
                    color: 'rgba(64, 158, 255, 0.1)'
                  }
                ]
              }
            },
            data: historicalData.map(item => item.amount),
            markLine: {
              silent: true,
              lineStyle: {
                color: '#333'
              },
              label: {
                position: 'end',
                formatter: '预测起点'
              },
              data: [
                {
                  xAxis: historicalCount - 1
                }
              ]
            }
          },
          {
            name: '预测账单',
            type: 'line',
            smooth: true,
            symbol: 'diamond',
            symbolSize: 8,
            itemStyle: {
              color: '#E6A23C'
            },
            lineStyle: {
              type: 'dashed'
            },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  {
                    offset: 0,
                    color: 'rgba(230, 162, 60, 0.5)'
                  },
                  {
                    offset: 1,
                    color: 'rgba(230, 162, 60, 0.1)'
                  }
                ]
              }
            },
            data: Array(historicalCount - 1).fill(null).concat(forecastData.map(item => item.amount))
          }
        ]
      }
      
      chartInstance.setOption(option)
    } else {
      errorMessage.value = response.message || '获取数据失败'
    }
  } catch (error) {
    console.error('获取账单预测数据失败:', error)
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
.bill-forecast-chart {
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