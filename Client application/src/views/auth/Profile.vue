<template>
  <div class="profile-container">
    <div class="profile-header">
      <h1 class="page-title">个人资料</h1>
      <p class="page-subtitle">管理您的个人信息和账户设置</p>
    </div>
    
    <div class="profile-content">
      <div class="profile-card">
        <div class="profile-avatar">
          <div class="avatar-container">
            <img :src="profile.avatar || defaultAvatar" alt="用户头像" class="avatar-image" />
            <button class="avatar-change-btn" @click="showAvatarUpload = true">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 20h9"></path>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
              </svg>
            </button>
          </div>
        </div>
        
        <div class="profile-info">
          <h2 class="profile-name">{{ profile.username }}</h2>
          <p class="profile-email">{{ profile.email }}</p>
          <div class="profile-role">
            <span class="role-badge" :class="profile.role">{{ getRoleDisplayName(profile.role) }}</span>
          </div>
        </div>
      </div>
      
      <div class="profile-tabs">
        <div class="tab-buttons">
          <button
            class="tab-button"
            :class="{ active: activeTab === 'info' }"
            @click="activeTab = 'info'"
          >
            基本信息
          </button>
          <button
            class="tab-button"
            :class="{ active: activeTab === 'security' }"
            @click="activeTab = 'security'"
          >
            安全设置
          </button>
          <button
            class="tab-button"
            :class="{ active: activeTab === 'notifications' }"
            @click="activeTab = 'notifications'"
          >
            通知设置
          </button>
        </div>
        
        <div class="tab-content">
          <!-- 基本信息标签页 -->
          <div v-if="activeTab === 'info'" class="tab-pane">
            <form @submit.prevent="updateProfile" class="profile-form">
              <div class="form-group">
                <label for="username" class="form-label">用户名</label>
                <input
                  id="username"
                  v-model="profileForm.username"
                  type="text"
                  class="form-input"
                  :class="{ 'error': errors.username }"
                  required
                />
                <span v-if="errors.username" class="error-message">{{ errors.username }}</span>
              </div>
              
              <div class="form-group">
                <label for="email" class="form-label">邮箱</label>
                <input
                  id="email"
                  v-model="profileForm.email"
                  type="email"
                  class="form-input"
                  :class="{ 'error': errors.email }"
                  required
                />
                <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
              </div>
              
              <div class="form-group">
                <label for="displayName" class="form-label">显示名称</label>
                <input
                  id="displayName"
                  v-model="profileForm.displayName"
                  type="text"
                  class="form-input"
                  placeholder="在寝室中显示的名称"
                />
              </div>
              
              <div class="form-group">
                <label for="bio" class="form-label">个人简介</label>
                <textarea
                  id="bio"
                  v-model="profileForm.bio"
                  class="form-textarea"
                  rows="4"
                  placeholder="介绍一下自己..."
                ></textarea>
              </div>
              
              <div class="form-actions">
                <button
                  type="submit"
                  class="save-button"
                  :disabled="isSaving"
                >
                  <span v-if="!isSaving">保存更改</span>
                  <span v-else class="loading-spinner"></span>
                </button>
              </div>
            </form>
          </div>
          
          <!-- 安全设置标签页 -->
          <div v-if="activeTab === 'security'" class="tab-pane">
            <div class="security-section">
              <h3 class="section-title">修改密码</h3>
              <form @submit.prevent="changePassword" class="password-form">
                <div class="form-group">
                  <label for="currentPassword" class="form-label">当前密码</label>
                  <input
                    id="currentPassword"
                    v-model="passwordForm.currentPassword"
                    type="password"
                    class="form-input"
                    :class="{ 'error': errors.currentPassword }"
                    required
                  />
                  <span v-if="errors.currentPassword" class="error-message">{{ errors.currentPassword }}</span>
                </div>
                
                <div class="form-group">
                  <label for="newPassword" class="form-label">新密码</label>
                  <input
                    id="newPassword"
                    v-model="passwordForm.newPassword"
                    type="password"
                    class="form-input"
                    :class="{ 'error': errors.newPassword }"
                    required
                  />
                  <span v-if="errors.newPassword" class="error-message">{{ errors.newPassword }}</span>
                </div>
                
                <div class="form-group">
                  <label for="confirmPassword" class="form-label">确认新密码</label>
                  <input
                    id="confirmPassword"
                    v-model="passwordForm.confirmPassword"
                    type="password"
                    class="form-input"
                    :class="{ 'error': errors.confirmPassword }"
                    required
                  />
                  <span v-if="errors.confirmPassword" class="error-message">{{ errors.confirmPassword }}</span>
                </div>
                
                <div class="form-actions">
                  <button
                    type="submit"
                    class="save-button"
                    :disabled="isChangingPassword"
                  >
                    <span v-if="!isChangingPassword">修改密码</span>
                    <span v-else class="loading-spinner"></span>
                  </button>
                </div>
              </form>
            </div>
            
            <div class="security-section">
              <h3 class="section-title">登录活动</h3>
              <div class="login-activity">
                <div v-if="loginActivities.length === 0" class="empty-state">
                  <p>暂无登录活动记录</p>
                </div>
                <div v-else class="activity-list">
                  <div v-for="activity in loginActivities" :key="activity.id" class="activity-item">
                    <div class="activity-info">
                      <div class="activity-device">{{ activity.device }}</div>
                      <div class="activity-location">{{ activity.location }}</div>
                      <div class="activity-time">{{ formatDate(activity.timestamp) }}</div>
                    </div>
                    <div class="activity-status" :class="activity.status">
                      {{ activity.status === 'current' ? '当前会话' : '已退出' }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 通知设置标签页 -->
          <div v-if="activeTab === 'notifications'" class="tab-pane">
            <div class="notification-settings">
              <div class="setting-group">
                <h3 class="section-title">通知方式</h3>
                <div class="setting-item">
                  <div class="setting-info">
                    <h4 class="setting-title">浏览器通知</h4>
                    <p class="setting-description">在浏览器中接收通知</p>
                  </div>
                  <label class="toggle-switch">
                    <input
                      type="checkbox"
                      v-model="notificationSettings.browserNotifications"
                      @change="toggleBrowserNotifications"
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                
                <div class="setting-item">
                  <div class="setting-info">
                    <h4 class="setting-title">邮件通知</h4>
                    <p class="setting-description">通过邮件接收重要通知</p>
                  </div>
                  <label class="toggle-switch">
                    <input
                      type="checkbox"
                      v-model="notificationSettings.emailNotifications"
                      @change="updateNotificationSettings"
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
              
              <div class="setting-group">
                <h3 class="section-title">通知类型</h3>
                <div class="setting-item">
                  <div class="setting-info">
                    <h4 class="setting-title">费用通知</h4>
                    <p class="setting-description">当有新的费用记录或付款时通知</p>
                  </div>
                  <label class="toggle-switch">
                    <input
                      type="checkbox"
                      v-model="notificationSettings.expenseNotifications"
                      @change="updateNotificationSettings"
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
                
                <div class="setting-item">
                  <div class="setting-info">
                    <h4 class="setting-title">寝室邀请</h4>
                    <p class="setting-description">当收到寝室邀请时通知</p>
                  </div>
                  <label class="toggle-switch">
                    <input
                      type="checkbox"
                      v-model="notificationSettings.invitationNotifications"
                      @change="updateNotificationSettings"
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 成功提示 -->
    <div v-if="successMessage" class="success-banner">
      {{ successMessage }}
    </div>
    
    <!-- 错误提示 -->
    <div v-if="errorMessage" class="error-banner">
      {{ errorMessage }}
    </div>
    
    <!-- 头像上传弹窗 -->
    <div v-if="showAvatarUpload" class="modal-overlay" @click="showAvatarUpload = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>更换头像</h3>
          <button class="modal-close" @click="showAvatarUpload = false">×</button>
        </div>
        <div class="modal-body">
          <div class="avatar-upload-area" @click="triggerFileInput">
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              @change="handleFileChange"
              style="display: none"
            />
            <div v-if="!selectedAvatar" class="upload-placeholder">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
              <p>点击选择图片</p>
            </div>
            <div v-else class="avatar-preview">
              <img :src="selectedAvatar" alt="头像预览" />
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="cancel-button" @click="showAvatarUpload = false">取消</button>
          <button
            class="upload-button"
            @click="uploadAvatar"
            :disabled="!selectedAvatar || isUploadingAvatar"
          >
            <span v-if="!isUploadingAvatar">上传</span>
            <span v-else class="loading-spinner"></span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'

// 状态管理
const authStore = useAuthStore()

// 响应式数据
const activeTab = ref('info')
const isSaving = ref(false)
const isChangingPassword = ref(false)
const isUploadingAvatar = ref(false)
const showAvatarUpload = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const selectedAvatar = ref('')
const fileInput = ref(null)

// 默认头像
const defaultAvatar = 'https://picsum.photos/seed/default-avatar/200/200.jpg'

// 用户资料
const profile = reactive({
  id: '',
  username: '',
  email: '',
  displayName: '',
  bio: '',
  avatar: '',
  role: 'member'
})

// 表单数据
const profileForm = reactive({
  username: '',
  email: '',
  displayName: '',
  bio: ''
})

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const notificationSettings = reactive({
  browserNotifications: false,
  emailNotifications: true,
  expenseNotifications: true,
  invitationNotifications: true
})

// 表单验证错误
const errors = reactive({
  username: '',
  email: '',
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 登录活动记录
const loginActivities = ref([])

// 获取角色显示名称
const getRoleDisplayName = (role) => {
  const roleMap = {
    admin: '管理员',
    room_leader: '寝室长',
    member: '成员'
  }
  return roleMap[role] || '成员'
}

// 格式化日期
const formatDate = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 加载用户资料
const loadProfile = async () => {
  try {
    // 从认证状态获取用户信息
    const user = authStore.user
    if (user) {
      profile.id = user.id
      profile.username = user.username
      profile.email = user.email
      profile.displayName = user.displayName || ''
      profile.bio = user.bio || ''
      profile.avatar = user.avatar || ''
      profile.role = user.role || 'member'
      
      // 填充表单
      profileForm.username = profile.username
      profileForm.email = profile.email
      profileForm.displayName = profile.displayName
      profileForm.bio = profile.bio
    }
    
    // 模拟加载登录活动记录
    console.log('加载登录活动记录')
    const mockLoginActivities = [
      {
        id: 'activity-1',
        device: 'Chrome浏览器 / Windows 10',
        location: '北京市朝阳区',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'current'
      },
      {
        id: 'activity-2',
        device: 'Safari浏览器 / iPhone 14',
        location: '北京市海淀区',
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        status: 'exited'
      },
      {
        id: 'activity-3',
        device: 'Chrome浏览器 / macOS',
        location: '上海市浦东新区',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'exited'
      }
    ]
    loginActivities.value = mockLoginActivities
    
    // 加载通知设置
    console.log('加载通知设置')
    try {
      const response = await fetch('/api/notification-settings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authStore.token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          Object.assign(notificationSettings, data.data)
        } else {
          console.error('加载通知设置失败:', data.message)
        }
      } else {
        console.error('加载通知设置失败:', response.statusText)
      }
    } catch (error) {
      console.error('加载通知设置失败:', error)
      // 使用默认设置
      const defaultNotificationSettings = {
        browserNotifications: false,
        emailNotifications: true,
        expenseNotifications: true,
        invitationNotifications: true
      }
      Object.assign(notificationSettings, defaultNotificationSettings)
    }
    
  } catch (error) {
    console.error('加载用户资料失败:', error)
    errorMessage.value = '加载用户资料失败'
  }
}

// 更新个人资料
const updateProfile = async () => {
  // 重置错误
  errors.username = ''
  errors.email = ''
  
  // 表单验证
  let isValid = true
  
  if (!profileForm.username.trim()) {
    errors.username = '请输入用户名'
    isValid = false
  }
  
  if (!profileForm.email.trim()) {
    errors.email = '请输入邮箱'
    isValid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email)) {
    errors.email = '请输入有效的邮箱地址'
    isValid = false
  }
  
  if (!isValid) return
  
  isSaving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  
  try {
    // 模拟API调用
    console.log('更新个人资料:', profileForm)
    
    // 模拟API响应
    const mockResponse = {
      success: true,
      data: {
        ...profileForm,
        updatedAt: new Date().toISOString()
      }
    }
    
    if (mockResponse.success) {
      // 更新本地状态
      profile.username = profileForm.username
      profile.email = profileForm.email
      profile.displayName = profileForm.displayName
      profile.bio = profileForm.bio
      
      successMessage.value = '个人资料更新成功'
      
      // 3秒后隐藏成功消息
      setTimeout(() => {
        successMessage.value = ''
      }, 3000)
    } else {
      errorMessage.value = '更新个人资料失败'
    }
  } catch (error) {
    console.error('更新个人资料失败:', error)
    errorMessage.value = error.message || '更新个人资料失败'
  } finally {
    isSaving.value = false
  }
}

// 修改密码
const changePassword = async () => {
  // 重置错误
  errors.currentPassword = ''
  errors.newPassword = ''
  errors.confirmPassword = ''
  
  // 表单验证
  let isValid = true
  
  if (!passwordForm.currentPassword) {
    errors.currentPassword = '请输入当前密码'
    isValid = false
  }
  
  if (!passwordForm.newPassword) {
    errors.newPassword = '请输入新密码'
    isValid = false
  } else if (passwordForm.newPassword.length < 6) {
    errors.newPassword = '新密码至少需要6个字符'
    isValid = false
  }
  
  if (!passwordForm.confirmPassword) {
    errors.confirmPassword = '请确认新密码'
    isValid = false
  } else if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    errors.confirmPassword = '两次输入的密码不一致'
    isValid = false
  }
  
  if (!isValid) return
  
  isChangingPassword.value = true
  errorMessage.value = ''
  successMessage.value = ''
  
  try {
    console.log('修改密码')
    
    const response = await fetch('/api/users/password', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        // 重置表单
        passwordForm.currentPassword = ''
        passwordForm.newPassword = ''
        passwordForm.confirmPassword = ''
        
        successMessage.value = '密码修改成功'
        
        // 3秒后隐藏成功消息
        setTimeout(() => {
          successMessage.value = ''
        }, 3000)
      } else {
        errorMessage.value = data.message || '密码修改失败'
      }
    } else {
      const errorData = await response.json()
      errorMessage.value = errorData.message || `密码修改失败: ${response.statusText}`
    }
  } catch (error) {
    console.error('修改密码失败:', error)
    errorMessage.value = error.message || '修改密码失败'
  } finally {
    isChangingPassword.value = false
  }
}

// 更新通知设置
const updateNotificationSettings = async () => {
  try {
    console.log('更新通知设置:', notificationSettings)
    
    const response = await fetch('/api/notification-settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify(notificationSettings)
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.success) {
        successMessage.value = '通知设置已更新'
        
        // 3秒后隐藏成功消息
        setTimeout(() => {
          successMessage.value = ''
        }, 3000)
      } else {
        errorMessage.value = data.message || '更新通知设置失败'
      }
    } else {
      errorMessage.value = `更新通知设置失败: ${response.statusText}`
    }
  } catch (error) {
    console.error('更新通知设置失败:', error)
    errorMessage.value = '更新通知设置失败'
  }
}

// 切换浏览器通知
const toggleBrowserNotifications = async () => {
  if (notificationSettings.browserNotifications) {
    try {
      // 请求浏览器通知权限
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        notificationSettings.browserNotifications = false
        errorMessage.value = '浏览器通知权限被拒绝'
        return
      }
      
      // 更新通知设置
      updateNotificationSettings()
    } catch (error) {
      console.error('请求浏览器通知权限失败:', error)
      notificationSettings.browserNotifications = false
      errorMessage.value = '请求浏览器通知权限失败'
    }
  } else {
    // 更新通知设置
    updateNotificationSettings()
  }
}

// 触发文件选择
const triggerFileInput = () => {
  fileInput.value.click()
}

// 处理文件选择
const handleFileChange = (event) => {
  const file = event.target.files[0]
  if (file) {
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      errorMessage.value = '请选择图片文件'
      return
    }
    
    // 检查文件大小 (限制为2MB)
    if (file.size > 2 * 1024 * 1024) {
      errorMessage.value = '图片大小不能超过2MB'
      return
    }
    
    // 创建预览
    const reader = new FileReader()
    reader.onload = (e) => {
      selectedAvatar.value = e.target.result
    }
    reader.readAsDataURL(file)
  }
}

// 上传头像
const uploadAvatar = async () => {
  if (!selectedAvatar.value) return
  
  isUploadingAvatar.value = true
  errorMessage.value = ''
  
  try {
    // 模拟API调用
    console.log('上传头像')
    
    // 模拟上传成功，生成一个随机头像URL
    const avatarUrl = `https://picsum.photos/seed/avatar${Date.now()}/200/200.jpg`
    
    // 更新头像
    profile.avatar = avatarUrl
    
    // 关闭弹窗
    showAvatarUpload.value = false
    selectedAvatar.value = ''
    
    successMessage.value = '头像上传成功'
    
    // 3秒后隐藏成功消息
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
    
  } catch (error) {
    console.error('上传头像失败:', error)
    errorMessage.value = '上传头像失败'
  } finally {
    isUploadingAvatar.value = false
  }
}

// 组件挂载时加载用户资料
onMounted(() => {
  loadProfile()
})
</script>

<style scoped>
.profile-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
}

.profile-header {
  margin-bottom: 30px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px;
}

.page-subtitle {
  font-size: 16px;
  color: #666;
  margin: 0;
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.profile-card {
  display: flex;
  align-items: center;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  padding: 24px;
  gap: 20px;
}

.profile-avatar {
  flex-shrink: 0;
}

.avatar-container {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-change-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 32px;
  height: 32px;
  background-color: #6a11cb;
  color: white;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.3s;
}

.avatar-change-btn:hover {
  background-color: #5a0fb8;
}

.profile-info {
  flex: 1;
}

.profile-name {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px;
}

.profile-email {
  font-size: 16px;
  color: #666;
  margin: 0 0 12px;
}

.profile-role {
  margin-top: 8px;
}

.role-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.role-badge.admin {
  background-color: #e3f2fd;
  color: #1976d2;
}

.role-badge.room_leader {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.role-badge.member {
  background-color: #e8f5e9;
  color: #388e3c;
}

.profile-tabs {
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.tab-buttons {
  display: flex;
  border-bottom: 1px solid #eee;
}

.tab-button {
  flex: 1;
  padding: 16px;
  background: none;
  border: none;
  font-size: 16px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: color 0.3s, background-color 0.3s;
  position: relative;
}

.tab-button:hover {
  color: #333;
}

.tab-button.active {
  color: #6a11cb;
}

.tab-button.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: #6a11cb;
}

.tab-content {
  padding: 24px;
}

.tab-pane {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

.profile-form, .password-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.form-input, .form-textarea {
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.form-input:focus, .form-textarea:focus {
  outline: none;
  border-color: #6a11cb;
  box-shadow: 0 0 0 3px rgba(106, 17, 203, 0.1);
}

.form-input.error, .form-textarea.error {
  border-color: #e74c3c;
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
}

.error-message {
  color: #e74c3c;
  font-size: 13px;
  margin-top: 5px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.save-button {
  padding: 12px 24px;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.3s;
}

.save-button:hover:not(:disabled) {
  opacity: 0.9;
}

.save-button:disabled {
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

.security-section {
  margin-bottom: 40px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.login-activity {
  margin-top: 20px;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
  color: #666;
}

.activity-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.activity-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 1px solid #eee;
  border-radius: 8px;
}

.activity-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.activity-device {
  font-weight: 500;
  color: #333;
}

.activity-location {
  font-size: 14px;
  color: #666;
}

.activity-time {
  font-size: 13px;
  color: #999;
}

.activity-status {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
}

.activity-status.current {
  background-color: #e8f5e9;
  color: #388e3c;
}

.activity-status.exited {
  background-color: #f5f5f5;
  color: #666;
}

.notification-settings {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.setting-info {
  flex: 1;
}

.setting-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin: 0 0 4px;
}

.setting-description {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: background-color 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: transform 0.3s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: #6a11cb;
}

input:checked + .toggle-slider:before {
  transform: translateX(24px);
}

.success-banner, .error-banner {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 16px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  z-index: 1000;
  max-width: 400px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.success-banner {
  background-color: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #c8e6c9;
}

.error-banner {
  background-color: #fdecea;
  color: #d32f2f;
  border: 1px solid #f5c6cb;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 10px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

.avatar-upload-area {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.3s;
}

.avatar-upload-area:hover {
  border-color: #6a11cb;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: #666;
}

.upload-placeholder svg {
  color: #999;
}

.avatar-preview {
  display: flex;
  justify-content: center;
}

.avatar-preview img {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #eee;
}

.cancel-button {
  padding: 10px 20px;
  background-color: #f5f5f5;
  color: #333;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
}

.cancel-button:hover {
  background-color: #e0e0e0;
}

.upload-button {
  padding: 10px 20px;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.3s;
}

.upload-button:hover:not(:disabled) {
  opacity: 0.9;
}

.upload-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .profile-container {
    padding: 16px;
  }
  
  .profile-card {
    flex-direction: column;
    text-align: center;
  }
  
  .profile-info {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  
  .tab-buttons {
    flex-direction: column;
  }
  
  .tab-button.active::after {
    display: none;
  }
  
  .tab-button.active {
    background-color: #f5f7ff;
  }
  
  .activity-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>