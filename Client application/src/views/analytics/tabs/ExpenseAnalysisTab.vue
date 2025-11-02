<template>
  <div class="expense-analysis-tab">
    <!-- 费用统计卡片 -->
    <div class="stats-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">¥{{ expenseStats.totalAmount }}</div>
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
              <div class="stat-value">¥{{ expenseStats.averageAmount }}</div>
              <div class="stat-label">平均支出</div>
            </div>
            <div class="stat-icon average">
              <el-icon><TrendCharts /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ expenseStats.totalCount }}</div>
              <div class="stat-label">支出笔数</div>
            </div>
            <div class="stat-icon count">
              <el-icon><List /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">¥{{ expenseStats.maxAmount }}</div>
              <div class="stat-label">最大单笔支出</div>
            </div>
            <div class="stat-icon max">
              <el-icon><Top /></el-icon>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 图表区域 -->
    <div class="charts-container">
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card shadow="hover" class="chart-card">
            <template #header>
              <div class="chart-header">
                <span>支出趋势</span>
              </div>
            </template>
            <div class="chart-container">
              <ExpenseTrendChart :date-range="dateRange" />
            </div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card shadow="hover" class="chart-card">
            <template #header>
              <div class="chart-header">
                <span>支出分类占比</span>
              </div>
            </template>
            <div class="chart-container">
              <ExpenseCategoryChart :date-range="dateRange" />
            </div>
          </el-card>
        </el-col>
      </el-row>
      <el-row :gutter="20" style="margin-top: 20px;">
        <el-col :span="24">
          <el-card shadow="hover" class="chart-card">
            <template #header>
              <div class="chart-header">
                <span>成员消费对比</span>
              </div>
            </template>
            <div class="chart-container">
              <MemberComparisonChart :date-range="dateRange" />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 费用明细表格 -->
    <div class="expense-table">
      <el-card shadow="hover">
        <template #header>
          <div class="table-header">
            <span>费用明细</span>
            <div class="header-actions">
              <el-select v-model="categoryFilter" placeholder="选择分类" clearable>
                <el-option
                  v-for="category in categories"
                  :key="category.id"
                  :label="category.name"
                  :value="category.id"
                />
              </el-select>
              <el-button type="primary" @click="exportData">导出数据</el-button>
            </div>
          </div>
        </template>
        <el-table
          v-loading="loading"
          :data="filteredExpenses"
          style="width: 100%"
          stripe
        >
          <el-table-column prop="date" label="日期" width="120" />
          <el-table-column prop="description" label="描述" />
          <el-table-column prop="category" label="分类" width="120" />
          <el-table-column prop="amount" label="金额" width="120">
            <template #default="scope">
              ¥{{ scope.row.amount }}
            </template>
          </el-table-column>
          <el-table-column prop="paidBy" label="支付人" width="120" />
          <el-table-column prop="participants" label="参与人" width="200">
            <template #default="scope">
              <el-tag
                v-for="participant in scope.row.participants"
                :key="participant.id"
                size="small"
                style="margin-right: 5px;"
              >
                {{ participant.name }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120">
            <template #default="scope">
              <el-button type="text" @click="viewExpenseDetail(scope.row)">详情</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="totalExpenses"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, defineProps } from 'vue'
import { useRouter } from 'vue-router'
import { Money, TrendCharts, List, Top } from '@element-plus/icons-vue'
import { expenseApi } from '@/api/expenses'
import ExpenseTrendChart from '../charts/ExpenseTrendChart.vue'
import ExpenseCategoryChart from '../charts/ExpenseCategoryChart.vue'
import MemberComparisonChart from '../charts/MemberComparisonChart.vue'

// Props
const props = defineProps({
  dateRange: {
    type: Array,
    default: () => []
  }
})

// 路由
const router = useRouter()

// 状态
const loading = ref(false)
const categoryFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(20)
const totalExpenses = ref(0)
const expenses = ref([])
const categories = ref([])

// 费用统计数据
const expenseStats = reactive({
  totalAmount: 0,
  averageAmount: 0,
  totalCount: 0,
  maxAmount: 0
})

// 计算属性
const filteredExpenses = computed(() => {
  if (!categoryFilter.value) {
    return expenses.value
  }
  return expenses.value.filter(expense => expense.categoryId === categoryFilter.value)
})

// 方法
/**
 * 加载费用统计数据
 */
const loadExpenseStats = async () => {
  loading.value = true
  try {
    const params = {
      startDate: props.dateRange[0],
      endDate: props.dateRange[1]
    }
    
    const response = await expenseApi.getExpenseStatistics(params)
    if (response.success) {
      Object.assign(expenseStats, response.data)
    }
  } catch (error) {
    console.error('加载费用统计数据失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 加载费用明细
 */
const loadExpenses = async () => {
  loading.value = true
  try {
    const params = {
      startDate: props.dateRange[0],
      endDate: props.dateRange[1],
      page: currentPage.value,
      pageSize: pageSize.value
    }
    
    const response = await expenseApi.getExpenses(params)
    if (response.success) {
      expenses.value = response.data.items || []
      totalExpenses.value = response.data.total || 0
    }
  } catch (error) {
    console.error('加载费用明细失败:', error)
  } finally {
    loading.value = false
  }
}

/**
 * 加载费用分类
 */
const loadCategories = async () => {
  try {
    const response = await expenseApi.getExpenseCategories()
    if (response.success) {
      categories.value = response.data || []
    }
  } catch (error) {
    console.error('加载费用分类失败:', error)
  }
}

/**
 * 查看费用详情
 */
const viewExpenseDetail = (expense) => {
  router.push(`/expenses/${expense.id}`)
}

/**
 * 导出数据
 */
const exportData = () => {
  // 实现数据导出功能
  console.log('导出费用数据')
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

// 生命周期
onMounted(() => {
  loadExpenseStats()
  loadExpenses()
  loadCategories()
  
  // 监听刷新数据事件
  window.addEventListener('refresh-analytics-data', () => {
    loadExpenseStats()
    loadExpenses()
  })
})
</script>

<style scoped>
.expense-analysis-tab {
  padding: 0;
}

.stats-cards {
  margin-bottom: 20px;
}

.stat-card {
  position: relative;
  overflow: hidden;
}

.stat-content {
  position: relative;
  z-index: 2;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.stat-icon {
  position: absolute;
  right: 20px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 40px;
  opacity: 0.2;
  z-index: 1;
}

.stat-icon.total {
  color: #409EFF;
}

.stat-icon.average {
  color: #67C23A;
}

.stat-icon.count {
  color: #E6A23C;
}

.stat-icon.max {
  color: #F56C6C;
}

.charts-container {
  margin-bottom: 20px;
}

.chart-card {
  height: 350px;
}

.chart-container {
  height: 280px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.expense-table {
  margin-top: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}
</style>