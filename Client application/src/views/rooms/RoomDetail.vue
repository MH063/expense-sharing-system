<template>
  <div class="room-detail">
    <div class="detail-header">
      <el-button type="text" @click="goBack" class="back-button">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <h1>房间详情</h1>
    </div>

    <div v-loading="loading" class="detail-content">
      <div v-if="room" class="room-info-section">
        <el-card shadow="hover" class="room-card">
          <template #header>
            <div class="card-header">
              <span class="room-name">{{ room.name }}</span>
              <div class="room-actions">
                <el-tag :type="getStatusTagType(room.status)">
                  {{ getStatusText(room.status) }}
                </el-tag>
                <el-button
                  v-if="canEdit"
                  type="primary"
                  size="small"
                  @click="editRoom"
                >
                  编辑
                </el-button>
                <el-button
                  v-if="canJoin"
                  type="primary"
                  size="small"
                  @click="joinRoom"
                >
                  加入房间
                </el-button>
                <el-button
                  v-if="canLeave"
                  type="danger"
                  size="small"
                  @click="leaveRoom"
                >
                  退出房间
                </el-button>
              </div>
            </div>
          </template>

          <el-descriptions :column="2" border>
            <el-descriptions-item label="房间描述" :span="2">
              {{ room.description || '暂无描述' }}
            </el-descriptions-item>
            <el-descriptions-item label="创建者">
              {{ room.creatorName }}
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ formatDate(room.createdAt) }}
            </el-descriptions-item>
            <el-descriptions-item label="成员数量">
              {{ room.memberCount }} / {{ room.maxMembers }}
            </el-descriptions-item>
            <el-descriptions-item label="房间状态">
              <el-tag :type="getStatusTagType(room.status)">
                {{ getStatusText(room.status) }}
              </el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </el-card>
      </div>

      <div v-if="room" class="tabs-section">
        <el-tabs v-model="activeTab" @tab-click="handleTabClick">
          <el-tab-pane label="成员管理" name="members">
            <div class="tab-content">
              <div class="tab-header">
                <h3>房间成员</h3>
                <el-button
                  v-if="canManageMembers"
                  type="primary"
                  size="small"
                  @click="showInviteDialog = true"
                >
                  邀请成员
                </el-button>
              </div>
              <el-table :data="roomMembers" stripe>
                <el-table-column prop="userName" label="用户名" width="150" />
                <el-table-column prop="realName" label="真实姓名" width="150" />
                <el-table-column prop="role" label="角色" width="120">
                  <template #default="scope">
                    <el-tag :type="getRoleTagType(scope.row.role)">
                      {{ getRoleText(scope.row.role) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="joinedAt" label="加入时间" width="180">
                  <template #default="scope">
                    {{ formatDate(scope.row.joinedAt) }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="180">
                  <template #default="scope">
                    <el-button
                      v-if="canManageMember(scope.row)"
                      type="text"
                      @click="changeMemberRole(scope.row)"
                    >
                      更改角色
                    </el-button>
                    <el-button
                      v-if="canRemoveMember(scope.row)"
                      type="text"
                      @click="removeMember(scope.row)"
                    >
                      移除
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>

          <el-tab-pane label="费用记录" name="expenses">
            <div class="tab-content">
              <div class="tab-header">
                <h3>费用记录</h3>
                <el-button
                  v-if="isMember"
                  type="primary"
                  size="small"
                  @click="createExpense"
                >
                  添加费用
                </el-button>
              </div>
              <el-table :data="expenses" stripe>
                <el-table-column prop="title" label="费用名称" width="180" />
                <el-table-column prop="amount" label="金额" width="120">
                  <template #default="scope">
                    ¥{{ scope.row.amount.toFixed(2) }}
                  </template>
                </el-table-column>
                <el-table-column prop="category" label="类型" width="120">
                  <template #default="scope">
                    <el-tag :type="getCategoryTagType(scope.row.category)">
                      {{ getCategoryText(scope.row.category) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="payerName" label="支付人" width="120" />
                <el-table-column prop="paymentDate" label="支付日期" width="150">
                  <template #default="scope">
                    {{ formatDate(scope.row.paymentDate) }}
                  </template>
                </el-table-column>
                <el-table-column label="我的分摊" width="120">
                  <template #default="scope">
                    ¥{{ getMyShare(scope.row).toFixed(2) }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="120">
                  <template #default="scope">
                    <el-button type="text" @click="viewExpenseDetail(scope.row)">
                      详情
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>

          <el-tab-pane label="账单管理" name="bills">
            <div class="tab-content">
              <div class="tab-header">
                <h3>账单管理</h3>
                <div class="tab-actions">
                  <el-button
                    v-if="canManageBills"
                    type="success"
                    size="small"
                    @click="goToPaymentRules"
                  >
                    支付规则
                  </el-button>
                  <el-button
                    v-if="canManageBills"
                    type="primary"
                    size="small"
                    @click="createBill"
                  >
                    创建账单
                  </el-button>
                </div>
              </div>
              <el-table :data="bills" stripe>
                <el-table-column prop="title" label="账单名称" width="180" />
                <el-table-column prop="totalAmount" label="总金额" width="120">
                  <template #default="scope">
                    ¥{{ scope.row.totalAmount.toFixed(2) }}
                  </template>
                </el-table-column>
                <el-table-column prop="status" label="状态" width="120">
                  <template #default="scope">
                    <el-tag :type="getBillStatusTagType(scope.row.status)">
                      {{ getBillStatusText(scope.row.status) }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="dueDate" label="截止日期" width="150">
                  <template #default="scope">
                    {{ formatDate(scope.row.dueDate) }}
                  </template>
                </el-table-column>
                <el-table-column prop="createdAt" label="创建时间" width="150">
                  <template #default="scope">
                    {{ formatDate(scope.row.createdAt) }}
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="120">
                  <template #default="scope">
                    <el-button type="text" @click="viewBillDetail(scope.row)">
                      详情
                    </el-button>
                  </template>
                </el-table-column>
              </el-table>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>

      <div v-else-if="!loading" class="empty-state">
        <el-empty description="房间不存在或已被删除" />
      </div>
    </div>

    <!-- 邀请成员对话框 -->
    <el-dialog
      v-model="showInviteDialog"
      title="邀请成员"
      width="50%"
    >
      <el-form
        ref="inviteFormRef"
        :model="inviteForm"
        :rules="inviteFormRules"
        label-width="80px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input
            v-model="inviteForm.username"
            placeholder="请输入要邀请的用户名"
          />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="inviteForm.role" placeholder="选择角色">
            <el-option label="普通成员" value="member" />
            <el-option label="管理员" value="admin" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showInviteDialog = false">取消</el-button>
          <el-button type="primary" @click="submitInvite">发送邀请</el-button>
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
import { roomsApi } from '@/api/rooms'
import { expenseApi } from '@/api/expenses'
import { billApi } from '@/api/bills'
import { useUserStore } from '@/stores/user'

// 路由
const route = useRoute()
const router = useRouter()

// 状态
const userStore = useUserStore()
const loading = ref(false)
const room = ref(null)
const roomMembers = ref([])
const expenses = ref([])
const bills = ref([])
const activeTab = ref('members')
const showInviteDialog = ref(false)
const inviteFormRef = ref(null)

// 邀请表单
const inviteForm = reactive({
  username: '',
  role: 'member'
})

// 邀请表单验证规则
const inviteFormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ]
}

// 计算属性
const currentUserId = computed(() => userStore.userId)
const roomId = computed(() => route.params.id)
const isAdmin = computed(() => userStore.isAdmin)

// 是否是房间成员
const isMember = computed(() => {
  return room.value?.isMember
})

// 是否可以编辑房间
const canEdit = computed(() => {
  return room.value?.creatorId === currentUserId.value
})

// 是否可以加入房间
const canJoin = computed(() => {
  return !room.value?.isMember && room.value?.memberCount < room.value?.maxMembers
})

// 是否可以退出房间
const canLeave = computed(() => {
  return room.value?.isMember && room.value?.creatorId !== currentUserId.value
})

// 是否可以管理成员
const canManageMembers = computed(() => {
  return room.value?.creatorId === currentUserId.value || 
         (room.value?.isAdmin && room.value?.isMember)
})

// 是否可以管理账单
const canManageBills = computed(() => {
  return room.value?.creatorId === currentUserId.value || 
         (room.value?.isAdmin && room.value?.isMember)
})

// 方法
/**
 * 加载房间详情
 */
const loadRoomDetail = async () => {
  loading.value = true
  try {
    const response = await roomsApi.getRoomDetail(roomId.value)
    if (response.success) {
      room.value = response.data
      loadTabData()
    } else {
      ElMessage.error('加载房间详情失败')
    }
  } catch (error) {
    console.error('加载房间详情失败:', error)
    ElMessage.error('加载房间详情失败')
  } finally {
    loading.value = false
  }
}

/**
 * 加载标签页数据
 */
const loadTabData = async () => {
  if (activeTab.value === 'members') {
    loadRoomMembers()
  } else if (activeTab.value === 'expenses') {
    loadRoomExpenses()
  } else if (activeTab.value === 'bills') {
    loadRoomBills()
  }
}

/**
 * 加载房间成员
 */
const loadRoomMembers = async () => {
  try {
    const response = await roomsApi.getRoomMembers(roomId.value)
    if (response.success) {
      roomMembers.value = response.data || []
    }
  } catch (error) {
    console.error('加载房间成员失败:', error)
  }
}

/**
 * 加载房间费用
 */
const loadRoomExpenses = async () => {
  try {
    const response = await expenseApi.getExpenses({ roomId: roomId.value })
    if (response.success) {
      expenses.value = response.data.items || []
    }
  } catch (error) {
    console.error('加载房间费用失败:', error)
  }
}

/**
 * 加载房间账单
 */
const loadRoomBills = async () => {
  try {
    const response = await billApi.getBills({ roomId: roomId.value })
    if (response.success) {
      bills.value = response.data.items || []
    }
  } catch (error) {
    console.error('加载房间账单失败:', error)
  }
}

/**
 * 返回上一页
 */
const goBack = () => {
  router.go(-1)
}

/**
 * 编辑房间
 */
const editRoom = () => {
  router.push(`/rooms/${roomId.value}/edit`)
}

/**
 * 加入房间
 */
const joinRoom = async () => {
  try {
    const response = await roomsApi.joinRoom(roomId.value)
    if (response.success) {
      ElMessage.success('申请已发送，等待房间管理员审核')
      loadRoomDetail()
    } else {
      ElMessage.error('申请失败')
    }
  } catch (error) {
    console.error('加入房间失败:', error)
    ElMessage.error('加入房间失败')
  }
}

/**
 * 退出房间
 */
const leaveRoom = async () => {
  try {
    await ElMessageBox.confirm('确定要退出此房间吗？', '确认退出', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const response = await roomsApi.leaveRoom(roomId.value)
    if (response.success) {
      ElMessage.success('已退出房间')
      loadRoomDetail()
    } else {
      ElMessage.error('退出失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('退出房间失败:', error)
      ElMessage.error('退出房间失败')
    }
  }
}

/**
 * 处理标签页点击
 */
const handleTabClick = () => {
  loadTabData()
}

/**
 * 创建费用
 */
const createExpense = () => {
  router.push(`/expenses/create?roomId=${roomId.value}`)
}

/**
 * 查看费用详情
 */
const viewExpenseDetail = (expense) => {
  router.push(`/expenses/${expense.id}`)
}

/**
 * 创建账单
 */
const createBill = () => {
  router.push(`/bills/create?roomId=${roomId.value}`)
}

/**
 * 跳转到支付规则页面
 */
const goToPaymentRules = () => {
  router.push(`/rooms/${roomId.value}/payment-rules`)
}

/**
 * 查看账单详情
 */
const viewBillDetail = (bill) => {
  router.push(`/bills/${bill.id}`)
}

/**
 * 更改成员角色
 */
const changeMemberRole = async (member) => {
  try {
    const { value: newRole } = await ElMessageBox.prompt('请选择新角色', '更改角色', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputType: 'select',
      inputOptions: [
        { value: 'member', label: '普通成员' },
        { value: 'admin', label: '管理员' }
      ],
      inputValue: member.role
    })
    
    const response = await roomsApi.updateRoomMember(roomId.value, member.userId, { role: newRole })
    if (response.success) {
      ElMessage.success('角色更改成功')
      loadRoomMembers()
    } else {
      ElMessage.error('角色更改失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('更改成员角色失败:', error)
      ElMessage.error('更改成员角色失败')
    }
  }
}

/**
 * 移除成员
 */
const removeMember = async (member) => {
  try {
    await ElMessageBox.confirm(`确定要移除成员 ${member.userName} 吗？`, '确认移除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    const response = await roomsApi.removeRoomMember(roomId.value, member.userId)
    if (response.success) {
      ElMessage.success('成员已移除')
      loadRoomMembers()
    } else {
      ElMessage.error('移除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('移除成员失败:', error)
      ElMessage.error('移除成员失败')
    }
  }
}

/**
 * 提交邀请
 */
const submitInvite = async () => {
  if (!inviteFormRef.value) return
  
  try {
    await inviteFormRef.value.validate()
    
    const response = await roomsApi.createRoomInvitation(inviteForm)
    if (response.success) {
      ElMessage.success('邀请已发送')
      showInviteDialog.value = false
      inviteForm.username = ''
      inviteForm.role = 'member'
      loadRoomMembers()
    } else {
      ElMessage.error('邀请发送失败')
    }
  } catch (error) {
    console.error('邀请成员失败:', error)
    ElMessage.error('邀请成员失败')
  }
}

/**
 * 判断是否可以管理成员
 */
const canManageMember = (member) => {
  // 不能更改创建者角色
  if (member.userId === room.value?.creatorId) return false
  
  // 创建者可以管理所有成员
  if (room.value?.creatorId === currentUserId.value) return true
  
  // 管理员可以管理普通成员
  if (room.value?.isAdmin && room.value?.isMember && member.role === 'member') return true
  
  return false
}

/**
 * 判断是否可以移除成员
 */
const canRemoveMember = (member) => {
  // 不能移除创建者
  if (member.userId === room.value?.creatorId) return false
  
  // 不能移除自己
  if (member.userId === currentUserId.value) return false
  
  // 创建者可以移除所有其他成员
  if (room.value?.creatorId === currentUserId.value) return true
  
  // 管理员可以移除普通成员
  if (room.value?.isAdmin && room.value?.isMember && member.role === 'member') return true
  
  return false
}

/**
 * 获取我的分摊金额
 */
const getMyShare = (expense) => {
  const mySplit = expense.splitMembers?.find(member => member.userId === currentUserId.value)
  return mySplit?.amount || 0
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

/**
 * 获取角色标签类型
 */
const getRoleTagType = (role) => {
  const roleMap = {
    creator: 'danger',
    admin: 'warning',
    member: ''
  }
  return roleMap[role] || ''
}

/**
 * 获取角色文本
 */
const getRoleText = (role) => {
  const roleMap = {
    creator: '创建者',
    admin: '管理员',
    member: '成员'
  }
  return roleMap[role] || '未知'
}

/**
 * 获取费用类型标签类型
 */
const getCategoryTagType = (category) => {
  const typeMap = {
    food: '',
    utilities: 'success',
    rent: 'warning',
    daily: 'info',
    entertainment: 'danger',
    transport: '',
    medical: 'warning',
    education: 'success',
    other: 'info'
  }
  return typeMap[category] || ''
}

/**
 * 获取费用类型文本
 */
const getCategoryText = (category) => {
  const categoryMap = {
    food: '餐饮',
    utilities: '水电费',
    rent: '房租',
    daily: '日用品',
    entertainment: '娱乐',
    transport: '交通',
    medical: '医疗',
    education: '教育',
    other: '其他'
  }
  return categoryMap[category] || '未知'
}

/**
 * 获取账单状态标签类型
 */
const getBillStatusTagType = (status) => {
  const statusMap = {
    draft: 'info',
    pending: 'warning',
    paid: 'success',
    overdue: 'danger'
  }
  return statusMap[status] || 'info'
}

/**
 * 获取账单状态文本
 */
const getBillStatusText = (status) => {
  const statusMap = {
    draft: '草稿',
    pending: '待支付',
    paid: '已支付',
    overdue: '已逾期'
  }
  return statusMap[status] || '未知'
}

// 生命周期
onMounted(() => {
  loadRoomDetail()
})
</script>

<style scoped>
.room-detail {
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

.room-info-section {
  margin-bottom: 20px;
}

.room-card {
  max-width: 900px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.room-name {
  font-size: 18px;
  font-weight: bold;
}

.room-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.tabs-section {
  max-width: 1200px;
  margin: 0 auto;
}

.tab-content {
  padding: 20px 0;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.tab-actions {
  display: flex;
  gap: 10px;
}

.tab-header h3 {
  margin: 0;
  font-size: 16px;
}

.empty-state {
  margin-top: 50px;
  text-align: center;
}
</style>