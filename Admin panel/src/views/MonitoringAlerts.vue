<template>
  <div class="monitoring-alerts">
    <div class="page-header">
      <h1>监控告警</h1>
      <p>系统监控指标和告警信息</p>
    </div>

    <!-- 监控指标概览 -->
    <el-row :gutter="20" class="metrics-overview">
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-item">
            <div class="metric-icon api">
              <el-icon><Connection /></el-icon>
            </div>
            <div class="metric-info">
              <div class="metric-title">API响应时间</div>
              <div class="metric-value">{{ apiMetrics.avgResponseTime }}ms</div>
              <div class="metric-status" :class="getApiStatusClass()">
                {{ getApiStatusText() }}
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-item">
            <div class="metric-icon cache">
              <el-icon><Coin /></el-icon>
            </div>
            <div class="metric-info">
              <div class="metric-title">缓存命中率</div>
              <div class="metric-value">{{ cacheMetrics.hitRate }}%</div>
              <div class="metric-status" :class="getCacheStatusClass()">
                {{ getCacheStatusText() }}
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-item">
            <div class="metric-icon security">
              <el-icon><Lock /></el-icon>
            </div>
            <div class="metric-info">
              <div class="metric-title">安全事件</div>
              <div class="metric-value">{{ securityMetrics.totalEvents }}</div>
              <div class="metric-status" :class="getSecurityStatusClass()">
                {{ getSecurityStatusText() }}
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="6">
        <el-card class="metric-card">
          <div class="metric-item">
            <div class="metric-icon system">
              <el-icon><Monitor /></el-icon>
            </div>
            <div class="metric-info">
              <div class="metric-title">系统资源</div>
              <div class="metric-value">{{ systemMetrics.cpuUsage }}%</div>
              <div class="metric-status" :class="getSystemStatusClass()">
                {{ getSystemStatusText() }}
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 详细监控指标 -->
    <el-row :gutter="20" class="detailed-metrics">
      <el-col :span="12">
        <el-card header="API性能指标">
          <div class="metric-chart">
            <div class="chart-placeholder">
              <p>API响应时间趋势图</p>
              <div class="mock-chart">
                <div class="chart-bar" v-for="(value, index) in apiResponseTimeData" :key="index" :style="{ height: value + '%' }"></div>
              </div>
            </div>
          </div>
          <div class="metric-details">
            <div class="detail-item">
              <span>平均响应时间:</span>
              <span>{{ apiMetrics.avgResponseTime }}ms</span>
            </div>
            <div class="detail-item">
              <span>最大响应时间:</span>
              <span>{{ apiMetrics.maxResponseTime }}ms</span>
            </div>
            <div class="detail-item">
              <span>错误率:</span>
              <span>{{ apiMetrics.errorRate }}%</span>
            </div>
            <div class="detail-item">
              <span>总请求数:</span>
              <span>{{ apiMetrics.totalRequests }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card header="缓存性能指标">
          <div class="metric-chart">
            <div class="chart-placeholder">
              <p>缓存命中率趋势图</p>
              <div class="mock-chart">
                <div class="chart-bar" v-for="(value, index) in cacheHitRateData" :key="index" :style="{ height: value + '%' }"></div>
              </div>
            </div>
          </div>
          <div class="metric-details">
            <div class="detail-item">
              <span>当前命中率:</span>
              <span>{{ cacheMetrics.hitRate }}%</span>
            </div>
            <div class="detail-item">
              <span>命中次数:</span>
              <span>{{ cacheMetrics.hits }}</span>
            </div>
            <div class="detail-item">
              <span>未命中次数:</span>
              <span>{{ cacheMetrics.misses }}</span>
            </div>
            <div class="detail-item">
              <span>内存使用:</span>
              <span>{{ cacheMetrics.usedMemoryHuman }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="detailed-metrics">
      <el-col :span="12">
        <el-card header="安全事件统计">
          <div class="metric-chart">
            <div class="chart-placeholder">
              <p>安全事件类型分布</p>
              <div class="security-events">
                <div class="event-type" v-for="(event, index) in securityMetrics.eventTypes" :key="index">
                  <span>{{ event.type }}:</span>
                  <span>{{ event.count }}</span>
                </div>
              </div>
            </div>
          </div>
          <div class="metric-details">
            <div class="detail-item">
              <span>总事件数:</span>
              <span>{{ securityMetrics.totalEvents }}</span>
            </div>
            <div class="detail-item">
              <span>高风险事件:</span>
              <span>{{ securityMetrics.highRiskEvents }}</span>
            </div>
            <div class="detail-item">
              <span>最近一小时:</span>
              <span>{{ securityMetrics.hourlyEvents }}</span>
            </div>
            <div class="detail-item">
              <span>最近24小时:</span>
              <span>{{ securityMetrics.dailyEvents }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :span="12">
        <el-card header="系统资源使用">
          <div class="metric-chart">
            <div class="chart-placeholder">
              <p>系统资源使用情况</p>
              <div class="resource-usage">
                <div class="resource-item">
                  <span>CPU使用率:</span>
                  <el-progress :percentage="systemMetrics.cpuUsage" :color="getProgressColor(systemMetrics.cpuUsage)"></el-progress>
                </div>
                <div class="resource-item">
                  <span>内存使用率:</span>
                  <el-progress :percentage="systemMetrics.memoryUsage" :color="getProgressColor(systemMetrics.memoryUsage)"></el-progress>
                </div>
                <div class="resource-item">
                  <span>磁盘使用率:</span>
                  <el-progress :percentage="systemMetrics.diskUsage" :color="getProgressColor(systemMetrics.diskUsage)"></el-progress>
                </div>
              </div>
            </div>
          </div>
          <div class="metric-details">
            <div class="detail-item">
              <span>CPU核心数:</span>
              <span>{{ systemMetrics.cpuCores }}</span>
            </div>
            <div class="detail-item">
              <span>总内存:</span>
              <span>{{ formatBytes(systemMetrics.totalMemory) }}</span>
            </div>
            <div class="detail-item">
              <span>已用内存:</span>
              <span>{{ formatBytes(systemMetrics.usedMemory) }}</span>
            </div>
            <div class="detail-item">
              <span>系统运行时间:</span>
              <span>{{ formatUptime(systemMetrics.uptime) }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 告警列表 -->
    <el-card header="最新告警" class="alerts-section">
      <el-table :data="alerts" style="width: 100%">
        <el-table-column prop="level" label="级别" width="100">
          <template #default="scope">
            <el-tag :type="getAlertLevelType(scope.row.level)">{{ scope.row.level }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="120"></el-table-column>
        <el-table-column prop="title" label="标题"></el-table-column>
        <el-table-column prop="message" label="消息"></el-table-column>
        <el-table-column prop="createdAt" label="时间" width="180">
          <template #default="scope">
            {{ formatDateTime(scope.row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button size="small" type="primary" @click="resolveAlert(scope.row.id)">解决</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <div class="pagination">
        <el-pagination
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
          :current-page="pagination.currentPage"
          :page-sizes="[10, 20, 50, 100]"
          :page-size="pagination.pageSize"
          layout="total, sizes, prev, pager, next, jumper"
          :total="pagination.total">
        </el-pagination>
      </div>
    </el-card>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Connection, Coin, Lock, Monitor } from '@element-plus/icons-vue'
import { getAlerts, resolveAlert as resolveAlertApi, getMetrics } from '@/api/alerts'

export default {
  name: 'MonitoringAlerts',
  components: {
    Connection,
    Coin,
    Lock,
    Monitor
  },
  setup() {
    // 响应式数据
    const alerts = ref([])
    const pagination = reactive({
      currentPage: 1,
      pageSize: 10,
      total: 0
    })
    
    // 监控指标数据
    const apiMetrics = reactive({
      avgResponseTime: 0,
      maxResponseTime: 0,
      errorRate: 0,
      totalRequests: 0
    })
    
    const cacheMetrics = reactive({
      hitRate: 0,
      hits: 0,
      misses: 0,
      usedMemoryHuman: '0B'
    })
    
    const securityMetrics = reactive({
      totalEvents: 0,
      highRiskEvents: 0,
      hourlyEvents: 0,
      dailyEvents: 0,
      eventTypes: []
    })
    
    const systemMetrics = reactive({
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      cpuCores: 0,
      totalMemory: 0,
      usedMemory: 0,
      uptime: 0
    })
    
    // 模拟图表数据
    const apiResponseTimeData = ref([30, 45, 60, 35, 80, 45, 30, 65, 40, 55])
    const cacheHitRateData = ref([85, 88, 82, 90, 87, 92, 89, 85, 91, 88])
    
    // 获取告警列表
    const fetchAlerts = async () => {
      try {
        const response = await getAlerts({
          page: pagination.currentPage,
          limit: pagination.pageSize
        })
        
        if (response.success) {
          alerts.value = response.data.alerts
          pagination.total = response.data.total
        } else {
          ElMessage.error('获取告警列表失败')
        }
      } catch (error) {
        console.error('获取告警列表失败:', error)
        ElMessage.error('获取告警列表失败')
      }
    }
    
    // 获取监控指标
    const fetchMetrics = async () => {
      try {
        const response = await getMetrics()
        
        if (response.success) {
          const data = response.data
          
          // 更新API指标
          if (data.api) {
            apiMetrics.avgResponseTime = data.api.overall?.overall_avg_response_time || 0
            apiMetrics.maxResponseTime = data.api.overall?.overall_max_response_time || 0
            apiMetrics.errorRate = data.api.overall?.overall_error_rate || 0
            apiMetrics.totalRequests = data.api.overall?.total_requests || 0
          }
          
          // 更新缓存指标
          if (data.cache) {
            cacheMetrics.hitRate = data.cache.hitRate || 0
            cacheMetrics.hits = data.cache.hits || 0
            cacheMetrics.misses = data.cache.misses || 0
            cacheMetrics.usedMemoryHuman = data.cache.usedMemoryHuman || '0B'
          }
          
          // 更新安全指标
          if (data.security) {
            securityMetrics.totalEvents = data.security.totalHourlyEvents || 0
            securityMetrics.highRiskEvents = data.security.totalHighRiskEvents || 0
            securityMetrics.hourlyEvents = data.security.totalHourlyEvents || 0
            securityMetrics.dailyEvents = data.security.daily?.reduce((sum, event) => sum + parseInt(event.event_count), 0) || 0
            securityMetrics.eventTypes = data.security.hourly || []
          }
          
          // 更新系统资源指标
          if (data.systemResources) {
            systemMetrics.cpuUsage = data.systemResources.cpu?.usage || 0
            systemMetrics.memoryUsage = data.systemResources.memory?.usage || 0
            systemMetrics.diskUsage = data.systemResources.disk?.usagePercent || 0
            systemMetrics.cpuCores = data.systemResources.cpu?.cores || 0
            systemMetrics.totalMemory = data.systemResources.memory?.total || 0
            systemMetrics.usedMemory = data.systemResources.memory?.used || 0
            systemMetrics.uptime = data.systemResources.uptime || 0
          }
        } else {
          ElMessage.error('获取监控指标失败')
        }
      } catch (error) {
        console.error('获取监控指标失败:', error)
        ElMessage.error('获取监控指标失败')
      }
    }
    
    // 解决告警
    const resolveAlert = async (alertId) => {
      try {
        const response = await resolveAlertApi(alertId)
        
        if (response.success) {
          ElMessage.success('告警已解决')
          fetchAlerts() // 刷新告警列表
        } else {
          ElMessage.error('解决告警失败')
        }
      } catch (error) {
        console.error('解决告警失败:', error)
        ElMessage.error('解决告警失败')
      }
    }
    
    // 分页处理
    const handleSizeChange = (size) => {
      pagination.pageSize = size
      fetchAlerts()
    }
    
    const handleCurrentChange = (page) => {
      pagination.currentPage = page
      fetchAlerts()
    }
    
    // 状态判断函数
    const getApiStatusClass = () => {
      if (apiMetrics.avgResponseTime > 5000) return 'critical'
      if (apiMetrics.avgResponseTime > 2000) return 'warning'
      return 'normal'
    }
    
    const getApiStatusText = () => {
      if (apiMetrics.avgResponseTime > 5000) return '严重'
      if (apiMetrics.avgResponseTime > 2000) return '警告'
      return '正常'
    }
    
    const getCacheStatusClass = () => {
      if (cacheMetrics.hitRate < 50) return 'critical'
      if (cacheMetrics.hitRate < 80) return 'warning'
      return 'normal'
    }
    
    const getCacheStatusText = () => {
      if (cacheMetrics.hitRate < 50) return '严重'
      if (cacheMetrics.hitRate < 80) return '警告'
      return '正常'
    }
    
    const getSecurityStatusClass = () => {
      if (securityMetrics.highRiskEvents > 5) return 'critical'
      if (securityMetrics.totalEvents > 50) return 'warning'
      return 'normal'
    }
    
    const getSecurityStatusText = () => {
      if (securityMetrics.highRiskEvents > 5) return '严重'
      if (securityMetrics.totalEvents > 50) return '警告'
      return '正常'
    }
    
    const getSystemStatusClass = () => {
      if (systemMetrics.cpuUsage > 90 || systemMetrics.memoryUsage > 90) return 'critical'
      if (systemMetrics.cpuUsage > 80 || systemMetrics.memoryUsage > 80) return 'warning'
      return 'normal'
    }
    
    const getSystemStatusText = () => {
      if (systemMetrics.cpuUsage > 90 || systemMetrics.memoryUsage > 90) return '严重'
      if (systemMetrics.cpuUsage > 80 || systemMetrics.memoryUsage > 80) return '警告'
      return '正常'
    }
    
    // 工具函数
    const getAlertLevelType = (level) => {
      switch (level) {
        case 'critical': return 'danger'
        case 'error': return 'danger'
        case 'warning': return 'warning'
        case 'info': return 'info'
        default: return 'info'
      }
    }
    
    const formatDateTime = (dateString) => {
      const date = new Date(dateString)
      return date.toLocaleString()
    }
    
    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 Bytes'
      const k = 1024
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
      const i = Math.floor(Math.log(bytes) / Math.log(k))
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }
    
    const formatUptime = (seconds) => {
      const days = Math.floor(seconds / 86400)
      const hours = Math.floor((seconds % 86400) / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      
      if (days > 0) {
        return `${days}天 ${hours}小时 ${minutes}分钟`
      } else if (hours > 0) {
        return `${hours}小时 ${minutes}分钟`
      } else {
        return `${minutes}分钟`
      }
    }
    
    const getProgressColor = (percentage) => {
      if (percentage > 90) return '#f56c6c'
      if (percentage > 80) return '#e6a23c'
      return '#67c23a'
    }
    
    // 组件挂载时获取数据
    onMounted(() => {
      fetchAlerts()
      fetchMetrics()
      
      // 设置定时刷新
      const interval = setInterval(() => {
        fetchAlerts()
        fetchMetrics()
      }, 60000) // 每分钟刷新一次
      
      // 组件卸载时清除定时器
      return () => {
        clearInterval(interval)
      }
    })
    
    return {
      alerts,
      pagination,
      apiMetrics,
      cacheMetrics,
      securityMetrics,
      systemMetrics,
      apiResponseTimeData,
      cacheHitRateData,
      fetchAlerts,
      resolveAlert,
      handleSizeChange,
      handleCurrentChange,
      getApiStatusClass,
      getApiStatusText,
      getCacheStatusClass,
      getCacheStatusText,
      getSecurityStatusClass,
      getSecurityStatusText,
      getSystemStatusClass,
      getSystemStatusText,
      getAlertLevelType,
      formatDateTime,
      formatBytes,
      formatUptime,
      getProgressColor
    }
  }
}
</script>

<style scoped>
.monitoring-alerts {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0 0 10px 0;
  font-size: 24px;
  color: #303133;
}

.page-header p {
  margin: 0;
  color: #606266;
}

.metrics-overview {
  margin-bottom: 20px;
}

.metric-card {
  height: 120px;
}

.metric-item {
  display: flex;
  align-items: center;
  height: 100%;
}

.metric-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  color: white;
  font-size: 24px;
}

.metric-icon.api {
  background-color: #409EFF;
}

.metric-icon.cache {
  background-color: #67C23A;
}

.metric-icon.security {
  background-color: #E6A23C;
}

.metric-icon.system {
  background-color: #F56C6C;
}

.metric-info {
  flex: 1;
}

.metric-title {
  font-size: 14px;
  color: #909399;
  margin-bottom: 5px;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.metric-status {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
}

.metric-status.normal {
  background-color: #f0f9ff;
  color: #409EFF;
}

.metric-status.warning {
  background-color: #fdf6ec;
  color: #E6A23C;
}

.metric-status.critical {
  background-color: #fef0f0;
  color: #F56C6C;
}

.detailed-metrics {
  margin-bottom: 20px;
}

.metric-chart {
  height: 200px;
  margin-bottom: 20px;
}

.chart-placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.mock-chart {
  display: flex;
  align-items: flex-end;
  height: 100px;
  width: 80%;
  margin-top: 10px;
}

.chart-bar {
  flex: 1;
  background-color: #409EFF;
  margin: 0 2px;
  min-height: 5px;
}

.security-events {
  width: 100%;
}

.event-type {
  display: flex;
  justify-content: space-between;
  padding: 5px 0;
  border-bottom: 1px solid #ebeef5;
}

.resource-usage {
  width: 100%;
}

.resource-item {
  margin-bottom: 15px;
}

.resource-item span {
  display: block;
  margin-bottom: 5px;
  font-size: 14px;
}

.metric-details {
  display: flex;
  flex-wrap: wrap;
}

.detail-item {
  width: 50%;
  padding: 5px 0;
  font-size: 14px;
  display: flex;
  justify-content: space-between;
}

.alerts-section {
  margin-top: 20px;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}
</style>