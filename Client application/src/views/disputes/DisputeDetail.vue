<template>
  <div class="dispute-detail">
    <div class="detail-header">
      <el-button @click="goBack" class="back-button">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <h1>争议详情</h1>
      <div class="header-actions">
        <el-button v-if="dispute.status === 'pending'" type="success" @click="resolveDispute">
          <el-icon><Check /></el-icon>
          解决争议
        </el-button>
        <el-button v-if="dispute.status === 'pending'" type="warning" @click="escalateDispute">
          <el-icon><Top /></el-icon>
          上报争议
        </el-button>
        <el-button v-if="dispute.status === 'resolved'" type="info" @click="reopenDispute">
          <el-icon><RefreshRight /></el-icon>
          重新开启
        </el-button>
      </div>
    </div>

    <div v-loading="loading" class="detail-content">
      <el-card v-if="dispute.id" shadow="hover" class="dispute-card">
        <template #header>
          <div class="card-header">
            <span class="dispute-title">{{ dispute.title }}</span>
            <el-tag :type="getStatusTagType(dispute.status)" size="large">
              {{ getStatusText(dispute.status) }}
            </el-tag>
          </div>
        </template>

        <div class="dispute-info">
          <el-descriptions :column="2" border>
            <el-descriptions-item label="争议ID">{{ dispute.id }}</el-descriptions-item>
            <el-descriptions-item label="创建时间">{{ formatDate(dispute.createdAt) }}</el-descriptions-item>
            <el-descriptions-item label="发起人">
              <div class="user-info">
                <el-avatar :src="dispute.creator.avatar" :size="30">{{ dispute.creator.name.charAt(0) }}</el-avatar>
                <span>{{ dispute.creator.name }}</span>
              </div>
            </el-descriptions-item>
            <el-descriptions-item label="关联房间">
              <el-link type="primary" @click="goToRoom(dispute.room.id)">{{ dispute.room.name }}</el-link>
            </el-descriptions-item>
            <el-descriptions-item label="争议类型">
              <el-tag :type="getTypeTagType(dispute.type)">{{ getTypeText(dispute.type) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="优先级">
              <el-tag :type="getPriorityTagType(dispute.priority)">{{ getPriorityText(dispute.priority) }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="最后更新">{{ formatDate(dispute.updatedAt) }}</el-descriptions-item>
            <el-descriptions-item label="处理人" v-if="dispute.handler">
              <div class="user-info">
                <el-avatar :src="dispute.handler.avatar" :size="30">{{ dispute.handler.name.charAt(0) }}</el-avatar>
                <span>{{ dispute.handler.name }}</span>
              </div>
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div class="dispute-description">
          <h3>争议描述</h3>
          <p>{{ dispute.description }}</p>
        </div>

        <div class="dispute-evidence" v-if="dispute.evidence && dispute.evidence.length > 0">
          <h3>证据材料</h3>
          <div class="evidence-list">
            <div v-for="(item, index) in dispute.evidence" :key="index" class="evidence-item">
              <el-image
                v-if="item.type === 'image'"
                :src="item.url"
                :preview-src-list="dispute.evidence.filter(e => e.type === 'image').map(e => e.url)"
                fit="cover"
                class="evidence-image"
              />
              <div v-else-if="item.type === 'document'" class="evidence-document">
                <el-icon><Document /></el-icon>
                <el-link :href="item.url" target="_blank">{{ item.name }}</el-link>
              </div>
            </div>
          </div>
        </div>

        <div class="dispute-participants">
          <h3>相关方</h3>
          <div class="participants-list">
            <div v-for="participant in dispute.participants" :key="participant.id" class="participant-item">
              <el-avatar :src="participant.avatar" :size="40">{{ participant.name.charAt(0) }}</el-avatar>
              <div class="participant-info">
                <div class="participant-name">{{ participant.name }}</div>
                <div class="participant-role">{{ participant.role }}</div>
              </div>
              <el-tag :type="participant.status === 'confirmed' ? 'success' : 'warning'" size="small">
                {{ participant.status === 'confirmed' ? '已确认' : '待确认' }}
              </el-tag>
            </div>
          </div>
        </div>

        <div class="dispute-resolution" v-if="dispute.resolution">
          <h3>解决方案</h3>
          <div class="resolution-content">
            <p>{{ dispute.resolution.content }}</p>
            <div class="resolution-meta">
              <span>处理人：{{ dispute.resolution.handler.name }}</span>
              <span>处理时间：{{ formatDate(dispute.resolution.resolvedAt) }}</span>
            </div>
          </div>
        </div>
      </el-card>

      <div v-else-if="!loading" class="empty-state">
        <el-empty description="未找到争议信息" />
      </div>
    </div>

    <!-- 争议解决对话框 -->
    <el-dialog
      v-model="resolveDialogVisible"
      title="解决争议"
      width="50%"
      destroy-on-close
    >
      <el-form :model="resolveForm" :rules="resolveRules" ref="resolveFormRef" label-width="80px">
        <el-form-item label="解决方案" prop="content">
          <el-input
            v-model="resolveForm.content"
            type="textarea"
            :rows="5"
            placeholder="请输入解决方案"
          />
        </el-form-item>
        <el-form-item label="处理结果" prop="result">
          <el-radio-group v-model="resolveForm.result">
            <el-radio label="approved">支持申诉方</el-radio>
            <el-radio label="rejected">驳回申诉</el-radio>
            <el-radio label="compromise">双方妥协</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="resolveDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitResolution">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Check, Top, RefreshRight, Document } from '@element-plus/icons-vue'
import { disputeApi } from '@/api/disputes'

// 路由
const route = useRoute()
const router = useRouter()

// 状态
const loading = ref(false)
const dispute = ref({})
const resolveDialogVisible = ref(false)
const resolveFormRef = ref(null)

// 表单数据
const resolveForm = reactive({
  content: '',
  result: 'approved'
})

// 表单验证规则
const resolveRules = {
  content: [
    { required: true, message: '请输入解决方案', trigger: 'blur' },
    { min: 10, message: '解决方案至少10个字符', trigger: 'blur' }
  ],
  result: [
    { required: true, message: '请选择处理结果', trigger: 'change' }
  ]
}

// 方法
/**
 * 加载争议详情
 */
const loadDisputeDetail = async () => {
  const disputeId = route.params.id
  if (!disputeId) {
    ElMessage.error('缺少争议ID')
    goBack()
    return
  }

  loading.value = true
  try {
    const response = await disputeApi.getDisputeById(disputeId)
    if (response.success) {
      dispute.value = response.data
    } else {
      ElMessage.error('加载争议详情失败')
    }
  } catch (error) {
    console.error('加载争议详情失败:', error)
    ElMessage.error('加载争议详情失败')
  } finally {
    loading.value = false
  }
}

/**
 * 返回上一页
 */
const goBack = () => {
  router.go(-1)
}

/**
 * 跳转到房间页面
 */
const goToRoom = (roomId) => {
  router.push(`/rooms/${roomId}`)
}

/**
 * 格式化日期
 */
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

/**
 * 获取状态标签类型
 */
const getStatusTagType = (status) => {
  const statusMap = {
    pending: 'warning',
    processing: 'primary',
    resolved: 'success',
    escalated: 'danger'
  }
  return statusMap[status] || 'info'
}

/**
 * 获取状态文本
 */
const getStatusText = (status) => {
  const statusMap = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
    escalated: '已上报'
  }
  return statusMap[status] || '未知'
}

/**
 * 获取类型标签类型
 */
const getTypeTagType = (type) => {
  const typeMap = {
    payment: 'danger',
    expense: 'warning',
    room: 'primary',
    other: 'info'
  }
  return typeMap[type] || 'info'
}

/**
 * 获取类型文本
 */
const getTypeText = (type) => {
  const typeMap = {
    payment: '支付争议',
    expense: '费用争议',
    room: '房间争议',
    other: '其他争议'
  }
  return typeMap[type] || '未知'
}

/**
 * 获取优先级标签类型
 */
const getPriorityTagType = (priority) => {
  const priorityMap = {
    low: 'info',
    medium: 'warning',
    high: 'danger'
  }
  return priorityMap[priority] || 'info'
}

/**
 * 获取优先级文本
 */
const getPriorityText = (priority) => {
  const priorityMap = {
    low: '低',
    medium: '中',
    high: '高'
  }
  return priorityMap[priority] || '未知'
}

/**
 * 解决争议
 */
const resolveDispute = () => {
  resolveForm.content = ''
  resolveForm.result = 'approved'
  resolveDialogVisible.value = true
}

/**
 * 上报争议
 */
const escalateDispute = async () => {
  try {
    await ElMessageBox.confirm('确定要上报这个争议吗？', '确认操作', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const response = await disputeApi.escalateDispute(dispute.value.id)
    if (response.success) {
      ElMessage.success('争议已上报')
      loadDisputeDetail()
    } else {
      ElMessage.error('上报失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('上报争议失败:', error)
      ElMessage.error('上报争议失败')
    }
  }
}

/**
 * 重新开启争议
 */
const reopenDispute = async () => {
  try {
    await ElMessageBox.confirm('确定要重新开启这个争议吗？', '确认操作', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const response = await disputeApi.reopenDispute(dispute.value.id)
    if (response.success) {
      ElMessage.success('争议已重新开启')
      loadDisputeDetail()
    } else {
      ElMessage.error('操作失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重新开启争议失败:', error)
      ElMessage.error('重新开启争议失败')
    }
  }
}

/**
 * 提交解决方案
 */
const submitResolution = async () => {
  if (!resolveFormRef.value) return
  
  try {
    await resolveFormRef.value.validate()
    
    const response = await disputeApi.resolveDispute(dispute.value.id, {
      content: resolveForm.content,
      result: resolveForm.result
    })
    
    if (response.success) {
      ElMessage.success('争议已解决')
      resolveDialogVisible.value = false
      loadDisputeDetail()
    } else {
      ElMessage.error('解决争议失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('解决争议失败:', error)
      ElMessage.error('解决争议失败')
    }
  }
}

// 生命周期
onMounted(() => {
  loadDisputeDetail()
})
</script>

<style scoped>
.dispute-detail {
  padding: 20px;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.back-button {
  margin-right: 15px;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.dispute-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.dispute-title {
  font-size: 18px;
  font-weight: bold;
}

.dispute-info {
  margin-bottom: 20px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dispute-description {
  margin-bottom: 20px;
}

.dispute-description h3 {
  margin-bottom: 10px;
}

.dispute-evidence {
  margin-bottom: 20px;
}

.dispute-evidence h3 {
  margin-bottom: 10px;
}

.evidence-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.evidence-item {
  margin-bottom: 10px;
}

.evidence-image {
  width: 100px;
  height: 100px;
  border-radius: 4px;
}

.evidence-document {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.dispute-participants {
  margin-bottom: 20px;
}

.dispute-participants h3 {
  margin-bottom: 10px;
}

.participants-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.participant-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}

.participant-info {
  flex: 1;
}

.participant-name {
  font-weight: bold;
}

.participant-role {
  font-size: 12px;
  color: #666;
}

.dispute-resolution {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.dispute-resolution h3 {
  margin-bottom: 10px;
}

.resolution-content {
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.resolution-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
  font-size: 12px;
  color: #666;
}

.empty-state {
  margin-top: 50px;
}
</style>