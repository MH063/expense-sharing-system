<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1 class="login-title">登录</h1>
        <p class="login-subtitle">欢迎回到记账系统</p>
      </div>
      
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="username" class="form-label">用户名</label>
          <div class="input-wrapper">
            <!-- 用户名输入区域 -->
            <div class="username-input-section">
              <!-- 记住的用户快捷选择（当存在记住用户且输入框为空或内容匹配时显示） -->
              <div v-if="rememberedUsers.length > 0 && shouldShowQuickSelect" class="quick-select-bar">
                <span class="quick-select-label">快速选择:</span>
                <div class="quick-select-buttons">
                  <div 
                    v-for="user in rememberedUsers" 
                    :key="user.username"
                    class="quick-select-item"
                  >
                    <button 
                      type="button"
                      class="quick-select-btn"
                      @click="selectRememberedUser(user.username)"
                      :class="{ 'active': loginForm.username === user.username }"
                      :title="`最后登录: ${formatDate(user.lastLogin)}`"
                    >
                      {{ user.username }}
                    </button>
                    <button 
                      type="button"
                      class="delete-user-btn"
                      @click.stop="removeUserFromRemembered(user.username)"
                      :title="`删除记住的用户: ${user.username}`"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- 用户名输入框 -->
              <div class="input-container">
                <input
                  id="username"
                  v-model="loginForm.username"
                  type="text"
                  class="form-input with-icon"
                  :class="{ 'error': errors.username }"
                  placeholder="请输入用户名（可选择下方已记住的用户或手动输入）"
                  @input="onUsernameInput"
                  @focus="onUsernameFocus"
                  required
                />
                <i class="input-icon">👤</i>
                <div v-if="rememberedUsers.length > 0" class="input-actions">
                  <button 
                    type="button"
                    class="clear-input-btn"
                    v-if="loginForm.username"
                    @click="clearUsername"
                    title="清空输入"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <span v-if="errors.username" class="error-message">{{ errors.username }}</span>
          </div>
        </div>
        
        <div class="form-group">
          <label for="password" class="form-label">密码</label>
          <div class="input-wrapper">
            <div class="password-input">
              <input
                id="password"
                v-model="loginForm.password"
                :type="showPassword ? 'text' : 'password'"
                class="form-input with-icon"
                :class="{ 'error': errors.password }"
                placeholder="请输入密码"
                required
              />
              <i class="input-icon">🔒</i>
              <button
                type="button"
                class="password-toggle"
                @click="showPassword = !showPassword"
              >
                <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
            </div>
            <span v-if="errors.password" class="error-message">{{ errors.password }}</span>
          </div>
        </div>
        
        <div class="form-options">
          <label class="checkbox-label">
            <input type="checkbox" v-model="loginForm.remember" />
            <span class="checkbox-text">记住我</span>
          </label>
          <router-link to="/auth/forgot-password" class="forgot-password">忘记密码？</router-link>
        </div>
        
        <button
          type="submit"
          class="login-button"
          :disabled="isLoading"
        >
          <span v-if="!isLoading">登录</span>
          <span v-else class="loading-spinner"></span>
        </button>
        
        <div v-if="errorMessage" class="error-banner">
          {{ errorMessage }}
        </div>
      </form>
      
      <div class="login-footer">
        <p>还没有账号？<router-link to="/auth/register" class="register-link">立即注册</router-link></p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import tokenManager from '@/utils/jwt-token-manager'
import { ElMessage } from 'element-plus'

// 路由和状态管理
const router = useRouter()
const authStore = useAuthStore()

// 定义showToast函数，使用ElementPlus的消息提示
const showToast = (message, type = 'info') => {
  ElMessage({
    message,
    type: type === 'error' ? 'error' : type === 'success' ? 'success' : 'info',
    duration: 3000,
    showClose: true
  })
}

// 响应式数据
const isLoading = ref(false)
const showPassword = ref(false)
const errorMessage = ref('')
const rememberedUsers = ref([])

// 表单数据
const loginForm = reactive({
  username: '',
  password: '',
  remember: false
})

// 表单验证错误
const errors = reactive({
  username: '',
  password: ''
})

// 页面初始化时检查是否有记住的用户名
onMounted(() => {
  loadRememberedUsers()
})

// 计算属性：是否显示快速选择
const shouldShowQuickSelect = computed(() => {
  // 如果输入框为空，或者当前输入的内容匹配记住的用户名，则显示快速选择
  if (!loginForm.username.trim()) {
    return rememberedUsers.value.length > 0
  }
  
  // 检查当前输入的内容是否匹配记住的用户名
  return rememberedUsers.value.some(user => 
    user.username.toLowerCase().includes(loginForm.username.toLowerCase())
  )
})

// 加载记住的用户列表
const loadRememberedUsers = () => {
  try {
    const savedUsers = localStorage.getItem('remembered_users')
    if (savedUsers) {
      rememberedUsers.value = JSON.parse(savedUsers)
      
      // 如果只有一个用户，直接填充
      if (rememberedUsers.value.length === 1) {
        loginForm.username = rememberedUsers.value[0].username
        loginForm.remember = true
      }
    }
  } catch (error) {
    console.error('加载记住的用户列表失败:', error)
  }
}

// 选择记住的用户
const selectRememberedUser = (username) => {
  loginForm.username = username
  loginForm.remember = true
  
  // 添加用户选择反馈
  console.log(`已选择记住的用户: ${username}`)
  
  // 清除之前的错误信息
  errorMessage.value = ''
  errors.username = ''
  errors.password = ''
  
  // 聚焦到密码输入框
  setTimeout(() => {
    const passwordInput = document.querySelector('input[type="password"]')
    if (passwordInput) {
      passwordInput.focus()
    }
  }, 100)
}

// 用户名输入事件处理
const onUsernameInput = () => {
  // 清除之前的错误信息
  errors.username = ''
  errorMessage.value = ''
  
  // 触发响应式更新以显示/隐藏快速选择
  console.log('用户名输入:', loginForm.username)
}

// 用户名输入框获得焦点事件
const onUsernameFocus = () => {
  // 聚焦时显示快速选择
  console.log('用户名输入框获得焦点')
}

// 清空用户名输入
const clearUsername = () => {
  loginForm.username = ''
  loginForm.remember = false
  
  // 聚焦到用户名输入框
  setTimeout(() => {
    const usernameInput = document.querySelector('input[id="username"]')
    if (usernameInput) {
      usernameInput.focus()
    }
  }, 100)
}

// 添加用户到记住列表
const addToRememberedUsers = (username) => {
  try {
    // 检查用户是否已在列表中
    const existingIndex = rememberedUsers.value.findIndex(user => user.username === username)
    
    if (existingIndex !== -1) {
      // 如果用户已存在，更新最后登录时间
      rememberedUsers.value[existingIndex].lastLogin = new Date().toISOString()
      console.log(`已更新用户 ${username} 的最后登录时间`)
    } else {
      // 如果用户不存在，添加到列表
      rememberedUsers.value.push({
        username: username,
        lastLogin: new Date().toISOString()
      })
      console.log(`已将用户 ${username} 添加到记住列表`)
    }
    
    // 保存到本地存储
    localStorage.setItem('remembered_users', JSON.stringify(rememberedUsers.value))
    console.log('已更新记住的用户列表:', rememberedUsers.value)
  } catch (error) {
    console.error('更新记住的用户列表失败:', error)
  }
}

// 删除记住的用户
const removeUserFromRemembered = (username) => {
  try {
    // 从记住列表中移除用户
    rememberedUsers.value = rememberedUsers.value.filter(user => user.username !== username)
    
    // 保存到本地存储
    localStorage.setItem('remembered_users', JSON.stringify(rememberedUsers.value))
    
    // 如果移除的是当前选中的用户，清空用户名
    if (loginForm.username === username) {
      loginForm.username = ''
      loginForm.remember = false
    }
    
    // 显示删除成功反馈
    console.log(`已删除记住的用户: ${username}`)
    
    // 可以添加一个临时提示
    const toast = document.createElement('div')
    toast.className = 'delete-toast'
    toast.textContent = `已删除记住的用户: ${username}`
    document.body.appendChild(toast)
    
    // 2秒后移除提示
    setTimeout(() => {
      document.body.removeChild(toast)
    }, 2000)
    
  } catch (error) {
    console.error('删除记住的用户失败:', error)
  }
}

// 从记住列表中移除用户
const removeFromRememberedUsers = (username) => {
  try {
    rememberedUsers.value = rememberedUsers.value.filter(user => user.username !== username)
    
    // 保存到本地存储
    localStorage.setItem('remembered_users', JSON.stringify(rememberedUsers.value))
    console.log('已从记住列表中移除用户:', username)
    
    // 添加UI反馈
    // 如果移除的是当前选中的用户，清空用户名
    if (loginForm.username === username) {
      loginForm.username = ''
      loginForm.remember = false
    }
    
    // 如果列表为空，隐藏选择器
    if (rememberedUsers.value.length === 0) {
      // 选择器会根据 rememberedUsers.length 自动隐藏
    }
    
    // 显示移除成功反馈
    console.log(`用户 ${username} 已从记住列表中移除`)
  } catch (error) {
    console.error('从记住列表中移除用户失败:', error)
  }
}

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return '未知'
  
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return '今天'
    } else if (diffDays === 1) {
      return '昨天'
    } else if (diffDays < 7) {
      return `${diffDays}天前`
    } else if (diffDays < 30) {
      return `${Math.floor(diffDays / 7)}周前`
    } else if (diffDays < 365) {
      return `${Math.floor(diffDays / 30)}个月前`
    } else {
      return `${Math.floor(diffDays / 365)}年前`
    }
  } catch (error) {
    console.error('格式化日期失败:', error)
    return '未知'
  }
}

// 表单验证
const validateForm = () => {
  let isValid = true
  
  // 重置错误
  errors.username = ''
  errors.password = ''
  
  // 验证用户名
  if (!loginForm.username.trim()) {
    errors.username = '请输入用户名'
    isValid = false
  } else if (loginForm.username.length < 3) {
    errors.username = '用户名至少需要3个字符'
    isValid = false
  }
  
  // 验证密码 - 修改为与后端一致的验证规则
  if (!loginForm.password) {
    errors.password = '请输入密码'
    isValid = false
  } else if (loginForm.password.length < 8) {
    errors.password = '密码至少需要8个字符'
    isValid = false
  } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/.test(loginForm.password)) {
    errors.password = '密码需包含大小写、数字、特殊字符且至少8位'
    isValid = false
  }
  
  return isValid
}

// 处理登录成功
const handleLoginSuccess = async (user) => {
  try {
    console.log('登录成功，用户数据:', user);
    
    // 处理记住我功能：如果用户勾选了记住我，保存用户名到本地存储
    if (loginForm.remember) {
      // 添加用户到记住列表
      addToRememberedUsers(loginForm.username)
      localStorage.setItem('remember_me', 'true') // 设置记住我标志，供Token管理器使用
      console.log('已记住用户名:', loginForm.username)
    } else {
      // 如果用户没有勾选记住我，从记住列表中移除该用户
      removeFromRememberedUsers(loginForm.username)
      localStorage.setItem('remember_me', 'false') // 设置记住我标志，供Token管理器使用
      console.log('已从记住列表中移除用户名:', loginForm.username)
    }
    
    // 设置当前用户（用于Token管理）
    tokenManager.setCurrentUser(loginForm.username)
    
    // 添加登录成功反馈
    console.log(`用户 ${loginForm.username} 登录成功`)
    
    // 显示成功提示
    showToast('登录成功！正在跳转...', 'success');
    
    // 根据用户角色决定重定向路径
    const getRoleBasedRedirectPath = (userRole) => {
      switch (userRole) {
        case 'admin':
          return '/admin/dashboard'
        case 'manager':
          return '/manager/dashboard'
        case 'user':
        default:
          return '/dashboard'
      }
    }
    
    // 获取用户角色并决定重定向路径
    const userRole = user?.role || 'user'
    const roleBasedPath = getRoleBasedRedirectPath(userRole)
    const redirectPath = router.currentRoute.value.query.redirect || roleBasedPath
    
    console.log('用户角色:', userRole, '重定向路径:', redirectPath)
    
    // 延迟跳转，让用户看到成功提示
    setTimeout(() => {
      router.push(redirectPath)
    }, 1000)
  } catch (error) {
    console.error('处理登录成功时出错:', error)
    errorMessage.value = '处理登录成功时出错，请重试'
    showToast('登录失败，请重试', 'error')
  }
}

// 处理登录
const handleLogin = async () => {
  if (!validateForm()) {
    return
  }
  
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    // 调用真实的登录API
    console.log('调用登录API:', {
      username: loginForm.username,
      password: loginForm.password,
      remember: loginForm.remember
    })
    
    // 使用auth store的登录方法
    const response = await authStore.login({
      username: loginForm.username,
      password: loginForm.password
    }, loginForm.username)
    
    // 检查登录响应
    if (!response || !response.success) {
      throw new Error(response?.message || '登录失败')
    }
    
    console.log('登录响应:', response)
    
    // 处理登录成功 - 直接传递用户信息
    await handleLoginSuccess(response.user)
  } catch (error) {
    console.error('登录失败:', error)
    errorMessage.value = error.message || '登录失败，请检查用户名和密码'
    showToast(error.message || '登录失败，请检查用户名和密码', 'error')
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f8f9fa;
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.login-header {
  padding: 30px 30px 20px;
  text-align: center;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  color: white;
}

.login-title {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 8px;
}

.login-subtitle {
  font-size: 16px;
  opacity: 0.9;
  margin: 0;
}

.login-form {
  padding: 30px;
}

/* 用户名输入区域样式 */
.username-input-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 快速选择栏样式 */
.quick-select-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 1px solid rgba(106, 17, 203, 0.1);
  border-radius: 8px;
  flex-wrap: wrap;
  box-shadow: 0 2px 8px rgba(106, 17, 203, 0.08);
  transition: all 0.3s ease;
  animation: fadeInUp 0.5s ease-out;
}

.quick-select-bar:hover {
  box-shadow: 0 4px 16px rgba(106, 17, 203, 0.12);
  transform: translateY(-1px);
}

.quick-select-label {
  font-size: 13px;
  color: #6a11cb;
  font-weight: 600;
  white-space: nowrap;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.quick-select-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* 渐入动画 */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 快速选择项目容器 */
.quick-select-item {
  position: relative;
  display: flex;
  align-items: center;
  animation: slideInRight 0.4s ease-out;
}

.quick-select-btn {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 1px solid rgba(106, 17, 203, 0.1);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  color: #495057;
  cursor: pointer;
  transition: all 0.3s ease;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(106, 17, 203, 0.08);
  position: relative;
  overflow: hidden;
}

/* 用户头像占位符 */
.quick-select-btn .user-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  background: linear-gradient(135deg, #6a11cb, #2575fc);
  color: white;
  border-radius: 50%;
  font-size: 8px;
  font-weight: bold;
  margin-right: 6px;
  box-shadow: 0 1px 3px rgba(106, 17, 203, 0.2);
}

.quick-select-btn:before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
  transition: left 0.5s ease;
}

.quick-select-btn:hover:before {
  left: 100%;
}

.quick-select-btn:hover {
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  border-color: #6a11cb;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(106, 17, 203, 0.25);
}

.quick-select-btn.active {
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  border-color: #6a11cb;
  color: white;
  box-shadow: 0 2px 8px rgba(106, 17, 203, 0.3);
}

/* 按钮动画 */
@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 删除用户按钮样式 */
.delete-user-btn {
  margin-left: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(220, 53, 69, 0.3);
  border-radius: 6px;
  color: #dc3545;
  cursor: pointer;
  transition: all 0.3s ease;
  opacity: 0;
  transform: scale(0.8);
  box-shadow: 0 2px 4px rgba(220, 53, 69, 0.15);
}

.quick-select-item:hover .delete-user-btn {
  opacity: 1;
  transform: scale(1);
}

.delete-user-btn:hover {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  border-color: #dc3545;
  color: white;
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(220, 53, 69, 0.3);
  animation: pulse 0.6s ease-in-out;
}

/* 脉冲动画 */
@keyframes pulse {
  0% {
    transform: scale(1.1);
  }
  50% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1.1);
  }
}

/* 删除成功提示样式 */
.delete-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
  padding: 14px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 16px rgba(40, 167, 69, 0.3);
  z-index: 9999;
  animation: slideInRight 0.4s ease, fadeOut 0.4s ease 1.6s forwards;
  display: flex;
  align-items: center;
  gap: 8px;
  border-left: 4px solid rgba(255, 255, 255, 0.3);
}

/* 添加成功图标 */
.delete-toast:before {
  content: '✓';
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  font-weight: bold;
  font-size: 12px;
}

/* 淡出动画 */
@keyframes fadeOut {
  from {
    opacity: 1;
    transform: translateX(0);
  }
  to {
    opacity: 0;
    transform: translateX(100%);
  }
}

/* 动画样式 */
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 输入框容器样式 */
.input-container {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

/* 输入框图标样式 */
.input-container .input-icon,
.password-input .input-icon {
  position: absolute;
  left: 16px;
  z-index: 2;
  color: #6a11cb;
  font-size: 18px;
  transition: all 0.3s ease;
  pointer-events: none;
}

/* 带图标的美化输入框样式 */
.input-container .form-input.with-icon,
.password-input .form-input.with-icon {
  padding-left: 50px;
}

/* 焦点时图标效果 */
.form-input.with-icon:focus + .input-icon,
.form-input.with-icon:focus ~ .input-icon {
  color: #2575fc;
  transform: scale(1.1);
  filter: drop-shadow(0 0 8px rgba(37, 117, 252, 0.3));
}

/* 美化的输入框样式 */
.form-input {
  width: 100%;
  padding: 16px 50px 16px 20px;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 500;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(106, 17, 203, 0.08);
  color: #333;
}

.form-input::placeholder {
  color: #adb5bd;
  font-weight: 400;
}

.form-input:focus {
  outline: none;
  border-color: #6a11cb;
  background: linear-gradient(135deg, #ffffff 0%, #fff5f5 100%);
  box-shadow: 0 6px 20px rgba(106, 17, 203, 0.15);
  transform: translateY(-2px);
}

.form-input.error {
  border-color: #e74c3c;
  background: linear-gradient(135deg, #fff5f5 0%, #ffffff 100%);
  box-shadow: 0 4px 12px rgba(231, 76, 60, 0.15);
}

/* 输入框操作按钮样式 */
.input-actions {
  position: absolute;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.clear-input-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background-color: transparent;
  border: none;
  border-radius: 4px;
  color: #6c757d;
  cursor: pointer;
  transition: all 0.2s ease;
}

.clear-input-btn:hover {
  background-color: #f8f9fa;
  color: #495057;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.input-wrapper {
  position: relative;
}



.error-message {
  display: block;
  color: #e74c3c;
  font-size: 13px;
  margin-top: 5px;
}

/* 密码输入框样式 */
.password-input {
  position: relative;
  display: flex;
  align-items: center;
}

.password-toggle {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 25px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  font-size: 14px;
  color: #666;
  cursor: pointer;
}

.checkbox-label input {
  margin-right: 8px;
}

.forgot-password {
  font-size: 14px;
  color: #6a11cb;
  text-decoration: none;
}

.forgot-password:hover {
  text-decoration: underline;
}

.login-button {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.3s;
}

.login-button:hover:not(:disabled) {
  opacity: 0.9;
}

.login-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loading-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-banner {
  margin-top: 15px;
  padding: 12px;
  background-color: #fdecea;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
  color: #721c24;
  font-size: 14px;
}

.login-footer {
  padding: 20px 30px;
  text-align: center;
  background-color: #f8f9fa;
  font-size: 14px;
  color: #666;
}

.register-link {
  color: #6a11cb;
  text-decoration: none;
  font-weight: 500;
}

.register-link:hover {
  text-decoration: underline;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .login-card {
    margin: 0;
    border-radius: 0;
    min-height: 100vh;
  }
  
  .login-header {
    padding: 40px 20px 20px;
  }
  
  .login-form {
    padding: 20px;
  }
  
  .login-footer {
    padding: 20px;
  }
}
</style>