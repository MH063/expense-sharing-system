<template>
  <div class="app-layout">
    <!-- 顶部导航栏 - 只在已登录时显示 -->
    <header v-if="isAuthenticated" class="app-header">
      <div class="header-container">
        <div class="logo">
          <router-link to="/dashboard" class="logo-link">
            <h1>寝室记账系统</h1>
          </router-link>
        </div>
        
        <nav class="main-nav">
          <ul class="nav-list">
            <li class="nav-item">
              <router-link to="/dashboard" class="nav-link">仪表盘</router-link>
            </li>
            <li class="nav-item" v-if="isAuthenticated">
              <router-link to="/expenses" class="nav-link">费用管理</router-link>
            </li>
            <li class="nav-item" v-if="isAuthenticated">
              <router-link to="/bills" class="nav-link">账单</router-link>
            </li>
            <li class="nav-item" v-if="isAuthenticated && hasPermission('bill:pay')">
              <router-link to="/qr-codes" class="nav-link">收款码</router-link>
            </li>
            <li class="nav-item" v-if="isAuthenticated && hasPermission('bill:pay')">
              <router-link to="/payments/history" class="nav-link">支付记录</router-link>
            </li>
            <li class="nav-item" v-if="isAuthenticated && hasPermission('room:invite')">
              <router-link to="/invite-codes" class="nav-link">邀请码管理</router-link>
            </li>
            <li class="nav-item" v-if="isAuthenticated">
              <router-link to="/analytics" class="nav-link">统计</router-link>
            </li>
            <li class="nav-item" v-if="isAuthenticated">
              <router-link to="/rooms" class="nav-link">寝室</router-link>
            </li>
            <li class="nav-item" v-if="isAuthenticated">
              <router-link to="/notifications" class="nav-link">通知</router-link>
            </li>
            <li class="nav-item" v-if="isAuthenticated">
              <router-link to="/notifications/center" class="nav-link">通知中心</router-link>
            </li>
          </ul>
        </nav>
        
        <div class="header-actions">
          <!-- 通知组件 -->
          <NotificationsContainer v-if="isAuthenticated" />
          
          <!-- 用户菜单 -->
          <div class="user-menu" v-if="isAuthenticated">
            <div class="user-avatar" @click="toggleUserMenu">
              <img :src="userAvatar" alt="用户头像" />
            </div>
            
            <div v-if="showUserMenu" class="user-dropdown">
              <div class="user-info">
                <div class="user-name">{{ currentUser?.username || '用户' }}</div>
                <div class="user-role">{{ userRoleText }}</div>
              </div>
              
              <ul class="dropdown-menu">
                <li>
                  <router-link to="/profile" class="dropdown-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    个人资料
                  </router-link>
                </li>
                <li>
                  <router-link to="/settings" class="dropdown-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <circle cx="12" cy="12" r="3"></circle>
                      <path d="M12 1v6m0 6v6m4.22-13.22l4.24 4.24M1.54 9.96l4.24 4.24M18.46 14.04l4.24 4.24M1.54 14.04l4.24-4.24"></path>
                    </svg>
                    设置
                  </router-link>
                </li>
                <li v-if="hasPermission('admin.access')">
                  <router-link to="/admin/permissions" class="dropdown-item">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                    权限管理
                  </router-link>
                </li>
                <li class="dropdown-divider"></li>
                <li>
                  <button @click="handleLogout" class="dropdown-item logout-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    退出登录
                  </button>
                </li>
              </ul>
            </div>
          </div>
          
          <!-- 登录/注册按钮 - 只在未登录时显示 -->
          <div class="auth-buttons" v-if="!isAuthenticated">
            <router-link to="/auth/login" class="btn btn-outline">登录</router-link>
            <router-link to="/auth/register" class="btn btn-primary">注册</router-link>
          </div>
        </div>
      </div>
    </header>
    
    <!-- 主要内容区域 -->
    <main class="app-main">
      <div class="main-container">
        <router-view />
      </div>
    </main>
    
    <!-- 页脚 -->
    <footer class="app-footer">
      <div class="footer-container">
        <p>&copy; 2023 寝室记账系统. All rights reserved.</p>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import NotificationsContainer from '@/components/NotificationsContainer.vue'

// 响应式数据
const showUserMenu = ref(false)
const authStore = useAuthStore()
const router = useRouter()

// 计算属性
const isAuthenticated = computed(() => authStore.isAuthenticated)
const currentUser = computed(() => authStore.currentUser)
const currentRole = computed(() => authStore.roles?.[0] || 'guest')
const userAvatar = computed(() => {
  return currentUser.value?.avatar || `https://picsum.photos/seed/${currentUser.value?.id || 'default'}/40/40.jpg`
})
const userRoleText = computed(() => {
  // 使用认证store的角色信息
  const role = currentRole.value
  // 角色映射表
  const roleMap = {
    'admin': '管理员',
    'system_admin': '系统管理员',
    'super_admin': '超级管理员',
    '寝室长': '寝室长',
    'payer': '付款人',
    'user': '普通用户'
  }
  
  return roleMap[role] || '未知角色'
})

// 权限检查
const hasPermission = (permission) => {
  return authStore.hasPermission(permission)
}

// 方法
const toggleUserMenu = () => {
  showUserMenu.value = !showUserMenu.value
}

const handleLogout = async () => {
  try {
    await authStore.logout()
    router.push('/')
  } catch (error) {
    console.error('登出失败:', error)
  }
}

// 点击外部关闭用户菜单
const handleClickOutside = (event) => {
  if (showUserMenu.value && !event.target.closest('.user-menu')) {
    showUserMenu.value = false
  }
}

// 生命周期
onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.app-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* 顶部导航栏 */
.app-header {
  background-color: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

.logo .logo-link {
  text-decoration: none;
  color: #333;
}

.logo h1 {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
  color: #4a6cf7;
}

.main-nav .nav-list {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
  gap: 1.5rem;
}

.nav-item .nav-link {
  text-decoration: none;
  color: #666;
  font-weight: 500;
  padding: 0.5rem 0;
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
}

.nav-item .nav-link:hover,
.nav-item .nav-link.router-link-active {
  color: #4a6cf7;
  border-bottom-color: #4a6cf7;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* 用户菜单 */
.user-menu {
  position: relative;
}

.user-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid #eee;
  transition: border-color 0.2s ease;
}

.user-avatar:hover {
  border-color: #4a6cf7;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  width: 220px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
  margin-top: 8px;
}

.user-info {
  padding: 1rem;
  border-bottom: 1px solid #eee;
}

.user-name {
  font-weight: 600;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.user-role {
  font-size: 0.8rem;
  color: #666;
}

.dropdown-menu {
  list-style: none;
  margin: 0;
  padding: 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  color: #333;
  text-decoration: none;
  font-size: 0.9rem;
  transition: background-color 0.2s ease;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
}

.dropdown-item:hover {
  background-color: #f5f5f5;
}

.dropdown-divider {
  height: 1px;
  background-color: #eee;
  margin: 0.5rem 0;
}

.logout-btn {
  color: #ff4757;
}

.logout-btn:hover {
  background-color: #ffebee;
}

/* 认证按钮 */
.auth-buttons {
  display: flex;
  gap: 0.75rem;
}

.btn-outline {
  background-color: transparent;
  color: #4a6cf7;
  border: 1px solid #4a6cf7;
}

.btn-outline:hover {
  background-color: #4a6cf7;
  color: white;
}

/* 主要内容区域 */
.app-main {
  flex: 1;
  padding: 2rem 0;
}

.main-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

/* 页脚 */
.app-footer {
  background-color: #f8f9fa;
  padding: 1.5rem 0;
  margin-top: auto;
}

.footer-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  text-align: center;
}

.footer-container p {
  margin: 0;
  color: #666;
  font-size: 0.9rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-container {
    padding: 0 0.75rem;
  }
  
  .logo h1 {
    font-size: 1.25rem;
  }
  
  .main-nav .nav-list {
    gap: 1rem;
  }
  
  .nav-item .nav-link {
    font-size: 0.9rem;
  }
  
  .auth-buttons {
    gap: 0.5rem;
  }
  
  .btn {
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
  }
}

@media (max-width: 576px) {
  .header-container {
    height: 56px;
  }
  
  .main-nav {
    display: none;
  }
  
  .user-dropdown {
    width: 200px;
  }
}
</style>