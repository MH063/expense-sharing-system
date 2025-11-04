<template>
  <div class="room-create-container">
    <div class="page-header">
      <h1>创建房间</h1>
      <el-button @click="goBack">返回</el-button>
    </div>

    <el-card class="form-card">
      <el-form :model="roomForm" :rules="roomFormRules" ref="roomForm" label-width="120px">
        <el-form-item label="房间名称" prop="name">
          <el-input v-model="roomForm.name" placeholder="请输入房间名称"></el-input>
        </el-form-item>
        <el-form-item label="房间描述" prop="description">
          <el-input
            v-model="roomForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入房间描述"
          ></el-input>
        </el-form-item>
        <el-form-item label="最大成员数" prop="maxMembers">
          <el-input-number
            v-model="roomForm.maxMembers"
            :min="2"
            :max="20"
            placeholder="请输入最大成员数"
          ></el-input-number>
        </el-form-item>
        <el-form-item label="房间类型" prop="type">
          <el-select v-model="roomForm.type" placeholder="请选择房间类型" style="width: 100%">
            <el-option
              v-for="type in roomTypes"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            ></el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="是否公开" prop="isPublic">
          <el-switch v-model="roomForm.isPublic"></el-switch>
        </el-form-item>
        <el-form-item label="账单管理" prop="billManagement">
          <el-card class="bill-management-card">
            <div slot="header" class="clearfix">
              <span>账单管理设置</span>
            </div>
            <el-form-item label="支付规则" label-width="100px">
              <el-button type="primary" @click="goToPaymentRules">配置支付规则</el-button>
            </el-form-item>
          </el-card>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="submitForm" :loading="loading">创建房间</el-button>
          <el-button @click="resetForm">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'

export default {
  name: 'RoomCreate',
  setup() {
    const router = useRouter()
    const loading = ref(false)
    const roomForm = ref({
      name: '',
      description: '',
      maxMembers: 6,
      type: 'apartment',
      isPublic: false,
      billManagement: {
        paymentRules: []
      }
    })
    
    const roomFormRules = {
      name: [
        { required: true, message: '请输入房间名称', trigger: 'blur' },
        { min: 2, max: 50, message: '长度在 2 到 50 个字符', trigger: 'blur' }
      ],
      description: [
        { required: true, message: '请输入房间描述', trigger: 'blur' },
        { min: 5, max: 200, message: '长度在 5 到 200 个字符', trigger: 'blur' }
      ],
      maxMembers: [
        { required: true, message: '请输入最大成员数', trigger: 'blur' }
      ],
      type: [
        { required: true, message: '请选择房间类型', trigger: 'change' }
      ]
    }
    
    const roomTypes = [
      { value: 'apartment', label: '公寓' },
      { value: 'dormitory', label: '宿舍' },
      { value: 'house', label: '房屋' },
      { value: 'office', label: '办公室' }
    ]
    
    const roomFormRef = ref(null)
    
    /**
     * 提交表单
     */
    const submitForm = async () => {
      if (!roomFormRef.value) return
      
      await roomFormRef.value.validate(async (valid) => {
        if (valid) {
          loading.value = true
          try {
            // 模拟API调用
            console.log('模拟创建房间API调用:', roomForm.value)
            
            // 模拟API响应延迟
            await new Promise(resolve => setTimeout(resolve, 1000))
            
            // 模拟成功响应
            ElMessage.success('房间创建成功')
            
            // 跳转到房间详情页
            router.push('/rooms')
          } catch (error) {
            console.error('创建房间失败:', error)
            ElMessage.error('创建房间失败')
          } finally {
            loading.value = false
          }
        }
      })
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
      router.back()
    }
    
    /**
     * 跳转到支付规则页面
     */
    const goToPaymentRules = () => {
      // 保存当前表单数据到sessionStorage，以便返回时恢复
      sessionStorage.setItem('roomFormData', JSON.stringify(roomForm.value))
      // 跳转到支付规则页面，使用临时ID
      router.push('/rooms/create/payment-rules')
    }
    
    /**
     * 组件挂载时恢复表单数据
     */
    onMounted(() => {
      const savedFormData = sessionStorage.getItem('roomFormData')
      if (savedFormData) {
        try {
          roomForm.value = JSON.parse(savedFormData)
          // 清除保存的数据
          sessionStorage.removeItem('roomFormData')
        } catch (error) {
          console.error('恢复表单数据失败:', error)
        }
      }
    })
    
    return {
      loading,
      roomForm,
      roomFormRules,
      roomTypes,
      roomFormRef,
      submitForm,
      resetForm,
      goBack,
      goToPaymentRules
    }
  }
}
</script>

<style scoped>
.room-create-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.form-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.bill-management-card {
  margin-top: 10px;
  width: 100%;
}

.clearfix:before,
.clearfix:after {
  display: table;
  content: "";
}

.clearfix:after {
  clear: both;
}
</style>