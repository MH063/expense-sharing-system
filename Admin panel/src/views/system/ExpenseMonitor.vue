<template>
  <div class="expense-monitor">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1>费用监控</h1>
          <p>实时监控和分析系统中的费用情况</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="refreshData">
            <el-icon><Refresh /></el-icon>
            刷新数据
          </el-button>
          <el-button @click="exportReport">
            <el-icon><Download /></el-icon>
            导出报告
          </el-button>
        </div>
      </el-header>
      
      <el-main class="expense-content">
        <!-- 统计卡片 -->
        <el-row :gutter="20" class="stats-row">
          <el-col :span="6">
            <el-card class="stats-card">
              <el-statistic title="本月总费用" :value="totalExpense" precision="2" prefix="¥" />
              <div class="stats-trend">
                <span class="trend-label">较上月</span>
                <span :class="['trend-value', monthlyTrend > 0 ? 'up' : 'down']">
                  {{ monthlyTrend > 0 ? '+' : '' }}{{ monthlyTrend.toFixed(2) }}%
                </span>
                <el-icon :class="monthlyTrend > 0 ? 'trend-up' : 'trend-down'">
                  <ArrowUp v-if="monthlyTrend > 0" />
                  <ArrowDown v-else />
                </el-icon>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="6">
            <el-card class="stats-card">
              <el-statistic title="人均费用" :value="avgExpense" precision="2" prefix="¥" />
              <div class="stats-trend">
                <span class="trend-label">较上月</span>
                <span :class="['trend-value', avgTrend > 0 ? 'up' : 'down']">
                  {{ avgTrend > 0 ? '+' : '' }}{{ avgTrend.toFixed(2) }}%
                </span>
                <el-icon :class="avgTrend > 0 ? 'trend-up' : 'trend-down'">
                  <ArrowUp v-if="avgTrend > 0" />
                  <ArrowDown v-else />
                </el-icon>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="6">
            <el-card class="stats-card">
              <el-statistic title="异常费用" :value="abnormalExpenseCount" />
              <div class="stats-trend">
                <span class="trend-label">较上月</span>
                <span :class="['trend-value', abnormalTrend > 0 ? 'up' : 'down']">
                  {{ abnormalTrend > 0 ? '+' : '' }}{{ abnormalTrend.toFixed(2) }}%
                </span>
                <el-icon :class="abnormalTrend > 0 ? 'trend-up' : 'trend-down'">
                  <ArrowUp v-if="abnormalTrend > 0" />
                  <ArrowDown v-else />
                </el-icon>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="6">
            <el-card class="stats-card">
              <el-statistic title="待审核费用" :value="pendingExpenseCount" />
              <div class="stats-trend">
                <span class="trend-label">较昨日</span>
                <span :class="['trend-value', pendingTrend > 0 ? 'up' : 'down']">
                  {{ pendingTrend > 0 ? '+' : '' }}{{ pendingTrend }}
                </span>
                <el-icon :class="pendingTrend > 0 ? 'trend-up' : 'trend-down'">
                  <ArrowUp v-if="pendingTrend > 0" />
                  <ArrowDown v-else />
                </el-icon>
              </div>
            </el-card>
          </el-col>
        </el-row>
        
        <!-- 图表区域 -->
        <el-row :gutter="20" class="chart-row">
          <el-col :span="16">
            <el-card class="chart-card">
              <div class="chart-header">
                <h3>费用趋势图</h3>
                <el-radio-group v-model="trendPeriod" @change="updateTrendChart">
                  <el-radio-button label="week">最近一周</el-radio-button>
                  <el-radio-button label="month">最近一月</el-radio-button>
                  <el-radio-button label="quarter">最近三月</el-radio-button>
                </el-radio-group>
              </div>
              <div class="chart-container">
                <!-- 这里应该使用图表库，如ECharts -->
                <div class="chart-placeholder">
                  <img src="https://picsum.photos/seed/expense-trend/800/300.jpg" alt="费用趋势图" />
                </div>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="8">
            <el-card class="chart-card">
              <div class="chart-header">
                <h3>费用分类占比</h3>
              </div>
              <div class="chart-container">
                <!-- 这里应该使用图表库，如ECharts -->
                <div class="chart-placeholder">
                  <img src="https://picsum.photos/seed/expense-category/400/300.jpg" alt="费用分类占比" />
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
        
        <!-- 费用列表 -->
        <el-card class="expense-list-card">
          <div class="list-header">
            <h3>最新费用记录</h3>
            <div class="list-actions">
              <el-select v-model="filterType" placeholder="费用类型" clearable @change="filterExpenses">
                <el-option label="全部" value="" />
                <el-option label="水费" value="water" />
                <el-option label="电费" value="electricity" />
                <el-option label="网费" value="internet" />
                <el-option label="其他" value="other" />
              </el-select>
              <el-select v-model="filterStatus" placeholder="审核状态" clearable @change="filterExpenses">
                <el-option label="全部" value="" />
                <el-option label="待审核" value="pending" />
                <el-option label="已通过" value="approved" />
                <el-option label="已拒绝" value="rejected" />
              </el-select>
              <el-button type="primary" @click="filterExpenses">筛选</el-button>
            </div>
          </div>
          
          <el-table :data="expenseList" style="width: 100%" v-loading="loading">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="category" label="费用类型" width="100">
              <template #default="scope">
                <el-tag :type="getCategoryTagType(scope.row.category)">
                  {{ getCategoryName(scope.row.category) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" width="120">
              <template #default="scope">
                ¥{{ scope.row.amount.toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="payer" label="支付人" width="120" />
            <el-table-column prop="dorm" label="寝室" width="100" />
            <el-table-column prop="date" label="日期" width="120" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="scope">
                <el-tag :type="getStatusTagType(scope.row.status)">
                  {{ getStatusName(scope.row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="isAbnormal" label="是否异常" width="100">
              <template #default="scope">
                <el-tag v-if="scope.row.isAbnormal" type="danger">异常</el-tag>
                <span v-else>正常</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="scope">
                <el-button type="primary" size="small" @click="viewExpense(scope.row)">查看</el-button>
                <el-button v-if="scope.row.status === 'pending'" size="small" @click="reviewExpense(scope.row)">审核</el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <!-- 分页 -->
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
      </el-main>
    </el-container>
    
    <!-- 费用详情对话框 -->
    <el-dialog v-model="showExpenseDetailDialog" title="费用详情" width="600px">
      <div v-if="currentExpense" class="expense-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="费用ID">{{ currentExpense.id }}</el-descriptions-item>
          <el-descriptions-item label="费用类型">
            <el-tag :type="getCategoryTagType(currentExpense.category)">
              {{ getCategoryName(currentExpense.category) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="金额">¥{{ currentExpense.amount.toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="支付人">{{ currentExpense.payer }}</el-descriptions-item>
          <el-descriptions-item label="寝室">{{ currentExpense.dorm }}</el-descriptions-item>
          <el-descriptions-item label="支付日期">{{ currentExpense.date }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTagType(currentExpense.status)">
              {{ getStatusName(currentExpense.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="是否异常">
            <el-tag v-if="currentExpense.isAbnormal" type="danger">异常</el-tag>
            <span v-else>正常</span>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ currentExpense.createTime }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ currentExpense.updateTime }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ currentExpense.remark || '无' }}</el-descriptions-item>
        </el-descriptions>
        
        <div v-if="currentExpense.isAbnormal" class="abnormal-info">
          <h3>异常信息</h3>
          <el-alert
            :title="currentExpense.abnormalReason"
            type="warning"
            :closable="false"
            show-icon
          />
        </div>
      </div>
    </el-dialog>
    
    <!-- 审核费用对话框 -->
    <el-dialog v-model="showReviewDialog" title="审核费用" width="500px">
      <el-form :model="reviewForm" :rules="reviewFormRules" ref="reviewFormRef" label-width="80px">
        <el-form-item label="审核结果" prop="status">
          <el-radio-group v-model="reviewForm.status">
            <el-radio label="approved">通过</el-radio>
            <el-radio label="rejected">拒绝</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="审核意见" prop="comment">
          <el-input
            v-model="reviewForm.comment"
            type="textarea"
            rows="4"
            placeholder="请输入审核意见"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showReviewDialog = false">取消</el-button>
          <el-button type="primary" @click="submitReview">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Download, ArrowUp, ArrowDown } from '@element-plus/icons-vue'

// 统计数据
const totalExpense = ref(12580.50)
const monthlyTrend = ref(5.2)
const avgExpense = ref(315.25)
const avgTrend = ref(-2.3)
const abnormalExpenseCount = ref(12)
const abnormalTrend = ref(8.7)
const pendingExpenseCount = ref(28)
const pendingTrend = ref(5)

// 图表相关
const trendPeriod = ref('month')

// 筛选条件
const filterType = ref('')
const filterStatus = ref('')

// 费用列表
const expenseList = ref([
  {
    id: 1,
    category: 'water',
    amount: 45.50,
    payer: '张三',
    dorm: 'A101',
    date: '2023-11-20',
    status: 'approved',
    isAbnormal: false,
    createTime: '2023-11-20 09:30:00',
    updateTime: '2023-11-20 10:15:00',
    remark: '本月水费'
  },
  {
    id: 2,
    category: 'electricity',
    amount: 125.80,
    payer: '李四',
    dorm: 'B201',
    date: '2023-11-19',
    status: 'pending',
    isAbnormal: true,
    abnormalReason: '电费金额异常，高于平均值50%',
    createTime: '2023-11-19 14:20:00',
    updateTime: '2023-11-19 14:20:00',
    remark: '本月电费'
  },
  {
    id: 3,
    category: 'internet',
    amount: 50.00,
    payer: '王五',
    dorm: 'C301',
    date: '2023-11-18',
    status: 'approved',
    isAbnormal: false,
    createTime: '2023-11-18 16:45:00',
    updateTime: '2023-11-18 17:30:00',
    remark: '本月网费'
  },
  {
    id: 4,
    category: 'other',
    amount: 200.00,
    payer: '赵六',
    dorm: 'D401',
    date: '2023-11-17',
    status: 'rejected',
    isAbnormal: false,
    createTime: '2023-11-17 10:10:00',
    updateTime: '2023-11-17 11:25:00',
    remark: '购买公共物品'
  },
  {
    id: 5,
    category: 'water',
    amount: 38.20,
    payer: '钱七',
    dorm: 'A102',
    date: '2023-11-16',
    status: 'pending',
    isAbnormal: false,
    createTime: '2023-11-16 09:15:00',
    updateTime: '2023-11-16 09:15:00',
    remark: '本月水费'
  }
])

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)
const totalExpenses = ref(100)

// 加载状态
const loading = ref(false)

// 对话框状态
const showExpenseDetailDialog = ref(false)
const showReviewDialog = ref(false)
const currentExpense = ref(null)
const reviewFormRef = ref(null)

// 审核表单
const reviewForm = reactive({
  id: null,
  status: 'approved',
  comment: ''
})

// 表单验证规则
const reviewFormRules = {
  status: [
    { required: true, message: '请选择审核结果', trigger: 'change' }
  ],
  comment: [
    { required: true, message: '请输入审核意见', trigger: 'blur' }
  ]
}

// 获取费用类型名称
const getCategoryName = (category) => {
  const categoryMap = {
    water: '水费',
    electricity: '电费',
    internet: '网费',
    other: '其他'
  }
  return categoryMap[category] || '未知'
}

// 获取费用类型标签类型
const getCategoryTagType = (category) => {
  const typeMap = {
    water: 'primary',
    electricity: 'success',
    internet: 'info',
    other: 'warning'
  }
  return typeMap[category] || 'info'
}

// 获取状态名称
const getStatusName = (status) => {
  const statusMap = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return statusMap[status] || '未知'
}

// 获取状态标签类型
const getStatusTagType = (status) => {
  const typeMap = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return typeMap[status] || 'info'
}

// 刷新数据
const refreshData = () => {
  loading.value = true
  // 模拟API调用
  setTimeout(() => {
    loading.value = false
    ElMessage.success('数据刷新成功')
  }, 1000)
}

// 导出报告
const exportReport = () => {
  ElMessage.success('报告导出成功')
}

// 更新趋势图
const updateTrendChart = () => {
  ElMessage.info(`已切换到${trendPeriod.value === 'week' ? '最近一周' : trendPeriod.value === 'month' ? '最近一月' : '最近三月'}的数据`)
}

// 筛选费用
const filterExpenses = () => {
  loading.value = true
  // 模拟API调用
  setTimeout(() => {
    loading.value = false
    ElMessage.success('筛选完成')
  }, 500)
}

// 查看费用详情
const viewExpense = (expense) => {
  currentExpense.value = { ...expense }
  showExpenseDetailDialog.value = true
}

// 审核费用
const reviewExpense = (expense) => {
  reviewForm.id = expense.id
  reviewForm.status = 'approved'
  reviewForm.comment = ''
  showReviewDialog.value = true
}

// 提交审核
const submitReview = () => {
  reviewFormRef.value.validate((valid) => {
    if (valid) {
      // 模拟API调用
      const index = expenseList.value.findIndex(e => e.id === reviewForm.id)
      if (index !== -1) {
        expenseList.value[index].status = reviewForm.status
        expenseList.value[index].updateTime = new Date().toLocaleString()
      }
      
      ElMessage.success('审核完成')
      showReviewDialog.value = false
      
      // 更新统计数据
      if (reviewForm.status === 'approved') {
        pendingExpenseCount.value -= 1
      }
    }
  })
}

// 处理分页大小变化
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  // 重新加载数据
  filterExpenses()
}

// 处理当前页变化
const handleCurrentChange = (page) => {
  currentPage.value = page
  // 重新加载数据
  filterExpenses()
}

// 组件挂载时加载数据
onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.expense-monitor {
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

.expense-content {
  padding: 20px;
  overflow-y: auto;
}

.stats-row {
  margin-bottom: 20px;
}

.stats-card {
  height: 120px;
}

.stats-trend {
  display: flex;
  align-items: center;
  margin-top: 10px;
  font-size: 14px;
}

.trend-label {
  color: #909399;
  margin-right: 5px;
}

.trend-value {
  margin-right: 5px;
}

.trend-value.up {
  color: #f56c6c;
}

.trend-value.down {
  color: #67c23a;
}

.trend-up {
  color: #f56c6c;
}

.trend-down {
  color: #67c23a;
}

.chart-row {
  margin-bottom: 20px;
}

.chart-card {
  height: 400px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.chart-header h3 {
  margin: 0;
  color: #303133;
}

.chart-container {
  height: calc(100% - 50px);
  display: flex;
  justify-content: center;
  align-items: center;
}

.chart-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.chart-placeholder img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.expense-list-card {
  margin-bottom: 20px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.list-header h3 {
  margin: 0;
  color: #303133;
}

.list-actions {
  display: flex;
  gap: 10px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.expense-detail {
  padding: 10px 0;
}

.abnormal-info {
  margin-top: 20px;
}

.abnormal-info h3 {
  margin-bottom: 10px;
  color: #303133;
}
</style>