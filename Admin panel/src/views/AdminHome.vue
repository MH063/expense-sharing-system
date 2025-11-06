<template>
  <div class="admin-home">
    <el-container class="admin-container">
      <!-- 侧边栏 -->
      <el-aside width="250px" class="admin-sidebar">
        <div class="sidebar-header">
          <h2>管理系统</h2>
        </div>
        <el-menu
          default-active="1"
          class="admin-menu"
          background-color="#304156"
          text-color="#bfcbd9"
          active-text-color="#409EFF"
          router
        >
          <el-menu-item index="/">
            <el-icon><House /></el-icon>
            <span>仪表盘</span>
          </el-menu-item>
          <el-sub-menu index="docs">
            <template #title>
              <el-icon><Document /></el-icon>
              <span>文档管理</span>
            </template>
            <el-menu-item index="/docs">文档概览</el-menu-item>
            <el-menu-item index="/docs/requirements">需求文档</el-menu-item>
            <el-menu-item index="/docs/database">数据库设计</el-menu-item>
            <el-menu-item index="/docs/versions">版本控制</el-menu-item>
            <el-menu-item index="/docs/system">
              <el-icon><Tools /></el-icon>
              <span>系统设计文档</span>
            </el-menu-item>
            <el-menu-item index="/docs/versions">
                    <el-icon><Document /></el-icon>
                    <span>版本控制</span>
                  </el-menu-item>
                  <el-menu-item index="/docs/search">
                    <el-icon><Search /></el-icon>
                    <span>文档搜索</span>
                  </el-menu-item>
          </el-sub-menu>
          <el-sub-menu index="system">
            <template #title>
              <el-icon><Setting /></el-icon>
              <span>系统管理</span>
            </template>
            <el-menu-item index="/system/users">
              <el-icon><User /></el-icon>
              <span>用户管理</span>
            </el-menu-item>
            <el-menu-item index="/system/roles">
              <el-icon><Avatar /></el-icon>
              <span>角色分配</span>
            </el-menu-item>
            <el-menu-item index="/system/dorms">
              <el-icon><House /></el-icon>
              <span>寝室管理</span>
            </el-menu-item>
            <el-menu-item index="/system/expense">
              <el-icon><Money /></el-icon>
              <span>费用监控</span>
            </el-menu-item>
            <el-menu-item index="/system/abnormal">
              <el-icon><Warning /></el-icon>
              <span>异常费用识别</span>
            </el-menu-item>
          </el-sub-menu>
          <el-sub-menu index="review">
            <template #title>
              <el-icon><View /></el-icon>
              <span>审核与争议</span>
            </template>
            <el-menu-item index="/review/process">审核流程</el-menu-item>
            <el-menu-item index="/review/disputes">争议管理</el-menu-item>
            <el-menu-item index="/review/progress">
              <el-icon><TrendCharts /></el-icon>
              <span>处理进度跟踪</span>
            </el-menu-item>
          </el-sub-menu>
          <el-sub-menu index="config">
            <template #title>
              <el-icon><Setting /></el-icon>
              <span>系统配置与数据统计</span>
            </template>
            <el-menu-item index="/config/system">
              <el-icon><Setting /></el-icon>
              <span>系统参数配置</span>
            </el-menu-item>
            <el-menu-item index="/config/rules">
              <el-icon><Tools /></el-icon>
              <span>分摊规则管理</span>
            </el-menu-item>
            <el-menu-item index="/config/templates">
              <el-icon><Bell /></el-icon>
              <span>通知模板配置</span>
            </el-menu-item>
            <el-menu-item index="/config/statistics">
              <el-icon><TrendCharts /></el-icon>
              <span>系统使用统计</span>
            </el-menu-item>
          </el-sub-menu>
        </el-menu>
      </el-aside>

      <!-- 主内容区 -->
      <el-container>
        <el-header class="admin-header">
          <div class="header-left">
            <h1>寝室费用分摊记账系统 - 管理端</h1>
          </div>
          <div class="header-right">
            <el-button type="primary" @click="logout">退出登录</el-button>
          </div>
        </el-header>

        <el-main class="admin-main">
          <!-- 路由视图，用于显示子路由内容 -->
          <router-view />
          
          <!-- 首页内容，只在根路径显示 -->
          <div v-if="$route.path === '/'" class="welcome-section">
            <el-card class="welcome-card">
              <template #header>
                <div class="card-header">
                  <span>欢迎使用管理系统</span>
                </div>
              </template>
              <div class="welcome-content">
                <el-row :gutter="20">
                  <el-col :span="8">
                    <el-statistic title="总用户数" :value="statistics.totalUsers" />
                  </el-col>
                  <el-col :span="8">
                    <el-statistic title="总费用记录" :value="statistics.totalExpenses" />
                  </el-col>
                  <el-col :span="8">
                    <el-statistic title="活跃寝室" :value="statistics.activeRooms" />
                  </el-col>
                </el-row>
                <div class="quick-actions">
                  <h3>快捷操作</h3>
                  <el-space wrap>
                    <el-button type="primary" @click="navigateToUserManagement">用户管理</el-button>
                    <el-button type="success" @click="navigateToExpenseReview">费用审核</el-button>
                    <el-button type="warning" @click="navigateToDataStatistics">数据统计</el-button>
                    <el-button type="info" @click="navigateToSystemSettings">系统设置</el-button>
                  </el-space>
                </div>
              </div>
            </el-card>
          </div>
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { logout as authLogout } from '../utils/auth'
import { statisticsApi } from '../api'
import {
  House,
  Document,
  Setting,
  View,
  Tools,
  Search,
  User,
  Avatar,
  Money,
  Warning,
  Bell,
  Lock,
  TrendCharts
} from '@element-plus/icons-vue'

const router = useRouter()

// 统计数据
const statistics = ref({
  totalUsers: 0,
  totalExpenses: 0,
  activeRooms: 0
})

// 加载统计数据
const loadStatistics = async () => {
  try {
    console.log('开始加载系统统计数据')
    const response = await statisticsApi.getSystemOverview()
    console.log('统计数据响应:', response)
    
    // 处理后端返回的数据结构 {success: true, data: {...}}
    if (response.success && response.data) {
      statistics.value = {
        totalUsers: response.data.totalUsers || 0,
        totalExpenses: response.data.totalExpenses || 0,
        activeRooms: response.data.activeRooms || 0
      }
      console.log('统计数据已更新:', statistics.value)
    } else {
      console.error('统计数据响应格式错误:', response)
      ElMessage.error('统计数据格式错误')
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
    ElMessage.error('加载统计数据失败')
  }
}

const logout = () => {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // 清除登录状态
    authLogout()
    ElMessage.success('退出成功')
    // 跳转到登录页
    router.push('/login')
  }).catch(() => {
    // 取消操作
  })
}

// 导航到用户管理页面
const navigateToUserManagement = () => {
  router.push('/system/users')
}

// 导航到费用审核页面
const navigateToExpenseReview = () => {
  router.push('/review/process')
}

// 导航到数据统计页面
const navigateToDataStatistics = () => {
  router.push('/config/statistics')
}

// 导航到系统设置页面
const navigateToSystemSettings = () => {
  router.push('/config/system')
}

// 组件挂载时加载统计数据
onMounted(() => {
  loadStatistics()
})
</script>

<style scoped>
.admin-home {
  height: 100vh;
  overflow: hidden;
}

.admin-container {
  height: 100%;
}

.admin-sidebar {
  background-color: #304156;
  height: 100vh;
}

.sidebar-header {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  border-bottom: 1px solid #1f2d3d;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 18px;
}

.admin-menu {
  border-right: none;
}

.admin-header {
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}

.header-left h1 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

.admin-main {
  background-color: #f0f2f5;
  padding: 20px;
}

.welcome-section {
  max-width: 1200px;
  margin: 0 auto;
}

.welcome-card {
  margin-bottom: 20px;
}

.card-header {
  font-size: 18px;
  font-weight: 600;
}

.welcome-content {
  padding: 20px 0;
}

.quick-actions {
  margin-top: 30px;
}

.quick-actions h3 {
  margin-bottom: 15px;
  color: #606266;
}
</style>