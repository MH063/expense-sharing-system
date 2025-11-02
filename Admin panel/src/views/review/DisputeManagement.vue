<template>
  <div class="dispute-management">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1>争议案件管理</h1>
          <p>管理和处理系统中的争议案件</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="createDispute">
            <el-icon><Plus /></el-icon>
            新建争议
          </el-button>
          <el-button @click="exportDisputes">
            <el-icon><Download /></el-icon>
            导出报告
          </el-button>
        </div>
      </el-header>
      
      <el-main class="disputes-content">
        <!-- 统计卡片 -->
        <el-row :gutter="20" class="stats-row">
          <el-col :span="6">
            <el-card class="stats-card">
              <el-statistic title="待处理争议" :value="pendingCount" />
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
              <el-statistic title="处理中争议" :value="processingCount" />
              <div class="stats-trend">
                <span class="trend-label">较昨日</span>
                <span :class="['trend-value', processingTrend > 0 ? 'up' : 'down']">
                  {{ processingTrend > 0 ? '+' : '' }}{{ processingTrend }}
                </span>
                <el-icon :class="processingTrend > 0 ? 'trend-up' : 'trend-down'">
                  <ArrowUp v-if="processingTrend > 0" />
                  <ArrowDown v-else />
                </el-icon>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="6">
            <el-card class="stats-card">
              <el-statistic title="今日已解决" :value="todayResolvedCount" />
              <div class="stats-trend">
                <span class="trend-label">解决率</span>
                <span class="trend-value">{{ resolutionRate }}%</span>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="6">
            <el-card class="stats-card">
              <el-statistic title="平均处理时长" :value="avgProcessTime" suffix="天" />
              <div class="stats-trend">
                <span class="trend-label">较上月</span>
                <span :class="['trend-value', timeTrend > 0 ? 'up' : 'down']">
                  {{ timeTrend > 0 ? '+' : '' }}{{ timeTrend.toFixed(1) }}天
                </span>
                <el-icon :class="timeTrend > 0 ? 'trend-up' : 'trend-down'">
                  <ArrowUp v-if="timeTrend > 0" />
                  <ArrowDown v-else />
                </el-icon>
              </div>
            </el-card>
          </el-col>
        </el-row>
        
        <!-- 搜索表单 -->
        <el-card class="search-card">
          <el-form :model="searchForm" :inline="true" class="search-form">
            <el-form-item label="争议ID">
              <el-input v-model="searchForm.id" placeholder="请输入争议ID" clearable />
            </el-form-item>
            <el-form-item label="争议类型">
              <el-select v-model="searchForm.type" placeholder="请选择争议类型" clearable>
                <el-option label="费用分摊" value="expense_sharing" />
                <el-option label="费用金额" value="expense_amount" />
                <el-option label="费用类别" value="expense_category" />
                <el-option label="用户行为" value="user_behavior" />
                <el-option label="其他" value="other" />
              </el-select>
            </el-form-item>
            <el-form-item label="发起人">
              <el-input v-model="searchForm.initiator" placeholder="请输入发起人" clearable />
            </el-form-item>
            <el-form-item label="处理人">
              <el-input v-model="searchForm.handler" placeholder="请输入处理人" clearable />
            </el-form-item>
            <el-form-item label="处理状态">
              <el-select v-model="searchForm.status" placeholder="请选择处理状态" clearable>
                <el-option label="待处理" value="pending" />
                <el-option label="处理中" value="processing" />
                <el-option label="已解决" value="resolved" />
                <el-option label="已关闭" value="closed" />
              </el-select>
            </el-form-item>
            <el-form-item label="创建时间">
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
              <el-button type="primary" @click="searchDisputes">查询</el-button>
              <el-button @click="resetSearch">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
        
        <!-- 争议案件列表 -->
        <el-card class="disputes-list-card">
          <div class="list-header">
            <h3>争议案件列表</h3>
            <div class="list-actions">
              <el-select v-model="filterPriority" placeholder="优先级" clearable @change="filterDisputes">
                <el-option label="全部" value="" />
                <el-option label="高" value="high" />
                <el-option label="中" value="medium" />
                <el-option label="低" value="low" />
              </el-select>
              <el-button type="primary" @click="filterDisputes">筛选</el-button>
            </div>
          </div>
          
          <el-table :data="disputeList" style="width: 100%" v-loading="loading">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="type" label="争议类型" width="120">
              <template #default="scope">
                <el-tag :type="getTypeTagType(scope.row.type)">
                  {{ getTypeName(scope.row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="title" label="标题" width="200" />
            <el-table-column prop="initiator" label="发起人" width="120" />
            <el-table-column prop="createTime" label="创建时间" width="160" />
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
            <el-table-column prop="handler" label="处理人" width="120" />
            <el-table-column prop="deadline" label="截止时间" width="160" />
            <el-table-column label="操作" width="250" fixed="right">
              <template #default="scope">
                <el-button type="primary" size="small" @click="viewDispute(scope.row)">查看</el-button>
                <el-button v-if="scope.row.status === 'pending'" size="small" @click="assignHandler(scope.row)">分配</el-button>
                <el-button v-if="scope.row.status === 'pending' || scope.row.status === 'processing'" size="small" @click="handleDispute(scope.row)">处理</el-button>
                <el-button v-if="scope.row.status === 'processing'" size="small" @click="resolveDispute(scope.row)">解决</el-button>
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
              :total="totalDisputes"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </el-card>
      </el-main>
    </el-container>
    
    <!-- 争议详情对话框 -->
    <el-dialog v-model="showDisputeDetailDialog" title="争议详情" width="800px">
      <div v-if="currentDispute" class="dispute-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="争议ID">{{ currentDispute.id }}</el-descriptions-item>
          <el-descriptions-item label="争议类型">
            <el-tag :type="getTypeTagType(currentDispute.type)">
              {{ getTypeName(currentDispute.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="标题">{{ currentDispute.title }}</el-descriptions-item>
          <el-descriptions-item label="发起人">{{ currentDispute.initiator }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ currentDispute.createTime }}</el-descriptions-item>
          <el-descriptions-item label="优先级">
            <el-tag :type="getPriorityTagType(currentDispute.priority)">
              {{ getPriorityName(currentDispute.priority) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTagType(currentDispute.status)">
              {{ getStatusName(currentDispute.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="处理人">{{ currentDispute.handler || '未分配' }}</el-descriptions-item>
          <el-descriptions-item label="截止时间">{{ currentDispute.deadline }}</el-descriptions-item>
          <el-descriptions-item label="争议内容" :span="2">{{ currentDispute.content }}</el-descriptions-item>
          <el-descriptions-item label="附件" :span="2">
            <el-button v-for="(file, index) in currentDispute.attachments" :key="index" type="text" @click="downloadFile(file)">
              {{ file.name }}
            </el-button>
            <span v-if="!currentDispute.attachments || currentDispute.attachments.length === 0">无</span>
          </el-descriptions-item>
          <el-descriptions-item label="处理意见" :span="2">{{ currentDispute.comment || '暂无' }}</el-descriptions-item>
        </el-descriptions>
        
        <!-- 处理历史 -->
        <div class="dispute-history" v-if="currentDispute.history && currentDispute.history.length > 0">
          <h3>处理历史</h3>
          <el-timeline>
            <el-timeline-item
              v-for="(item, index) in currentDispute.history"
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
        
        <!-- 处理操作 -->
        <div class="dispute-actions" v-if="currentDispute.status === 'pending' || currentDispute.status === 'processing'">
          <el-button type="primary" @click="handleDisputeAction">处理</el-button>
          <el-button type="success" @click="resolveDisputeAction">解决</el-button>
        </div>
      </div>
    </el-dialog>
    
    <!-- 分配处理人对话框 -->
    <el-dialog v-model="showAssignDialog" title="分配处理人" width="500px">
      <el-form :model="assignForm" :rules="assignFormRules" ref="assignFormRef" label-width="80px">
        <el-form-item label="处理人" prop="handlerId">
          <el-select v-model="assignForm.handlerId" placeholder="请选择处理人" style="width: 100%">
            <el-option
              v-for="handler in availableHandlers"
              :key="handler.id"
              :label="`${handler.name} (${handler.currentTasks}个任务)`"
              :value="handler.id"
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
    
    <!-- 处理争议对话框 -->
    <el-dialog v-model="showHandleDialog" title="处理争议" width="600px">
      <el-form :model="handleForm" :rules="handleFormRules" ref="handleFormRef" label-width="80px">
        <el-form-item label="处理方式" prop="method">
          <el-radio-group v-model="handleForm.method">
            <el-radio label="investigate">调查</el-radio>
            <el-radio label="mediate">调解</el-radio>
            <el-radio label="escalate">升级</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="处理意见" prop="comment">
          <el-input
            v-model="handleForm.comment"
            type="textarea"
            rows="4"
            placeholder="请输入处理意见"
          />
        </el-form-item>
        
        <el-form-item label="附件" prop="attachments">
          <el-upload
            action="#"
            :auto-upload="false"
            :on-change="handleFileChange"
            :file-list="handleForm.attachments"
            multiple
          >
            <el-button type="primary">点击上传</el-button>
            <template #tip>
              <div class="el-upload__tip">
                支持jpg/png/pdf文件，且不超过500kb
              </div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showHandleDialog = false">取消</el-button>
          <el-button type="primary" @click="submitHandle">确定</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 解决争议对话框 -->
    <el-dialog v-model="showResolveDialog" title="解决争议" width="600px">
      <el-form :model="resolveForm" :rules="resolveFormRules" ref="resolveFormRef" label-width="80px">
        <el-form-item label="解决结果" prop="result">
          <el-radio-group v-model="resolveForm.result">
            <el-radio label="approve">支持发起方</el-radio>
            <el-radio label="reject">驳回发起方</el-radio>
            <el-radio label="compromise">双方妥协</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="解决说明" prop="explanation">
          <el-input
            v-model="resolveForm.explanation"
            type="textarea"
            rows="4"
            placeholder="请输入解决说明"
          />
        </el-form-item>
        
        <el-form-item label="后续措施" prop="followUp">
          <el-input
            v-model="resolveForm.followUp"
            type="textarea"
            rows="3"
            placeholder="请输入后续措施"
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showResolveDialog = false">取消</el-button>
          <el-button type="primary" @click="submitResolve">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Download, ArrowUp, ArrowDown } from '@element-plus/icons-vue'

// 统计数据
const pendingCount = ref(12)
const pendingTrend = ref(2)
const processingCount = ref(8)
const processingTrend = ref(1)
const todayResolvedCount = ref(5)
const resolutionRate = ref(75)
const avgProcessTime = ref(3.2)
const timeTrend = ref(-0.3)

// 搜索表单
const searchForm = reactive({
  id: '',
  type: '',
  initiator: '',
  handler: '',
  status: '',
  dateRange: []
})

// 筛选条件
const filterPriority = ref('')

// 争议案件列表
const disputeList = ref([
  {
    id: 1,
    type: 'expense_sharing',
    title: '水费分摊争议',
    initiator: '张三',
    createTime: '2023-11-20 09:30:00',
    priority: 'high',
    status: 'pending',
    handler: null,
    deadline: '2023-11-25 18:00:00',
    content: '张三认为本月水费分摊不公，自己使用量少于平均值但分摊金额相同',
    attachments: [
      { id: 1, name: '水费账单.pdf', url: '/files/water_bill.pdf' },
      { id: 2, name: '用水记录.xlsx', url: '/files/water_usage.xlsx' }
    ],
    comment: '',
    history: [
      {
        time: '2023-11-20 09:30:00',
        operator: '张三',
        action: '创建争议',
        comment: '提交水费分摊争议'
      }
    ]
  },
  {
    id: 2,
    type: 'expense_amount',
    title: '电费金额争议',
    initiator: '李四',
    createTime: '2023-11-19 14:20:00',
    priority: 'medium',
    status: 'processing',
    handler: '王调解员',
    deadline: '2023-11-24 18:00:00',
    content: '李四认为本月电费金额异常，比上月高出50%但使用量相近',
    attachments: [
      { id: 3, name: '电费账单.pdf', url: '/files/electricity_bill.pdf' },
      { id: 4, name: '上月电费对比.pdf', url: '/files/electricity_comparison.pdf' }
    ],
    comment: '正在核实电费计费方式',
    history: [
      {
        time: '2023-11-19 14:20:00',
        operator: '李四',
        action: '创建争议',
        comment: '提交电费金额争议'
      },
      {
        time: '2023-11-20 10:00:00',
        operator: '王调解员',
        action: '开始处理',
        comment: '已接手争议处理'
      }
    ]
  },
  {
    id: 3,
    type: 'expense_category',
    title: '网费类别争议',
    initiator: '王五',
    createTime: '2023-11-18 16:45:00',
    priority: 'low',
    status: 'resolved',
    handler: '赵调解员',
    deadline: '2023-11-23 18:00:00',
    content: '王五认为网费应作为个人费用而非公共费用分摊',
    attachments: [
      { id: 5, name: '网费账单.pdf', url: '/files/internet_bill.pdf' }
    ],
    comment: '经核实，网费为寝室公共费用，驳回争议',
    history: [
      {
        time: '2023-11-18 16:45:00',
        operator: '王五',
        action: '创建争议',
        comment: '提交网费类别争议'
      },
      {
        time: '2023-11-19 09:00:00',
        operator: '赵调解员',
        action: '开始处理',
        comment: '已接手争议处理'
      },
      {
        time: '2023-11-20 15:30:00',
        operator: '赵调解员',
        action: '解决争议',
        comment: '经核实，网费为寝室公共费用，驳回争议'
      }
    ]
  },
  {
    id: 4,
    type: 'user_behavior',
    title: '费用缴纳延迟争议',
    initiator: '赵六',
    createTime: '2023-11-17 10:15:00',
    priority: 'medium',
    status: 'processing',
    handler: '钱调解员',
    deadline: '2023-11-22 18:00:00',
    content: '赵六因延迟缴纳费用被收取滞纳金，认为滞纳金过高',
    attachments: [
      { id: 6, name: '缴费记录.pdf', url: '/files/payment_record.pdf' },
      { id: 7, name: '滞纳金规则.pdf', url: '/files/late_fee_rules.pdf' }
    ],
    comment: '正在核实滞纳金收取标准',
    history: [
      {
        time: '2023-11-17 10:15:00',
        operator: '赵六',
        action: '创建争议',
        comment: '提交滞纳金争议'
      },
      {
        time: '2023-11-18 14:00:00',
        operator: '钱调解员',
        action: '开始处理',
        comment: '已接手争议处理'
      }
    ]
  },
  {
    id: 5,
    type: 'other',
    title: '寝室设备损坏责任争议',
    initiator: '孙七',
    createTime: '2023-11-16 09:30:00',
    priority: 'high',
    status: 'pending',
    handler: null,
    deadline: '2023-11-21 18:00:00',
    content: '寝室空调损坏，孙七认为是室友使用不当导致，要求共同承担维修费用',
    attachments: [
      { id: 8, name: '维修报价单.pdf', url: '/files/repair_quote.pdf' },
      { id: 9, name: '损坏照片.jpg', url: '/files/damage_photo.jpg' }
    ],
    comment: '',
    history: [
      {
        time: '2023-11-16 09:30:00',
        operator: '孙七',
        action: '创建争议',
        comment: '提交设备损坏责任争议'
      }
    ]
  }
])

// 可分配的处理人列表
const availableHandlers = ref([
  { id: 1, name: '王调解员', currentTasks: 2 },
  { id: 2, name: '李调解员', currentTasks: 1 },
  { id: 3, name: '张调解员', currentTasks: 3 },
  { id: 4, name: '赵调解员', currentTasks: 0 }
])

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)
const totalDisputes = ref(100)

// 加载状态
const loading = ref(false)

// 对话框状态
const showDisputeDetailDialog = ref(false)
const showAssignDialog = ref(false)
const showHandleDialog = ref(false)
const showResolveDialog = ref(false)
const currentDispute = ref(null)
const assignFormRef = ref(null)
const handleFormRef = ref(null)
const resolveFormRef = ref(null)

// 分配表单
const assignForm = reactive({
  disputeId: null,
  handlerId: null,
  comment: ''
})

// 处理表单
const handleForm = reactive({
  disputeId: null,
  method: 'investigate',
  comment: '',
  attachments: []
})

// 解决表单
const resolveForm = reactive({
  disputeId: null,
  result: 'approve',
  explanation: '',
  followUp: ''
})

// 表单验证规则
const assignFormRules = {
  handlerId: [
    { required: true, message: '请选择处理人', trigger: 'change' }
  ]
}

const handleFormRules = {
  method: [
    { required: true, message: '请选择处理方式', trigger: 'change' }
  ],
  comment: [
    { required: true, message: '请输入处理意见', trigger: 'blur' }
  ]
}

const resolveFormRules = {
  result: [
    { required: true, message: '请选择解决结果', trigger: 'change' }
  ],
  explanation: [
    { required: true, message: '请输入解决说明', trigger: 'blur' }
  ]
}

// 获取争议类型名称
const getTypeName = (type) => {
  const typeMap = {
    expense_sharing: '费用分摊',
    expense_amount: '费用金额',
    expense_category: '费用类别',
    user_behavior: '用户行为',
    other: '其他'
  }
  return typeMap[type] || '未知'
}

// 获取争议类型标签类型
const getTypeTagType = (type) => {
  const typeMap = {
    expense_sharing: 'primary',
    expense_amount: 'success',
    expense_category: 'warning',
    user_behavior: 'info',
    other: ''
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
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
    closed: '已关闭'
  }
  return statusMap[status] || '未知'
}

// 获取状态标签类型
const getStatusTagType = (status) => {
  const typeMap = {
    pending: 'warning',
    processing: 'primary',
    resolved: 'success',
    closed: 'info'
  }
  return typeMap[status] || 'info'
}

// 创建争议
const createDispute = () => {
  ElMessage.info('创建争议功能开发中')
}

// 导出争议报告
const exportDisputes = () => {
  ElMessage.success('报告导出成功')
}

// 搜索争议
const searchDisputes = () => {
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
  searchForm.initiator = ''
  searchForm.handler = ''
  searchForm.status = ''
  searchForm.dateRange = []
  searchDisputes()
}

// 筛选争议
const filterDisputes = () => {
  loading.value = true
  // 模拟API调用
  setTimeout(() => {
    loading.value = false
    ElMessage.success('筛选完成')
  }, 500)
}

// 查看争议详情
const viewDispute = (dispute) => {
  currentDispute.value = { ...dispute }
  showDisputeDetailDialog.value = true
}

// 分配处理人
const assignHandler = (dispute) => {
  assignForm.disputeId = dispute.id
  assignForm.handlerId = null
  assignForm.comment = ''
  showAssignDialog.value = true
}

// 处理争议
const handleDispute = (dispute) => {
  handleForm.disputeId = dispute.id
  handleForm.method = 'investigate'
  handleForm.comment = ''
  handleForm.attachments = []
  showHandleDialog.value = true
}

// 解决争议
const resolveDispute = (dispute) => {
  resolveForm.disputeId = dispute.id
  resolveForm.result = 'approve'
  resolveForm.explanation = ''
  resolveForm.followUp = ''
  showResolveDialog.value = true
}

// 处理争议操作（从详情对话框）
const handleDisputeAction = () => {
  handleDispute(currentDispute.value)
  showDisputeDetailDialog.value = false
}

// 解决争议操作（从详情对话框）
const resolveDisputeAction = () => {
  resolveDispute(currentDispute.value)
  showDisputeDetailDialog.value = false
}

// 提交分配
const submitAssign = () => {
  assignFormRef.value.validate((valid) => {
    if (valid) {
      // 模拟API调用
      const index = disputeList.value.findIndex(d => d.id === assignForm.disputeId)
      if (index !== -1) {
        const handler = availableHandlers.value.find(h => h.id === assignForm.handlerId)
        if (handler) {
          disputeList.value[index].handler = handler.name
          disputeList.value[index].status = 'processing'
          handler.currentTasks += 1
          
          // 添加处理历史
          disputeList.value[index].history.push({
            time: new Date().toLocaleString(),
            operator: handler.name,
            action: '开始处理',
            comment: assignForm.comment || '已接手争议处理'
          })
        }
      }
      
      ElMessage.success('分配成功')
      showAssignDialog.value = false
    }
  })
}

// 提交处理
const submitHandle = () => {
  handleFormRef.value.validate((valid) => {
    if (valid) {
      // 模拟API调用
      const index = disputeList.value.findIndex(d => d.id === handleForm.disputeId)
      if (index !== -1) {
        disputeList.value[index].comment = handleForm.comment
        
        // 添加处理历史
        const handler = disputeList.value[index].handler
        disputeList.value[index].history.push({
          time: new Date().toLocaleString(),
          operator: handler,
          action: '处理争议',
          comment: handleForm.comment
        })
      }
      
      ElMessage.success('处理成功')
      showHandleDialog.value = false
    }
  })
}

// 提交解决
const submitResolve = () => {
  resolveFormRef.value.validate((valid) => {
    if (valid) {
      // 模拟API调用
      const index = disputeList.value.findIndex(d => d.id === resolveForm.disputeId)
      if (index !== -1) {
        disputeList.value[index].status = 'resolved'
        disputeList.value[index].comment = resolveForm.explanation
        
        // 添加处理历史
        const handler = disputeList.value[index].handler
        disputeList.value[index].history.push({
          time: new Date().toLocaleString(),
          operator: handler,
          action: '解决争议',
          comment: `解决结果: ${resolveForm.result}, 说明: ${resolveForm.explanation}, 后续措施: ${resolveForm.followUp}`
        })
        
        // 更新处理人任务数
        const handlerIndex = availableHandlers.value.findIndex(h => h.name === handler)
        if (handlerIndex !== -1) {
          availableHandlers.value[handlerIndex].currentTasks -= 1
        }
      }
      
      ElMessage.success('争议已解决')
      showResolveDialog.value = false
    }
  })
}

// 处理文件变化
const handleFileChange = (file, fileList) => {
  handleForm.attachments = fileList
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
  searchDisputes()
}

// 处理当前页变化
const handleCurrentChange = (page) => {
  currentPage.value = page
  // 重新加载数据
  searchDisputes()
}

// 组件挂载时加载数据
onMounted(() => {
  searchDisputes()
})
</script>

<style scoped>
.dispute-management {
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

.disputes-content {
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

.search-card {
  margin-bottom: 20px;
}

.search-form {
  display: flex;
  flex-wrap: wrap;
}

.disputes-list-card {
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

.dispute-detail {
  padding: 10px 0;
}

.dispute-history {
  margin-top: 20px;
}

.dispute-history h3 {
  margin-bottom: 15px;
  color: #303133;
}

.history-item p {
  margin: 5px 0;
  font-size: 14px;
}

.dispute-actions {
  margin-top: 20px;
  display: flex;
  gap: 10px;
}
</style>