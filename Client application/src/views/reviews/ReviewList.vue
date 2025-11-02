<template>
  <div class="review-list">
    <div class="list-header">
      <el-input
        v-model="searchQuery"
        placeholder="搜索评论内容、用户或房间..."
        clearable
        @input="handleSearch"
        class="search-input"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
      <div class="filter-buttons">
        <el-button-group>
          <el-button
            :type="sortBy === 'date' ? 'primary' : ''"
            @click="setSortBy('date')"
          >
            按日期排序
          </el-button>
          <el-button
            :type="sortBy === 'rating' ? 'primary' : ''"
            @click="setSortBy('rating')"
          >
            按评分排序
          </el-button>
        </el-button-group>
      </div>
    </div>

    <div class="review-items" v-loading="loading">
      <el-card v-for="review in filteredReviews" :key="review.id" class="review-card" shadow="hover">
        <div class="review-header">
          <div class="user-info">
            <el-avatar :src="review.userAvatar" :size="40">{{ review.userName.charAt(0) }}</el-avatar>
            <div class="user-details">
              <div class="user-name">{{ review.userName }}</div>
              <div class="room-name">{{ review.roomName }}</div>
            </div>
          </div>
          <div class="review-meta">
            <div class="review-date">{{ formatDate(review.createdAt) }}</div>
            <el-tag :type="getStatusTagType(review.status)" size="small">
              {{ getStatusText(review.status) }}
            </el-tag>
          </div>
        </div>

        <div class="review-rating">
          <el-rate
            v-model="review.rating"
            disabled
            show-score
            text-color="#ff9900"
            score-template="{value}"
          />
        </div>

        <div class="review-content">
          <p>{{ review.content }}</p>
        </div>

        <div class="review-images" v-if="review.images && review.images.length > 0">
          <el-image
            v-for="(image, index) in review.images"
            :key="index"
            :src="image"
            :preview-src-list="review.images"
            fit="cover"
            class="review-image"
            lazy
          />
        </div>

        <div class="review-actions" v-if="review.status === 'pending'">
          <el-button type="success" size="small" @click="approveReview(review.id)">
            <el-icon><Check /></el-icon>
            通过
          </el-button>
          <el-button type="danger" size="small" @click="rejectReview(review.id)">
            <el-icon><Close /></el-icon>
            拒绝
          </el-button>
          <el-button type="info" size="small" @click="viewReviewDetail(review)">
            <el-icon><View /></el-icon>
            详情
          </el-button>
        </div>

        <div class="review-actions" v-else>
          <el-button type="info" size="small" @click="viewReviewDetail(review)">
            <el-icon><View /></el-icon>
            详情
          </el-button>
          <el-button type="warning" size="small" @click="editReview(review)" v-if="review.status === 'rejected'">
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
        </div>
      </el-card>

      <div v-if="filteredReviews.length === 0 && !loading" class="empty-state">
        <el-empty description="暂无评论数据" />
      </div>
    </div>

    <div class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 评论详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="评论详情"
      width="50%"
      destroy-on-close
    >
      <div v-if="selectedReview" class="review-detail">
        <div class="detail-header">
          <div class="user-info">
            <el-avatar :src="selectedReview.userAvatar" :size="50">{{ selectedReview.userName.charAt(0) }}</el-avatar>
            <div class="user-details">
              <div class="user-name">{{ selectedReview.userName }}</div>
              <div class="room-name">{{ selectedReview.roomName }}</div>
            </div>
          </div>
          <div class="review-meta">
            <div class="review-date">{{ formatDate(selectedReview.createdAt) }}</div>
            <el-tag :type="getStatusTagType(selectedReview.status)">
              {{ getStatusText(selectedReview.status) }}
            </el-tag>
          </div>
        </div>

        <div class="detail-rating">
          <el-rate
            v-model="selectedReview.rating"
            disabled
            show-score
            text-color="#ff9900"
            score-template="{value}"
          />
        </div>

        <div class="detail-content">
          <p>{{ selectedReview.content }}</p>
        </div>

        <div class="detail-images" v-if="selectedReview.images && selectedReview.images.length > 0">
          <el-image
            v-for="(image, index) in selectedReview.images"
            :key="index"
            :src="image"
            :preview-src-list="selectedReview.images"
            fit="cover"
            class="detail-image"
          />
        </div>

        <div class="detail-actions" v-if="selectedReview.status === 'pending'">
          <el-button type="success" @click="approveReview(selectedReview.id)">
            <el-icon><Check /></el-icon>
            通过
          </el-button>
          <el-button type="danger" @click="rejectReview(selectedReview.id)">
            <el-icon><Close /></el-icon>
            拒绝
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Check, Close, View, Edit } from '@element-plus/icons-vue'
import { reviewApi } from '@/api/reviews'

// Props
const props = defineProps({
  status: {
    type: String,
    default: 'pending'
  }
})

// Emits
const emit = defineEmits(['refresh'])

// 状态
const loading = ref(false)
const searchQuery = ref('')
const sortBy = ref('date')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const reviews = ref([])
const detailDialogVisible = ref(false)
const selectedReview = ref(null)

// 计算属性
const filteredReviews = computed(() => {
  let result = [...reviews.value]
  
  // 按状态过滤
  if (props.status !== 'all') {
    result = result.filter(review => review.status === props.status)
  }
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(review => 
      review.content.toLowerCase().includes(query) ||
      review.userName.toLowerCase().includes(query) ||
      review.roomName.toLowerCase().includes(query)
    )
  }
  
  // 排序
  result.sort((a, b) => {
    if (sortBy.value === 'date') {
      return new Date(b.createdAt) - new Date(a.createdAt)
    } else if (sortBy.value === 'rating') {
      return b.rating - a.rating
    }
    return 0
  })
  
  return result
})

// 方法
/**
 * 加载评论列表
 */
const loadReviews = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      status: props.status === 'all' ? undefined : props.status
    }
    
    const response = await reviewApi.getReviews(params)
    if (response.success) {
      reviews.value = response.data.items || []
      total.value = response.data.total || 0
    } else {
      ElMessage.error('加载评论列表失败')
    }
  } catch (error) {
    console.error('加载评论列表失败:', error)
    ElMessage.error('加载评论列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 处理搜索
 */
const handleSearch = () => {
  // 搜索时重置页码
  currentPage.value = 1
}

/**
 * 设置排序方式
 */
const setSortBy = (type) => {
  sortBy.value = type
}

/**
 * 处理页码变化
 */
const handleCurrentChange = (page) => {
  currentPage.value = page
  loadReviews()
}

/**
 * 处理每页数量变化
 */
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  loadReviews()
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
 * 查看评论详情
 */
const viewReviewDetail = (review) => {
  selectedReview.value = review
  detailDialogVisible.value = true
}

/**
 * 审核通过评论
 */
const approveReview = async (reviewId) => {
  try {
    await ElMessageBox.confirm('确定要通过这条评论吗？', '确认操作', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const response = await reviewApi.approveReview(reviewId)
    if (response.success) {
      ElMessage.success('评论已通过审核')
      loadReviews()
      emit('refresh')
      if (detailDialogVisible.value) {
        detailDialogVisible.value = false
      }
    } else {
      ElMessage.error('审核失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('审核评论失败:', error)
      ElMessage.error('审核评论失败')
    }
  }
}

/**
 * 拒绝评论
 */
const rejectReview = async (reviewId) => {
  try {
    const { value: reason } = await ElMessageBox.prompt('请输入拒绝原因', '拒绝评论', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /.+/,
      inputErrorMessage: '请输入拒绝原因'
    })
    
    const response = await reviewApi.rejectReview(reviewId, { reason })
    if (response.success) {
      ElMessage.success('评论已拒绝')
      loadReviews()
      emit('refresh')
      if (detailDialogVisible.value) {
        detailDialogVisible.value = false
      }
    } else {
      ElMessage.error('操作失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('拒绝评论失败:', error)
      ElMessage.error('拒绝评论失败')
    }
  }
}

/**
 * 编辑评论
 */
const editReview = (review) => {
  // 这里可以实现编辑评论的逻辑
  ElMessage.info('编辑功能开发中')
}

// 监听props变化
watch(() => props.status, () => {
  currentPage.value = 1
  loadReviews()
})

// 生命周期
onMounted(() => {
  loadReviews()
})
</script>

<style scoped>
.review-list {
  margin-top: 20px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search-input {
  width: 300px;
}

.review-card {
  margin-bottom: 15px;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.user-info {
  display: flex;
  align-items: center;
}

.user-details {
  margin-left: 10px;
}

.user-name {
  font-weight: bold;
}

.room-name {
  font-size: 12px;
  color: #666;
}

.review-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.review-date {
  font-size: 12px;
  color: #666;
  margin-bottom: 5px;
}

.review-rating {
  margin-bottom: 10px;
}

.review-content {
  margin-bottom: 10px;
}

.review-images {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

.review-image {
  width: 80px;
  height: 80px;
  border-radius: 4px;
}

.review-actions {
  display: flex;
  gap: 10px;
}

.empty-state {
  margin-top: 50px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.review-detail {
  padding: 10px 0;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.detail-rating {
  margin-bottom: 15px;
}

.detail-content {
  margin-bottom: 15px;
}

.detail-images {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 15px;
}

.detail-image {
  width: 100px;
  height: 100px;
  border-radius: 4px;
}

.detail-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  padding-top: 15px;
  border-top: 1px solid #eee;
}
</style>