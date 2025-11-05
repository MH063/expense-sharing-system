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
            <el-card class="stat-card" shadow="hover">
              <div class="stat-content">
                <div class="stat-icon user-icon">
                  <el-icon><User /></el-icon>
                  <div class="icon-pulse"></div>
                </div>
                <div class="stat-info">
                  <div class="stat-value" :data-value="statisticsData.totalUsers">{{ statisticsData.totalUsers }}</div>
                  <div class="stat-label">总用户数</div>
                  <div class="stat-change" :class="{ 'positive': statisticsData.userChange >= 0, 'negative': statisticsData.userChange < 0 }">
                    <el-icon v-if="statisticsData.userChange >= 0"><CaretTop /></el-icon>
                    <el-icon v-else><CaretBottom /></el-icon>
                    <span class="change-text">{{ Math.abs(statisticsData.userChange) }}%</span>
                    <span class="change-desc">较上月{{ statisticsData.userChange >= 0 ? '增长' : '减少' }}</span>
                  </div>
                </div>
              </div>
              <div class="stat-glow"></div>
            </el-card>
          </el-col>
          
          <el-col :span="6">
            <el-card class="stat-card" shadow="hover">
              <div class="stat-content">
                <div class="stat-icon expense-icon">
                  <el-icon><Money /></el-icon>
                  <div class="icon-pulse"></div>
                </div>
                <div class="stat-info">
                  <div class="stat-value" :data-value="statisticsData.totalExpenses">{{ statisticsData.totalExpenses }}</div>
                  <div class="stat-label">总费用数</div>
                  <div class="stat-change" :class="{ 'positive': statisticsData.expenseChange >= 0, 'negative': statisticsData.expenseChange < 0 }">
                    <el-icon v-if="statisticsData.expenseChange >= 0"><CaretTop /></el-icon>
                    <el-icon v-else><CaretBottom /></el-icon>
                    <span class="change-text">{{ Math.abs(statisticsData.expenseChange) }}%</span>
                    <span class="change-desc">较上月{{ statisticsData.expenseChange >= 0 ? '增长' : '减少' }}</span>
                  </div>
                </div>
              </div>
              <div class="stat-glow"></div>
            </el-card>
          </el-col>
          
          <el-col :span="6">
            <el-card class="stat-card" shadow="hover">
              <div class="stat-content">
                <div class="stat-icon amount-icon">
                  <el-icon><Coin /></el-icon>
                  <div class="icon-pulse"></div>
                </div>
                <div class="stat-info">
                  <div class="stat-value" :data-value="statisticsData.totalAmount">¥{{ statisticsData.totalAmount.toLocaleString() }}</div>
                  <div class="stat-label">总金额</div>
                  <div class="stat-change" :class="{ 'positive': statisticsData.amountChange >= 0, 'negative': statisticsData.amountChange < 0 }">
                    <el-icon v-if="statisticsData.amountChange >= 0"><CaretTop /></el-icon>
                    <el-icon v-else><CaretBottom /></el-icon>
                    <span class="change-text">{{ Math.abs(statisticsData.amountChange) }}%</span>
                    <span class="change-desc">较上月{{ statisticsData.amountChange >= 0 ? '增长' : '减少' }}</span>
                  </div>
                </div>
              </div>
              <div class="stat-glow"></div>
            </el-card>
          </el-col>
          
          <el-col :span="6">
            <el-card class="stat-card" shadow="hover">
              <div class="stat-content">
                <div class="stat-icon dispute-icon">
                  <el-icon><Warning /></el-icon>
                  <div class="icon-pulse"></div>
                </div>
                <div class="stat-info">
                  <div class="stat-value" :data-value="statisticsData.totalDisputes">{{ statisticsData.totalDisputes }}</div>
                  <div class="stat-label">总争议数</div>
                  <div class="stat-change" :class="{ 'positive': statisticsData.disputeChange >= 0, 'negative': statisticsData.disputeChange < 0 }">
                    <el-icon v-if="statisticsData.disputeChange >= 0"><CaretTop /></el-icon>
                    <el-icon v-else><CaretBottom /></el-icon>
                    <span class="change-text">{{ Math.abs(statisticsData.disputeChange) }}%</span>
                    <span class="change-desc">较上月{{ statisticsData.disputeChange >= 0 ? '增长' : '减少' }}</span>
                  </div>
                </div>
              </div>
              <div class="stat-glow"></div>
            </el-card>
          </el-col>
        </el-row>
        
        <!-- 图表区域 -->
        <el-row :gutter="20" class="charts-section">
          <el-col :span="12">
            <el-card class="chart-card" shadow="hover">
              <template #header>
                <div class="card-header">
                  <span>用户活跃度趋势</span>
                  <el-button-group size="small">
                    <el-button type="primary" :class="{ 'is-active': chartPeriods.userActivity === 'week' }" @click="changeChartPeriod('userActivity', 'week')">周</el-button>
                    <el-button type="primary" :class="{ 'is-active': chartPeriods.userActivity === 'month' }" @click="changeChartPeriod('userActivity', 'month')">月</el-button>
                    <el-button type="primary" :class="{ 'is-active': chartPeriods.userActivity === 'year' }" @click="changeChartPeriod('userActivity', 'year')">年</el-button>
                  </el-button-group>
                </div>
              </template>
              <div class="chart-container">
                <!-- 这里应该是一个真实的图表组件，例如 ECharts -->
                <div class="mock-chart">
                  <div class="chart-title">用户活跃度</div>
                  <div class="chart-bars">
                    <div v-for="(item, index) in userActivityData" :key="index" class="chart-bar" :style="{ height: item.value + '%', backgroundColor: item.color }">
                      <div class="bar-tooltip">{{ item.value }}</div>
                    </div>
                  </div>
                  <div class="chart-labels">
                    <span v-for="(item, index) in userActivityData" :key="index" class="chart-label">{{ item.label }}</span>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="12">
            <el-card class="chart-card" shadow="hover">
              <template #header>
                <div class="card-header">
                  <span>费用提交趋势</span>
                  <el-button-group size="small">
                    <el-button type="primary" :class="{ 'is-active': chartPeriods.expenseTrend === 'week' }" @click="changeChartPeriod('expenseTrend', 'week')">周</el-button>
                    <el-button type="primary" :class="{ 'is-active': chartPeriods.expenseTrend === 'month' }" @click="changeChartPeriod('expenseTrend', 'month')">月</el-button>
                    <el-button type="primary" :class="{ 'is-active': chartPeriods.expenseTrend === 'year' }" @click="changeChartPeriod('expenseTrend', 'year')">年</el-button>
                  </el-button-group>
                </div>
              </template>
              <div class="chart-container">
                <!-- 这里应该是一个真实的图表组件，例如 ECharts -->
                <div class="mock-chart">
                  <div class="chart-title">费用提交数量</div>
                  <div class="chart-bars">
                    <div v-for="(item, index) in expenseTrendData" :key="index" class="chart-bar" :style="{ height: item.value + '%', backgroundColor: item.color }">
                      <div class="bar-tooltip">{{ item.value }}</div>
                    </div>
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
            <el-card class="chart-card" shadow="hover">
              <template #header>
                <div class="card-header">
                  <span>费用类型分布</span>
                  <el-button-group size="small">
                    <el-button type="primary" :class="{ 'is-active': chartPeriods.expenseType === 'week' }" @click="changeChartPeriod('expenseType', 'week')">周</el-button>
                    <el-button type="primary" :class="{ 'is-active': chartPeriods.expenseType === 'month' }" @click="changeChartPeriod('expenseType', 'month')">月</el-button>
                    <el-button type="primary" :class="{ 'is-active': chartPeriods.expenseType === 'year' }" @click="changeChartPeriod('expenseType', 'year')">年</el-button>
                  </el-button-group>
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
            <el-card class="chart-card" shadow="hover">
              <template #header>
                <div class="card-header">
                  <span>争议处理效率</span>
                  <el-button-group size="small">
                    <el-button type="primary" :class="{ 'is-active': chartPeriods.disputeEfficiency === 'week' }" @click="changeChartPeriod('disputeEfficiency', 'week')">周</el-button>
                    <el-button type="primary" :class="{ 'is-active': chartPeriods.disputeEfficiency === 'month' }" @click="changeChartPeriod('disputeEfficiency', 'month')">月</el-button>
                    <el-button type="primary" :class="{ 'is-active': chartPeriods.disputeEfficiency === 'year' }" @click="changeChartPeriod('disputeEfficiency', 'year')">年</el-button>
                  </el-button-group>
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
        <el-card class="data-table-card" shadow="hover">
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
          
          <el-table :data="tableData" style="width: 100%" v-loading="tableLoading" stripe>
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
              background
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

// XLSX动态导入函数
const importXLSX = async () => {
  try {
    const XLSX = await import('xlsx')
    return XLSX.default || XLSX
  } catch (error) {
    console.error('导入XLSX失败:', error)
    ElMessage.error('导出功能不可用，请稍后再试')
    return null
  }
}

// 格式化日期时间
const formatDateTime = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

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

// 图表周期数据
const chartPeriods = ref({
  userActivity: 'month',
  expenseTrend: 'month',
  expenseType: 'month',
  disputeEfficiency: 'month'
})

// 切换图表周期
const changeChartPeriod = (chartType, period) => {
  chartPeriods.value[chartType] = period
  updateChartData()
}
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
  const loadingMessage = ElMessage({ message: '正在加载统计数据...', type: 'info', duration: 0 })
  
  setTimeout(() => {
    // 根据时间范围更新数据
    updateStatisticsData()
    updateChartData()
    updateTableData()
    
    loadingMessage.close()
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
const exportReport = async () => {
  const loadingMessage = ElMessage({ message: '正在生成报告...', type: 'info', duration: 0 })
  
  try {
    const XLSX = await importXLSX()
    if (!XLSX) {
      loadingMessage.close()
      return
    }
    
    // 创建工作簿
    const workbook = XLSX.utils.book_new()
    
    // 概览数据工作表
    const overviewData = [
      ['统计时间范围', getTimeRangeText()],
      ['生成时间', formatDateTime(new Date())],
      [''],
      ['总用户数', statisticsData.totalUsers],
      ['用户增长率', `${statisticsData.userChange}%`],
      ['总费用数', statisticsData.totalExpenses],
      ['费用增长率', `${statisticsData.expenseChange}%`],
      ['总金额', statisticsData.totalAmount],
      ['金额增长率', `${statisticsData.amountChange}%`],
      ['总争议数', statisticsData.totalDisputes],
      ['争议变化率', `${statisticsData.disputeChange}%`]
    ]
    
    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData)
    XLSX.utils.book_append_sheet(workbook, overviewSheet, '统计概览')
    
    // 用户活跃度数据工作表
    const userActivitySheetData = [
      ['时间', '活跃度']
    ]
    userActivityData.value.forEach(item => {
      userActivitySheetData.push([item.label, item.value])
    })
    const userActivitySheet = XLSX.utils.aoa_to_sheet(userActivitySheetData)
    XLSX.utils.book_append_sheet(workbook, userActivitySheet, '用户活跃度')
    
    // 费用趋势数据工作表
    const expenseTrendSheetData = [
      ['时间', '费用数量']
    ]
    expenseTrendData.value.forEach(item => {
      expenseTrendSheetData.push([item.label, item.value])
    })
    const expenseTrendSheet = XLSX.utils.aoa_to_sheet(expenseTrendSheetData)
    XLSX.utils.book_append_sheet(workbook, expenseTrendSheet, '费用趋势')
    
    // 费用类型分布工作表
    const expenseTypeSheetData = [
      ['费用类型', '数量', '占比(%)']
    ]
    expenseTypeData.value.forEach(item => {
      expenseTypeSheetData.push([item.name, item.value, item.percentage])
    })
    const expenseTypeSheet = XLSX.utils.aoa_to_sheet(expenseTypeSheetData)
    XLSX.utils.book_append_sheet(workbook, expenseTypeSheet, '费用类型分布')
    
    // 争议处理效率工作表
    const disputeEfficiencySheetData = [
      ['时间', '处理效率']
    ]
    disputeEfficiencyData.value.forEach(item => {
      disputeEfficiencySheetData.push([item.label, item.value])
    })
    const disputeEfficiencySheet = XLSX.utils.aoa_to_sheet(disputeEfficiencySheetData)
    XLSX.utils.book_append_sheet(workbook, disputeEfficiencySheet, '争议处理效率')
    
    // 根据当前表格类型添加详细数据
    let detailSheetName = ''
    let detailSheetData = []
    
    if (dataTableType.value === 'users') {
      detailSheetName = '用户详情'
      detailSheetData = [
        ['用户ID', '用户名', '真实姓名', '登录次数', '提交次数', '总金额', '最后登录时间']
      ]
      usersData.value.forEach(user => {
        detailSheetData.push([
          user.id,
          user.username,
          user.realName,
          user.loginCount,
          user.submitCount,
          user.totalAmount,
          user.lastLoginTime
        ])
      })
    } else if (dataTableType.value === 'expenses') {
      detailSheetName = '费用详情'
      detailSheetData = [
        ['ID', '费用类型', '数量', '总金额', '平均金额', '通过率(%)']
      ]
      expensesData.value.forEach(expense => {
        detailSheetData.push([
          expense.id,
          expense.type,
          expense.count,
          expense.totalAmount,
          expense.averageAmount,
          expense.approvedRate
        ])
      })
    } else if (dataTableType.value === 'disputes') {
      detailSheetName = '争议详情'
      detailSheetData = [
        ['ID', '争议类型', '数量', '已解决', '解决率(%)', '平均处理时间(小时)']
      ]
      disputesData.value.forEach(dispute => {
        detailSheetData.push([
          dispute.id,
          dispute.type,
          dispute.count,
          dispute.resolvedCount,
          dispute.resolutionRate,
          dispute.avgProcessTime
        ])
      })
    }
    
    if (detailSheetData.length > 1) {
      const detailSheet = XLSX.utils.aoa_to_sheet(detailSheetData)
      XLSX.utils.book_append_sheet(workbook, detailSheet, detailSheetName)
    }
    
    // 生成文件名
    const fileName = `系统统计报告_${getTimeRangeText()}_${formatDateTime(new Date()).replace(/[\/\s:]/g, '-')}.xlsx`
    
    // 导出文件
    XLSX.writeFile(workbook, fileName)
    
    loadingMessage.close()
    ElMessage.success('报告导出成功')
  } catch (error) {
    console.error('导出报告失败:', error)
    loadingMessage.close()
    ElMessage.error('导出报告失败')
  }
}

// 获取时间范围文本
const getTimeRangeText = () => {
  const timeRange = filterForm.timeRange
  switch (timeRange) {
    case 'today': return '今日'
    case 'week': return '本周'
    case 'month': return '本月'
    case 'quarter': return '本季度'
    case 'year': return '本年'
    case 'custom': 
      if (filterForm.dateRange && filterForm.dateRange.length === 2) {
        return `${filterForm.dateRange[0]}至${filterForm.dateRange[1]}`
      }
      return '自定义'
    default: return '本月'
  }
}

// 更新统计数据
const updateStatisticsData = () => {
  // 根据时间范围更新统计数据
  // 这里只是模拟，实际应该调用API
  
  // 模拟根据不同时间范围返回不同数据
  const timeRange = filterForm.timeRange
  
  if (timeRange === 'today') {
    statisticsData.totalUsers = 23
    statisticsData.userChange = 5.2
    statisticsData.totalExpenses = 45
    statisticsData.expenseChange = 3.1
    statisticsData.totalAmount = 12340
    statisticsData.amountChange = 8.7
    statisticsData.totalDisputes = 2
    statisticsData.disputeChange = -10.5
  } else if (timeRange === 'week') {
    statisticsData.totalUsers = 89
    statisticsData.userChange = 8.7
    statisticsData.totalExpenses = 234
    statisticsData.expenseChange = 6.5
    statisticsData.totalAmount = 89760
    statisticsData.amountChange = 12.3
    statisticsData.totalDisputes = 8
    statisticsData.disputeChange = -7.2
  } else if (timeRange === 'month') {
    statisticsData.totalUsers = 156
    statisticsData.userChange = 12.5
    statisticsData.totalExpenses = 892
    statisticsData.expenseChange = 8.3
    statisticsData.totalAmount = 456780
    statisticsData.amountChange = 15.2
    statisticsData.totalDisputes = 23
    statisticsData.disputeChange = -5.6
  } else if (timeRange === 'quarter') {
    statisticsData.totalUsers = 423
    statisticsData.userChange = 18.9
    statisticsData.totalExpenses = 2456
    statisticsData.expenseChange = 14.7
    statisticsData.totalAmount = 1234560
    statisticsData.amountChange = 22.1
    statisticsData.totalDisputes = 67
    statisticsData.disputeChange = -3.4
  } else if (timeRange === 'year') {
    statisticsData.totalUsers = 1234
    statisticsData.userChange = 25.3
    statisticsData.totalExpenses = 7890
    statisticsData.expenseChange = 19.8
    statisticsData.totalAmount = 5678900
    statisticsData.amountChange = 28.5
    statisticsData.totalDisputes = 234
    statisticsData.disputeChange = -2.1
  }
}

// 更新图表数据
const updateChartData = () => {
  // 根据时间范围更新图表数据
  // 这里只是模拟，实际应该调用API
  
  const timeRange = filterForm.timeRange
  
  if (timeRange === 'today') {
    // 今日数据 - 小时级别
    userActivityData.value = [
      { label: '00:00', value: 12, color: '#409EFF' },
      { label: '04:00', value: 8, color: '#409EFF' },
      { label: '08:00', value: 45, color: '#409EFF' },
      { label: '12:00', value: 78, color: '#409EFF' },
      { label: '16:00', value: 65, color: '#409EFF' },
      { label: '20:00', value: 34, color: '#409EFF' },
      { label: '23:00', value: 15, color: '#409EFF' }
    ]
    
    expenseTrendData.value = [
      { label: '00:00', value: 5, color: '#67C23A' },
      { label: '04:00', value: 2, color: '#67C23A' },
      { label: '08:00', value: 15, color: '#67C23A' },
      { label: '12:00', value: 28, color: '#67C23A' },
      { label: '16:00', value: 22, color: '#67C23A' },
      { label: '20:00', value: 12, color: '#67C23A' },
      { label: '23:00', value: 3, color: '#67C23A' }
    ]
  } else if (timeRange === 'week' || timeRange === 'month') {
    // 本周/本月数据 - 日级别
    userActivityData.value = [
      { label: '周一', value: 65, color: '#409EFF' },
      { label: '周二', value: 78, color: '#409EFF' },
      { label: '周三', value: 90, color: '#409EFF' },
      { label: '周四', value: 81, color: '#409EFF' },
      { label: '周五', value: 56, color: '#409EFF' },
      { label: '周六', value: 55, color: '#409EFF' },
      { label: '周日', value: 40, color: '#409EFF' }
    ]
    
    expenseTrendData.value = [
      { label: '周一', value: 45, color: '#67C23A' },
      { label: '周二', value: 52, color: '#67C23A' },
      { label: '周三', value: 38, color: '#67C23A' },
      { label: '周四', value: 65, color: '#67C23A' },
      { label: '周五', value: 48, color: '#67C23A' },
      { label: '周六', value: 30, color: '#67C23A' },
      { label: '周日', value: 25, color: '#67C23A' }
    ]
  } else if (timeRange === 'quarter' || timeRange === 'year') {
    // 本季度/本年数据 - 月级别
    userActivityData.value = [
      { label: '1月', value: 120, color: '#409EFF' },
      { label: '2月', value: 98, color: '#409EFF' },
      { label: '3月', value: 145, color: '#409EFF' },
      { label: '4月', value: 167, color: '#409EFF' },
      { label: '5月', value: 189, color: '#409EFF' },
      { label: '6月', value: 178, color: '#409EFF' },
      { label: '7月', value: 156, color: '#409EFF' }
    ]
    
    expenseTrendData.value = [
      { label: '1月', value: 89, color: '#67C23A' },
      { label: '2月', value: 76, color: '#67C23A' },
      { label: '3月', value: 98, color: '#67C23A' },
      { label: '4月', value: 123, color: '#67C23A' },
      { label: '5月', value: 145, color: '#67C23A' },
      { label: '6月', value: 134, color: '#67C23A' },
      { label: '7月', value: 112, color: '#67C23A' }
    ]
  }
  
  // 更新费用类型数据
  const totalExpense = statisticsData.totalExpenses
  expenseTypeData.value = [
    { name: '餐饮', value: Math.floor(totalExpense * 0.387), percentage: 38.7, color: '#409EFF' },
    { name: '日用品', value: Math.floor(totalExpense * 0.25), percentage: 25.0, color: '#67C23A' },
    { name: '水电费', value: Math.floor(totalExpense * 0.175), percentage: 17.5, color: '#E6A23C' },
    { name: '娱乐', value: Math.floor(totalExpense * 0.11), percentage: 11.0, color: '#F56C6C' },
    { name: '其他', value: Math.floor(totalExpense * 0.078), percentage: 7.8, color: '#909399' }
  ]
  
  // 更新争议处理效率数据
  disputeEfficiencyData.value = [
    { label: '1月', value: 72 },
    { label: '2月', value: 68 },
    { label: '3月', value: 54 },
    { label: '4月', value: 48 },
    { label: '5月', value: 36 }
  ]
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
  const loadingMessage = ElMessage({ message: '正在刷新费用类型图表...', type: 'info', duration: 0 })
  
  setTimeout(() => {
    // 模拟数据更新
    expenseTypeData.value = expenseTypeData.value.map(item => ({
      ...item,
      value: Math.floor(Math.random() * 100) + 50
    }))
    
    loadingMessage.close()
    ElMessage.success('费用类型图表已刷新')
  }, 500)
}

// 刷新争议效率图表
const refreshDisputeEfficiencyChart = () => {
  const loadingMessage = ElMessage({ message: '正在刷新争议处理效率图表...', type: 'info', duration: 0 })
  
  setTimeout(() => {
    // 模拟数据更新
    disputeEfficiencyData.value = disputeEfficiencyData.value.map(item => ({
      ...item,
      value: Math.floor(Math.random() * 50) + 20
    }))
    
    loadingMessage.close()
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
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7ed 100%);
}

.page-header {
  background: linear-gradient(135deg, #409EFF 0%, #67C23A 100%);
  border-bottom: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.header-content h1 {
  margin: 0 0 5px 0;
  color: #ffffff;
  font-weight: 600;
  font-size: 24px;
}

.header-content p {
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.header-actions .el-button {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #ffffff;
  transition: all 0.3s ease;
}

.header-actions .el-button:hover {
  background: rgba(255, 255, 255, 0.3);
  border-color: rgba(255, 255, 255, 0.5);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.statistics-content {
  padding: 24px;
  overflow-y: auto;
  height: calc(100vh - 80px);
}

.filter-card {
  margin-bottom: 24px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: none;
  overflow: hidden;
}

.filter-card :deep(.el-card__body) {
  padding: 20px;
}

.stats-overview {
  margin-bottom: 24px;
}

.stat-card {
  height: 140px;
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  overflow: hidden;
  position: relative;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #409EFF, #67C23A);
}

.stat-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0));
  opacity: 0;
  transition: opacity 0.3s ease;
}

.stat-card:hover .stat-glow {
  opacity: 1;
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 10px;
}

.stat-icon {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 20px;
  color: white;
  font-size: 28px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  position: relative;
  overflow: hidden;
}

.stat-icon::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.3), transparent);
}

.icon-pulse {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.3);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0.95);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.3;
  }
  100% {
    transform: scale(0.95);
    opacity: 0.7;
  }
}

.user-icon {
  background: linear-gradient(135deg, #409EFF, #66b1ff);
}

.expense-icon {
  background: linear-gradient(135deg, #67C23A, #85ce61);
}

.amount-icon {
  background: linear-gradient(135deg, #E6A23C, #ebb563);
}

.dispute-icon {
  background: linear-gradient(135deg, #F56C6C, #f78989);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 5px;
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
  font-weight: 500;
}

.stat-change {
  font-size: 13px;
  display: flex;
  align-items: center;
  font-weight: 500;
}

.stat-change.positive {
  color: #67C23A;
}

.stat-change.negative {
  color: #F56C6C;
}

.charts-section {
  margin-bottom: 24px;
}

.chart-card {
  height: 420px;
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.chart-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
}

.chart-card :deep(.el-card__header) {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 340px;
  position: relative;
  padding: 10px;
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
  margin-bottom: 15px;
  font-weight: bold;
  color: #303133;
  font-size: 16px;
}

.chart-bars {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 220px;
  padding: 0 10px;
}

.chart-bar {
  width: 35px;
  min-height: 10px;
  border-radius: 4px 4px 0 0;
  transition: all 0.3s ease;
  position: relative;
}

.chart-bar:hover {
  opacity: 0.8;
  transform: scaleY(1.05);
}

.bar-tooltip {
  position: absolute;
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.chart-bar:hover .bar-tooltip {
  opacity: 1;
}

.chart-labels {
  display: flex;
  justify-content: space-around;
  margin-top: 15px;
}

.chart-label {
  font-size: 12px;
  color: #606266;
  font-weight: 500;
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
  margin-bottom: 30px;
}

.pie-value {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
}

.pie-label {
  font-size: 14px;
  color: #606266;
  margin-top: 5px;
}

.pie-segments {
  width: 100%;
  height: 24px;
  display: flex;
  margin-bottom: 30px;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.pie-segment {
  height: 100%;
  transition: all 0.3s ease;
}

.pie-segment:hover {
  opacity: 0.8;
}

.pie-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
}

.legend-item {
  display: flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 20px;
  background-color: #f5f7fa;
  transition: all 0.3s ease;
}

.legend-item:hover {
  background-color: #e4e7ed;
}

.legend-color {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  margin-right: 8px;
}

.legend-label {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
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
  height: 220px;
  border-bottom: 1px solid #DCDFE6;
  border-left: 1px solid #DCDFE6;
  border-radius: 0 0 0 4px;
}

.line-point {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #409EFF;
  box-shadow: 0 0 0 4px rgba(64, 158, 255, 0.2);
  transition: all 0.3s ease;
}

.line-point:hover {
  transform: scale(1.2);
  box-shadow: 0 0 0 6px rgba(64, 158, 255, 0.3);
}

.point-value {
  position: absolute;
  top: -25px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 11px;
  color: #606266;
  white-space: nowrap;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 2px 6px;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.data-table-card {
  margin-bottom: 24px;
  border-radius: 12px;
  border: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.data-table-card :deep(.el-card__header) {
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.data-table-card :deep(.el-table) {
  border-radius: 0;
}

.data-table-card :deep(.el-table th) {
  background-color: #f5f7fa;
  color: #303133;
  font-weight: 600;
}

.data-table-card :deep(.el-table--border) {
  border-radius: 0;
}

.data-table-card :deep(.el-table--enable-row-hover .el-table__body tr:hover > td) {
  background-color: #f5f7fa;
}

.data-table-card :deep(.el-table__body tr) {
  transition: all 0.2s ease;
}

.data-table-card :deep(.el-table__body tr > td) {
  border-bottom: 1px solid #f0f0f0;
}

.data-table-card :deep(.el-table__body tr > td .cell) {
  padding: 12px 0;
}

.data-table-card :deep(.el-tag) {
  border-radius: 12px;
  padding: 0 10px;
  height: 24px;
  line-height: 24px;
  font-weight: 500;
  font-size: 12px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  padding: 0 20px 20px;
}

.pagination-container :deep(.el-pagination) {
  padding: 10px 0;
}

.pagination-container :deep(.el-pagination .el-pager li) {
  border-radius: 4px;
  margin: 0 2px;
  transition: all 0.3s ease;
}

.pagination-container :deep(.el-pagination .el-pager li:hover) {
  transform: translateY(-2px);
}

.pagination-container :deep(.el-pagination .el-pager li.is-active) {
  background-color: #409EFF;
  color: white;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.pagination-container :deep(.el-pagination .btn-prev),
.pagination-container :deep(.el-pagination .btn-next) {
  border-radius: 4px;
  transition: all 0.3s ease;
}

.pagination-container :deep(.el-pagination .btn-prev:hover),
.pagination-container :deep(.el-pagination .btn-next:hover) {
  transform: translateY(-2px);
}

.pagination-container :deep(.el-pagination .el-select .el-input) {
  border-radius: 4px;
}

.pagination-container :deep(.el-pagination .el-select .el-input:hover) {
  transform: translateY(-2px);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .stat-card {
    height: 130px;
  }
  
  .stat-icon {
    width: 60px;
    height: 60px;
    font-size: 24px;
  }
  
  .stat-value {
    font-size: 24px;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    padding: 16px;
    text-align: center;
  }
  
  .header-actions {
    margin-top: 12px;
  }
  
  .statistics-content {
    padding: 16px;
  }
  
  .stat-card {
    height: 120px;
    margin-bottom: 16px;
  }
  
  .chart-card {
    height: 380px;
    margin-bottom: 16px;
  }
  
  .chart-container {
    height: 300px;
  }
}

/* 按钮组样式 */
.el-button-group .el-button {
  background-color: #f0f0f0;
  border-color: #d0d0d0;
  color: #666;
  transition: all 0.3s ease;
}

.el-button-group .el-button:hover {
  background-color: #e0e0e0;
  border-color: #c0c0c0;
  color: #333;
}

.el-button-group .el-button.is-active {
  background-color: #409EFF;
  border-color: #409EFF;
  color: white;
}

/* 统计变化文本样式 */
.change-text {
  margin-left: 4px;
  font-weight: 600;
}

.change-desc {
  margin-left: 5px;
  font-size: 12px;
  opacity: 0.8;
}
</style>