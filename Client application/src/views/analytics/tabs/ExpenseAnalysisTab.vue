<template>
  <div class="expense-analysis-tab" v-if="canViewAnalytics">
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
              <el-dropdown @command="handleExportCommand">
                <el-button type="primary">
                  导出数据<el-icon class="el-icon--right"><arrow-down /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="excel">导出为Excel</el-dropdown-item>
                    <el-dropdown-item command="csv">导出为CSV</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
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
  
  <!-- 无权限访问提示 -->
  <div v-else class="no-permission-container">
    <div class="no-permission-content">
      <el-icon class="no-permission-icon"><Lock /></el-icon>
      <h2>访问受限</h2>
      <p>您没有权限查看费用分析数据</p>
      <el-button type="primary" @click="$router.push('/dashboard')">返回首页</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, defineProps } from 'vue'
import { useRouter } from 'vue-router'
import { Money, TrendCharts, List, Top, ArrowDown, Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { PERMISSIONS } from '@/utils/permissions'
import { expenseApi } from '@/api/expenses'
import { exportExpenseData } from '@/utils/export'
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

// 权限检查
const authStore = useAuthStore()
const canViewAnalytics = computed(() => {
  return authStore.hasPermission(PERMISSIONS.SYSTEM_VIEW) || 
         authStore.hasPermission(PERMISSIONS.ROOM_VIEW)
})

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
  if (!canViewAnalytics.value) {
    console.log('用户没有权限查看费用统计数据')
    return
  }
  
  loading.value = true
  try {
    // 模拟API调用
    console.log('模拟调用 expenseApi.getExpenseStatistics，参数:', {
      startDate: props.dateRange[0],
      endDate: props.dateRange[1]
    })
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // 模拟返回数据
    const mockStats = {
      totalAmount: 15680.50,
      averageAmount: 522.68,
      totalCount: 30,
      maxAmount: 2500.00
    }
    
    Object.assign(expenseStats, mockStats)
    console.log('模拟获取费用统计数据成功:', mockStats)
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
  if (!canViewAnalytics.value) {
    console.log('用户没有权限查看费用明细')
    return
  }
  
  loading.value = true
  try {
    // 模拟API调用
    console.log('模拟调用 expenseApi.getExpenses，参数:', {
      startDate: props.dateRange[0],
      endDate: props.dateRange[1],
      page: currentPage.value,
      pageSize: pageSize.value
    })
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 600))
    
    // 模拟返回数据
    const mockExpenses = [
      {
        id: 1,
        date: '2023-10-15',
        description: '10月份电费',
        category: '电费',
        categoryId: 1,
        amount: 150.00,
        paidBy: '张三',
        participants: [
          { id: 1, name: '张三' },
          { id: 2, name: '李四' },
          { id: 3, name: '王五' }
        ]
      },
      {
        id: 2,
        date: '2023-10-10',
        description: '10月份水费',
        category: '水费',
        categoryId: 2,
        amount: 80.00,
        paidBy: '李四',
        participants: [
          { id: 1, name: '张三' },
          { id: 2, name: '李四' },
          { id: 3, name: '王五' }
        ]
      },
      {
        id: 3,
        date: '2023-10-05',
        description: '网费',
        category: '网费',
        categoryId: 3,
        amount: 100.00,
        paidBy: '王五',
        participants: [
          { id: 1, name: '张三' },
          { id: 2, name: '李四' },
          { id: 3, name: '王五' }
        ]
      },
      {
        id: 4,
        date: '2023-09-28',
        description: '物业费',
        category: '物业费',
        categoryId: 4,
        amount: 200.00,
        paidBy: '张三',
        participants: [
          { id: 1, name: '张三' },
          { id: 2, name: '李四' },
          { id: 3, name: '王五' }
        ]
      },
      {
        id: 5,
        date: '2023-09-15',
        description: '燃气费',
        category: '燃气费',
        categoryId: 5,
        amount: 120.00,
        paidBy: '李四',
        participants: [
          { id: 1, name: '张三' },
          { id: 2, name: '李四' },
          { id: 3, name: '王五' }
        ]
      }
    ]
    
    expenses.value = mockExpenses
    totalExpenses.value = 30 // 模拟总数
    console.log('模拟获取费用明细成功:', mockExpenses)
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
  if (!canViewAnalytics.value) {
    console.log('用户没有权限查看费用分类')
    return
  }
  
  try {
    // 模拟API调用
    console.log('模拟调用 expenseApi.getExpenseCategories')
    
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 模拟返回数据
    const mockCategories = [
      { id: 1, name: '电费' },
      { id: 2, name: '水费' },
      { id: 3, name: '网费' },
      { id: 4, name: '物业费' },
      { id: 5, name: '燃气费' }
    ]
    
    categories.value = mockCategories
    console.log('模拟获取费用分类成功:', mockCategories)
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
 * 处理导出命令
 */
const handleExportCommand = (command) => {
  try {
    // 获取当前筛选后的费用数据
    const dataToExport = filteredExpenses.value;
    
    if (dataToExport.length === 0) {
      console.warn('没有可导出的数据');
      return;
    }
    
    // 导出选项
    const exportOptions = {
      filename: '费用明细',
      title: '费用明细表',
      dateRange: props.dateRange
    };
    
    // 根据命令选择导出格式
    const success = exportExpenseData(dataToExport, command, exportOptions);
    
    if (success) {
      console.log(`费用明细数据导出成功，格式: ${command}`);
    } else {
      console.error(`费用明细数据导出失败，格式: ${command}`);
    }
  } catch (error) {
    console.error('导出费用数据时发生错误:', error);
  }
}

/**
 * 导出数据
 */
const exportData = () => {
  // 默认导出为Excel格式
  handleExportCommand('excel');
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

.no-permission-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 70vh;
  padding: 20px;
}

.no-permission-content {
  text-align: center;
  max-width: 400px;
}

.no-permission-icon {
  font-size: 64px;
  color: #e6a23c;
  margin-bottom: 20px;
}

.no-permission-content h2 {
  margin: 0 0 16px 0;
  color: #303133;
}

.no-permission-content p {
  margin: 0 0 24px 0;
  color: #606266;
  font-size: 16px;
}
</style>