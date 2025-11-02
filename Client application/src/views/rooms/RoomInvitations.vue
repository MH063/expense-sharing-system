<template>
  <div class="room-invitations">
    <div class="page-header">
      <h1>房间邀请</h1>
      <el-button type="primary" @click="refreshData">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <el-tabs v-model="activeTab" @tab-click="handleTabClick">
      <el-tab-pane label="收到的邀请" name="received">
        <div class="tab-content">
          <el-empty v-if="receivedInvitations.length === 0" description="暂无收到的邀请" />
          <div v-else class="invitation-list">
            <el-card
              v-for="invitation in receivedInvitations"
              :key="invitation.id"
              class="invitation-card"
              shadow="hover"
            >
              <div class="card-content">
                <div class="invitation-info">
                  <h3>{{ invitation.roomName }}</h3>
                  <p class="invitation-desc">{{ invitation.roomDescription || '暂无描述' }}</p>
                  <div class="invitation-meta">
                    <span class="meta-item">
                      <el-icon><User /></el-icon>
                      邀请人: {{ invitation.inviterName }}
                    </span>
                    <span class="meta-item">
                      <el-icon><Clock /></el-icon>
                      {{ formatDate(invitation.createdAt) }}
                    </span>
                  </div>
                </div>
                <div class="invitation-status">
                  <el-tag :type="getStatusTagType(invitation.status)">
                    {{ getStatusText(invitation.status) }}
                  </el-tag>
                </div>
              </div>
              <div class="card-actions">
                <el-button
                  v-if="invitation.status === 'pending'"
                  type="success"
                  size="small"
                  @click="acceptInvitation(invitation)"
                >
                  接受
                </el-button>
                <el-button
                  v-if="invitation.status === 'pending'"
                  type="danger"
                  size="small"
                  @click="rejectInvitation(invitation)"
                >
                  拒绝
                </el-button>
                <el-button
                  v-if="invitation.status === 'accepted'"
                  type="primary"
                  size="small"
                  @click="goToRoom(invitation.roomId)"
                >
                  进入房间
                </el-button>
              </div>
            </el-card>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="发送的邀请" name="sent">
        <div class="tab-content">
          <el-empty v-if="sentInvitations.length === 0" description="暂无发送的邀请" />
          <div v-else class="invitation-list">
            <el-card
              v-for="invitation in sentInvitations"
              :key="invitation.id"
              class="invitation-card"
              shadow="hover"
            >
              <div class="card-content">
                <div class="invitation-info">
                  <h3>{{ invitation.roomName }}</h3>
                  <p class="invitation-desc">{{ invitation.roomDescription || '暂无描述' }}</p>
                  <div class="invitation-meta">
                    <span class="meta-item">
                      <el-icon><User /></el-icon>
                      邀请对象: {{ invitation.inviteeName }}
                    </span>
                    <span class="meta-item">
                      <el-icon><Clock /></el-icon>
                      {{ formatDate(invitation.createdAt) }}
                    </span>
                  </div>
                </div>
                <div class="invitation-status">
                  <el-tag :type="getStatusTagType(invitation.status)">
                    {{ getStatusText(invitation.status) }}
                  </el-tag>
                </div>
              </div>
              <div class="card-actions">
                <el-button
                  v-if="invitation.status === 'pending'"
                  type="danger"
                  size="small"
                  @click="cancelInvitation(invitation)"
                >
                  取消邀请
                </el-button>
                <el-button
                  v-if="invitation.status === 'rejected'"
                  type="primary"
                  size="small"
                  @click="resendInvitation(invitation)"
                >
                  重新发送
                </el-button>
              </div>
            </el-card>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="加入申请" name="applications">
        <div class="tab-content">
          <el-empty v-if="applications.length === 0" description="暂无加入申请" />
          <div v-else class="invitation-list">
            <el-card
              v-for="application in applications"
              :key="application.id"
              class="invitation-card"
              shadow="hover"
            >
              <div class="card-content">
                <div class="invitation-info">
                  <h3>{{ application.roomName }}</h3>
                  <p class="invitation-desc">{{ application.roomDescription || '暂无描述' }}</p>
                  <div class="invitation-meta">
                    <span class="meta-item">
                      <el-icon><User /></el-icon>
                      申请人: {{ application.applicantName }}
                    </span>
                    <span class="meta-item">
                      <el-icon><Clock /></el-icon>
                      {{ formatDate(application.createdAt) }}
                    </span>
                  </div>
                </div>
                <div class="invitation-status">
                  <el-tag :type="getStatusTagType(application.status)">
                    {{ getStatusText(application.status) }}
                  </el-tag>
                </div>
              </div>
              <div class="card-actions">
                <el-button
                  v-if="application.status === 'pending' && canManageApplication(application)"
                  type="success"
                  size="small"
                  @click="approveApplication(application)"
                >
                  批准
                </el-button>
                <el-button
                  v-if="application.status === 'pending' && canManageApplication(application)"
                  type="danger"
                  size="small"
                  @click="rejectApplication(application)"
                >
                  拒绝
                </el-button>
                <el-button
                  v-if="application.status === 'rejected' && isMyApplication(application)"
                  type="primary"
                  size="small"
                  @click="reapply(application)"
                >
                  重新申请
                </el-button>
              </div>
            </el-card>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, User, Clock } from '@element-plus/icons-vue'
import { roomsApi } from '@/api/rooms'
import { useUserStore } from '@/stores/user'

// 路由
const router = useRouter()

// 状态
const userStore = useUserStore()
const loading = ref(false)
const activeTab = ref('received')
const receivedInvitations = ref([])
const sentInvitations = ref([])
const applications = ref([])

// 计算属性
const currentUserId = computed(() => userStore.userId)

// 方法
/**
 * 加载邀请数据
 */
const loadInvitationsData = async () => {
  loading.value = true
  try {
    if (activeTab.value === 'received') {
      await loadReceivedInvitations()
    } else if (activeTab.value === 'sent') {
      await loadSentInvitations()
    } else if (activeTab.value === 'applications') {
      await loadApplications()
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

/**
 * 加载收到的邀请
 */
const loadReceivedInvitations = async () => {
  try {
    const response = await roomsApi.getRoomInvitations()
    if (response.success) {
      receivedInvitations.value = response.data || []
    }
  } catch (error) {
    console.error('加载收到的邀请失败:', error)
  }
}

/**
 * 加载发送的邀请
 */
const loadSentInvitations = async () => {
  try {
    // const response = await roomsApi.getRoomInvitations()
    if (response.success) {
      sentInvitations.value = response.data || []
    }
  } catch (error) {
    console.error('加载发送的邀请失败:', error)
  }
}

/**
 * 加载加入申请
 */
const loadApplications = async () => {
  try {
    // const response = await roomsApi.getRoomApplications()
    if (response.success) {
      applications.value = response.data || []
    }
  } catch (error) {
    console.error('加载加入申请失败:', error)
  }
}

/**
 * 刷新数据
 */
const refreshData = () => {
  loadInvitationsData()
}

/**
 * 处理标签页点击
 */
const handleTabClick = () => {
  loadInvitationsData()
}

/**
 * 接受邀请
 */
const acceptInvitation = async (invitation) => {
  try {
    const response = await roomsApi.acceptRoomInvitation(invitation.id)
    if (response.success) {
      ElMessage.success('已接受邀请')
      loadReceivedInvitations()
    } else {
      ElMessage.error('接受邀请失败')
    }
  } catch (error) {
    console.error('接受邀请失败:', error)
    ElMessage.error('接受邀请失败')
  }
}

/**
 * 拒绝邀请
 */
const rejectInvitation = async (invitation) => {
  try {
    const response = await roomsApi.rejectRoomInvitation(invitation.id)
    if (response.success) {
      ElMessage.success('已拒绝邀请')
      loadReceivedInvitations()
    } else {
      ElMessage.error('拒绝邀请失败')
    }
  } catch (error) {
    console.error('拒绝邀请失败:', error)
    ElMessage.error('拒绝邀请失败')
  }
}

/**
 * 取消邀请
 */
const cancelInvitation = async (invitation) => {
  try {
    await ElMessageBox.confirm('确定要取消此邀请吗？', '确认取消', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const response = await roomsApi.cancelRoomInvitation(invitation.id)
    if (response.success) {
      ElMessage.success('已取消邀请')
      loadSentInvitations()
    } else {
      ElMessage.error('取消邀请失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消邀请失败:', error)
      ElMessage.error('取消邀请失败')
    }
  }
}

/**
 * 重新发送邀请
 */
const resendInvitation = async (invitation) => {
  try {
    const response = await roomsApi.resendInvitation(invitation.id)
    if (response.success) {
      ElMessage.success('邀请已重新发送')
      loadSentInvitations()
    } else {
      ElMessage.error('重新发送邀请失败')
    }
  } catch (error) {
    console.error('重新发送邀请失败:', error)
    ElMessage.error('重新发送邀请失败')
  }
}

/**
 * 批准申请
 */
const approveApplication = async (application) => {
  try {
    // const response = await roomsApi.acceptRoomInvitation(application.id)
    if (response.success) {
      ElMessage.success('申请已批准')
      loadApplications()
    } else {
      ElMessage.error('批准申请失败')
    }
  } catch (error) {
    console.error('批准申请失败:', error)
    ElMessage.error('批准申请失败')
  }
}

/**
 * 拒绝申请
 */
const rejectApplication = async (application) => {
  try {
    // const response = await roomsApi.rejectRoomInvitation(application.id)
    if (response.success) {
      ElMessage.success('申请已拒绝')
      loadApplications()
    } else {
      ElMessage.error('拒绝申请失败')
    }
  } catch (error) {
    console.error('拒绝申请失败:', error)
    ElMessage.error('拒绝申请失败')
  }
}

/**
 * 重新申请
 */
const reapply = async (application) => {
  try {
    // const response = await roomsApi.joinRoom(application.roomId)
    if (response.success) {
      ElMessage.success('申请已重新提交')
      loadApplications()
    } else {
      ElMessage.error('重新申请失败')
    }
  } catch (error) {
    console.error('重新申请失败:', error)
    ElMessage.error('重新申请失败')
  }
}

/**
 * 进入房间
 */
const goToRoom = (roomId) => {
  router.push(`/rooms/${roomId}`)
}

/**
 * 判断是否可以管理申请
 */
const canManageApplication = (application) => {
  // 这里需要根据实际业务逻辑判断
  // 例如：只有房间创建者或管理员可以批准申请
  // 假设从API返回的数据中包含一个 canManage 字段
  return application.canManage || false
}

/**
 * 判断是否是我的申请
 */
const isMyApplication = (application) => {
  return application.applicantId === currentUserId.value
}

/**
 * 格式化日期
 */
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

/**
 * 获取状态标签类型
 */
const getStatusTagType = (status) => {
  const statusMap = {
    pending: 'warning',
    accepted: 'success',
    rejected: 'danger',
    cancelled: 'info'
  }
  return statusMap[status] || 'info'
}

/**
 * 获取状态文本
 */
const getStatusText = (status) => {
  const statusMap = {
    pending: '待处理',
    accepted: '已接受',
    rejected: '已拒绝',
    cancelled: '已取消'
  }
  return statusMap[status] || '未知'
}

// 生命周期
onMounted(() => {
  loadInvitationsData()
})
</script>

<style scoped>
.room-invitations {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.tab-content {
  padding: 20px 0;
}

.invitation-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.invitation-card {
  margin-bottom: 15px;
}

.card-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.invitation-info {
  flex: 1;
}

.invitation-info h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  color: #303133;
}

.invitation-desc {
  margin: 0 0 10px 0;
  color: #606266;
  font-size: 14px;
}

.invitation-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #909399;
  font-size: 13px;
}

.invitation-status {
  margin-left: 15px;
}

.card-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}
</style>