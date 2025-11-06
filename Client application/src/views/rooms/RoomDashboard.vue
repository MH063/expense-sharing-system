<template>
  <div class="room-dashboard">
    <div class="dashboard-header">
      <h1>房间管理</h1>
      <el-button type="primary" @click="createRoom">
        <el-icon><Plus /></el-icon>
        创建房间
      </el-button>
    </div>

    <div class="filter-section">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="房间状态">
          <el-select v-model="filterForm.status" placeholder="选择状态" clearable>
            <el-option
              v-for="item in statusOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="成员数量">
          <el-select v-model="filterForm.memberCount" placeholder="选择成员数量" clearable>
            <el-option
              v-for="item in memberCountOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadRooms">查询</el-button>
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
              <div class="stat-label">总房间数</div>
            </div>
            <div class="stat-icon total">
              <el-icon><House /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ stats.myRooms }}</div>
              <div class="stat-label">我的房间</div>
            </div>
            <div class="stat-icon my">
              <el-icon><User /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ stats.activeRooms }}</div>
              <div class="stat-label">活跃房间</div>
            </div>
            <div class="stat-icon active">
              <el-icon><CircleCheck /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">{{ stats.pendingInvitations }}</div>
              <div class="stat-label">待处理邀请</div>
            </div>
            <div class="stat-icon pending">
              <el-icon><Bell /></el-icon>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <div class="room-list">
      <el-card shadow="hover">
        <template #header>
          <div class="card-header">
            <span>房间列表</span>
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

        <div v-loading="loading" class="room-content">
          <!-- 列表视图 -->
          <el-table
            v-if="viewMode === 'list'"
            :data="rooms"
            stripe
            style="width: 100%"
          >
            <el-table-column prop="name" label="房间名称" width="180" />
            <el-table-column prop="description" label="描述" width="200" />
            <el-table-column prop="memberCount" label="成员数量" width="100" />
            <el-table-column prop="maxMembers" label="最大成员" width="100" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="scope">
                <el-tag :type="getStatusTagType(scope.row.status)">
                  {{ getStatusText(scope.row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createdAt" label="创建时间" width="150">
              <template #default="scope">
                {{ formatDate(scope.row.createdAt) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="scope">
                <el-button type="text" @click="viewRoomDetail(scope.row)">
                  详情
                </el-button>
                <el-button
                  v-if="canEdit(scope.row)"
                  type="text"
                  @click="editRoom(scope.row)"
                >
                  编辑
                </el-button>
                <el-button
                  v-if="canJoin(scope.row)"
                  type="text"
                  @click="joinRoom(scope.row)"
                >
                  加入
                </el-button>
                <el-button
                  v-if="canLeave(scope.row)"
                  type="text"
                  @click="leaveRoom(scope.row)"
                >
                  退出
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 卡片视图 -->
          <div v-else class="card-view">
            <el-row :gutter="20">
              <el-col
                v-for="room in rooms"
                :key="room.id"
                :span="8"
                class="room-col"
              >
                <el-card shadow="hover" class="room-card">
                  <template #header>
                    <div class="card-header">
                      <span class="room-title">{{ room.name }}</span>
                      <el-tag :type="getStatusTagType(room.status)" size="small">
                        {{ getStatusText(room.status) }}
                      </el-tag>
                    </div>
                  </template>
                  <div class="room-info">
                    <div class="info-item">
                      <span class="label">描述:</span>
                      <span class="value description">{{ truncateText(room.description, 30) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">成员:</span>
                      <span class="value">{{ room.memberCount }}/{{ room.maxMembers }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">创建时间:</span>
                      <span class="value">{{ formatDate(room.createdAt) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">创建者:</span>
                      <span class="value">{{ room.creatorName }}</span>
                    </div>
                  </div>
                  <div class="card-actions">
                    <el-button type="text" @click="viewRoomDetail(room)">
                      详情
                    </el-button>
                    <el-button
                      v-if="canEdit(room)"
                      type="text"
                      @click="editRoom(room)"
                    >
                      编辑
                    </el-button>
                    <el-button
                      v-if="canJoin(room)"
                      type="text"
                      @click="joinRoom(room)"
                    >
                      加入
                    </el-button>
                    <el-button
                      v-if="canLeave(room)"
                      type="text"
                      @click="leaveRoom(room)"
                    >
                      退出
                    </el-button>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>

          <div v-if="rooms.length === 0 && !loading" class="empty-state">
            <el-empty description="暂无房间" />
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
  Plus, House, User, CircleCheck, Bell,
  List, Grid
} from '@element-plus/icons-vue'
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
const rooms = ref([])

// 过滤表单
const filterForm = reactive({
  status: '',
  memberCount: ''
})

// 统计数据
const stats = reactive({
  total: 0,
  myRooms: 0,
  activeRooms: 0,
  pendingInvitations: 0
})

// 状态选项
const statusOptions = [
  { value: 'active', label: '活跃' },
  { value: 'inactive', label: '不活跃' },
  { value: 'full', label: '已满' }
]

// 成员数量选项
const memberCountOptions = [
  { value: '1', label: '1人' },
  { value: '2', label: '2人' },
  { value: '3', label: '3人' },
  { value: '4', label: '4人及以上' }
]

// 计算属性
const currentUserId = computed(() => userStore.userId)

// 方法
/**
 * 加载房间列表
 */
const loadRooms = async () => {
  loading.value = true
  try {
    // 模拟API调用
    console.log('模拟加载房间列表API调用:', {
      page: currentPage.value,
      limit: pageSize.value,
      status: filterForm.status || undefined,
      memberCount: filterForm.memberCount || undefined
    })
    
    // 调用真实后端接口获取房间列表
    const resp = await roomsApi.getUserRooms()
    if (resp.success && resp.data) {
      const list = resp.data || []
      rooms.value = list.slice((currentPage.value - 1) * pageSize.value, (currentPage.value - 1) * pageSize.value + pageSize.value)
      total.value = list.length
      // 加载统计数据基于真实列表
      await loadStats()
    } else {
      throw new Error(resp.message || '房间列表接口返回异常')
    }
  } catch (error) {
    console.error('加载房间列表失败:', error)
    ElMessage.error('加载房间列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 加载统计数据
 */
const loadStats = async () => {
  try {
    // 模拟API调用
    console.log('模拟加载房间统计数据API调用')
    
    // 根据真实数据计算统计信息
    stats.total = total.value
    stats.myRooms = rooms.value.filter(r => r.isMember).length
    stats.activeRooms = rooms.value.filter(r => r.status === 'active').length
    // 待处理邀请暂以通知未读或后台字段代替，若后端提供邀请接口，再改为真实接口值
    const unreadResp = await roomsApi.getUserInvitations()
    if (unreadResp && unreadResp.success && Array.isArray(unreadResp.data)) {
      stats.pendingInvitations = unreadResp.data.filter(i => i.status === 'pending').length
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

/**
 * 创建房间
 */
const createRoom = () => {
  router.push('/rooms/create')
}

/**
 * 查看房间详情
 */
const viewRoomDetail = (room) => {
  router.push(`/rooms/${room.id}`)
}

/**
 * 编辑房间
 */
const editRoom = (room) => {
  router.push(`/rooms/${room.id}/edit`)
}

/**
 * 加入房间
 */
const joinRoom = async (roomId) => {
  try {
    // 模拟API调用
    console.log('模拟加入房间API调用:', { roomId })
    
    // 模拟API响应延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 模拟成功响应
    ElMessage.success('成功加入房间')
    loadRooms() // 重新加载房间列表
  } catch (error) {
    console.error('加入房间失败:', error)
    ElMessage.error('加入房间失败')
  }
}

/**
 * 退出房间
 */
const leaveRoom = async (roomId) => {
  try {
    // 模拟API调用
    console.log('模拟退出房间API调用:', { roomId })
    
    // 模拟API响应延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 模拟成功响应
    ElMessage.success('已退出房间')
    loadRooms() // 重新加载房间列表
  } catch (error) {
    console.error('退出房间失败:', error)
    ElMessage.error('退出房间失败')
  }
}

/**
 * 重置过滤条件
 */
const resetFilter = () => {
  filterForm.status = ''
  filterForm.memberCount = ''
  currentPage.value = 1
  loadRooms()
}

/**
 * 处理页码变化
 */
const handleCurrentChange = (page) => {
  currentPage.value = page
  loadRooms()
}

/**
 * 处理每页数量变化
 */
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  loadRooms()
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
 * 判断是否可以编辑房间
 */
const canEdit = (room) => {
  return room.creatorId === currentUserId.value
}

/**
 * 判断是否可以加入房间
 */
const canJoin = (room) => {
  if (!room.isMember && room.memberCount < room.maxMembers) {
    return true
  }
  return false
}

/**
 * 判断是否可以退出房间
 */
const canLeave = (room) => {
  return room.isMember && room.creatorId !== currentUserId.value
}

/**
 * 获取状态标签类型
 */
const getStatusTagType = (status) => {
  const statusMap = {
    active: 'success',
    inactive: 'info',
    full: 'warning'
  }
  return statusMap[status] || 'info'
}

/**
 * 获取状态文本
 */
const getStatusText = (status) => {
  const statusMap = {
    active: '活跃',
    inactive: '不活跃',
    full: '已满'
  }
  return statusMap[status] || '未知'
}

// 生命周期
onMounted(() => {
  loadRooms()
})
</script>

<style scoped>
.room-dashboard {
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

.stat-icon.my {
  color: #67c23a;
}

.stat-icon.active {
  color: #e6a23c;
}

.stat-icon.pending {
  color: #f56c6c;
}

.room-list {
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

.room-content {
  min-height: 400px;
}

.card-view {
  margin-top: 10px;
}

.room-col {
  margin-bottom: 20px;
}

.room-card {
  height: 100%;
}

.room-title {
  font-weight: bold;
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.room-info {
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