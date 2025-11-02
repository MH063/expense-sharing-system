<template>
  <div class="review-monitor">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1>审核流程监控</h1>
          <p>实时监控和管理系统中的审核流程</p>
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
      
      <el-main class="review-content">
        <!-- 统计卡片 -->
        <el-row :gutter="20" class="stats-row">
          <el-col :span="6">
            <el-card class="stats-card">
              <el-statistic title="待审核项目" :value="pendingCount" />
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
          
          <el-col :span="6">
            <el-card class="stats-card">
              <el-statistic title="今日已审核" :value="todayReviewedCount" />
              <div class="stats-trend">
                <span class="trend-label">完成率</span>
                <span class="trend-value">{{ completionRate }}%</span>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="6">
            <el-card class="stats-card">
              <el-statistic title="平均审核时长" :value="avgReviewTime" suffix="小时" />
              <div class="stats-trend">
                <span class="trend-label">较上周</span>
                <span :class="['trend-value', timeTrend > 0 ? 'up' : 'down']">
                  {{ timeTrend > 0 ? '+' : '' }}{{ timeTrend.toFixed(1) }}小时
                </span>
                <el-icon :class="timeTrend > 0 ? 'trend-up' : 'trend-down'">
                  <ArrowUp v-if="timeTrend > 0" />
                  <ArrowDown v-else />
                </el-icon>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="6">
            <el-card class="stats-card">
              <el-statistic title="超时审核" :value="overdueCount" />
              <div class="stats-trend">
                <span class="trend-label">较昨日</span>
                <span :class="['trend-value', overdueTrend > 0 ? 'up' : 'down']">
                  {{ overdueTrend > 0 ? '+' : '' }}{{ overdueTrend }}
                </span>
                <el-icon :class="overdueTrend > 0 ? 'trend-up' : 'trend-down'">
                  <ArrowUp v-if="overdueTrend > 0" />
                  <ArrowDown v-else />
                </el-icon>
              </div>
            </el-card>
          </el-col>
        </el-row>
        
        <!-- 审核流程图 -->
        <el-card class="flow-chart-card">
          <div class="chart-header">
            <h3>审核流程概览</h3>
            <el-radio-group v-model="flowView" @change="updateFlowChart">
              <el-radio-button label="pending">待审核</el-radio-button>
              <el-radio-button label="processing">审核中</el-radio-button>
              <el-radio-button label="completed">已完成</el-radio-button>
            </el-radio-group>
          </div>
          <div class="flow-chart-container">
            <!-- 这里应该使用流程图组件，如G6 -->
            <div class="flow-chart-placeholder">
              <img src="https://picsum.photos/seed/review-flow/1200/400.jpg" alt="审核流程图" />
            </div>
          </div>
        </el-card>
        
        <!-- 审核任务列表 -->
        <el-card class="review-list-card">
          <div class="list-header">
            <h3>审核任务列表</h3>
            <div class="list-actions">
              <el-select v-model="filterType" placeholder="审核类型" clearable @change="filterReviews">
                <el-option label="全部" value="" />
                <el-option label="费用审核" value="expense" />
                <el-option label="用户审核" value="user" />
                <el-option label="争议审核" value="dispute" />
              </el-select>
              <el-select v-model="filterStatus" placeholder="审核状态" clearable @change="filterReviews">
                <el-option label="全部" value="" />
                <el-option label="待审核" value="pending" />
                <el-option label="审核中" value="processing" />
                <el-option label="已通过" value="approved" />
                <el-option label="已拒绝" value="rejected" />
              </el-select>
              <el-select v-model="filterPriority" placeholder="优先级" clearable @change="filterReviews">
                <el-option label="全部" value="" />
                <el-option label="高" value="high" />
                <el-option label="中" value="medium" />
                <el-option label="低" value="low" />
              </el-select>
              <el-button type="primary" @click="filterReviews">筛选</el-button>
            </div>
          </div>
          
          <el-table :data="reviewList" style="width: 100%" v-loading="loading">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="type" label="审核类型" width="100">
              <template #default="scope">
                <el-tag :type="getTypeTagType(scope.row.type)">
                  {{ getTypeName(scope.row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="title" label="标题" width="200" />
            <el-table-column prop="applicant" label="申请人" width="120" />
            <el-table-column prop="submitTime" label="提交时间" width="160" />
            <el-table-column prop="priority" label="优先级" width="100">
              <template #default="scope">
                <el-tag :type="getPriorityTagType(scope.row.priority)">
                  {{ getPriorityName(scope.row.priority) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="scope">
                <el-tag :type="getStatusTagType(scope.row.status)">
                  {{ getStatusName(scope.row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="reviewer" label="审核人" width="120" />
            <el-table-column prop="deadline" label="截止时间" width="160" />
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="scope">
                <el-button type="primary" size="small" @click="viewReview(scope.row)">查看</el-button>
                <el-button v-if="scope.row.status === 'pending'" size="small" @click="assignReviewer(scope.row)">分配</el-button>
                <el-button v-if="scope.row.status === 'pending'" size="small" @click="handleReview(scope.row)">处理</el-button>
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
              :total="totalReviews"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </el-card>
      </el-main>
    </el-container>
    
    <!-- 审核详情对话框 -->
    <el-dialog v-model="showReviewDetailDialog" title="审核详情" width="700px">
      <div v-if="currentReview" class="review-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="审核ID">{{ currentReview.id }}</el-descriptions-item>
          <el-descriptions-item label="审核类型">
            <el-tag :type="getTypeTagType(currentReview.type)">
              {{ getTypeName(currentReview.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="标题">{{ currentReview.title }}</el-descriptions-item>
          <el-descriptions-item label="申请人">{{ currentReview.applicant }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ currentReview.submitTime }}</el-descriptions-item>
          <el-descriptions-item label="优先级">
            <el-tag :type="getPriorityTagType(currentReview.priority)">
              {{ getPriorityName(currentReview.priority) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTagType(currentReview.status)">
              {{ getStatusName(currentReview.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="审核人">{{ currentReview.reviewer || '未分配' }}</el-descriptions-item>
          <el-descriptions-item label="截止时间">{{ currentReview.deadline }}</el-descriptions-item>
          <el-descriptions-item label="审核内容" :span="2">{{ currentReview.content }}</el-descriptions-item>
          <el-descriptions-item label="附件" :span="2">
            <el-button v-for="(file, index) in currentReview.attachments" :key="index" type="text" @click="downloadFile(file)">
              {{ file.name }}
            </el-button>
            <span v-if="!currentReview.attachments || currentReview.attachments.length === 0">无</span>
          </el-descriptions-item>
          <el-descriptions-item label="审核意见" :span="2">{{ currentReview.comment || '暂无' }}</el-descriptions-item>
        </el-descriptions>
        
        <div class="review-actions" v-if="currentReview.status === 'pending'">
          <el-button type="success" @click="approveReview">通过</el-button>
          <el-button type="danger" @click="rejectReview">拒绝</el-button>
        </div>
      </div>
    </el-dialog>
    
    <!-- 分配审核人对话框 -->
    <el-dialog v-model="showAssignDialog" title="分配审核人" width="500px">
      <el-form :model="assignForm" :rules="assignFormRules" ref="assignFormRef" label-width="80px">
        <el-form-item label="审核人" prop="reviewerId">
          <el-select v-model="assignForm.reviewerId" placeholder="请选择审核人" style="width: 100%">
            <el-option
              v-for="reviewer in availableReviewers"
              :key="reviewer.id"
              :label="`${reviewer.name} (${reviewer.currentTasks}个任务)`"
              :value="reviewer.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="备注" prop="comment">
          <el-input
            v-model="assignForm.comment"
            type="textarea"
            rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAssignDialog = false">取消</el-button>
          <el-button type="primary" @click="submitAssign">确定</el-button>
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
const pendingCount = ref(28)
const pendingTrend = ref(5)
const todayReviewedCount = ref(15)
const completionRate = ref(65)
const avgReviewTime = ref(4.2)
const timeTrend = ref(-0.5)
const overdueCount = ref(3)
const overdueTrend = ref(-1)

// 流程图相关
const flowView = ref('pending')

// 筛选条件
const filterType = ref('')
const filterStatus = ref('')
const filterPriority = ref('')

// 审核任务列表
const reviewList = ref([
  {
    id: 1,
    type: 'expense',
    title: '高额电费审核',
    applicant: '张三',
    submitTime: '2023-11-20 09:30:00',
    priority: 'high',
    status: 'pending',
    reviewer: null,
    deadline: '2023-11-22 18:00:00',
    content: '本月电费350元，超过平均值50%，需要审核确认',
    attachments: [
      { id: 1, name: '电费账单.pdf', url: '/files/electricity_bill.pdf' }
    ],
    comment: ''
  },
  {
    id: 2,
    type: 'user',
    title: '新用户注册审核',
    applicant: '李四',
    submitTime: '2023-11-20 10:15:00',
    priority: 'medium',
    status: 'processing',
    reviewer: '王五',
    deadline: '2023-11-21 18:00:00',
    content: '新用户李四申请注册，需要审核身份信息',
    attachments: [
      { id: 2, name: '身份证照片.jpg', url: '/files/id_card.jpg' }
    ],
    comment: '正在核实身份信息'
  },
  {
    id: 3,
    type: 'dispute',
    title: '费用分摊争议',
    applicant: '赵六',
    submitTime: '2023-11-19 14:20:00',
    priority: 'high',
    status: 'approved',
    reviewer: '钱七',
    deadline: '2023-11-20 18:00:00',
    content: '赵六对本月水费分摊有异议，认为计算有误',
    attachments: [
      { id: 3, name: '水费账单.pdf', url: '/files/water_bill.pdf' },
      { id: 4, name: '分摊说明.docx', url: '/files/sharing_explanation.docx' }
    ],
    comment: '已核实，分摊计算正确，驳回争议'
  },
  {
    id: 4,
    type: 'expense',
    title: '异常网费审核',
    applicant: '孙八',
    submitTime: '2023-11-19 16:45:00',
    priority: 'low',
    status: 'rejected',
    reviewer: '周九',
    deadline: '2023-11-21 18:00:00',
    content: '本月网费100元，为正常费用的两倍',
    attachments: [],
    comment: '用户已解释，是半年费用合并支付'
  },
  {
    id: 5,
    type: 'user',
    title: '寝室变更申请',
    applicant: '吴十',
    submitTime: '2023-11-18 09:10:00',
    priority: 'medium',
    status: 'pending',
    reviewer: null,
    deadline: '2023-11-22 18:00:00',
    content: '吴十申请从A101寝室调换到B201寝室',
    attachments: [
      { id: 5, name: '申请表.pdf', url: '/files/transfer_application.pdf' }
    ],
    comment: ''
  }
])

// 可分配的审核人列表
const availableReviewers = ref([
  { id: 1, name: '王审核员', currentTasks: 2 },
  { id: 2, name: '李审核员', currentTasks: 1 },
  { id: 3, name: '张审核员', currentTasks: 3 },
  { id: 4, name: '赵审核员', currentTasks: 0 }
])

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)
const totalReviews = ref(100)

// 加载状态
const loading = ref(false)

// 对话框状态
const showReviewDetailDialog = ref(false)
const showAssignDialog = ref(false)
const currentReview = ref(null)
const assignFormRef = ref(null)

// 分配表单
const assignForm = reactive({
  reviewId: null,
  reviewerId: null,
  comment: ''
})

// 表单验证规则
const assignFormRules = {
  reviewerId: [
    { required: true, message: '请选择审核人', trigger: 'change' }
  ]
}

// 获取审核类型名称
const getTypeName = (type) => {
  const typeMap = {
    expense: '费用审核',
    user: '用户审核',
    dispute: '争议审核'
  }
  return typeMap[type] || '未知'
}

// 获取审核类型标签类型
const getTypeTagType = (type) => {
  const typeMap = {
    expense: 'primary',
    user: 'success',
    dispute: 'warning'
  }
  return typeMap[type] || 'info'
}

// 获取优先级名称
const getPriorityName = (priority) => {
  const priorityMap = {
    high: '高',
    medium: '中',
    low: '低'
  }
  return priorityMap[priority] || '未知'
}

// 获取优先级标签类型
const getPriorityTagType = (priority) => {
  const typeMap = {
    high: 'danger',
    medium: 'warning',
    low: 'info'
  }
  return typeMap[priority] || 'info'
}

// 获取状态名称
const getStatusName = (status) => {
  const statusMap = {
    pending: '待审核',
    processing: '审核中',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return statusMap[status] || '未知'
}

// 获取状态标签类型
const getStatusTagType = (status) => {
  const typeMap = {
    pending: 'warning',
    processing: 'primary',
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

// 更新流程图
const updateFlowChart = () => {
  ElMessage.info(`已切换到${flowView.value === 'pending' ? '待审核' : flowView.value === 'processing' ? '审核中' : '已完成'}的流程视图`)
}

// 筛选审核任务
const filterReviews = () => {
  loading.value = true
  // 模拟API调用
  setTimeout(() => {
    loading.value = false
    ElMessage.success('筛选完成')
  }, 500)
}

// 查看审核详情
const viewReview = (review) => {
  currentReview.value = { ...review }
  showReviewDetailDialog.value = true
}

// 分配审核人
const assignReviewer = (review) => {
  assignForm.reviewId = review.id
  assignForm.reviewerId = null
  assignForm.comment = ''
  showAssignDialog.value = true
}

// 处理审核
const handleReview = (review) => {
  currentReview.value = { ...review }
  showReviewDetailDialog.value = true
}

// 提交分配
const submitAssign = () => {
  assignFormRef.value.validate((valid) => {
    if (valid) {
      // 模拟API调用
      const index = reviewList.value.findIndex(r => r.id === assignForm.reviewId)
      if (index !== -1) {
        const reviewer = availableReviewers.value.find(r => r.id === assignForm.reviewerId)
        if (reviewer) {
          reviewList.value[index].reviewer = reviewer.name
          reviewList.value[index].status = 'processing'
          reviewer.currentTasks += 1
        }
      }
      
      ElMessage.success('分配成功')
      showAssignDialog.value = false
    }
  })
}

// 通过审核
const approveReview = () => {
  ElMessageBox.prompt('请输入审核意见', '通过审核', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputType: 'textarea',
    inputPlaceholder: '请输入审核意见'
  })
    .then(({ value }) => {
      // 模拟API调用
      const index = reviewList.value.findIndex(r => r.id === currentReview.value.id)
      if (index !== -1) {
        reviewList.value[index].status = 'approved'
        reviewList.value[index].comment = value || '审核通过'
      }
      
      ElMessage.success('审核已通过')
      showReviewDetailDialog.value = false
    })
    .catch(() => {
      ElMessage.info('已取消操作')
    })
}

// 拒绝审核
const rejectReview = () => {
  ElMessageBox.prompt('请输入拒绝原因', '拒绝审核', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputType: 'textarea',
    inputPlaceholder: '请输入拒绝原因'
  })
    .then(({ value }) => {
      // 模拟API调用
      const index = reviewList.value.findIndex(r => r.id === currentReview.value.id)
      if (index !== -1) {
        reviewList.value[index].status = 'rejected'
        reviewList.value[index].comment = value || '审核拒绝'
      }
      
      ElMessage.success('审核已拒绝')
      showReviewDetailDialog.value = false
    })
    .catch(() => {
      ElMessage.info('已取消操作')
    })
}

// 下载文件
const downloadFile = (file) => {
  ElMessage.success(`正在下载文件: ${file.name}`)
}

// 处理分页大小变化
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  // 重新加载数据
  filterReviews()
}

// 处理当前页变化
const handleCurrentChange = (page) => {
  currentPage.value = page
  // 重新加载数据
  filterReviews()
}

// 组件挂载时加载数据
onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.review-monitor {
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

.review-content {
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

.flow-chart-card {
  margin-bottom: 20px;
  height: 450px;
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

.flow-chart-container {
  height: calc(100% - 50px);
  display: flex;
  justify-content: center;
  align-items: center;
}

.flow-chart-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.flow-chart-placeholder img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.review-list-card {
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

.review-detail {
  padding: 10px 0;
}

.review-actions {
  margin-top: 20px;
  display: flex;
  gap: 10px;
}
</style>