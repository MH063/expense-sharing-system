<template>
  <div class="system-config">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1>系统参数配置</h1>
          <p>管理系统运行参数和全局设置</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="saveAllConfigs">
            <el-icon><Check /></el-icon>
            保存所有配置
          </el-button>
          <el-button @click="resetToDefault">
            <el-icon><RefreshLeft /></el-icon>
            恢复默认
          </el-button>
        </div>
      </el-header>
      
      <el-main class="config-content">
        <el-tabs v-model="activeTab" @tab-click="handleTabClick">
          <!-- 基础设置 -->
          <el-tab-pane label="基础设置" name="basic">
            <el-card class="config-card">
              <template #header>
                <div class="card-header">
                  <h3>基础系统设置</h3>
                  <div class="card-actions">
                    <el-button size="small" @click="saveConfig('basic')" :loading="formLoading">
                      <el-icon><Check /></el-icon>
                      保存
                    </el-button>
                    <el-button size="small" @click="resetToDefault('basic')" :loading="formLoading">
                      <el-icon><RefreshLeft /></el-icon>
                      恢复默认
                    </el-button>
                  </div>
                </div>
              </template>
              
              <el-form :model="basicForm" label-width="150px">
                <el-form-item label="系统名称">
                  <el-input v-model="basicForm.systemName" placeholder="请输入系统名称" />
                </el-form-item>
                
                <el-form-item label="系统Logo">
                  <el-input v-model="basicForm.systemLogo" placeholder="请输入系统Logo URL" />
                </el-form-item>
                
                <el-form-item label="系统描述">
                  <el-input
                    v-model="basicForm.systemDescription"
                    type="textarea"
                    rows="3"
                    placeholder="请输入系统描述"
                  />
                </el-form-item>
                
                <el-form-item label="主题色">
                  <el-color-picker v-model="basicForm.themeColor" />
                </el-form-item>
                
                <el-form-item label="系统语言">
                  <el-select v-model="basicForm.language" placeholder="请选择系统语言">
                    <el-option label="简体中文" value="zh-CN" />
                    <el-option label="English" value="en-US" />
                  </el-select>
                </el-form-item>
                
                <el-form-item label="时区设置">
                  <el-select v-model="basicForm.timezone" placeholder="请选择时区">
                    <el-option label="北京时间 (UTC+8)" value="Asia/Shanghai" />
                    <el-option label="东京时间 (UTC+9)" value="Asia/Tokyo" />
                    <el-option label="纽约时间 (UTC-5)" value="America/New_York" />
                    <el-option label="伦敦时间 (UTC+0)" value="Europe/London" />
                  </el-select>
                </el-form-item>
                
                <el-form-item label="日期格式">
                  <el-select v-model="basicForm.dateFormat" placeholder="请选择日期格式">
                    <el-option label="YYYY-MM-DD" value="YYYY-MM-DD" />
                    <el-option label="DD/MM/YYYY" value="DD/MM/YYYY" />
                    <el-option label="MM/DD/YYYY" value="MM/DD/YYYY" />
                  </el-select>
                </el-form-item>
                
                <el-form-item label="时间格式">
                  <el-select v-model="basicForm.timeFormat" placeholder="请选择时间格式">
                    <el-option label="24小时制 (HH:mm:ss)" value="HH:mm:ss" />
                    <el-option label="12小时制 (hh:mm:ss A)" value="hh:mm:ss A" />
                  </el-select>
                </el-form-item>
              </el-form>
            </el-card>
          </el-tab-pane>
          
          <!-- 安全设置 -->
          <el-tab-pane label="安全设置" name="security">
            <el-card class="config-card">
              <template #header>
                <div class="card-header">
                  <h3>系统安全设置</h3>
                  <div class="card-actions">
                    <el-button size="small" @click="saveConfig('security')" :loading="formLoading">
                      <el-icon><Check /></el-icon>
                      保存
                    </el-button>
                    <el-button size="small" @click="resetToDefault('security')" :loading="formLoading">
                      <el-icon><RefreshLeft /></el-icon>
                      恢复默认
                    </el-button>
                  </div>
                </div>
              </template>
              
              <el-form :model="securityForm" label-width="150px">
                <el-form-item label="密码最小长度">
                  <el-input-number v-model="securityForm.passwordMinLength" :min="6" :max="20" />
                </el-form-item>
                
                <el-form-item label="密码复杂度要求">
                  <el-checkbox v-model="securityForm.passwordRequireUppercase">必须包含大写字母</el-checkbox>
                  <el-checkbox v-model="securityForm.passwordRequireLowercase">必须包含小写字母</el-checkbox>
                  <el-checkbox v-model="securityForm.passwordRequireNumbers">必须包含数字</el-checkbox>
                  <el-checkbox v-model="securityForm.passwordRequireSpecialChars">必须包含特殊字符</el-checkbox>
                </el-form-item>
                
                <el-form-item label="密码有效期">
                  <el-input-number v-model="securityForm.passwordExpiryDays" :min="30" :max="365" />
                  <span style="margin-left: 10px;">天</span>
                </el-form-item>
                
                <el-form-item label="会话超时时间">
                  <el-input-number v-model="securityForm.sessionTimeout" :min="10" :max="480" />
                  <span style="margin-left: 10px;">分钟</span>
                </el-form-item>
                
                <el-form-item label="最大登录尝试次数">
                  <el-input-number v-model="securityForm.maxLoginAttempts" :min="3" :max="10" />
                </el-form-item>
                
                <el-form-item label="账户锁定时间">
                  <el-input-number v-model="securityForm.lockoutDuration" :min="5" :max="60" />
                  <span style="margin-left: 10px;">分钟</span>
                </el-form-item>
                
                <el-form-item label="双因素认证">
                  <el-switch
                    v-model="securityForm.enableTwoFactorAuth"
                    active-text="开启"
                    inactive-text="关闭"
                  />
                </el-form-item>
                
                <el-form-item label="强制密码更改">
                  <el-switch
                    v-model="securityForm.forcePasswordChange"
                    active-text="开启"
                    inactive-text="关闭"
                  />
                </el-form-item>
              </el-form>
            </el-card>
          </el-tab-pane>
          
          <!-- 通知设置 -->
          <el-tab-pane label="通知设置" name="notification">
            <el-card class="config-card">
              <template #header>
                <div class="card-header">
                  <h3>系统通知设置</h3>
                  <div class="card-actions">
                    <el-button size="small" @click="saveConfig('notification')" :loading="formLoading">
                      <el-icon><Check /></el-icon>
                      保存
                    </el-button>
                    <el-button size="small" @click="resetToDefault('notification')" :loading="formLoading">
                      <el-icon><RefreshLeft /></el-icon>
                      恢复默认
                    </el-button>
                  </div>
                </div>
              </template>
              
              <el-form :model="notificationForm" label-width="150px">
                <el-form-item label="邮件通知">
                  <el-switch
                    v-model="notificationForm.emailNotifications"
                    active-text="开启"
                    inactive-text="关闭"
                  />
                </el-form-item>
                
                <template v-if="notificationForm.emailNotifications">
                  <el-form-item label="SMTP服务器">
                    <el-input v-model="notificationForm.emailSmtpServer" placeholder="请输入SMTP服务器地址" />
                  </el-form-item>
                  
                  <el-form-item label="SMTP端口">
                    <el-input-number v-model="notificationForm.emailSmtpPort" :min="1" :max="65535" />
                  </el-form-item>
                  
                  <el-form-item label="发件人邮箱">
                    <el-input v-model="notificationForm.emailUsername" placeholder="请输入发件人邮箱" />
                  </el-form-item>
                  
                  <el-form-item label="邮箱密码">
                    <el-input v-model="notificationForm.emailPassword" type="password" placeholder="请输入邮箱密码" />
                  </el-form-item>
                  
                  <el-form-item label="使用TLS">
                    <el-switch
                      v-model="notificationForm.emailUseTls"
                      active-text="是"
                      inactive-text="否"
                    />
                  </el-form-item>
                  
                  <el-form-item>
                    <el-button type="primary" size="small" @click="testEmailConfig" :loading="formLoading">
                      <el-icon><Bell /></el-icon>
                      测试邮件配置
                    </el-button>
                  </el-form-item>
                </template>
                
                <el-form-item label="短信通知">
                  <el-switch
                    v-model="notificationForm.smsNotifications"
                    active-text="开启"
                    inactive-text="关闭"
                  />
                </el-form-item>
                
                <template v-if="notificationForm.smsNotifications">
                  <el-form-item label="短信服务商">
                    <el-select v-model="notificationForm.smsProvider" placeholder="请选择短信服务商">
                      <el-option label="阿里云短信" value="aliyun" />
                      <el-option label="腾讯云短信" value="tencent" />
                      <el-option label="华为云短信" value="huawei" />
                    </el-select>
                  </el-form-item>
                  
                  <el-form-item label="API Key">
                    <el-input v-model="notificationForm.smsApiKey" placeholder="请输入API Key" />
                  </el-form-item>
                  
                  <el-form-item label="API Secret">
                    <el-input v-model="notificationForm.smsApiSecret" type="password" placeholder="请输入API Secret" />
                  </el-form-item>
                  
                  <el-form-item>
                    <el-button type="primary" size="small" @click="testSmsConfig" :loading="formLoading">
                      <el-icon><Bell /></el-icon>
                      测试短信配置
                    </el-button>
                  </el-form-item>
                </template>
                
                <el-form-item label="推送通知">
                  <el-switch
                    v-model="notificationForm.pushNotifications"
                    active-text="开启"
                    inactive-text="关闭"
                  />
                </el-form-item>
              </el-form>
            </el-card>
          </el-tab-pane>
          
          <!-- 备份设置 -->
          <el-tab-pane label="备份设置" name="backup">
            <el-card class="config-card">
              <template #header>
                <div class="card-header">
                  <h3>数据备份设置</h3>
                  <div class="card-actions">
                    <el-button size="small" @click="saveConfig('backup')" :loading="formLoading">
                      <el-icon><Check /></el-icon>
                      保存
                    </el-button>
                    <el-button size="small" @click="resetToDefault('backup')" :loading="formLoading">
                      <el-icon><RefreshLeft /></el-icon>
                      恢复默认
                    </el-button>
                  </div>
                </div>
              </template>
              
              <el-form :model="backupForm" label-width="150px">
                <el-form-item label="自动备份">
                  <el-switch
                    v-model="backupForm.autoBackup"
                    active-text="开启"
                    inactive-text="关闭"
                  />
                </el-form-item>
                
                <template v-if="backupForm.autoBackup">
                  <el-form-item label="备份频率">
                    <el-select v-model="backupForm.backupFrequency" placeholder="请选择备份频率">
                      <el-option label="每天" value="daily" />
                      <el-option label="每周" value="weekly" />
                      <el-option label="每月" value="monthly" />
                    </el-select>
                  </el-form-item>
                  
                  <el-form-item label="备份时间">
                    <el-time-picker
                      v-model="backupForm.backupTime"
                      format="HH:mm"
                      placeholder="选择时间"
                    />
                  </el-form-item>
                </template>
                
                <el-form-item label="备份保留天数">
                  <el-input-number v-model="backupForm.backupRetentionDays" :min="7" :max="365" />
                  <span style="margin-left: 10px;">天</span>
                </el-form-item>
                
                <el-form-item label="备份位置">
                  <el-select v-model="backupForm.backupLocation" placeholder="请选择备份位置">
                    <el-option label="本地存储" value="local" />
                    <el-option label="云存储" value="cloud" />
                  </el-select>
                </el-form-item>
                
                <template v-if="backupForm.backupLocation === 'cloud'">
                  <el-form-item label="云存储服务">
                    <el-switch
                      v-model="backupForm.cloudBackup"
                      active-text="开启"
                      inactive-text="关闭"
                    />
                  </el-form-item>
                  
                  <template v-if="backupForm.cloudBackup">
                    <el-form-item label="云服务商">
                      <el-select v-model="backupForm.cloudProvider" placeholder="请选择云服务商">
                        <el-option label="阿里云OSS" value="aliyun" />
                        <el-option label="腾讯云COS" value="tencent" />
                        <el-option label="华为云OBS" value="huawei" />
                      </el-select>
                    </el-form-item>
                    
                    <el-form-item label="存储桶名称">
                      <el-input v-model="backupForm.cloudBucket" placeholder="请输入存储桶名称" />
                    </el-form-item>
                    
                    <el-form-item label="AccessKey">
                      <el-input v-model="backupForm.cloudAccessKey" placeholder="请输入AccessKey" />
                    </el-form-item>
                    
                    <el-form-item label="SecretKey">
                      <el-input v-model="backupForm.cloudSecretKey" type="password" placeholder="请输入SecretKey" />
                    </el-form-item>
                    
                    <el-form-item>
                      <el-button type="primary" size="small" @click="testCloudBackupConfig" :loading="formLoading">
                        <el-icon><Setting /></el-icon>
                        测试云备份配置
                      </el-button>
                    </el-form-item>
                  </template>
                </template>
                
                <el-form-item label="备份加密">
                  <el-switch
                    v-model="backupForm.backupEncryption"
                    active-text="开启"
                    inactive-text="关闭"
                  />
                </el-form-item>
                
                <el-form-item>
                  <el-button type="primary" @click="manualBackup" :loading="formLoading">
                    <el-icon><Download /></el-icon>
                    立即备份
                  </el-button>
                </el-form-item>
              </el-form>
            </el-card>
          </el-tab-pane>
          
          <!-- 性能设置 -->
          <el-tab-pane label="性能设置" name="performance">
            <el-card class="config-card">
              <template #header>
                <div class="card-header">
                  <h3>系统性能设置</h3>
                  <div class="card-actions">
                    <el-button size="small" @click="saveConfig('performance')" :loading="formLoading">
                      <el-icon><Check /></el-icon>
                      保存
                    </el-button>
                    <el-button size="small" @click="resetToDefault('performance')" :loading="formLoading">
                      <el-icon><RefreshLeft /></el-icon>
                      恢复默认
                    </el-button>
                  </div>
                </div>
              </template>
              
              <el-form :model="performanceForm" label-width="150px">
                <el-form-item label="启用缓存">
                  <el-switch
                    v-model="performanceForm.enableCache"
                    active-text="开启"
                    inactive-text="关闭"
                  />
                </el-form-item>
                
                <el-form-item label="缓存过期时间" v-if="performanceForm.enableCache">
                  <el-input-number v-model="performanceForm.cacheExpireTime" :min="60" :max="86400" />
                  <span style="margin-left: 10px;">秒</span>
                </el-form-item>
                
                <el-form-item label="最大上传大小">
                  <el-input-number v-model="performanceForm.maxUploadSize" :min="1" :max="100" />
                  <span style="margin-left: 10px;">MB</span>
                </el-form-item>
                
                <el-form-item label="启用压缩">
                  <el-switch
                    v-model="performanceForm.enableCompression"
                    active-text="开启"
                    inactive-text="关闭"
                  />
                </el-form-item>
                
                <el-form-item label="启用懒加载">
                  <el-switch
                    v-model="performanceForm.enableLazyLoading"
                    active-text="开启"
                    inactive-text="关闭"
                  />
                </el-form-item>
                
                <el-form-item label="日志级别">
                  <el-select v-model="performanceForm.logLevel" placeholder="请选择日志级别">
                    <el-option label="ERROR" value="error" />
                    <el-option label="WARN" value="warn" />
                    <el-option label="INFO" value="info" />
                    <el-option label="DEBUG" value="debug" />
                  </el-select>
                </el-form-item>
                
                <el-form-item label="性能监控">
                  <el-switch
                    v-model="performanceForm.enablePerformanceMonitoring"
                    active-text="开启"
                    inactive-text="关闭"
                  />
                </el-form-item>
                
                <el-form-item label="最大并发用户数">
                  <el-input-number v-model="performanceForm.maxConcurrentUsers" :min="10" :max="10000" />
                </el-form-item>
                
                <el-form-item label="启用限流">
                  <el-switch
                    v-model="performanceForm.enableRateLimiting"
                    active-text="开启"
                    inactive-text="关闭"
                  />
                </el-form-item>
                
                <template v-if="performanceForm.enableRateLimiting">
                  <el-form-item label="限流请求数">
                    <el-input-number v-model="performanceForm.rateLimitRequests" :min="10" :max="1000" />
                  </el-form-item>
                  
                  <el-form-item label="限流时间窗口">
                    <el-input-number v-model="performanceForm.rateLimitWindow" :min="10" :max="3600" />
                    <span style="margin-left: 10px;">秒</span>
                  </el-form-item>
                </template>
                
                <el-form-item>
                  <el-button type="warning" @click="clearCache" :loading="formLoading">
                    <el-icon><Refresh /></el-icon>
                    清除缓存
                  </el-button>
                </el-form-item>
              </el-form>
            </el-card>
          </el-tab-pane>
        </el-tabs>
        
        <!-- 配置导入导出 -->
        <el-card class="config-card">
          <template #header>
            <div class="card-header">
              <h3>配置管理</h3>
            </div>
          </template>
          
          <div class="config-management">
            <el-button type="primary" @click="exportConfig" :loading="formLoading">
              <el-icon><Download /></el-icon>
              导出配置
            </el-button>
            
            <el-upload
              action="#"
              :auto-upload="false"
              :show-file-list="false"
              :on-change="importConfig"
              accept=".json"
            >
              <el-button type="success" :loading="formLoading">
                <el-icon><Upload /></el-icon>
                导入配置
              </el-button>
            </el-upload>
          </div>
        </el-card>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Setting, Lock, Bell, Download, Refresh } from '@element-plus/icons-vue'

// 当前选中的标签页
const activeTab = ref('basic')

// 基础设置表单
const basicForm = reactive({
  systemName: '记账系统',
  systemLogo: '',
  systemDescription: '多人记账管理系统',
  themeColor: '#409EFF',
  language: 'zh-CN',
  timezone: 'Asia/Shanghai',
  dateFormat: 'YYYY-MM-DD',
  timeFormat: 'HH:mm:ss'
})

// 安全设置表单
const securityForm = reactive({
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireLowercase: true,
  passwordRequireNumbers: true,
  passwordRequireSpecialChars: true,
  sessionTimeout: 30,
  maxLoginAttempts: 5,
  lockoutDuration: 15,
  enableTwoFactorAuth: false,
  forcePasswordChange: false,
  passwordExpiryDays: 90
})

// 通知设置表单
const notificationForm = reactive({
  emailNotifications: true,
  smsNotifications: false,
  pushNotifications: true,
  emailSmtpServer: process.env.VITE_SMTP_HOST || 'smtp.example.com',
  emailSmtpPort: parseInt(process.env.VITE_SMTP_PORT) || 587,
  emailUsername: process.env.VITE_SMTP_USERNAME || 'noreply@example.com',
  emailPassword: '',
  emailUseTls: true,
  smsProvider: 'aliyun',
  smsApiKey: '',
  smsApiSecret: ''
})

// 备份设置表单
const backupForm = reactive({
  autoBackup: true,
  backupFrequency: 'daily',
  backupTime: '02:00',
  backupRetentionDays: 30,
  backupLocation: 'local',
  cloudBackup: false,
  cloudProvider: 'aliyun',
  cloudBucket: '',
  cloudAccessKey: '',
  cloudSecretKey: '',
  backupEncryption: true
})

// 性能设置表单
const performanceForm = reactive({
  enableCache: true,
  cacheExpireTime: 3600,
  maxUploadSize: 10,
  enableCompression: true,
  enableLazyLoading: true,
  logLevel: 'info',
  enablePerformanceMonitoring: true,
  maxConcurrentUsers: 1000,
  enableRateLimiting: true,
  rateLimitRequests: 100,
  rateLimitWindow: 60
})

// 表单加载状态
const formLoading = ref(false)

// 保存配置
const saveConfig = async (formType) => {
  try {
    formLoading.value = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    let formName = ''
    switch (formType) {
      case 'basic':
        formName = '基础设置'
        break
      case 'security':
        formName = '安全设置'
        break
      case 'notification':
        formName = '通知设置'
        break
      case 'backup':
        formName = '备份设置'
        break
      case 'performance':
        formName = '性能设置'
        break
    }
    
    ElMessage.success(`${formName}保存成功`)
  } catch (error) {
    console.error('保存配置失败:', error)
    ElMessage.error('保存配置失败，请重试')
  } finally {
    formLoading.value = false
  }
}

// 恢复默认设置
const resetToDefault = async (formType) => {
  try {
    await ElMessageBox.confirm(
      '确定要恢复默认设置吗？此操作不可撤销。',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    formLoading.value = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 重置表单数据
    switch (formType) {
      case 'basic':
        basicForm.systemName = '记账系统'
        basicForm.systemLogo = ''
        basicForm.systemDescription = '多人记账管理系统'
        basicForm.themeColor = '#409EFF'
        basicForm.language = 'zh-CN'
        basicForm.timezone = 'Asia/Shanghai'
        basicForm.dateFormat = 'YYYY-MM-DD'
        basicForm.timeFormat = 'HH:mm:ss'
        break
      case 'security':
        securityForm.passwordMinLength = 8
        securityForm.passwordRequireUppercase = true
        securityForm.passwordRequireLowercase = true
        securityForm.passwordRequireNumbers = true
        securityForm.passwordRequireSpecialChars = true
        securityForm.sessionTimeout = 30
        securityForm.maxLoginAttempts = 5
        securityForm.lockoutDuration = 15
        securityForm.enableTwoFactorAuth = false
        securityForm.forcePasswordChange = false
        securityForm.passwordExpiryDays = 90
        break
      case 'notification':
        notificationForm.emailNotifications = true
        notificationForm.smsNotifications = false
        notificationForm.pushNotifications = true
        notificationForm.emailSmtpServer = 'smtp.example.com'
        notificationForm.emailSmtpPort = 587
        notificationForm.emailUsername = 'noreply@example.com'
        notificationForm.emailPassword = ''
        notificationForm.emailUseTls = true
        notificationForm.smsProvider = 'aliyun'
        notificationForm.smsApiKey = ''
        notificationForm.smsApiSecret = ''
        break
      case 'backup':
        backupForm.autoBackup = true
        backupForm.backupFrequency = 'daily'
        backupForm.backupTime = '02:00'
        backupForm.backupRetentionDays = 30
        backupForm.backupLocation = 'local'
        backupForm.cloudBackup = false
        backupForm.cloudProvider = 'aliyun'
        backupForm.cloudBucket = ''
        backupForm.cloudAccessKey = ''
        backupForm.cloudSecretKey = ''
        backupForm.backupEncryption = true
        break
      case 'performance':
        performanceForm.enableCache = true
        performanceForm.cacheExpireTime = 3600
        performanceForm.maxUploadSize = 10
        performanceForm.enableCompression = true
        performanceForm.enableLazyLoading = true
        performanceForm.logLevel = 'info'
        performanceForm.enablePerformanceMonitoring = true
        performanceForm.maxConcurrentUsers = 1000
        performanceForm.enableRateLimiting = true
        performanceForm.rateLimitRequests = 100
        performanceForm.rateLimitWindow = 60
        break
    }
    
    ElMessage.success('已恢复默认设置')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('恢复默认设置失败:', error)
      ElMessage.error('恢复默认设置失败，请重试')
    }
  } finally {
    formLoading.value = false
  }
}

// 测试邮件配置
const testEmailConfig = async () => {
  try {
    formLoading.value = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    ElMessage.success('邮件配置测试成功，测试邮件已发送')
  } catch (error) {
    console.error('邮件配置测试失败:', error)
    ElMessage.error('邮件配置测试失败，请检查配置信息')
  } finally {
    formLoading.value = false
  }
}

// 测试短信配置
const testSmsConfig = async () => {
  try {
    formLoading.value = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    ElMessage.success('短信配置测试成功，测试短信已发送')
  } catch (error) {
    console.error('短信配置测试失败:', error)
    ElMessage.error('短信配置测试失败，请检查配置信息')
  } finally {
    formLoading.value = false
  }
}

// 测试云备份配置
const testCloudBackupConfig = async () => {
  try {
    formLoading.value = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    ElMessage.success('云备份配置测试成功')
  } catch (error) {
    console.error('云备份配置测试失败:', error)
    ElMessage.error('云备份配置测试失败，请检查配置信息')
  } finally {
    formLoading.value = false
  }
}

// 手动备份
const manualBackup = async () => {
  try {
    formLoading.value = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    ElMessage.success('系统备份成功')
  } catch (error) {
    console.error('系统备份失败:', error)
    ElMessage.error('系统备份失败，请重试')
  } finally {
    formLoading.value = false
  }
}

// 清除缓存
const clearCache = async () => {
  try {
    formLoading.value = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    ElMessage.success('缓存清除成功')
  } catch (error) {
    console.error('清除缓存失败:', error)
    ElMessage.error('清除缓存失败，请重试')
  } finally {
    formLoading.value = false
  }
}

// 导出配置
const exportConfig = async () => {
  try {
    formLoading.value = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // 模拟下载配置文件
    const configData = {
      basic: basicForm,
      security: securityForm,
      notification: notificationForm,
      backup: backupForm,
      performance: performanceForm
    }
    
    const dataStr = JSON.stringify(configData, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `system-config-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    
    ElMessage.success('配置导出成功')
  } catch (error) {
    console.error('导出配置失败:', error)
    ElMessage.error('导出配置失败，请重试')
  } finally {
    formLoading.value = false
  }
}

// 导入配置
const importConfig = async (event) => {
  try {
    const file = event.target.files[0]
    if (!file) return
    
    formLoading.value = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const configData = JSON.parse(e.target.result)
        
        // 更新表单数据
        if (configData.basic) Object.assign(basicForm, configData.basic)
        if (configData.security) Object.assign(securityForm, configData.security)
        if (configData.notification) Object.assign(notificationForm, configData.notification)
        if (configData.backup) Object.assign(backupForm, configData.backup)
        if (configData.performance) Object.assign(performanceForm, configData.performance)
        
        ElMessage.success('配置导入成功')
      } catch (parseError) {
        console.error('解析配置文件失败:', parseError)
        ElMessage.error('配置文件格式错误，请检查文件内容')
      }
    }
    
    reader.readAsText(file)
  } catch (error) {
    console.error('导入配置失败:', error)
    ElMessage.error('导入配置失败，请重试')
  } finally {
    formLoading.value = false
    // 清空文件输入，以便可以重复选择同一文件
    event.target.value = ''
  }
}

// 保存所有配置
const saveAllConfigs = async () => {
  try {
    formLoading.value = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    ElMessage.success('所有配置保存成功')
  } catch (error) {
    console.error('保存所有配置失败:', error)
    ElMessage.error('保存所有配置失败，请重试')
  } finally {
    formLoading.value = false
  }
}

// 标签页点击事件
const handleTabClick = (tab) => {
  console.log('切换到标签页:', tab.props.name)
}

// 组件挂载时加载数据
onMounted(() => {
  // 这里应该从API加载当前配置
  console.log('SystemConfig组件已挂载')
})
</script>

<style scoped>
.system-config {
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

.config-content {
  padding: 20px;
  overflow-y: auto;
}

.config-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h3 {
  margin: 0;
  color: #303133;
}

.logo-uploader .el-upload {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
}

.logo-uploader .el-upload:hover {
  border-color: #409EFF;
}

.logo-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 178px;
  height: 178px;
  text-align: center;
  line-height: 178px;
}

.logo {
  width: 178px;
  height: 178px;
  display: block;
}
</style>