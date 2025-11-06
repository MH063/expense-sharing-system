<template>
  <div class="room-invitations">
    <div class="page-header">
      <h1>房间邀请</h1>
      <el-button type="primary" @click="refreshData">
        <el-icon><Refresh /></el-icon>
        刷新
      </el-button>
    </div>

    <!-- 邀请码操作区：生成邀请码 / 输入邀请码加入房间 -->
    <div class="invite-code-toolbar">
      <el-card shadow="hover" class="toolbar-card">
        <template #header>
          <div class="toolbar-header">
            <span>生成邀请码</span>
          </div>
        </template>
        <div class="toolbar-row">
          <el-select v-model="generateForm.roomId" placeholder="选择房间" style="min-width: 220px" @visible-change="loadMyRoomsList">
            <el-option v-for="room in myRooms" :key="room.id" :label="room.name || room.roomName" :value="room.id" />
          </el-select>
          <el-input-number v-model="generateForm.maxUses" :min="1" :max="100" :step="1" placeholder="最大使用次数" />
          <el-date-picker v-model="generateForm.expiresAt" type="datetime" placeholder="过期时间(可选)" />
          <el-button type="primary" @click="handleGenerateInviteCode" :disabled="!generateForm.roomId">生成</el-button>
        </div>
      </el-card>

      <el-card shadow="hover" class="toolbar-card">
        <template #header>
          <div class="toolbar-header">
            <span>使用邀请码加入房间</span>
          </div>
        </template>
        <div class="toolbar-row">
          <el-input v-model="joinCode" placeholder="输入邀请码" style="min-width: 260px" />
          <el-button @click="handleVerifyCode" :disabled="!joinCode">校验</el-button>
          <el-button type="success" @click="handleUseCode" :disabled="!joinCode">加入</el-button>
        </div>
      </el-card>
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
              <div class="invite-code-row" v-if="invitation.code">
                <el-input v-model="invitation.code" readonly style="max-width: 320px" />
                <el-tooltip :visible="invitation._copiedVisible" placement="top" effect="light" manual>
                  <template #content>复制成功</template>
                  <el-button size="small" @click="copyInviteCode(invitation)">复制邀请码</el-button>
                </el-tooltip>
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
import { inviteCodesApi } from '@/api/invite-codes'
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

// 邀请码操作区状态
const myRooms = ref([])
const generateForm = reactive({ roomId: '', maxUses: 1, expiresAt: '' })
const joinCode = ref('')

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
    const resp = await roomsApi.getUserInvitations()
    if (resp && resp.success) {
      receivedInvitations.value = resp.data || []
    }
  } catch (error) {
    console.error('加载收到的邀请失败:', error)
    ElMessage.error('加载收到的邀请失败')
  }
}

/**
 * 加载发送的邀请
 */
const loadSentInvitations = async () => {
  try {
    const resp = await inviteCodesApi.getInviteCodes()
    if (resp && resp.success) {
      sentInvitations.value = resp.data || []
    }
  } catch (error) {
    console.error('加载发送的邀请失败:', error)
    ElMessage.error('加载发送的邀请失败')
  }
}

/**
 * 加载加入申请
 */
const loadApplications = async () => {
  try {
    // 由于没有直接的API获取加入申请，这里暂时使用空数组
    // 实际项目中应该添加获取房间加入申请的API
    applications.value = []
  } catch (error) {
    console.error('加载加入申请失败:', error)
    ElMessage.error('加载加入申请失败')
  }
}

/**
 * 刷新数据
 */
const refreshData = () => {
  loadInvitationsData()
}

// 加载我的房间列表（用于生成邀请码房间选择器）
const loadMyRoomsList = async () => {
  try {
    const resp = await roomsApi.getUserRooms()
    if (resp && resp.success) {
      myRooms.value = resp.data || []
      if (!generateForm.roomId && myRooms.value.length > 0) {
        generateForm.roomId = myRooms.value[0].id
      }
    }
  } catch (e) {
    console.error('加载我的房间列表失败', e)
  }
}

// 生成邀请码
const handleGenerateInviteCode = async () => {
  try {
    if (!generateForm.roomId) return
    const payload = {
      roomId: generateForm.roomId,
      maxUses: generateForm.maxUses || 1,
      expiresAt: generateForm.expiresAt || undefined
    }
    const resp = await inviteCodesApi.generateInviteCode(payload)
    if (resp && resp.success) {
      ElMessage.success('邀请码生成成功')
      // 刷新发送的邀请列表以显示新的邀请码
      await loadSentInvitations()
    } else {
      throw new Error(resp?.message || '生成邀请码失败')
    }
  } catch (error) {
    console.error('生成邀请码失败', error)
    ElMessage.error('生成邀请码失败')
  }
}

// 校验邀请码
const handleVerifyCode = async () => {
  try {
    const resp = await inviteCodesApi.verifyInviteCode(joinCode.value)
    if (resp && resp.success) {
      ElMessage.success('邀请码有效')
    } else {
      throw new Error(resp?.message || '邀请码无效')
    }
  } catch (error) {
    console.error('校验邀请码失败', error)
    ElMessage.error('校验邀请码失败')
  }
}

// 使用邀请码加入房间
const handleUseCode = async () => {
  try {
    const resp = await inviteCodesApi.useInviteCode(joinCode.value)
    if (resp && resp.success) {
      ElMessage.success('加入房间成功')
      joinCode.value = ''
      // 加入成功后可刷新房间列表或跳转房间页
      // 这里刷新“收到的邀请”和“发送的邀请”以保持页面一致
      await loadInvitationsData()
    } else {
      throw new Error(resp?.message || '加入房间失败')
    }
  } catch (error) {
    console.error('使用邀请码加入房间失败', error)
    ElMessage.error('加入房间失败')
  }
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
    const resp = await roomsApi.acceptInvitation(invitation.id)
    if (resp && resp.success) {
      // 更新本地状态
      const index = receivedInvitations.value.findIndex(inv => inv.id === invitation.id)
      if (index !== -1) {
        receivedInvitations.value[index].status = 'accepted'
      }
      ElMessage.success('已接受邀请')
    } else {
      throw new Error(resp?.message || '接受邀请失败')
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
    const resp = await roomsApi.rejectInvitation(invitation.id)
    if (resp && resp.success) {
      // 更新本地状态
      const index = receivedInvitations.value.findIndex(inv => inv.id === invitation.id)
      if (index !== -1) {
        receivedInvitations.value[index].status = 'rejected'
      }
      ElMessage.success('已拒绝邀请')
    } else {
      throw new Error(resp?.message || '拒绝邀请失败')
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
    const resp = await inviteCodesApi.revokeInviteCode(invitation.id)
    if (resp && resp.success) {
      const index = sentInvitations.value.findIndex(inv => inv.id === invitation.id)
      if (index !== -1) {
        sentInvitations.value[index].status = 'cancelled'
      }
      ElMessage.success('已取消邀请')
    } else {
      throw new Error(resp?.message || '撤销邀请码失败')
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
    // 重新生成一个邀请码以模拟“重新发送”的效果（保持真实接口调用，不使用模拟）
    const resp = await inviteCodesApi.generateInviteCode({ roomId: invitation.roomId, maxUses: 1 })
    if (resp && resp.success) {
      ElMessage.success('已生成新的邀请码')
      await loadSentInvitations()
    } else {
      throw new Error(resp?.message || '重新发送失败')
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
    // 由于没有直接的API处理加入申请，这里显示提示信息
    // 实际项目中应该添加批准申请的API
    ElMessage.info('批准申请功能暂未实现，请联系管理员处理')
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
    // 由于没有直接的API处理加入申请，这里显示提示信息
    // 实际项目中应该添加拒绝申请的API
    ElMessage.info('拒绝申请功能暂未实现，请联系管理员处理')
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
    // 由于没有直接的API处理加入申请，这里显示提示信息
    // 实际项目中应该添加重新申请的API
    ElMessage.info('重新申请功能暂未实现，请联系管理员处理')
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
    const resp = await roomsApi.getRoomDetail(roomId)
    if (resp && resp.success) {
      ElMessage.success('正在进入房间...')
      router.push(`/rooms/${roomId}`)
    } else {
      throw new Error(resp?.message || '获取房间信息失败')
    }
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
// 复制邀请码到剪贴板
const copyInviteCode = async (invitation) => {
  try {
    const code = invitation?.code
    if (!code) return
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(code)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = code
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    // 轻量气泡提示：手动控制可见性，短暂显示后隐藏
    invitation._copiedVisible = true
    setTimeout(() => { invitation._copiedVisible = false }, 1200)
  } catch (e) {
    console.error('复制失败', e)
    ElMessage.error('复制失败，请手动选择复制')
  }
}

onMounted(() => {
  loadInvitationsData()
  loadMyRoomsList()
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
.invite-code-toolbar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin: 16px 0;
}

.toolbar-card {
  width: 100%;
}

.toolbar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar-row {
  display: flex;
  gap: 12px;
  align-items: center;
}
.invite-code-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 6px 0 12px 0;
}
</style>