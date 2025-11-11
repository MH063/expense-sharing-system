<template>
  <div class="permission-manager">
    <el-card class="permission-card">
      <template #header>
        <div class="card-header">
          <span>权限信息</span>
          <el-button size="small" type="primary" @click="refreshPermissions">
            刷新权限
          </el-button>
        </div>
      </template>
      
      <div class="permission-section">
        <h4>当前用户信息</h4>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="用户名">
            {{ currentUser?.username || '未登录' }}
          </el-descriptions-item>
          <el-descriptions-item label="用户ID">
            {{ currentUser?.id || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="全局角色">
            <el-tag :type="getRoleTagType(currentRole)">
              {{ getRoleLabel(currentRole) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="当前寝室">
            {{ currentRoom?.name || '未选择' }}
          </el-descriptions-item>
          <el-descriptions-item label="寝室角色">
            <el-tag :type="getRoleTagType(roomRole)" v-if="roomRole">
              {{ getRoleLabel(roomRole) }}
            </el-tag>
            <span v-else>-</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>
      
      <div class="permission-section">
        <h4>权限列表</h4>
        <el-collapse v-model="activePermissions">
          <el-collapse-item title="系统权限" name="system">
            <div class="permission-list">
              <el-tag
                v-for="permission in systemPermissions"
                :key="permission"
                class="permission-tag"
                :type="hasPermission(permission) ? 'success' : 'info'"
                effect="plain"
              >
                {{ getPermissionLabel(permission) }}
              </el-tag>
            </div>
          </el-collapse-item>
          
          <el-collapse-item title="寝室权限" name="room">
            <div class="permission-list">
              <el-tag
                v-for="permission in roomPermissions"
                :key="permission"
                class="permission-tag"
                :type="hasPermission(permission) ? 'success' : 'info'"
                effect="plain"
              >
                {{ getPermissionLabel(permission) }}
              </el-tag>
            </div>
          </el-collapse-item>
          
          <el-collapse-item title="费用权限" name="expense">
            <div class="permission-list">
              <el-tag
                v-for="permission in expensePermissions"
                :key="permission"
                class="permission-tag"
                :type="hasPermission(permission) ? 'success' : 'info'"
                effect="plain"
              >
                {{ getPermissionLabel(permission) }}
              </el-tag>
            </div>
          </el-collapse-item>
          
          <el-collapse-item title="账单权限" name="bill">
            <div class="permission-list">
              <el-tag
                v-for="permission in billPermissions"
                :key="permission"
                class="permission-tag"
                :type="hasPermission(permission) ? 'success' : 'info'"
                effect="plain"
              >
                {{ getPermissionLabel(permission) }}
              </el-tag>
            </div>
          </el-collapse-item>
          
          <el-collapse-item title="个人信息权限" name="profile">
            <div class="permission-list">
              <el-tag
                v-for="permission in profilePermissions"
                :key="permission"
                class="permission-tag"
                :type="hasPermission(permission) ? 'success' : 'info'"
                effect="plain"
              >
                {{ getPermissionLabel(permission) }}
              </el-tag>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
      
      <div class="permission-section">
        <h4>可访问的寝室</h4>
        <el-table :data="accessibleRooms" style="width: 100%" v-if="accessibleRooms.length">
          <el-table-column prop="name" label="寝室名称" />
          <el-table-column prop="role" label="角色">
            <template #default="scope">
              <el-tag :type="getRoleTagType(scope.row.role)">
                {{ getRoleLabel(scope.row.role) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作">
            <template #default="scope">
              <el-button 
                size="small" 
                @click="switchToRoom(scope.row)"
                :disabled="currentRoom?.id === scope.row.id"
              >
                {{ currentRoom?.id === scope.row.id ? '当前寝室' : '切换' }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="暂无可访问的寝室" />
      </div>
    </el-card>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { PERMISSIONS, ROLES } from '@/utils/permissions'

export default {
  name: 'PermissionManager',
  setup() {
    const store = useStore()
    const activePermissions = ref(['system'])
    
    // 计算属性
    const currentUser = computed(() => store.getters['auth/currentUser'])
    const currentRole = computed(() => store.getters['permissions/currentRole'])
    const currentRoom = computed(() => store.getters['permissions/currentRoom'])
    const roomRole = computed(() => store.getters['permissions/roomRole'])
    const accessibleRooms = computed(() => store.getters['permissions/accessibleRooms'])
    
    // 权限列表
    const systemPermissions = computed(() => [
      PERMISSIONS.SYSTEM_ADMIN,
      PERMISSIONS.USER_MANAGE,
      PERMISSIONS.ROOM_GLOBAL_MANAGE
    ])
    
    const roomPermissions = computed(() => [
      PERMISSIONS.ROOM_CREATE,
      PERMISSIONS.ROOM_JOIN,
      PERMISSIONS.ROOM_VIEW,
      PERMISSIONS.ROOM_MANAGE,
      PERMISSIONS.ROOM_MEMBER_MANAGE,
      PERMISSIONS.ROOM_DELETE
    ])
    
    const expensePermissions = computed(() => [
      PERMISSIONS.EXPENSE_CREATE,
      PERMISSIONS.EXPENSE_VIEW,
      PERMISSIONS.EXPENSE_EDIT,
      PERMISSIONS.EXPENSE_DELETE,
      PERMISSIONS.EXPENSE_SETTLE
    ])
    
    const billPermissions = computed(() => [
      PERMISSIONS.BILL_CREATE,
      PERMISSIONS.BILL_VIEW,
      PERMISSIONS.BILL_EDIT,
      PERMISSIONS.BILL_DELETE,
      PERMISSIONS.BILL_PAY
    ])
    
    const profilePermissions = computed(() => [
      PERMISSIONS.PROFILE_VIEW,
      PERMISSIONS.PROFILE_EDIT
    ])
    
    // 方法
    const hasPermission = (permission) => {
      return store.getters['permissions/hasPermission'](permission)
    }
    
    const getRoleLabel = (role) => {
      const roleLabels = {
        [ROLES.SYSTEM_ADMIN]: '系统管理员',
        [ROLES.ADMIN]: '管理员',
        [ROLES.ROOM_OWNER]: '寝室长',
        [ROLES.PAYER]: '缴费人',
        [ROLES.USER]: '普通用户',
        [ROLES.GUEST]: '访客'
      }
      return roleLabels[role] || '未知角色'
    }
    
    const getRoleTagType = (role) => {
      const roleTypes = {
        [ROLES.SYSTEM_ADMIN]: 'danger',
        [ROLES.ADMIN]: 'danger',
        [ROLES.ROOM_OWNER]: 'warning',
        [ROLES.PAYER]: 'primary',
        [ROLES.USER]: 'primary',
        [ROLES.GUEST]: 'info'
      }
      return roleTypes[role] || 'info'
    }
    
    const getPermissionLabel = (permission) => {
      const permissionLabels = {
        // 系统权限
        [PERMISSIONS.SYSTEM_ADMIN]: '系统管理',
        [PERMISSIONS.USER_MANAGE]: '用户管理',
        [PERMISSIONS.ROOM_GLOBAL_MANAGE]: '全局寝室管理',
        
        // 寝室权限
        [PERMISSIONS.ROOM_CREATE]: '创建寝室',
        [PERMISSIONS.ROOM_JOIN]: '加入寝室',
        [PERMISSIONS.ROOM_VIEW]: '查看寝室',
        [PERMISSIONS.ROOM_MANAGE]: '管理寝室',
        [PERMISSIONS.ROOM_MEMBER_MANAGE]: '管理寝室成员',
        [PERMISSIONS.ROOM_DELETE]: '删除寝室',
        
        // 费用权限
        [PERMISSIONS.EXPENSE_CREATE]: '创建费用',
        [PERMISSIONS.EXPENSE_VIEW]: '查看费用',
        [PERMISSIONS.EXPENSE_EDIT]: '编辑费用',
        [PERMISSIONS.EXPENSE_DELETE]: '删除费用',
        [PERMISSIONS.EXPENSE_SETTLE]: '结算费用',
        
        // 账单权限
        [PERMISSIONS.BILL_CREATE]: '创建账单',
        [PERMISSIONS.BILL_VIEW]: '查看账单',
        [PERMISSIONS.BILL_EDIT]: '编辑账单',
        [PERMISSIONS.BILL_DELETE]: '删除账单',
        [PERMISSIONS.BILL_PAY]: '支付账单',
        
        // 个人信息权限
        [PERMISSIONS.PROFILE_VIEW]: '查看个人信息',
        [PERMISSIONS.PROFILE_EDIT]: '编辑个人信息'
      }
      return permissionLabels[permission] || permission
    }
    
    const refreshPermissions = async () => {
      try {
        await store.dispatch('permissions/initializePermissions')
        ElMessage.success('权限信息已刷新')
      } catch (error) {
        console.error('刷新权限失败:', error)
        ElMessage.error('刷新权限失败')
      }
    }
    
    const switchToRoom = async (room) => {
      try {
        await store.dispatch('permissions/switchToRoom', room)
        ElMessage.success(`已切换到寝室: ${room.name}`)
      } catch (error) {
        console.error('切换寝室失败:', error)
        ElMessage.error('切换寝室失败')
      }
    }
    
    onMounted(() => {
      // 组件挂载时初始化权限信息
      refreshPermissions()
    })
    
    return {
      activePermissions,
      currentUser,
      currentRole,
      currentRoom,
      roomRole,
      accessibleRooms,
      systemPermissions,
      roomPermissions,
      expensePermissions,
      billPermissions,
      profilePermissions,
      hasPermission,
      getRoleLabel,
      getRoleTagType,
      getPermissionLabel,
      refreshPermissions,
      switchToRoom
    }
  }
}
</script>

<style scoped>
.permission-manager {
  padding: 20px;
}

.permission-card {
  max-width: 1000px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.permission-section {
  margin-bottom: 24px;
}

.permission-section h4 {
  margin-bottom: 12px;
  color: #409eff;
}

.permission-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.permission-tag {
  margin-bottom: 8px;
}
</style>