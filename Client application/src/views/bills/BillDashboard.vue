<template>
  <div class="bill-dashboard">
    <div class="dashboard-header">
      <h1>账单管理</h1>
      <el-button type="primary" @click="createBill">
        <el-icon><Plus /></el-icon>
        创建账单
      </el-button>
    </div>

    <el-tabs v-model="activeTab" class="bill-tabs">
      <el-tab-pane label="待支付" name="pending">
        <BillList status="pending" @refresh="refreshData" />
      </el-tab-pane>
      <el-tab-pane label="已支付" name="paid">
        <BillList status="paid" @refresh="refreshData" />
      </el-tab-pane>
      <el-tab-pane label="逾期" name="overdue">
        <BillList status="overdue" @refresh="refreshData" />
      </el-tab-pane>
      <el-tab-pane label="全部账单" name="all">
        <BillList status="all" @refresh="refreshData" />
      </el-tab-pane>
    </el-tabs>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ stats.pendingCount }}</div>
              <div class="stat-label">待支付账单</div>
            </div>
            <div class="stat-icon pending">
              <el-icon><Clock /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">¥{{ stats.pendingAmount.toFixed(2) }}</div>
              <div class="stat-label">待支付金额</div>
            </div>
            <div class="stat-icon amount">
              <el-icon><Money /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ stats.overdueCount }}</div>
              <div class="stat-label">逾期账单</div>
            </div>
            <div class="stat-icon overdue">
              <el-icon><Warning /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">¥{{ stats.overdueAmount.toFixed(2) }}</div>
              <div class="stat-label">逾期金额</div>
            </div>
            <div class="stat-icon overdue-amount">
              <el-icon><WarningFilled /></el-icon>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Clock, Money, Warning, WarningFilled } from '@element-plus/icons-vue'
import BillList from './BillList.vue'
import { billApi } from '@/api/bills'

// 路由
const router = useRouter()

// 状态
const activeTab = ref('pending')
const stats = reactive({
  pendingCount: 0,
  pendingAmount: 0,
  overdueCount: 0,
  overdueAmount: 0
})

// 方法
/**
 * 创建账单
 */
const createBill = () => {
  router.push({ name: 'BillCreate' })
}

/**
 * 刷新数据
 */
const refreshData = async () => {
  await loadStats()
}

/**
 * 加载统计数据
 */
const loadStats = async () => {
  try {
    const response = await billApi.getStats()
    if (response.success) {
      Object.assign(stats, response.data)
    } else {
      ElMessage.error('加载统计数据失败')
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
    ElMessage.error('加载统计数据失败')
  }
}

// 生命周期
onMounted(() => {
  loadStats()
})
</script>

<style scoped>
.bill-dashboard {
  padding: 20px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.bill-tabs {
  margin-bottom: 20px;
}

.stats-cards {
  margin-top: 20px;
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

.stat-icon.pending {
  color: #409eff;
}

.stat-icon.amount {
  color: #67c23a;
}

.stat-icon.overdue {
  color: #e6a23c;
}

.stat-icon.overdue-amount {
  color: #f56c6c;
}
</style>