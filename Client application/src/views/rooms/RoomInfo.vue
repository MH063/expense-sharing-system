<template>
  <div class="room-container" v-if="canViewRoom">
    <div class="room-header">
      <h1 class="page-title">寝室信息</h1>
      <p class="page-subtitle">查看和管理寝室详细信息</p>
    </div>
    
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载寝室信息中...</p>
    </div>
    
    <div v-else-if="!room" class="empty-state">
      <div class="empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </div>
      <h2>您还没有加入任何寝室</h2>
      <p>加入或创建一个寝室开始使用记账系统</p>
      <div class="empty-actions">
        <button class="primary-button" @click="createRoom" v-if="canEditRoom">创建寝室</button>
        <button class="secondary-button" @click="joinRoom" v-if="canViewRoom">加入寝室</button>
      </div>
    </div>
    
    <div v-else class="room-content">
      <div class="room-card">
        <div class="room-info">
          <div class="room-avatar">
            <img :src="room.avatar || defaultRoomAvatar" alt="寝室头像" />
          </div>
          <div class="room-details">
            <h2 class="room-name">{{ room.name }}</h2>
            <p class="room-description">{{ room.description || '暂无描述' }}</p>
            <div class="room-meta">
              <div class="meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
                <span>{{ room.location || '未知地点' }}</span>
              </div>
              <div class="meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
                <span>{{ memberCount }} 位成员</span>
              </div>
              <div class="meta-item">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>创建于 {{ formatDate(room.createdAt) }}</span>
              </div>
            </div>
          </div>
          <div class="room-actions">
            <button class="edit-button" @click="editRoom" v-if="canEditRoom">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              编辑
            </button>
            <button class="invite-button" @click="showInviteModal = true" v-if="canManageMembers">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
              邀请成员
            </button>
            <button class="leave-button" @click="confirmLeaveRoom" v-if="canViewRoom">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              退出寝室
            </button>
          </div>
        </div>
      </div>
      
      <div class="room-sections">
        <div class="section-tabs">
          <button
            class="tab-button"
            :class="{ active: activeTab === 'members' }"
            @click="activeTab = 'members'"
          >
            成员管理
          </button>
          <button
            class="tab-button"
            :class="{ active: activeTab === 'statistics' }"
            @click="activeTab = 'statistics'"
          >
            费用统计
          </button>
          <button
            class="tab-button"
            :class="{ active: activeTab === 'settings' }"
            @click="activeTab = 'settings'"
            v-if="canEditRoom"
          >
            寝室设置
          </button>
        </div>
        
        <div class="tab-content">
          <!-- 成员管理标签页 -->
          <div v-if="activeTab === 'members'" class="tab-pane">
            <div class="members-header">
              <h3>成员列表</h3>
              <button v-if="canManageMembers" class="add-member-button" @click="showInviteModal = true">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                添加成员
              </button>
            </div>
            
            <div v-if="members.length === 0" class="empty-state">
              <p>暂无成员</p>
            </div>
            
            <div v-else class="members-list">
              <div v-for="member in members" :key="member.id" class="member-item">
                <div class="member-avatar">
                  <img :src="member.avatar || defaultAvatar" :alt="member.username" />
                </div>
                <div class="member-info">
                  <h4 class="member-name">{{ member.displayName || member.username }}</h4>
                  <p class="member-email">{{ member.email }}</p>
                </div>
                <div class="member-role">
                  <span class="role-badge" :class="member.role">
                    {{ getRoleDisplayName(member.role) }}
                  </span>
                </div>
                <div v-if="canManageMembers && member.id !== currentUserId" class="member-actions">
                  <button v-if="member.role !== 'room_leader' && isRoomLeader" class="promote-button" @click="promoteMember(member)">
                    设为寝室长
                  </button>
                  <button v-if="member.id !== currentUserId && (isRoomLeader || member.role !== 'room_leader')" class="remove-button" @click="confirmRemoveMember(member)">
                    移除
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 费用统计标签页 -->
          <div v-if="activeTab === 'statistics'" class="tab-pane">
            <div class="statistics-overview">
              <div class="stat-card">
                <div class="stat-icon expense">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                </div>
                <div class="stat-info">
                  <h4>总支出</h4>
                  <p class="stat-value">¥{{ totalExpense.toFixed(2) }}</p>
                </div>
              </div>
              
              <div class="stat-card">
                <div class="stat-icon balance">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="2" x2="12" y2="22"></line>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                </div>
                <div class="stat-info">
                  <h4>人均支出</h4>
                  <p class="stat-value">¥{{ averageExpense.toFixed(2) }}</p>
                </div>
              </div>
              
              <div class="stat-card">
                <div class="stat-icon pending">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <div class="stat-info">
                  <h4>待结算</h4>
                  <p class="stat-value">¥{{ pendingAmount.toFixed(2) }}</p>
                </div>
              </div>
            </div>
            
            <div class="expense-chart">
              <h3>月度支出趋势</h3>
              <div class="chart-placeholder">
                <p>图表组件将在后续实现</p>
              </div>
            </div>
            
            <div class="recent-expenses">
              <h3>最近支出</h3>
              <div v-if="recentExpenses.length === 0" class="empty-state">
                <p>暂无支出记录</p>
              </div>
              <div v-else class="expense-list">
                <div v-for="expense in recentExpenses" :key="expense.id" class="expense-item">
                  <div class="expense-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                  </div>
                  <div class="expense-info">
                    <h4>{{ expense.description }}</h4>
                    <p>{{ formatDate(expense.date) }} · {{ expense.payer }}</p>
                  </div>
                  <div class="expense-amount">¥{{ expense.amount.toFixed(2) }}</div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 寝室设置标签页 -->
          <div v-if="activeTab === 'settings'" class="tab-pane">
            <div v-if="!isRoomLeader" class="permission-denied">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <h3>权限不足</h3>
              <p>只有寝室长可以修改寝室设置</p>
            </div>
            
            <div v-else>
              <form @submit.prevent="updateRoomSettings" class="settings-form">
                <div class="form-group">
                  <label for="roomName" class="form-label">寝室名称</label>
                  <input
                    id="roomName"
                    v-model="roomSettings.name"
                    type="text"
                    class="form-input"
                    required
                  />
                </div>
                
                <div class="form-group">
                  <label for="roomDescription" class="form-label">寝室描述</label>
                  <textarea
                    id="roomDescription"
                    v-model="roomSettings.description"
                    class="form-textarea"
                    rows="3"
                    placeholder="介绍一下你们的寝室..."
                  ></textarea>
                </div>
                
                <div class="form-group">
                  <label for="roomLocation" class="form-label">寝室位置</label>
                  <input
                    id="roomLocation"
                    v-model="roomSettings.location"
                    type="text"
                    class="form-input"
                    placeholder="例如：东区3号楼201室"
                  />
                </div>
                
                <div class="form-group">
                  <label for="inviteCode" class="form-label">邀请码</label>
                  <div class="invite-code-container">
                    <input
                      id="inviteCode"
                      :value="room.inviteCode"
                      type="text"
                      class="form-input"
                      readonly
                    />
                    <button type="button" class="copy-button" @click="copyInviteCode">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                      </svg>
                      复制
                    </button>
                    <button type="button" class="refresh-button" @click="regenerateInviteCode">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                      </svg>
                      刷新
                    </button>
                  </div>
                </div>
                
                <div class="form-actions">
                  <button type="submit" class="save-button" :disabled="isSaving">
                    <span v-if="!isSaving">保存设置</span>
                    <span v-else class="loading-spinner"></span>
                  </button>
                </div>
              </form>
              
              <div class="danger-zone" v-if="canDeleteRoom">
                <h3>危险区域</h3>
                <p>以下操作不可逆，请谨慎操作</p>
                <button class="delete-button" @click="confirmDeleteRoom">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  删除寝室
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 邀请成员弹窗 -->
    <div v-if="showInviteModal" class="modal-overlay" @click="showInviteModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>邀请成员</h3>
          <button class="modal-close" @click="showInviteModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="invite-methods">
            <div class="invite-method">
              <h4>分享邀请码</h4>
              <p>将邀请码发送给朋友，让他们加入寝室</p>
              <div class="invite-code-display">
                <input :value="room.inviteCode" readonly />
                <button @click="copyInviteCode">复制</button>
              </div>
            </div>
            
            <div class="invite-method">
              <h4>生成邀请链接</h4>
              <p>生成专属邀请链接，一键加入寝室</p>
              <div class="invite-link-display">
                <input :value="inviteLink" readonly />
                <button @click="copyInviteLink">复制</button>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-button" @click="showInviteModal = false">关闭</button>
        </div>
      </div>
    </div>
    
    <!-- 成功/错误提示 -->
    <div v-if="successMessage" class="success-banner">
      {{ successMessage }}
    </div>
    
    <div v-if="errorMessage" class="error-banner">
      {{ errorMessage }}
    </div>
  </div>
  
  <!-- 无权限访问提示 -->
  <div v-else class="no-permission-container">
    <div class="no-permission-content">
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="no-permission-icon">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
      <h2 class="no-permission-title">访问受限</h2>
      <p class="no-permission-message">您没有权限查看房间信息</p>
      <button class="back-button" @click="router.push('/')">返回首页</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { PERMISSIONS } from '@/utils/permissions'
import { roomsApi } from '@/api/rooms'

// 路由和状态管理
const router = useRouter()
const authStore = useAuthStore()

// 响应式数据
const loading = ref(true)
const activeTab = ref('members')
const showInviteModal = ref(false)
const isSaving = ref(false)
const successMessage = ref('')
const errorMessage = ref('')

// 默认头像
const defaultAvatar = 'https://picsum.photos/seed/default-avatar/200/200.jpg'
const defaultRoomAvatar = 'https://picsum.photos/seed/default-room/400/300.jpg'

// 寝室信息
const room = ref(null)

// 成员列表
const members = ref([])

// 费用统计
const totalExpense = ref(0)
const averageExpense = ref(0)
const pendingAmount = ref(0)

// 最近支出
const recentExpenses = ref([])

// 寝室设置表单
const roomSettings = reactive({
  name: '',
  description: '',
  location: ''
})

// 计算属性
const memberCount = computed(() => members.value.length)

const isRoomLeader = computed(() => {
  if (!authStore.user || !room.value) return false
  const currentUser = members.value.find(m => m.id === authStore.user.id)
  return currentUser && currentUser.role === 'room_leader'
})

const currentUserId = computed(() => authStore.user?.id)

const inviteLink = computed(() => {
  if (!room.value) return ''
  return `${window.location.origin}/join?code=${room.value.inviteCode}`
})

// 权限控制
const canViewRoom = computed(() => {
  return authStore.hasPermission(PERMISSIONS.ROOM_VIEW) || 
         authStore.hasPermission(PERMISSIONS.ROOM_MANAGE) || 
         authStore.hasPermission(PERMISSIONS.SYSTEM_ADMIN)
})

const canEditRoom = computed(() => {
  return authStore.hasPermission(PERMISSIONS.ROOM_EDIT) || 
         authStore.hasPermission(PERMISSIONS.ROOM_MANAGE) || 
         authStore.hasPermission(PERMISSIONS.SYSTEM_ADMIN)
})

const canManageMembers = computed(() => {
  return authStore.hasPermission(PERMISSIONS.MEMBER_MANAGE) || 
         authStore.hasPermission(PERMISSIONS.ROOM_MANAGE) || 
         authStore.hasPermission(PERMISSIONS.SYSTEM_ADMIN)
})

const canDeleteRoom = computed(() => {
  return authStore.hasPermission(PERMISSIONS.ROOM_DELETE) || 
         authStore.hasPermission(PERMISSIONS.SYSTEM_ADMIN)
})

// 获取角色显示名称
  const getRoleDisplayName = (role) => {
    const roleMap = {
      admin: '管理员',
      sysadmin: '系统管理员',
      room_leader: '寝室长',
      room_owner: '寝室长',
      payer: '缴费人',
      member: '成员'
    }
    return roleMap[role] || '成员'
  }

// 格式化日期
const formatDate = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 加载寝室信息
const loadRoomData = async () => {
  if (!canViewRoom.value) {
    console.warn('用户没有权限查看房间信息')
    return
  }
  
  loading.value = true
  
  try {
    // 获取用户当前寝室信息
    const res = await roomsApi.getCurrentRoom()
    
    // 新风格：使用 res.success / res.payload
    if (res.success && res.payload) {
      room.value = res.payload
      
      // 获取寝室成员
      const membersRes = await roomsApi.getRoomMembers(room.value.id)
      if (membersRes.success) {
        members.value = membersRes.payload || []
      }
      
      // 获取费用统计
      const statsRes = await roomsApi.getRoomStatistics(room.value.id)
      if (statsRes.success) {
        const stats = statsRes.payload
        totalExpense.value = stats?.totalExpense || 0
        averageExpense.value = stats?.averageExpense || 0
        pendingAmount.value = stats?.pendingAmount || 0
      }
      
      // 获取最近支出
      const expensesRes = await roomsApi.getRecentExpenses(room.value.id)
      if (expensesRes.success) {
        recentExpenses.value = expensesRes.payload || []
      }
      
      // 初始化设置表单
      if (room.value) {
        roomSettings.name = room.value.name || ''
        roomSettings.description = room.value.description || ''
        roomSettings.location = room.value.location || ''
      }
    } else {
      throw new Error(response.data.message || '获取寝室信息失败')
    }
    
  } catch (error) {
    console.error('加载寝室数据失败:', error)
    errorMessage.value = '加载寝室数据失败: ' + (error.message || '未知错误')
  } finally {
    loading.value = false
  }
}

// 创建寝室
const createRoom = () => {
  if (!canEditRoom.value) {
    console.warn('用户没有权限创建房间')
    return
  }
  router.push('/rooms/create')
}

// 加入寝室
const joinRoom = () => {
  if (!canViewRoom.value) {
    console.warn('用户没有权限加入房间')
    return
  }
  router.push('/rooms/join')
}

// 编辑寝室
const editRoom = () => {
  if (!canEditRoom.value) {
    console.warn('用户没有权限编辑房间')
    return
  }
  // 切换到设置标签页
  activeTab.value = 'settings'
}

// 确认退出寝室
const confirmLeaveRoom = () => {
  if (!canViewRoom.value) {
    console.warn('用户没有权限退出房间')
    return
  }
  
  if (confirm('确定要退出寝室吗？退出后您将无法查看寝室相关信息。')) {
    leaveRoom()
  }
}

// 退出寝室
const leaveRoom = async () => {
  if (!canViewRoom.value) {
    console.warn('用户没有权限退出房间')
    return
  }
  
  try {
    const res = await roomsApi.leaveRoom(room.value.id)

    if (res.success) {
      successMessage.value = '已成功退出寝室'
      
      // 3秒后跳转到首页
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } else {
      throw new Error(response.data.message || '退出寝室失败')
    }
  } catch (error) {
    console.error('退出寝室失败:', error)
    errorMessage.value = error.message || '退出寝室失败'
  }
}

// 提升成员为寝室长
const promoteMember = async (member) => {
  if (!canManageMembers.value) {
    console.warn('用户没有权限管理成员')
    return
  }
  
  if (!confirm(`确定要将 ${member.displayName || member.username} 设为寝室长吗？`)) return
  
  try {
    const res = await roomsApi.promoteMember(room.value.id, member.id)

    if (res.success) {
      // 更新本地状态
      const currentUser = members.value.find(m => m.id === currentUserId.value)
      const promotedMember = members.value.find(m => m.id === member.id)
      
      if (currentUser) currentUser.role = 'member'
      if (promotedMember) promotedMember.role = 'room_leader'
      
      successMessage.value = '已成功设置寝室长'
      
      // 3秒后隐藏成功消息
      setTimeout(() => {
        successMessage.value = ''
      }, 3000)
    } else {
      throw new Error(response.data.message || '设置寝室长失败')
    }
  } catch (error) {
    console.error('设置寝室长失败:', error)
    errorMessage.value = error.message || '设置寝室长失败'
  }
}

// 确认移除成员
const confirmRemoveMember = (member) => {
  if (!canManageMembers.value) {
    console.warn('用户没有权限管理成员')
    return
  }
  
  if (confirm(`确定要将 ${member.displayName || member.username} 移出寝室吗？`)) {
    removeMember(member)
  }
}

// 移除成员
const removeMember = async (member) => {
  if (!canManageMembers.value) {
    console.warn('用户没有权限管理成员')
    return
  }
  
  try {
    const res = await roomsApi.removeMember(room.value.id, member.id)

    if (res.success) {
      // 更新本地状态
      members.value = members.value.filter(m => m.id !== member.id)
      
      successMessage.value = '已成功移除成员'
      
      // 3秒后隐藏成功消息
      setTimeout(() => {
        successMessage.value = ''
      }, 3000)
    } else {
      throw new Error(response.data.message || '移除成员失败')
    }
  } catch (error) {
    console.error('移除成员失败:', error)
    errorMessage.value = error.message || '移除成员失败'
  }
}

// 更新寝室设置
const updateRoomSettings = async () => {
  if (!canEditRoom.value) {
    console.warn('用户没有权限编辑房间')
    return
  }
  
  isSaving.value = true
  errorMessage.value = ''
  
  try {
    const res = await roomsApi.updateRoomSettings(room.value.id, roomSettings)

    if (res.success) {
      // 更新本地状态
      room.value.name = roomSettings.name
      room.value.description = roomSettings.description
      room.value.location = roomSettings.location
      
      successMessage.value = '寝室设置已更新'
      
      // 3秒后隐藏成功消息
      setTimeout(() => {
        successMessage.value = ''
      }, 3000)
    } else {
      throw new Error(response.data.message || '更新寝室设置失败')
    }
  } catch (error) {
    console.error('更新寝室设置失败:', error)
    errorMessage.value = error.message || '更新寝室设置失败'
  } finally {
    isSaving.value = false
  }
}

// 复制邀请码
const copyInviteCode = async () => {
  if (!canManageMembers.value) {
    console.warn('用户没有权限管理成员')
    return
  }
  
  try {
    await navigator.clipboard.writeText(room.value.inviteCode)
    successMessage.value = '邀请码已复制到剪贴板'
    
    // 3秒后隐藏成功消息
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error) {
    console.error('复制邀请码失败:', error)
    errorMessage.value = '复制邀请码失败'
  }
}

// 复制邀请链接
const copyInviteLink = async () => {
  if (!canManageMembers.value) {
    console.warn('用户没有权限管理成员')
    return
  }
  
  try {
    await navigator.clipboard.writeText(inviteLink.value)
    successMessage.value = '邀请链接已复制到剪贴板'
    
    // 3秒后隐藏成功消息
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error) {
    console.error('复制邀请链接失败:', error)
    errorMessage.value = '复制邀请链接失败'
  }
}

// 重新生成邀请码
const regenerateInviteCode = async () => {
  if (!canManageMembers.value) {
    console.warn('用户没有权限管理成员')
    return
  }
  
  if (!confirm('确定要重新生成邀请码吗？旧邀请码将失效。')) return
  
  try {
    const res = await roomsApi.regenerateInviteCode(room.value.id)

    if (res.success && res.payload) {
      room.value.inviteCode = res.payload.inviteCode
      
      successMessage.value = '邀请码已重新生成'
      
      // 3秒后隐藏成功消息
      setTimeout(() => {
        successMessage.value = ''
      }, 3000)
    } else {
      throw new Error(response.data.message || '重新生成邀请码失败')
    }
  } catch (error) {
    console.error('重新生成邀请码失败:', error)
    errorMessage.value = error.message || '重新生成邀请码失败'
  }
}

// 确认删除寝室
const confirmDeleteRoom = () => {
  if (!canDeleteRoom.value) {
    console.warn('用户没有权限删除房间')
    return
  }
  
  const confirmation = prompt('此操作不可逆！请输入 "DELETE" 确认删除寝室：')
  if (confirmation === 'DELETE') {
    deleteRoom()
  } else if (confirmation !== null) {
    errorMessage.value = '输入不正确，寝室未被删除'
  }
}

// 删除寝室
const deleteRoom = async () => {
  if (!canDeleteRoom.value) {
    console.warn('用户没有权限删除房间')
    return
  }
  
  try {
    const res = await roomsApi.deleteRoom(room.value.id)

    if (res.success) {
      successMessage.value = '寝室已删除'
      
      // 3秒后跳转到首页
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } else {
      throw new Error(response.data.message || '删除寝室失败')
    }
  } catch (error) {
    console.error('删除寝室失败:', error)
    errorMessage.value = error.message || '删除寝室失败'
  }
}

// 组件挂载时加载数据
onMounted(() => {
  if (canViewRoom.value) {
    loadRoomData()
  } else {
    console.warn('用户没有权限查看房间信息')
  }
})
</script>

<style scoped>
.room-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.room-header {
  margin-bottom: 30px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px;
}

.page-subtitle {
  font-size: 16px;
  color: #666;
  margin: 0;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(106, 17, 203, 0.1);
  border-radius: 50%;
  border-top-color: #6a11cb;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #666;
}

.empty-icon {
  color: #ccc;
  margin-bottom: 16px;
}

.empty-state h2 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px;
  color: #333;
}

.empty-state p {
  font-size: 16px;
  margin: 0 0 24px;
  max-width: 400px;
}

.empty-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.primary-button, .secondary-button {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.primary-button {
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  color: white;
  border: none;
}

.primary-button:hover {
  opacity: 0.9;
}

.secondary-button {
  background-color: white;
  color: #6a11cb;
  border: 1px solid #6a11cb;
}

.secondary-button:hover {
  background-color: #f5f7ff;
}

.room-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.room-card {
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.room-info {
  display: flex;
  padding: 24px;
  gap: 20px;
}

.room-avatar {
  flex-shrink: 0;
  width: 120px;
  height: 120px;
  border-radius: 10px;
  overflow: hidden;
}

.room-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.room-details {
  flex: 1;
}

.room-name {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px;
}

.room-description {
  font-size: 16px;
  color: #666;
  margin: 0 0 16px;
  line-height: 1.5;
}

.room-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #666;
}

.meta-item svg {
  color: #999;
}

.room-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.edit-button, .invite-button, .leave-button {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
  white-space: nowrap;
}

.edit-button {
  background-color: #f5f5f5;
  color: #333;
}

.edit-button:hover {
  background-color: #e0e0e0;
}

.invite-button {
  background-color: #e3f2fd;
  color: #1976d2;
}

.invite-button:hover {
  background-color: #bbdefb;
}

.leave-button {
  background-color: #ffebee;
  color: #d32f2f;
}

.leave-button:hover {
  background-color: #ffcdd2;
}

.room-sections {
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.section-tabs {
  display: flex;
  border-bottom: 1px solid #eee;
}

.tab-button {
  flex: 1;
  padding: 16px;
  background: none;
  border: none;
  font-size: 16px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: color 0.3s, background-color 0.3s;
  position: relative;
}

.tab-button:hover {
  color: #333;
}

.tab-button.active {
  color: #6a11cb;
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #6a11cb;
}

.tab-content {
  padding: 24px;
}

.tab-pane {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.members-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.members-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.add-member-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background-color: #6a11cb;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.3s;
}

.add-member-button:hover {
  opacity: 0.9;
}

.members-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.member-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 1px solid #eee;
  border-radius: 8px;
}

.member-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 16px;
}

.member-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.member-info {
  flex: 1;
}

.member-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin: 0 0 4px;
}

.member-email {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.member-role {
  margin-right: 16px;
}

.role-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.role-badge.admin {
  background-color: #e3f2fd;
  color: #1976d2;
}

.role-badge.room_leader {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.role-badge.member {
  background-color: #e8f5e9;
  color: #388e3c;
}

.member-actions {
  display: flex;
  gap: 8px;
}

.promote-button, .remove-button {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
}

.promote-button {
  background-color: #e3f2fd;
  color: #1976d2;
}

.promote-button:hover {
  background-color: #bbdefb;
}

.remove-button {
  background-color: #ffebee;
  color: #d32f2f;
}

.remove-button:hover {
  background-color: #ffcdd2;
}

.statistics-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon.expense {
  background-color: #e3f2fd;
  color: #1976d2;
}

.stat-icon.balance {
  background-color: #e8f5e9;
  color: #388e3c;
}

.stat-icon.pending {
  background-color: #fff3e0;
  color: #f57c00;
}

.stat-info h4 {
  font-size: 14px;
  font-weight: 500;
  color: #666;
  margin: 0 0 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.expense-chart {
  margin-bottom: 32px;
}

.expense-chart h3 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px;
}

.chart-placeholder {
  height: 300px;
  border: 1px dashed #ddd;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}

.recent-expenses h3 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px;
}

.expense-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.expense-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 8px;
}

.expense-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  color: #666;
}

.expense-info {
  flex: 1;
}

.expense-info h4 {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin: 0 0 4px;
}

.expense-info p {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.expense-amount {
  font-size: 16px;
  font-weight: 600;
  color: #d32f2f;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-bottom: 40px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.form-input, .form-textarea {
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.form-input:focus, .form-textarea:focus {
  outline: none;
  border-color: #6a11cb;
  box-shadow: 0 0 0 3px rgba(106, 17, 203, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.invite-code-container {
  display: flex;
  gap: 8px;
}

.copy-button, .refresh-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background-color: white;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.copy-button:hover, .refresh-button:hover {
  background-color: #f5f5f5;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.save-button {
  padding: 12px 24px;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.3s;
}

.save-button:hover:not(:disabled) {
  opacity: 0.9;
}

.save-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.danger-zone {
  padding: 20px;
  border: 1px solid #ffebee;
  border-radius: 8px;
  background-color: #fffafafa;
}

.danger-zone h3 {
  font-size: 18px;
  font-weight: 600;
  color: #d32f2f;
  margin: 0 0 8px;
}

.danger-zone p {
  font-size: 14px;
  color: #666;
  margin: 0 0 16px;
}

.delete-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background-color: #d32f2f;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.3s;
}

.delete-button:hover {
  opacity: 0.9;
}

.permission-denied {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #666;
}

.permission-denied svg {
  color: #ccc;
  margin-bottom: 16px;
}

.permission-denied h3 {
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px;
  color: #333;
}

.permission-denied p {
  font-size: 16px;
  margin: 0;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 10px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

.invite-methods {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.invite-method h4 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px;
}

.invite-method p {
  font-size: 14px;
  color: #666;
  margin: 0 0 12px;
}

.invite-code-display, .invite-link-display {
  display: flex;
  gap: 8px;
}

.invite-code-display input, .invite-link-display input {
  flex: 1;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.invite-code-display button, .invite-link-display button {
  padding: 10px 16px;
  background-color: #6a11cb;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.3s;
}

.invite-code-display button:hover, .invite-link-display button:hover {
  opacity: 0.9;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  padding: 20px;
  border-top: 1px solid #eee;
}

.cancel-button {
  padding: 10px 20px;
  background-color: #f5f5f5;
  color: #333;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
}

.cancel-button:hover {
  background-color: #e0e0e0;
}

.success-banner, .error-banner {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 16px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  z-index: 1000;
  max-width: 400px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.success-banner {
  background-color: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #c8e6c9;
}

.error-banner {
  background-color: #fdecea;
  color: #d32f2f;
  border: 1px solid #f5c6cb;
}

/* 无权限访问样式 */
.no-permission-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.no-permission-content {
  text-align: center;
  padding: 40px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  max-width: 400px;
}

.no-permission-icon {
  color: #ccc;
  margin-bottom: 20px;
}

.no-permission-title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0 0 12px;
}

.no-permission-message {
  font-size: 16px;
  color: #666;
  margin: 0 0 24px;
  line-height: 1.5;
}

.back-button {
  padding: 10px 20px;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.3s;
}

.back-button:hover {
  opacity: 0.9;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .room-container {
    padding: 16px;
  }
  
  .room-info {
    flex-direction: column;
    text-align: center;
  }
  
  .room-details {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .room-meta {
    justify-content: center;
  }
  
  .room-actions {
    flex-direction: row;
    justify-content: center;
  }
  
  .section-tabs {
    flex-direction: column;
  }
  
  .tab-button.active::after {
    display: none;
  }
  
  .tab-button.active {
    background-color: #f5f7ff;
  }
  
  .member-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .member-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .statistics-overview {
    grid-template-columns: 1fr;
  }
  
  .invite-methods {
    gap: 16px;
  }
}
</style>