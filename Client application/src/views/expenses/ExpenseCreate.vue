<template>
  <div class="expense-create">
    <div class="create-header">
      <el-button @click="goBack" class="back-button">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <h1>创建费用记录</h1>
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

          <el-form-item label="分摊方式" prop="splitType">
            <el-radio-group v-model="expenseForm.splitType">
              <el-radio label="equal">平均分摊</el-radio>
              <el-radio label="custom">自定义分摊</el-radio>
              <el-radio label="percentage">按比例分摊</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="分摊成员" prop="splitMembers">
            <div class="split-members">
              <div class="member-list">
                <div
                  v-for="member in roomMembers"
                  :key="member.id"
                  class="member-item"
                >
                  <el-checkbox
                    v-model="member.selected"
                    :disabled="expenseForm.splitType === 'custom' || expenseForm.splitType === 'percentage'"
                  >
                    <div class="member-info">
                      <el-avatar :src="member.avatar" :size="30">{{ member.name.charAt(0) }}</el-avatar>
                      <span>{{ member.name }}</span>
                    </div>
                  </el-checkbox>
                  
                  <div v-if="expenseForm.splitType === 'custom' && member.selected" class="custom-amount">
                    <el-input-number
                      v-model="member.customAmount"
                      :precision="2"
                      :step="0.01"
                      :min="0"
                      size="small"
                      placeholder="金额"
                    />
                  </div>
                  
                  <div v-if="expenseForm.splitType === 'percentage' && member.selected" class="percentage">
                    <el-input-number
                      v-model="member.percentage"
                      :precision="1"
                      :step="0.1"
                      :min="0"
                      :max="100"
                      size="small"
                      placeholder="%"
                    />
                  </div>
                </div>
              </div>
              
              <div class="split-summary">
                <div class="summary-item">
                  <span>已选成员: {{ selectedMembers.length }}</span>
                </div>
                <div class="summary-item" v-if="expenseForm.splitType === 'equal'">
                  <span>每人应付: ¥{{ perPersonAmount.toFixed(2) }}</span>
                </div>
                <div class="summary-item" v-if="expenseForm.splitType === 'custom'">
                  <span>已分摊金额: ¥{{ totalCustomAmount.toFixed(2) }}</span>
                </div>
                <div class="summary-item" v-if="expenseForm.splitType === 'percentage'">
                  <span>已分配比例: {{ totalPercentage.toFixed(1) }}%</span>
                </div>
              </div>
            </div>
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
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Plus } from '@element-plus/icons-vue'
import { expenseApi } from '@/api/expenses'
import { roomsApi } from '@/api/rooms'
import { useUserStore } from '@/stores/user'

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
    { min: 2, max: 50, message: '费用名称长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  amount: [
    { required: true, message: '请输入费用金额', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '费用金额必须大于0', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '请选择费用类型', trigger: 'change' }
  ],
  paymentMethod: [
    { required: true, message: '请选择支付方式', trigger: 'change' }
  ],
  paymentDate: [
    { required: true, message: '请选择支付日期', trigger: 'change' }
  ]
}

// 费用类型选项
const expenseCategories = [
  { value: 'food', label: '餐饮' },
  { value: 'utilities', label: '水电费' },
  { value: 'rent', label: '房租' },
  { value: 'daily', label: '日用品' },
  { value: 'entertainment', label: '娱乐' },
  { value: 'transport', label: '交通' },
  { value: 'medical', label: '医疗' },
  { value: 'education', label: '教育' },
  { value: 'other', label: '其他' }
]

// 支付方式选项
const paymentMethods = [
  { value: 'cash', label: '现金' },
  { value: 'alipay', label: '支付宝' },
  { value: 'wechat', label: '微信支付' },
  { value: 'bank', label: '银行卡' },
  { value: 'credit', label: '信用卡' },
  { value: 'other', label: '其他' }
]

// 上传配置
const uploadUrl = '/api/expenses/upload-receipt'
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${userStore.token}`
}))

// 计算属性
const selectedMembers = computed(() => {
  return roomMembers.value.filter(member => member.selected)
})

const perPersonAmount = computed(() => {
  if (expenseForm.amount && selectedMembers.value.length > 0) {
    return expenseForm.amount / selectedMembers.value.length
  }
  return 0
})

const totalCustomAmount = computed(() => {
  return selectedMembers.value.reduce((total, member) => {
    return total + (member.customAmount || 0)
  }, 0)
})

const totalPercentage = computed(() => {
  return selectedMembers.value.reduce((total, member) => {
    return total + (member.percentage || 0)
  }, 0)
})

// 方法
/**
 * 加载房间成员
 */
const loadRoomMembers = async () => {
  if (!roomId.value) {
    ElMessage.error('缺少房间ID')
    return
  }

  try {
    const response = await roomsApi.getRoomMembers(roomId.value)
    if (response.success) {
      roomMembers.value = response.data.map(member => ({
        ...member,
        selected: false,
        customAmount: 0,
        percentage: 0
      }))
    } else {
      ElMessage.error('加载房间成员失败')
    }
  } catch (error) {
    console.error('加载房间成员失败:', error)
    ElMessage.error('加载房间成员失败')
  }
}

/**
 * 返回上一页
 */
const goBack = () => {
  router.go(-1)
}

/**
 * 上传前校验
 */
const beforeUpload = (file) => {
  const isImage = file.type.startsWith('image/')
  const isLt5M = file.size / 1024 / 1024 < 5

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt5M) {
    ElMessage.error('图片大小不能超过 5MB!')
    return false
  }
  return true
}

/**
 * 上传成功回调
 */
const handleUploadSuccess = (response, uploadFile) => {
  if (response.success) {
    expenseForm.receipt.push(response.data.url)
    ElMessage.success('上传成功')
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
 * 提交费用记录
 */
const submitExpense = async () => {
  if (!expenseFormRef.value) return

  try {
    await expenseFormRef.value.validate()

    // 验证分摊成员
    if (selectedMembers.value.length === 0) {
      ElMessage.error('请至少选择一个分摊成员')
      return
    }

    // 验证自定义分摊金额
    if (expenseForm.splitType === 'custom' && Math.abs(totalCustomAmount.value - expenseForm.amount) > 0.01) {
      ElMessage.error('自定义分摊金额总和必须等于费用金额')
      return
    }

    // 验证比例分摊
    if (expenseForm.splitType === 'percentage' && Math.abs(totalPercentage.value - 100) > 0.1) {
      ElMessage.error('比例分摊总和必须等于100%')
      return
    }

    // 构建分摊数据
    const splitData = selectedMembers.value.map(member => {
      const baseData = {
        userId: member.id,
        userName: member.name
      }

      if (expenseForm.splitType === 'equal') {
        baseData.amount = perPersonAmount.value
      } else if (expenseForm.splitType === 'custom') {
        baseData.amount = member.customAmount
      } else if (expenseForm.splitType === 'percentage') {
        baseData.amount = expenseForm.amount * (member.percentage / 100)
        baseData.percentage = member.percentage
      }

      return baseData
    })

    // 提交数据
    const data = {
      roomId: roomId.value,
      title: expenseForm.title,
      amount: expenseForm.amount,
      category: expenseForm.category,
      paymentMethod: expenseForm.paymentMethod,
      paymentDate: expenseForm.paymentDate,
      splitType: expenseForm.splitType,
      splitMembers: splitData,
      description: expenseForm.description,
      receipt: expenseForm.receipt
    }

    submitting.value = true
    const response = await expenseApi.createExpense(data)
    if (response.success) {
      ElMessage.success('费用记录创建成功')
      router.push(`/rooms/${roomId.value}/expenses`)
    } else {
      ElMessage.error('创建费用记录失败')
    }
  } catch (error) {
    console.error('创建费用记录失败:', error)
    ElMessage.error('创建费用记录失败')
  } finally {
    submitting.value = false
  }
}

/**
 * 重置表单
 */
const resetForm = () => {
  if (expenseFormRef.value) {
    expenseFormRef.value.resetFields()
  }
  
  // 重置分摊成员
  roomMembers.value.forEach(member => {
    member.selected = false
    member.customAmount = 0
    member.percentage = 0
  })
  
  // 重置文件列表
  fileList.value = []
  expenseForm.receipt = []
}

// 生命周期
onMounted(() => {
  loadRoomMembers()
})
</script>

<style scoped>
.expense-create {
  padding: 20px;
}

.create-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.back-button {
  margin-right: 15px;
}

.form-card {
  max-width: 800px;
  margin: 0 auto;
}

.split-members {
  width: 100%;
}

.member-list {
  margin-bottom: 15px;
}

.member-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  padding: 10px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.member-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.custom-amount,
.percentage {
  margin-left: auto;
  width: 120px;
}

.split-summary {
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.summary-item {
  margin-bottom: 5px;
  font-size: 14px;
}
</style>