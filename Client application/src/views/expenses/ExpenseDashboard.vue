<template>
  <div class="expense-dashboard">
    <div class="dashboard-header">
      <h1>费用管理</h1>
      <el-button v-if="canCreateExpense" type="primary" @click="createExpense">
        <el-icon><Plus /></el-icon>
        创建费用记录
      </el-button>
    </div>

    <div class="filter-section">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="房间">
          <el-select v-model="filterForm.roomId" placeholder="选择房间" clearable>
            <el-option
              v-for="room in rooms"
              :key="room.id"
              :label="room.name"
              :value="room.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="费用类型">
          <el-select v-model="filterForm.category" placeholder="选择类型" clearable>
            <el-option
              v-for="item in expenseCategories"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
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
          <el-button type="primary" @click="queryExpenses">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">¥{{ stats.totalAmount }}</div>
              <div class="stat-label">总支出</div>
            </div>
            <div class="stat-icon total">
              <el-icon><Money /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">¥{{ stats.myAmount }}</div>
              <div class="stat-label">我的支出</div>
            </div>
            <div class="stat-icon my">
              <el-icon><User /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">¥{{ stats.owedAmount }}</div>
              <div class="stat-label">待收金额</div>
            </div>
            <div class="stat-icon owed">
              <el-icon><ArrowDown /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">¥{{ stats.owingAmount }}</div>
              <div class="stat-label">待付金额</div>
            </div>
            <div class="stat-icon owing">
              <el-icon><ArrowUp /></el-icon>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card shadow="hover" class="chart-card">
            <template #header>
              <div class="chart-header">
                <span>费用趋势</span>
                <el-radio-group v-model="trendPeriod" size="small">
                  <el-radio-button label="week">本周</el-radio-button>
                  <el-radio-button label="month">本月</el-radio-button>
                  <el-radio-button label="year">本年</el-radio-button>
                </el-radio-group>
              </div>
            </template>
            <div class="chart-container">
              <div v-loading="chartLoading" class="chart-placeholder">
                <div ref="trendChartRef" class="chart"></div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card shadow="hover" class="chart-card">
            <template #header>
              <div class="chart-header">
                <span>费用分类</span>
                <el-radio-group v-model="categoryChartType" size="small">
                  <el-radio-button label="pie">饼图</el-radio-button>
                  <el-radio-button label="bar">柱状图</el-radio-button>
                </el-radio-group>
              </div>
            </template>
            <div class="chart-container">
              <div v-loading="chartLoading" class="chart-placeholder">
                <div ref="categoryChartRef" class="chart"></div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <div class="expense-list">
      <el-card shadow="hover">
        <template #header>
          <div class="card-header">
            <span>费用记录</span>
            <div class="header-actions">
              <el-button-group>
                <el-button
                  :type="viewMode === 'list' ? 'primary' : ''"
                  @click="viewMode = 'list'"
                >
                  <el-icon><List /></el-icon>
                  列表视图
                </el-button>
                <el-button
                  :type="viewMode === 'card' ? 'primary' : ''"
                  @click="viewMode = 'card'"
                >
                  <el-icon><Grid /></el-icon>
                  卡片视图
                </el-button>
              </el-button-group>
            </div>
          </div>
        </template>

        <div v-loading="loading" class="expense-content">
          <!-- 列表视图 -->
          <el-table
            v-if="viewMode === 'list'"
            :data="expenses"
            stripe
            style="width: 100%"
          >
            <el-table-column prop="title" label="费用名称" width="180" />
            <el-table-column prop="amount" label="金额" width="120">
              <template #default="scope">
                ¥{{ scope.row.amount.toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="category" label="类型" width="100">
              <template #default="scope">
                <el-tag :type="getCategoryTagType(scope.row.category)">
                  {{ getCategoryText(scope.row.category) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="roomName" label="房间" width="120" />
            <el-table-column prop="payerName" label="支付人" width="100" />
            <el-table-column prop="paymentDate" label="支付日期" width="120">
              <template #default="scope">
                {{ formatDate(scope.row.paymentDate) }}
              </template>
            </el-table-column>
            <el-table-column label="我的分摊" width="120">
              <template #default="scope">
                ¥{{ getMyShare(scope.row).toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="scope">
                <el-tag :type="getStatusTagType(getMyShareStatus(scope.row))">
                  {{ getStatusText(getMyShareStatus(scope.row)) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="scope">
                <el-button type="text" @click="viewExpenseDetail(scope.row)">
                  详情
                </el-button>
                <el-button
                  v-if="canEditExpense && scope.row.payerId === currentUserId"
                  type="text"
                  @click="editExpense(scope.row)"
                >
                  编辑
                </el-button>
                <el-button
                  v-if="canDeleteExpense && scope.row.payerId === currentUserId"
                  type="text"
                  @click="deleteExpense(scope.row)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 卡片视图 -->
          <div v-else class="card-view">
            <el-row :gutter="20">
              <el-col
                v-for="expense in expenses"
                :key="expense.id"
                :span="8"
                class="expense-col"
              >
                <el-card shadow="hover" class="expense-card">
                  <template #header>
                    <div class="card-header">
                      <span class="expense-title">{{ expense.title }}</span>
                      <el-tag :type="getCategoryTagType(expense.category)" size="small">
                        {{ getCategoryText(expense.category) }}
                      </el-tag>
                    </div>
                  </template>
                  <div class="expense-info">
                    <div class="info-item">
                      <span class="label">金额:</span>
                      <span class="value">¥{{ expense.amount.toFixed(2) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">房间:</span>
                      <span class="value">{{ expense.roomName }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">支付人:</span>
                      <span class="value">{{ expense.payerName }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">支付日期:</span>
                      <span class="value">{{ formatDate(expense.paymentDate) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">我的分摊:</span>
                      <span class="value">¥{{ getMyShare(expense).toFixed(2) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">状态:</span>
                      <el-tag :type="getStatusTagType(getMyShareStatus(expense))" size="small">
                        {{ getStatusText(getMyShareStatus(expense)) }}
                      </el-tag>
                    </div>
                  </div>
                  <div class="card-actions">
                    <el-button type="text" @click="viewExpenseDetail(expense)">
                      详情
                    </el-button>
                    <el-button
                      v-if="canEditExpense && expense.payerId === currentUserId"
                      type="text"
                      @click="editExpense(expense)"
                    >
                      编辑
                    </el-button>
                    <el-button
                      v-if="canDeleteExpense && expense.payerId === currentUserId"
                      type="text"
                      @click="deleteExpense(expense)"
                    >
                      删除
                    </el-button>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>

          <div v-if="expenses.length === 0 && !loading" class="empty-state">
            <el-empty description="暂无费用记录" />
          </div>
        </div>

        <div class="pagination-container">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Money, User, ArrowDown, ArrowUp, List, Grid } from '@element-plus/icons-vue'
import { expenseApi } from '@/api/expenses'
import { roomsApi } from '@/api/rooms'
import { useUserStore } from '@/stores/user'
import { useAuthStore } from '@/stores/auth'
import { PERMISSIONS } from '@/utils/permissions'
import { debounce } from 'lodash-es'

// 引入 ECharts
import * as echarts from 'echarts'

// 路由
const router = useRouter()

// 状态
const userStore = useUserStore()
const authStore = useAuthStore()
const loading = ref(false)
const chartLoading = ref(false)
const viewMode = ref('list')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const expenses = ref([])
const rooms = ref([])

// 图表相关状态
const trendPeriod = ref('month')
const categoryChartType = ref('pie')
const trendChartRef = ref(null)
const categoryChartRef = ref(null)
let trendChart = null
let categoryChart = null

// 过滤表单
const filterForm = reactive({
  roomId: '',
  category: '',
  dateRange: []
})

// 统计数据
const stats = reactive({
  totalAmount: 0,
  myAmount: 0,
  owedAmount: 0,
  owingAmount: 0
})

// 费用类型选项
const expenseCategories = [
  { value: 'food', label: '餐饮' },
  { value: 'utilities', label: '水电费' },
  { value: 'rent', label: '房租' },
  { value: 'daily', label: '日用品' },
  { value: 'entertainment', label: '娱乐' },
  { value: 'transport', label: '交通' },
  { value: 'medical', label: '医疗' },
  { value: 'education', label: '教育' },
  { value: 'other', label: '其他' }
]

// 计算属性
const currentUserId = computed(() => userStore.userId)

// 权限检查
const canCreateExpense = computed(() => {
  return authStore.hasPermission(PERMISSIONS.EXPENSE_CREATE)
})

const canEditExpense = computed(() => {
  return authStore.hasPermission(PERMISSIONS.EXPENSE_EDIT)
})

const canDeleteExpense = computed(() => {
  return authStore.hasPermission(PERMISSIONS.EXPENSE_DELETE)
})

// 权限检查函数
const checkPermission = (permission) => {
  return authStore.hasPermission(permission)
}

// 方法
/**
 * 加载费用列表
 */
const loadExpenses = async (forceRefresh = false) => {
  // 检查权限
  if (!checkPermission(PERMISSIONS.EXPENSE_VIEW)) {
    console.log('用户没有查看费用的权限')
    return
  }
  
  // 生成缓存键
  const cacheKey = `expenses_${currentPage.value}_${pageSize.value}_${filterForm.roomId || 'all'}_${filterForm.category || 'all'}_${filterForm.dateRange?.[0] || 'all'}_${filterForm.dateRange?.[1] || 'all'}`
  
  // 检查缓存
  if (!forceRefresh) {
    const cachedData = localStorage.getItem(cacheKey)
    if (cachedData) {
      try {
        const { data, timestamp } = JSON.parse(cachedData)
        // 缓存5分钟有效
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          expenses.value = data.expenses || []
          total.value = data.total || 0
          console.log('使用缓存数据:', expenses.value)
          
          // 异步加载统计数据和图表数据
          loadStatsAsync({
            roomId: filterForm.roomId || undefined,
            startDate: filterForm.dateRange?.[0] || undefined,
            endDate: filterForm.dateRange?.[1] || undefined
          })
          
          loadChartDataAsync({
            roomId: filterForm.roomId || undefined,
            startDate: filterForm.dateRange?.[0] || undefined,
            endDate: filterForm.dateRange?.[1] || undefined
          })
          
          return
        }
      } catch (error) {
        console.error('解析缓存数据失败:', error)
      }
    }
  }
  
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      roomId: filterForm.roomId || undefined,
      category: filterForm.category || undefined,
      startDate: filterForm.dateRange?.[0] || undefined,
      endDate: filterForm.dateRange?.[1] || undefined
    }
    
    console.log('加载费用列表，参数:', params)
    
    // 并行执行多个API请求
    const [expensesResponse] = await Promise.all([
      expenseApi.getExpenses(params),
      // 并行加载统计数据，但不等待完成
      loadStatsAsync(params),
      // 并行加载图表数据，但不等待完成
      loadChartDataAsync(params)
    ])
    
    if (expensesResponse.data && expensesResponse.data.success) {
      const { data, total: totalCount } = expensesResponse.data.data
      expenses.value = data || []
      total.value = totalCount || 0
      
      // 缓存数据
      localStorage.setItem(cacheKey, JSON.stringify({
        data: {
          expenses: expenses.value,
          total: total.value
        },
        timestamp: Date.now()
      }))
      
      console.log('费用列表加载成功:', expenses.value)
    } else {
      console.error('费用列表加载失败:', expensesResponse.data?.message || '未知错误')
      ElMessage.error('加载费用列表失败')
    }
  } catch (error) {
    console.error('加载费用列表失败:', error)
    ElMessage.error('加载费用列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 创建费用记录
 */
const createExpense = () => {
  if (!canCreateExpense.value) {
    ElMessage.warning('您没有创建费用记录的权限')
    return
  }
  router.push('/expenses/create')
}

/**
 * 编辑费用记录
 */
const editExpense = (expense) => {
  if (!canEditExpense.value) {
    ElMessage.warning('您没有编辑费用记录的权限')
    return
  }
  router.push(`/expenses/${expense.id}/edit`)
}

/**
 * 删除费用记录
 */
const deleteExpense = async (expense) => {
  if (!canDeleteExpense.value) {
    ElMessage.warning('您没有删除费用记录的权限')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除费用记录"${expense.title}"吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await expenseApi.deleteExpense(expense.id)
    if (response.data && response.data.success) {
      ElMessage.success('删除成功')
      loadExpenses(true) // 强制刷新列表
    } else {
      ElMessage.error(response.data?.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除费用记录失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

/**
 * 异步加载统计数据
 */
const loadStatsAsync = async (params) => {
  // 生成缓存键
  const cacheKey = `stats_${params.roomId || 'all'}_${params.startDate || 'all'}_${params.endDate || 'all'}`
  
  // 检查缓存
  const cachedData = localStorage.getItem(cacheKey)
  if (cachedData) {
    try {
      const { data, timestamp } = JSON.parse(cachedData)
      // 缓存5分钟有效
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        Object.assign(stats, data)
        console.log('使用缓存统计数据:', data)
        return
      }
    } catch (error) {
      console.error('解析统计数据缓存失败:', error)
    }
  }
  
  try {
    console.log('加载统计数据，参数:', params)
    
    // 使用真实API调用
    const response = await expenseApi.getExpenseStatistics(params)
    
    if (response.data && response.data.success) {
      const statsData = response.data.data
      Object.assign(stats, statsData)
      
      // 缓存数据
      localStorage.setItem(cacheKey, JSON.stringify({
        data: statsData,
        timestamp: Date.now()
      }))
      
      console.log('统计数据加载成功:', statsData)
    } else {
      console.error('统计数据加载失败:', response.data?.message || '未知错误')
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

/**
 * 异步加载图表数据
 */
const loadChartDataAsync = (params) => {
  // 更新图表数据
  if (trendChart) {
    loadTrendChartData(params)
  }
  if (categoryChart) {
    loadCategoryChartData(params)
  }
}

/**
 * 加载统计数据
 */
const loadStats = async () => {
  try {
    const params = {
      roomId: filterForm.roomId || undefined,
      startDate: filterForm.dateRange?.[0] || undefined,
      endDate: filterForm.dateRange?.[1] || undefined
    }
    
    console.log('加载统计数据，参数:', params)
    
    // 使用真实API调用
    const response = await expenseApi.getExpenseStatistics(params)
    
    if (response.data && response.data.success) {
      const statsData = response.data.data
      Object.assign(stats, statsData)
      console.log('统计数据加载成功:', statsData)
    } else {
      console.error('统计数据加载失败:', response.data?.message || '未知错误')
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

/**
 * 初始化图表
 */
const initCharts = () => {
  nextTick(() => {
    if (trendChartRef.value) {
      trendChart = echarts.init(trendChartRef.value)
      loadTrendChartData()
    }
    
    if (categoryChartRef.value) {
      categoryChart = echarts.init(categoryChartRef.value)
      loadCategoryChartData()
    }
  })
}

/**
 * 加载费用趋势图表数据
 */
const loadTrendChartData = async (params) => {
  if (!trendChart) return
  
  // 生成缓存键
  const cacheKey = `trend_${trendPeriod.value}_${params?.roomId || 'all'}_${params?.startDate || 'all'}_${params?.endDate || 'all'}`
  
  // 检查缓存
  const cachedData = localStorage.getItem(cacheKey)
  if (cachedData) {
    try {
      const { data, timestamp } = JSON.parse(cachedData)
      // 缓存5分钟有效
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        renderTrendChart(data)
        console.log('使用缓存趋势数据:', data)
        return
      }
    } catch (error) {
      console.error('解析趋势数据缓存失败:', error)
    }
  }
  
  chartLoading.value = true
  try {
    const requestParams = {
      period: trendPeriod.value,
      roomId: params?.roomId || filterForm.roomId || undefined,
      startDate: params?.startDate || filterForm.dateRange?.[0] || undefined,
      endDate: params?.endDate || filterForm.dateRange?.[1] || undefined
    }
    
    console.log('加载费用趋势数据，参数:', requestParams)
    
    // 使用真实API调用
    const response = await expenseApi.getExpenseTrends(requestParams)
    
    if (response.data && response.data.success) {
      const trendData = response.data.data
      
      // 缓存数据
      localStorage.setItem(cacheKey, JSON.stringify({
        data: trendData,
        timestamp: Date.now()
      }))
      
      console.log('费用趋势数据加载成功:', trendData)
      renderTrendChart(trendData)
    } else {
      console.error('费用趋势数据加载失败:', response.data?.message || '未知错误')
      // 使用模拟数据
      renderTrendChart(getMockTrendData())
    }
  } catch (error) {
    console.error('加载费用趋势数据失败:', error)
    // 不再使用模拟数据，直接显示错误信息
  } finally {
    chartLoading.value = false
  }
}

/**
 * 加载费用分类图表数据
 */
const loadCategoryChartData = async (params) => {
  if (!categoryChart) return
  
  // 生成缓存键
  const cacheKey = `category_${categoryChartType.value}_${params?.roomId || 'all'}_${params?.startDate || 'all'}_${params?.endDate || 'all'}`
  
  // 检查缓存
  const cachedData = localStorage.getItem(cacheKey)
  if (cachedData) {
    try {
      const { data, timestamp } = JSON.parse(cachedData)
      // 缓存5分钟有效
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        renderCategoryChart(data)
        console.log('使用缓存分类数据:', data)
        return
      }
    } catch (error) {
      console.error('解析分类数据缓存失败:', error)
    }
  }
  
  chartLoading.value = true
  try {
    const requestParams = {
      roomId: params?.roomId || filterForm.roomId || undefined,
      startDate: params?.startDate || filterForm.dateRange?.[0] || undefined,
      endDate: params?.endDate || filterForm.dateRange?.[1] || undefined
    }
    
    console.log('加载费用分类数据，参数:', requestParams)
    
    // 使用真实API调用
    const response = await expenseApi.getExpenseCategoryStats(requestParams)
    
    if (response.data && response.data.success) {
      const categoryData = response.data.data
      
      // 缓存数据
      localStorage.setItem(cacheKey, JSON.stringify({
        data: categoryData,
        timestamp: Date.now()
      }))
      
      console.log('费用分类数据加载成功:', categoryData)
      renderCategoryChart(categoryData)
    } else {
      console.error('费用分类数据加载失败:', response.data?.message || '未知错误')
      // 使用模拟数据
      renderCategoryChart(getMockCategoryData())
    }
  } catch (error) {
    console.error('加载费用分类数据失败:', error)
    // 不再使用模拟数据，直接显示错误信息
  } finally {
    chartLoading.value = false
  }
}

/**
 * 渲染费用趋势图表
 */
const renderTrendChart = (data) => {
  if (!trendChart) return
  
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>{a}: {c}'
    },
    xAxis: {
      type: 'category',
      data: data.dates || []
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '¥{value}'
      }
    },
    series: [
      {
        name: '费用金额',
        type: 'line',
        data: data.amounts || [],
        smooth: true,
        areaStyle: {
          opacity: 0.3
        },
        itemStyle: {
          color: '#409eff'
        }
      }
    ]
  }
  
  trendChart.setOption(option)
}

/**
 * 渲染费用分类图表
 */
const renderCategoryChart = (data) => {
  if (!categoryChart) return
  
  let option = {}
  
  if (categoryChartType.value === 'pie') {
    option = {
      tooltip: {
        trigger: 'item',
        formatter: '{a} <br/>{b}: ¥{c} ({d}%)'
      },
      legend: {
        orient: 'vertical',
        left: 'left'
      },
      series: [
        {
          name: '费用分类',
          type: 'pie',
          radius: '60%',
          data: data.categories || [],
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    }
  } else {
    option = {
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        }
      },
      xAxis: {
        type: 'category',
        data: data.categories?.map(item => item.name) || []
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: '¥{value}'
        }
      },
      series: [
        {
          name: '费用金额',
          type: 'bar',
          data: data.categories?.map(item => item.value) || [],
          itemStyle: {
            color: '#67c23a'
          }
        }
      ]
    }
  }
  
  categoryChart.setOption(option)
}



/**
 * 加载房间列表
 */
const loadRooms = async () => {
  try {
    console.log('加载房间列表')
    
    // 使用真实API调用
    const response = await roomsApi.getUserRooms()
    
    if (response.data && response.data.success) {
      rooms.value = response.data.data || []
      console.log('房间列表加载成功:', rooms.value)
    } else {
      console.error('房间列表加载失败:', response.data?.message || '未知错误')
    }
  } catch (error) {
    console.error('加载房间列表失败:', error)
  }
}

/**
 * 查看费用详情
 */
const viewExpenseDetail = (expense) => {
  router.push(`/expenses/${expense.id}`)
}

/**
 * 查询费用数据
 */
const queryExpenses = () => {
  currentPage.value = 1
  loadExpenses()
  
  // 更新图表
  if (trendChart) {
    loadTrendChartData()
  }
  if (categoryChart) {
    loadCategoryChartData()
  }
}

/**
 * 重置过滤条件
 */
const resetFilter = () => {
  filterForm.roomId = ''
  filterForm.category = ''
  filterForm.dateRange = []
  currentPage.value = 1
  loadExpenses()
  
  // 重置后更新图表
  if (trendChart) {
    loadTrendChartData()
  }
  if (categoryChart) {
    loadCategoryChartData()
  }
}

/**
 * 处理页码变化
 */
const handleCurrentChange = (page) => {
  currentPage.value = page
  loadExpenses()
}

/**
 * 处理每页数量变化
 */
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  loadExpenses()
}

/**
 * 格式化日期
 */
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

/**
 * 获取我的分摊金额
 */
const getMyShare = (expense) => {
  const mySplit = expense.splitMembers?.find(member => member.userId === currentUserId.value)
  return mySplit?.amount || 0
}

/**
 * 获取我的分摊状态
 */
const getMyShareStatus = (expense) => {
  if (expense.payerId === currentUserId.value) {
    return 'paid'
  }
  
  const mySplit = expense.splitMembers?.find(member => member.userId === currentUserId.value)
  if (!mySplit) {
    return 'not_involved'
  }
  
  return mySplit.paid ? 'paid' : 'unpaid'
}

/**
 * 获取费用类型标签类型
 */
const getCategoryTagType = (category) => {
  const typeMap = {
    food: '',
    utilities: 'success',
    rent: 'warning',
    daily: 'info',
    entertainment: 'danger',
    transport: '',
    medical: 'warning',
    education: 'success',
    other: 'info'
  }
  return typeMap[category] || ''
}

/**
 * 获取费用类型文本
 */
const getCategoryText = (category) => {
  const categoryMap = {
    food: '餐饮',
    utilities: '水电费',
    rent: '房租',
    daily: '日用品',
    entertainment: '娱乐',
    transport: '交通',
    medical: '医疗',
    education: '教育',
    other: '其他'
  }
  return categoryMap[category] || '未知'
}

/**
 * 获取状态标签类型
 */
const getStatusTagType = (status) => {
  const statusMap = {
    paid: 'success',
    unpaid: 'warning',
    not_involved: 'info'
  }
  return statusMap[status] || 'info'
}

/**
 * 获取状态文本
 */
const getStatusText = (status) => {
  const statusMap = {
    paid: '已支付',
    unpaid: '待支付',
    not_involved: '不涉及'
  }
  return statusMap[status] || '未知'
}

// 生命周期
onMounted(() => {
  loadExpenses()
  loadRooms()
  // 初始化图表
  initCharts()
  
  // 添加窗口大小变化监听，使用防抖优化性能
  let resizeTimer = null
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => {
      if (trendChart) {
        trendChart.resize()
      }
      if (categoryChart) {
        categoryChart.resize()
      }
    }, 200) // 200ms防抖
  })
})

// 创建防抖函数
const debouncedLoadCategoryChartData = debounce(() => {
  loadCategoryChartData()
}, 300)

const debouncedLoadTrendChartData = debounce(() => {
  loadTrendChartData()
}, 300)

// 监听图表类型变化
watch(categoryChartType, () => {
  debouncedLoadCategoryChartData()
})

// 监听趋势周期变化
watch(trendPeriod, () => {
  debouncedLoadTrendChartData()
})


</script>

<style scoped>
.expense-dashboard {
  padding: 20px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filter-section {
  margin-bottom: 20px;
}

.filter-form {
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
}

.stats-section {
  margin-bottom: 20px;
}

.charts-section {
  margin-bottom: 20px;
}

.chart-card {
  height: 400px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 320px;
}

.chart-placeholder {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.chart {
  width: 100%;
  height: 100%;
}

.stat-card {
  position: relative;
  overflow: hidden;
}

.stat-content {
  position: relative;
  z-index: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.stat-icon {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 40px;
  opacity: 0.2;
}

.stat-icon.total {
  color: #409eff;
}

.stat-icon.my {
  color: #67c23a;
}

.stat-icon.owed {
  color: #e6a23c;
}

.stat-icon.owing {
  color: #f56c6c;
}

.expense-list {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.expense-content {
  min-height: 400px;
}

.card-view {
  margin-top: 10px;
}

.expense-col {
  margin-bottom: 20px;
}

.expense-card {
  height: 100%;
}

.expense-title {
  font-weight: bold;
}

.expense-info {
  margin-bottom: 15px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.label {
  color: #666;
}

.value {
  font-weight: 500;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.empty-state {
  margin-top: 50px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .expense-dashboard {
    padding: 16px;
  }
  
  .dashboard-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .filter-form {
    padding: 12px;
  }
  
  .filter-form .el-form-item {
    margin-bottom: 12px;
  }
  
  .stats-section .el-row {
    margin: 0 !important;
  }
  
  .stats-section .el-col {
    padding: 0 0 10px 0 !important;
  }
  
  .charts-section .el-row {
    margin: 0 !important;
  }
  
  .charts-section .el-col {
    padding: 0 0 10px 0 !important;
  }
  
  .chart-card {
    height: 350px;
  }
  
  .chart-container {
    height: 270px;
  }
  
  .expense-list .el-table {
    font-size: 14px;
  }
  
  .expense-list .el-table .cell {
    padding: 8px 5px;
  }
  
  .card-view .el-col {
    margin-bottom: 15px;
  }
  
  .expense-card {
    margin-bottom: 15px;
  }
  
  .expense-info {
    margin-bottom: 10px;
  }
  
  .info-item {
    margin-bottom: 5px;
  }
  
  .card-actions {
    flex-wrap: wrap;
    gap: 5px;
  }
}
</style>