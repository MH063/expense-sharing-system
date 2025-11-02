<template>
  <div class="review-records">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1>审核记录查询</h1>
          <p>查询和管理系统中的审核记录</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="exportRecords">
            <el-icon><Download /></el-icon>
            导出记录
          </el-button>
        </div>
      </el-header>
      
      <el-main class="records-content">
        <!-- 搜索表单 -->
        <el-card class="search-card">
          <el-form :model="searchForm" :inline="true" class="search-form">
            <el-form-item label="审核ID">
              <el-input v-model="searchForm.id" placeholder="请输入审核ID" clearable />
            </el-form-item>
            <el-form-item label="审核类型">
              <el-select v-model="searchForm.type" placeholder="请选择审核类型" clearable>
                <el-option label="费用审核" value="expense" />
                <el-option label="用户审核" value="user" />
                <el-option label="争议审核" value="dispute" />
              </el-select>
            </el-form-item>
            <el-form-item label="申请人">
              <el-input v-model="searchForm.applicant" placeholder="请输入申请人" clearable />
            </el-form-item>
            <el-form-item label="审核人">
              <el-input v-model="searchForm.reviewer" placeholder="请输入审核人" clearable />
            </el-form-item>
            <el-form-item label="审核状态">
              <el-select v-model="searchForm.status" placeholder="请选择审核状态" clearable>
                <el-option label="待审核" value="pending" />
                <el-option label="审核中" value="processing" />
                <el-option label="已通过" value="approved" />
                <el-option label="已拒绝" value="rejected" />
              </el-select>
            </el-form-item>
            <el-form-item label="提交时间">
              <el-date-picker
                v-model="searchForm.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="searchRecords">查询</el-button>
              <el-button @click="resetSearch">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
        
        <!-- 统计卡片 -->
        <el-row :gutter="20" class="stats-row">
          <el-col :span="6">
            <el-card class="stats-card">
              <el-statistic title="总审核数" :value="totalReviews" />
              <div class="stats-trend">
                <span class="trend-label">本月新增</span>
                <span class="trend-value">{{ monthlyReviews }}</span>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="6">
            <el-card class="stats-card">
              <el-statistic title="通过率" :value="approvalRate" suffix="%" />
              <div class="stats-trend">
                <span class="trend-label">较上月</span>
                <span :class="['trend-value', rateTrend > 0 ? 'up' : 'down']">
                  {{ rateTrend > 0 ? '+' : '' }}{{ rateTrend }}%
                </span>
                <el-icon :class="rateTrend > 0 ? 'trend-up' : 'trend-down'">
                  <ArrowUp v-if="rateTrend > 0" />
                  <ArrowDown v-else />
                </el-icon>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="6">
            <el-card class="stats-card">
              <el-statistic title="平均处理时长" :value="avgProcessTime" suffix="小时" />
              <div class="stats-trend">
                <span class="trend-label">较上月</span>
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
              <el-statistic title="超时处理数" :value="overdueCount" />
              <div class="stats-trend">
                <span class="trend-label">较上月</span>
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
        
        <!-- 审核记录列表 -->
        <el-card class="records-list-card">
          <div class="list-header">
            <h3>审核记录列表</h3>
            <div class="list-actions">
              <el-button-group>
                <el-button :type="viewMode === 'table' ? 'primary' : ''" @click="viewMode = 'table'">
                  <el-icon><List /></el-icon>
                  表格视图
                </el-button>
                <el-button :type="viewMode === 'timeline' ? 'primary' : ''" @click="viewMode = 'timeline'">
                  <el-icon><Clock /></el-icon>
                  时间线视图
                </el-button>
              </el-button-group>
            </div>
          </div>
          
          <!-- 表格视图 -->
          <div v-if="viewMode === 'table'">
            <el-table :data="reviewRecords" style="width: 100%" v-loading="loading">
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
              <el-table-column prop="reviewTime" label="审核时间" width="160" />
              <el-table-column prop="reviewer" label="审核人" width="120" />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="scope">
                  <el-tag :type="getStatusTagType(scope.row.status)">
                    {{ getStatusName(scope.row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="processTime" label="处理时长" width="100">
                <template #default="scope">
                  {{ scope.row.processTime }}小时
                </template>
              </el-table-column>
              <el-table-column label="操作" width="200" fixed="right">
                <template #default="scope">
                  <el-button type="primary" size="small" @click="viewRecord(scope.row)">查看</el-button>
                  <el-button v-if="scope.row.status === 'rejected'" size="small" @click="reprocessRecord(scope.row)">重新处理</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
          
          <!-- 时间线视图 -->
          <div v-else class="timeline-view">
            <el-timeline>
              <el-timeline-item
                v-for="record in reviewRecords"
                :key="record.id"
                :timestamp="record.reviewTime"
                :type="getTimelineType(record.status)"
              >
                <el-card class="timeline-card">
                  <div class="timeline-header">
                    <span class="timeline-title">{{ record.title }}</span>
                    <el-tag :type="getStatusTagType(record.status)" size="small">
                      {{ getStatusName(record.status) }}
                    </el-tag>
                  </div>
                  <div class="timeline-content">
                    <p><strong>审核类型:</strong> {{ getTypeName(record.type) }}</p>
                    <p><strong>申请人:</strong> {{ record.applicant }}</p>
                    <p><strong>审核人:</strong> {{ record.reviewer }}</p>
                    <p><strong>处理时长:</strong> {{ record.processTime }}小时</p>
                    <p><strong>审核意见:</strong> {{ record.comment || '无' }}</p>
                  </div>
                  <div class="timeline-actions">
                    <el-button type="primary" size="small" @click="viewRecord(record)">查看详情</el-button>
                    <el-button v-if="record.status === 'rejected'" size="small" @click="reprocessRecord(record)">重新处理</el-button>
                  </div>
                </el-card>
              </el-timeline-item>
            </el-timeline>
          </div>
          
          <!-- 分页 -->
          <div class="pagination-container">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="totalRecords"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </el-card>
      </el-main>
    </el-container>
    
    <!-- 审核记录详情对话框 -->
    <el-dialog v-model="showRecordDetailDialog" title="审核记录详情" width="800px">
      <div v-if="currentRecord" class="record-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="审核ID">{{ currentRecord.id }}</el-descriptions-item>
          <el-descriptions-item label="审核类型">
            <el-tag :type="getTypeTagType(currentRecord.type)">
              {{ getTypeName(currentRecord.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="标题">{{ currentRecord.title }}</el-descriptions-item>
          <el-descriptions-item label="申请人">{{ currentRecord.applicant }}</el-descriptions-item>
          <el-descriptions-item label="提交时间">{{ currentRecord.submitTime }}</el-descriptions-item>
          <el-descriptions-item label="审核时间">{{ currentRecord.reviewTime }}</el-descriptions-item>
          <el-descriptions-item label="审核人">{{ currentRecord.reviewer }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTagType(currentRecord.status)">
              {{ getStatusName(currentRecord.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="处理时长">{{ currentRecord.processTime }}小时</el-descriptions-item>
          <el-descriptions-item label="审核内容" :span="2">{{ currentRecord.content }}</el-descriptions-item>
          <el-descriptions-item label="附件" :span="2">
            <el-button v-for="(file, index) in currentRecord.attachments" :key="index" type="text" @click="downloadFile(file)">
              {{ file.name }}
            </el-button>
            <span v-if="!currentRecord.attachments || currentRecord.attachments.length === 0">无</span>
          </el-descriptions-item>
          <el-descriptions-item label="审核意见" :span="2">{{ currentRecord.comment || '无' }}</el-descriptions-item>
        </el-descriptions>
        
        <!-- 审核历史 -->
        <div class="review-history" v-if="currentRecord.history && currentRecord.history.length > 0">
          <h3>审核历史</h3>
          <el-timeline>
            <el-timeline-item
              v-for="(item, index) in currentRecord.history"
              :key="index"
              :timestamp="item.time"
            >
              <div class="history-item">
                <p><strong>操作人:</strong> {{ item.operator }}</p>
                <p><strong>操作:</strong> {{ item.action }}</p>
                <p><strong>备注:</strong> {{ item.comment || '无' }}</p>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Download, ArrowUp, ArrowDown, List, Clock } from '@element-plus/icons-vue'

// 搜索表单
const searchForm = reactive({
  id: '',
  type: '',
  applicant: '',
  reviewer: '',
  status: '',
  dateRange: []
})

// 统计数据
const totalReviews = ref(526)
const monthlyReviews = ref(48)
const approvalRate = ref(85.6)
const rateTrend = ref(2.3)
const avgProcessTime = ref(3.8)
const timeTrend = ref(-0.5)
const overdueCount = ref(12)
const overdueTrend = ref(-3)

// 视图模式
const viewMode = ref('table')

// 审核记录列表
const reviewRecords = ref([
  {
    id: 1,
    type: 'expense',
    title: '高额电费审核',
    applicant: '张三',
    submitTime: '2023-11-20 09:30:00',
    reviewTime: '2023-11-20 14:20:00',
    reviewer: '王审核员',
    status: 'approved',
    processTime: 4.8,
    content: '本月电费350元，超过平均值50%，需要审核确认',
    attachments: [
      { id: 1, name: '电费账单.pdf', url: '/files/electricity_bill.pdf' }
    ],
    comment: '已核实，电费正常，审核通过',
    history: [
      {
        time: '2023-11-20 09:30:00',
        operator: '系统',
        action: '创建审核任务',
        comment: '自动创建审核任务'
      },
      {
        time: '2023-11-20 10:15:00',
        operator: '王审核员',
        action: '开始审核',
        comment: '已接手审核任务'
      },
      {
        time: '2023-11-20 14:20:00',
        operator: '王审核员',
        action: '审核通过',
        comment: '已核实，电费正常，审核通过'
      }
    ]
  },
  {
    id: 2,
    type: 'user',
    title: '新用户注册审核',
    applicant: '李四',
    submitTime: '2023-11-20 10:15:00',
    reviewTime: '2023-11-20 16:45:00',
    reviewer: '李审核员',
    status: 'approved',
    processTime: 6.5,
    content: '新用户李四申请注册，需要审核身份信息',
    attachments: [
      { id: 2, name: '身份证照片.jpg', url: '/files/id_card.jpg' }
    ],
    comment: '身份信息核实无误，审核通过',
    history: [
      {
        time: '2023-11-20 10:15:00',
        operator: '系统',
        action: '创建审核任务',
        comment: '自动创建审核任务'
      },
      {
        time: '2023-11-20 11:30:00',
        operator: '李审核员',
        action: '开始审核',
        comment: '已接手审核任务'
      },
      {
        time: '2023-11-20 16:45:00',
        operator: '李审核员',
        action: '审核通过',
        comment: '身份信息核实无误，审核通过'
      }
    ]
  },
  {
    id: 3,
    type: 'dispute',
    title: '费用分摊争议',
    applicant: '赵六',
    submitTime: '2023-11-19 14:20:00',
    reviewTime: '2023-11-20 09:30:00',
    reviewer: '钱审核员',
    status: 'rejected',
    processTime: 19.2,
    content: '赵六对本月水费分摊有异议，认为计算有误',
    attachments: [
      { id: 3, name: '水费账单.pdf', url: '/files/water_bill.pdf' },
      { id: 4, name: '分摊说明.docx', url: '/files/sharing_explanation.docx' }
    ],
    comment: '已核实，分摊计算正确，驳回争议',
    history: [
      {
        time: '2023-11-19 14:20:00',
        operator: '系统',
        action: '创建审核任务',
        comment: '自动创建审核任务'
      },
      {
        time: '2023-11-19 15:00:00',
        operator: '钱审核员',
        action: '开始审核',
        comment: '已接手审核任务'
      },
      {
        time: '2023-11-20 09:30:00',
        operator: '钱审核员',
        action: '审核拒绝',
        comment: '已核实，分摊计算正确，驳回争议'
      }
    ]
  },
  {
    id: 4,
    type: 'expense',
    title: '异常网费审核',
    applicant: '孙八',
    submitTime: '2023-11-19 16:45:00',
    reviewTime: '2023-11-20 11:15:00',
    reviewer: '周审核员',
    status: 'rejected',
    processTime: 18.5,
    content: '本月网费100元，为正常费用的两倍',
    attachments: [],
    comment: '用户已解释，是半年费用合并支付，但未提前说明，审核拒绝',
    history: [
      {
        time: '2023-11-19 16:45:00',
        operator: '系统',
        action: '创建审核任务',
        comment: '自动创建审核任务'
      },
      {
        time: '2023-11-19 17:30:00',
        operator: '周审核员',
        action: '开始审核',
        comment: '已接手审核任务'
      },
      {
        time: '2023-11-20 11:15:00',
        operator: '周审核员',
        action: '审核拒绝',
        comment: '用户已解释，是半年费用合并支付，但未提前说明，审核拒绝'
      }
    ]
  },
  {
    id: 5,
    type: 'user',
    title: '寝室变更申请',
    applicant: '吴十',
    submitTime: '2023-11-18 09:10:00',
    reviewTime: '2023-11-19 16:30:00',
    reviewer: '张审核员',
    status: 'approved',
    processTime: 31.3,
    content: '吴十申请从A101寝室调换到B201寝室',
    attachments: [
      { id: 5, name: '申请表.pdf', url: '/files/transfer_application.pdf' }
    ],
    comment: '已核实，B201寝室有空位，同意调换',
    history: [
      {
        time: '2023-11-18 09:10:00',
        operator: '系统',
        action: '创建审核任务',
        comment: '自动创建审核任务'
      },
      {
        time: '2023-11-18 10:00:00',
        operator: '张审核员',
        action: '开始审核',
        comment: '已接手审核任务'
      },
      {
        time: '2023-11-19 16:30:00',
        operator: '张审核员',
        action: '审核通过',
        comment: '已核实，B201寝室有空位，同意调换'
      }
    ]
  }
])

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)
const totalRecords = ref(526)

// 加载状态
const loading = ref(false)

// 对话框状态
const showRecordDetailDialog = ref(false)
const currentRecord = ref(null)

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

// 获取时间线类型
const getTimelineType = (status) => {
  const typeMap = {
    pending: 'warning',
    processing: 'primary',
    approved: 'success',
    rejected: 'danger'
  }
  return typeMap[status] || 'info'
}

// 搜索审核记录
const searchRecords = () => {
  loading.value = true
  // 模拟API调用
  setTimeout(() => {
    loading.value = false
    ElMessage.success('查询完成')
  }, 500)
}

// 重置搜索
const resetSearch = () => {
  searchForm.id = ''
  searchForm.type = ''
  searchForm.applicant = ''
  searchForm.reviewer = ''
  searchForm.status = ''
  searchForm.dateRange = []
  searchRecords()
}

// 导出记录
const exportRecords = () => {
  ElMessage.success('记录导出成功')
}

// 查看记录详情
const viewRecord = (record) => {
  currentRecord.value = { ...record }
  showRecordDetailDialog.value = true
}

// 重新处理记录
const reprocessRecord = (record) => {
  ElMessageBox.confirm(`确定要重新处理审核记录"${record.title}"吗？`, '确认操作', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
    .then(() => {
      // 模拟API调用
      const index = reviewRecords.value.findIndex(r => r.id === record.id)
      if (index !== -1) {
        reviewRecords.value[index].status = 'pending'
        reviewRecords.value[index].reviewer = null
        reviewRecords.value[index].reviewTime = null
        reviewRecords.value[index].processTime = 0
        reviewRecords.value[index].comment = ''
      }
      
      ElMessage.success('已重新提交审核')
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
  searchRecords()
}

// 处理当前页变化
const handleCurrentChange = (page) => {
  currentPage.value = page
  // 重新加载数据
  searchRecords()
}

// 组件挂载时加载数据
onMounted(() => {
  searchRecords()
})
</script>

<style scoped>
.review-records {
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

.records-content {
  padding: 20px;
  overflow-y: auto;
}

.search-card {
  margin-bottom: 20px;
}

.search-form {
  display: flex;
  flex-wrap: wrap;
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

.records-list-card {
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

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.timeline-view {
  max-height: 600px;
  overflow-y: auto;
}

.timeline-card {
  margin-bottom: 10px;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.timeline-title {
  font-weight: bold;
  color: #303133;
}

.timeline-content p {
  margin: 5px 0;
  font-size: 14px;
  color: #606266;
}

.timeline-actions {
  margin-top: 10px;
  display: flex;
  gap: 10px;
}

.record-detail {
  padding: 10px 0;
}

.review-history {
  margin-top: 20px;
}

.review-history h3 {
  margin-bottom: 15px;
  color: #303133;
}

.history-item p {
  margin: 5px 0;
  font-size: 14px;
}
</style>