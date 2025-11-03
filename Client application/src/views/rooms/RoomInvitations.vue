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
    // 模拟API调用
    console.log('模拟加载收到的邀请API调用')
    
    // 模拟API响应延迟
    await new Promise(resolve => setTimeout(resolve, 600))
    
    // 模拟收到的邀请数据
    const mockInvitations = [
      {
        id: 'inv-1',
        roomId: 'room-1',
        roomName: '东区3号楼201室',
        roomDescription: '我们是一个充满活力的寝室，欢迎大家加入！',
        inviterId: 'user-1',
        inviterName: '张三',
        inviteeId: currentUserId.value,
        status: 'pending',
        createdAt: '2023-11-15T10:30:00Z'
      },
      {
        id: 'inv-2',
        roomId: 'room-3',
        roomName: '南区2号楼105室',
        roomDescription: '娱乐学习两不误，欢迎大家！',
        inviterId: 'user-3',
        inviterName: '王五',
        inviteeId: currentUserId.value,
        status: 'accepted',
        createdAt: '2023-11-10T14:20:00Z'
      }
    ]
    
    receivedInvitations.value = mockInvitations
  } catch (error) {
    console.error('加载收到的邀请失败:', error)
  }
}

/**
 * 加载发送的邀请
 */
const loadSentInvitations = async () => {
  try {
    // 模拟API调用
    console.log('模拟加载发送的邀请API调用')
    
    // 模拟API响应延迟
    await new Promise(resolve => setTimeout(resolve, 600))
    
    // 模拟发送的邀请数据
    const mockInvitations = [
      {
        id: 'inv-3',
        roomId: 'room-1',
        roomName: '东区3号楼201室',
        roomDescription: '我们是一个充满活力的寝室，欢迎大家加入！',
        inviterId: currentUserId.value,
        inviterName: '我',
        inviteeId: 'user-4',
        inviteeName: '赵六',
        status: 'pending',
        createdAt: '2023-11-12T09:15:00Z'
      },
      {
        id: 'inv-4',
        roomId: 'room-1',
        roomName: '东区3号楼201室',
        roomDescription: '我们是一个充满活力的寝室，欢迎大家加入！',
        inviterId: currentUserId.value,
        inviterName: '我',
        inviteeId: 'user-5',
        inviteeName: '钱七',
        status: 'rejected',
        createdAt: '2023-11-08T16:30:00Z'
      }
    ]
    
    sentInvitations.value = mockInvitations
  } catch (error) {
    console.error('加载发送的邀请失败:', error)
  }
}

/**
 * 加载加入申请
 */
const loadApplications = async () => {
  try {
    // 模拟API调用
    console.log('模拟加载加入申请API调用')
    
    // 模拟API响应延迟
    await new Promise(resolve => setTimeout(resolve, 600))
    
    // 模拟加入申请数据
    const mockApplications = [
      {
        id: 'app-1',
        roomId: 'room-1',
        roomName: '东区3号楼201室',
        roomDescription: '我们是一个充满活力的寝室，欢迎大家加入！',
        applicantId: 'user-6',
        applicantName: '孙八',
        status: 'pending',
        canManage: true,
        createdAt: '2023-11-14T11:45:00Z'
      },
      {
        id: 'app-2',
        roomId: 'room-2',
        roomName: '西区5号楼302室',
        roomDescription: '学习氛围浓厚，共同进步！',
        applicantId: currentUserId.value,
        applicantName: '我',
        status: 'rejected',
        canManage: false,
        createdAt: '2023-11-05T13:20:00Z'
      }
    ]
    
    applications.value = mockApplications
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
    // 模拟API调用
    console.log('模拟接受邀请API调用:', { invitationId: invitation.id })
    
    // 模拟API响应延迟
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // 更新本地状态
    const index = receivedInvitations.value.findIndex(inv => inv.id === invitation.id)
    if (index !== -1) {
      receivedInvitations.value[index].status = 'accepted'
    }
    
    ElMessage.success('已接受邀请')
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
    // 模拟API调用
    console.log('模拟拒绝邀请API调用:', { invitationId: invitation.id })
    
    // 模拟API响应延迟
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // 更新本地状态
    const index = receivedInvitations.value.findIndex(inv => inv.id === invitation.id)
    if (index !== -1) {
      receivedInvitations.value[index].status = 'rejected'
    }
    
    ElMessage.success('已拒绝邀请')
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
    
    // 模拟API调用
    console.log('模拟取消邀请API调用:', { invitationId: invitation.id })
    
    // 模拟API响应延迟
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // 更新本地状态
    const index = sentInvitations.value.findIndex(inv => inv.id === invitation.id)
    if (index !== -1) {
      sentInvitations.value[index].status = 'cancelled'
    }
    
    ElMessage.success('已取消邀请')
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
    // 模拟API调用
    console.log('模拟重新发送邀请API调用:', { invitationId: invitation.id })
    
    // 模拟API响应延迟
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // 更新本地状态
    const index = sentInvitations.value.findIndex(inv => inv.id === invitation.id)
    if (index !== -1) {
      sentInvitations.value[index].status = 'pending'
      sentInvitations.value[index].createdAt = new Date().toISOString()
    }
    
    ElMessage.success('邀请已重新发送')
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
    // 模拟API调用
    console.log('模拟批准申请API调用:', { applicationId: application.id })
    
    // 模拟API响应延迟
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // 更新本地状态
    const index = applications.value.findIndex(app => app.id === application.id)
    if (index !== -1) {
      applications.value[index].status = 'accepted'
    }
    
    ElMessage.success('申请已批准')
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
    // 模拟API调用
    console.log('模拟拒绝申请API调用:', { applicationId: application.id })
    
    // 模拟API响应延迟
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // 更新本地状态
    const index = applications.value.findIndex(app => app.id === application.id)
    if (index !== -1) {
      applications.value[index].status = 'rejected'
    }
    
    ElMessage.success('申请已拒绝')
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
    // 模拟API调用
    console.log('模拟重新申请API调用:', { applicationId: application.id })
    
    // 模拟API响应延迟
    await new Promise(resolve => setTimeout(resolve, 800))
    
    // 更新本地状态
    const index = applications.value.findIndex(app => app.id === application.id)
    if (index !== -1) {
      applications.value[index].status = 'pending'
      applications.value[index].createdAt = new Date().toISOString()
    }
    
    ElMessage.success('申请已重新提交')
  } catch (error) {
    console.error('重新申请失败:', error)
    ElMessage.error('重新申请失败')
  }
}

/**
 * 进入房间
 */
const enterRoom = async (roomId) => {
  try {
    // 模拟API调用
    console.log('模拟进入房间API调用:', { roomId })
    
    // 模拟API响应延迟
    await new Promise(resolve => setTimeout(resolve, 800))
    
    ElMessage.success('正在进入房间...')
    router.push(`/rooms/${roomId}`)
  } catch (error) {
    console.error('进入房间失败:', error)
    ElMessage.error('进入房间失败')
  }
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