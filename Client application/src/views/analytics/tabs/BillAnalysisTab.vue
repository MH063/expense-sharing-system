<template>
  <div class="bill-analysis-tab">
    <!-- 账单统计卡片 -->
    <div class="stats-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">¥{{ billStats.totalAmount }}</div>
              <div class="stat-label">总账单金额</div>
            </div>
            <div class="stat-icon total">
              <el-icon><Money /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">¥{{ billStats.paidAmount }}</div>
              <div class="stat-label">已支付金额</div>
            </div>
            <div class="stat-icon paid">
              <el-icon><CircleCheck /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">¥{{ billStats.pendingAmount }}</div>
              <div class="stat-label">待支付金额</div>
            </div>
            <div class="stat-icon pending">
              <el-icon><Clock /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ billStats.totalCount }}</div>
              <div class="stat-label">账单总数</div>
            </div>
            <div class="stat-icon count">
              <el-icon><List /></el-icon>
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
                <span>账单预测分析</span>
              </div>
            </template>
            <div class="chart-container">
              <BillForecastChart :date-range="dateRange" />
            </div>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card shadow="hover" class="chart-card">
            <template #header>
              <div class="chart-header">
                <span>账单状态分布</span>
              </div>
            </template>
            <div class="chart-container">
              <BillStatusChart :date-range="dateRange" />
            </div>
          </el-card>
        </el-col>
      </el-row>
      <el-row :gutter="20" style="margin-top: 20px;">
        <el-col :span="24">
          <el-card shadow="hover" class="chart-card">
            <template #header>
              <div class="chart-header">
                <span>即将到期账单</span>
                <el-button type="text" @click="refreshUpcomingBills">
                  <el-icon><Refresh /></el-icon>
                  刷新
                </el-button>
              </div>
            </template>
            <div class="upcoming-bills-container">
              <el-table
                v-loading="upcomingLoading"
                :data="upcomingBills"
                style="width: 100%"
                stripe
                empty-text="暂无即将到期的账单"
              >
                <el-table-column prop="description" label="账单描述" />
                <el-table-column prop="total_amount" label="金额" width="120">
                  <template #default="scope">
                    ¥{{ scope.row.total_amount }}
                  </template>
                </el-table-column>
                <el-table-column prop="due_date" label="到期日期" width="120">
                  <template #default="scope">
                    {{ formatDate(scope.row.due_date) }}
                  </template>
                </el-table-column>
                <el-table-column prop="days_until_due" label="剩余天数" width="100">
                  <template #default="scope">
                    <el-tag :type="getDueTagType(scope.row.days_until_due)">
                      {{ scope.row.days_until_due }}天
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="payment_status" label="支付状态" width="100">
                  <template #default="scope">
                    <el-tag :type="getPaymentStatusTagType(scope.row.payment_status)">
                      {{ getPaymentStatusName(scope.row.payment_status) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="120">
                  <template #default="scope">
                    <el-button type="text" @click="viewBillDetail(scope.row)">详情</el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, defineProps } from 'vue'
import { useRouter } from 'vue-router'
import { Money, CircleCheck, Clock, List, Refresh } from '@element-plus/icons-vue'
import { billForecastApi } from '@/api/bill-forecast'
import BillForecastChart from '../charts/BillForecastChart.vue'
import BillStatusChart from '../charts/BillStatusChart.vue'

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
const upcomingLoading = ref(false)
const upcomingBills = ref([])

// 账单统计数据
const billStats = reactive({
  totalAmount: 0,
  paidAmount: 0,
  pendingAmount: 0,
  totalCount: 0
})

// 方法
/**
 * 加载账单统计数据
 */
const loadBillStats = async () => {
  try {
    const params = {
      startDate: props.dateRange[0],
      endDate: props.dateRange[1]
    }
    
    const response = await billForecastApi.getBillForecast(params)
    if (response.success && response.data) {
      const { statistics } = response.data
      
      if (statistics) {
        billStats.totalAmount = statistics.totalAmount || 0
        billStats.paidAmount = statistics.paidAmount || 0
        billStats.pendingAmount = statistics.pendingAmount || 0
        billStats.totalCount = statistics.totalCount || 0
      }
    }
  } catch (error) {
    console.error('加载账单统计数据失败:', error)
  }
}

/**
 * 加载即将到期账单
 */
const loadUpcomingBills = async () => {
  upcomingLoading.value = true
  try {
    const response = await billForecastApi.getUpcomingBills({ days: 7 })
    if (response.success && response.data) {
      upcomingBills.value = response.data || []
    }
  } catch (error) {
    console.error('加载即将到期账单失败:', error)
  } finally {
    upcomingLoading.value = false
  }
}

/**
 * 刷新即将到期账单
 */
const refreshUpcomingBills = () => {
  loadUpcomingBills()
}

/**
 * 查看账单详情
 */
const viewBillDetail = (bill) => {
  router.push(`/bills/${bill.id}`)
}

/**
 * 格式化日期
 */
const formatDate = (dateString) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

/**
 * 获取到期标签类型
 */
const getDueTagType = (days) => {
  if (days <= 0) return 'danger'
  if (days <= 3) return 'warning'
  return 'success'
}

/**
 * 获取支付状态名称
 */
const getPaymentStatusName = (status) => {
  const statusMap = {
    'paid': '已支付',
    'partial': '部分支付',
    'pending': '待支付',
    'overdue': '逾期'
  }
  return statusMap[status] || status
}

/**
 * 获取支付状态标签类型
 */
const getPaymentStatusTagType = (status) => {
  const typeMap = {
    'paid': 'success',
    'partial': 'warning',
    'pending': 'info',
    'overdue': 'danger'
  }
  return typeMap[status] || 'info'
}

// 生命周期
onMounted(() => {
  loadBillStats()
  loadUpcomingBills()
  
  // 监听刷新数据事件
  window.addEventListener('refresh-analytics-data', () => {
    loadBillStats()
    loadUpcomingBills()
  })
})
</script>

<style scoped>
.bill-analysis-tab {
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

.stat-icon.paid {
  color: #67C23A;
}

.stat-icon.pending {
  color: #E6A23C;
}

.stat-icon.count {
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

.upcoming-bills-container {
  height: 280px;
  overflow: auto;
}
</style>