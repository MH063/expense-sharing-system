<template>
  <div class="room-management-container" v-if="canManageRooms">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">房间管理</h1>
        <el-button type="primary" @click="createRoom" v-if="canCreateRoom">
          <el-icon><Plus /></el-icon>
          创建房间
        </el-button>
      </div>
    </div>

    <div class="filter-section">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="房间状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable>
            <el-option label="全部" value="" />
            <el-option label="活跃" value="active" />
            <el-option label="非活跃" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item label="成员数量">
          <el-select v-model="filterForm.memberCount" placeholder="全部" clearable>
            <el-option label="全部" value="" />
            <el-option label="1-2人" value="1-2" />
            <el-option label="3-4人" value="3-4" />
            <el-option label="5人以上" value="5+" />
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
          <el-card class="stats-card">
            <div class="stats-item">
              <div class="stats-icon total">
                <el-icon><House /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ stats.totalRooms }}</div>
                <div class="stats-label">总房间数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-item">
              <div class="stats-icon my">
                <el-icon><User /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ stats.myRooms }}</div>
                <div class="stats-label">我的房间</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-item">
              <div class="stats-icon active">
                <el-icon><Star /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ stats.activeRooms }}</div>
                <div class="stats-label">活跃房间</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stats-card">
            <div class="stats-item">
              <div class="stats-icon pending">
                <el-icon><Bell /></el-icon>
              </div>
              <div class="stats-info">
                <div class="stats-value">{{ stats.pendingInvites }}</div>
                <div class="stats-label">待处理邀请</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <div class="rooms-section">
      <div class="section-header">
        <div class="view-toggle">
          <el-radio-group v-model="viewMode">
            <el-radio-button label="list">
              <el-icon><List /></el-icon>
              列表视图
            </el-radio-button>
            <el-radio-button label="card">
              <el-icon><Grid /></el-icon>
              卡片视图
            </el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <!-- 列表视图 -->
      <div v-if="viewMode === 'list'" class="list-view">
        <el-table :data="rooms" v-loading="loading" stripe>
          <el-table-column prop="name" label="房间名称" min-width="150" />
          <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
          <el-table-column prop="memberCount" label="成员数量" width="100" align="center" />
          <el-table-column prop="status" label="状态" width="100" align="center">
            <template #default="scope">
              <el-tag :type="getStatusTagType(scope.row.status)">
                {{ getStatusText(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="creatorName" label="创建者" width="120" />
          <el-table-column prop="createdAt" label="创建时间" width="160">
            <template #default="scope">
              {{ formatDate(scope.row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="200" align="center">
            <template #default="scope">
              <el-button size="small" type="primary" @click="viewRoom(scope.row.id)">
                详情
              </el-button>
              <el-button size="small" type="warning" @click="editRoom(scope.row.id)" v-if="canEdit(scope.row)">
                编辑
              </el-button>
              <el-button size="small" type="success" @click="joinRoom(scope.row.id)" v-if="canJoin(scope.row)">
                加入
              </el-button>
              <el-button size="small" type="danger" @click="leaveRoom(scope.row.id)" v-if="canLeave(scope.row)">
                退出
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 卡片视图 -->
      <div v-else class="card-view">
        <el-row :gutter="20">
          <el-col :span="6" v-for="room in rooms" :key="room.id">
            <el-card class="room-card" shadow="hover">
              <div class="room-header">
                <h3 class="room-name">{{ room.name }}</h3>
                <el-tag :type="getStatusTagType(room.status)" size="small">
                  {{ getStatusText(room.status) }}
                </el-tag>
              </div>
              <div class="room-description">
                {{ truncateText(room.description, 50) }}
              </div>
              <div class="room-meta">
                <div class="meta-item">
                  <el-icon><User /></el-icon>
                  <span>{{ room.memberCount }} 成员</span>
                </div>
                <div class="meta-item">
                  <el-icon><Calendar /></el-icon>
                  <span>{{ formatDate(room.createdAt) }}</span>
                </div>
                <div class="meta-item">
                  <el-icon><UserFilled /></el-icon>
                  <span>{{ room.creatorName }}</span>
                </div>
              </div>
              <div class="room-actions">
                <el-button size="small" type="primary" @click="viewRoom(room.id)">
                  详情
                </el-button>
                <el-button size="small" type="warning" @click="editRoom(room.id)" v-if="canEdit(room)">
                  编辑
                </el-button>
                <el-button size="small" type="success" @click="joinRoom(room.id)" v-if="canJoin(room)">
                  加入
                </el-button>
                <el-button size="small" type="danger" @click="leaveRoom(room.id)" v-if="canLeave(room)">
                  退出
                </el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalRooms"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
  </div>
  
  <!-- 无权限访问提示 -->
  <div v-else class="no-permission-container">
    <div class="no-permission-content">
      <el-icon class="lock-icon"><Lock /></el-icon>
      <h2 class="no-permission-title">访问受限</h2>
      <p class="no-permission-desc">您没有权限查看房间管理数据</p>
      <el-button type="primary" @click="$router.push('/')">返回首页</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Plus, House, User, Star, Bell, List, Grid, 
  Calendar, UserFilled, Lock
} from '@element-plus/icons-vue'
import { roomsApi } from '@/api/rooms'
import { useUserStore } from '@/stores/user'
import { useAuthStore } from '@/stores/auth'
import { PERMISSIONS } from '@/utils/permissions'

const router = useRouter()
const userStore = useUserStore()
const authStore = useAuthStore()

// 权限检查
const canManageRooms = computed(() => {
  return authStore.hasPermission(PERMISSIONS.ROOM_MANAGE) || 
         authStore.hasPermission(PERMISSIONS.SYSTEM_ADMIN)
})

const canCreateRoom = computed(() => {
  return authStore.hasPermission(PERMISSIONS.ROOM_CREATE) || 
         authStore.hasPermission(PERMISSIONS.SYSTEM_ADMIN)
})

// 状态变量
const loading = ref(false)
const rooms = ref([])
const viewMode = ref('list')
const currentPage = ref(1)
const pageSize = ref(10)
const totalRooms = ref(0)

// 过滤表单
const filterForm = reactive({
  status: '',
  memberCount: ''
})

// 统计数据
const stats = reactive({
  totalRooms: 0,
  myRooms: 0,
  activeRooms: 0,
  pendingInvites: 0
})

// ... existing code ...
</script>

<style scoped>
.room-management-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 20px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.filter-section {
  margin-bottom: 20px;
}

.filter-form {
  background-color: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.stats-section {
  margin-bottom: 20px;
}

.stats-card {
  border-radius: 8px;
  overflow: hidden;
}

.stats-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
}

.stats-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 24px;
  color: #fff;
}

.stats-icon.total {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stats-icon.my {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stats-icon.active {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stats-icon.pending {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stats-info {
  flex: 1;
}

.stats-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  line-height: 1;
}

.stats-label {
  font-size: 14px;
  color: #909399;
  margin-top: 5px;
}

.rooms-section {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.list-view {
  margin-bottom: 20px;
}

.card-view {
  margin-bottom: 20px;
}

.room-card {
  margin-bottom: 20px;
  height: 100%;
  transition: transform 0.3s;
}

.room-card:hover {
  transform: translateY(-5px);
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.room-name {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.room-description {
  color: #606266;
  font-size: 14px;
  margin-bottom: 15px;
  height: 40px;
  overflow: hidden;
}

.room-meta {
  margin-bottom: 15px;
}

.meta-item {
  display: flex;
  align-items: center;
  margin-bottom: 5px;
  color: #909399;
  font-size: 12px;
}

.meta-item .el-icon {
  margin-right: 5px;
}

.room-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* 无权限访问样式 */
.no-permission-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 70vh;
  background-color: #f5f7fa;
}

.no-permission-content {
  text-align: center;
  padding: 40px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  max-width: 400px;
}

.lock-icon {
  font-size: 64px;
  color: #e6a23c;
  margin-bottom: 20px;
}

.no-permission-title {
  margin: 0 0 10px 0;
  font-size: 22px;
  color: #303133;
}

.no-permission-desc {
  margin: 0 0 20px 0;
  color: #606266;
  font-size: 14px;
}
</style>