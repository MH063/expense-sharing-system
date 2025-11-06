<template>
  <div class="role-management">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <div class="page-title">
            <h1>角色管理</h1>
            <p>管理系统角色和权限分配，控制用户访问权限</p>
          </div>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="showAddRoleDialog = true">
            <el-icon><Plus /></el-icon>
            添加角色
          </el-button>
          <el-button type="success" @click="exportRoles">
            <el-icon><Download /></el-icon>
            导出角色
          </el-button>
        </div>
      </el-header>
      
      <el-main class="role-content">
        <!-- 角色列表 -->
        <el-card class="role-list-card">
          <template #header>
            <div class="section-header">
              <h2>角色列表</h2>
              <div class="section-actions">
                <el-input
                  v-model="roleSearchQuery"
                  placeholder="搜索角色名称或描述"
                  prefix-icon="Search"
                  clearable
                  class="search-input"
                />
                <el-select
                  v-model="roleStatusFilter"
                  placeholder="状态筛选"
                  clearable
                  class="filter-select"
                >
                  <el-option label="全部" value="" />
                  <el-option label="启用" value="active" />
                  <el-option label="禁用" value="inactive" />
                </el-select>
              </div>
            </div>
          </template>
          
          <div class="roles-grid" v-loading="loading">
            <div
              v-for="role in filteredRoles"
              :key="role.id"
              class="role-card"
              :class="{ 'inactive': role.status === 'inactive' }"
            >
              <div class="role-card-header">
                <div class="role-icon">
                  <el-icon size="24"><User /></el-icon>
                </div>
                <div class="role-info">
                  <h3>{{ role.name }}</h3>
                  <p>{{ role.description }}</p>
                </div>
                <div class="role-status">
                  <el-tag :type="role.status === 'active' ? 'success' : 'danger'">
                    {{ role.status === 'active' ? '启用' : '禁用' }}
                  </el-tag>
                </div>
              </div>
              
              <div class="role-card-content">
                <div class="role-stats">
                  <div class="stat-item">
                    <span class="stat-label">权限数量</span>
                    <span class="stat-value">{{ role.permissions.length }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">用户数量</span>
                    <span class="stat-value">{{ role.userCount }}</span>
                  </div>
                  <div class="stat-item">
                    <span class="stat-label">创建时间</span>
                    <span class="stat-value">{{ role.createTime }}</span>
                  </div>
                </div>
                
                <div class="role-permissions">
                  <h4>权限列表</h4>
                  <div class="permission-tags">
                    <el-tag
                      v-for="permission in role.permissions.slice(0, 3)"
                      :key="permission"
                      size="small"
                      class="permission-tag"
                    >
                      {{ getPermissionName(permission) }}
                    </el-tag>
                    <el-tag
                      v-if="role.permissions.length > 3"
                      size="small"
                      type="info"
                      class="permission-tag"
                    >
                      +{{ role.permissions.length - 3 }}
                    </el-tag>
                  </div>
                </div>
              </div>
              
              <div class="role-card-actions">
                <el-button size="small" @click="viewRole(role)">查看详情</el-button>
                <el-button size="small" type="primary" @click="editRole(role)">编辑</el-button>
                <el-button
                  size="small"
                  :type="role.status === 'active' ? 'warning' : 'success'"
                  @click="toggleRoleStatus(role)"
                >
                  {{ role.status === 'active' ? '禁用' : '启用' }}
                </el-button>
                <el-button size="small" type="danger" @click="deleteRole(role)">删除</el-button>
              </div>
            </div>
          </div>
          
          <!-- 分页 -->
          <div class="pagination-container">
            <el-pagination
              v-model:current-page="roleCurrentPage"
              v-model:page-size="rolePageSize"
              :page-sizes="[6, 12, 18, 24]"
              :total="filteredRoles.length"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleRoleSizeChange"
              @current-change="handleRoleCurrentChange"
            />
          </div>
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
    
    <!-- 导出角色对话框 -->
    <el-dialog v-model="showExportDialog" title="导出角色数据" width="400px">
      <el-form :model="exportForm" label-width="80px">
        <el-form-item label="导出格式">
          <el-radio-group v-model="exportForm.format">
            <el-radio label="excel">Excel格式</el-radio>
            <el-radio label="pdf">PDF格式</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="包含内容">
          <el-checkbox-group v-model="exportForm.content">
            <el-checkbox label="roles">角色信息</el-checkbox>
            <el-checkbox label="permissions">权限详情</el-checkbox>
            <el-checkbox label="users">用户分配</el-checkbox>
          </el-checkbox-group>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showExportDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmExport">确定导出</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Download, User } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

// 角色列表（来自真实接口）
const roleList = ref([])


// 用户角色数据（来自真实接口）
const userRoleList = ref([])


// 可分配用户列表（来自真实接口）
const availableUsers = ref([])


// 所有权限列表（来自真实接口）
const allPermissions = ref([])


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
const showExportDialog = ref(false)
const isEditRole = ref(false)
const currentRole = ref(null)
const roleFormRef = ref(null)

// 导出表单
const exportForm = reactive({
  format: 'excel',
  content: ['roles', 'permissions', 'users']
})

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
    .then(async () => {
      try {
        const resp = await roleApi.deleteRole(role.id)
        if (resp && resp.success) {
          ElMessage.success('删除成功')
          const rolesResp = await roleApi.getRoleList()
          if (rolesResp && rolesResp.success) {
            roleList.value = rolesResp.data || []
          }
        } else {
          throw new Error(resp?.message || '删除失败')
        }
      } catch (e) {
        console.error('删除角色失败', e)
        ElMessage.error('删除角色失败')
      }
    })
    .catch(() => {
      ElMessage.info('已取消操作')
    })
}

// 保存角色
const saveRole = async () => {
  roleFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (isEditRole.value) {
          const resp = await roleApi.updateRole(roleForm.id, {
            description: roleForm.description,
            permissions: roleForm.permissions
          })
          if (resp && resp.success) {
            ElMessage.success('更新成功')
          } else {
            throw new Error(resp?.message || '更新失败')
          }
        } else {
          const resp = await roleApi.createRole({
            name: roleForm.name,
            description: roleForm.description,
            permissions: roleForm.permissions
          })
          if (resp && resp.success) {
            ElMessage.success('添加成功')
          } else {
            throw new Error(resp?.message || '添加失败')
          }
        }
        showAddRoleDialog.value = false
        resetRoleForm()
        // 重新加载角色列表
        const rolesResp = await roleApi.getRoleList()
        if (rolesResp && rolesResp.success) {
          roleList.value = rolesResp.data || []
        }
      } catch (e) {
        console.error('保存角色失败', e)
        ElMessage.error('保存角色失败')
      }
    }
  })
}

// 分配角色
const assignRole = async () => {
  if (!assignRoleForm.userId || !assignRoleForm.roleId) {
    ElMessage.warning('请选择用户和角色')
    return
  }
  try {
    const resp = await userApi.assignRole(assignRoleForm.userId, { roleId: assignRoleForm.roleId })
    if (resp && resp.success) {
      ElMessage.success('角色分配成功')
      showAssignRoleDialog.value = false
      resetAssignRoleForm()
      // 刷新用户列表
      const usersResp = await userApi.getUserList({ page: userCurrentPage.value, pageSize: userPageSize.value })
      if (usersResp && usersResp.success) {
        const users = usersResp.data?.data || usersResp.data || []
        availableUsers.value = users.map(u => ({ id: u.id, username: u.username, realName: u.realName }))
      }
    } else {
      throw new Error(resp?.message || '分配失败')
    }
  } catch (e) {
    console.error('分配角色失败', e)
    ElMessage.error('分配角色失败')
  }
}

// 更改用户角色
const changeUserRole = (user) => {
  ElMessageBox.prompt('请选择新角色', '更改角色', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputType: 'select',
    inputOptions: roleList.value.map(role => ({
      value: role.id,
      label: role.name
    })),
    inputValue: null
  })
    .then(async ({ value }) => {
      try {
        const resp = await userApi.updateUserRole(user.id, { roleId: value })
        if (resp && resp.success) {
          ElMessage.success('角色更改成功')
          const usersResp = await userApi.getUserList({ page: userCurrentPage.value, pageSize: userPageSize.value })
          if (usersResp && usersResp.success) {
            const users = usersResp.data?.data || usersResp.data || []
            availableUsers.value = users.map(u => ({ id: u.id, username: u.username, realName: u.realName }))
          }
        } else {
          throw new Error(resp?.message || '更改失败')
        }
      } catch (e) {
        console.error('更改角色失败', e)
        ElMessage.error('更改角色失败')
      }
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

// 导出角色数据
const exportRoles = () => {
  showExportDialog.value = true
}

// 确认导出
const confirmExport = () => {
  if (!exportForm.content || exportForm.content.length === 0) {
    ElMessage.warning('请至少选择一种导出内容')
    return
  }
  
  // 准备导出数据
  const exportData = prepareExportData(exportForm.content)
  
  if (exportForm.format === 'excel') {
    exportToExcel(exportData)
  } else if (exportForm.format === 'pdf') {
    exportToPDF(exportData)
  }
  
  showExportDialog.value = false
  ElMessage.success('导出成功')
}

// 准备导出数据
const prepareExportData = (content) => {
  const data = {}
  
  if (content.includes('roles')) {
    data.roles = roleList.value.map(role => ({
      '角色ID': role.id,
      '角色名称': role.name,
      '角色描述': role.description,
      '用户数量': role.userCount,
      '创建时间': role.createTime
    }))
  }
  
  if (content.includes('permissions')) {
    const permissionsData = []
    roleList.value.forEach(role => {
      role.permissions.forEach(permission => {
        permissionsData.push({
          '角色名称': role.name,
          '权限名称': getPermissionName(permission),
          '权限代码': permission
        })
      })
    })
    data.permissions = permissionsData
  }
  
  if (content.includes('users')) {
    const usersData = []
    userRoleList.value.forEach(user => {
      usersData.push({
        '用户ID': user.userId,
        '用户名': user.username,
        '真实姓名': user.realName,
        '角色名称': user.roleName,
        '分配时间': user.assignTime,
        '分配人': user.assignBy,
        '状态': user.status === 'active' ? '激活' : '禁用'
      })
    })
    data.users = usersData
  }
  
  return data
}

// 导出为Excel
const exportToExcel = (data) => {
  const wb = XLSX.utils.book_new()
  
  if (data.roles) {
    const ws = XLSX.utils.json_to_sheet(data.roles)
    XLSX.utils.book_append_sheet(wb, ws, '角色信息')
  }
  
  if (data.permissions) {
    const ws = XLSX.utils.json_to_sheet(data.permissions)
    XLSX.utils.book_append_sheet(wb, ws, '权限详情')
  }
  
  if (data.users) {
    const ws = XLSX.utils.json_to_sheet(data.users)
    XLSX.utils.book_append_sheet(wb, ws, '用户分配')
  }
  
  const fileName = `角色管理_${new Date().toLocaleDateString()}.xlsx`
  XLSX.writeFile(wb, fileName)
}

// 导出为PDF
const exportToPDF = (data) => {
  const doc = new jsPDF()
  let yPosition = 20
  
  // 添加标题
  doc.setFontSize(16)
  doc.text('角色管理报告', 105, yPosition, { align: 'center' })
  yPosition += 20
  
  // 添加导出时间
  doc.setFontSize(10)
  doc.text(`导出时间: ${new Date().toLocaleString()}`, 105, yPosition, { align: 'center' })
  yPosition += 20
  
  if (data.roles) {
    // 添加角色信息
    doc.setFontSize(14)
    doc.text('角色信息', 20, yPosition)
    yPosition += 10
    
    doc.setFontSize(10)
    data.roles.forEach((role, index) => {
      if (yPosition > 270) {
        doc.addPage()
        yPosition = 20
      }
      
      doc.text(`${index + 1}. ${role['角色名称']} (${role['角色ID']})`, 25, yPosition)
      yPosition += 7
      doc.text(`   描述: ${role['角色描述']}`, 25, yPosition)
      yPosition += 7
      doc.text(`   用户数量: ${role['用户数量']}`, 25, yPosition)
      yPosition += 7
      doc.text(`   创建时间: ${role['创建时间']}`, 25, yPosition)
      yPosition += 10
    })
    yPosition += 10
  }
  
  if (data.permissions) {
    // 添加权限详情
    if (yPosition > 250) {
      doc.addPage()
      yPosition = 20
    }
    
    doc.setFontSize(14)
    doc.text('权限详情', 20, yPosition)
    yPosition += 10
    
    doc.setFontSize(10)
    data.permissions.forEach((permission, index) => {
      if (yPosition > 270) {
        doc.addPage()
        yPosition = 20
      }
      
      doc.text(`${index + 1}. 角色: ${permission['角色名称']}`, 25, yPosition)
      yPosition += 7
      doc.text(`   权限: ${permission['权限名称']} (${permission['权限代码']})`, 25, yPosition)
      yPosition += 10
    })
    yPosition += 10
  }
  
  if (data.users) {
    // 添加用户分配
    if (yPosition > 250) {
      doc.addPage()
      yPosition = 20
    }
    
    doc.setFontSize(14)
    doc.text('用户分配', 20, yPosition)
    yPosition += 10
    
    doc.setFontSize(10)
    data.users.forEach((user, index) => {
      if (yPosition > 270) {
        doc.addPage()
        yPosition = 20
      }
      
      doc.text(`${index + 1}. ${user['真实姓名']} (${user['用户名']})`, 25, yPosition)
      yPosition += 7
      doc.text(`   角色: ${user['角色名称']}`, 25, yPosition)
      yPosition += 7
      doc.text(`   分配时间: ${user['分配时间']}`, 25, yPosition)
      yPosition += 7
      doc.text(`   分配人: ${user['分配人']}`, 25, yPosition)
      yPosition += 7
      doc.text(`   状态: ${user['状态']}`, 25, yPosition)
      yPosition += 10
    })
  }
  
  // 保存PDF
  const fileName = `角色管理_${new Date().toLocaleDateString()}.pdf`
  doc.save(fileName)
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
  loadUserRoleList()
}

// 处理当前页变化
const handleUserCurrentChange = (page) => {
  userCurrentPage.value = page
  loadUserRoleList()
}

// 加载用户角色列表
const loadUserRoleList = async () => {
  userLoading.value = true
  try {
    const usersResp = await userApi.getUserList({ page: userCurrentPage.value, pageSize: userPageSize.value })
    if (usersResp && usersResp.success) {
      const users = usersResp.data?.data || usersResp.data || []
      availableUsers.value = users.map(u => ({ id: u.id, username: u.username, realName: u.realName }))
      totalUsers.value = usersResp.data?.total || users.length
    }
  } catch (e) {
    console.error('加载用户列表失败', e)
  } finally {
    userLoading.value = false
  }
}

// 搜索和筛选相关
const roleSearchQuery = ref('')
const roleStatusFilter = ref('')
const roleCurrentPage = ref(1)
const rolePageSize = ref(6)

// 计算属性
const filteredRoles = computed(() => {
  let result = roleList.value
  
  // 按状态筛选
  if (roleStatusFilter.value) {
    result = result.filter(role => role.status === roleStatusFilter.value)
  }
  
  // 按搜索关键词筛选
  if (roleSearchQuery.value) {
    const query = roleSearchQuery.value.toLowerCase()
    result = result.filter(role => 
      role.name.toLowerCase().includes(query) || 
      role.description.toLowerCase().includes(query)
    )
  }
  
  return result
})

const paginatedRoles = computed(() => {
  const start = (roleCurrentPage.value - 1) * rolePageSize.value
  const end = start + rolePageSize.value
  return filteredRoles.value.slice(start, end)
})

// 处理角色分页
const handleRoleSizeChange = (size) => {
  rolePageSize.value = size
  roleCurrentPage.value = 1
}

const handleRoleCurrentChange = (page) => {
  roleCurrentPage.value = page
}

// 切换角色状态
const toggleRoleStatus = (role) => {
  const action = role.status === 'active' ? '禁用' : '启用'
  ElMessageBox.confirm(
    `确定要${action}角色 "${role.name}" 吗？`,
    `${action}角色`,
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(() => {
      // 更新角色状态
      role.status = role.status === 'active' ? 'inactive' : 'active'
      
      // 如果禁用角色，同时禁用所有拥有该角色的用户
      if (role.status === 'inactive') {
        userRoleList.value.forEach(user => {
          if (user.role === role.name) {
            user.status = 'inactive'
          }
        })
      } else {
        // 如果启用角色，同时启用所有拥有该角色的用户
        userRoleList.value.forEach(user => {
          if (user.role === role.name) {
            user.status = 'active'
          }
        })
      }
      
      ElMessage.success(`${action}成功`)
    })
    .catch(() => {
      ElMessage.info('已取消操作')
    })
}

// 组件挂载时加载数据
import { roleApi, userApi } from '@/api'
onMounted(async () => {
  try {
    loading.value = true
    const [rolesResp, usersResp, permsResp] = await Promise.all([
      roleApi.getRoleList(),
      userApi.getUserList({ page: 1, pageSize: 100 }),
      roleApi.getPermissionList()
    ])
    if (rolesResp && rolesResp.success) {
      roleList.value = rolesResp.data || []
    }
    if (usersResp && usersResp.success) {
      const users = usersResp.data?.data || usersResp.data || []
      availableUsers.value = users.map(u => ({ id: u.id, username: u.username, realName: u.realName }))
    }
    if (permsResp && permsResp.success) {
      const perms = permsResp.data || []
      allPermissions.value = perms.map(p => ({ value: p.code || p.value, label: p.name || p.label }))
    }
  } catch (e) {
    console.error('加载角色/用户/权限失败', e)
  } finally {
    loading.value = false
  }
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

/* 角色卡片网格布局 */
.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.role-card {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 20px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.04);
}

.role-card:hover {
  box-shadow: 0 4px 20px 0 rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.role-card.inactive {
  opacity: 0.7;
  background-color: #f9f9f9;
}

.role-card-header {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
}

.role-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  background-color: #f0f9ff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  color: #409eff;
}

.role-info {
  flex-grow: 1;
}

.role-info h3 {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 4px 0;
}

.role-info p {
  font-size: 14px;
  color: #606266;
  margin: 0;
  line-height: 1.4;
}

.role-status {
  flex-shrink: 0;
}

.role-card-content {
  margin-bottom: 16px;
}

.role-stats {
  display: flex;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.stat-value {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.role-permissions h4 {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.permission-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.permission-tag {
  margin: 0;
}

.role-card-actions {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.role-card-actions .el-button {
  flex: 1;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .header-actions {
    margin-top: 16px;
    justify-content: flex-start;
  }
  
  .section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
  
  .section-actions {
    flex-direction: column;
  }
  
  .search-input {
    width: 100%;
  }
  
  .filter-select {
    width: 100%;
  }
  
  .roles-grid {
    grid-template-columns: 1fr;
  }
  
  .role-stats {
    flex-direction: column;
    gap: 8px;
  }
  
  .stat-item {
    display: flex;
    justify-content: space-between;
    text-align: left;
  }
  
  .role-card-actions {
    flex-wrap: wrap;
  }
  
  .role-card-actions .el-button {
    flex: 1 0 45%;
  }
}
</style>