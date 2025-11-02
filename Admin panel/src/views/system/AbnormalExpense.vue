<template>
  <div class="abnormal-expense">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1>异常费用识别</h1>
          <p>自动识别和处理系统中的异常费用</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="runDetection">
            <el-icon><Search /></el-icon>
            运行检测
          </el-button>
          <el-button @click="exportReport">
            <el-icon><Download /></el-icon>
            导出报告
          </el-button>
        </div>
      </el-header>
      
      <el-main class="abnormal-content">
        <!-- 检测规则配置 -->
        <el-card class="rules-card">
          <div class="card-header">
            <h3>检测规则配置</h3>
            <el-button type="primary" size="small" @click="showAddRuleDialog = true">
              <el-icon><Plus /></el-icon>
              添加规则
            </el-button>
          </div>
          
          <el-table :data="detectionRules" style="width: 100%">
            <el-table-column prop="name" label="规则名称" width="200" />
            <el-table-column prop="type" label="规则类型" width="120">
              <template #default="scope">
                <el-tag :type="getRuleTypeTagType(scope.row.type)">
                  {{ getRuleTypeName(scope.row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="规则描述" />
            <el-table-column prop="threshold" label="阈值" width="120" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="scope">
                <el-switch
                  v-model="scope.row.enabled"
                  @change="toggleRule(scope.row)"
                />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="scope">
                <el-button size="small" @click="editRule(scope.row)">编辑</el-button>
                <el-button type="danger" size="small" @click="deleteRule(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
        
        <!-- 异常费用列表 -->
        <el-card class="abnormal-list-card">
          <div class="list-header">
            <h3>异常费用列表</h3>
            <div class="list-actions">
              <el-select v-model="filterStatus" placeholder="处理状态" clearable @change="filterAbnormalExpenses">
                <el-option label="全部" value="" />
                <el-option label="待处理" value="pending" />
                <el-option label="已确认" value="confirmed" />
                <el-option label="已忽略" value="ignored" />
              </el-select>
              <el-select v-model="filterSeverity" placeholder="严重程度" clearable @change="filterAbnormalExpenses">
                <el-option label="全部" value="" />
                <el-option label="低" value="low" />
                <el-option label="中" value="medium" />
                <el-option label="高" value="high" />
              </el-select>
              <el-button type="primary" @click="filterAbnormalExpenses">筛选</el-button>
            </div>
          </div>
          
          <el-table :data="abnormalExpenses" style="width: 100%" v-loading="loading">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="expenseId" label="费用ID" width="100" />
            <el-table-column prop="category" label="费用类型" width="100">
              <template #default="scope">
                <el-tag :type="getCategoryTagType(scope.row.category)">
                  {{ getCategoryName(scope.row.category) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" width="120">
              <template #default="scope">
                ¥{{ scope.row.amount.toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="payer" label="支付人" width="120" />
            <el-table-column prop="dorm" label="寝室" width="100" />
            <el-table-column prop="date" label="日期" width="120" />
            <el-table-column prop="severity" label="严重程度" width="100">
              <template #default="scope">
                <el-tag :type="getSeverityTagType(scope.row.severity)">
                  {{ getSeverityName(scope.row.severity) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="处理状态" width="100">
              <template #default="scope">
                <el-tag :type="getStatusTagType(scope.row.status)">
                  {{ getStatusName(scope.row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="scope">
                <el-button type="primary" size="small" @click="viewAbnormalExpense(scope.row)">查看</el-button>
                <el-button v-if="scope.row.status === 'pending'" size="small" @click="confirmAbnormal(scope.row)">确认</el-button>
                <el-button v-if="scope.row.status === 'pending'" size="small" @click="ignoreAbnormal(scope.row)">忽略</el-button>
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
              :total="totalAbnormalExpenses"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </el-card>
        
        <!-- 统计图表 -->
        <el-row :gutter="20" class="chart-row">
          <el-col :span="12">
            <el-card class="chart-card">
              <div class="chart-header">
                <h3>异常费用趋势</h3>
              </div>
              <div class="chart-container">
                <!-- 这里应该使用图表库，如ECharts -->
                <div class="chart-placeholder">
                  <img src="https://picsum.photos/seed/abnormal-trend/500/300.jpg" alt="异常费用趋势" />
                </div>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="12">
            <el-card class="chart-card">
              <div class="chart-header">
                <h3>异常类型分布</h3>
              </div>
              <div class="chart-container">
                <!-- 这里应该使用图表库，如ECharts -->
                <div class="chart-placeholder">
                  <img src="https://picsum.photos/seed/abnormal-type/500/300.jpg" alt="异常类型分布" />
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-main>
    </el-container>
    
    <!-- 添加/编辑规则对话框 -->
    <el-dialog
      v-model="showAddRuleDialog"
      :title="isEditRule ? '编辑规则' : '添加规则'"
      width="600px"
    >
      <el-form :model="ruleForm" :rules="ruleFormRules" ref="ruleFormRef" label-width="100px">
        <el-form-item label="规则名称" prop="name">
          <el-input v-model="ruleForm.name" placeholder="请输入规则名称" />
        </el-form-item>
        
        <el-form-item label="规则类型" prop="type">
          <el-select v-model="ruleForm.type" placeholder="请选择规则类型" style="width: 100%">
            <el-option label="金额阈值" value="amount_threshold" />
            <el-option label="频率异常" value="frequency_anomaly" />
            <el-option label="时间异常" value="time_anomaly" />
            <el-option label="类型异常" value="category_anomaly" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="规则描述" prop="description">
          <el-input v-model="ruleForm.description" type="textarea" rows="3" placeholder="请输入规则描述" />
        </el-form-item>
        
        <el-form-item label="阈值" prop="threshold">
          <el-input-number v-model="ruleForm.threshold" :min="0" style="width: 100%" />
        </el-form-item>
        
        <el-form-item label="严重程度" prop="severity">
          <el-select v-model="ruleForm.severity" placeholder="请选择严重程度" style="width: 100%">
            <el-option label="低" value="low" />
            <el-option label="中" value="medium" />
            <el-option label="高" value="high" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="启用状态" prop="enabled">
          <el-switch v-model="ruleForm.enabled" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddRuleDialog = false">取消</el-button>
          <el-button type="primary" @click="saveRule">确定</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 异常费用详情对话框 -->
    <el-dialog v-model="showAbnormalDetailDialog" title="异常费用详情" width="700px">
      <div v-if="currentAbnormalExpense" class="abnormal-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="异常ID">{{ currentAbnormalExpense.id }}</el-descriptions-item>
          <el-descriptions-item label="费用ID">{{ currentAbnormalExpense.expenseId }}</el-descriptions-item>
          <el-descriptions-item label="费用类型">
            <el-tag :type="getCategoryTagType(currentAbnormalExpense.category)">
              {{ getCategoryName(currentAbnormalExpense.category) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="金额">¥{{ currentAbnormalExpense.amount.toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="支付人">{{ currentAbnormalExpense.payer }}</el-descriptions-item>
          <el-descriptions-item label="寝室">{{ currentAbnormalExpense.dorm }}</el-descriptions-item>
          <el-descriptions-item label="支付日期">{{ currentAbnormalExpense.date }}</el-descriptions-item>
          <el-descriptions-item label="严重程度">
            <el-tag :type="getSeverityTagType(currentAbnormalExpense.severity)">
              {{ getSeverityName(currentAbnormalExpense.severity) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="处理状态">
            <el-tag :type="getStatusTagType(currentAbnormalExpense.status)">
              {{ getStatusName(currentAbnormalExpense.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="检测时间">{{ currentAbnormalExpense.detectTime }}</el-descriptions-item>
          <el-descriptions-item label="触发规则">{{ currentAbnormalExpense.ruleName }}</el-descriptions-item>
          <el-descriptions-item label="异常原因" :span="2">{{ currentAbnormalExpense.reason }}</el-descriptions-item>
          <el-descriptions-item label="处理备注" :span="2">{{ currentAbnormalExpense.handleRemark || '无' }}</el-descriptions-item>
        </el-descriptions>
        
        <div class="abnormal-actions">
          <el-button v-if="currentAbnormalExpense.status === 'pending'" type="success" @click="confirmAbnormal(currentAbnormalExpense)">确认异常</el-button>
          <el-button v-if="currentAbnormalExpense.status === 'pending'" @click="ignoreAbnormal(currentAbnormalExpense)">忽略异常</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Download, Plus } from '@element-plus/icons-vue'

// 检测规则列表
const detectionRules = ref([
  {
    id: 1,
    name: '高额费用检测',
    type: 'amount_threshold',
    description: '检测超过平均费用50%的费用',
    threshold: 50,
    severity: 'high',
    enabled: true
  },
  {
    id: 2,
    name: '频繁支付检测',
    type: 'frequency_anomaly',
    description: '检测同一用户24小时内超过3次支付',
    threshold: 3,
    severity: 'medium',
    enabled: true
  },
  {
    id: 3,
    name: '非工作时间支付检测',
    type: 'time_anomaly',
    description: '检测凌晨1点至6点的支付行为',
    threshold: 0,
    severity: 'low',
    enabled: false
  },
  {
    id: 4,
    name: '异常类型检测',
    type: 'category_anomaly',
    description: '检测系统中不常见的费用类型',
    threshold: 0,
    severity: 'medium',
    enabled: true
  }
])

// 异常费用列表
const abnormalExpenses = ref([
  {
    id: 1,
    expenseId: 102,
    category: 'electricity',
    amount: 350.00,
    payer: '张三',
    dorm: 'A101',
    date: '2023-11-20',
    severity: 'high',
    status: 'pending',
    detectTime: '2023-11-20 10:30:00',
    ruleName: '高额费用检测',
    reason: '电费金额350.00元，超过平均电费50%',
    handleRemark: ''
  },
  {
    id: 2,
    expenseId: 105,
    category: 'water',
    amount: 80.00,
    payer: '李四',
    dorm: 'B201',
    date: '2023-11-19',
    severity: 'medium',
    status: 'confirmed',
    detectTime: '2023-11-19 15:20:00',
    ruleName: '高额费用检测',
    reason: '水费金额80.00元，超过平均水费30%',
    handleRemark: '已确认异常，已联系用户核实'
  },
  {
    id: 3,
    expenseId: 108,
    category: 'other',
    amount: 500.00,
    payer: '王五',
    dorm: 'C301',
    date: '2023-11-18',
    severity: 'high',
    status: 'ignored',
    detectTime: '2023-11-18 16:45:00',
    ruleName: '高额费用检测',
    reason: '其他费用500.00元，超过平均其他费用200%',
    handleRemark: '已忽略，用户已提供购买凭证'
  },
  {
    id: 4,
    expenseId: 112,
    category: 'internet',
    amount: 50.00,
    payer: '赵六',
    dorm: 'D401',
    date: '2023-11-17',
    severity: 'low',
    status: 'pending',
    detectTime: '2023-11-17 09:15:00',
    ruleName: '非工作时间支付检测',
    reason: '支付时间02:30，属于非工作时间',
    handleRemark: ''
  }
])

// 筛选条件
const filterStatus = ref('')
const filterSeverity = ref('')

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)
const totalAbnormalExpenses = ref(50)

// 加载状态
const loading = ref(false)

// 对话框状态
const showAddRuleDialog = ref(false)
const showAbnormalDetailDialog = ref(false)
const isEditRule = ref(false)
const currentAbnormalExpense = ref(null)
const ruleFormRef = ref(null)

// 规则表单
const ruleForm = reactive({
  id: null,
  name: '',
  type: 'amount_threshold',
  description: '',
  threshold: 0,
  severity: 'medium',
  enabled: true
})

// 表单验证规则
const ruleFormRules = {
  name: [
    { required: true, message: '请输入规则名称', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择规则类型', trigger: 'change' }
  ],
  description: [
    { required: true, message: '请输入规则描述', trigger: 'blur' }
  ],
  threshold: [
    { required: true, message: '请输入阈值', trigger: 'blur' }
  ],
  severity: [
    { required: true, message: '请选择严重程度', trigger: 'change' }
  ]
}

// 获取规则类型名称
const getRuleTypeName = (type) => {
  const typeMap = {
    amount_threshold: '金额阈值',
    frequency_anomaly: '频率异常',
    time_anomaly: '时间异常',
    category_anomaly: '类型异常'
  }
  return typeMap[type] || '未知'
}

// 获取规则类型标签类型
const getRuleTypeTagType = (type) => {
  const typeMap = {
    amount_threshold: 'danger',
    frequency_anomaly: 'warning',
    time_anomaly: 'info',
    category_anomaly: 'primary'
  }
  return typeMap[type] || 'info'
}

// 获取费用类型名称
const getCategoryName = (category) => {
  const categoryMap = {
    water: '水费',
    electricity: '电费',
    internet: '网费',
    other: '其他'
  }
  return categoryMap[category] || '未知'
}

// 获取费用类型标签类型
const getCategoryTagType = (category) => {
  const typeMap = {
    water: 'primary',
    electricity: 'success',
    internet: 'info',
    other: 'warning'
  }
  return typeMap[category] || 'info'
}

// 获取严重程度名称
const getSeverityName = (severity) => {
  const severityMap = {
    low: '低',
    medium: '中',
    high: '高'
  }
  return severityMap[severity] || '未知'
}

// 获取严重程度标签类型
const getSeverityTagType = (severity) => {
  const typeMap = {
    low: 'info',
    medium: 'warning',
    high: 'danger'
  }
  return typeMap[severity] || 'info'
}

// 获取状态名称
const getStatusName = (status) => {
  const statusMap = {
    pending: '待处理',
    confirmed: '已确认',
    ignored: '已忽略'
  }
  return statusMap[status] || '未知'
}

// 获取状态标签类型
const getStatusTagType = (status) => {
  const typeMap = {
    pending: 'warning',
    confirmed: 'success',
    ignored: 'info'
  }
  return typeMap[status] || 'info'
}

// 运行检测
const runDetection = () => {
  loading.value = true
  // 模拟API调用
  setTimeout(() => {
    loading.value = false
    ElMessage.success('检测完成，发现3个新的异常费用')
  }, 2000)
}

// 导出报告
const exportReport = () => {
  ElMessage.success('报告导出成功')
}

// 切换规则状态
const toggleRule = (rule) => {
  ElMessage.success(`规则"${rule.name}"已${rule.enabled ? '启用' : '禁用'}`)
}

// 编辑规则
const editRule = (rule) => {
  isEditRule.value = true
  Object.assign(ruleForm, rule)
  showAddRuleDialog.value = true
}

// 删除规则
const deleteRule = (rule) => {
  ElMessageBox.confirm(
    `确定要删除规则"${rule.name}"吗？`,
    '删除规则',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(() => {
      // 模拟API调用
      const index = detectionRules.value.findIndex(r => r.id === rule.id)
      if (index !== -1) {
        detectionRules.value.splice(index, 1)
        ElMessage.success('删除成功')
      }
    })
    .catch(() => {
      ElMessage.info('已取消操作')
    })
}

// 保存规则
const saveRule = () => {
  ruleFormRef.value.validate((valid) => {
    if (valid) {
      if (isEditRule.value) {
        // 编辑规则
        const index = detectionRules.value.findIndex(r => r.id === ruleForm.id)
        if (index !== -1) {
          detectionRules.value[index] = { ...ruleForm }
          ElMessage.success('更新成功')
        }
      } else {
        // 添加规则
        const newRule = {
          ...ruleForm,
          id: detectionRules.value.length + 1
        }
        detectionRules.value.push(newRule)
        ElMessage.success('添加成功')
      }
      showAddRuleDialog.value = false
      resetRuleForm()
    }
  })
}

// 筛选异常费用
const filterAbnormalExpenses = () => {
  loading.value = true
  // 模拟API调用
  setTimeout(() => {
    loading.value = false
    ElMessage.success('筛选完成')
  }, 500)
}

// 查看异常费用详情
const viewAbnormalExpense = (abnormalExpense) => {
  currentAbnormalExpense.value = { ...abnormalExpense }
  showAbnormalDetailDialog.value = true
}

// 确认异常
const confirmAbnormal = (abnormalExpense) => {
  ElMessageBox.prompt('请输入处理备注', '确认异常', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputType: 'textarea',
    inputPlaceholder: '请输入处理备注'
  })
    .then(({ value }) => {
      // 模拟API调用
      const index = abnormalExpenses.value.findIndex(a => a.id === abnormalExpense.id)
      if (index !== -1) {
        abnormalExpenses.value[index].status = 'confirmed'
        abnormalExpenses.value[index].handleRemark = value || '已确认异常'
      }
      
      // 如果是从详情对话框操作的，也更新当前显示的数据
      if (currentAbnormalExpense.value && currentAbnormalExpense.value.id === abnormalExpense.id) {
        currentAbnormalExpense.value.status = 'confirmed'
        currentAbnormalExpense.value.handleRemark = value || '已确认异常'
      }
      
      ElMessage.success('已确认异常')
      showAbnormalDetailDialog.value = false
    })
    .catch(() => {
      ElMessage.info('已取消操作')
    })
}

// 忽略异常
const ignoreAbnormal = (abnormalExpense) => {
  ElMessageBox.prompt('请输入忽略原因', '忽略异常', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputType: 'textarea',
    inputPlaceholder: '请输入忽略原因'
  })
    .then(({ value }) => {
      // 模拟API调用
      const index = abnormalExpenses.value.findIndex(a => a.id === abnormalExpense.id)
      if (index !== -1) {
        abnormalExpenses.value[index].status = 'ignored'
        abnormalExpenses.value[index].handleRemark = value || '已忽略异常'
      }
      
      // 如果是从详情对话框操作的，也更新当前显示的数据
      if (currentAbnormalExpense.value && currentAbnormalExpense.value.id === abnormalExpense.id) {
        currentAbnormalExpense.value.status = 'ignored'
        currentAbnormalExpense.value.handleRemark = value || '已忽略异常'
      }
      
      ElMessage.success('已忽略异常')
      showAbnormalDetailDialog.value = false
    })
    .catch(() => {
      ElMessage.info('已取消操作')
    })
}

// 重置规则表单
const resetRuleForm = () => {
  ruleForm.id = null
  ruleForm.name = ''
  ruleForm.type = 'amount_threshold'
  ruleForm.description = ''
  ruleForm.threshold = 0
  ruleForm.severity = 'medium'
  ruleForm.enabled = true
  isEditRule.value = false
}

// 处理分页大小变化
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  // 重新加载数据
  filterAbnormalExpenses()
}

// 处理当前页变化
const handleCurrentChange = (page) => {
  currentPage.value = page
  // 重新加载数据
  filterAbnormalExpenses()
}

// 组件挂载时加载数据
onMounted(() => {
  filterAbnormalExpenses()
})
</script>

<style scoped>
.abnormal-expense {
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

.abnormal-content {
  padding: 20px;
  overflow-y: auto;
}

.rules-card {
  margin-bottom: 20px;
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

.abnormal-list-card {
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

.chart-row {
  margin-bottom: 20px;
}

.chart-card {
  height: 350px;
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

.abnormal-detail {
  padding: 10px 0;
}

.abnormal-actions {
  margin-top: 20px;
  display: flex;
  gap: 10px;
}
</style>