<template>
  <div class="role-management">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1>角色分配</h1>
          <p>管理系统中的用户角色和权限</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="showAddRoleDialog = true">
            <el-icon><Plus /></el-icon>
            添加角色
          </el-button>
          <el-button @click="exportRoles">
            <el-icon><Download /></el-icon>
            导出角色
          </el-button>
        </div>
      </el-header>
      
      <el-main class="role-content">
        <!-- 角色列表 -->
        <el-card class="role-list-card">
          <el-table :data="roleList" style="width: 100%" v-loading="loading">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="name" label="角色名称" width="150" />
            <el-table-column prop="description" label="角色描述" width="200" />
            <el-table-column prop="userCount" label="用户数量" width="100" />
            <el-table-column label="权限" width="300">
              <template #default="scope">
                <el-tag
                  v-for="permission in scope.row.permissions"
                  :key="permission"
                  size="small"
                  style="margin-right: 5px; margin-bottom: 5px"
                >
                  {{ getPermissionName(permission) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="createTime" label="创建时间" width="160" />
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="scope">
                <el-button type="primary" size="small" @click="viewRole(scope.row)">查看</el-button>
                <el-button size="small" @click="editRole(scope.row)">编辑</el-button>
                <el-button type="danger" size="small" @click="deleteRole(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
        
        <!-- 用户角色分配 -->
        <el-card class="user-role-card">
          <template #header>
            <div class="card-header">
              <span>用户角色分配</span>
              <el-button type="primary" size="small" @click="showAssignRoleDialog = true">
                <el-icon><User /></el-icon>
                分配角色
              </el-button>
            </div>
          </template>
          
          <el-table :data="userRoleList" style="width: 100%" v-loading="userLoading">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="username" label="用户名" width="120" />
            <el-table-column prop="realName" label="真实姓名" width="120" />
            <el-table-column prop="dormRoom" label="寝室号" width="100" />
            <el-table-column prop="role" label="当前角色" width="120">
              <template #default="scope">
                <el-tag :type="getRoleTagType(scope.row.role)">
                  {{ getRoleName(scope.row.role) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="assignTime" label="分配时间" width="160" />
            <el-table-column prop="assignBy" label="分配人" width="120" />
            <el-table-column label="操作" width="150" fixed="right">
              <template #default="scope">
                <el-button type="primary" size="small" @click="changeUserRole(scope.row)">更改角色</el-button>
                <el-button type="danger" size="small" @click="removeUserRole(scope.row)">移除角色</el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <!-- 分页 -->
          <div class="pagination-container">
            <el-pagination
              v-model:current-page="userCurrentPage"
              v-model:page-size="userPageSize"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="totalUsers"
              @size-change="handleUserSizeChange"
              @current-change="handleUserCurrentChange"
            />
          </div>
        </el-card>
      </el-main>
    </el-container>
    
    <!-- 添加/编辑角色对话框 -->
    <el-dialog
      v-model="showAddRoleDialog"
      :title="isEditRole ? '编辑角色' : '添加角色'"
      width="600px"
    >
      <el-form :model="roleForm" :rules="roleFormRules" ref="roleFormRef" label-width="80px">
        <el-form-item label="角色名称" prop="name">
          <el-input v-model="roleForm.name" :disabled="isEditRole" />
        </el-form-item>
        
        <el-form-item label="角色描述" prop="description">
          <el-input v-model="roleForm.description" type="textarea" rows="3" />
        </el-form-item>
        
        <el-form-item label="权限配置" prop="permissions">
          <el-checkbox-group v-model="roleForm.permissions">
            <el-row>
              <el-col :span="8" v-for="permission in allPermissions" :key="permission.value">
                <el-checkbox :label="permission.value">{{ permission.label }}</el-checkbox>
              </el-col>
            </el-row>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddRoleDialog = false">取消</el-button>
          <el-button type="primary" @click="saveRole">确定</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 角色详情对话框 -->
    <el-dialog v-model="showRoleDetailDialog" title="角色详情" width="600px">
      <div v-if="currentRole" class="role-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ currentRole.id }}</el-descriptions-item>
          <el-descriptions-item label="角色名称">{{ currentRole.name }}</el-descriptions-item>
          <el-descriptions-item label="角色描述" :span="2">{{ currentRole.description }}</el-descriptions-item>
          <el-descriptions-item label="用户数量">{{ currentRole.userCount }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ currentRole.createTime }}</el-descriptions-item>
        </el-descriptions>
        
        <div class="role-permissions">
          <h3>角色权限</h3>
          <el-tag
            v-for="permission in currentRole.permissions"
            :key="permission"
            size="large"
            style="margin-right: 10px; margin-bottom: 10px"
          >
            {{ getPermissionName(permission) }}
          </el-tag>
        </div>
        
        <div class="role-users">
          <h3>角色用户</h3>
          <el-table :data="currentRole.users" style="width: 100%">
            <el-table-column prop="username" label="用户名" width="120" />
            <el-table-column prop="realName" label="真实姓名" width="120" />
            <el-table-column prop="dormRoom" label="寝室号" width="100" />
            <el-table-column prop="assignTime" label="分配时间" />
          </el-table>
        </div>
      </div>
    </el-dialog>
    
    <!-- 分配角色对话框 -->
    <el-dialog v-model="showAssignRoleDialog" title="分配角色" width="500px">
      <el-form :model="assignRoleForm" label-width="80px">
        <el-form-item label="选择用户" prop="userId">
          <el-select
            v-model="assignRoleForm.userId"
            placeholder="请选择用户"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="user in availableUsers"
              :key="user.id"
              :label="`${user.username} (${user.realName})`"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="选择角色" prop="roleId">
          <el-select
            v-model="assignRoleForm.roleId"
            placeholder="请选择角色"
            style="width: 100%"
          >
            <el-option
              v-for="role in roleList"
              :key="role.id"
              :label="role.name"
              :value="role.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAssignRoleDialog = false">取消</el-button>
          <el-button type="primary" @click="assignRole">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Download, User } from '@element-plus/icons-vue'

// 角色列表
const roleList = ref([
  {
    id: 1,
    name: 'admin',
    description: '系统管理员，拥有所有权限',
    userCount: 2,
    permissions: ['user_manage', 'role_manage', 'expense_manage', 'bill_manage', 'system_config'],
    createTime: '2023-10-01 10:00:00',
    users: [
      { id: 1, username: 'admin', realName: '管理员', dormRoom: 'A101', assignTime: '2023-10-01 10:00:00' },
      { id: 2, username: 'superadmin', realName: '超级管理员', dormRoom: 'A102', assignTime: '2023-10-02 11:00:00' }
    ]
  },
  {
    id: 2,
    name: 'dorm_leader',
    description: '寝室长，可以管理本寝室的费用和账单',
    userCount: 5,
    permissions: ['expense_manage', 'bill_manage'],
    createTime: '2023-10-01 10:30:00',
    users: [
      { id: 3, username: 'zhangsan', realName: '张三', dormRoom: 'B201', assignTime: '2023-10-05 14:00:00' },
      { id: 4, username: 'lisi', realName: '李四', dormRoom: 'B202', assignTime: '2023-10-06 15:00:00' }
    ]
  },
  {
    id: 3,
    name: 'user',
    description: '普通用户，只能查看和管理自己的费用',
    userCount: 20,
    permissions: ['expense_view', 'bill_view'],
    createTime: '2023-10-01 11:00:00',
    users: [
      { id: 5, username: 'wangwu', realName: '王五', dormRoom: 'C301', assignTime: '2023-10-08 16:00:00' },
      { id: 6, username: 'zhaoliu', realName: '赵六', dormRoom: 'C302', assignTime: '2023-10-09 17:00:00' }
    ]
  }
])

// 用户角色列表
const userRoleList = ref([
  {
    id: 1,
    username: 'admin',
    realName: '管理员',
    dormRoom: 'A101',
    role: 'admin',
    assignTime: '2023-10-01 10:00:00',
    assignBy: 'system'
  },
  {
    id: 2,
    username: 'zhangsan',
    realName: '张三',
    dormRoom: 'B201',
    role: 'dorm_leader',
    assignTime: '2023-10-05 14:00:00',
    assignBy: 'admin'
  },
  {
    id: 3,
    username: 'lisi',
    realName: '李四',
    dormRoom: 'B201',
    role: 'user',
    assignTime: '2023-10-08 16:00:00',
    assignBy: 'admin'
  },
  {
    id: 4,
    username: 'wangwu',
    realName: '王五',
    dormRoom: 'C301',
    role: 'user',
    assignTime: '2023-10-10 09:00:00',
    assignBy: 'admin'
  }
])

// 可分配用户列表
const availableUsers = ref([
  { id: 7, username: 'qianqi', realName: '钱七' },
  { id: 8, username: 'sunba', realName: '孙八' },
  { id: 9, username: 'zhoujiu', realName: '周九' }
])

// 所有权限列表
const allPermissions = ref([
  { value: 'user_manage', label: '用户管理' },
  { value: 'role_manage', label: '角色管理' },
  { value: 'expense_manage', label: '费用管理' },
  { value: 'expense_view', label: '费用查看' },
  { value: 'bill_manage', label: '账单管理' },
  { value: 'bill_view', label: '账单查看' },
  { value: 'system_config', label: '系统配置' }
])

// 分页相关
const userCurrentPage = ref(1)
const userPageSize = ref(10)
const totalUsers = ref(100)

// 加载状态
const loading = ref(false)
const userLoading = ref(false)

// 对话框状态
const showAddRoleDialog = ref(false)
const showRoleDetailDialog = ref(false)
const showAssignRoleDialog = ref(false)
const isEditRole = ref(false)
const currentRole = ref(null)
const roleFormRef = ref(null)

// 角色表单
const roleForm = reactive({
  id: null,
  name: '',
  description: '',
  permissions: []
})

// 分配角色表单
const assignRoleForm = reactive({
  userId: null,
  roleId: null
})

// 表单验证规则
const roleFormRules = {
  name: [
    { required: true, message: '请输入角色名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入角色描述', trigger: 'blur' }
  ],
  permissions: [
    { type: 'array', required: true, message: '请至少选择一个权限', trigger: 'change' }
  ]
}

// 获取角色名称
const getRoleName = (role) => {
  const roleMap = {
    admin: '管理员',
    dorm_leader: '寝室长',
    user: '普通用户'
  }
  return roleMap[role] || '未知'
}

// 获取角色标签类型
const getRoleTagType = (role) => {
  const typeMap = {
    admin: 'danger',
    dorm_leader: 'warning',
    user: 'info'
  }
  return typeMap[role] || 'info'
}

// 获取权限名称
const getPermissionName = (permission) => {
  const permissionObj = allPermissions.value.find(p => p.value === permission)
  return permissionObj ? permissionObj.label : permission
}

// 查看角色详情
const viewRole = (role) => {
  currentRole.value = { ...role }
  showRoleDetailDialog.value = true
}

// 编辑角色
const editRole = (role) => {
  isEditRole.value = true
  Object.assign(roleForm, role)
  showAddRoleDialog.value = true
}

// 删除角色
const deleteRole = (role) => {
  ElMessageBox.confirm(
    `确定要删除角色 "${role.name}" 吗？此操作不可恢复！`,
    '删除角色',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(() => {
      // 模拟API调用
      const index = roleList.value.findIndex(r => r.id === role.id)
      if (index !== -1) {
        roleList.value.splice(index, 1)
        ElMessage.success('删除成功')
      }
    })
    .catch(() => {
      ElMessage.info('已取消操作')
    })
}

// 保存角色
const saveRole = () => {
  roleFormRef.value.validate((valid) => {
    if (valid) {
      if (isEditRole.value) {
        // 编辑角色
        const index = roleList.value.findIndex(r => r.id === roleForm.id)
        if (index !== -1) {
          roleList.value[index] = { ...roleForm }
          ElMessage.success('更新成功')
        }
      } else {
        // 添加角色
        const newRole = {
          ...roleForm,
          id: roleList.value.length + 1,
          userCount: 0,
          createTime: new Date().toLocaleString(),
          users: []
        }
        roleList.value.unshift(newRole)
        ElMessage.success('添加成功')
      }
      showAddRoleDialog.value = false
      resetRoleForm()
    }
  })
}

// 分配角色
const assignRole = () => {
  if (!assignRoleForm.userId || !assignRoleForm.roleId) {
    ElMessage.warning('请选择用户和角色')
    return
  }
  
  // 模拟API调用
  const user = availableUsers.value.find(u => u.id === assignRoleForm.userId)
  const role = roleList.value.find(r => r.id === assignRoleForm.roleId)
  
  if (user && role) {
    const newUserRole = {
      id: userRoleList.value.length + 1,
      username: user.username,
      realName: user.realName,
      dormRoom: user.dormRoom || '未分配',
      role: role.name,
      assignTime: new Date().toLocaleString(),
      assignBy: 'admin'
    }
    
    userRoleList.value.unshift(newUserRole)
    
    // 更新角色用户数量
    role.userCount += 1
    
    // 从可用用户列表中移除
    const index = availableUsers.value.findIndex(u => u.id === assignRoleForm.userId)
    if (index !== -1) {
      availableUsers.value.splice(index, 1)
    }
    
    ElMessage.success('角色分配成功')
    showAssignRoleDialog.value = false
    resetAssignRoleForm()
  }
}

// 更改用户角色
const changeUserRole = (user) => {
  ElMessageBox.prompt('请选择新角色', '更改角色', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputType: 'select',
    inputOptions: roleList.value.map(role => ({
      value: role.name,
      label: role.name
    })),
    inputValue: user.role
  })
    .then(({ value }) => {
      // 模拟API调用
      user.role = value
      user.assignTime = new Date().toLocaleString()
      ElMessage.success('角色更改成功')
    })
    .catch(() => {
      ElMessage.info('已取消操作')
    })
}

// 移除用户角色
const removeUserRole = (user) => {
  ElMessageBox.confirm(
    `确定要移除用户 "${user.username}" 的角色吗？`,
    '移除角色',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(() => {
      // 模拟API调用
      const index = userRoleList.value.findIndex(u => u.id === user.id)
      if (index !== -1) {
        userRoleList.value.splice(index, 1)
        
        // 更新角色用户数量
        const role = roleList.value.find(r => r.name === user.role)
        if (role) {
          role.userCount -= 1
        }
        
        // 添加到可用用户列表
        availableUsers.value.push({
          id: user.id,
          username: user.username,
          realName: user.realName
        })
        
        ElMessage.success('角色移除成功')
      }
    })
    .catch(() => {
      ElMessage.info('已取消操作')
    })
}

// 导出角色
const exportRoles = () => {
  ElMessage.success('角色数据导出成功')
}

// 重置角色表单
const resetRoleForm = () => {
  roleForm.id = null
  roleForm.name = ''
  roleForm.description = ''
  roleForm.permissions = []
  isEditRole.value = false
}

// 重置分配角色表单
const resetAssignRoleForm = () => {
  assignRoleForm.userId = null
  assignRoleForm.roleId = null
}

// 处理分页大小变化
const handleUserSizeChange = (size) => {
  userPageSize.value = size
  userCurrentPage.value = 1
  // 重新加载数据
  loadUserRoleList()
}

// 处理当前页变化
const handleUserCurrentChange = (page) => {
  userCurrentPage.value = page
  // 重新加载数据
  loadUserRoleList()
}

// 加载用户角色列表
const loadUserRoleList = () => {
  userLoading.value = true
  // 模拟API调用
  setTimeout(() => {
    userLoading.value = false
  }, 500)
}

// 组件挂载时加载数据
onMounted(() => {
  loadUserRoleList()
})
</script>

<style scoped>
.role-management {
  height: 100vh;
  overflow: hidden;
}

.page-header {
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.header-content h1 {
  margin: 0 0 5px 0;
  color: #303133;
}

.header-content p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.role-content {
  padding: 20px;
  overflow-y: auto;
}

.role-list-card {
  margin-bottom: 20px;
}

.user-role-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.role-detail {
  padding: 10px 0;
}

.role-permissions {
  margin-top: 20px;
}

.role-permissions h3 {
  margin-bottom: 15px;
  color: #303133;
}

.role-users {
  margin-top: 20px;
}

.role-users h3 {
  margin-bottom: 15px;
  color: #303133;
}
</style>