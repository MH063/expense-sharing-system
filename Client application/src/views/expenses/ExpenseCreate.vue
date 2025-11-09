<template>
  <div class="expense-create">
    <div class="create-header">
      <el-button @click="goBack" class="back-button">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <h1>创建费用记录</h1>
      <div class="auto-save-status" v-if="lastSaveTime">
        <el-icon><Clock /></el-icon>
        {{ formatLastSaveTime() }}
      </div>
    </div>

    <div class="create-content">
      <el-card shadow="hover" class="form-card">
        <el-form
          ref="expenseFormRef"
          :model="expenseForm"
          :rules="expenseRules"
          label-width="100px"
          label-position="right"
        >
          <el-form-item label="费用名称" prop="title">
            <el-input
              v-model="expenseForm.title"
              placeholder="请输入费用名称"
              clearable
            />
          </el-form-item>

          <el-form-item label="费用金额" prop="amount">
            <el-input-number
              v-model="expenseForm.amount"
              :precision="2"
              :step="0.01"
              :min="0"
              placeholder="请输入费用金额"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item label="费用类型" prop="category">
            <el-select
              v-model="expenseForm.category"
              placeholder="请选择费用类型"
              style="width: 100%"
            >
              <el-option
                v-for="item in expenseCategories"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="支付方式" prop="paymentMethod">
            <el-select
              v-model="expenseForm.paymentMethod"
              placeholder="请选择支付方式"
              style="width: 100%"
            >
              <el-option
                v-for="item in paymentMethods"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="支付日期" prop="paymentDate">
            <el-date-picker
              v-model="expenseForm.paymentDate"
              type="date"
              placeholder="请选择支付日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item label="分摊设置" prop="splitType">
            <SplitSelector
            ref="splitSelectorRef"
            :total-amount="expenseForm.amount"
            :members="roomMembers"
            @change="handleSplitChange"
            @validate="handleSplitValidate"
            @confirm="handleSplitConfirm"
          />
          </el-form-item>

          <el-form-item label="费用描述" prop="description">
            <el-input
              v-model="expenseForm.description"
              type="textarea"
              :rows="3"
              placeholder="请输入费用描述（可选）"
            />
          </el-form-item>

          <el-form-item label="费用凭证" prop="receipt">
            <el-upload
              ref="uploadRef"
              :action="uploadUrl"
              :headers="uploadHeaders"
              :on-success="handleUploadSuccess"
              :on-error="handleUploadError"
              :before-upload="beforeUpload"
              :file-list="fileList"
              list-type="picture-card"
              :limit="5"
            >
              <el-icon><Plus /></el-icon>
            </el-upload>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="submitExpense" :loading="submitting">
              创建费用记录
            </el-button>
            <el-button @click="resetForm">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Plus, Clock } from '@element-plus/icons-vue'
import { debounce } from 'lodash-es'
import { expenseApi } from '@/api/expenses'
import { roomsApi } from '@/api/rooms'
import { useUserStore } from '@/stores/user'
import SplitSelector from '@/components/SplitSelector.vue'

// 注册组件
defineOptions({
  name: 'ExpenseCreate'
})

// 路由
const route = useRoute()
const router = useRouter()

// 状态
const userStore = useUserStore()
const expenseFormRef = ref(null)
const uploadRef = ref(null)
const submitting = ref(false)
const roomId = ref(route.query.roomId || '')
const roomMembers = ref([])
const fileList = ref([])
const autoSaveTimer = ref(null)
const lastSaveTime = ref(null)
const formHasChanges = ref(false)
const splitData = ref([])
const splitValid = ref(false)

// 表单数据
const expenseForm = reactive({
  title: '',
  amount: 0,
  category: '',
  paymentMethod: '',
  paymentDate: new Date().toISOString().split('T')[0],
  splitType: 'equal',
  splitMembers: [],
  description: '',
  receipt: []
})

// 表单验证规则
const expenseRules = {
  title: [
    { required: true, message: '请输入费用名称', trigger: 'blur' },
    { min: 2, max: 50, message: '费用名称长度在 2 到 50 个字符', trigger: 'blur' },
    { pattern: /^[\u4e00-\u9fa5a-zA-Z0-9\s]+$/, message: '费用名称只能包含中文、英文、数字和空格', trigger: 'blur' }
  ],
  amount: [
    { required: true, message: '请输入费用金额', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '费用金额必须大于0', trigger: 'blur' },
    { type: 'number', max: 999999.99, message: '费用金额不能超过999999.99', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '请选择费用类型', trigger: 'change' }
  ],
  paymentMethod: [
    { required: true, message: '请选择支付方式', trigger: 'change' }
  ],
  paymentDate: [
    { required: true, message: '请选择支付日期', trigger: 'change' },
    { 
      validator: (rule, value, callback) => {
        const today = new Date()
        const selectedDate = new Date(value)
        const oneYearAgo = new Date()
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
        
        if (selectedDate > today) {
          callback(new Error('支付日期不能晚于今天'))
        } else if (selectedDate < oneYearAgo) {
          callback(new Error('支付日期不能早于一年前'))
        } else {
          callback()
        }
      }, 
      trigger: 'change' 
    }
  ]
}

// 计算属性
const selectedMembers = computed(() => {
  return roomMembers.value.filter(member => member.selected)
})

// 费用类型选项
const expenseCategories = [
  { value: 'food', label: '餐饮' },
  { value: 'transport', label: '交通' },
  { value: 'shopping', label: '购物' },
  { value: 'entertainment', label: '娱乐' },
  { value: 'accommodation', label: '住宿' },
  { value: 'medical', label: '医疗' },
  { value: 'education', label: '教育' },
  { value: 'utilities', label: '水电费' },
  { value: 'communication', label: '通讯费' },
  { value: 'other', label: '其他' }
]

// 支付方式选项
const paymentMethods = [
  { value: 'cash', label: '现金' },
  { value: 'alipay', label: '支付宝' },
  { value: 'wechat', label: '微信支付' },
  { value: 'bank_card', label: '银行卡' },
  { value: 'credit_card', label: '信用卡' },
  { value: 'other', label: '其他' }
]

// 上传相关
const uploadUrl = `${import.meta.env.VITE_API_BASE_URL}/api/upload`
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${userStore.token}`
}))

// 方法
/**
 * 返回上一页
 */
const goBack = () => {
  router.go(-1)
}

/**
 * 处理分摊设置变化
 */
const handleSplitChange = (data) => {
  expenseForm.splitType = data.splitType
  // 确保分摊成员数据格式正确
  expenseForm.splitMembers = data.splitData.map(member => ({
    userId: member.userId,
    userName: member.userName,
    amount: member.amount || 0,
    percentage: member.percentage || 0,
    selected: member.selected
  }))
  formHasChanges.value = true
  autoSave()
}

/**
 * 处理分摊设置验证
 */
const handleSplitValidate = (isValid) => {
  splitValid.value = isValid
}

/**
 * 处理分摊确认
 * @param {Object} splitData - 分摊数据
 */
const handleSplitConfirm = (splitData) => {
  console.log('分摊已确认:', splitData)
  // 可以在这里添加额外的确认逻辑，如显示成功消息
  ElMessage.success('分摊设置已确认')
}

/**
 * 加载房间成员
 */
const loadRoomMembers = async () => {
  if (!roomId.value) return
  
  try {
    const response = await roomsApi.getRoomMembers(roomId.value)
    if (response.success) {
      roomMembers.value = response.data.map(member => ({
        ...member,
        selected: false,
        customAmount: 0,
        percentage: 0
      }))
    }
  } catch (error) {
    console.error('加载房间成员失败:', error)
    ElMessage.error('加载房间成员失败')
  }
}

/**
 * 提交费用记录
 */
const submitExpense = async () => {
  try {
    // 验证表单
    const formValid = await expenseFormRef.value.validate()
    if (!formValid) {
      ElMessage.error('请检查表单填写是否正确')
      return
    }
    
    // 验证分摊设置
    if (!splitValid.value) {
      ElMessage.error('请检查分摊设置是否正确')
      return
    }
    
    // 验证是否有选中的分摊成员
    if (expenseForm.splitMembers.length === 0) {
      ElMessage.error('请至少选择一个分摊成员')
      return
    }
    
    submitting.value = true
    
    // 构建费用数据
    const expenseData = {
      ...expenseForm,
      roomId: roomId.value,
      splitMembers: expenseForm.splitMembers.map(member => ({
        memberId: member.userId, // 使用userId作为memberId
        memberName: member.userName,
        amount: member.amount || 0,
        percentage: member.percentage || 0
      }))
    }
    
    // 调用API创建费用记录
    const response = await expenseApi.createExpense(expenseData)
    
    if (response.success) {
      ElMessage.success('费用记录创建成功')
      formHasChanges.value = false
      // 跳转到费用详情页
      router.push(`/expenses/${response.data.id}`)
    } else {
      ElMessage.error(response.message || '创建费用记录失败')
    }
  } catch (error) {
    console.error('创建费用记录失败:', error)
    ElMessage.error('创建费用记录失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

/**
 * 重置表单
 */
const resetForm = () => {
  expenseFormRef.value?.resetFields()
  expenseForm.splitType = 'equal'
  expenseForm.splitMembers = []
  fileList.value = []
  splitData.value = []
  splitValid.value = false
  formHasChanges.value = false
  lastSaveTime.value = null
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
    autoSaveTimer.value = null
  }
  ElMessage.success('表单已重置')
}

/**
 * 自动保存
 */
const autoSave = debounce(() => {
  if (!formHasChanges.value) return
  
  // 这里可以调用API保存草稿
  // const draftData = { ...expenseForm, roomId: roomId.value }
  // expenseApi.saveExpenseDraft(draftData)
  
  lastSaveTime.value = new Date()
  console.log('自动保存草稿:', lastSaveTime.value)
}, 2000)

/**
 * 格式化最后保存时间
 */
const formatLastSaveTime = () => {
  if (!lastSaveTime.value) return ''
  
  const now = new Date()
  const diff = Math.floor((now - lastSaveTime.value) / 1000)
  
  if (diff < 60) return '刚刚保存'
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前保存`
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前保存`
  return `${Math.floor(diff / 86400)}天前保存`
}

/**
 * 上传前校验
 */
const beforeUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB!')
    return false
  }
  return true
}

/**
 * 上传成功回调
 */
const handleUploadSuccess = (response, file) => {
  if (response.success) {
    expenseForm.receipt.push(response.data.url)
    formHasChanges.value = true
    autoSave()
  } else {
    ElMessage.error('上传失败')
  }
}

/**
 * 上传失败回调
 */
const handleUploadError = () => {
  ElMessage.error('上传失败')
}

/**
 * 移除文件
 */
const handleRemoveFile = (file) => {
  const index = fileList.value.findIndex(item => item.uid === file.uid)
  if (index !== -1) {
    expenseForm.receipt.splice(index, 1)
    formHasChanges.value = true
    autoSave()
  }
}

// 生命周期钩子
onMounted(() => {
  loadRoomMembers()
  
  // 监听表单变化
  watch(expenseForm, () => {
    formHasChanges.value = true
    autoSave()
  }, { deep: true })
})

onBeforeUnmount(() => {
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
  }
})
</script>

<style scoped>
.expense-create {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.create-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  position: relative;
}

.back-button {
  margin-right: 15px;
}

.create-header h1 {
  margin: 0;
  font-size: 24px;
  color: #303133;
}

.auto-save-status {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  color: #909399;
  font-size: 14px;
}

.auto-save-status .el-icon {
  margin-right: 5px;
}

.create-content {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.form-card {
  border: none;
}

.form-card :deep(.el-card__body) {
  padding: 30px;
}

.expense-form {
  max-width: 600px;
  margin: 0 auto;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .expense-create {
    padding: 15px;
  }
  
  .create-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .create-header h1 {
    margin: 10px 0;
  }
  
  .auto-save-status {
    position: static;
    transform: none;
    margin-top: 10px;
  }
  
  .expense-form {
    max-width: 100%;
  }
  
  .expense-form :deep(.el-form-item__label) {
    width: 80px !important;
  }
}
</style>