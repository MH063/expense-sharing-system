<template>
  <div class="user-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>用户管理</h2>
      <el-button type="primary" @click="handleAddUser">
        <el-icon><Plus /></el-icon>
        添加用户
      </el-button>
    </div>

    <!-- 搜索表单 -->
    <el-form :model="searchForm" inline class="search-form">
      <el-form-item label="关键词">
        <el-input
          v-model="searchForm.keyword"
          placeholder="请输入用户名或邮箱"
          clearable
          @keyup.enter="handleSearch"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 数据表格 -->
    <el-table
      v-loading="loading"
      :data="userList"
      stripe
      border
      style="width: 100%"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="email" label="邮箱" />
      <el-table-column prop="role" label="角色" />
      <el-table-column prop="status" label="状态">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'danger'">
            {{ row.status === 'active' ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createdAt" label="创建时间" />
      <el-table-column label="操作" width="200">
        <template #default="{ row }">
          <el-button size="small" @click="handleEditUser(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="handleDeleteUser(row)">
            删除
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <el-pagination
      v-model:current-page="pagination.page"
      v-model:page-size="pagination.pageSize"
      :total="pagination.total"
      :page-sizes="[10, 20, 50, 100]"
      layout="total, sizes, prev, pager, next, jumper"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    />

    <!-- 用户表单对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      @close="handleDialogClose"
    >
      <el-form
        ref="userFormRef"
        :model="userForm"
        :rules="userFormRules"
        label-width="80px"
      >
        <el-form-item label="用户名" prop="username">
          <el-input v-model="userForm.username" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="userForm.email" />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="userForm.role" placeholder="请选择角色">
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
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
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmitForm">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { userApiExample, batchOperationExample } from '@/utils/apiExamples'
import apiResponseHandler from '@/utils/apiResponseHandler'
import messageManager from '@/utils/messageManager'
import { loadingState } from '@/components/GlobalLoading.vue'

// 响应式数据
const loading = ref(false)
const userList = ref([])
const selectedUsers = ref([])

// 搜索表单
const searchForm = reactive({
  keyword: ''
})

// 分页数据
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 对话框相关
const dialogVisible = ref(false)
const dialogTitle = computed(() => {
  return userForm.id ? '编辑用户' : '添加用户'
})

// 用户表单
const userFormRef = ref()
const userForm = reactive({
  id: '',
  username: '',
  email: '',
  role: '',
  status: 'active'
})

// 表单验证规则
const userFormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
}

// 获取用户列表
const fetchUserList = async () => {
  try {
    loading.value = true
    console.log('[UserManagement][获取用户列表]', {
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword
    })

    // 调用API获取用户列表
    const result = await userApiExample.getUserList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword
    })

    // 处理分页数据
    const { items, total } = apiResponseHandler.handlePaginatedResponse(result)
    
    userList.value = items
    pagination.total = total
    
    console.log('[UserManagement][获取用户列表成功]', { 
      total: pagination.total,
      itemsCount: items.length 
    })
  } catch (error) {
    console.error('[UserManagement][获取用户列表失败]', error)
    // 错误已在API调用中处理，这里可以添加额外的错误处理逻辑
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  fetchUserList()
}

// 重置搜索
const handleReset = () => {
  searchForm.keyword = ''
  pagination.page = 1
  fetchUserList()
}

// 分页大小改变
const handleSizeChange = (size) => {
  pagination.pageSize = size
  fetchUserList()
}

// 当前页改变
const handleCurrentChange = (page) => {
  pagination.page = page
  fetchUserList()
}

// 表格选择改变
const handleSelectionChange = (selection) => {
  selectedUsers.value = selection
}

// 添加用户
const handleAddUser = () => {
  // 重置表单
  Object.assign(userForm, {
    id: '',
    username: '',
    email: '',
    role: '',
    status: 'active'
  })
  dialogVisible.value = true
}

// 编辑用户
const handleEditUser = (row) => {
  // 填充表单数据
  Object.assign(userForm, {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    status: row.status
  })
  dialogVisible.value = true
}

// 删除用户
const handleDeleteUser = async (row) => {
  try {
    // 调用删除API
    const result = await userApiExample.deleteUser(row.id)
    
    // 删除成功后刷新列表
    if (result.success) {
      fetchUserList()
    }
  } catch (error) {
    console.error('[UserManagement][删除用户失败]', error)
    // 错误已在API调用中处理
  }
}

// 批量删除
const handleBatchDelete = async () => {
  if (selectedUsers.value.length === 0) {
    messageManager.warning('请选择要删除的用户')
    return
  }

  try {
    // 获取选中的用户ID
    const userIds = selectedUsers.value.map(user => user.id)
    
    // 调用批量删除API
    const result = await batchOperationExample.batchDeleteUsers(userIds)
    
    // 删除成功后刷新列表
    if (result.success) {
      fetchUserList()
    }
  } catch (error) {
    console.error('[UserManagement][批量删除用户失败]', error)
    // 错误已在API调用中处理
  }
}

// 提交表单
const handleSubmitForm = async () => {
  try {
    // 表单验证
    const valid = await userFormRef.value.validate()
    if (!valid) {
      return
    }

    // 调用API提交表单
    let result
    if (userForm.id) {
      // 更新用户
      result = await userApiExample.updateUser(userForm.id, userForm)
    } else {
      // 创建用户
      result = await userApiExample.createUser(userForm)
    }

    // 提交成功后关闭对话框并刷新列表
    if (result.success) {
      dialogVisible.value = false
      fetchUserList()
    }
  } catch (error) {
    console.error('[UserManagement][提交表单失败]', error)
    // 错误已在API调用中处理
  }
}

// 对话框关闭
const handleDialogClose = () => {
  // 重置表单验证状态
  userFormRef.value?.resetFields()
}

// 组件挂载时获取数据
onMounted(() => {
  fetchUserList()
})
</script>

<style scoped>
.user-management {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
}

.search-form {
  margin-bottom: 20px;
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 4px;
}

.el-pagination {
  margin-top: 20px;
  text-align: right;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
}
</style>