<template>
  <div class="forbidden">
    <div class="content">
      <div class="icon">🚫</div>
      <h1>无访问权限</h1>
      <p class="message">抱歉，您没有权限访问当前页面。如果需要访问，请联系管理员获取相应权限。</p>
      
      <!-- 显示用户当前角色和权限信息 -->
      <div v-if="user" class="user-info">
        <div class="info-card">
          <h3>当前用户信息</h3>
          <p><strong>用户名:</strong> {{ user.username || user.email || '未知' }}</p>
          <p><strong>角色:</strong> {{ userRoleDisplay }}</p>
          <p><strong>权限:</strong> {{ userPermissionsDisplay }}</p>
        </div>
      </div>
      
      <!-- 建议可访问的页面 -->
      <div v-if="suggestedPages.length > 0" class="suggested-pages">
        <h3>您可以访问的页面</h3>
        <div class="page-list">
          <router-link 
            v-for="page in suggestedPages" 
            :key="page.path"
            :to="page.path"
            class="page-item"
          >
            <div class="page-icon">{{ page.icon }}</div>
            <div class="page-info">
              <h4>{{ page.title }}</h4>
              <p>{{ page.description }}</p>
            </div>
          </router-link>
        </div>
      </div>
      
      <div class="actions">
        <button class="btn" @click="goBack">返回上一页</button>
        <button class="btn" @click="goHome">返回首页</button>
        <button v-if="!user" class="btn btn-primary" @click="goLogin">登录</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ROLES, ROLE_PERMISSIONS } from '@/utils/permissions'

const router = useRouter()
const authStore = useAuthStore()
const suggestedPages = ref([])

// 获取当前用户信息
const user = computed(() => authStore.currentUser)

// 获取用户角色显示名称
const userRoleDisplay = computed(() => {
  if (!user.value) return '未知'
  
  const userRoles = authStore.roles || []
  const userRole = userRoles.length > 0 ? userRoles[0] : (user.value.role || 'guest')
  
  const roleNames = {
    [ROLES.SYSADMIN]: '系统管理员',
    [ROLES.ADMIN]: '管理员',
    [ROLES.ROOM_LEADER]: '寝室长',
    [ROLES.PAYER]: '缴费人',
    [ROLES.USER]: '普通用户',
    [ROLES.GUEST]: '访客'
  }
  
  return roleNames[userRole] || '未知角色'
})

// 获取用户权限显示名称
const userPermissionsDisplay = computed(() => {
  if (!user.value) return '无'
  
  const userPermissions = authStore.permissions || []
  
  if (userPermissions.includes('all')) {
    return '所有权限'
  }
  
  return userPermissions.length > 0 ? `${userPermissions.length} 项权限` : '基础权限'
})

// 获取建议可访问的页面
const getSuggestedPages = () => {
  if (!user.value) {
    // 未登录用户建议访问登录页
    suggestedPages.value = [
      {
        path: '/auth/login',
        title: '登录',
        description: '登录系统以获取更多权限',
        icon: '🔑'
      }
    ]
    return
  }
  
  const userRoles = authStore.roles || []
  const userRole = userRoles.length > 0 ? userRoles[0] : (user.value.role || 'guest')
  const userPermissions = authStore.permissions || []
  
  // 根据用户角色和权限建议可访问的页面
  const pages = []
  
  // 所有登录用户都可以访问的页面
  pages.push({
    path: '/dashboard',
    title: '仪表盘',
    description: '系统概览和快捷入口',
    icon: '📊'
  })
  
  pages.push({
    path: '/profile',
    title: '个人资料',
    description: '查看和编辑个人信息',
    icon: '👤'
  })
  
  // 根据角色添加特定页面
  if (userRole === ROLES.ADMIN || userRole === ROLES.SYSADMIN) {
    pages.push({
      path: '/rooms',
      title: '寝室管理',
      description: '管理系统中的寝室',
      icon: '🏠'
    })
    
    pages.push({
      path: '/expenses',
      title: '费用管理',
      description: '管理费用记录',
      icon: '💰'
    })
    
    pages.push({
      path: '/bills',
      title: '账单管理',
      description: '管理账单信息',
      icon: '🧾'
    })
  }
  
  if (userRole === ROLES.ROOM_LEADER) {
    pages.push({
      path: '/rooms',
      title: '我的寝室',
      description: '管理寝室信息和成员',
      icon: '🏠'
    })
    
    pages.push({
      path: '/expenses',
      title: '费用记录',
      description: '查看和管理寝室费用',
      icon: '💰'
    })
  }
  
  if (userRole === ROLES.PAYER || userRole === ROLES.USER) {
    pages.push({
      path: '/bills',
      title: '我的账单',
      description: '查看和支付账单',
      icon: '🧾'
    })
  }
  
  suggestedPages.value = pages.slice(0, 4) // 最多显示4个建议页面
}

// 页面加载时获取建议页面
onMounted(() => {
  getSuggestedPages()
})

// 返回上一页
const goBack = () => {
  router.back()
}

// 返回首页
const goHome = () => {
  router.push({ name: 'Home' })
}

// 跳转到登录页
const goLogin = () => {
  router.push({ name: 'Login' })
}
</script>

<style scoped>
.forbidden {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  padding: 2rem;
}

.content {
  background: rgba(255, 255, 255, 0.9);
  border-radius: 16px;
  padding: 2.5rem;
  max-width: 520px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  width: 100%;
}

.icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

h1 {
  font-size: 2rem;
  margin-bottom: 1rem;
  color: #2c3e50;
}

.message {
  color: #606266;
  line-height: 1.8;
  margin-bottom: 1.5rem;
}

.user-info {
  margin-bottom: 1.5rem;
}

.info-card {
  background: rgba(64, 158, 255, 0.1);
  border-radius: 8px;
  padding: 1rem;
  text-align: left;
  margin-bottom: 1rem;
}

.info-card h3 {
  margin-top: 0;
  margin-bottom: 0.5rem;
  color: #409eff;
  font-size: 1.1rem;
}

.info-card p {
  margin: 0.5rem 0;
  color: #606266;
  font-size: 0.9rem;
}

.suggested-pages {
  margin-bottom: 1.5rem;
}

.suggested-pages h3 {
  margin-bottom: 1rem;
  color: #2c3e50;
}

.page-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.page-item {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.page-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.page-icon {
  font-size: 1.5rem;
  margin-right: 0.75rem;
}

.page-info {
  text-align: left;
}

.page-info h4 {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  color: #2c3e50;
}

.page-info p {
  margin: 0;
  font-size: 0.85rem;
  color: #606266;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 20px rgba(118, 75, 162, 0.2);
}

.btn-primary {
  background: linear-gradient(135deg, #409eff 0%, #007acc 100%);
}

.btn-primary:hover {
  box-shadow: 0 10px 20px rgba(64, 158, 255, 0.2);
}

@media (max-width: 480px) {
  .content {
    padding: 2rem;
  }

  .btn {
    width: 100%;
  }
}
</style>
