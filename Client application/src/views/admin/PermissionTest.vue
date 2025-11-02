<template>
  <div class="permission-test">
    <!-- Token状态监控 -->
    <TokenStatus />
    
    <el-card class="test-card">
      <template #header>
        <div class="card-header">
          <span>权限测试</span>
        </div>
      </template>
      
      <div class="test-section">
        <h3>权限指令测试</h3>
        <p>以下按钮使用 v-permission 指令控制显示：</p>
        
        <div class="button-group">
          <el-button 
            v-permission="PERMISSIONS.SYSTEM_ADMIN" 
            type="danger"
            @click="testAction('系统管理')"
          >
            系统管理 (仅管理员)
          </el-button>
          
          <el-button 
            v-permission="PERMISSIONS.ROOM_CREATE" 
            type="primary"
            @click="testAction('创建寝室')"
          >
            创建寝室
          </el-button>
          
          <el-button 
            v-permission="PERMISSIONS.ROOM_MANAGE" 
            type="warning"
            @click="testAction('管理寝室')"
          >
            管理寝室
          </el-button>
          
          <el-button 
            v-permission="PERMISSIONS.EXPENSE_CREATE" 
            type="success"
            @click="testAction('创建费用')"
          >
            创建费用
          </el-button>
          
          <el-button 
            v-permission="PERMISSIONS.BILL_CREATE" 
            type="info"
            @click="testAction('创建账单')"
          >
            创建账单
          </el-button>
        </div>
      </div>
      
      <div class="test-section">
        <h3>编程式权限检查测试</h3>
        <p>以下按钮使用编程式权限检查：</p>
        
        <div class="button-group">
          <el-button 
            :type="hasPermission(PERMISSIONS.SYSTEM_ADMIN) ? 'danger' : 'info'"
            :disabled="!hasPermission(PERMISSIONS.SYSTEM_ADMIN)"
            @click="testAction('系统管理')"
          >
            系统管理 ({{ hasPermission(PERMISSIONS.SYSTEM_ADMIN) ? '有权限' : '无权限' }})
          </el-button>
          
          <el-button 
            :type="hasPermission(PERMISSIONS.ROOM_CREATE) ? 'primary' : 'info'"
            :disabled="!hasPermission(PERMISSIONS.ROOM_CREATE)"
            @click="testAction('创建寝室')"
          >
            创建寝室 ({{ hasPermission(PERMISSIONS.ROOM_CREATE) ? '有权限' : '无权限' }})
          </el-button>
          
          <el-button 
            :type="hasPermission(PERMISSIONS.ROOM_MANAGE) ? 'warning' : 'info'"
            :disabled="!hasPermission(PERMISSIONS.ROOM_MANAGE)"
            @click="testAction('管理寝室')"
          >
            管理寝室 ({{ hasPermission(PERMISSIONS.ROOM_MANAGE) ? '有权限' : '无权限' }})
          </el-button>
          
          <el-button 
            :type="hasPermission(PERMISSIONS.EXPENSE_CREATE) ? 'success' : 'info'"
            :disabled="!hasPermission(PERMISSIONS.EXPENSE_CREATE)"
            @click="testAction('创建费用')"
          >
            创建费用 ({{ hasPermission(PERMISSIONS.EXPENSE_CREATE) ? '有权限' : '无权限' }})
          </el-button>
          
          <el-button 
            :type="hasPermission(PERMISSIONS.BILL_CREATE) ? 'info' : 'info'"
            :disabled="!hasPermission(PERMISSIONS.BILL_CREATE)"
            @click="testAction('创建账单')"
          >
            创建账单 ({{ hasPermission(PERMISSIONS.BILL_CREATE) ? '有权限' : '无权限' }})
          </el-button>
        </div>
      </div>
      
      <div class="test-section">
        <h3>角色权限测试</h3>
        <p>测试不同角色的权限：</p>
        
        <div class="role-test">
          <el-button 
            v-for="role in allRoles" 
            :key="role"
            :type="currentRole === role ? 'primary' : 'default'"
            @click="simulateRole(role)"
          >
            模拟角色: {{ getRoleLabel(role) }}
          </el-button>
        </div>
        
        <div class="current-role">
          <p>当前模拟角色: <el-tag :type="getRoleTagType(currentRole)">{{ getRoleLabel(currentRole) }}</el-tag></p>
        </div>
      </div>
      
      <div class="test-section">
        <h3>权限组合测试</h3>
        <p>测试多个权限的组合：</p>
        
        <div class="button-group">
          <el-button 
            :type="hasAllPermissions([PERMISSIONS.ROOM_MANAGE, PERMISSIONS.ROOM_MEMBER_MANAGE]) ? 'warning' : 'info'"
            :disabled="!hasAllPermissions([PERMISSIONS.ROOM_MANAGE, PERMISSIONS.ROOM_MEMBER_MANAGE])"
            @click="testAction('寝室和成员管理')"
          >
            寝室和成员管理 (需要全部权限)
          </el-button>
          
          <el-button 
            :type="hasAnyPermission([PERMISSIONS.EXPENSE_CREATE, PERMISSIONS.BILL_CREATE]) ? 'success' : 'info'"
            :disabled="!hasAnyPermission([PERMISSIONS.EXPENSE_CREATE, PERMISSIONS.BILL_CREATE])"
            @click="testAction('创建费用或账单')"
          >
            创建费用或账单 (需要任一权限)
          </el-button>
        </div>
      </div>
      
      <div class="test-section">
        <h3>寝室权限测试</h3>
        <p>测试寝室相关权限：</p>
        
        <div class="room-test">
          <el-select v-model="selectedRoomId" placeholder="选择寝室" style="width: 200px; margin-right: 10px;">
            <el-option
              v-for="room in accessibleRooms"
              :key="room.id"
              :label="room.name"
              :value="room.id"
            />
          </el-select>
          
          <el-button 
            type="primary"
            @click="switchToRoom(selectedRoomId)"
            :disabled="!selectedRoomId"
          >
            切换寝室
          </el-button>
        </div>
        
        <div class="current-room">
          <p>当前寝室: <el-tag>{{ currentRoom?.name || '未选择' }}</el-tag></p>
          <p>寝室角色: <el-tag :type="getRoleTagType(roomRole)">{{ getRoleLabel(roomRole) }}</el-tag></p>
        </div>
      </div>
      
      <div class="test-section">
        <h3>路由权限测试</h3>
        <p>测试受保护的路由：</p>
        
        <div class="route-test">
          <el-button 
            v-for="route in testRoutes" 
            :key="route.path"
            type="primary"
            @click="navigateToRoute(route.path)"
            :disabled="!canAccessRoute(route)"
          >
            {{ route.name }} ({{ canAccessRoute(route) ? '可访问' : '无权限' }})
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useStore } from 'vuex'
import { useRouter } from 'vue-router'
import { PERMISSIONS, ROLES } from '@/utils/permissions'
import { ElMessage } from 'element-plus'
import TokenStatus from '@/components/TokenStatus.vue'

export default {
  name: 'PermissionTest',
  setup() {
    const store = useStore()
    const router = useRouter()
    const selectedRoomId = ref('')
    
    // 计算属性
    const currentUser = computed(() => store.getters['auth/currentUser'])
    const currentRole = computed(() => store.getters['permissions/currentRole'])
    const currentRoom = computed(() => store.getters['permissions/currentRoom'])
    const roomRole = computed(() => store.getters['permissions/roomRole'])
    const accessibleRooms = computed(() => store.getters['permissions/accessibleRooms'])
    
    // 所有角色
    const allRoles = computed(() => [
      ROLES.ADMIN,
      ROLES.ROOM_OWNER,
      ROLES.ROOM_MEMBER,
      ROLES.GUEST
    ])
    
    // 测试路由
    const testRoutes = computed(() => [
      { name: '用户管理', path: '/admin/users', requiredPermission: PERMISSIONS.USER_MANAGE },
      { name: '寝室管理', path: '/admin/rooms', requiredPermission: PERMISSIONS.ROOM_GLOBAL_MANAGE },
      { name: '创建寝室', path: '/rooms/create', requiredPermission: PERMISSIONS.ROOM_CREATE },
      { name: '创建费用', path: '/expenses/create', requiredPermission: PERMISSIONS.EXPENSE_CREATE },
      { name: '创建账单', path: '/bills/create', requiredPermission: PERMISSIONS.BILL_CREATE }
    ])
    
    // 方法
    const hasPermission = (permission) => {
      return store.getters['permissions/hasPermission'](permission)
    }
    
    const hasAllPermissions = (permissions) => {
      return store.getters['permissions/hasAllPermissions'](permissions)
    }
    
    const hasAnyPermission = (permissions) => {
      return store.getters['permissions/hasAnyPermission'](permissions)
    }
    
    const getRoleLabel = (role) => {
      const roleLabels = {
        [ROLES.ADMIN]: '管理员',
        [ROLES.ROOM_OWNER]: '寝室长',
        [ROLES.ROOM_MEMBER]: '寝室成员',
        [ROLES.GUEST]: '访客'
      }
      return roleLabels[role] || '未知角色'
    }
    
    const getRoleTagType = (role) => {
      const roleTypes = {
        [ROLES.ADMIN]: 'danger',
        [ROLES.ROOM_OWNER]: 'warning',
        [ROLES.ROOM_MEMBER]: 'primary',
        [ROLES.GUEST]: 'info'
      }
      return roleTypes[role] || 'info'
    }
    
    const testAction = (action) => {
      ElMessage.success(`执行操作: ${action}`)
    }
    
    const simulateRole = async (role) => {
      try {
        // 这里只是模拟，实际应用中不应该允许随意切换角色
        await store.dispatch('permissions/setCurrentRole', role)
        ElMessage.success(`已模拟角色: ${getRoleLabel(role)}`)
      } catch (error) {
        console.error('模拟角色失败:', error)
        ElMessage.error('模拟角色失败')
      }
    }
    
    const switchToRoom = async (roomId) => {
      try {
        const room = accessibleRooms.value.find(r => r.id === roomId)
        if (room) {
          await store.dispatch('permissions/switchToRoom', room)
          ElMessage.success(`已切换到寝室: ${room.name}`)
        }
      } catch (error) {
        console.error('切换寝室失败:', error)
        ElMessage.error('切换寝室失败')
      }
    }
    
    const canAccessRoute = (route) => {
      if (!route.requiredPermission) return true
      return hasPermission(route.requiredPermission)
    }
    
    const navigateToRoute = (path) => {
      router.push(path)
    }
    
    onMounted(() => {
      // 组件挂载时初始化权限信息
      store.dispatch('permissions/initializePermissions')
    })
    
    return {
      selectedRoomId,
      currentUser,
      currentRole,
      currentRoom,
      roomRole,
      accessibleRooms,
      allRoles,
      testRoutes,
      hasPermission,
      hasAllPermissions,
      hasAnyPermission,
      getRoleLabel,
      getRoleTagType,
      testAction,
      simulateRole,
      switchToRoom,
      canAccessRoute,
      navigateToRoute,
      PERMISSIONS
    }
  }
}
</script>

<style scoped>
.permission-test {
  padding: 20px;
}

.test-card {
  max-width: 1200px;
  margin: 0 auto;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.test-section {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}

.test-section:last-child {
  border-bottom: none;
}

.test-section h3 {
  margin-bottom: 12px;
  color: #409eff;
}

.button-group {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.role-test {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.current-role,
.current-room {
  margin-top: 16px;
}

.room-test {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.route-test {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
</style>