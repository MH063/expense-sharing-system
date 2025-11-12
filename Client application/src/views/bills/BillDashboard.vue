<template>
  <div class="bill-dashboard">
    <div class="dashboard-header">
      <h1>账单管理</h1>
      <el-button v-if="canCreateBill" type="primary" @click="createBill">
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
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus, Clock, Money, Warning, WarningFilled } from '@element-plus/icons-vue'
import BillList from './BillList.vue'
import { billApi } from '@/api/bills'
import { useAuthStore } from '@/stores/auth'
import { PERMISSIONS } from '@/utils/permissions'

// 路由
const router = useRouter()

// 状态
const authStore = useAuthStore()
const activeTab = ref('pending')
const stats = reactive({
  pendingCount: 0,
  pendingAmount: 0,
  overdueCount: 0,
  overdueAmount: 0
})

// 权限检查
const canCreateBill = computed(() => {
  return authStore.hasPermission(PERMISSIONS.BILL_CREATE)
})

// 权限检查函数
const checkPermission = (permission) => {
  return authStore.hasPermission(permission)
}

// 方法
/**
 * 创建账单
 */
const createBill = () => {
  if (!canCreateBill.value) {
    ElMessage.warning('您没有创建账单的权限')
    return
  }
  router.push({ name: 'BillCreate' })
}

/**
 * 刷新数据
 */
const refreshData = async () => {
  // 检查权限
  if (!checkPermission(PERMISSIONS.BILL_VIEW)) {
    console.log('用户没有查看账单的权限')
    return
  }
  
  await loadStats()
}

/**
 * 加载统计数据
 */
const loadStats = async () => {
  // 检查权限
  if (!checkPermission(PERMISSIONS.BILL_VIEW)) {
    console.log('用户没有查看账单的权限')
    return
  }
  
  try {
    // 获取用户所属的房间
    const { default: userApi } = await import('@/api/user')
    const userResp = await userApi.getUserRooms()
    
    // 检查响应是否成功且包含房间数据
    if (!userResp.success || !userResp.data || !Array.isArray(userResp.data) || userResp.data.length === 0) {
      console.warn('用户没有关联的房间')
      return
    }
    
    // 使用第一个房间ID获取统计数据
    const roomId = userResp.data[0].id
    const response = await billApi.getBillStats(roomId)
    
    if (response.success) {
      // 处理后端返回的双层嵌套数据结构 {success: true, data: {xxx: []}}
      const statsData = response.data.data || response.data
      
      // 更新统计数据
      stats.pendingCount = statsData.byStatus?.pending?.count || 0
      stats.pendingAmount = statsData.byStatus?.pending?.amount || 0
      stats.overdueCount = statsData.byStatus?.overdue?.count || 0
      stats.overdueAmount = statsData.byStatus?.overdue?.amount || 0
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
  // 检查权限
  if (checkPermission(PERMISSIONS.BILL_VIEW)) {
    loadStats()
  }
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