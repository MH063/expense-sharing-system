<template>
  <div class="settings-container">
    <div class="settings-header">
      <h1 class="page-title">系统设置</h1>
      <p class="page-subtitle">管理您的个人偏好和系统配置</p>
    </div>
    
    <div class="settings-content">
      <el-tabs v-model="activeTab" class="settings-tabs">
        <!-- 个人设置 -->
        <el-tab-pane label="个人设置" name="personal">
          <el-card class="settings-card">
            <template #header>
              <div class="card-header">
                <h3>个人信息</h3>
              </div>
            </template>
            
            <el-form :model="personalSettings" label-width="120px">
              <el-form-item label="用户名">
                <el-input v-model="personalSettings.username" placeholder="请输入用户名" />
              </el-form-item>
              
              <el-form-item label="邮箱">
                <el-input v-model="personalSettings.email" placeholder="请输入邮箱" />
              </el-form-item>
              
              <el-form-item label="手机号">
                <el-input v-model="personalSettings.phone" placeholder="请输入手机号" />
              </el-form-item>
              
              <el-form-item label="个人简介">
                <el-input
                  v-model="personalSettings.bio"
                  type="textarea"
                  :rows="3"
                  placeholder="请输入个人简介"
                />
              </el-form-item>
              
              <el-form-item>
                <el-button type="primary" @click="savePersonalSettings">保存个人信息</el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </el-tab-pane>
        
        <!-- 通知设置 -->
        <el-tab-pane label="通知设置" name="notifications">
          <el-card class="settings-card">
            <template #header>
              <div class="card-header">
                <h3>通知偏好</h3>
              </div>
            </template>
            
            <el-form :model="notificationSettings" label-width="180px">
              <el-form-item label="浏览器通知">
                <el-switch
                  v-model="notificationSettings.browserNotifications"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
              
              <el-form-item label="邮件通知">
                <el-switch
                  v-model="notificationSettings.emailNotifications"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
              
              <el-form-item label="费用提醒">
                <el-switch
                  v-model="notificationSettings.expenseNotifications"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
              
              <el-form-item label="邀请通知">
                <el-switch
                  v-model="notificationSettings.invitationNotifications"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
              
              <el-form-item>
                <el-button type="primary" @click="saveNotificationSettings">保存通知设置</el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </el-tab-pane>
        
        <!-- 隐私设置 -->
        <el-tab-pane label="隐私设置" name="privacy">
          <el-card class="settings-card">
            <template #header>
              <div class="card-header">
                <h3>隐私与安全</h3>
              </div>
            </template>
            
            <el-form :model="privacySettings" label-width="180px">
              <el-form-item label="个人资料可见性">
                <el-select v-model="privacySettings.profileVisibility" placeholder="请选择">
                  <el-option label="所有人" value="all" />
                  <el-option label="仅室友" value="roommates" />
                  <el-option label="仅自己" value="private" />
                </el-select>
              </el-form-item>
              
              <el-form-item label="费用信息可见性">
                <el-select v-model="privacySettings.expenseVisibility" placeholder="请选择">
                  <el-option label="所有人" value="all" />
                  <el-option label="仅室友" value="roommates" />
                  <el-option label="仅自己" value="private" />
                </el-select>
              </el-form-item>
              
              <el-form-item label="双因素认证">
                <el-switch
                  v-model="privacySettings.twoFactorAuth"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
              
              <el-form-item label="登录提醒">
                <el-switch
                  v-model="privacySettings.loginAlerts"
                  active-text="开启"
                  inactive-text="关闭"
                />
              </el-form-item>
              
              <el-form-item>
                <el-button type="primary" @click="savePrivacySettings">保存隐私设置</el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </el-tab-pane>
        
        <!-- 系统设置 -->
        <el-tab-pane label="系统设置" name="system">
          <el-card class="settings-card">
            <template #header>
              <div class="card-header">
                <h3>系统偏好</h3>
              </div>
            </template>
            
            <el-form :model="systemSettings" label-width="180px">
              <el-form-item label="主题">
                <el-select v-model="systemSettings.theme" placeholder="请选择">
                  <el-option label="浅色" value="light" />
                  <el-option label="深色" value="dark" />
                  <el-option label="跟随系统" value="auto" />
                </el-select>
              </el-form-item>
              
              <el-form-item label="语言">
                <el-select v-model="systemSettings.language" placeholder="请选择">
                  <el-option label="简体中文" value="zh-CN" />
                  <el-option label="English" value="en-US" />
                </el-select>
              </el-form-item>
              
              <el-form-item label="时区">
                <el-select v-model="systemSettings.timezone" placeholder="请选择">
                  <el-option label="北京时间 (GMT+8)" value="Asia/Shanghai" />
                  <el-option label="东京时间 (GMT+9)" value="Asia/Tokyo" />
                  <el-option label="洛杉矶时间 (GMT-8)" value="America/Los_Angeles" />
                  <el-option label="纽约时间 (GMT-5)" value="America/New_York" />
                </el-select>
              </el-form-item>
              
              <el-form-item label="日期格式">
                <el-select v-model="systemSettings.dateFormat" placeholder="请选择">
                  <el-option label="YYYY-MM-DD" value="YYYY-MM-DD" />
                  <el-option label="DD/MM/YYYY" value="DD/MM/YYYY" />
                  <el-option label="MM/DD/YYYY" value="MM/DD/YYYY" />
                </el-select>
              </el-form-item>
              
              <el-form-item>
                <el-button type="primary" @click="saveSystemSettings">保存系统设置</el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

// 获取认证状态
const authStore = useAuthStore()

// 当前激活的标签页
const activeTab = ref('personal')

// 个人设置
const personalSettings = reactive({
  username: '',
  email: '',
  phone: '',
  bio: ''
})

// 通知设置
const notificationSettings = reactive({
  browserNotifications: true,
  emailNotifications: true,
  expenseNotifications: true,
  invitationNotifications: true
})

// 隐私设置
const privacySettings = reactive({
  profileVisibility: 'roommates',
  expenseVisibility: 'roommates',
  twoFactorAuth: false,
  loginAlerts: true
})

// 系统设置
const systemSettings = reactive({
  theme: 'light',
  language: 'zh-CN',
  timezone: 'Asia/Shanghai',
  dateFormat: 'YYYY-MM-DD'
})

// 保存个人设置
const savePersonalSettings = () => {
  console.log('保存个人设置:', personalSettings)
  ElMessage.success('个人信息保存成功')
}

// 保存通知设置
const saveNotificationSettings = () => {
  console.log('保存通知设置:', notificationSettings)
  ElMessage.success('通知设置保存成功')
}

// 保存隐私设置
const savePrivacySettings = () => {
  console.log('保存隐私设置:', privacySettings)
  ElMessage.success('隐私设置保存成功')
}

// 保存系统设置
const saveSystemSettings = () => {
  console.log('保存系统设置:', systemSettings)
  ElMessage.success('系统设置保存成功')
}

// 初始化设置数据
onMounted(() => {
  // 从认证状态获取用户信息
  if (authStore.user) {
    personalSettings.username = authStore.user.name || ''
    personalSettings.email = authStore.user.email || ''
  }
})
</script>

<style scoped>
.settings-container {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}

.settings-header {
  margin-bottom: 30px;
  text-align: center;
}

.page-title {
  font-size: 28px;
  color: #303133;
  margin-bottom: 10px;
}

.page-subtitle {
  font-size: 16px;
  color: #606266;
}

.settings-content {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.settings-tabs {
  padding: 20px;
}

.settings-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

:deep(.el-tabs__header) {
  margin-bottom: 20px;
}

:deep(.el-form-item) {
  margin-bottom: 22px;
}

:deep(.el-select) {
  width: 100%;
}
</style>