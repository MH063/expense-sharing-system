<template>
  <div class="progress-tracking">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1>处理进度跟踪</h1>
          <p>实时跟踪审核与争议处理进度</p>
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
      
      <el-main class="progress-content">
        <!-- 进度概览卡片 -->
        <el-row :gutter="20" class="overview-row">
          <el-col :span="6">
            <el-card class="overview-card">
              <div class="card-header">
                <h3>审核进度</h3>
                <el-progress
                  type="circle"
                  :percentage="reviewProgress"
                  :width="80"
                  :stroke-width="8"
                  :color="getProgressColor(reviewProgress)"
                />
              </div>
              <div class="card-content">
                <div class="progress-stats">
                  <div class="stat-item">
                    <span class="stat-label">待处理</span>
                    <span class="stat-value">{{ reviewPending }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">处理中</span>
                    <span class="stat-value">{{ reviewProcessing }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">已完成</span>
                    <span class="stat-value">{{ reviewCompleted }}</span>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="6">
            <el-card class="overview-card">
              <div class="card-header">
                <h3>争议处理进度</h3>
                <el-progress
                  type="circle"
                  :percentage="disputeProgress"
                  :width="80"
                  :stroke-width="8"
                  :color="getProgressColor(disputeProgress)"
                />
              </div>
              <div class="card-content">
                <div class="progress-stats">
                  <div class="stat-item">
                    <span class="stat-label">待处理</span>
                    <span class="stat-value">{{ disputePending }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">处理中</span>
                    <span class="stat-value">{{ disputeProcessing }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">已解决</span>
                    <span class="stat-value">{{ disputeResolved }}</span>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="6">
            <el-card class="overview-card">
              <div class="card-header">
                <h3>今日处理量</h3>
                <el-statistic :value="todayProcessed" />
              </div>
              <div class="card-content">
                <div class="progress-stats">
                  <div class="stat-item">
                    <span class="stat-label">审核完成</span>
                    <span class="stat-value">{{ todayReviews }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">争议解决</span>
                    <span class="stat-value">{{ todayDisputes }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">完成率</span>
                    <span class="stat-value">{{ todayCompletionRate }}%</span>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="6">
            <el-card class="overview-card">
              <div class="card-header">
                <h3>平均处理时长</h3>
                <el-statistic :value="avgProcessTime" suffix="小时" />
              </div>
              <div class="card-content">
                <div class="progress-stats">
                  <div class="stat-item">
                    <span class="stat-label">审核时长</span>
                    <span class="stat-value">{{ avgReviewTime }}小时</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">争议时长</span>
                    <span class="stat-value">{{ avgDisputeTime }}小时</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">较上月</span>
                    <span :class="['stat-value', timeTrend > 0 ? 'up' : 'down']">
                      {{ timeTrend > 0 ? '+' : '' }}{{ timeTrend.toFixed(1) }}小时
                    </span>
                  </div>
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
        
        <!-- 进度趋势图 -->
        <el-card class="chart-card">
          <div class="chart-header">
            <h3>处理进度趋势</h3>
            <el-radio-group v-model="trendPeriod" @change="updateTrendChart">
              <el-radio-button label="week">本周</el-radio-button>
              <el-radio-button label="month">本月</el-radio-button>
              <el-radio-button label="quarter">本季度</el-radio-button>
            </el-radio-group>
          </div>
          <div class="chart-container">
            <!-- 这里应该使用图表组件，如ECharts -->
            <div class="chart-placeholder">
              <img src="https://picsum.photos/seed/progress-trend/1200/300.jpg" alt="进度趋势图" />
            </div>
          </div>
        </el-card>
        
        <!-- 处理人员工作量 -->
        <el-card class="workload-card">
          <div class="card-header">
            <h3>处理人员工作量</h3>
            <el-button type="text" @click="viewAllWorkload">查看全部</el-button>
          </div>
          <div class="workload-container">
            <el-table :data="workloadData" style="width: 100%">
              <el-table-column prop="name" label="处理人" width="120" />
              <el-table-column prop="totalTasks" label="总任务数" width="100" />
              <el-table-column prop="completedTasks" label="已完成" width="100" />
              <el-table-column prop="pendingTasks" label="待处理" width="100" />
              <el-table-column prop="avgProcessTime" label="平均处理时长" width="140" />
              <el-table-column prop="completionRate" label="完成率" width="100">
                <template #default="scope">
                  <el-progress
                    :percentage="scope.row.completionRate"
                    :color="getProgressColor(scope.row.completionRate)"
                    :show-text="false"
                    :stroke-width="6"
                  />
                  <span class="progress-text">{{ scope.row.completionRate }}%</span>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="120">
                <template #default="scope">
                  <el-button type="primary" size="small" @click="viewWorkloadDetail(scope.row)">详情</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
        
        <!-- 当前处理任务 -->
        <el-card class="current-tasks-card">
          <div class="card-header">
            <h3>当前处理任务</h3>
            <div class="header-actions">
              <el-select v-model="taskFilter" placeholder="任务类型" clearable @change="filterTasks">
                <el-option label="全部" value="" />
                <el-option label="审核任务" value="review" />
                <el-option label="争议处理" value="dispute" />
              </el-select>
              <el-select v-model="statusFilter" placeholder="处理状态" clearable @change="filterTasks">
                <el-option label="全部" value="" />
                <el-option label="待处理" value="pending" />
                <el-option label="处理中" value="processing" />
              </el-select>
            </div>
          </div>
          <div class="tasks-container">
            <el-table :data="currentTasks" style="width: 100%" v-loading="loading">
              <el-table-column prop="id" label="ID" width="80" />
              <el-table-column prop="type" label="类型" width="100">
                <template #default="scope">
                  <el-tag :type="getTypeTagType(scope.row.type)">
                    {{ getTypeName(scope.row.type) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="title" label="标题" width="200" />
              <el-table-column prop="handler" label="处理人" width="120" />
              <el-table-column prop="startTime" label="开始时间" width="160" />
              <el-table-column prop="progress" label="进度" width="150">
                <template #default="scope">
                  <el-progress
                    :percentage="scope.row.progress"
                    :color="getProgressColor(scope.row.progress)"
                    :show-text="false"
                    :stroke-width="6"
                  />
                  <span class="progress-text">{{ scope.row.progress }}%</span>
                </template>
              </el-table-column>
              <el-table-column prop="estimatedTime" label="预计完成时间" width="160" />
              <el-table-column label="操作" width="200" fixed="right">
                <template #default="scope">
                  <el-button type="primary" size="small" @click="viewTaskDetail(scope.row)">查看</el-button>
                  <el-button v-if="scope.row.progress < 100" size="small" @click="updateTaskProgress(scope.row)">更新进度</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-card>
      </el-main>
    </el-container>
    
    <!-- 任务详情对话框 -->
    <el-dialog v-model="showTaskDetailDialog" title="任务详情" width="700px">
      <div v-if="currentTask" class="task-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="任务ID">{{ currentTask.id }}</el-descriptions-item>
          <el-descriptions-item label="任务类型">
            <el-tag :type="getTypeTagType(currentTask.type)">
              {{ getTypeName(currentTask.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="标题">{{ currentTask.title }}</el-descriptions-item>
          <el-descriptions-item label="处理人">{{ currentTask.handler }}</el-descriptions-item>
          <el-descriptions-item label="开始时间">{{ currentTask.startTime }}</el-descriptions-item>
          <el-descriptions-item label="预计完成时间">{{ currentTask.estimatedTime }}</el-descriptions-item>
          <el-descriptions-item label="当前进度">
            <el-progress
              :percentage="currentTask.progress"
              :color="getProgressColor(currentTask.progress)"
              :stroke-width="8"
            />
          </el-descriptions-item>
          <el-descriptions-item label="任务内容" :span="2">{{ currentTask.content }}</el-descriptions-item>
          <el-descriptions-item label="处理备注" :span="2">{{ currentTask.comment || '暂无' }}</el-descriptions-item>
        </el-descriptions>
        
        <!-- 处理历史 -->
        <div class="task-history" v-if="currentTask.history && currentTask.history.length > 0">
          <h3>处理历史</h3>
          <el-timeline>
            <el-timeline-item
              v-for="(item, index) in currentTask.history"
              :key="index"
              :timestamp="item.time"
            >
              <div class="history-item">
                <p><strong>操作人:</strong> {{ item.operator }}</p>
                <p><strong>操作:</strong> {{ item.action }}</p>
                <p><strong>进度:</strong> {{ item.progress }}%</p>
                <p><strong>备注:</strong> {{ item.comment || '无' }}</p>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>
      </div>
    </el-dialog>
    
    <!-- 更新进度对话框 -->
    <el-dialog v-model="showUpdateProgressDialog" title="更新任务进度" width="500px">
      <el-form :model="progressForm" :rules="progressFormRules" ref="progressFormRef" label-width="80px">
        <el-form-item label="当前进度" prop="progress">
          <el-slider
            v-model="progressForm.progress"
            :min="0"
            :max="100"
            :step="5"
            show-input
          />
        </el-form-item>
        
        <el-form-item label="处理备注" prop="comment">
          <el-input
            v-model="progressForm.comment"
            type="textarea"
            rows="4"
            placeholder="请输入处理备注"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showUpdateProgressDialog = false">取消</el-button>
          <el-button type="primary" @click="submitProgressUpdate">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Download } from '@element-plus/icons-vue'

// 进度概览数据
const reviewProgress = ref(75)
const reviewPending = ref(12)
const reviewProcessing = ref(8)
const reviewCompleted = ref(60)

const disputeProgress = ref(60)
const disputePending = ref(8)
const disputeProcessing = ref(6)
const disputeResolved = ref(21)

const todayProcessed = ref(18)
const todayReviews = ref(12)
const todayDisputes = ref(6)
const todayCompletionRate = ref(85)

const avgProcessTime = ref(4.2)
const avgReviewTime = ref(3.5)
const avgDisputeTime = ref(5.8)
const timeTrend = ref(-0.3)

// 趋势图相关
const trendPeriod = ref('week')

// 筛选条件
const taskFilter = ref('')
const statusFilter = ref('')

// 处理人员工作量数据
const workloadData = ref([
  {
    id: 1,
    name: '王审核员',
    totalTasks: 25,
    completedTasks: 20,
    pendingTasks: 5,
    avgProcessTime: '3.5小时',
    completionRate: 80
  },
  {
    id: 2,
    name: '李审核员',
    totalTasks: 30,
    completedTasks: 18,
    pendingTasks: 12,
    avgProcessTime: '4.2小时',
    completionRate: 60
  },
  {
    id: 3,
    name: '张调解员',
    totalTasks: 20,
    completedTasks: 15,
    pendingTasks: 5,
    avgProcessTime: '5.1小时',
    completionRate: 75
  },
  {
    id: 4,
    name: '赵调解员',
    totalTasks: 18,
    completedTasks: 12,
    pendingTasks: 6,
    avgProcessTime: '4.8小时',
    completionRate: 67
  }
])

// 当前处理任务
const currentTasks = ref([
  {
    id: 1,
    type: 'review',
    title: '高额电费审核',
    handler: '王审核员',
    startTime: '2023-11-20 09:30:00',
    progress: 75,
    estimatedTime: '2023-11-20 14:00:00',
    content: '本月电费350元，超过平均值50%，需要审核确认',
    comment: '已核实电费账单，正在确认使用情况',
    history: [
      {
        time: '2023-11-20 09:30:00',
        operator: '王审核员',
        action: '开始处理',
        progress: 0,
        comment: '接手审核任务'
      },
      {
        time: '2023-11-20 11:00:00',
        operator: '王审核员',
        action: '更新进度',
        progress: 50,
        comment: '已核实电费账单'
      },
      {
        time: '2023-11-20 12:30:00',
        operator: '王审核员',
        action: '更新进度',
        progress: 75,
        comment: '正在确认使用情况'
      }
    ]
  },
  {
    id: 2,
    type: 'dispute',
    title: '水费分摊争议',
    handler: '张调解员',
    startTime: '2023-11-20 10:15:00',
    progress: 40,
    estimatedTime: '2023-11-21 16:00:00',
    content: '张三认为本月水费分摊不公，自己使用量少于平均值但分摊金额相同',
    comment: '已联系双方，正在收集证据',
    history: [
      {
        time: '2023-11-20 10:15:00',
        operator: '张调解员',
        action: '开始处理',
        progress: 0,
        comment: '接手争议处理'
      },
      {
        time: '2023-11-20 11:30:00',
        operator: '张调解员',
        action: '更新进度',
        progress: 40,
        comment: '已联系双方，正在收集证据'
      }
    ]
  },
  {
    id: 3,
    type: 'review',
    title: '新用户注册审核',
    handler: '李审核员',
    startTime: '2023-11-20 08:45:00',
    progress: 90,
    estimatedTime: '2023-11-20 12:00:00',
    content: '新用户李四申请注册，需要审核身份信息',
    comment: '身份信息核实无误，正在完成最后确认',
    history: [
      {
        time: '2023-11-20 08:45:00',
        operator: '李审核员',
        action: '开始处理',
        progress: 0,
        comment: '接手审核任务'
      },
      {
        time: '2023-11-20 09:30:00',
        operator: '李审核员',
        action: '更新进度',
        progress: 60,
        comment: '已核实身份信息'
      },
      {
        time: '2023-11-20 11:15:00',
        operator: '李审核员',
        action: '更新进度',
        progress: 90,
        comment: '身份信息核实无误，正在完成最后确认'
      }
    ]
  },
  {
    id: 4,
    type: 'dispute',
    title: '电费金额争议',
    handler: '赵调解员',
    startTime: '2023-11-19 14:20:00',
    progress: 65,
    estimatedTime: '2023-11-20 18:00:00',
    content: '李四认为本月电费金额异常，比上月高出50%但使用量相近',
    comment: '已联系电力公司，正在核实计费方式',
    history: [
      {
        time: '2023-11-19 14:20:00',
        operator: '赵调解员',
        action: '开始处理',
        progress: 0,
        comment: '接手争议处理'
      },
      {
        time: '2023-11-19 16:00:00',
        operator: '赵调解员',
        action: '更新进度',
        progress: 30,
        comment: '已收集相关证据'
      },
      {
        time: '2023-11-20 09:00:00',
        operator: '赵调解员',
        action: '更新进度',
        progress: 65,
        comment: '已联系电力公司，正在核实计费方式'
      }
    ]
  },
  {
    id: 5,
    type: 'review',
    title: '寝室变更申请',
    handler: '王审核员',
    startTime: '2023-11-20 13:00:00',
    progress: 25,
    estimatedTime: '2023-11-21 10:00:00',
    content: '吴十申请从A101寝室调换到B201寝室',
    comment: '正在核实B201寝室空位情况',
    history: [
      {
        time: '2023-11-20 13:00:00',
        operator: '王审核员',
        action: '开始处理',
        progress: 0,
        comment: '接手审核任务'
      },
      {
        time: '2023-11-20 14:30:00',
        operator: '王审核员',
        action: '更新进度',
        progress: 25,
        comment: '正在核实B201寝室空位情况'
      }
    ]
  }
])

// 加载状态
const loading = ref(false)

// 对话框状态
const showTaskDetailDialog = ref(false)
const showUpdateProgressDialog = ref(false)
const currentTask = ref(null)
const progressFormRef = ref(null)

// 进度更新表单
const progressForm = reactive({
  taskId: null,
  progress: 0,
  comment: ''
})

// 表单验证规则
const progressFormRules = {
  progress: [
    { required: true, message: '请选择进度', trigger: 'change' }
  ],
  comment: [
    { required: true, message: '请输入处理备注', trigger: 'blur' }
  ]
}

// 获取进度颜色
const getProgressColor = (percentage) => {
  if (percentage < 30) return '#f56c6c'
  if (percentage < 70) return '#e6a23c'
  return '#67c23a'
}

// 获取任务类型名称
const getTypeName = (type) => {
  const typeMap = {
    review: '审核任务',
    dispute: '争议处理'
  }
  return typeMap[type] || '未知'
}

// 获取任务类型标签类型
const getTypeTagType = (type) => {
  const typeMap = {
    review: 'primary',
    dispute: 'warning'
  }
  return typeMap[type] || 'info'
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
  ElMessage.info(`已切换到${trendPeriod.value === 'week' ? '本周' : trendPeriod.value === 'month' ? '本月' : '本季度'}的趋势图`)
}

// 查看全部工作量
const viewAllWorkload = () => {
  ElMessage.info('查看全部工作量功能开发中')
}

// 查看工作量详情
const viewWorkloadDetail = (handler) => {
  ElMessage.info(`查看${handler.name}的工作量详情`)
}

// 筛选任务
const filterTasks = () => {
  loading.value = true
  // 模拟API调用
  setTimeout(() => {
    loading.value = false
    ElMessage.success('筛选完成')
  }, 500)
}

// 查看任务详情
const viewTaskDetail = (task) => {
  currentTask.value = { ...task }
  showTaskDetailDialog.value = true
}

// 更新任务进度
const updateTaskProgress = (task) => {
  progressForm.taskId = task.id
  progressForm.progress = task.progress
  progressForm.comment = ''
  showUpdateProgressDialog.value = true
}

// 提交进度更新
const submitProgressUpdate = () => {
  progressFormRef.value.validate((valid) => {
    if (valid) {
      // 模拟API调用
      const index = currentTasks.value.findIndex(t => t.id === progressForm.taskId)
      if (index !== -1) {
        currentTasks.value[index].progress = progressForm.progress
        currentTasks.value[index].comment = progressForm.comment
        
        // 添加处理历史
        currentTasks.value[index].history.push({
          time: new Date().toLocaleString(),
          operator: currentTasks.value[index].handler,
          action: '更新进度',
          progress: progressForm.progress,
          comment: progressForm.comment
        })
      }
      
      ElMessage.success('进度更新成功')
      showUpdateProgressDialog.value = false
    }
  })
}

// 组件挂载时加载数据
onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.progress-tracking {
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

.progress-content {
  padding: 20px;
  overflow-y: auto;
}

.overview-row {
  margin-bottom: 20px;
}

.overview-card {
  height: 220px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.card-header h3 {
  margin: 0;
  color: #303133;
}

.card-content {
  height: calc(100% - 100px);
}

.progress-stats {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat-label {
  color: #606266;
  font-size: 14px;
}

.stat-value {
  font-weight: bold;
  color: #303133;
}

.stat-value.up {
  color: #f56c6c;
}

.stat-value.down {
  color: #67c23a;
}

.chart-card {
  margin-bottom: 20px;
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

.workload-card {
  margin-bottom: 20px;
}

.workload-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.workload-card .card-header h3 {
  margin: 0;
  color: #303133;
}

.progress-text {
  margin-left: 10px;
  font-size: 14px;
  color: #606266;
}

.current-tasks-card {
  margin-bottom: 20px;
}

.current-tasks-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.current-tasks-card .card-header h3 {
  margin: 0;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.task-detail {
  padding: 10px 0;
}

.task-history {
  margin-top: 20px;
}

.task-history h3 {
  margin-bottom: 15px;
  color: #303133;
}

.history-item p {
  margin: 5px 0;
  font-size: 14px;
}
</style>