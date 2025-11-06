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
import { expenseApi, statisticsApi } from '@/api'

// 统计数据
const pendingCount = ref(0)
const pendingTrend = ref(0)
const todayReviewedCount = ref(0)
const completionRate = ref(0)
const avgReviewTime = ref(0)
const timeTrend = ref(0)
const overdueCount = ref(0)
const overdueTrend = ref(0)

// 流程图相关
const flowView = ref('pending')

// 筛选条件
const filterType = ref('')
const filterStatus = ref('')
const filterPriority = ref('')

// 审核任务列表
const reviewList = ref([])

// 可分配的审核人列表
const availableReviewers = ref([])

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)
const totalReviews = ref(0)

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

// 获取统计数据
const fetchStatistics = async () => {
  try {
    const resp = await statisticsApi.getSystemOverview()
    if (resp && resp.success) {
      const data = resp.data || {}
      pendingCount.value = data.pendingReviews || data.pendingCount || 0
      todayReviewedCount.value = data.todayReviewed || 0
      completionRate.value = data.completionRate || 0
      avgReviewTime.value = data.avgReviewTime || 0
      overdueCount.value = data.overdueReviews || 0
    }
  } catch (error) {
    console.error('获取统计数据错误:', error)
  }
}

// 获取审核任务列表
const fetchReviewList = async () => {
  try {
    const params = {
      page: currentPage.value,
      pageSize: pageSize.value,
      type: filterType.value || undefined,
      status: filterStatus.value || undefined,
      priority: filterPriority.value || undefined
    }
    const response = await expenseApi.getPendingExpenses(params)
    if (response && response.success) {
      const data = response.data
      reviewList.value = Array.isArray(data) ? data : (data.list || data.data || [])
      totalReviews.value = data.total || reviewList.value.length
    }
  } catch (error) {
    console.error('获取审核列表错误:', error)
    throw new Error('获取审核列表错误')
  }
}
      {
        id: 1001,
        type: 'expense',
        title: '宿舍电费分摊申请',
        applicant: '张三',
        submitTime: '2023-11-15 09:30:00',
        priority: 'high',
        status: 'pending',
        reviewer: '',
        deadline: '2023-11-18 17:00:00',
        content: '申请分摊本季度宿舍电费，共计320元，每人80元',
        attachments: [
          { id: 'file1', name: '电费缴费凭证.jpg' },
          { id: 'file2', name: '宿舍成员名单.xlsx' }
        ],
        comment: ''
      },
      {
        id: 1002,
        type: 'user',
        title: '新用户注册审核',
        applicant: '李四',
        submitTime: '2023-11-15 10:15:00',
        priority: 'medium',
        status: 'processing',
        reviewer: '王审核员',
        deadline: '2023-11-17 17:00:00',
        content: '新用户李四申请加入宿舍费用管理系统，需要审核身份信息',
        attachments: [
          { id: 'file3', name: '身份证照片.jpg' }
        ],
        comment: '正在核实身份信息'
      },
      {
        id: 1003,
        type: 'dispute',
        title: '费用分摊争议',
        applicant: '赵五',
        submitTime: '2023-11-14 14:20:00',
        priority: 'high',
        status: 'approved',
        reviewer: '钱审核员',
        deadline: '2023-11-16 17:00:00',
        content: '对上月水费分摊有异议，认为计算有误',
        attachments: [
          { id: 'file4', name: '水费账单.jpg' },
          { id: 'file5', name: '分摊计算说明.pdf' }
        ],
        comment: '已核实，重新计算后分摊金额正确'
      },
      {
        id: 1004,
        type: 'expense',
        title: '宿舍网费分摊申请',
        applicant: '孙六',
        submitTime: '2023-11-14 16:45:00',
        priority: 'low',
        status: 'rejected',
        reviewer: '周审核员',
        deadline: '2023-11-16 17:00:00',
        content: '申请分摊本季度宿舍网费，共计180元，每人45元',
        attachments: [
          { id: 'file6', name: '网费缴费凭证.jpg' }
        ],
        comment: '申请材料不完整，缺少缴费凭证'
      },
      {
        id: 1005,
        type: 'expense',
        title: '宿舍公共物品采购',
        applicant: '吴七',
        submitTime: '2023-11-13 11:00:00',
        priority: 'medium',
        status: 'pending',
        reviewer: '',
        deadline: '2023-11-15 17:00:00',
        content: '申请采购宿舍公共物品，包括扫帚、拖把、垃圾袋等，共计120元',
        attachments: [
          { id: 'file7', name: '采购清单.xlsx' },
          { id: 'file8', name: '物品照片.jpg' }
        ],
        comment: ''
      }
    ]
    
    // 应用筛选条件
    let filteredData = mockData
    if (filterType.value) {
      filteredData = filteredData.filter(item => item.type === filterType.value)
    }
    if (filterStatus.value) {
      filteredData = filteredData.filter(item => item.status === filterStatus.value)
    }
    if (filterPriority.value) {
      filteredData = filteredData.filter(item => item.priority === filterPriority.value)
    }
    
    // 应用分页
    const startIndex = (currentPage.value - 1) * pageSize.value
    const endIndex = startIndex + pageSize.value
    reviewList.value = filteredData.slice(startIndex, endIndex)
    totalReviews.value = filteredData.length
    
    ElMessage.info('当前使用模拟数据')
  } catch (error) {
    console.error('获取审核列表错误:', error)
    throw new Error('获取审核列表错误')
  }
}

// 获取可用审核人列表
const fetchAvailableReviewers = async () => {
  try {
    // 尝试从API获取数据
    try {
      const response = await expenseApi.getAvailableReviewers()
      if (response.data.success) {
        availableReviewers.value = response.data.data || []
        return
      }
    } catch (apiError) {
      console.log('API不可用，使用模拟数据')
    }
    
    // 如果API不可用，使用模拟数据
    availableReviewers.value = [
      { id: 'reviewer1', name: '王审核员', currentTasks: 5 },
      { id: 'reviewer2', name: '钱审核员', currentTasks: 3 },
      { id: 'reviewer3', name: '周审核员', currentTasks: 7 },
      { id: 'reviewer4', name: '吴审核员', currentTasks: 2 },
      { id: 'reviewer5', name: '郑审核员', currentTasks: 4 }
    ]
  } catch (error) {
    console.error('获取审核人列表错误:', error)
    throw new Error('获取审核人列表错误')
  }
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
const refreshData = async () => {
  try {
    // 显示加载状态
    loading.value = true
    ElMessage.info('正在刷新数据...')
    
    // 并行获取所有数据
    await Promise.all([
      fetchStatistics(),
      fetchReviewList(),
      fetchAvailableReviewers()
    ])
    
    // 刷新成功提示
    ElMessage.success('数据刷新成功')
  } catch (error) {
    console.error('刷新数据错误:', error)
    ElMessage.error('刷新数据失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 导出报告
const exportReport = async () => {
  try {
    // 检查是否有数据可导出
    if (reviewList.value.length === 0) {
      ElMessage.warning('没有数据可导出')
      return
    }
    
    // 动态导入XLSX库
    const XLSX = await import('xlsx')
    
    // 准备导出数据
    const exportData = reviewList.value.map(item => ({
      'ID': item.id,
      '审核类型': getTypeName(item.type),
      '标题': item.title,
      '申请人': item.applicant,
      '提交时间': item.submitTime,
      '优先级': getPriorityName(item.priority),
      '状态': getStatusName(item.status),
      '审核人': item.reviewer || '未分配',
      '截止时间': item.deadline
    }))
    
    // 添加统计信息
    const statisticsData = [
      { '统计项': '待审核项目', '数值': pendingCount.value },
      { '统计项': '今日已审核', '数值': todayReviewedCount.value },
      { '统计项': '完成率', '数值': `${completionRate.value}%` },
      { '统计项': '平均审核时长', '数值': `${avgReviewTime.value}小时` },
      { '统计项': '超时审核', '数值': overdueCount.value }
    ]
    
    // 创建工作簿
    const workbook = XLSX.utils.book_new()
    
    // 创建审核任务工作表
    const reviewSheet = XLSX.utils.json_to_sheet(exportData)
    XLSX.utils.book_append_sheet(workbook, reviewSheet, '审核任务列表')
    
    // 创建统计信息工作表
    const statisticsSheet = XLSX.utils.json_to_sheet(statisticsData)
    XLSX.utils.book_append_sheet(workbook, statisticsSheet, '统计信息')
    
    // 生成文件名（包含日期）
    const today = new Date()
    const year = today.getFullYear()
    const month = (today.getMonth() + 1).toString().padStart(2, '0')
    const day = today.getDate().toString().padStart(2, '0')
    const dateStr = `${year}${month}${day}`
    const fileName = `审核报告_${dateStr}.xlsx`
    
    // 导出文件
    XLSX.writeFile(workbook, fileName)
    
    ElMessage.success('报告导出成功')
  } catch (error) {
    console.error('导出报告错误:', error)
    ElMessage.error('导出报告时发生错误，请检查是否安装了xlsx依赖')
  }
}

// 更新流程图
const updateFlowChart = () => {
  ElMessage.info(`已切换到${flowView.value === 'pending' ? '待审核' : flowView.value === 'processing' ? '审核中' : '已完成'}的流程视图`)
}

// 筛选审核任务
const filterReviews = async () => {
  try {
    currentPage.value = 1
    loading.value = true
    await fetchReviewList()
    ElMessage.success('筛选完成')
  } catch (error) {
    console.error('筛选错误:', error)
    ElMessage.error('筛选失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 查看审核详情
const viewReview = async (review) => {
  try {
    const response = await expenseApi.getExpenseDetail(review.id)
    if (response && response.success) {
      currentReview.value = response.data
      showReviewDetailDialog.value = true
    } else {
      ElMessage.error('获取审核详情失败')
    }
  } catch (error) {
    console.error('获取审核详情错误:', error)
    ElMessage.error('获取审核详情错误')
  }
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
const submitAssign = async () => {
  assignFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const data = {
          reviewerId: assignForm.reviewerId,
          comment: assignForm.comment
        }
        const response = await expenseApi.reviewExpense(assignForm.reviewId, { action: 'assign', ...data })
        if (response && response.success) {
          ElMessage.success('分配成功')
          showAssignDialog.value = false
          fetchReviewList()
        } else {
          ElMessage.error('分配失败')
        }
      } catch (error) {
        console.error('分配审核人错误:', error)
        ElMessage.error('分配审核人错误')
      }
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
    .then(async ({ value }) => {
      try {
        const response = await expenseApi.reviewExpense(currentReview.value.id, { action: 'approve', comment: value || '审核通过' })
        if (response && response.success) {
          ElMessage.success('审核已通过')
          showReviewDetailDialog.value = false
          fetchReviewList()
          fetchStatistics()
        } else {
          ElMessage.error('审核操作失败')
        }
      } catch (error) {
        console.error('审核操作错误:', error)
        ElMessage.error('审核操作错误')
      }
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
    .then(async ({ value }) => {
      try {
        const response = await expenseApi.reviewExpense(currentReview.value.id, { action: 'reject', comment: value || '审核拒绝' })
        if (response && response.success) {
          ElMessage.success('审核已拒绝')
          showReviewDetailDialog.value = false
          fetchReviewList()
          fetchStatistics()
        } else {
          ElMessage.error('审核操作失败')
        }
      } catch (error) {
        console.error('审核操作错误:', error)
        ElMessage.error('审核操作错误')
      }
    })
    .catch(() => {
      ElMessage.info('已取消操作')
    })
}

// 下载文件
const downloadFile = async (file) => {
  try {
    const response = await expenseApi.downloadFile(file.id)
    // 创建下载链接
    const url = window.URL.createObjectURL(new Blob([response.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', file.name)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    ElMessage.success(`正在下载文件: ${file.name}`)
  } catch (error) {
    console.error('下载文件错误:', error)
    ElMessage.error('下载文件错误')
  }
}

// 处理分页大小变化
const handleSizeChange = async (size) => {
  try {
    pageSize.value = size
    currentPage.value = 1
    loading.value = true
    await fetchReviewList()
  } catch (error) {
    console.error('分页错误:', error)
    ElMessage.error('分页加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

// 处理当前页变化
const handleCurrentChange = async (page) => {
  try {
    currentPage.value = page
    loading.value = true
    await fetchReviewList()
  } catch (error) {
    console.error('分页错误:', error)
    ElMessage.error('分页加载失败，请稍后重试')
  } finally {
    loading.value = false
  }
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