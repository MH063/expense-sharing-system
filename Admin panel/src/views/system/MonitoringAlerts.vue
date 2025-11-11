<template>
  <div class="monitoring-alerts">
    <div class="page-header">
      <h1>监控告警</h1>
      <div class="header-actions">
        <el-button type="primary" @click="refreshData">
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
        <el-button type="success" @click="executeSystemCheck">
          <el-icon><Search /></el-icon>
          执行系统检查
        </el-button>
      </div>
    </div>

    <!-- 监控指标概览 -->
    <div class="metrics-overview">
      <el-row :gutter="20">
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
    </div>

    <!-- 详细监控指标 -->
    <div class="detailed-metrics">
      <el-row :gutter="20">
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
      
      <el-row :gutter="20" style="margin-top: 20px;">
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
    </div>

    <!-- 告警统计卡片 -->
    <div class="stats-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon critical">
                <el-icon><Warning /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ alertStats.critical || 0 }}</div>
                <div class="stats-label">紧急告警</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon high">
                <el-icon><WarningFilled /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ alertStats.high || 0 }}</div>
                <div class="stats-label">高级告警</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon medium">
                <el-icon><InfoFilled /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ alertStats.medium || 0 }}</div>
                <div class="stats-label">中级告警</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-content">
              <div class="stats-icon low">
                <el-icon><InfoFilled /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ alertStats.low || 0 }}</div>
                <div class="stats-label">低级告警</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 告警列表 -->
    <el-card class="alert-list-card">
      <template #header>
        <div class="card-header">
          <span>告警列表</span>
          <div class="filter-controls">
            <el-select v-model="filters.type" placeholder="告警类型" clearable @change="filterAlerts">
              <el-option label="系统告警" value="system" />
              <el-option label="API告警" value="api" />
              <el-option label="数据库告警" value="database" />
              <el-option label="Redis告警" value="redis" />
              <el-option label="WebSocket告警" value="websocket" />
            </el-select>
            <el-select v-model="filters.level" placeholder="告警级别" clearable @change="filterAlerts">
              <el-option label="低级" value="low" />
              <el-option label="中级" value="medium" />
              <el-option label="高级" value="high" />
              <el-option label="紧急" value="critical" />
            </el-select>
            <el-select v-model="filters.status" placeholder="告警状态" clearable @change="filterAlerts">
              <el-option label="活跃" value="active" />
              <el-option label="已解决" value="resolved" />
              <el-option label="已忽略" value="ignored" />
            </el-select>
          </div>
        </div>
      </template>

      <el-table
        v-loading="loading"
        :data="alerts"
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="level" label="级别" width="80">
          <template #default="scope">
            <el-tag
              :type="getLevelTagType(scope.row.level)"
              size="small"
            >
              {{ getLevelText(scope.row.level) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="120">
          <template #default="scope">
            <el-tag
              :type="getTypeTagType(scope.row.type)"
              size="small"
            >
              {{ getTypeText(scope.row.type) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="200" />
        <el-table-column prop="message" label="消息" min-width="300" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="scope">
            <el-tag
              :type="getStatusTagType(scope.row.status)"
              size="small"
            >
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="scope">
            {{ formatDateTime(scope.row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="scope">
            <el-button
              v-if="scope.row.status === 'active'"
              type="success"
              size="small"
              @click="resolveAlert(scope.row)"
            >
              解决
            </el-button>
            <el-button
              type="primary"
              size="small"
              @click="viewDetails(scope.row)"
            >
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.limit"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="pagination.total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 批量操作 -->
    <div class="batch-operations" v-if="selectedAlerts.length > 0">
      <el-card>
        <div class="batch-actions">
          <span>已选择 {{ selectedAlerts.length }} 条告警</span>
          <el-button type="success" @click="batchResolveAlerts">批量解决</el-button>
          <el-button type="info" @click="batchIgnoreAlerts">批量忽略</el-button>
        </div>
      </el-card>
    </div>

    <!-- 告警详情对话框 -->
    <el-dialog
      v-model="detailsDialog.visible"
      title="告警详情"
      width="60%"
    >
      <div v-if="detailsDialog.alert" class="alert-details">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="告警ID">{{ detailsDialog.alert.id }}</el-descriptions-item>
          <el-descriptions-item label="告警类型">
            <el-tag :type="getTypeTagType(detailsDialog.alert.type)">
              {{ getTypeText(detailsDialog.alert.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="告警级别">
            <el-tag :type="getLevelTagType(detailsDialog.alert.level)">
              {{ getLevelText(detailsDialog.alert.level) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="告警状态">
            <el-tag :type="getStatusTagType(detailsDialog.alert.status)">
              {{ getStatusText(detailsDialog.alert.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="告警标题">{{ detailsDialog.alert.title }}</el-descriptions-item>
          <el-descriptions-item label="告警来源">{{ detailsDialog.alert.source }}</el-descriptions-item>
          <el-descriptions-item label="创建时间" :span="2">{{ formatDateTime(detailsDialog.alert.created_at) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间" :span="2">{{ formatDateTime(detailsDialog.alert.updated_at) }}</el-descriptions-item>
          <el-descriptions-item label="告警消息" :span="2">{{ detailsDialog.alert.message }}</el-descriptions-item>
          <el-descriptions-item v-if="detailsDialog.alert.details" label="详细信息" :span="2">
            <pre>{{ JSON.stringify(detailsDialog.alert.details, null, 2) }}</pre>
          </el-descriptions-item>
          <el-descriptions-item v-if="detailsDialog.alert.resolved_at" label="解决时间">{{ formatDateTime(detailsDialog.alert.resolved_at) }}</el-descriptions-item>
          <el-descriptions-item v-if="detailsDialog.alert.resolved_by" label="解决人">{{ detailsDialog.alert.resolved_by }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="detailsDialog.visible = false">关闭</el-button>
        <el-button
          v-if="detailsDialog.alert && detailsDialog.alert.status === 'active'"
          type="success"
          @click="resolveAlert(detailsDialog.alert)"
        >
          解决告警
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Search, Warning, WarningFilled, InfoFilled, Connection, Coin, Lock, Monitor } from '@element-plus/icons-vue'
import { getAlertStats, getUnresolvedAlerts, getAllAlerts, resolveAlert as resolveAlertApi, executeSystemCheck as executeSystemCheckApi, getMetrics } from '@/api/alerts'

export default {
  name: 'MonitoringAlerts',
  components: {
    Refresh,
    Search,
    Warning,
    WarningFilled,
    InfoFilled,
    Connection,
    Coin,
    Lock,
    Monitor
  },
  setup() {
    // 响应式数据
    const loading = ref(false)
    const alerts = ref([])
    const selectedAlerts = ref([])
    const alertStats = ref({})
    
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
    
    // 分页
    const pagination = reactive({
      page: 1,
      limit: 20,
      total: 0
    })
    
    // 筛选条件
    const filters = reactive({
      type: '',
      level: '',
      status: ''
    })
    
    // 详情对话框
    const detailsDialog = reactive({
      visible: false,
      alert: null
    })

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

    // 获取告警统计
    const fetchAlertStats = async () => {
      try {
        const response = await getAlertStats()
        if (response.success) {
          alertStats.value = response.data.by_level || {}
        }
      } catch (error) {
        console.error('获取告警统计失败:', error)
        ElMessage.error('获取告警统计失败')
      }
    }

    // 获取告警列表
    const fetchAlerts = async () => {
      loading.value = true
      try {
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          ...filters
        }
        
        const response = await getAllAlerts(params)
        if (response.success) {
          alerts.value = response.data.data || []
          pagination.total = response.data.total || 0
        }
      } catch (error) {
        console.error('获取告警列表失败:', error)
        ElMessage.error('获取告警列表失败')
      } finally {
        loading.value = false
      }
    }

    // 获取未解决的告警
    const fetchUnresolvedAlerts = async () => {
      loading.value = true
      try {
        const response = await getUnresolvedAlerts()
        if (response.success) {
          alerts.value = response.data || []
          pagination.total = response.data?.length || 0
        }
      } catch (error) {
        console.error('获取未解决告警失败:', error)
        ElMessage.error('获取未解决告警失败')
      } finally {
        loading.value = false
      }
    }

    // 刷新数据
    const refreshData = () => {
      fetchAlertStats()
      if (filters.status === '' || filters.status === 'active') {
        fetchUnresolvedAlerts()
      } else {
        fetchAlerts()
      }
    }

    // 筛选告警
    const filterAlerts = () => {
      pagination.page = 1
      if (filters.status === '' || filters.status === 'active') {
        fetchUnresolvedAlerts()
      } else {
        fetchAlerts()
      }
    }

    // 执行系统检查
    const executeSystemCheck = async () => {
      try {
        loading.value = true
        const response = await executeSystemCheckApi()
        if (response.success) {
          ElMessage.success('系统检查执行成功')
          refreshData()
        } else {
          ElMessage.error(response.message || '系统检查执行失败')
        }
      } catch (error) {
        console.error('执行系统检查失败:', error)
        ElMessage.error('执行系统检查失败')
      } finally {
        loading.value = false
      }
    }

    // 解决告警
    const resolveAlert = async (alert) => {
      try {
        await ElMessageBox.confirm('确定要解决此告警吗？', '确认操作', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        const response = await resolveAlertApi(alert.id, { resolved_by: 'admin' })
        if (response.success) {
          ElMessage.success('告警已解决')
          refreshData()
          detailsDialog.visible = false
        } else {
          ElMessage.error(response.message || '解决告警失败')
        }
      } catch (error) {
        if (error !== 'cancel') {
          console.error('解决告警失败:', error)
          ElMessage.error('解决告警失败')
        }
      }
    }

    // 批量解决告警
    const batchResolveAlerts = async () => {
      if (selectedAlerts.value.length === 0) {
        ElMessage.warning('请选择要解决的告警')
        return
      }
      
      try {
        await ElMessageBox.confirm(`确定要解决选中的 ${selectedAlerts.value.length} 条告警吗？`, '确认操作', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        const promises = selectedAlerts.value.map(alert => 
          resolveAlertApi(alert.id, { resolved_by: 'admin' })
        )
        
        await Promise.all(promises)
        ElMessage.success('批量解决告警成功')
        refreshData()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('批量解决告警失败:', error)
          ElMessage.error('批量解决告警失败')
        }
      }
    }

    // 批量忽略告警
    const batchIgnoreAlerts = async () => {
      if (selectedAlerts.value.length === 0) {
        ElMessage.warning('请选择要忽略的告警')
        return
      }
      
      try {
        await ElMessageBox.confirm(`确定要忽略选中的 ${selectedAlerts.value.length} 条告警吗？`, '确认操作', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning'
        })
        
        // 这里应该调用批量忽略API，暂时使用批量解决
        const promises = selectedAlerts.value.map(alert => 
          resolveAlertApi(alert.id, { resolved_by: 'admin', status: 'ignored' })
        )
        
        await Promise.all(promises)
        ElMessage.success('批量忽略告警成功')
        refreshData()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('批量忽略告警失败:', error)
          ElMessage.error('批量忽略告警失败')
        }
      }
    }

    // 查看详情
    const viewDetails = (alert) => {
      detailsDialog.alert = alert
      detailsDialog.visible = true
    }

    // 表格选择变化
    const handleSelectionChange = (selection) => {
      selectedAlerts.value = selection
    }

    // 分页大小变化
    const handleSizeChange = (size) => {
      pagination.limit = size
      pagination.page = 1
      filterAlerts()
    }

    // 当前页变化
    const handleCurrentChange = (page) => {
      pagination.page = page
      filterAlerts()
    }

    // 获取级别标签类型
    const getLevelTagType = (level) => {
      const types = {
        low: 'info',
        medium: 'warning',
        high: 'danger',
        critical: 'danger'
      }
      return types[level] || 'info'
    }

    // 获取级别文本
    const getLevelText = (level) => {
      const texts = {
        low: '低级',
        medium: '中级',
        high: '高级',
        critical: '紧急'
      }
      return texts[level] || level
    }

    // 获取类型标签类型
    const getTypeTagType = (type) => {
      const types = {
        system: 'danger',
        api: 'warning',
        database: 'primary',
        redis: 'success',
        websocket: 'info'
      }
      return types[type] || 'info'
    }

    // 获取类型文本
    const getTypeText = (type) => {
      const texts = {
        system: '系统',
        api: 'API',
        database: '数据库',
        redis: 'Redis',
        websocket: 'WebSocket'
      }
      return texts[type] || type
    }

    // 获取状态标签类型
    const getStatusTagType = (status) => {
      const types = {
        active: 'danger',
        resolved: 'success',
        ignored: 'info'
      }
      return types[status] || 'info'
    }

    // 获取状态文本
    const getStatusText = (status) => {
      const texts = {
        active: '活跃',
        resolved: '已解决',
        ignored: '已忽略'
      }
      return texts[status] || status
    }

    // 格式化日期时间
    const formatDateTime = (dateTime) => {
      if (!dateTime) return ''
      return new Date(dateTime).toLocaleString()
    }

    // 组件挂载时获取数据
    onMounted(() => {
      fetchMetrics()
      fetchAlertStats()
      fetchAlerts()
    })

    return {
      loading,
      alerts,
      selectedAlerts,
      alertStats,
      pagination,
      queryParams,
      alertDetail,
      showDetailDialog,
      
      // 监控指标数据
      apiMetrics,
      cacheMetrics,
      securityMetrics,
      systemMetrics,
      apiResponseTimeData,
      cacheHitRateData,
      
      // 方法
      fetchAlerts,
      fetchAlertStats,
      fetchMetrics,
      handleSearch,
      handlePageChange,
      handleSelectionChange,
      handleViewDetail,
      handleResolveAlert,
      handleBatchResolve,
      handleRefresh,
      executeSystemCheck,
      getAlertLevelType,
      getAlertTypeText,
      getAlertStatusText,
      formatDateTime
    }
  }
}
</script>

<style scoped>
.monitoring-alerts {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.stats-cards {
  margin-bottom: 20px;
}

.stats-card {
  height: 100px;
}

.stats-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stats-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 24px;
  color: white;
}

.stats-icon.critical {
  background-color: #f56c6c;
}

.stats-icon.high {
  background-color: #e6a23c;
}

.stats-icon.medium {
  background-color: #409eff;
}

.stats-icon.low {
  background-color: #909399;
}

.stats-info {
  flex: 1;
}

.stats-value {
  font-size: 28px;
  font-weight: bold;
  line-height: 1;
  margin-bottom: 5px;
}

.stats-label {
  font-size: 14px;
  color: #909399;
}

.alert-list-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.filter-controls {
  display: flex;
  gap: 10px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.batch-operations {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.alert-details pre {
  background-color: #f5f7fa;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
}
</style>