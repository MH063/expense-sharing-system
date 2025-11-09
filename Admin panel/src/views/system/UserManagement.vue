<template>
  <div class="user-management">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1>用户管理</h1>
          <p>管理系统中的所有用户账户</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            添加用户
          </el-button>
        </div>
      </el-header>
      
      <el-main class="user-content">
        <!-- 搜索和筛选区域 -->
        <el-card class="search-card">
          <el-form :model="searchForm" inline>
            <el-form-item label="用户名">
              <el-input
                v-model="searchForm.keyword"
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
                <el-option
                  v-for="option in roleOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
            
            <el-form-item label="状态">
              <el-select
                v-model="searchForm.status"
                placeholder="请选择状态"
                clearable
              >
                <el-option label="全部" value="" />
                <el-option
                  v-for="option in statusOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
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
          <el-table :data="userList" style="width: 100%" v-loading="tableLoading">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="username" label="用户名" width="120" />
            <el-table-column prop="realName" label="真实姓名" width="120" />
            <el-table-column prop="email" label="邮箱" width="180" />
            <el-table-column prop="phone" label="手机号" width="120" />
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
                  {{ scope.row.status === 'active' ? '启用' : '禁用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="lastLoginTime" label="最后登录" width="160" />
            <el-table-column prop="createTime" label="创建时间" width="160" />
            <el-table-column label="操作" width="250" fixed="right">
              <template #default="scope">
                <el-button type="primary" size="small" @click="viewDetail(scope.row)">
                  <el-icon><View /></el-icon>
                  查看
                </el-button>
                <el-button size="small" @click="handleEdit(scope.row)">
                  <el-icon><Edit /></el-icon>
                  编辑
                </el-button>
                <el-button
                  :type="scope.row.status === 'active' ? 'warning' : 'success'"
                  size="small"
                  @click="toggleStatus(scope.row)"
                >
                  <el-icon v-if="scope.row.status === 'active'"><Lock /></el-icon>
                  <el-icon v-else><Unlock /></el-icon>
                  {{ scope.row.status === 'active' ? '禁用' : '启用' }}
                </el-button>
                <el-button type="danger" size="small" @click="handleDelete(scope.row)">
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <!-- 分页 -->
          <div class="pagination-container">
            <el-pagination
              v-model:current-page="pagination.currentPage"
              v-model:page-size="pagination.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="pagination.total"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </el-card>
      </el-main>
    </el-container>
    
    <!-- 添加/编辑用户对话框 -->
    <el-dialog
      v-model="userDialogVisible"
      :title="dialogTitle"
      width="600px"
    >
      <el-form :model="userForm" :rules="userFormRules" ref="userFormRef" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" :disabled="isEdit" />
        </el-form-item>
        
        <el-form-item label="密码" prop="password" v-if="showPasswordField">
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
        
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" style="width: 100%">
            <el-option
              v-for="option in roleOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="userForm.status">
            <el-radio label="active">启用</el-radio>
            <el-radio label="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="userDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="submitUserForm">确定</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 用户详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="用户详情" width="600px">
      <div v-if="userDetail" class="user-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ userDetail.id }}</el-descriptions-item>
          <el-descriptions-item label="用户名">{{ userDetail.username }}</el-descriptions-item>
          <el-descriptions-item label="真实姓名">{{ userDetail.realName }}</el-descriptions-item>
          <el-descriptions-item label="邮箱">{{ userDetail.email }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ userDetail.phone }}</el-descriptions-item>
          <el-descriptions-item label="角色">
            <el-tag :type="getRoleTagType(userDetail.role)">
              {{ getRoleName(userDetail.role) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="userDetail.status === 'active' ? 'success' : 'danger'">
              {{ userDetail.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="最后登录">{{ userDetail.lastLoginTime }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ userDetail.createTime }}</el-descriptions-item>
        </el-descriptions>
        
        <div class="user-stats">
          <h3>用户统计</h3>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-statistic title="创建费用记录" :value="userDetail.createdExpenses || 0" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="参与分摊" :value="userDetail.participatedShares || 0" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="支付次数" :value="userDetail.paymentCount || 0" />
            </el-col>
          </el-row>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Edit, Delete, View, Lock, Unlock } from '@element-plus/icons-vue'
import { userApi } from '@/api'

// 表格加载状态
const tableLoading = ref(false)

// 搜索表单
const searchForm = reactive({
  keyword: '',
  status: '',
  role: ''
})

// 用户列表数据
const userList = ref([])

// 角色选项
const roleOptions = ref([
  { label: '管理员', value: 'admin' },
  { label: '普通用户', value: 'user' }
])

// 状态选项
const statusOptions = ref([
  { label: '启用', value: 'active' },
  { label: '禁用', value: 'inactive' }
])

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 用户表单对话框
const userDialogVisible = ref(false)
const dialogTitle = ref('添加用户')
const isEdit = ref(false)

// 用户表单
const userForm = reactive({
  id: null,
  username: '',
  password: '',
  realName: '',
  email: '',
  phone: '',
  role: 'user',
  status: 'active'
})

// 表单验证规则
const userFormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
  ],
  realName: [
    { required: true, message: '请输入真实姓名', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  phone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
}

// 用户详情对话框
const detailDialogVisible = ref(false)
const userDetail = ref({})

// 表单引用
const userFormRef = ref(null)

// 计算属性：是否显示密码字段
const showPasswordField = computed(() => {
  return !isEdit.value
})

// 获取用户列表
const getUserList = async () => {
  tableLoading.value = true
  try {
    const params = {
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword,
      status: searchForm.status,
      role: searchForm.role
    }
    console.log('获取用户列表参数:', params)
    
    const res = await userApi.getUserList(params)
    console.log('获取用户列表响应:', res)
    
    if (res && res.success) {
      userList.value = res.payload?.list || []
      pagination.total = res.payload?.total || 0
    } else {
      ElMessage.error('获取用户列表失败')
    }
  } catch (error) {
    console.error('获取用户列表错误:', error)
    ElMessage.error('获取用户列表失败: ' + (error.message || '未知错误'))
  } finally {
    tableLoading.value = false
  }
}

// 搜索用户
const handleSearch = () => {
  pagination.currentPage = 1
  getUserList()
}

// 重置搜索
const resetSearch = () => {
  searchForm.keyword = ''
  searchForm.status = ''
  searchForm.role = ''
  pagination.currentPage = 1
  getUserList()
}

// 分页大小改变
const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.currentPage = 1
  getUserList()
}

// 当前页改变
const handleCurrentChange = (page) => {
  pagination.currentPage = page
  getUserList()
}

// 打开添加用户对话框
const handleAdd = () => {
  dialogTitle.value = '添加用户'
  isEdit.value = false
  resetUserForm()
  userDialogVisible.value = true
}

// 打开编辑用户对话框
const handleEdit = (row) => {
  dialogTitle.value = '编辑用户'
  isEdit.value = true
  Object.assign(userForm, row)
  userDialogVisible.value = true
}

// 删除用户
const handleDelete = (row) => {
  ElMessageBox.confirm(
    `确定要删除用户 "${row.username}" 吗？此操作不可恢复！`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      console.log('删除用户ID:', row.id)
      const res = await userApi.deleteUser(row.id)
      console.log('删除用户响应:', res)
      
      if (res && res.success) {
        ElMessage.success('删除成功')
        getUserList()
      } else {
        ElMessage.error('删除失败')
      }
    } catch (error) {
      console.error('删除用户错误:', error)
      ElMessage.error('删除失败: ' + (error.message || '未知错误'))
    }
  }).catch(() => {
    // 用户取消删除
  })
}

// 切换用户状态
const toggleStatus = async (row) => {
  const newStatus = row.status === 'active' ? 'inactive' : 'active'
  const statusText = newStatus === 'active' ? '启用' : '禁用'
  
  try {
    console.log('切换用户状态:', row.id, newStatus)
    const res = await userApi.updateUserStatus(row.id, newStatus)
    console.log('切换用户状态响应:', res)
    
    if (res && res.success) {
      ElMessage.success(`${statusText}成功`)
      row.status = newStatus
    } else {
      ElMessage.error(`${statusText}失败`)
    }
  } catch (error) {
    console.error('切换用户状态错误:', error)
    ElMessage.error(`${statusText}失败: ` + (error.message || '未知错误'))
  }
}

// 重置密码
const resetPassword = (row) => {
  ElMessageBox.confirm(
    `确定要重置用户 "${row.username}" 的密码吗？`,
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      console.log('重置用户密码:', row.id)
      const res = await userApi.resetUserPassword(row.id)
      console.log('重置用户密码响应:', res)
      
      if (res && res.success) {
        ElMessage.success('密码重置成功，新密码为: ' + (res.payload?.newPassword || '123456'))
      } else {
        ElMessage.error('密码重置失败')
      }
    } catch (error) {
      console.error('重置用户密码错误:', error)
      ElMessage.error('密码重置失败: ' + (error.message || '未知错误'))
    }
  }).catch(() => {
    // 用户取消重置密码
  })
}

// 查看用户详情
const viewDetail = (row) => {
  userDetail.value = { ...row }
  detailDialogVisible.value = true
}

// 提交用户表单
const submitUserForm = () => {
  userFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        const formData = { ...userForm }
        
        // 如果是编辑模式，且密码为空，则不发送密码字段
        if (isEdit.value && !formData.password) {
          delete formData.password
        }
        
        console.log('提交用户表单:', formData)
        
        let res
        if (isEdit.value) {
          res = await userApi.updateUser(userForm.id, formData)
          console.log('更新用户响应:', res)
        } else {
          res = await userApi.createUser(formData)
          console.log('添加用户响应:', res)
        }
        
        if (res && res.success) {
          ElMessage.success(isEdit.value ? '更新成功' : '添加成功')
          userDialogVisible.value = false
          getUserList()
        } else {
          ElMessage.error(isEdit.value ? '更新失败' : '添加失败')
        }
      } catch (error) {
        console.error('提交用户表单错误:', error)
        ElMessage.error((isEdit.value ? '更新失败' : '添加失败') + ': ' + (error.message || '未知错误'))
      }
    }
  })
}

// 重置用户表单
const resetUserForm = () => {
  userForm.id = null
  userForm.username = ''
  userForm.password = ''
  userForm.realName = ''
  userForm.email = ''
  userForm.phone = ''
  userForm.role = 'user'
  userForm.status = 'active'
  
  // 清除表单验证
  if (userFormRef.value) {
    userFormRef.value.clearValidate()
  }
}

// 获取角色名称
const getRoleName = (role) => {
  const roleMap = {
    'admin': '管理员',
    'user': '普通用户'
  }
  return roleMap[role] || role
}

// 获取角色标签类型
const getRoleTagType = (role) => {
  const typeMap = {
    'admin': 'danger',
    'user': 'primary'
  }
  return typeMap[role] || 'info'
}

// 组件挂载时获取用户列表
onMounted(() => {
  getUserList()
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