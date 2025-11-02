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
        >
          <el-menu-item index="1">
            <el-icon><House /></el-icon>
            <span>仪表盘</span>
          </el-menu-item>
          <el-menu-item index="2">
            <el-icon><User /></el-icon>
            <span>用户管理</span>
          </el-menu-item>
          <el-menu-item index="3">
            <el-icon><Money /></el-icon>
            <span>费用管理</span>
          </el-menu-item>
          <el-menu-item index="4">
            <el-icon><PieChart /></el-icon>
            <span>统计分析</span>
          </el-menu-item>
          <el-menu-item index="5">
            <el-icon><Setting /></el-icon>
            <span>系统设置</span>
          </el-menu-item>
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
          <div class="welcome-section">
            <el-card class="welcome-card">
              <template #header>
                <div class="card-header">
                  <span>欢迎使用管理系统</span>
                </div>
              </template>
              <div class="welcome-content">
                <el-row :gutter="20">
                  <el-col :span="8">
                    <el-statistic title="总用户数" :value="1234" />
                  </el-col>
                  <el-col :span="8">
                    <el-statistic title="总费用记录" :value="5678" />
                  </el-col>
                  <el-col :span="8">
                    <el-statistic title="活跃寝室" :value="89" />
                  </el-col>
                </el-row>
                <div class="quick-actions">
                  <h3>快捷操作</h3>
                  <el-space wrap>
                    <el-button type="primary">用户管理</el-button>
                    <el-button type="success">费用审核</el-button>
                    <el-button type="warning">数据统计</el-button>
                    <el-button type="info">系统设置</el-button>
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
import { ref } from 'vue'
import {
  House,
  User,
  Money,
  PieChart,
  Setting
} from '@element-plus/icons-vue'

const logout = () => {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    ElMessage.success('退出成功')
  }).catch(() => {
    // 取消操作
  })
}
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