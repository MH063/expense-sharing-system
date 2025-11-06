<template>
  <div class="room-create-container">
    <div class="page-header">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/rooms' }">房间管理</el-breadcrumb-item>
        <el-breadcrumb-item>创建房间</el-breadcrumb-item>
      </el-breadcrumb>
      <h1 class="page-title">创建房间</h1>
      <p class="page-subtitle">创建一个新的寝室房间，邀请室友一起管理账单</p>
    </div>

    <el-card class="form-card" v-loading="loading">
      <el-form
        ref="roomFormRef"
        :model="roomForm"
        :rules="roomFormRules"
        label-width="120px"
        label-position="right"
      >
        <el-form-item label="房间名称" prop="name">
          <el-input
            v-model="roomForm.name"
            placeholder="请输入房间名称，如：东区3号楼201室"
            maxlength="50"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="房间描述" prop="description">
          <el-input
            v-model="roomForm.description"
            type="textarea"
            :rows="3"
            placeholder="介绍一下你们的寝室..."
            maxlength="200"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="房间位置" prop="location">
          <el-input
            v-model="roomForm.location"
            placeholder="请输入房间位置，如：东区3号楼201室"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="最大成员数" prop="maxMembers">
          <el-select v-model="roomForm.maxMembers" placeholder="请选择最大成员数">
            <el-option label="2人" :value="2" />
            <el-option label="3人" :value="3" />
            <el-option label="4人" :value="4" />
            <el-option label="5人" :value="5" />
            <el-option label="6人" :value="6" />
            <el-option label="8人" :value="8" />
          </el-select>
        </el-form-item>

        <el-form-item label="房间类型" prop="type">
          <el-radio-group v-model="roomForm.type">
            <el-radio label="dormitory">学生寝室</el-radio>
            <el-radio label="apartment">合租公寓</el-radio>
            <el-radio label="other">其他</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="默认分摊方式" prop="defaultSplitMethod">
          <el-radio-group v-model="roomForm.defaultSplitMethod">
            <el-radio label="equal">平均分摊</el-radio>
            <el-radio label="custom">自定义分摊</el-radio>
          </el-radio-group>
          <div class="form-tip">
            设置默认的分摊方式，创建账单时可以单独设置
          </div>
        </el-form-item>

        <el-form-item label="支付规则">
          <div class="payment-rules-section">
            <p class="section-desc">设置房间的特殊支付规则</p>
            <el-button type="primary" plain @click="goToPaymentRules">
              <el-icon><Setting /></el-icon>
              设置支付规则
            </el-button>
          </div>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="submitForm" :loading="submitting">
            创建房间
          </el-button>
          <el-button @click="resetForm">重置</el-button>
          <el-button @click="goBack">返回</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Setting } from '@element-plus/icons-vue'
import { roomsApi } from '@/api/rooms'

// 路由
const router = useRouter()

// 表单引用
const roomFormRef = ref(null)

// 状态
const loading = ref(false)
const submitting = ref(false)

// 表单数据
const roomForm = reactive({
  name: '',
  description: '',
  location: '',
  maxMembers: 4,
  type: 'dormitory',
  defaultSplitMethod: 'equal'
})

// 表单验证规则
const roomFormRules = {
  name: [
    { required: true, message: '请输入房间名称', trigger: 'blur' },
    { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  description: [
    { max: 200, message: '长度不能超过 200 个字符', trigger: 'blur' }
  ],
  location: [
    { required: true, message: '请输入房间位置', trigger: 'blur' },
    { min: 2, max: 100, message: '长度在 2 到 100 个字符', trigger: 'blur' }
  ],
  maxMembers: [
    { required: true, message: '请选择最大成员数', trigger: 'change' }
  ],
  type: [
    { required: true, message: '请选择房间类型', trigger: 'change' }
  ],
  defaultSplitMethod: [
    { required: true, message: '请选择默认分摊方式', trigger: 'change' }
  ]
}

/**
 * 提交表单
 */
const submitForm = async () => {
  if (!roomFormRef.value) return
  
  try {
    await roomFormRef.value.validate()
    submitting.value = true
    
    // 调用真实API创建房间
    console.log('创建房间API调用:', roomForm)
    
    const response = await roomsApi.createRoom(roomForm)
    
    if (response && response.success) {
      const newRoom = response.data
      ElMessage.success('房间创建成功')
      
      // 跳转到房间详情页
      router.push(`/rooms/${newRoom.id}`)
    } else {
      ElMessage.error(response?.message || '创建房间失败')
    }
  } catch (error) {
    console.error('创建房间失败:', error)
    ElMessage.error('创建房间失败，请重试')
  } finally {
    submitting.value = false
  }
}

/**
 * 重置表单
 */
const resetForm = () => {
  if (roomFormRef.value) {
    roomFormRef.value.resetFields()
  }
}

/**
 * 返回上一页
 */
const goBack = () => {
  router.push('/rooms')
}

/**
 * 跳转到支付规则页面
 */
const goToPaymentRules = () => {
  // 保存当前表单数据到sessionStorage，以便从支付规则页面返回时恢复
  sessionStorage.setItem('roomCreateFormData', JSON.stringify(roomForm))
  
  // 跳转到支付规则页面，传递一个临时房间ID
  const tempRoomId = 'temp-' + Date.now()
  router.push(`/rooms/${tempRoomId}/payment-rules?from=create`)
}

// 组件挂载时，检查是否有保存的表单数据
onMounted(() => {
  const savedFormData = sessionStorage.getItem('roomCreateFormData')
  if (savedFormData) {
    try {
      const formData = JSON.parse(savedFormData)
      Object.assign(roomForm, formData)
      // 清除保存的数据
      sessionStorage.removeItem('roomCreateFormData')
    } catch (error) {
      console.error('恢复表单数据失败:', error)
    }
  }
})
</script>

<style scoped>
.room-create-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 12px 0 8px;
}

.page-subtitle {
  color: #666;
  margin: 0;
}

.form-card {
  margin-bottom: 24px;
}

.payment-rules-section {
  width: 100%;
}

.section-desc {
  color: #666;
  margin-bottom: 12px;
}

.form-tip {
  font-size: 12px;
  color: #999;
  margin-top: 6px;
}
</style>