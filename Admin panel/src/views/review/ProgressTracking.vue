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
    
    <!-- 查看全部工作量对话框 -->
    <el-dialog v-model="showAllWorkloadDialog" title="处理人员工作量详情" width="80%" top="5vh">
      <el-table :data="allWorkloadData" style="width: 100%" v-loading="allWorkloadLoading">
        <el-table-column prop="name" label="处理人" width="120" />
        <el-table-column prop="department" label="部门" width="120" />
        <el-table-column prop="role" label="角色" width="120">
          <template #default="scope">
            <el-tag :type="scope.row.role === '审核员' ? 'primary' : 'warning'">
              {{ scope.row.role }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalTasks" label="总任务数" width="100" />
        <el-table-column prop="completedTasks" label="已完成" width="100" />
        <el-table-column prop="pendingTasks" label="待处理" width="100" />
        <el-table-column prop="avgProcessTime" label="平均处理时长" width="140" />
        <el-table-column prop="completionRate" label="完成率" width="120">
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
        <el-table-column prop="efficiency" label="效率评分" width="120">
          <template #default="scope">
            <el-rate
              v-model="scope.row.efficiency"
              disabled
              show-score
              text-color="#ff9900"
              score-template="{value}"
            />
          </template>
        </el-table-column>
        <el-table-column prop="lastActiveTime" label="最后活跃时间" width="160" />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="scope">
            <el-button type="primary" size="small" @click="viewWorkloadDetail(scope.row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAllWorkloadDialog = false">关闭</el-button>
          <el-button type="primary" @click="exportWorkloadData">导出数据</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 工作量详情对话框 -->
    <el-dialog v-model="showWorkloadDetailDialog" :title="currentWorkload ? `${currentWorkload.name}的工作量详情` : '工作量详情'" width="70%" top="5vh">
      <div v-if="currentWorkload" class="workload-detail">
        <el-row :gutter="20" class="detail-overview">
          <el-col :span="6">
            <el-statistic title="总任务数" :value="currentWorkload.totalTasks" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="已完成" :value="currentWorkload.completedTasks" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="待处理" :value="currentWorkload.pendingTasks" />
          </el-col>
          <el-col :span="6">
            <el-statistic title="完成率" :value="currentWorkload.completionRate" suffix="%" />
          </el-col>
        </el-row>
        
        <el-divider />
        
        <el-row :gutter="20" class="detail-stats">
          <el-col :span="8">
            <el-descriptions title="基本信息" :column="1" border>
              <el-descriptions-item label="姓名">{{ currentWorkload.name }}</el-descriptions-item>
              <el-descriptions-item label="部门">{{ currentWorkload.department }}</el-descriptions-item>
              <el-descriptions-item label="角色">
                <el-tag :type="currentWorkload.role === '审核员' ? 'primary' : 'warning'">
                  {{ currentWorkload.role }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="平均处理时长">{{ currentWorkload.avgProcessTime }}</el-descriptions-item>
              <el-descriptions-item label="效率评分">
                <el-rate
                  v-model="currentWorkload.efficiency"
                  disabled
                  show-score
                  text-color="#ff9900"
                  score-template="{value}"
                />
              </el-descriptions-item>
              <el-descriptions-item label="最后活跃时间">{{ currentWorkload.lastActiveTime }}</el-descriptions-item>
            </el-descriptions>
          </el-col>
          <el-col :span="16">
            <div class="chart-container">
              <h4>任务处理趋势</h4>
              <div class="chart-placeholder">
                <img src="https://picsum.photos/seed/workload-trend/600/300.jpg" alt="工作量趋势图" />
              </div>
            </div>
          </el-col>
        </el-row>
        
        <el-divider />
        
        <div class="task-list">
          <h4>最近处理任务</h4>
          <el-table :data="currentWorkload.recentTasks" style="width: 100%">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="type" label="类型" width="100">
              <template #default="scope">
                <el-tag :type="getTypeTagType(scope.row.type)">
                  {{ getTypeName(scope.row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="title" label="标题" width="200" />
            <el-table-column prop="startTime" label="开始时间" width="160" />
            <el-table-column prop="endTime" label="完成时间" width="160" />
            <el-table-column prop="processTime" label="处理时长" width="120" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="scope">
                <el-tag :type="scope.row.status === '已完成' ? 'success' : 'warning'">
                  {{ scope.row.status }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showWorkloadDetailDialog = false">关闭</el-button>
          <el-button type="primary" @click="exportPersonalWorkload">导出个人数据</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Download } from '@element-plus/icons-vue'

// 动态导入XLSX
let XLSX = null
const importXLSX = async () => {
  if (!XLSX) {
    XLSX = await import('xlsx')
  }
  return XLSX
}

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
const showAllWorkloadDialog = ref(false)
const showWorkloadDetailDialog = ref(false)
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

// 全部工作量数据
const allWorkloadData = ref([])
const allWorkloadLoading = ref(false)

// 当前工作量详情
const currentWorkload = ref(null)

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
const refreshData = async () => {
  loading.value = true
  try {
    // 模拟API调用 - 在实际应用中这里应该调用真实的API
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 更新进度概览数据
    reviewProgress.value = Math.floor(Math.random() * 30) + 70 // 70-100之间
    reviewPending.value = Math.floor(Math.random() * 10) + 5 // 5-15之间
    reviewProcessing.value = Math.floor(Math.random() * 10) + 5 // 5-15之间
    reviewCompleted.value = Math.floor(Math.random() * 50) + 50 // 50-100之间
    
    disputeProgress.value = Math.floor(Math.random() * 40) + 50 // 50-90之间
    disputePending.value = Math.floor(Math.random() * 8) + 3 // 3-11之间
    disputeProcessing.value = Math.floor(Math.random() * 8) + 3 // 3-11之间
    disputeResolved.value = Math.floor(Math.random() * 20) + 15 // 15-35之间
    
    todayProcessed.value = Math.floor(Math.random() * 10) + 15 // 15-25之间
    todayReviews.value = Math.floor(Math.random() * 8) + 8 // 8-16之间
    todayDisputes.value = Math.floor(Math.random() * 5) + 4 // 4-9之间
    todayCompletionRate.value = Math.floor(Math.random() * 20) + 75 // 75-95之间
    
    avgProcessTime.value = (Math.random() * 2 + 3).toFixed(1) // 3.0-5.0之间
    avgReviewTime.value = (Math.random() * 2 + 2.5).toFixed(1) // 2.5-4.5之间
    avgDisputeTime.value = (Math.random() * 3 + 4).toFixed(1) // 4.0-7.0之间
    timeTrend.value = (Math.random() * 2 - 1).toFixed(1) // -1.0到1.0之间
    
    // 更新处理人员工作量数据
    workloadData.value = workloadData.value.map(item => {
      const totalTasks = Math.floor(Math.random() * 20) + 15 // 15-35之间
      const completedTasks = Math.floor(Math.random() * totalTasks)
      const pendingTasks = totalTasks - completedTasks
      const completionRate = Math.floor((completedTasks / totalTasks) * 100)
      const avgProcessHours = (Math.random() * 3 + 2.5).toFixed(1)
      
      return {
        ...item,
        totalTasks,
        completedTasks,
        pendingTasks,
        avgProcessTime: `${avgProcessHours}小时`,
        completionRate
      }
    })
    
    // 更新当前处理任务的进度
    currentTasks.value = currentTasks.value.map(task => {
      // 随机增加一些进度，但不超过100%
      const progressIncrement = Math.floor(Math.random() * 15) + 1 // 1-15之间
      const newProgress = Math.min(task.progress + progressIncrement, 100)
      
      // 如果进度达到100%，更新完成时间
      let estimatedTime = task.estimatedTime
      if (newProgress === 100 && task.progress < 100) {
        const now = new Date()
        estimatedTime = now.toLocaleString()
        
        // 添加完成记录到历史
        task.history.push({
          time: now.toLocaleString(),
          operator: task.handler,
          action: '任务完成',
          progress: 100,
          comment: '任务已处理完成'
        })
      }
      
      return {
        ...task,
        progress: newProgress,
        estimatedTime
      }
    })
    
    ElMessage.success('数据刷新成功')
  } catch (error) {
    console.error('刷新数据失败:', error)
    ElMessage.error('数据刷新失败，请重试')
  } finally {
    loading.value = false
  }
}

// 导出报告
const exportReport = async () => {
  try {
    const XLSX = await importXLSX()
    
    // 创建工作簿
    const workbook = XLSX.utils.book_new()
    
    // 1. 创建进度概览工作表
    const overviewData = [
      ['进度跟踪报告', '', '', '', '', ''],
      ['生成时间', new Date().toLocaleString(), '', '', '', ''],
      ['', '', '', '', '', ''],
      ['审核进度', '', '', '', '', ''],
      ['待处理', reviewPending.value, '', '', '', ''],
      ['处理中', reviewProcessing.value, '', '', '', ''],
      ['已完成', reviewCompleted.value, '', '', '', ''],
      ['完成率', `${reviewProgress.value}%`, '', '', '', ''],
      ['', '', '', '', '', ''],
      ['争议处理进度', '', '', '', ''],
      ['待处理', disputePending.value, '', '', '', ''],
      ['处理中', disputeProcessing.value, '', '', '', ''],
      ['已解决', disputeResolved.value, '', '', '', ''],
      ['解决率', `${disputeProgress.value}%`, '', '', '', ''],
      ['', '', '', '', '', ''],
      ['今日处理情况', '', '', '', ''],
      ['总处理量', todayProcessed.value, '', '', '', ''],
      ['审核完成', todayReviews.value, '', '', '', ''],
      ['争议解决', todayDisputes.value, '', '', '', ''],
      ['完成率', `${todayCompletionRate.value}%`, '', '', '', ''],
      ['', '', '', '', '', ''],
      ['平均处理时长', '', '', '', ''],
      ['审核时长', `${avgReviewTime.value}小时`, '', '', '', ''],
      ['争议时长', `${avgDisputeTime.value}小时`, '', '', '', ''],
      ['总体平均', `${avgProcessTime.value}小时`, '', '', '', ''],
      ['较上月变化', `${timeTrend.value > 0 ? '+' : ''}${timeTrend.value}小时`, '', '', '', '']
    ]
    
    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewData)
    XLSX.utils.book_append_sheet(workbook, overviewSheet, '进度概览')
    
    // 2. 创建处理人员工作量工作表
    const workloadHeader = ['处理人', '总任务数', '已完成', '待处理', '平均处理时长', '完成率']
    const workloadRows = workloadData.value.map(item => [
      item.name,
      item.totalTasks,
      item.completedTasks,
      item.pendingTasks,
      item.avgProcessTime,
      `${item.completionRate}%`
    ])
    const workloadDataForSheet = [workloadHeader, ...workloadRows]
    
    const workloadSheet = XLSX.utils.aoa_to_sheet(workloadDataForSheet)
    XLSX.utils.book_append_sheet(workbook, workloadSheet, '处理人员工作量')
    
    // 3. 创建当前处理任务工作表
    const taskHeader = ['ID', '类型', '标题', '处理人', '开始时间', '进度', '预计完成时间', '任务内容', '处理备注']
    const taskRows = currentTasks.value.map(task => [
      task.id,
      getTypeName(task.type),
      task.title,
      task.handler,
      task.startTime,
      `${task.progress}%`,
      task.estimatedTime,
      task.content,
      task.comment || '暂无'
    ])
    const taskDataForSheet = [taskHeader, ...taskRows]
    
    const taskSheet = XLSX.utils.aoa_to_sheet(taskDataForSheet)
    XLSX.utils.book_append_sheet(workbook, taskSheet, '当前处理任务')
    
    // 设置列宽
    const colWidths = [
      { wch: 8 },  // ID
      { wch: 12 }, // 类型
      { wch: 25 }, // 标题
      { wch: 12 }, // 处理人
      { wch: 20 }, // 开始时间
      { wch: 10 }, // 进度
      { wch: 20 }, // 预计完成时间
      { wch: 40 }, // 任务内容
      { wch: 30 }  // 处理备注
    ]
    taskSheet['!cols'] = colWidths
    
    // 生成文件名
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hour = String(now.getHours()).padStart(2, '0')
    const minute = String(now.getMinutes()).padStart(2, '0')
    const fileName = `进度跟踪报告_${year}${month}${day}_${hour}${minute}.xlsx`
    
    // 导出文件
    XLSX.writeFile(workbook, fileName)
    
    ElMessage.success('报告导出成功')
  } catch (error) {
    console.error('导出报告失败:', error)
    ElMessage.error('导出报告失败，请重试')
  }
}

// 更新趋势图
const updateTrendChart = () => {
  ElMessage.info(`已切换到${trendPeriod.value === 'week' ? '本周' : trendPeriod.value === 'month' ? '本月' : '本季度'}的趋势图`)
}

// 查看全部工作量
const viewAllWorkload = async () => {
  allWorkloadLoading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // 生成更详细的工作量数据
    const handlers = ['张三', '李四', '王五', '赵六', '陈七', '刘八', '周九', '吴十']
    const departments = ['财务部', '审核部', '财务部', '审核部', '财务部', '审核部', '财务部', '审核部']
    const roles = ['审核员', '处理员', '审核员', '处理员', '审核员', '处理员', '审核员', '处理员']
    
    allWorkloadData.value = handlers.map((name, index) => {
      const totalTasks = Math.floor(Math.random() * 30) + 20
      const completedTasks = Math.floor(Math.random() * totalTasks)
      const pendingTasks = totalTasks - completedTasks
      const completionRate = Math.floor((completedTasks / totalTasks) * 100)
      const efficiency = (Math.random() * 2 + 3).toFixed(1) // 3.0-5.0的评分
      
      // 生成最近处理任务
      const recentTasks = []
      const taskTypes = ['expense', 'income', 'transfer', 'budget', 'report', 'audit']
      const taskCount = Math.floor(Math.random() * 5) + 3 // 3-7个任务
      
      for (let i = 0; i < taskCount; i++) {
        const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)]
        const startTime = new Date()
        startTime.setDate(startTime.getDate() - Math.floor(Math.random() * 30))
        
        const endTime = new Date(startTime)
        endTime.setHours(endTime.getHours() + Math.floor(Math.random() * 8) + 1)
        
        const processTime = `${Math.floor(Math.random() * 8) + 1}小时${Math.floor(Math.random() * 60)}分钟`
        const isCompleted = Math.random() > 0.3
        
        recentTasks.push({
          id: `T${1000 + index * 100 + i}`,
          type: taskType,
          title: `${getTypeName(taskType)}-${index + 1}-${i + 1}`,
          startTime: formatDateTime(startTime),
          endTime: isCompleted ? formatDateTime(endTime) : '-',
          processTime: isCompleted ? processTime : '-',
          status: isCompleted ? '已完成' : '处理中'
        })
      }
      
      return {
        name,
        department: departments[index],
        role: roles[index],
        totalTasks,
        completedTasks,
        pendingTasks,
        avgProcessTime: `${Math.floor(Math.random() * 2) + 1}小时${Math.floor(Math.random() * 60)}分钟`,
        completionRate,
        efficiency: parseFloat(efficiency),
        lastActiveTime: formatDateTime(new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000))),
        recentTasks
      }
    })
    
    showAllWorkloadDialog.value = true
    ElMessage.success('工作量数据加载完成')
  } catch (error) {
    console.error('获取工作量数据失败:', error)
    ElMessage.error('获取工作量数据失败')
  } finally {
    allWorkloadLoading.value = false
  }
}

// 格式化日期时间
const formatDateTime = (date) => {
  if (!date) return '-'
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 查看工作量详情
const viewWorkloadDetail = (workload) => {
  // 如果是从全部工作量对话框中点击的详情按钮
  if (workload && workload.name) {
    currentWorkload.value = workload
    showWorkloadDetailDialog.value = true
    return
  }
  
  // 如果是从处理人员工作量表格中点击的详情按钮
  if (typeof workload === 'string') {
    const handlerName = workload
    const existingData = allWorkloadData.value.find(item => item.name === handlerName)
    
    if (existingData) {
      currentWorkload.value = existingData
      showWorkloadDetailDialog.value = true
      return
    }
    
    // 如果没有现成的数据，生成详细数据
    const totalTasks = Math.floor(Math.random() * 30) + 20
    const completedTasks = Math.floor(Math.random() * totalTasks)
    const pendingTasks = totalTasks - completedTasks
    const completionRate = Math.floor((completedTasks / totalTasks) * 100)
    const efficiency = (Math.random() * 2 + 3).toFixed(1) // 3.0-5.0的评分
    
    // 生成最近处理任务
    const recentTasks = []
    const taskTypes = ['expense', 'income', 'transfer', 'budget', 'report', 'audit']
    const taskCount = Math.floor(Math.random() * 5) + 3 // 3-7个任务
    
    for (let i = 0; i < taskCount; i++) {
      const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)]
      const startTime = new Date()
      startTime.setDate(startTime.getDate() - Math.floor(Math.random() * 30))
      
      const endTime = new Date(startTime)
      endTime.setHours(endTime.getHours() + Math.floor(Math.random() * 8) + 1)
      
      const processTime = `${Math.floor(Math.random() * 8) + 1}小时${Math.floor(Math.random() * 60)}分钟`
      const isCompleted = Math.random() > 0.3
      
      recentTasks.push({
        id: `T${1000 + i}`,
        type: taskType,
        title: `${getTypeName(taskType)}-${i + 1}`,
        startTime: formatDateTime(startTime),
        endTime: isCompleted ? formatDateTime(endTime) : '-',
        processTime: isCompleted ? processTime : '-',
        status: isCompleted ? '已完成' : '处理中'
      })
    }
    
    currentWorkload.value = {
      name: handlerName,
      department: handlerName.includes('张') || handlerName.includes('王') || handlerName.includes('陈') || handlerName.includes('周') ? '财务部' : '审核部',
      role: handlerName.includes('张') || handlerName.includes('王') || handlerName.includes('陈') || handlerName.includes('周') ? '审核员' : '处理员',
      totalTasks,
      completedTasks,
      pendingTasks,
      avgProcessTime: `${Math.floor(Math.random() * 2) + 1}小时${Math.floor(Math.random() * 60)}分钟`,
      completionRate,
      efficiency: parseFloat(efficiency),
      lastActiveTime: formatDateTime(new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000))),
      recentTasks
    }
    
    showWorkloadDetailDialog.value = true
  }
}

// 导出工作量数据
const exportWorkloadData = async () => {
  try {
    const XLSX = await importXLSX()
    
    // 创建工作簿
    const workbook = XLSX.utils.book_new()
    
    // 工作量数据
    const workloadSheet = XLSX.utils.json_to_sheet(allWorkloadData.value.map(item => ({
      '处理人': item.name,
      '部门': item.department,
      '角色': item.role,
      '总任务数': item.totalTasks,
      '已完成': item.completedTasks,
      '待处理': item.pendingTasks,
      '平均处理时长': item.avgProcessTime,
      '完成率': `${item.completionRate}%`,
      '效率评分': item.efficiency,
      '最后活跃时间': item.lastActiveTime
    })))
    
    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, workloadSheet, '工作量统计')
    
    // 生成文件名
    const fileName = `工作量统计_${formatDateTime(new Date()).replace(/[\/\s:]/g, '-')}.xlsx`
    
    // 导出文件
    XLSX.writeFile(workbook, fileName)
    
    ElMessage.success('工作量数据导出成功')
  } catch (error) {
    console.error('导出工作量数据失败:', error)
    ElMessage.error('导出工作量数据失败')
  }
}

// 导出个人工作量数据
const exportPersonalWorkload = async () => {
  if (!currentWorkload.value) {
    ElMessage.warning('没有可导出的数据')
    return
  }
  
  try {
    const XLSX = await importXLSX()
    
    // 创建工作簿
    const workbook = XLSX.utils.book_new()
    
    // 基本信息工作表
    const basicInfo = [
      ['姓名', currentWorkload.value.name],
      ['部门', currentWorkload.value.department],
      ['角色', currentWorkload.value.role],
      ['总任务数', currentWorkload.value.totalTasks],
      ['已完成', currentWorkload.value.completedTasks],
      ['待处理', currentWorkload.value.pendingTasks],
      ['平均处理时长', currentWorkload.value.avgProcessTime],
      ['完成率', `${currentWorkload.value.completionRate}%`],
      ['效率评分', currentWorkload.value.efficiency],
      ['最后活跃时间', currentWorkload.value.lastActiveTime]
    ]
    
    const basicInfoSheet = XLSX.utils.aoa_to_sheet(basicInfo)
    
    // 任务列表工作表
    const taskSheet = XLSX.utils.json_to_sheet(currentWorkload.value.recentTasks.map(item => ({
      'ID': item.id,
      '类型': getTypeName(item.type),
      '标题': item.title,
      '开始时间': item.startTime,
      '完成时间': item.endTime,
      '处理时长': item.processTime,
      '状态': item.status
    })))
    
    // 添加工作表到工作簿
    XLSX.utils.book_append_sheet(workbook, basicInfoSheet, '基本信息')
    XLSX.utils.book_append_sheet(workbook, taskSheet, '任务列表')
    
    // 生成文件名
    const fileName = `${currentWorkload.value.name}工作量详情_${formatDateTime(new Date()).replace(/[\/\s:]/g, '-')}.xlsx`
    
    // 导出文件
    XLSX.writeFile(workbook, fileName)
    
    ElMessage.success('个人工作量数据导出成功')
  } catch (error) {
    console.error('导出个人工作量数据失败:', error)
    ElMessage.error('导出个人工作量数据失败')
  }
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
  background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
}

.page-header {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  border-bottom: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.header-content h1 {
  margin: 0 0 5px 0;
  color: #ffffff;
  font-size: 24px;
  font-weight: 600;
}

.header-content p {
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.header-actions .el-button {
  border-radius: 20px;
  padding: 10px 20px;
  font-weight: 500;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.header-actions .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.progress-content {
  padding: 25px;
  overflow-y: auto;
  height: calc(100vh - 88px);
}

.overview-row {
  margin-bottom: 25px;
}

.overview-card {
  height: 240px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
  border: none;
  overflow: hidden;
  position: relative;
}

.overview-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.overview-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: linear-gradient(to bottom, #409eff, #66b1ff);
}

.overview-card :deep(.el-card__body) {
  padding: 20px;
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card-header h3 {
  margin: 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.card-content {
  height: calc(100% - 110px);
}

.progress-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.stat-item:last-child {
  border-bottom: none;
}

.stat-label {
  color: #606266;
  font-size: 14px;
  font-weight: 500;
}

.stat-value {
  font-weight: 600;
  color: #303133;
  font-size: 15px;
}

.stat-value.up {
  color: #f56c6c;
}

.stat-value.down {
  color: #67c23a;
}

.chart-card {
  margin-bottom: 25px;
  height: 400px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: none;
}

.chart-card :deep(.el-card__body) {
  padding: 25px;
  height: 100%;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.chart-header h3 {
  margin: 0;
  color: #303133;
  font-size: 18px;
  font-weight: 600;
}

.chart-container {
  height: calc(100% - 60px);
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
  border-radius: 8px;
  overflow: hidden;
}

.chart-placeholder img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.workload-card {
  margin-bottom: 25px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: none;
}

.workload-card :deep(.el-card__body) {
  padding: 25px;
}

.workload-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.workload-card .card-header h3 {
  margin: 0;
  color: #303133;
  font-size: 18px;
  font-weight: 600;
}

.progress-text {
  margin-left: 10px;
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.current-tasks-card {
  margin-bottom: 25px;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  border: none;
}

.current-tasks-card :deep(.el-card__body) {
  padding: 25px;
}

.current-tasks-card .card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.current-tasks-card .card-header h3 {
  margin: 0;
  color: #303133;
  font-size: 18px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 10px;
}

:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

:deep(.el-table__header) {
  background-color: #f8f9fa;
}

:deep(.el-table th) {
  background-color: #f8f9fa !important;
  color: #606266;
  font-weight: 600;
}

:deep(.el-table--border .el-table__cell) {
  border-right: 1px solid #f0f0f0;
}

:deep(.el-table tbody tr) {
  transition: all 0.2s ease;
}

:deep(.el-table tbody tr:hover > td) {
  background-color: #f5f7ff !important;
}

:deep(.el-progress-bar__outer) {
  border-radius: 10px;
  background-color: #f0f2f5;
}

:deep(.el-progress-bar__inner) {
  border-radius: 10px;
}

:deep(.el-tag) {
  border-radius: 12px;
  font-weight: 500;
  padding: 4px 10px;
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  border: none;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
}

:deep(.el-button--primary:hover) {
  background: linear-gradient(135deg, #66b1ff 0%, #409eff 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

:deep(.el-button--success) {
  background: linear-gradient(135deg, #67c23a 0%, #85ce61 100%);
  border: none;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
}

:deep(.el-button--success:hover) {
  background: linear-gradient(135deg, #85ce61 0%, #67c23a 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.3);
}

:deep(.el-select .el-input__inner) {
  border-radius: 8px;
}

:deep(.el-dialog) {
  border-radius: 12px;
  overflow: hidden;
}

:deep(.el-dialog__header) {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  padding: 20px 25px;
  color: #fff;
}

:deep(.el-dialog__title) {
  color: #fff;
  font-weight: 600;
}

:deep(.el-dialog__headerbtn .el-dialog__close) {
  color: #fff;
}

:deep(.el-dialog__body) {
  padding: 25px;
}

:deep(.el-form-item__label) {
  font-weight: 600;
  color: #606266;
}

:deep(.el-input__inner) {
  border-radius: 8px;
  border: 1px solid #dcdfe6;
  transition: all 0.3s ease;
}

:deep(.el-input__inner:focus) {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

:deep(.el-textarea__inner) {
  border-radius: 8px;
  border: 1px solid #dcdfe6;
  transition: all 0.3s ease;
}

:deep(.el-textarea__inner:focus) {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

:deep(.el-slider__runway) {
  background-color: #f0f2f5;
}

:deep(.el-slider__bar) {
  background: linear-gradient(to right, #409eff, #66b1ff);
}

:deep(.el-slider__button) {
  border-color: #409eff;
}

.task-detail {
  padding: 15px 0;
}

:deep(.el-descriptions__title) {
  color: #303133;
  font-weight: 600;
  font-size: 16px;
}

:deep(.el-descriptions-item__label) {
  font-weight: 600;
  color: #606266;
}

.task-history {
  margin-top: 25px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.task-history h3 {
  margin-bottom: 20px;
  color: #303133;
  font-weight: 600;
}

:deep(.el-timeline-item__timestamp) {
  color: #909399;
  font-weight: 500;
}

.history-item {
  background-color: #fff;
  padding: 15px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  margin-bottom: 10px;
}

.history-item p {
  margin: 8px 0;
  font-size: 14px;
  line-height: 1.5;
}

.history-item strong {
  color: #409eff;
  font-weight: 600;
}

:deep(.el-radio-button__inner) {
  border-radius: 8px;
  border: 1px solid #dcdfe6;
  transition: all 0.3s ease;
}

:deep(.el-radio-button__orig-radio:checked + .el-radio-button__inner) {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .progress-content {
    padding: 15px;
  }
  
  .overview-card {
    height: 220px;
  }
  
  .chart-card {
    height: 350px;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    padding: 15px 20px;
  }
  
  .header-actions {
    margin-top: 15px;
    width: 100%;
  }
  
  .header-actions .el-button {
    flex: 1;
  }
  
  .overview-row .el-col {
    margin-bottom: 15px;
  }
  
  .chart-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .current-tasks-card .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .header-actions {
    width: 100%;
  }
  
  .header-actions .el-select {
    flex: 1;
  }
}

/* 工作量详情对话框样式 */
.workload-detail {
  padding: 10px 0;
}

.detail-overview {
  margin-bottom: 20px;
}

.detail-overview .el-statistic {
  text-align: center;
}

.detail-stats {
  margin-bottom: 20px;
}

.chart-container {
  height: 300px;
  display: flex;
  flex-direction: column;
}

.chart-container h4 {
  margin: 0 0 15px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.chart-placeholder {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f7fa;
  border-radius: 8px;
  overflow: hidden;
}

.chart-placeholder img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.task-list h4 {
  margin: 0 0 15px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.progress-text {
  margin-left: 10px;
  font-size: 14px;
  color: #606266;
}

:deep(.el-rate) {
  display: inline-flex;
  align-items: center;
}

:deep(.el-rate__text) {
  margin-left: 8px;
  font-size: 14px;
  color: #606266;
}
</style>