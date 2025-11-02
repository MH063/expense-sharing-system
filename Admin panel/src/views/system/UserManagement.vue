<template>
  <div class="user-management">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1>用户管理</h1>
          <p>管理系统中的所有用户账户</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="showAddUserDialog = true">
            <el-icon><Plus /></el-icon>
            添加用户
          </el-button>
          <el-button @click="exportUsers">
            <el-icon><Download /></el-icon>
            导出用户
          </el-button>
        </div>
      </el-header>
      
      <el-main class="user-content">
        <!-- 搜索和筛选区域 -->
        <el-card class="search-card">
          <el-form :model="searchForm" inline>
            <el-form-item label="用户名">
              <el-input
                v-model="searchForm.username"
                placeholder="请输入用户名"
                clearable
              />
            </el-form-item>
            
            <el-form-item label="角色">
              <el-select
                v-model="searchForm.role"
                placeholder="请选择角色"
                clearable
              >
                <el-option label="全部" value="" />
                <el-option label="管理员" value="admin" />
                <el-option label="寝室长" value="dorm_leader" />
                <el-option label="普通用户" value="user" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="状态">
              <el-select
                v-model="searchForm.status"
                placeholder="请选择状态"
                clearable
              >
                <el-option label="全部" value="" />
                <el-option label="正常" value="active" />
                <el-option label="禁用" value="disabled" />
              </el-select>
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="handleSearch">搜索</el-button>
              <el-button @click="resetSearch">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
        
        <!-- 用户列表 -->
        <el-card class="user-list-card">
          <el-table :data="userList" style="width: 100%" v-loading="loading">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="username" label="用户名" width="120" />
            <el-table-column prop="realName" label="真实姓名" width="120" />
            <el-table-column prop="email" label="邮箱" width="180" />
            <el-table-column prop="phone" label="手机号" width="120" />
            <el-table-column prop="dormRoom" label="寝室号" width="100" />
            <el-table-column prop="role" label="角色" width="100">
              <template #default="scope">
                <el-tag :type="getRoleTagType(scope.row.role)">
                  {{ getRoleName(scope.row.role) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="100">
              <template #default="scope">
                <el-tag :type="scope.row.status === 'active' ? 'success' : 'danger'">
                  {{ scope.row.status === 'active' ? '正常' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="lastLoginTime" label="最后登录" width="160" />
            <el-table-column prop="createTime" label="创建时间" width="160" />
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="scope">
                <el-button type="primary" size="small" @click="viewUser(scope.row)">查看</el-button>
                <el-button size="small" @click="editUser(scope.row)">编辑</el-button>
                <el-button
                  :type="scope.row.status === 'active' ? 'danger' : 'success'"
                  size="small"
                  @click="toggleUserStatus(scope.row)"
                >
                  {{ scope.row.status === 'active' ? '禁用' : '启用' }}
                </el-button>
                <el-button type="danger" size="small" @click="deleteUser(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <!-- 分页 -->
          <div class="pagination-container">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="totalUsers"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </el-card>
      </el-main>
    </el-container>
    
    <!-- 添加/编辑用户对话框 -->
    <el-dialog
      v-model="showAddUserDialog"
      :title="isEdit ? '编辑用户' : '添加用户'"
      width="600px"
    >
      <el-form :model="userForm" :rules="userFormRules" ref="userFormRef" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" :disabled="isEdit" />
        </el-form-item>
        
        <el-form-item label="密码" prop="password" v-if="!isEdit">
          <el-input v-model="userForm.password" type="password" show-password />
        </el-form-item>
        
        <el-form-item label="真实姓名" prop="realName">
          <el-input v-model="userForm.realName" />
        </el-form-item>
        
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="userForm.email" />
        </el-form-item>
        
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="userForm.phone" />
        </el-form-item>
        
        <el-form-item label="寝室号" prop="dormRoom">
          <el-input v-model="userForm.dormRoom" />
        </el-form-item>
        
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="寝室长" value="dorm_leader" />
            <el-option label="普通用户" value="user" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="userForm.status">
            <el-radio label="active">正常</el-radio>
            <el-radio label="disabled">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddUserDialog = false">取消</el-button>
          <el-button type="primary" @click="saveUser">确定</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 用户详情对话框 -->
    <el-dialog v-model="showUserDetailDialog" title="用户详情" width="600px">
      <div v-if="currentUser" class="user-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ currentUser.id }}</el-descriptions-item>
          <el-descriptions-item label="用户名">{{ currentUser.username }}</el-descriptions-item>
          <el-descriptions-item label="真实姓名">{{ currentUser.realName }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ currentUser.email }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ currentUser.phone }}</el-descriptions-item>
          <el-descriptions-item label="寝室号">{{ currentUser.dormRoom }}</el-descriptions-item>
          <el-descriptions-item label="角色">
            <el-tag :type="getRoleTagType(currentUser.role)">
              {{ getRoleName(currentUser.role) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentUser.status === 'active' ? 'success' : 'danger'">
              {{ currentUser.status === 'active' ? '正常' : '禁用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="最后登录">{{ currentUser.lastLoginTime }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ currentUser.createTime }}</el-descriptions-item>
        </el-descriptions>
        
        <div class="user-stats">
          <h3>用户统计</h3>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-statistic title="创建费用记录" :value="currentUser.createdExpenses" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="参与分摊" :value="currentUser.participatedShares" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="支付次数" :value="currentUser.paymentCount" />
            </el-col>
          </el-row>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Download } from '@element-plus/icons-vue'

// 搜索表单
const searchForm = reactive({
  username: '',
  role: '',
  status: ''
})

// 用户列表
const userList = ref([
  {
    id: 1,
    username: 'admin',
    realName: '管理员',
    email: 'admin@example.com',
    phone: '13800138000',
    dormRoom: 'A101',
    role: 'admin',
    status: 'active',
    lastLoginTime: '2023-11-20 09:30:15',
    createTime: '2023-10-01 10:00:00',
    createdExpenses: 15,
    participatedShares: 23,
    paymentCount: 18
  },
  {
    id: 2,
    username: 'zhangsan',
    realName: '张三',
    email: 'zhangsan@example.com',
    phone: '13800138001',
    dormRoom: 'B201',
    role: 'dorm_leader',
    status: 'active',
    lastLoginTime: '2023-11-19 14:22:30',
    createTime: '2023-10-05 11:30:00',
    createdExpenses: 8,
    participatedShares: 12,
    paymentCount: 10
  },
  {
    id: 3,
    username: 'lisi',
    realName: '李四',
    email: 'lisi@example.com',
    phone: '13800138002',
    dormRoom: 'B201',
    role: 'user',
    status: 'active',
    lastLoginTime: '2023-11-18 16:45:10',
    createTime: '2023-10-08 14:20:00',
    createdExpenses: 5,
    participatedShares: 15,
    paymentCount: 12
  },
  {
    id: 4,
    username: 'wangwu',
    realName: '王五',
    email: 'wangwu@example.com',
    phone: '13800138003',
    dormRoom: 'C301',
    role: 'user',
    status: 'disabled',
    lastLoginTime: '2023-11-10 10:15:20',
    createTime: '2023-10-12 09:45:00',
    createdExpenses: 3,
    participatedShares: 8,
    paymentCount: 5
  }
])

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)
const totalUsers = ref(100)

// 加载状态
const loading = ref(false)

// 对话框状态
const showAddUserDialog = ref(false)
const showUserDetailDialog = ref(false)
const isEdit = ref(false)
const currentUser = ref(null)
const userFormRef = ref(null)

// 用户表单
const userForm = reactive({
  id: null,
  username: '',
  password: '',
  realName: '',
  email: '',
  phone: '',
  dormRoom: '',
  role: 'user',
  status: 'active'
})

// 表单验证规则
const userFormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '长度在 6 到 20 个字符', trigger: 'blur' }
  ],
  realName: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' }
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3456789]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }
  ],
  dormRoom: [
    { required: true, message: '请输入寝室号', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
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

// 搜索用户
const handleSearch = () => {
  loading.value = true
  // 模拟API调用
  setTimeout(() => {
    loading.value = false
    ElMessage.success('搜索完成')
  }, 500)
}

// 重置搜索
const resetSearch = () => {
  searchForm.username = ''
  searchForm.role = ''
  searchForm.status = ''
  handleSearch()
}

// 查看用户详情
const viewUser = (user) => {
  currentUser.value = { ...user }
  showUserDetailDialog.value = true
}

// 编辑用户
const editUser = (user) => {
  isEdit.value = true
  Object.assign(userForm, user)
  showAddUserDialog.value = true
}

// 切换用户状态
const toggleUserStatus = (user) => {
  const action = user.status === 'active' ? '禁用' : '启用'
  ElMessageBox.confirm(
    `确定要${action}用户 "${user.username}" 吗？`,
    `${action}用户`,
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(() => {
      // 模拟API调用
      user.status = user.status === 'active' ? 'disabled' : 'active'
      ElMessage.success(`${action}成功`)
    })
    .catch(() => {
      ElMessage.info('已取消操作')
    })
}

// 删除用户
const deleteUser = (user) => {
  ElMessageBox.confirm(
    `确定要删除用户 "${user.username}" 吗？此操作不可恢复！`,
    '删除用户',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(() => {
      // 模拟API调用
      const index = userList.value.findIndex(u => u.id === user.id)
      if (index !== -1) {
        userList.value.splice(index, 1)
        ElMessage.success('删除成功')
      }
    })
    .catch(() => {
      ElMessage.info('已取消操作')
    })
}

// 保存用户
const saveUser = () => {
  userFormRef.value.validate((valid) => {
    if (valid) {
      if (isEdit.value) {
        // 编辑用户
        const index = userList.value.findIndex(u => u.id === userForm.id)
        if (index !== -1) {
          userList.value[index] = { ...userForm }
          ElMessage.success('更新成功')
        }
      } else {
        // 添加用户
        const newUser = {
          ...userForm,
          id: userList.value.length + 1,
          lastLoginTime: '从未登录',
          createTime: new Date().toLocaleString(),
          createdExpenses: 0,
          participatedShares: 0,
          paymentCount: 0
        }
        userList.value.unshift(newUser)
        ElMessage.success('添加成功')
      }
      showAddUserDialog.value = false
      resetUserForm()
    }
  })
}

// 导出用户
const exportUsers = () => {
  ElMessage.success('用户数据导出成功')
}

// 重置用户表单
const resetUserForm = () => {
  userForm.id = null
  userForm.username = ''
  userForm.password = ''
  userForm.realName = ''
  userForm.email = ''
  userForm.phone = ''
  userForm.dormRoom = ''
  userForm.role = 'user'
  userForm.status = 'active'
  isEdit.value = false
}

// 处理分页大小变化
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  // 重新加载数据
  handleSearch()
}

// 处理当前页变化
const handleCurrentChange = (page) => {
  currentPage.value = page
  // 重新加载数据
  handleSearch()
}

// 组件挂载时加载数据
onMounted(() => {
  handleSearch()
})
</script>

<style scoped>
.user-management {
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

.user-content {
  padding: 20px;
  overflow-y: auto;
}

.search-card {
  margin-bottom: 20px;
}

.user-list-card {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.user-detail {
  padding: 10px 0;
}

.user-stats {
  margin-top: 20px;
}

.user-stats h3 {
  margin-bottom: 15px;
  color: #303133;
}
</style>