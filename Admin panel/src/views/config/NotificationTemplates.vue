<template>
  <div class="notification-templates">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1>通知模板配置</h1>
          <p>管理系统通知模板和消息内容</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="addTemplate">
            <el-icon><Plus /></el-icon>
            添加模板
          </el-button>
          <el-button @click="refreshTemplates">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </el-header>
      
      <el-main class="templates-content">
        <!-- 模板筛选 -->
        <el-card class="filter-card">
          <el-form :model="filterForm" inline>
            <el-form-item label="通知类型">
              <el-select v-model="filterForm.type" placeholder="请选择通知类型" clearable>
                <el-option label="用户注册" value="userRegister" />
                <el-option label="用户登录" value="userLogin" />
                <el-option label="费用提交" value="expenseSubmit" />
                <el-option label="费用审核通过" value="expenseApproved" />
                <el-option label="费用审核拒绝" value="expenseRejected" />
                <el-option label="争议创建" value="disputeCreated" />
                <el-option label="争议解决" value="disputeResolved" />
                <el-option label="系统错误" value="systemError" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="发送渠道">
              <el-select v-model="filterForm.channel" placeholder="请选择发送渠道" clearable>
                <el-option label="邮件" value="email" />
                <el-option label="短信" value="sms" />
                <el-option label="站内消息" value="internal" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="状态">
              <el-select v-model="filterForm.status" placeholder="请选择状态" clearable>
                <el-option label="启用" value="active" />
                <el-option label="禁用" value="inactive" />
              </el-select>
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="filterTemplates">查询</el-button>
              <el-button @click="resetFilter">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
        
        <!-- 模板列表 -->
        <el-card class="templates-card">
          <el-table :data="templatesList" style="width: 100%" v-loading="loading">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="name" label="模板名称" width="150" />
            <el-table-column prop="type" label="通知类型" width="120">
              <template #default="scope">
                <el-tag :type="getTypeTagType(scope.row.type)">
                  {{ getTypeName(scope.row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="channel" label="发送渠道" width="100">
              <template #default="scope">
                <el-tag :type="getChannelTagType(scope.row.channel)">
                  {{ getChannelName(scope.row.channel) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="subject" label="标题" width="200" />
            <el-table-column prop="description" label="描述" min-width="200" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="scope">
                <el-switch
                  v-model="scope.row.status"
                  active-value="active"
                  inactive-value="inactive"
                  @change="changeTemplateStatus(scope.row)"
                />
              </template>
            </el-table-column>
            <el-table-column prop="createTime" label="创建时间" width="160" />
            <el-table-column label="操作" width="250" fixed="right">
              <template #default="scope">
                <el-button type="primary" size="small" @click="viewTemplate(scope.row)">查看</el-button>
                <el-button size="small" @click="editTemplate(scope.row)">编辑</el-button>
                <el-button type="success" size="small" @click="testTemplate(scope.row)">测试</el-button>
                <el-button type="danger" size="small" @click="deleteTemplate(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <!-- 分页 -->
          <div class="pagination-container">
            <el-pagination
              v-model:current-page="pagination.currentPage"
              v-model:page-size="pagination.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="pagination.total"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </el-card>
      </el-main>
    </el-container>
    
    <!-- 添加/编辑模板对话框 -->
    <el-dialog
      v-model="showTemplateDialog"
      :title="isEdit ? '编辑模板' : '添加模板'"
      width="800px"
    >
      <el-form :model="templateForm" :rules="templateFormRules" ref="templateFormRef" label-width="100px">
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="templateForm.name" placeholder="请输入模板名称" />
        </el-form-item>
        
        <el-form-item label="通知类型" prop="type">
          <el-select v-model="templateForm.type" placeholder="请选择通知类型" @change="handleTypeChange">
            <el-option label="用户注册" value="userRegister" />
            <el-option label="用户登录" value="userLogin" />
            <el-option label="费用提交" value="expenseSubmit" />
            <el-option label="费用审核通过" value="expenseApproved" />
            <el-option label="费用审核拒绝" value="expenseRejected" />
            <el-option label="争议创建" value="disputeCreated" />
            <el-option label="争议解决" value="disputeResolved" />
            <el-option label="系统错误" value="systemError" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="发送渠道" prop="channel">
          <el-select v-model="templateForm.channel" placeholder="请选择发送渠道" @change="handleChannelChange">
            <el-option label="邮件" value="email" />
            <el-option label="短信" value="sms" />
            <el-option label="站内消息" value="internal" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="标题" prop="subject" v-if="templateForm.channel === 'email' || templateForm.channel === 'internal'">
          <el-input v-model="templateForm.subject" placeholder="请输入通知标题" />
        </el-form-item>
        
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="templateForm.description"
            type="textarea"
            rows="2"
            placeholder="请输入模板描述"
          />
        </el-form-item>
        
        <el-form-item label="模板内容" prop="content">
          <el-input
            v-model="templateForm.content"
            type="textarea"
            rows="8"
            placeholder="请输入模板内容，可使用变量如 {username}, {amount} 等"
          />
        </el-form-item>
        
        <!-- 可用变量提示 -->
        <el-form-item label="可用变量">
          <div class="variables-hint">
            <el-tag
              v-for="variable in availableVariables"
              :key="variable"
              @click="insertVariable(variable)"
              class="variable-tag"
            >
              {{ variable }}
            </el-tag>
          </div>
        </el-form-item>
        
        <el-form-item label="状态">
          <el-radio-group v-model="templateForm.status">
            <el-radio label="active">启用</el-radio>
            <el-radio label="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showTemplateDialog = false">取消</el-button>
          <el-button type="primary" @click="submitTemplate">确定</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 查看模板详情对话框 -->
    <el-dialog v-model="showTemplateDetailDialog" title="模板详情" width="800px">
      <div v-if="currentTemplate" class="template-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="模板ID">{{ currentTemplate.id }}</el-descriptions-item>
          <el-descriptions-item label="模板名称">{{ currentTemplate.name }}</el-descriptions-item>
          <el-descriptions-item label="通知类型">
            <el-tag :type="getTypeTagType(currentTemplate.type)">
              {{ getTypeName(currentTemplate.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="发送渠道">
            <el-tag :type="getChannelTagType(currentTemplate.channel)">
              {{ getChannelName(currentTemplate.channel) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="标题" v-if="currentTemplate.subject">{{ currentTemplate.subject }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentTemplate.status === 'active' ? 'success' : 'danger'">
              {{ currentTemplate.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ currentTemplate.createTime }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">{{ currentTemplate.description }}</el-descriptions-item>
        </el-descriptions>
        
        <div class="template-content">
          <h3>模板内容</h3>
          <div class="content-preview">
            {{ currentTemplate.content }}
          </div>
        </div>
      </div>
    </el-dialog>
    
    <!-- 测试模板对话框 -->
    <el-dialog v-model="showTestDialog" title="测试模板" width="600px">
      <el-form :model="testForm" :rules="testFormRules" ref="testFormRef" label-width="100px">
        <el-form-item label="接收地址" prop="recipient">
          <el-input
            v-model="testForm.recipient"
            :placeholder="getRecipientPlaceholder()"
          />
        </el-form-item>
        
        <el-form-item label="测试数据">
          <div class="test-data">
            <div v-for="(variable, index) in templateVariables" :key="index" class="variable-input">
              <label>{{ variable }}:</label>
              <el-input v-model="testForm.data[variable]" :placeholder="`请输入${variable}的值`" />
            </div>
          </div>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showTestDialog = false">取消</el-button>
          <el-button type="primary" @click="sendTestNotification">发送测试</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'

// 加载状态
const loading = ref(false)

// 筛选表单
const filterForm = reactive({
  type: '',
  channel: '',
  status: ''
})

// 分页配置
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 模板列表
const templatesList = ref([
  {
    id: 1,
    name: '费用提交通知',
    type: 'expenseSubmit',
    channel: 'email',
    subject: '费用提交成功通知',
    description: '用户提交费用后发送通知',
    content: '尊敬的{username}，您已成功提交{expenseType}费用，金额为{amount}元，请等待审核。',
    status: 'active',
    createTime: '2023-11-01 10:00:00'
  },
  {
    id: 2,
    name: '费用审核通过',
    type: 'expenseApproved',
    channel: 'email',
    subject: '费用审核通过通知',
    description: '费用审核通过后发送通知',
    content: '尊敬的{username}，您提交的{expenseType}费用已审核通过，金额为{amount}元。',
    status: 'active',
    createTime: '2023-11-01 10:00:00'
  },
  {
    id: 3,
    name: '费用审核拒绝',
    type: 'expenseRejected',
    channel: 'email',
    subject: '费用审核拒绝通知',
    description: '费用审核拒绝后发送通知',
    content: '尊敬的{username}，您提交的{expenseType}费用已被拒绝，原因为：{reason}。',
    status: 'active',
    createTime: '2023-11-01 10:00:00'
  },
  {
    id: 4,
    name: '争议创建短信',
    type: 'disputeCreated',
    channel: 'sms',
    subject: '',
    description: '争议创建后发送短信通知',
    content: '您有新的争议需要处理，争议ID：{disputeId}，标题：{title}，请及时处理。',
    status: 'active',
    createTime: '2023-11-01 10:00:00'
  },
  {
    id: 5,
    name: '争议解决站内消息',
    type: 'disputeResolved',
    channel: 'internal',
    subject: '争议已解决',
    description: '争议解决后发送站内消息',
    content: '争议{disputeId}已解决，处理结果：{result}，感谢您的耐心等待。',
    status: 'active',
    createTime: '2023-11-01 10:00:00'
  }
])

// 对话框状态
const showTemplateDialog = ref(false)
const showTemplateDetailDialog = ref(false)
const showTestDialog = ref(false)
const isEdit = ref(false)
const currentTemplate = ref(null)
const templateFormRef = ref(null)
const testFormRef = ref(null)

// 模板表单
const templateForm = reactive({
  id: null,
  name: '',
  type: '',
  channel: '',
  subject: '',
  description: '',
  content: '',
  status: 'active'
})

// 测试表单
const testForm = reactive({
  templateId: null,
  recipient: '',
  data: {}
})

// 表单验证规则
const templateFormRules = {
  name: [
    { required: true, message: '请输入模板名称', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择通知类型', trigger: 'change' }
  ],
  channel: [
    { required: true, message: '请选择发送渠道', trigger: 'change' }
  ],
  subject: [
    { required: true, message: '请输入标题', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入模板描述', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入模板内容', trigger: 'blur' }
  ]
}

const testFormRules = {
  recipient: [
    { required: true, message: '请输入接收地址', trigger: 'blur' }
  ]
}

// 可用变量
const availableVariables = ref(['username', 'amount', 'expenseType', 'reason', 'disputeId', 'title', 'result'])

// 模板变量
const templateVariables = ref([])

// 获取通知类型名称
const getTypeName = (type) => {
  const typeMap = {
    userRegister: '用户注册',
    userLogin: '用户登录',
    expenseSubmit: '费用提交',
    expenseApproved: '费用审核通过',
    expenseRejected: '费用审核拒绝',
    disputeCreated: '争议创建',
    disputeResolved: '争议解决',
    systemError: '系统错误'
  }
  return typeMap[type] || '未知'
}

// 获取通知类型标签类型
const getTypeTagType = (type) => {
  const typeMap = {
    userRegister: 'success',
    userLogin: 'info',
    expenseSubmit: 'primary',
    expenseApproved: 'success',
    expenseRejected: 'danger',
    disputeCreated: 'warning',
    disputeResolved: 'success',
    systemError: 'danger'
  }
  return typeMap[type] || 'info'
}

// 获取发送渠道名称
const getChannelName = (channel) => {
  const channelMap = {
    email: '邮件',
    sms: '短信',
    internal: '站内消息'
  }
  return channelMap[channel] || '未知'
}

// 获取发送渠道标签类型
const getChannelTagType = (channel) => {
  const channelMap = {
    email: 'primary',
    sms: 'success',
    internal: 'info'
  }
  return channelMap[channel] || 'info'
}

// 获取接收地址占位符
const getRecipientPlaceholder = () => {
  if (!currentTemplate.value) return '请输入接收地址'
  
  switch (currentTemplate.value.channel) {
    case 'email':
      return '请输入邮箱地址'
    case 'sms':
      return '请输入手机号码'
    case 'internal':
      return '请输入用户ID'
    default:
      return '请输入接收地址'
  }
}

// 筛选模板
const filterTemplates = () => {
  loading.value = true
  // 模拟API调用
  setTimeout(() => {
    loading.value = false
    ElMessage.success('筛选完成')
  }, 500)
}

// 重置筛选
const resetFilter = () => {
  filterForm.type = ''
  filterForm.channel = ''
  filterForm.status = ''
  filterTemplates()
}

// 刷新模板
const refreshTemplates = () => {
  loading.value = true
  // 模拟API调用
  setTimeout(() => {
    loading.value = false
    ElMessage.success('刷新成功')
  }, 500)
}

// 分页大小改变
const handleSizeChange = (size) => {
  pagination.pageSize = size
  filterTemplates()
}

// 当前页改变
const handleCurrentChange = (page) => {
  pagination.currentPage = page
  filterTemplates()
}

// 添加模板
const addTemplate = () => {
  isEdit.value = false
  resetTemplateForm()
  showTemplateDialog.value = true
}

// 查看模板
const viewTemplate = (template) => {
  currentTemplate.value = { ...template }
  showTemplateDetailDialog.value = true
}

// 编辑模板
const editTemplate = (template) => {
  isEdit.value = true
  Object.assign(templateForm, template)
  showTemplateDialog.value = true
}

// 删除模板
const deleteTemplate = (template) => {
  ElMessageBox.confirm(`确定要删除模板"${template.name}"吗？`, '确认删除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // 模拟API调用
    const index = templatesList.value.findIndex(t => t.id === template.id)
    if (index !== -1) {
      templatesList.value.splice(index, 1)
      ElMessage.success('删除成功')
    }
  }).catch(() => {
    // 用户取消操作
  })
}

// 改变模板状态
const changeTemplateStatus = (template) => {
  // 模拟API调用
  setTimeout(() => {
    ElMessage.success(`模板已${template.status === 'active' ? '启用' : '禁用'}`)
  }, 500)
}

// 测试模板
const testTemplate = (template) => {
  currentTemplate.value = { ...template }
  testForm.templateId = template.id
  testForm.recipient = ''
  
  // 根据模板类型设置变量
  updateTemplateVariables(template.type)
  
  // 初始化测试数据
  testForm.data = {}
  templateVariables.value.forEach(variable => {
    testForm.data[variable] = ''
  })
  
  showTestDialog.value = true
}

// 更新模板变量
const updateTemplateVariables = (type) => {
  const variablesMap = {
    userRegister: ['username'],
    userLogin: ['username', 'loginTime', 'loginIp'],
    expenseSubmit: ['username', 'expenseType', 'amount'],
    expenseApproved: ['username', 'expenseType', 'amount'],
    expenseRejected: ['username', 'expenseType', 'amount', 'reason'],
    disputeCreated: ['disputeId', 'title', 'creator'],
    disputeResolved: ['disputeId', 'title', 'result'],
    systemError: ['errorType', 'errorMessage', 'errorTime']
  }
  
  templateVariables.value = variablesMap[type] || []
}

// 通知类型改变
const handleTypeChange = (type) => {
  updateTemplateVariables(type)
}

// 发送渠道改变
const handleChannelChange = (channel) => {
  if (channel === 'sms') {
    templateForm.subject = ''
  }
}

// 插入变量
const insertVariable = (variable) => {
  templateForm.content += `{${variable}}`
}

// 发送测试通知
const sendTestNotification = () => {
  testFormRef.value.validate((valid) => {
    if (valid) {
      // 模拟API调用
      ElMessage.loading('正在发送测试通知...')
      
      setTimeout(() => {
        ElMessage.success('测试通知发送成功')
        showTestDialog.value = false
      }, 2000)
    }
  })
}

// 提交模板
const submitTemplate = () => {
  templateFormRef.value.validate((valid) => {
    if (valid) {
      if (isEdit.value) {
        // 更新模板
        const index = templatesList.value.findIndex(t => t.id === templateForm.id)
        if (index !== -1) {
          templatesList.value[index] = { ...templateForm }
        }
        ElMessage.success('模板更新成功')
      } else {
        // 添加模板
        const newTemplate = {
          ...templateForm,
          id: templatesList.value.length + 1,
          createTime: new Date().toLocaleString()
        }
        templatesList.value.push(newTemplate)
        ElMessage.success('模板添加成功')
      }
      
      showTemplateDialog.value = false
    }
  })
}

// 重置模板表单
const resetTemplateForm = () => {
  templateForm.id = null
  templateForm.name = ''
  templateForm.type = ''
  templateForm.channel = ''
  templateForm.subject = ''
  templateForm.description = ''
  templateForm.content = ''
  templateForm.status = 'active'
}

// 组件挂载时加载数据
onMounted(() => {
  pagination.total = templatesList.value.length
})
</script>

<style scoped>
.notification-templates {
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

.templates-content {
  padding: 20px;
  overflow-y: auto;
}

.filter-card {
  margin-bottom: 20px;
}

.templates-card {
  margin-bottom: 20px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.variables-hint {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.variable-tag {
  cursor: pointer;
  transition: all 0.2s;
}

.variable-tag:hover {
  transform: scale(1.05);
}

.template-detail {
  padding: 10px 0;
}

.template-content {
  margin-top: 20px;
}

.template-content h3 {
  margin-bottom: 15px;
  color: #303133;
}

.content-preview {
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  white-space: pre-wrap;
  word-break: break-word;
}

.test-data {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.variable-input {
  display: flex;
  align-items: center;
  gap: 10px;
}

.variable-input label {
  width: 100px;
  text-align: right;
  color: #606266;
}
</style>