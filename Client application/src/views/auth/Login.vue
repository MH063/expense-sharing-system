<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h1 class="login-title">登录</h1>
        <p class="login-subtitle">欢迎回到寝室记账系统</p>
      </div>
      
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="username" class="form-label">用户名</label>
          <div class="input-wrapper">
            <div class="input-with-dropdown">
              <!-- 记住用户下拉选择器 -->
              <div v-if="rememberedUsers.length > 0" class="remembered-users-dropdown">
                <button 
                  type="button"
                  class="dropdown-toggle"
                  @click="toggleDropdown"
                >
                  <span v-if="selectedRememberedUser">{{ selectedRememberedUser.username }}</span>
                  <span v-else>选择已记住的用户</span>
                  <svg class="dropdown-arrow" :class="{ 'open': isDropdownOpen }" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                  </svg>
                </button>
                <div v-if="isDropdownOpen" class="dropdown-menu">
                  <div 
                    v-for="user in rememberedUsers" 
                    :key="user.username"
                    class="dropdown-item"
                    @click="selectRememberedUser(user.username)"
                  >
                    <div class="dropdown-user-info">
                      <span class="dropdown-user-name">{{ user.username }}</span>
                      <span class="dropdown-last-login">上次登录: {{ formatDate(user.lastLogin) }}</span>
                    </div>
                    <button 
                      type="button"
                      class="dropdown-remove-btn"
                      @click.stop="removeFromRememberedUsers(user.username)"
                      title="移除此用户"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              <input
                id="username"
                v-model="loginForm.username"
                type="text"
                class="form-input"
                :class="{ 'error': errors.username, 'with-dropdown': rememberedUsers.length > 0 }"
                placeholder="请输入用户名"
                required
              />
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
                class="form-input"
                :class="{ 'error': errors.password }"
                placeholder="请输入密码"
                required
              />
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
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
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

// 路由和状态管理
const router = useRouter()
const authStore = useAuthStore()

// 响应式数据
const isLoading = ref(false)
const showPassword = ref(false)
const errorMessage = ref('')
const rememberedUsers = ref([])
const isDropdownOpen = ref(false)
const selectedRememberedUser = ref(null)

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
  
  // 添加全局点击事件监听器
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  // 移除全局点击事件监听器
  document.removeEventListener('click', handleClickOutside)
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
  selectedRememberedUser.value = rememberedUsers.value.find(user => user.username === username)
  isDropdownOpen.value = false
  
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

// 切换下拉菜单
const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value
}

// 点击外部关闭下拉菜单
const handleClickOutside = (event) => {
  if (!event.target.closest('.remembered-users-dropdown')) {
    isDropdownOpen.value = false
  }
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
  
  // 验证密码
  if (!loginForm.password) {
    errors.password = '请输入密码'
    isValid = false
  } else if (loginForm.password.length < 6) {
    errors.password = '密码至少需要6个字符'
    isValid = false
  }
  
  return isValid
}

// 处理登录
const handleLogin = async () => {
  if (!validateForm()) {
    return
  }
  
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    // 模拟登录API调用
    console.log('模拟登录API调用:', {
      username: loginForm.username,
      password: loginForm.password,
      remember: loginForm.remember
    })
    
    // 模拟API响应延迟
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 模拟登录成功响应
    const mockResponse = {
      success: true,
      data: {
        token: 'mock-jwt-token-' + Date.now(),
        refreshToken: 'mock-refresh-token-' + Date.now(),
        user: {
          id: 1,
          username: loginForm.username,
          name: loginForm.username === 'admin' ? '管理员' : '管理员',
          email: loginForm.username + '@example.com',
          avatar: 'https://picsum.photos/seed/user' + Date.now() + '/200/200.jpg',
          roles: ['admin'], // 所有模拟登录用户都是管理员
          permissions: ['all'], // 所有模拟登录用户拥有所有权限
          roomId: 1
        }
      }
    }
    
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
    
    // 保存Token到本地存储
    tokenManager.setTokens(
      mockResponse.data.token,
      mockResponse.data.refreshToken,
      null, // 没有过期时间
      loginForm.username
    )
    
    // 更新认证状态
    authStore.accessToken = mockResponse.data.token
    authStore.refreshToken = mockResponse.data.refreshToken
    authStore.currentUser = mockResponse.data.user
    authStore.roles = mockResponse.data.user.roles || []
    authStore.permissions = mockResponse.data.user.permissions || []
    
    // 设置Token管理器的刷新回调
    tokenManager.setRefreshCallback(authStore.refreshTokens)
    
    // 添加登录成功反馈
    console.log(`用户 ${loginForm.username} 登录成功`)
    
    // 登录成功，跳转到仪表盘或之前访问的页面
    const redirectPath = router.currentRoute.value.query.redirect || '/dashboard'
    router.push(redirectPath)
  } catch (error) {
    console.error('登录失败:', error)
    errorMessage.value = error.message || '登录失败，请检查用户名和密码'
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

/* 用户选择器样式 */
.input-with-dropdown {
  position: relative;
  width: 100%;
}

.remembered-users-dropdown {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
}

.dropdown-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background-color: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  font-size: 14px;
  color: #495057;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom: none;
}

.dropdown-toggle:hover {
  background-color: #f8f9fa;
  border-color: #dee2e6;
}

.dropdown-arrow {
  transition: transform 0.2s ease;
}

.dropdown-arrow.open {
  transform: rotate(180deg);
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 10;
  background-color: white;
  border: 1px solid #e9ecef;
  border-top: none;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-height: 200px;
  overflow-y: auto;
}

.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.dropdown-item:hover {
  background-color: #f8f9fa;
}

.dropdown-user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dropdown-user-name {
  font-weight: 500;
  color: #212529;
}

.dropdown-last-login {
  font-size: 12px;
  color: #6c757d;
}

.dropdown-remove-btn {
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

.dropdown-remove-btn:hover {
  background-color: #f8d7da;
  color: #dc3545;
}

.form-input.with-dropdown {
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  border-top: none;
  margin-top: -1px; /* 覆盖下拉菜单的底部边框 */
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

.form-input {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.form-input:focus {
  outline: none;
  border-color: #6a11cb;
  box-shadow: 0 0 0 3px rgba(106, 17, 203, 0.1);
}

.form-input.error {
  border-color: #e74c3c;
}

.error-message {
  display: block;
  color: #e74c3c;
  font-size: 13px;
  margin-top: 5px;
}

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