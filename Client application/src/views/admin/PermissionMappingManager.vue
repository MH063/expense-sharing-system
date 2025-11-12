<template>
  <div class="permission-mapping-manager">
    <el-card>
      <template #header>
        <div class="card-header">
          <h2>权限映射管理</h2>
          <el-button type="primary" @click="exportMapping">导出映射配置</el-button>
        </div>
      </template>
      
      <el-tabs v-model="activeTab">
        <!-- 角色权限映射 -->
        <el-tab-pane label="角色权限映射" name="roles">
          <div class="role-permission-mapping">
            <el-table :data="roleMappingData" style="width: 100%">
              <el-table-column label="角色" width="200">
                <template #default="{ row }">
                  <div class="role-info">
                    <el-icon :style="{ color: row.color }">
                      <component :is="row.icon" />
                    </el-icon>
                    <span>{{ row.name }}</span>
                  </div>
                </template>
              </el-table-column>
              
              <el-table-column label="描述">
                <template #default="{ row }">
                  {{ row.description }}
                </template>
              </el-table-column>
              
              <el-table-column label="权限数量" width="120">
                <template #default="{ row }">
                  <el-tag :type="row.permissionCount > 20 ? 'danger' : row.permissionCount > 10 ? 'warning' : 'success'">
                    {{ row.permissionCount }}
                  </el-tag>
                </template>
              </el-table-column>
              
              <el-table-column label="权限详情" width="150">
                <template #default="{ row }">
                  <el-button size="small" @click="showRolePermissions(row)">查看权限</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
        
        <!-- 页面权限映射 -->
        <el-tab-pane label="页面权限映射" name="pages">
          <div class="page-permission-mapping">
            <el-input
              v-model="pageSearchQuery"
              placeholder="搜索页面..."
              prefix-icon="Search"
              style="margin-bottom: 20px"
            />
            
            <el-table :data="filteredPageMappingData" style="width: 100%">
              <el-table-column label="页面路径" width="250">
                <template #default="{ row }">
                  <code>{{ row.path }}</code>
                </template>
              </el-table-column>
              
              <el-table-column label="页面名称" width="150">
                <template #default="{ row }">
                  {{ row.name }}
                </template>
              </el-table-column>
              
              <el-table-column label="权限要求">
                <template #default="{ row }">
                  <div class="permission-requirements">
                    <el-tag v-if="row.requiresAuth" type="info" size="small">需要登录</el-tag>
                    <el-tag v-if="row.requiresGuest" type="warning" size="small">仅访客</el-tag>
                    <el-tag 
                      v-if="row.requiresPermission" 
                      type="primary" 
                      size="small"
                    >
                      {{ Array.isArray(row.requiresPermission) 
                        ? row.requiresPermission.join(', ') 
                        : getPermissionInfo(row.requiresPermission).name }}
                    </el-tag>
                    <el-tag 
                      v-if="row.requiresRoomPermission" 
                      type="success" 
                      size="small"
                    >
                      寝室权限: {{ getPermissionInfo(row.requiresRoomPermission).name }}
                    </el-tag>
                  </div>
                </template>
              </el-table-column>
              
              <el-table-column label="操作" width="120">
                <template #default="{ row }">
                  <el-button size="small" @click="testPageAccess(row)">测试访问</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
        
        <!-- 权限测试 -->
        <el-tab-pane label="权限测试" name="test">
          <div class="permission-test">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-card>
                  <template #header>
                    <h3>选择测试角色</h3>
                  </template>
                  
                  <el-select v-model="testRole" placeholder="选择角色" style="width: 100%">
                    <el-option
                      v-for="(info, role) in ROLE_INFO"
                      :key="role"
                      :label="info.name"
                      :value="role"
                    >
                      <div class="role-option">
                        <el-icon :style="{ color: info.color }">
                          <component :is="info.icon" />
                        </el-icon>
                        <span>{{ info.name }}</span>
                      </div>
                    </el-option>
                  </el-select>
                  
                  <div style="margin-top: 20px">
                    <h4>角色权限</h4>
                    <el-tag
                      v-for="permission in getRolePermissions(testRole)"
                      :key="permission"
                      style="margin: 5px"
                    >
                      {{ getPermissionInfo(permission).name }}
                    </el-tag>
                  </div>
                </el-card>
              </el-col>
              
              <el-col :span="12">
                <el-card>
                  <template #header>
                    <h3>测试页面访问</h3>
                  </template>
                  
                  <el-select v-model="testPage" placeholder="选择页面" style="width: 100%">
                    <el-option
                      v-for="(info, path) in PAGE_PERMISSIONS"
                      :key="path"
                      :label="info.name"
                      :value="path"
                    />
                  </el-select>
                  
                  <div style="margin-top: 20px">
                    <el-button type="primary" @click="runPermissionTest">运行测试</el-button>
                    
                    <div v-if="testResult" style="margin-top: 20px">
                      <el-alert
                        :title="testResult.canAccess ? '可以访问' : '无法访问'"
                        :type="testResult.canAccess ? 'success' : 'error'"
                        :description="testResult.reason"
                        show-icon
                        :closable="false"
                      />
                    </div>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
    
    <!-- 角色权限详情对话框 -->
    <el-dialog v-model="rolePermissionsVisible" title="角色权限详情" width="60%">
      <div v-if="selectedRole">
        <h3>{{ selectedRole.name }} 权限列表</h3>
        <p>{{ selectedRole.description }}</p>
        
        <el-tabs>
          <el-tab-pane
            v-for="(category, name) in groupedPermissions"
            :key="name"
            :label="name"
          >
            <el-table :data="category" style="width: 100%">
              <el-table-column label="权限名称">
                <template #default="{ row }">
                  {{ row.name }}
                </template>
              </el-table-column>
              <el-table-column label="权限描述">
                <template #default="{ row }">
                  {{ row.description }}
                </template>
              </el-table-column>
              <el-table-column label="权限级别" width="100">
                <template #default="{ row }">
                  <el-tag 
                    :type="row.level === 'high' ? 'danger' : row.level === 'medium' ? 'warning' : 'success'"
                    size="small"
                  >
                    {{ row.level }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ROLE_INFO,
  PERMISSION_INFO,
  PERMISSION_CATEGORIES,
  PAGE_PERMISSIONS,
  getRolePermissions,
  getPermissionInfo,
  checkPageAccess
} from '@/utils/permissionMapping'

export default {
  name: 'PermissionMappingManager',
  setup() {
    const activeTab = ref('roles')
    const pageSearchQuery = ref('')
    const testRole = ref('')
    const testPage = ref('')
    const testResult = ref(null)
    const rolePermissionsVisible = ref(false)
    const selectedRole = ref(null)
    
    // 角色映射数据
    const roleMappingData = computed(() => {
      return Object.entries(ROLE_INFO).map(([role, info]) => ({
        role,
        name: info.name,
        description: info.description,
        color: info.color,
        icon: info.icon,
        permissionCount: getRolePermissions(role).length
      }))
    })
    
    // 页面映射数据
    const pageMappingData = computed(() => {
      return Object.entries(PAGE_PERMISSIONS).map(([path, info]) => ({
        path,
        name: info.name,
        description: info.description,
        requiresAuth: info.requiresAuth,
        requiresGuest: info.requiresGuest,
        requiresPermission: info.requiresPermission,
        requiresRoomPermission: info.requiresRoomPermission
      }))
    })
    
    // 过滤后的页面映射数据
    const filteredPageMappingData = computed(() => {
      if (!pageSearchQuery.value) return pageMappingData.value
      
      const query = pageSearchQuery.value.toLowerCase()
      return pageMappingData.value.filter(page => 
        page.name.toLowerCase().includes(query) || 
        page.path.toLowerCase().includes(query)
      )
    })
    
    // 分组权限
    const groupedPermissions = computed(() => {
      if (!selectedRole.value) return {}
      
      const permissions = getRolePermissions(selectedRole.value.role)
      const grouped = {}
      
      for (const category of Object.keys(PERMISSION_CATEGORIES)) {
        grouped[category] = []
      }
      
      for (const permission of permissions) {
        const info = getPermissionInfo(permission)
        if (info.category && grouped[info.category]) {
          grouped[info.category].push({
            permission,
            name: info.name,
            description: info.description,
            level: info.level
          })
        }
      }
      
      return grouped
    })
    
    // 显示角色权限
    const showRolePermissions = (role) => {
      selectedRole.value = role
      rolePermissionsVisible.value = true
    }
    
    // 测试页面访问
    const testPageAccess = (page) => {
      testPage.value = page.path
      activeTab.value = 'test'
    }
    
    // 运行权限测试
    const runPermissionTest = () => {
      if (!testRole.value || !testPage.value) {
        ElMessage.warning('请选择测试角色和页面')
        return
      }
      
      const userPermissions = getRolePermissions(testRole.value)
      const result = checkPageAccess(testRole.value, testPage.value, userPermissions)
      
      testResult.value = result
    }
    
    // 导出映射配置
    const exportMapping = () => {
      const mappingData = {
        roles: ROLE_INFO,
        permissions: PERMISSION_INFO,
        categories: PERMISSION_CATEGORIES,
        pages: PAGE_PERMISSIONS,
        rolePermissions: Object.fromEntries(
          Object.keys(ROLE_INFO).map(role => [
            role, 
            getRolePermissions(role)
          ])
        )
      }
      
      const dataStr = JSON.stringify(mappingData, null, 2)
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
      
      const exportFileDefaultName = `permission-mapping-${new Date().toISOString().slice(0, 10)}.json`
      
      const linkElement = document.createElement('a')
      linkElement.setAttribute('href', dataUri)
      linkElement.setAttribute('download', exportFileDefaultName)
      linkElement.click()
      
      ElMessage.success('权限映射配置已导出')
    }
    
    onMounted(() => {
      // 设置默认测试角色
      const roles = Object.keys(ROLE_INFO)
      if (roles.length > 0) {
        testRole.value = roles[0]
      }
      
      // 设置默认测试页面
      const pages = Object.keys(PAGE_PERMISSIONS)
      if (pages.length > 0) {
        testPage.value = pages[0]
      }
    })
    
    return {
      activeTab,
      pageSearchQuery,
      testRole,
      testPage,
      testResult,
      rolePermissionsVisible,
      selectedRole,
      roleMappingData,
      pageMappingData,
      filteredPageMappingData,
      groupedPermissions,
      ROLE_INFO,
      PAGE_PERMISSIONS,
      showRolePermissions,
      testPageAccess,
      runPermissionTest,
      exportMapping,
      getRolePermissions,
      getPermissionInfo
    }
  }
}
</script>

<style scoped>
.permission-mapping-manager {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.role-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.permission-requirements {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.role-option {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>