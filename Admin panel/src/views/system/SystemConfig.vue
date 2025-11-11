<template>
  <div class="system-config">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1>系统配置管理</h1>
          <p>管理系统参数、功能开关、维护窗口和公告</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="saveAllConfigs">
            <el-icon><Check /></el-icon>
            保存所有配置
          </el-button>
        </div>
      </el-header>
      
      <el-main class="config-content">
        <el-tabs v-model="activeTab" @tab-click="handleTabClick">
          <!-- 系统配置 -->
          <el-tab-pane label="系统配置" name="system">
            <el-card class="config-card">
              <template #header>
                <div class="card-header">
                  <h3>基础系统配置</h3>
                  <div class="card-actions">
                    <el-button size="small" @click="saveSystemConfig" :loading="formLoading">
                      <el-icon><Check /></el-icon>
                      保存
                    </el-button>
                  </div>
                </div>
              </template>
              
              <el-form :model="systemConfigForm" label-width="150px">
                <el-form-item label="系统名称">
                  <el-input v-model="systemConfigForm.system_name" placeholder="请输入系统名称" />
                </el-form-item>
                
                <el-form-item label="维护模式">
                  <el-switch
                    v-model="systemConfigForm.maintenance_mode"
                    active-text="开启"
                    inactive-text="关闭"
                  />
                </el-form-item>
                
                <el-form-item label="每间寝室最大用户数">
                  <el-input-number v-model="systemConfigForm.max_users_per_room" :min="1" :max="20" />
                </el-form-item>
                
                <el-form-item label="费用分类">
                  <el-select
                    v-model="systemConfigForm.expense_categories"
                    multiple
                    filterable
                    allow-create
                    default-first-option
                    placeholder="请选择或输入费用分类"
                  >
                    <el-option
                      v-for="item in defaultExpenseCategories"
                      :key="item"
                      :label="item"
                      :value="item"
                    />
                  </el-select>
                </el-form-item>
                
                <el-form-item label="支付方式">
                  <el-select
                    v-model="systemConfigForm.payment_methods"
                    multiple
                    filterable
                    allow-create
                    default-first-option
                    placeholder="请选择或输入支付方式"
                  >
                    <el-option
                      v-for="item in defaultPaymentMethods"
                      :key="item"
                      :label="item"
                      :value="item"
                    />
                  </el-select>
                </el-form-item>
                
                <el-form-item label="通知设置">
                  <div class="notification-settings">
                    <el-checkbox v-model="systemConfigForm.notification_settings.email_enabled">
                      邮件通知
                    </el-checkbox>
                    <el-checkbox v-model="systemConfigForm.notification_settings.sms_enabled">
                      短信通知
                    </el-checkbox>
                    <el-checkbox v-model="systemConfigForm.notification_settings.push_enabled">
                      推送通知
                    </el-checkbox>
                  </div>
                </el-form-item>
              </el-form>
            </el-card>
          </el-tab-pane>
          
          <!-- 功能开关 -->
          <el-tab-pane label="功能开关" name="featureFlags">
            <el-card class="config-card">
              <template #header>
                <div class="card-header">
                  <h3>功能开关管理</h3>
                  <div class="card-actions">
                    <el-button size="small" @click="refreshFeatureFlags" :loading="tableLoading">
                      <el-icon><Refresh /></el-icon>
                      刷新
                    </el-button>
                  </div>
                </div>
              </template>
              
              <el-table
                v-loading="tableLoading"
                :data="featureFlags"
                style="width: 100%"
              >
                <el-table-column prop="name" label="功能名称" width="200" />
                <el-table-column prop="description" label="描述" />
                <el-table-column prop="enabled" label="状态" width="100">
                  <template #default="scope">
                    <el-switch
                      v-model="scope.row.enabled"
                      @change="updateFeatureFlagStatus(scope.row)"
                    />
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="150">
                  <template #default="scope">
                    <el-button
                      size="small"
                      @click="editFeatureFlag(scope.row)"
                    >
                      编辑
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </el-card>
          </el-tab-pane>
          
          <!-- 维护窗口 -->
          <el-tab-pane label="维护窗口" name="maintenanceWindows">
            <el-card class="config-card">
              <template #header>
                <div class="card-header">
                  <h3>系统维护窗口</h3>
                  <div class="card-actions">
                    <el-button type="primary" @click="showCreateMaintenanceWindowDialog">
                      <el-icon><Plus /></el-icon>
                      创建维护窗口
                    </el-button>
                    <el-button size="small" @click="refreshMaintenanceWindows" :loading="tableLoading">
                      <el-icon><Refresh /></el-icon>
                      刷新
                    </el-button>
                  </div>
                </div>
              </template>
              
              <el-table
                v-loading="tableLoading"
                :data="maintenanceWindows"
                style="width: 100%"
              >
                <el-table-column prop="title" label="标题" width="200" />
                <el-table-column prop="description" label="描述" />
                <el-table-column prop="start_time" label="开始时间" width="180">
                  <template #default="scope">
                    {{ formatDateTime(scope.row.start_time) }}
                  </template>
                </el-table-column>
                <el-table-column prop="end_time" label="结束时间" width="180">
                  <template #default="scope">
                    {{ formatDateTime(scope.row.end_time) }}
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="状态" width="100">
                  <template #default="scope">
                    <el-tag :type="getMaintenanceWindowStatusType(scope.row.status)">
                      {{ getMaintenanceWindowStatusText(scope.row.status) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="200">
                  <template #default="scope">
                    <el-button
                      size="small"
                      @click="editMaintenanceWindow(scope.row)"
                    >
                      编辑
                    </el-button>
                    <el-button
                      size="small"
                      type="danger"
                      @click="deleteMaintenanceWindow(scope.row)"
                    >
                      删除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
              
              <div class="pagination-container">
                <el-pagination
                  v-model:current-page="maintenanceWindowPagination.page"
                  v-model:page-size="maintenanceWindowPagination.limit"
                  :page-sizes="[10, 20, 50, 100]"
                  layout="total, sizes, prev, pager, next, jumper"
                  :total="maintenanceWindowPagination.total"
                  @size-change="handleMaintenanceWindowSizeChange"
                  @current-change="handleMaintenanceWindowCurrentChange"
                />
              </div>
            </el-card>
          </el-tab-pane>
          
          <!-- 公告管理 -->
          <el-tab-pane label="公告管理" name="announcements">
            <el-card class="config-card">
              <template #header>
                <div class="card-header">
                  <h3>系统公告管理</h3>
                  <div class="card-actions">
                    <el-button type="primary" @click="showCreateAnnouncementDialog">
                      <el-icon><Plus /></el-icon>
                      创建公告
                    </el-button>
                    <el-button size="small" @click="refreshAnnouncements" :loading="tableLoading">
                      <el-icon><Refresh /></el-icon>
                      刷新
                    </el-button>
                  </div>
                </div>
              </template>
              
              <el-table
                v-loading="tableLoading"
                :data="announcements"
                style="width: 100%"
              >
                <el-table-column prop="title" label="标题" width="200" />
                <el-table-column prop="content" label="内容" />
                <el-table-column prop="status" label="状态" width="100">
                  <template #default="scope">
                    <el-tag :type="getAnnouncementStatusType(scope.row.status)">
                      {{ getAnnouncementStatusText(scope.row.status) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="priority" label="优先级" width="100">
                  <template #default="scope">
                    <el-tag :type="getAnnouncementPriorityType(scope.row.priority)">
                      {{ getAnnouncementPriorityText(scope.row.priority) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="publish_at" label="发布时间" width="180">
                  <template #default="scope">
                    {{ formatDateTime(scope.row.publish_at) }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="200">
                  <template #default="scope">
                    <el-button
                      size="small"
                      @click="editAnnouncement(scope.row)"
                    >
                      编辑
                    </el-button>
                    <el-button
                      size="small"
                      type="danger"
                      @click="deleteAnnouncement(scope.row)"
                    >
                      删除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
              
              <div class="pagination-container">
                <el-pagination
                  v-model:current-page="announcementPagination.page"
                  v-model:page-size="announcementPagination.limit"
                  :page-sizes="[10, 20, 50, 100]"
                  layout="total, sizes, prev, pager, next, jumper"
                  :total="announcementPagination.total"
                  @size-change="handleAnnouncementSizeChange"
                  @current-change="handleAnnouncementCurrentChange"
                />
              </div>
            </el-card>
          </el-tab-pane>
        </el-tabs>
      </el-main>
    </el-container>
    
    <!-- 创建/编辑维护窗口对话框 -->
    <el-dialog
      v-model="maintenanceWindowDialog.visible"
      :title="maintenanceWindowDialog.isEdit ? '编辑维护窗口' : '创建维护窗口'"
      width="600px"
    >
      <el-form
        ref="maintenanceWindowFormRef"
        :model="maintenanceWindowDialog.form"
        :rules="maintenanceWindowFormRules"
        label-width="100px"
      >
        <el-form-item label="标题" prop="title">
          <el-input v-model="maintenanceWindowDialog.form.title" placeholder="请输入维护窗口标题" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="maintenanceWindowDialog.form.description"
            type="textarea"
            rows="3"
            placeholder="请输入维护窗口描述"
          />
        </el-form-item>
        <el-form-item label="开始时间" prop="start_time">
          <el-date-picker
            v-model="maintenanceWindowDialog.form.start_time"
            type="datetime"
            placeholder="选择开始时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="结束时间" prop="end_time">
          <el-date-picker
            v-model="maintenanceWindowDialog.form.end_time"
            type="datetime"
            placeholder="选择结束时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="maintenanceWindowDialog.form.status" placeholder="请选择状态">
            <el-option label="计划中" value="scheduled" />
            <el-option label="进行中" value="active" />
            <el-option label="已完成" value="completed" />
          </el-select>
        </el-form-item>
        <el-form-item label="受影响服务" prop="affected_services">
          <el-select
            v-model="maintenanceWindowDialog.form.affected_services"
            multiple
            placeholder="请选择受影响的服务"
          >
            <el-option label="用户服务" value="user-service" />
            <el-option label="账单服务" value="bill-service" />
            <el-option label="支付服务" value="payment-service" />
            <el-option label="通知服务" value="notification-service" />
            <el-option label="数据统计服务" value="analytics-service" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="maintenanceWindowDialog.visible = false">取消</el-button>
        <el-button
          type="primary"
          @click="saveMaintenanceWindow"
          :loading="maintenanceWindowDialog.loading"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
    
    <!-- 创建/编辑公告对话框 -->
    <el-dialog
      v-model="announcementDialog.visible"
      :title="announcementDialog.isEdit ? '编辑公告' : '创建公告'"
      width="600px"
    >
      <el-form
        ref="announcementFormRef"
        :model="announcementDialog.form"
        :rules="announcementFormRules"
        label-width="100px"
      >
        <el-form-item label="标题" prop="title">
          <el-input v-model="announcementDialog.form.title" placeholder="请输入公告标题" />
        </el-form-item>
        <el-form-item label="内容" prop="content">
          <el-input
            v-model="announcementDialog.form.content"
            type="textarea"
            rows="5"
            placeholder="请输入公告内容"
          />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-select v-model="announcementDialog.form.status" placeholder="请选择状态">
            <el-option label="草稿" value="draft" />
            <el-option label="已发布" value="published" />
            <el-option label="已归档" value="archived" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-select v-model="announcementDialog.form.priority" placeholder="请选择优先级">
            <el-option label="低" value="low" />
            <el-option label="普通" value="normal" />
            <el-option label="高" value="high" />
            <el-option label="紧急" value="urgent" />
          </el-select>
        </el-form-item>
        <el-form-item label="发布时间" prop="publish_at">
          <el-date-picker
            v-model="announcementDialog.form.publish_at"
            type="datetime"
            placeholder="选择发布时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="过期时间" prop="expire_at">
          <el-date-picker
            v-model="announcementDialog.form.expire_at"
            type="datetime"
            placeholder="选择过期时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="announcementDialog.visible = false">取消</el-button>
        <el-button
          type="primary"
          @click="saveAnnouncement"
          :loading="announcementDialog.loading"
        >
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Refresh, Plus } from '@element-plus/icons-vue'
import {
  getSystemConfig,
  updateSystemConfig,
  getFeatureFlags,
  updateFeatureFlag,
  getMaintenanceWindows,
  createMaintenanceWindow,
  updateMaintenanceWindow,
  deleteMaintenanceWindow,
  getAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement
} from '@/api/systemConfig'

// 当前选中的标签页
const activeTab = ref('system')

// 表单加载状态
const formLoading = ref(false)

// 表格加载状态
const tableLoading = ref(false)

// 系统配置表单
const systemConfigForm = reactive({
  system_name: '寝室记账系统',
  maintenance_mode: false,
  max_users_per_room: 8,
  expense_categories: ['餐饮', '日用品', '娱乐', '其他'],
  payment_methods: ['现金', '转账', '支付宝', '微信'],
  notification_settings: {
    email_enabled: true,
    sms_enabled: false,
    push_enabled: true
  }
})

// 默认费用分类
const defaultExpenseCategories = ['餐饮', '日用品', '娱乐', '其他', '交通', '医疗', '学习', '服装']

// 默认支付方式
const defaultPaymentMethods = ['现金', '转账', '支付宝', '微信', '银行卡']

// 功能开关列表
const featureFlags = ref([])

// 维护窗口列表
const maintenanceWindows = ref([])

// 维护窗口分页
const maintenanceWindowPagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 公告列表
const announcements = ref([])

// 公告分页
const announcementPagination = reactive({
  page: 1,
  limit: 10,
  total: 0
})

// 维护窗口对话框
const maintenanceWindowDialog = reactive({
  visible: false,
  loading: false,
  isEdit: false,
  form: {
    id: null,
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    status: 'scheduled',
    affected_services: []
  }
})

// 公告对话框
const announcementDialog = reactive({
  visible: false,
  loading: false,
  isEdit: false,
  form: {
    id: null,
    title: '',
    content: '',
    status: 'draft',
    priority: 'normal',
    publish_at: '',
    expire_at: ''
  }
})

// 维护窗口表单验证规则
const maintenanceWindowFormRules = {
  title: [
    { required: true, message: '请输入维护窗口标题', trigger: 'blur' }
  ],
  start_time: [
    { required: true, message: '请选择开始时间', trigger: 'change' }
  ],
  end_time: [
    { required: true, message: '请选择结束时间', trigger: 'change' }
  ]
}

// 公告表单验证规则
const announcementFormRules = {
  title: [
    { required: true, message: '请输入公告标题', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入公告内容', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
}

// 获取系统配置
const fetchSystemConfig = async () => {
  try {
    formLoading.value = true
    const response = await getSystemConfig()
    if (response.success) {
      Object.assign(systemConfigForm, response.data.system_config)
    } else {
      ElMessage.error(response.message || '获取系统配置失败')
    }
  } catch (error) {
    console.error('获取系统配置失败:', error)
    ElMessage.error('获取系统配置失败')
  } finally {
    formLoading.value = false
  }
}

// 保存系统配置
const saveSystemConfig = async () => {
  try {
    formLoading.value = true
    const response = await updateSystemConfig(systemConfigForm)
    if (response.success) {
      ElMessage.success('系统配置保存成功')
    } else {
      ElMessage.error(response.message || '保存系统配置失败')
    }
  } catch (error) {
    console.error('保存系统配置失败:', error)
    ElMessage.error('保存系统配置失败')
  } finally {
    formLoading.value = false
  }
}

// 获取功能开关列表
const fetchFeatureFlags = async () => {
  try {
    tableLoading.value = true
    const response = await getFeatureFlags()
    if (response.success) {
      featureFlags.value = response.data.feature_flags || []
    } else {
      ElMessage.error(response.message || '获取功能开关列表失败')
    }
  } catch (error) {
    console.error('获取功能开关列表失败:', error)
    ElMessage.error('获取功能开关列表失败')
  } finally {
    tableLoading.value = false
  }
}

// 更新功能开关状态
const updateFeatureFlagStatus = async (featureFlag) => {
  try {
    const response = await updateFeatureFlag(featureFlag.id, {
      enabled: featureFlag.enabled,
      description: featureFlag.description
    })
    if (response.success) {
      ElMessage.success('功能开关更新成功')
    } else {
      ElMessage.error(response.message || '更新功能开关失败')
      // 恢复原来的状态
      featureFlag.enabled = !featureFlag.enabled
    }
  } catch (error) {
    console.error('更新功能开关失败:', error)
    ElMessage.error('更新功能开关失败')
    // 恢复原来的状态
    featureFlag.enabled = !featureFlag.enabled
  }
}

// 编辑功能开关
const editFeatureFlag = (featureFlag) => {
  ElMessageBox.prompt('请输入功能开关描述', '编辑功能开关', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputValue: featureFlag.description || '',
    inputPattern: /^.{1,100}$/,
    inputErrorMessage: '描述长度应在1-100个字符之间'
  }).then(({ value }) => {
    featureFlag.description = value
    updateFeatureFlagStatus(featureFlag)
  }).catch(() => {
    // 用户取消操作，恢复原来的状态
    featureFlag.enabled = !featureFlag.enabled
  })
}

// 获取维护窗口列表
const fetchMaintenanceWindows = async () => {
  try {
    tableLoading.value = true
    const params = {
      page: maintenanceWindowPagination.page,
      limit: maintenanceWindowPagination.limit
    }
    const response = await getMaintenanceWindows(params)
    if (response.success) {
      maintenanceWindows.value = response.data.maintenance_windows || []
      maintenanceWindowPagination.total = response.data.pagination?.total || 0
    } else {
      ElMessage.error(response.message || '获取维护窗口列表失败')
    }
  } catch (error) {
    console.error('获取维护窗口列表失败:', error)
    ElMessage.error('获取维护窗口列表失败')
  } finally {
    tableLoading.value = false
  }
}

// 刷新维护窗口列表
const refreshMaintenanceWindows = () => {
  maintenanceWindowPagination.page = 1
  fetchMaintenanceWindows()
}

// 显示创建维护窗口对话框
const showCreateMaintenanceWindowDialog = () => {
  maintenanceWindowDialog.isEdit = false
  maintenanceWindowDialog.form = {
    id: null,
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    status: 'scheduled',
    affected_services: []
  }
  maintenanceWindowDialog.visible = true
}

// 编辑维护窗口
const editMaintenanceWindow = (window) => {
  maintenanceWindowDialog.isEdit = true
  maintenanceWindowDialog.form = {
    id: window.id,
    title: window.title,
    description: window.description,
    start_time: window.start_time,
    end_time: window.end_time,
    status: window.status,
    affected_services: window.affected_services || []
  }
  maintenanceWindowDialog.visible = true
}

// 保存维护窗口
const saveMaintenanceWindow = async () => {
  try {
    maintenanceWindowDialog.loading = true
    let response
    if (maintenanceWindowDialog.isEdit) {
      response = await updateMaintenanceWindow(maintenanceWindowDialog.form.id, maintenanceWindowDialog.form)
    } else {
      response = await createMaintenanceWindow(maintenanceWindowDialog.form)
    }
    
    if (response.success) {
      ElMessage.success(maintenanceWindowDialog.isEdit ? '维护窗口更新成功' : '维护窗口创建成功')
      maintenanceWindowDialog.visible = false
      fetchMaintenanceWindows()
    } else {
      ElMessage.error(response.message || (maintenanceWindowDialog.isEdit ? '更新维护窗口失败' : '创建维护窗口失败'))
    }
  } catch (error) {
    console.error(maintenanceWindowDialog.isEdit ? '更新维护窗口失败:' : '创建维护窗口失败:', error)
    ElMessage.error(maintenanceWindowDialog.isEdit ? '更新维护窗口失败' : '创建维护窗口失败')
  } finally {
    maintenanceWindowDialog.loading = false
  }
}

// 删除维护窗口
const deleteMaintenanceWindow = async (window) => {
  try {
    await ElMessageBox.confirm(`确定要删除维护窗口 "${window.title}" 吗？`, '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const response = await deleteMaintenanceWindow(window.id)
    if (response.success) {
      ElMessage.success('维护窗口删除成功')
      fetchMaintenanceWindows()
    } else {
      ElMessage.error(response.message || '删除维护窗口失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除维护窗口失败:', error)
      ElMessage.error('删除维护窗口失败')
    }
  }
}

// 维护窗口分页大小变化
const handleMaintenanceWindowSizeChange = (size) => {
  maintenanceWindowPagination.limit = size
  maintenanceWindowPagination.page = 1
  fetchMaintenanceWindows()
}

// 维护窗口当前页变化
const handleMaintenanceWindowCurrentChange = (page) => {
  maintenanceWindowPagination.page = page
  fetchMaintenanceWindows()
}

// 获取公告列表
const fetchAnnouncements = async () => {
  try {
    tableLoading.value = true
    const params = {
      page: announcementPagination.page,
      limit: announcementPagination.limit
    }
    const response = await getAnnouncements(params)
    if (response.success) {
      announcements.value = response.data.announcements || []
      announcementPagination.total = response.data.pagination?.total || 0
    } else {
      ElMessage.error(response.message || '获取公告列表失败')
    }
  } catch (error) {
    console.error('获取公告列表失败:', error)
    ElMessage.error('获取公告列表失败')
  } finally {
    tableLoading.value = false
  }
}

// 刷新公告列表
const refreshAnnouncements = () => {
  announcementPagination.page = 1
  fetchAnnouncements()
}

// 显示创建公告对话框
const showCreateAnnouncementDialog = () => {
  announcementDialog.isEdit = false
  announcementDialog.form = {
    id: null,
    title: '',
    content: '',
    status: 'draft',
    priority: 'normal',
    publish_at: '',
    expire_at: ''
  }
  announcementDialog.visible = true
}

// 编辑公告
const editAnnouncement = (announcement) => {
  announcementDialog.isEdit = true
  announcementDialog.form = {
    id: announcement.id,
    title: announcement.title,
    content: announcement.content,
    status: announcement.status,
    priority: announcement.priority,
    publish_at: announcement.publish_at,
    expire_at: announcement.expire_at
  }
  announcementDialog.visible = true
}

// 保存公告
const saveAnnouncement = async () => {
  try {
    announcementDialog.loading = true
    let response
    if (announcementDialog.isEdit) {
      response = await updateAnnouncement(announcementDialog.form.id, announcementDialog.form)
    } else {
      response = await createAnnouncement(announcementDialog.form)
    }
    
    if (response.success) {
      ElMessage.success(announcementDialog.isEdit ? '公告更新成功' : '公告创建成功')
      announcementDialog.visible = false
      fetchAnnouncements()
    } else {
      ElMessage.error(response.message || (announcementDialog.isEdit ? '更新公告失败' : '创建公告失败'))
    }
  } catch (error) {
    console.error(announcementDialog.isEdit ? '更新公告失败:' : '创建公告失败:', error)
    ElMessage.error(announcementDialog.isEdit ? '更新公告失败' : '创建公告失败')
  } finally {
    announcementDialog.loading = false
  }
}

// 删除公告
const deleteAnnouncement = async (announcement) => {
  try {
    await ElMessageBox.confirm(`确定要删除公告 "${announcement.title}" 吗？`, '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const response = await deleteAnnouncement(announcement.id)
    if (response.success) {
      ElMessage.success('公告删除成功')
      fetchAnnouncements()
    } else {
      ElMessage.error(response.message || '删除公告失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除公告失败:', error)
      ElMessage.error('删除公告失败')
    }
  }
}

// 公告分页大小变化
const handleAnnouncementSizeChange = (size) => {
  announcementPagination.limit = size
  announcementPagination.page = 1
  fetchAnnouncements()
}

// 公告当前页变化
const handleAnnouncementCurrentChange = (page) => {
  announcementPagination.page = page
  fetchAnnouncements()
}

// 保存所有配置
const saveAllConfigs = async () => {
  try {
    formLoading.value = true
    const response = await updateSystemConfig(systemConfigForm)
    if (response.success) {
      ElMessage.success('所有配置保存成功')
    } else {
      ElMessage.error(response.message || '保存配置失败')
    }
  } catch (error) {
    console.error('保存配置失败:', error)
    ElMessage.error('保存配置失败')
  } finally {
    formLoading.value = false
  }
}

// 刷新功能开关列表
const refreshFeatureFlags = () => {
  fetchFeatureFlags()
}

// 标签页点击事件
const handleTabClick = (tab) => {
  switch (tab.props.name) {
    case 'system':
      fetchSystemConfig()
      break
    case 'featureFlags':
      fetchFeatureFlags()
      break
    case 'maintenanceWindows':
      refreshMaintenanceWindows()
      break
    case 'announcements':
      refreshAnnouncements()
      break
  }
}

// 获取维护窗口状态类型
const getMaintenanceWindowStatusType = (status) => {
  const types = {
    scheduled: 'info',
    active: 'warning',
    completed: 'success'
  }
  return types[status] || 'info'
}

// 获取维护窗口状态文本
const getMaintenanceWindowStatusText = (status) => {
  const texts = {
    scheduled: '计划中',
    active: '进行中',
    completed: '已完成'
  }
  return texts[status] || status
}

// 获取公告状态类型
const getAnnouncementStatusType = (status) => {
  const types = {
    draft: 'info',
    published: 'success',
    archived: 'warning'
  }
  return types[status] || 'info'
}

// 获取公告状态文本
const getAnnouncementStatusText = (status) => {
  const texts = {
    draft: '草稿',
    published: '已发布',
    archived: '已归档'
  }
  return texts[status] || status
}

// 获取公告优先级类型
const getAnnouncementPriorityType = (priority) => {
  const types = {
    low: 'info',
    normal: '',
    high: 'warning',
    urgent: 'danger'
  }
  return types[priority] || 'info'
}

// 获取公告优先级文本
const getAnnouncementPriorityText = (priority) => {
  const texts = {
    low: '低',
    normal: '普通',
    high: '高',
    urgent: '紧急'
  }
  return texts[priority] || priority
}

// 格式化日期时间
const formatDateTime = (dateTime) => {
  if (!dateTime) return ''
  return new Date(dateTime).toLocaleString()
}

// 组件挂载时加载数据
onMounted(() => {
  fetchSystemConfig()
})
</script>

<style scoped>
.system-config {
  height: 100%;
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

.config-content {
  padding: 20px;
  overflow-y: auto;
}

.config-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  color: #303133;
}

.notification-settings {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
</style>