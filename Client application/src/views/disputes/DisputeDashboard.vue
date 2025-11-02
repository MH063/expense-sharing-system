<template>
  <div class="dispute-dashboard">
    <div class="dashboard-header">
      <h1>争议管理</h1>
      <el-button type="primary" @click="createDispute">
        <el-icon><Plus /></el-icon>
        创建争议
      </el-button>
    </div>

    <div class="filter-section">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="房间">
          <el-select v-model="filterForm.roomId" placeholder="选择房间" clearable>
            <el-option
              v-for="room in rooms"
              :key="room.id"
              :label="room.name"
              :value="room.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filterForm.status" placeholder="选择状态" clearable>
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="filterForm.priority" placeholder="选择优先级" clearable>
            <el-option
              v-for="item in priorityOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadDisputes">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ stats.total }}</div>
              <div class="stat-label">总争议数</div>
            </div>
            <div class="stat-icon total">
              <el-icon><Document /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ stats.pending }}</div>
              <div class="stat-label">待处理</div>
            </div>
            <div class="stat-icon pending">
              <el-icon><Clock /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ stats.resolved }}</div>
              <div class="stat-label">已解决</div>
            </div>
            <div class="stat-icon resolved">
              <el-icon><CircleCheck /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ stats.highPriority }}</div>
              <div class="stat-label">高优先级</div>
            </div>
            <div class="stat-icon high">
              <el-icon><Warning /></el-icon>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <div class="dispute-list">
      <el-card shadow="hover">
        <template #header>
          <div class="card-header">
            <span>争议列表</span>
            <div class="header-actions">
              <el-button-group>
                <el-button
                  :type="viewMode === 'list' ? 'primary' : ''"
                  @click="viewMode = 'list'"
                >
                  <el-icon><List /></el-icon>
                  列表视图
                </el-button>
                <el-button
                  :type="viewMode === 'card' ? 'primary' : ''"
                  @click="viewMode = 'card'"
                >
                  <el-icon><Grid /></el-icon>
                  卡片视图
                </el-button>
              </el-button-group>
            </div>
          </div>
        </template>

        <div v-loading="loading" class="dispute-content">
          <!-- 列表视图 -->
          <el-table
            v-if="viewMode === 'list'"
            :data="disputes"
            stripe
            style="width: 100%"
          >
            <el-table-column prop="title" label="标题" width="200" />
            <el-table-column prop="category" label="类型" width="120">
              <template #default="scope">
                <el-tag :type="getCategoryTagType(scope.row.category)">
                  {{ getCategoryText(scope.row.category) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="roomName" label="房间" width="120" />
            <el-table-column prop="reporterName" label="发起人" width="100" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="scope">
                <el-tag :type="getStatusTagType(scope.row.status)">
                  {{ getStatusText(scope.row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="priority" label="优先级" width="100">
              <template #default="scope">
                <el-tag :type="getPriorityTagType(scope.row.priority)">
                  {{ getPriorityText(scope.row.priority) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="150">
              <template #default="scope">
                {{ formatDate(scope.row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180">
              <template #default="scope">
                <el-button type="text" @click="viewDisputeDetail(scope.row)">
                  详情
                </el-button>
                <el-button
                  v-if="canEdit(scope.row)"
                  type="text"
                  @click="editDispute(scope.row)"
                >
                  编辑
                </el-button>
                <el-button
                  v-if="canResolve(scope.row)"
                  type="text"
                  @click="resolveDispute(scope.row)"
                >
                  解决
                </el-button>
                <el-button
                  v-if="canEscalate(scope.row)"
                  type="text"
                  @click="escalateDispute(scope.row)"
                >
                  上报
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 卡片视图 -->
          <div v-else class="card-view">
            <el-row :gutter="20">
              <el-col
                v-for="dispute in disputes"
                :key="dispute.id"
                :span="8"
                class="dispute-col"
              >
                <el-card shadow="hover" class="dispute-card">
                  <template #header>
                    <div class="card-header">
                      <span class="dispute-title">{{ dispute.title }}</span>
                      <div class="card-tags">
                        <el-tag :type="getStatusTagType(dispute.status)" size="small">
                          {{ getStatusText(dispute.status) }}
                        </el-tag>
                        <el-tag :type="getPriorityTagType(dispute.priority)" size="small">
                          {{ getPriorityText(dispute.priority) }}
                        </el-tag>
                      </div>
                    </div>
                  </template>
                  <div class="dispute-info">
                    <div class="info-item">
                      <span class="label">类型:</span>
                      <el-tag :type="getCategoryTagType(dispute.category)" size="small">
                        {{ getCategoryText(dispute.category) }}
                      </el-tag>
                    </div>
                    <div class="info-item">
                      <span class="label">房间:</span>
                      <span class="value">{{ dispute.roomName }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">发起人:</span>
                      <span class="value">{{ dispute.reporterName }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">创建时间:</span>
                      <span class="value">{{ formatDate(dispute.createdAt) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">描述:</span>
                      <span class="value description">{{ truncateText(dispute.description, 50) }}</span>
                    </div>
                  </div>
                  <div class="card-actions">
                    <el-button type="text" @click="viewDisputeDetail(dispute)">
                      详情
                    </el-button>
                    <el-button
                      v-if="canEdit(dispute)"
                      type="text"
                      @click="editDispute(dispute)"
                    >
                      编辑
                    </el-button>
                    <el-button
                      v-if="canResolve(dispute)"
                      type="text"
                      @click="resolveDispute(dispute)"
                    >
                      解决
                    </el-button>
                    <el-button
                      v-if="canEscalate(dispute)"
                      type="text"
                      @click="escalateDispute(dispute)"
                    >
                      上报
                    </el-button>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>

          <div v-if="disputes.length === 0 && !loading" class="empty-state">
            <el-empty description="暂无争议记录" />
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
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, Document, Clock, CircleCheck, Warning,
  List, Grid
} from '@element-plus/icons-vue'
import { disputeApi } from '@/api/disputes'
import { roomsApi } from '@/api/rooms'
import { useUserStore } from '@/stores/user'

// 路由
const router = useRouter()

// 状态
const userStore = useUserStore()
const loading = ref(false)
const viewMode = ref('list')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const disputes = ref([])
const rooms = ref([])

// 过滤表单
const filterForm = reactive({
  roomId: '',
  status: '',
  priority: '',
  dateRange: []
})

// 统计数据
const stats = reactive({
  total: 0,
  pending: 0,
  resolved: 0,
  highPriority: 0
})

// 状态选项
const statusOptions = [
  { value: 'pending', label: '待处理' },
  { value: 'in_progress', label: '处理中' },
  { value: 'resolved', label: '已解决' },
  { value: 'escalated', label: '已上报' },
  { value: 'rejected', label: '已拒绝' }
]

// 优先级选项
const priorityOptions = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'urgent', label: '紧急' }
]

// 计算属性
const currentUserId = computed(() => userStore.userId)
const isAdmin = computed(() => userStore.isAdmin)

// 方法
/**
 * 加载争议列表
 */
const loadDisputes = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      roomId: filterForm.roomId || undefined,
      status: filterForm.status || undefined,
      priority: filterForm.priority || undefined,
      startDate: filterForm.dateRange?.[0] || undefined,
      endDate: filterForm.dateRange?.[1] || undefined
    }
    
    const response = await disputeApi.getDisputes(params)
    if (response.success) {
      disputes.value = response.data.items || []
      total.value = response.data.total || 0
      loadStats()
    } else {
      ElMessage.error('加载争议列表失败')
    }
  } catch (error) {
    console.error('加载争议列表失败:', error)
    ElMessage.error('加载争议列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 加载统计数据
 */
const loadStats = async () => {
  try {
    const params = {
      roomId: filterForm.roomId || undefined,
      startDate: filterForm.dateRange?.[0] || undefined,
      endDate: filterForm.dateRange?.[1] || undefined
    }
    
    const response = await disputeApi.getDisputeStats(params)
    if (response.success) {
      Object.assign(stats, response.data)
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

/**
 * 加载房间列表
 */
const loadRooms = async () => {
  try {
    const response = await roomsApi.getUserRooms()
    if (response.success) {
      rooms.value = response.data || []
    }
  } catch (error) {
    console.error('加载房间列表失败:', error)
  }
}

/**
 * 创建争议
 */
const createDispute = () => {
  router.push('/disputes/create')
}

/**
 * 查看争议详情
 */
const viewDisputeDetail = (dispute) => {
  router.push(`/disputes/${dispute.id}`)
}

/**
 * 编辑争议
 */
const editDispute = (dispute) => {
  router.push(`/disputes/${dispute.id}/edit`)
}

/**
 * 解决争议
 */
const resolveDispute = async (dispute) => {
  try {
    await ElMessageBox.confirm('确定要标记此争议为已解决吗？', '确认解决', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const response = await disputeApi.resolveDispute(dispute.id, {
      resolution: '已通过管理员解决'
    })
    
    if (response.success) {
      ElMessage.success('争议已标记为解决')
      loadDisputes()
    } else {
      ElMessage.error('操作失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('解决争议失败:', error)
      ElMessage.error('解决争议失败')
    }
  }
}

/**
 * 上报争议
 */
const escalateDispute = async (dispute) => {
  try {
    await ElMessageBox.confirm('确定要上报此争议吗？', '确认上报', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const response = await disputeApi.escalateDispute(dispute.id, {
      reason: '需要更高级别处理'
    })
    
    if (response.success) {
      ElMessage.success('争议已上报')
      loadDisputes()
    } else {
      ElMessage.error('操作失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('上报争议失败:', error)
      ElMessage.error('上报争议失败')
    }
  }
}

/**
 * 重置过滤条件
 */
const resetFilter = () => {
  filterForm.roomId = ''
  filterForm.status = ''
  filterForm.priority = ''
  filterForm.dateRange = []
  currentPage.value = 1
  loadDisputes()
}

/**
 * 处理页码变化
 */
const handleCurrentChange = (page) => {
  currentPage.value = page
  loadDisputes()
}

/**
 * 处理每页数量变化
 */
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  loadDisputes()
}

/**
 * 格式化日期
 */
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

/**
 * 截断文本
 */
const truncateText = (text, maxLength) => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

/**
 * 判断是否可以编辑争议
 */
const canEdit = (dispute) => {
  return dispute.reporterId === currentUserId.value && dispute.status === 'pending'
}

/**
 * 判断是否可以解决争议
 */
const canResolve = (dispute) => {
  return isAdmin.value && ['pending', 'in_progress'].includes(dispute.status)
}

/**
 * 判断是否可以上报争议
 */
const canEscalate = (dispute) => {
  return isAdmin.value && ['pending', 'in_progress'].includes(dispute.status)
}

/**
 * 获取状态标签类型
 */
const getStatusTagType = (status) => {
  const statusMap = {
    pending: 'warning',
    in_progress: 'primary',
    resolved: 'success',
    escalated: 'danger',
    rejected: 'info'
  }
  return statusMap[status] || 'info'
}

/**
 * 获取状态文本
 */
const getStatusText = (status) => {
  const statusMap = {
    pending: '待处理',
    in_progress: '处理中',
    resolved: '已解决',
    escalated: '已上报',
    rejected: '已拒绝'
  }
  return statusMap[status] || '未知'
}

/**
 * 获取优先级标签类型
 */
const getPriorityTagType = (priority) => {
  const priorityMap = {
    low: 'info',
    medium: '',
    high: 'warning',
    urgent: 'danger'
  }
  return priorityMap[priority] || ''
}

/**
 * 获取优先级文本
 */
const getPriorityText = (priority) => {
  const priorityMap = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急'
  }
  return priorityMap[priority] || '未知'
}

/**
 * 获取分类标签类型
 */
const getCategoryTagType = (category) => {
  const categoryMap = {
    payment: 'danger',
    behavior: 'warning',
    cleanliness: 'success',
    noise: 'primary',
    privacy: 'info',
    other: ''
  }
  return categoryMap[category] || ''
}

/**
 * 获取分类文本
 */
const getCategoryText = (category) => {
  const categoryMap = {
    payment: '费用争议',
    behavior: '行为问题',
    cleanliness: '卫生问题',
    noise: '噪音问题',
    privacy: '隐私问题',
    other: '其他'
  }
  return categoryMap[category] || '未知'
}

// 生命周期
onMounted(() => {
  loadDisputes()
  loadRooms()
})
</script>

<style scoped>
.dispute-dashboard {
  padding: 20px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filter-section {
  margin-bottom: 20px;
}

.filter-form {
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
}

.stats-section {
  margin-bottom: 20px;
}

.stat-card {
  position: relative;
  overflow: hidden;
}

.stat-content {
  position: relative;
  z-index: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.stat-icon {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 40px;
  opacity: 0.2;
}

.stat-icon.total {
  color: #409eff;
}

.stat-icon.pending {
  color: #e6a23c;
}

.stat-icon.resolved {
  color: #67c23a;
}

.stat-icon.high {
  color: #f56c6c;
}

.dispute-list {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.card-tags {
  display: flex;
  gap: 5px;
}

.dispute-content {
  min-height: 400px;
}

.card-view {
  margin-top: 10px;
}

.dispute-col {
  margin-bottom: 20px;
}

.dispute-card {
  height: 100%;
}

.dispute-title {
  font-weight: bold;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dispute-info {
  margin-bottom: 15px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.label {
  color: #666;
  min-width: 60px;
}

.value {
  font-weight: 500;
  text-align: right;
  flex: 1;
}

.value.description {
  text-align: left;
  line-height: 1.4;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}

.empty-state {
  margin-top: 50px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
</style>