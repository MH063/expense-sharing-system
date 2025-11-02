<template>
  <div class="system-statistics">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1>系统使用统计</h1>
          <p>查看系统使用情况和数据分析</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="exportReport">
            <el-icon><Download /></el-icon>
            导出报告
          </el-button>
          <el-button @click="refreshData">
            <el-icon><Refresh /></el-icon>
            刷新数据
          </el-button>
        </div>
      </el-header>
      
      <el-main class="statistics-content">
        <!-- 时间范围选择 -->
        <el-card class="filter-card">
          <el-form :model="filterForm" inline>
            <el-form-item label="统计时间">
              <el-radio-group v-model="filterForm.timeRange" @change="handleTimeRangeChange">
                <el-radio-button label="today">今日</el-radio-button>
                <el-radio-button label="week">本周</el-radio-button>
                <el-radio-button label="month">本月</el-radio-button>
                <el-radio-button label="quarter">本季度</el-radio-button>
                <el-radio-button label="year">本年</el-radio-button>
                <el-radio-button label="custom">自定义</el-radio-button>
              </el-radio-group>
            </el-form-item>
            
            <el-form-item v-if="filterForm.timeRange === 'custom'" label="日期范围">
              <el-date-picker
                v-model="filterForm.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="filterStatistics">查询</el-button>
              <el-button @click="resetFilter">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
        
        <!-- 统计概览 -->
        <el-row :gutter="20" class="stats-overview">
          <el-col :span="6">
            <el-card class="stat-card">
              <div class="stat-content">
                <div class="stat-icon user-icon">
                  <el-icon><User /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ statisticsData.totalUsers }}</div>
                  <div class="stat-label">总用户数</div>
                  <div class="stat-change" :class="{ 'positive': statisticsData.userChange >= 0, 'negative': statisticsData.userChange < 0 }">
                    <el-icon v-if="statisticsData.userChange >= 0"><CaretTop /></el-icon>
                    <el-icon v-else><CaretBottom /></el-icon>
                    {{ Math.abs(statisticsData.userChange) }}%
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="6">
            <el-card class="stat-card">
              <div class="stat-content">
                <div class="stat-icon expense-icon">
                  <el-icon><Money /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ statisticsData.totalExpenses }}</div>
                  <div class="stat-label">总费用数</div>
                  <div class="stat-change" :class="{ 'positive': statisticsData.expenseChange >= 0, 'negative': statisticsData.expenseChange < 0 }">
                    <el-icon v-if="statisticsData.expenseChange >= 0"><CaretTop /></el-icon>
                    <el-icon v-else><CaretBottom /></el-icon>
                    {{ Math.abs(statisticsData.expenseChange) }}%
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="6">
            <el-card class="stat-card">
              <div class="stat-content">
                <div class="stat-icon amount-icon">
                  <el-icon><Coin /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">¥{{ statisticsData.totalAmount.toLocaleString() }}</div>
                  <div class="stat-label">总金额</div>
                  <div class="stat-change" :class="{ 'positive': statisticsData.amountChange >= 0, 'negative': statisticsData.amountChange < 0 }">
                    <el-icon v-if="statisticsData.amountChange >= 0"><CaretTop /></el-icon>
                    <el-icon v-else><CaretBottom /></el-icon>
                    {{ Math.abs(statisticsData.amountChange) }}%
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="6">
            <el-card class="stat-card">
              <div class="stat-content">
                <div class="stat-icon dispute-icon">
                  <el-icon><Warning /></el-icon>
                </div>
                <div class="stat-info">
                  <div class="stat-value">{{ statisticsData.totalDisputes }}</div>
                  <div class="stat-label">总争议数</div>
                  <div class="stat-change" :class="{ 'positive': statisticsData.disputeChange >= 0, 'negative': statisticsData.disputeChange < 0 }">
                    <el-icon v-if="statisticsData.disputeChange >= 0"><CaretTop /></el-icon>
                    <el-icon v-else><CaretBottom /></el-icon>
                    {{ Math.abs(statisticsData.disputeChange) }}%
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
        
        <!-- 图表区域 -->
        <el-row :gutter="20" class="charts-section">
          <el-col :span="12">
            <el-card class="chart-card">
              <template #header>
                <div class="card-header">
                  <span>用户活跃度趋势</span>
                  <el-radio-group v-model="userActivityChartType" size="small">
                    <el-radio-button label="daily">日</el-radio-button>
                    <el-radio-button label="weekly">周</el-radio-button>
                    <el-radio-button label="monthly">月</el-radio-button>
                  </el-radio-group>
                </div>
              </template>
              <div class="chart-container">
                <!-- 这里应该是一个真实的图表组件，例如 ECharts -->
                <div class="mock-chart">
                  <div class="chart-title">用户活跃度</div>
                  <div class="chart-bars">
                    <div v-for="(item, index) in userActivityData" :key="index" class="chart-bar" :style="{ height: item.value + '%', backgroundColor: item.color }"></div>
                  </div>
                  <div class="chart-labels">
                    <span v-for="(item, index) in userActivityData" :key="index" class="chart-label">{{ item.label }}</span>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="12">
            <el-card class="chart-card">
              <template #header>
                <div class="card-header">
                  <span>费用提交趋势</span>
                  <el-radio-group v-model="expenseTrendChartType" size="small">
                    <el-radio-button label="daily">日</el-radio-button>
                    <el-radio-button label="weekly">周</el-radio-button>
                    <el-radio-button label="monthly">月</el-radio-button>
                  </el-radio-group>
                </div>
              </template>
              <div class="chart-container">
                <!-- 这里应该是一个真实的图表组件，例如 ECharts -->
                <div class="mock-chart">
                  <div class="chart-title">费用提交数量</div>
                  <div class="chart-bars">
                    <div v-for="(item, index) in expenseTrendData" :key="index" class="chart-bar" :style="{ height: item.value + '%', backgroundColor: item.color }"></div>
                  </div>
                  <div class="chart-labels">
                    <span v-for="(item, index) in expenseTrendData" :key="index" class="chart-label">{{ item.label }}</span>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
        
        <el-row :gutter="20" class="charts-section">
          <el-col :span="12">
            <el-card class="chart-card">
              <template #header>
                <div class="card-header">
                  <span>费用类型分布</span>
                  <el-button size="small" @click="refreshExpenseTypeChart">刷新</el-button>
                </div>
              </template>
              <div class="chart-container">
                <!-- 这里应该是一个真实的饼图组件，例如 ECharts -->
                <div class="mock-pie-chart">
                  <div class="pie-center">
                    <div class="pie-value">{{ statisticsData.totalExpenses }}</div>
                    <div class="pie-label">总费用数</div>
                  </div>
                  <div class="pie-segments">
                    <div v-for="(item, index) in expenseTypeData" :key="index" class="pie-segment" :style="{ backgroundColor: item.color, width: item.percentage + '%' }"></div>
                  </div>
                  <div class="pie-legend">
                    <div v-for="(item, index) in expenseTypeData" :key="index" class="legend-item">
                      <span class="legend-color" :style="{ backgroundColor: item.color }"></span>
                      <span class="legend-label">{{ item.name }}: {{ item.value }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="12">
            <el-card class="chart-card">
              <template #header>
                <div class="card-header">
                  <span>争议处理效率</span>
                  <el-button size="small" @click="refreshDisputeEfficiencyChart">刷新</el-button>
                </div>
              </template>
              <div class="chart-container">
                <!-- 这里应该是一个真实的图表组件，例如 ECharts -->
                <div class="mock-line-chart">
                  <div class="chart-title">平均处理时长（小时）</div>
                  <div class="chart-line">
                    <div v-for="(item, index) in disputeEfficiencyData" :key="index" class="line-point" :style="{ left: (index * 20) + '%', bottom: item.value + '%' }">
                      <div class="point-value">{{ item.value }}h</div>
                    </div>
                  </div>
                  <div class="chart-labels">
                    <span v-for="(item, index) in disputeEfficiencyData" :key="index" class="chart-label">{{ item.label }}</span>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
        
        <!-- 详细数据表格 -->
        <el-card class="data-table-card">
          <template #header>
            <div class="card-header">
              <span>详细数据</span>
              <el-radio-group v-model="dataTableType" size="small">
                <el-radio-button label="users">用户数据</el-radio-button>
                <el-radio-button label="expenses">费用数据</el-radio-button>
                <el-radio-button label="disputes">争议数据</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          
          <el-table :data="tableData" style="width: 100%" v-loading="tableLoading">
            <el-table-column prop="id" label="ID" width="80" />
            
            <!-- 用户数据列 -->
            <template v-if="dataTableType === 'users'">
              <el-table-column prop="username" label="用户名" width="120" />
              <el-table-column prop="realName" label="真实姓名" width="120" />
              <el-table-column prop="loginCount" label="登录次数" width="100" />
              <el-table-column prop="submitCount" label="提交次数" width="100" />
              <el-table-column prop="totalAmount" label="总金额" width="120">
                <template #default="scope">
                  ¥{{ scope.row.totalAmount.toLocaleString() }}
                </template>
              </el-table-column>
              <el-table-column prop="lastLoginTime" label="最后登录" width="160" />
            </template>
            
            <!-- 费用数据列 -->
            <template v-else-if="dataTableType === 'expenses'">
              <el-table-column prop="type" label="费用类型" width="120" />
              <el-table-column prop="count" label="数量" width="100" />
              <el-table-column prop="totalAmount" label="总金额" width="120">
                <template #default="scope">
                  ¥{{ scope.row.totalAmount.toLocaleString() }}
                </template>
              </el-table-column>
              <el-table-column prop="averageAmount" label="平均金额" width="120">
                <template #default="scope">
                  ¥{{ scope.row.averageAmount.toLocaleString() }}
                </template>
              </el-table-column>
              <el-table-column prop="approvedRate" label="通过率" width="100">
                <template #default="scope">
                  {{ scope.row.approvedRate }}%
                </template>
              </el-table-column>
            </template>
            
            <!-- 争议数据列 -->
            <template v-else-if="dataTableType === 'disputes'">
              <el-table-column prop="type" label="争议类型" width="120" />
              <el-table-column prop="count" label="数量" width="100" />
              <el-table-column prop="resolvedCount" label="已解决" width="100" />
              <el-table-column prop="resolutionRate" label="解决率" width="100">
                <template #default="scope">
                  {{ scope.row.resolutionRate }}%
                </template>
              </el-table-column>
              <el-table-column prop="avgProcessTime" label="平均处理时间" width="120">
                <template #default="scope">
                  {{ scope.row.avgProcessTime }}小时
                </template>
              </el-table-column>
            </template>
            
            <el-table-column label="操作" width="120">
              <template #default="scope">
                <el-button type="primary" size="small" @click="viewDetail(scope.row)">查看详情</el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <!-- 分页 -->
          <div class="pagination-container">
            <el-pagination
              v-model:current-page="tablePagination.currentPage"
              v-model:page-size="tablePagination.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="tablePagination.total"
              @size-change="handleTableSizeChange"
              @current-change="handleTableCurrentChange"
            />
          </div>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Download, Refresh, User, Money, Coin, Warning, CaretTop, CaretBottom } from '@element-plus/icons-vue'

// 加载状态
const tableLoading = ref(false)

// 筛选表单
const filterForm = reactive({
  timeRange: 'month',
  dateRange: []
})

// 统计数据
const statisticsData = reactive({
  totalUsers: 156,
  userChange: 12.5,
  totalExpenses: 892,
  expenseChange: 8.3,
  totalAmount: 456780,
  amountChange: 15.2,
  totalDisputes: 23,
  disputeChange: -5.6
})

// 图表类型
const userActivityChartType = ref('daily')
const expenseTrendChartType = ref('daily')
const dataTableType = ref('users')

// 用户活跃度数据
const userActivityData = ref([
  { label: '周一', value: 65, color: '#409EFF' },
  { label: '周二', value: 78, color: '#409EFF' },
  { label: '周三', value: 90, color: '#409EFF' },
  { label: '周四', value: 81, color: '#409EFF' },
  { label: '周五', value: 56, color: '#409EFF' },
  { label: '周六', value: 55, color: '#409EFF' },
  { label: '周日', value: 40, color: '#409EFF' }
])

// 费用趋势数据
const expenseTrendData = ref([
  { label: '周一', value: 45, color: '#67C23A' },
  { label: '周二', value: 52, color: '#67C23A' },
  { label: '周三', value: 38, color: '#67C23A' },
  { label: '周四', value: 65, color: '#67C23A' },
  { label: '周五', value: 48, color: '#67C23A' },
  { label: '周六', value: 30, color: '#67C23A' },
  { label: '周日', value: 25, color: '#67C23A' }
])

// 费用类型数据
const expenseTypeData = ref([
  { name: '餐饮', value: 345, percentage: 38.7, color: '#409EFF' },
  { name: '日用品', value: 223, percentage: 25.0, color: '#67C23A' },
  { name: '水电费', value: 156, percentage: 17.5, color: '#E6A23C' },
  { name: '娱乐', value: 98, percentage: 11.0, color: '#F56C6C' },
  { name: '其他', value: 70, percentage: 7.8, color: '#909399' }
])

// 争议处理效率数据
const disputeEfficiencyData = ref([
  { label: '1月', value: 72 },
  { label: '2月', value: 68 },
  { label: '3月', value: 54 },
  { label: '4月', value: 48 },
  { label: '5月', value: 36 }
])

// 表格数据
const tableData = ref([])

// 表格分页
const tablePagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 用户数据
const usersData = ref([
  { id: 1, username: 'user001', realName: '张三', loginCount: 45, submitCount: 23, totalAmount: 3450, lastLoginTime: '2023-11-15 09:30:00' },
  { id: 2, username: 'user002', realName: '李四', loginCount: 32, submitCount: 18, totalAmount: 2780, lastLoginTime: '2023-11-14 14:20:00' },
  { id: 3, username: 'user003', realName: '王五', loginCount: 28, submitCount: 15, totalAmount: 1890, lastLoginTime: '2023-11-13 16:45:00' },
  { id: 4, username: 'user004', realName: '赵六', loginCount: 56, submitCount: 32, totalAmount: 4560, lastLoginTime: '2023-11-15 11:15:00' },
  { id: 5, username: 'user005', realName: '钱七', loginCount: 23, submitCount: 12, totalAmount: 1230, lastLoginTime: '2023-11-12 10:30:00' }
])

// 费用数据
const expensesData = ref([
  { id: 1, type: '餐饮', count: 345, totalAmount: 23450, averageAmount: 68, approvedRate: 92 },
  { id: 2, type: '日用品', count: 223, totalAmount: 15670, averageAmount: 70, approvedRate: 95 },
  { id: 3, type: '水电费', count: 156, totalAmount: 12340, averageAmount: 79, approvedRate: 98 },
  { id: 4, type: '娱乐', count: 98, totalAmount: 8760, averageAmount: 89, approvedRate: 85 },
  { id: 5, type: '其他', count: 70, totalAmount: 4560, averageAmount: 65, approvedRate: 88 }
])

// 争议数据
const disputesData = ref([
  { id: 1, type: '费用分摊', count: 12, resolvedCount: 10, resolutionRate: 83, avgProcessTime: 24 },
  { id: 2, type: '费用金额', count: 8, resolvedCount: 7, resolutionRate: 87, avgProcessTime: 18 },
  { id: 3, type: '费用类型', count: 3, resolvedCount: 3, resolutionRate: 100, avgProcessTime: 12 }
])

// 时间范围改变
const handleTimeRangeChange = (range) => {
  if (range !== 'custom') {
    filterForm.dateRange = []
  }
}

// 筛选统计数据
const filterStatistics = () => {
  // 模拟API调用
  ElMessage.loading('正在加载统计数据...')
  
  setTimeout(() => {
    // 根据时间范围更新数据
    updateStatisticsData()
    updateChartData()
    updateTableData()
    
    ElMessage.success('统计数据加载完成')
  }, 1000)
}

// 重置筛选
const resetFilter = () => {
  filterForm.timeRange = 'month'
  filterForm.dateRange = []
  filterStatistics()
}

// 刷新数据
const refreshData = () => {
  filterStatistics()
}

// 导出报告
const exportReport = () => {
  ElMessage.loading('正在生成报告...')
  
  setTimeout(() => {
    ElMessage.success('报告导出成功')
  }, 2000)
}

// 更新统计数据
const updateStatisticsData = () => {
  // 根据时间范围更新统计数据
  // 这里只是模拟，实际应该调用API
}

// 更新图表数据
const updateChartData = () => {
  // 根据时间范围更新图表数据
  // 这里只是模拟，实际应该调用API
}

// 更新表格数据
const updateTableData = () => {
  tableLoading.value = true
  
  setTimeout(() => {
    // 根据当前选择的表格类型加载数据
    switch (dataTableType.value) {
      case 'users':
        tableData.value = [...usersData.value]
        tablePagination.total = usersData.value.length
        break
      case 'expenses':
        tableData.value = [...expensesData.value]
        tablePagination.total = expensesData.value.length
        break
      case 'disputes':
        tableData.value = [...disputesData.value]
        tablePagination.total = disputesData.value.length
        break
    }
    
    tableLoading.value = false
  }, 500)
}

// 刷新费用类型图表
const refreshExpenseTypeChart = () => {
  ElMessage.loading('正在刷新费用类型图表...')
  
  setTimeout(() => {
    // 模拟数据更新
    expenseTypeData.value = expenseTypeData.value.map(item => ({
      ...item,
      value: Math.floor(Math.random() * 100) + 50
    }))
    
    ElMessage.success('费用类型图表已刷新')
  }, 500)
}

// 刷新争议效率图表
const refreshDisputeEfficiencyChart = () => {
  ElMessage.loading('正在刷新争议处理效率图表...')
  
  setTimeout(() => {
    // 模拟数据更新
    disputeEfficiencyData.value = disputeEfficiencyData.value.map(item => ({
      ...item,
      value: Math.floor(Math.random() * 50) + 20
    }))
    
    ElMessage.success('争议处理效率图表已刷新')
  }, 500)
}

// 查看详情
const viewDetail = (row) => {
  ElMessage.info(`查看详情: ${row.id}`)
}

// 表格大小改变
const handleTableSizeChange = (size) => {
  tablePagination.pageSize = size
  updateTableData()
}

// 表格当前页改变
const handleTableCurrentChange = (page) => {
  tablePagination.currentPage = page
  updateTableData()
}

// 监听表格类型变化
const watchDataTableType = computed(() => {
  updateTableData()
  return dataTableType.value
})

// 组件挂载时加载数据
onMounted(() => {
  filterStatistics()
})
</script>

<style scoped>
.system-statistics {
  height: 100vh;
  overflow: hidden;
}

.page-header {
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.header-content h1 {
  margin: 0 0 5px 0;
  color: #303133;
}

.header-content p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.statistics-content {
  padding: 20px;
  overflow-y: auto;
}

.filter-card {
  margin-bottom: 20px;
}

.stats-overview {
  margin-bottom: 20px;
}

.stat-card {
  height: 120px;
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 15px;
  color: white;
  font-size: 24px;
}

.user-icon {
  background-color: #409EFF;
}

.expense-icon {
  background-color: #67C23A;
}

.amount-icon {
  background-color: #E6A23C;
}

.dispute-icon {
  background-color: #F56C6C;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 5px;
}

.stat-change {
  font-size: 12px;
  display: flex;
  align-items: center;
}

.stat-change.positive {
  color: #67C23A;
}

.stat-change.negative {
  color: #F56C6C;
}

.charts-section {
  margin-bottom: 20px;
}

.chart-card {
  height: 400px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 320px;
  position: relative;
}

/* 模拟图表样式 */
.mock-chart {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.chart-title {
  text-align: center;
  margin-bottom: 10px;
  font-weight: bold;
  color: #303133;
}

.chart-bars {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 200px;
  padding: 0 10px;
}

.chart-bar {
  width: 30px;
  min-height: 10px;
  border-radius: 3px 3px 0 0;
}

.chart-labels {
  display: flex;
  justify-content: space-around;
  margin-top: 10px;
}

.chart-label {
  font-size: 12px;
  color: #606266;
}

/* 模拟饼图样式 */
.mock-pie-chart {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.pie-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.pie-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
}

.pie-label {
  font-size: 14px;
  color: #606266;
}

.pie-segments {
  width: 100%;
  height: 20px;
  display: flex;
  margin-bottom: 20px;
}

.pie-segment {
  height: 100%;
  border-radius: 10px;
}

.pie-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 15px;
}

.legend-item {
  display: flex;
  align-items: center;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  margin-right: 5px;
}

.legend-label {
  font-size: 12px;
  color: #606266;
}

/* 模拟折线图样式 */
.mock-line-chart {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.chart-line {
  position: relative;
  height: 200px;
  border-bottom: 1px solid #DCDFE6;
  border-left: 1px solid #DCDFE6;
}

.line-point {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #409EFF;
}

.point-value {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  color: #606266;
  white-space: nowrap;
}

.data-table-card {
  margin-bottom: 20px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}
</style>