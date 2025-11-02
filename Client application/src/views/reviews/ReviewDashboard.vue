<template>
  <div class="review-dashboard">
    <div class="dashboard-header">
      <h1>评论管理</h1>
      <el-button type="primary" @click="refreshData">
        <el-icon><Refresh /></el-icon>
        刷新数据
      </el-button>
    </div>

    <el-tabs v-model="activeTab" class="review-tabs">
      <el-tab-pane label="待审核" name="pending">
        <ReviewList status="pending" @refresh="refreshData" />
      </el-tab-pane>
      <el-tab-pane label="已通过" name="approved">
        <ReviewList status="approved" @refresh="refreshData" />
      </el-tab-pane>
      <el-tab-pane label="已拒绝" name="rejected">
        <ReviewList status="rejected" @refresh="refreshData" />
      </el-tab-pane>
      <el-tab-pane label="全部评论" name="all">
        <ReviewList status="all" @refresh="refreshData" />
      </el-tab-pane>
    </el-tabs>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ stats.pendingCount }}</div>
              <div class="stat-label">待审核评论</div>
            </div>
            <div class="stat-icon pending">
              <el-icon><Clock /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ stats.approvedCount }}</div>
              <div class="stat-label">已通过评论</div>
            </div>
            <div class="stat-icon approved">
              <el-icon><Check /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ stats.rejectedCount }}</div>
              <div class="stat-label">已拒绝评论</div>
            </div>
            <div class="stat-icon rejected">
              <el-icon><Close /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ stats.totalCount }}</div>
              <div class="stat-label">全部评论</div>
            </div>
            <div class="stat-icon total">
              <el-icon><List /></el-icon>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Clock, Check, Close, List } from '@element-plus/icons-vue'
import ReviewList from './ReviewList.vue'
import { reviewApi } from '@/api/reviews'

// 状态
const activeTab = ref('pending')
const stats = reactive({
  pendingCount: 0,
  approvedCount: 0,
  rejectedCount: 0,
  totalCount: 0
})

// 方法
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
    const response = await reviewApi.getStats()
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
.review-dashboard {
  padding: 20px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.review-tabs {
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

.stat-icon.approved {
  color: #67c23a;
}

.stat-icon.rejected {
  color: #f56c6c;
}

.stat-icon.total {
  color: #909399;
}
</style>