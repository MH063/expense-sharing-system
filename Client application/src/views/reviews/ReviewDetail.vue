<template>
  <div class="review-detail">
    <div class="detail-header">
      <el-button type="text" @click="goBack" class="back-button">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <h1>评价详情</h1>
    </div>

    <div v-loading="loading" class="detail-content">
      <div v-if="review" class="review-card">
        <el-card shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="review-title">{{ review.title }}</span>
              <el-tag :type="getStatusTagType(review.status)">
                {{ getStatusText(review.status) }}
              </el-tag>
            </div>
          </template>

          <div class="review-info">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="评价对象">
                {{ review.targetType === 'user' ? '用户' : '房间' }}
              </el-descriptions-item>
              <el-descriptions-item label="对象名称">
                {{ review.targetName }}
              </el-descriptions-item>
              <el-descriptions-item label="评价人">
                {{ review.reviewerName }}
              </el-descriptions-item>
              <el-descriptions-item label="评价时间">
                {{ formatDate(review.createdAt) }}
              </el-descriptions-item>
              <el-descriptions-item label="评分">
                <el-rate
                  v-model="review.rating"
                  disabled
                  show-score
                  text-color="#ff9900"
                  score-template="{value} 分"
                />
              </el-descriptions-item>
              <el-descriptions-item label="评价类型">
                <el-tag :type="getCategoryTagType(review.category)">
                  {{ getCategoryText(review.category) }}
                </el-tag>
              </el-descriptions-item>
            </el-descriptions>
          </div>

          <div class="review-content">
            <h3>评价内容</h3>
            <p>{{ review.content }}</p>
          </div>

          <div v-if="review.images && review.images.length > 0" class="review-images">
            <h3>相关图片</h3>
            <el-image
              v-for="(image, index) in review.images"
              :key="index"
              :src="image.url"
              :preview-src-list="review.images.map(img => img.url)"
              fit="cover"
              class="review-image"
            />
          </div>

          <div v-if="review.responses && review.responses.length > 0" class="review-responses">
            <h3>回复</h3>
            <div
              v-for="response in review.responses"
              :key="response.id"
              class="response-item"
            >
              <div class="response-header">
                <span class="responder">{{ response.responderName }}</span>
                <span class="response-time">{{ formatDate(response.createdAt) }}</span>
              </div>
              <p class="response-content">{{ response.content }}</p>
            </div>
          </div>

          <div class="review-actions">
            <el-button
              v-if="canRespond"
              type="primary"
              @click="showResponseDialog = true"
            >
              回复
            </el-button>
            <el-button
              v-if="canEdit"
              type="primary"
              @click="editReview"
            >
              编辑
            </el-button>
            <el-button
              v-if="canDelete"
              type="danger"
              @click="deleteReview"
            >
              删除
            </el-button>
            <el-button
              v-if="canModerate && review.status === 'pending'"
              type="success"
              @click="approveReview"
            >
              审核通过
            </el-button>
            <el-button
              v-if="canModerate && review.status === 'pending'"
              type="warning"
              @click="rejectReview"
            >
              审核拒绝
            </el-button>
          </div>
        </el-card>
      </div>

      <div v-else-if="!loading" class="empty-state">
        <el-empty description="评价不存在或已被删除" />
      </div>
    </div>

    <!-- 回复对话框 -->
    <el-dialog
      v-model="showResponseDialog"
      title="回复评价"
      width="50%"
      :before-close="handleCloseResponseDialog"
    >
      <el-form
        ref="responseFormRef"
        :model="responseForm"
        :rules="responseFormRules"
        label-width="80px"
      >
        <el-form-item label="回复内容" prop="content">
          <el-input
            v-model="responseForm.content"
            type="textarea"
            :rows="5"
            placeholder="请输入回复内容"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showResponseDialog = false">取消</el-button>
          <el-button type="primary" @click="submitResponse">提交</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { reviewApi } from '@/api/reviews'
import { useUserStore } from '@/stores/user'

// 路由
const route = useRoute()
const router = useRouter()

// 状态
const userStore = useUserStore()
const loading = ref(false)
const review = ref(null)
const showResponseDialog = ref(false)
const responseFormRef = ref(null)

// 回复表单
const responseForm = reactive({
  content: ''
})

// 回复表单验证规则
const responseFormRules = {
  content: [
    { required: true, message: '请输入回复内容', trigger: 'blur' },
    { min: 5, max: 500, message: '回复内容长度应在 5 到 500 个字符之间', trigger: 'blur' }
  ]
}

// 计算属性
const currentUserId = computed(() => userStore.userId)
const reviewId = computed(() => route.params.id)

// 是否可以回复
const canRespond = computed(() => {
  if (!review.value || !currentUserId.value) return false
  
  // 如果是评价对象本人，可以回复
  if (
    (review.value.targetType === 'user' && review.value.targetId === currentUserId.value) ||
    (review.value.targetType === 'room' && review.value.roomMembers?.includes(currentUserId.value))
  ) {
    return true
  }
  
  // 如果是管理员，可以回复
  return userStore.isAdmin
})

// 是否可以编辑
const canEdit = computed(() => {
  if (!review.value || !currentUserId.value) return false
  return review.value.reviewerId === currentUserId.value && review.value.status === 'approved'
})

// 是否可以删除
const canDelete = computed(() => {
  if (!review.value || !currentUserId.value) return false
  
  // 评价者本人可以删除
  if (review.value.reviewerId === currentUserId.value) return true
  
  // 管理员可以删除
  return userStore.isAdmin
})

// 是否可以审核
const canModerate = computed(() => {
  return userStore.isAdmin && review.value?.status === 'pending'
})

// 方法
/**
 * 加载评价详情
 */
const loadReviewDetail = async () => {
  loading.value = true
  try {
    const response = await reviewApi.getReviewById(reviewId.value)
    if (response.success) {
      review.value = response.data
    } else {
      ElMessage.error('加载评价详情失败')
    }
  } catch (error) {
    console.error('加载评价详情失败:', error)
    ElMessage.error('加载评价详情失败')
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
 * 编辑评价
 */
const editReview = () => {
  router.push(`/reviews/${reviewId.value}/edit`)
}

/**
 * 删除评价
 */
const deleteReview = async () => {
  try {
    await ElMessageBox.confirm('确定要删除这条评价吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const response = await reviewApi.deleteReview(reviewId.value)
    if (response.success) {
      ElMessage.success('删除成功')
      router.push('/reviews')
    } else {
      ElMessage.error('删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除评价失败:', error)
      ElMessage.error('删除评价失败')
    }
  }
}

/**
 * 审核通过评价
 */
const approveReview = async () => {
  try {
    const response = await reviewApi.approveReview(reviewId.value)
    if (response.success) {
      ElMessage.success('审核通过')
      review.value.status = 'approved'
    } else {
      ElMessage.error('操作失败')
    }
  } catch (error) {
    console.error('审核评价失败:', error)
    ElMessage.error('审核评价失败')
  }
}

/**
 * 审核拒绝评价
 */
const rejectReview = async () => {
  try {
    const response = await reviewApi.rejectReview(reviewId.value)
    if (response.success) {
      ElMessage.success('审核拒绝')
      review.value.status = 'rejected'
    } else {
      ElMessage.error('操作失败')
    }
  } catch (error) {
    console.error('审核评价失败:', error)
    ElMessage.error('审核评价失败')
  }
}

/**
 * 提交回复
 */
const submitResponse = async () => {
  if (!responseFormRef.value) return
  
  try {
    await responseFormRef.value.validate()
    
    const response = await reviewApi.addResponse(reviewId.value, {
      content: responseForm.content
    })
    
    if (response.success) {
      ElMessage.success('回复成功')
      showResponseDialog.value = false
      responseForm.content = ''
      loadReviewDetail()
    } else {
      ElMessage.error('回复失败')
    }
  } catch (error) {
    console.error('回复评价失败:', error)
    ElMessage.error('回复评价失败')
  }
}

/**
 * 关闭回复对话框
 */
const handleCloseResponseDialog = () => {
  responseForm.content = ''
  showResponseDialog.value = false
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
    approved: 'success',
    rejected: 'danger'
  }
  return statusMap[status] || 'info'
}

/**
 * 获取状态文本
 */
const getStatusText = (status) => {
  const statusMap = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return statusMap[status] || '未知'
}

/**
 * 获取分类标签类型
 */
const getCategoryTagType = (category) => {
  const typeMap = {
    overall: '',
    cleanliness: 'success',
    communication: 'primary',
    payment: 'warning',
    behavior: 'danger',
    other: 'info'
  }
  return typeMap[category] || ''
}

/**
 * 获取分类文本
 */
const getCategoryText = (category) => {
  const categoryMap = {
    overall: '综合评价',
    cleanliness: '卫生习惯',
    communication: '沟通协作',
    payment: '费用支付',
    behavior: '行为表现',
    other: '其他'
  }
  return categoryMap[category] || '未知'
}

// 生命周期
onMounted(() => {
  loadReviewDetail()
})
</script>

<style scoped>
.review-detail {
  padding: 20px;
}

.detail-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.back-button {
  margin-right: 10px;
  font-size: 16px;
}

.detail-content {
  min-height: 400px;
}

.review-card {
  max-width: 900px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.review-title {
  font-size: 18px;
  font-weight: bold;
}

.review-info {
  margin-bottom: 20px;
}

.review-content {
  margin-bottom: 20px;
}

.review-content h3 {
  margin-bottom: 10px;
  font-size: 16px;
}

.review-content p {
  line-height: 1.6;
  white-space: pre-wrap;
}

.review-images {
  margin-bottom: 20px;
}

.review-images h3 {
  margin-bottom: 10px;
  font-size: 16px;
}

.review-image {
  width: 120px;
  height: 120px;
  margin-right: 10px;
  margin-bottom: 10px;
  border-radius: 4px;
  cursor: pointer;
}

.review-responses {
  margin-bottom: 20px;
}

.review-responses h3 {
  margin-bottom: 15px;
  font-size: 16px;
}

.response-item {
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
  margin-bottom: 10px;
}

.response-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.responder {
  font-weight: bold;
  color: #409eff;
}

.response-time {
  color: #999;
  font-size: 14px;
}

.response-content {
  line-height: 1.6;
  white-space: pre-wrap;
}

.review-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.empty-state {
  margin-top: 50px;
  text-align: center;
}
</style>