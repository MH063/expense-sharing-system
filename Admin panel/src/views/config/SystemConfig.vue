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
                </div>
              </template>
              
              <el-form :model="basicConfig" label-width="150px">
                <el-form-item label="系统名称">
                  <el-input v-model="basicConfig.systemName" placeholder="请输入系统名称" />
                </el-form-item>
                
                <el-form-item label="系统版本">
                  <el-input v-model="basicConfig.systemVersion" placeholder="请输入系统版本" />
                </el-form-item>
                
                <el-form-item label="系统描述">
                  <el-input
                    v-model="basicConfig.systemDescription"
                    type="textarea"
                    rows="3"
                    placeholder="请输入系统描述"
                  />
                </el-form-item>
                
                <el-form-item label="系统Logo">
                  <el-upload
                    class="logo-uploader"
                    action="#"
                    :show-file-list="false"
                    :before-upload="beforeLogoUpload"
                    :on-success="handleLogoSuccess"
                  >
                    <img v-if="basicConfig.logoUrl" :src="basicConfig.logoUrl" class="logo" />
                    <el-icon v-else class="logo-uploader-icon"><Plus /></el-icon>
                  </el-upload>
                </el-form-item>
                
                <el-form-item label="系统主题色">
                  <el-color-picker v-model="basicConfig.primaryColor" />
                </el-form-item>
                
                <el-form-item label="系统语言">
                  <el-select v-model="basicConfig.language" placeholder="请选择系统语言">
                    <el-option label="简体中文" value="zh-CN" />
                    <el-option label="English" value="en-US" />
                  </el-select>
                </el-form-item>
                
                <el-form-item label="时区设置">
                  <el-select v-model="basicConfig.timezone" placeholder="请选择时区">
                    <el-option label="北京时间 (UTC+8)" value="Asia/Shanghai" />
                    <el-option label="东京时间 (UTC+9)" value="Asia/Tokyo" />
                    <el-option label="纽约时间 (UTC-5)" value="America/New_York" />
                    <el-option label="伦敦时间 (UTC+0)" value="Europe/London" />
                  </el-select>
                </el-form-item>
                
                <el-form-item label="系统维护模式">
                  <el-switch
                    v-model="basicConfig.maintenanceMode"
                    active-text="开启"
                    inactive-text="关闭"
                  />
                </el-form-item>
                
                <el-form-item label="维护提示信息">
                  <el-input
                    v-model="basicConfig.maintenanceMessage"
                    type="textarea"
                    rows="3"
                    placeholder="请输入维护提示信息"
                  />
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
                </div>
              </template>
              
              <el-form :model="securityConfig" label-width="150px">
                <el-form-item label="密码最小长度">
                  <el-input-number v-model="securityConfig.passwordMinLength" :min="6" :max="20" />
                </el-form-item>
                
                <el-form-item label="密码复杂度要求">
                  <el-checkbox-group v-model="securityConfig.passwordComplexity">
                    <el-checkbox label="uppercase">必须包含大写字母</el-checkbox>
                    <el-checkbox label="lowercase">必须包含小写字母</el-checkbox>
                    <el-checkbox label="number">必须包含数字</el-checkbox>
                    <el-checkbox label="special">必须包含特殊字符</el-checkbox>
                  </el-checkbox-group>
                </el-form-item>
                
                <el-form-item label="密码有效期">
                  <el-input-number v-model="securityConfig.passwordExpiry" :min="30" :max="365" />
                  <span style="margin-left: 10px;">天</span>
                </el-form-item>
                
                <el-form-item label="登录失败锁定">
                  <el-switch
                    v-model="securityConfig.loginLockEnabled"
                    active-text="开启"
                    inactive-text="关闭"
                  />
                </el-form-item>
                
                <el-form-item label="最大失败次数" v-if="securityConfig.loginLockEnabled">
                  <el-input-number v-model="securityConfig.maxFailedAttempts" :min="3" :max="10" />
                </el-form-item>
                
                <el-form-item label="锁定时间" v-if="securityConfig.loginLockEnabled">
                  <el-input-number v-model="securityConfig.lockDuration" :min="5" :max="60" />
                  <span style="margin-left: 10px;">分钟</span>
                </el-form-item>
                
                <el-form-item label="会话超时时间">
                  <el-input-number v-model="securityConfig.sessionTimeout" :min="10" :max="480" />
                  <span style="margin-left: 10px;">分钟</span>
                </el-form-item>
                
                <el-form-item label="双因素认证">
                  <el-switch
                    v-model="securityConfig.twoFactorAuth"
                    active-text="开启"
                    inactive-text="关闭"
                  />
                </el-form-item>
                
                <el-form-item label="操作日志记录">
                  <el-switch
                    v-model="securityConfig.operationLogging"
                    active-text="开启"
                    inactive-text="关闭"
                  />
                </el-form-item>
                
                <el-form-item label="日志保留时间">
                  <el-input-number v-model="securityConfig.logRetentionDays" :min="30" :max="365" />
                  <span style="margin-left: 10px;">天</span>
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
                </div>
              </template>
              
              <el-form :model="notificationConfig" label-width="150px">
                <el-form-item label="邮件通知">
                  <el-switch
                    v-model="notificationConfig.emailEnabled"
                    active-text="开启"
                    inactive-text="关闭"
                  />
                </el-form-item>
                
                <template v-if="notificationConfig.emailEnabled">
                  <el-form-item label="SMTP服务器">
                    <el-input v-model="notificationConfig.smtpHost" placeholder="请输入SMTP服务器地址" />
                  </el-form-item>
                  
                  <el-form-item label="SMTP端口">
                    <el-input-number v-model="notificationConfig.smtpPort" :min="1" :max="65535" />
                  </el-form-item>
                  
                  <el-form-item label="发件人邮箱">
                    <el-input v-model="notificationConfig.senderEmail" placeholder="请输入发件人邮箱" />
                  </el-form-item>
                  
                  <el-form-item label="邮箱密码">
                    <el-input v-model="notificationConfig.senderPassword" type="password" placeholder="请输入邮箱密码" />
                  </el-form-item>
                  
                  <el-form-item label="使用SSL">
                    <el-switch
                      v-model="notificationConfig.smtpSsl"
                      active-text="是"
                      inactive-text="否"
                    />
                  </el-form-item>
                </template>
                
                <el-form-item label="短信通知">
                  <el-switch
                    v-model="notificationConfig.smsEnabled"
                    active-text="开启"
                    inactive-text="关闭"
                  />
                </el-form-item>
                
                <template v-if="notificationConfig.smsEnabled">
                  <el-form-item label="短信服务商">
                    <el-select v-model="notificationConfig.smsProvider" placeholder="请选择短信服务商">
                      <el-option label="阿里云短信" value="aliyun" />
                      <el-option label="腾讯云短信" value="tencent" />
                      <el-option label="华为云短信" value="huawei" />
                    </el-select>
                  </el-form-item>
                  
                  <el-form-item label="AccessKey ID">
                    <el-input v-model="notificationConfig.smsAccessKey" placeholder="请输入AccessKey ID" />
                  </el-form-item>
                  
                  <el-form-item label="AccessKey Secret">
                    <el-input v-model="notificationConfig.smsSecretKey" type="password" placeholder="请输入AccessKey Secret" />
                  </el-form-item>
                </template>
                
                <el-form-item label="系统通知">
                  <el-checkbox-group v-model="notificationConfig.systemNotifications">
                    <el-checkbox label="userRegister">用户注册</el-checkbox>
                    <el-checkbox label="userLogin">用户登录</el-checkbox>
                    <el-checkbox label="expenseSubmit">费用提交</el-checkbox>
                    <el-checkbox label="expenseApproved">费用审核通过</el-checkbox>
                    <el-checkbox label="expenseRejected">费用审核拒绝</el-checkbox>
                    <el-checkbox label="disputeCreated">争议创建</el-checkbox>
                    <el-checkbox label="disputeResolved">争议解决</el-checkbox>
                    <el-checkbox label="systemError">系统错误</el-checkbox>
                  </el-checkbox-group>
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
                </div>
              </template>
              
              <el-form :model="backupConfig" label-width="150px">
                <el-form-item label="自动备份">
                  <el-switch
                    v-model="backupConfig.autoBackup"
                    active-text="开启"
                    inactive-text="关闭"
                  />
                </el-form-item>
                
                <template v-if="backupConfig.autoBackup">
                  <el-form-item label="备份频率">
                    <el-select v-model="backupConfig.backupFrequency" placeholder="请选择备份频率">
                      <el-option label="每天" value="daily" />
                      <el-option label="每周" value="weekly" />
                      <el-option label="每月" value="monthly" />
                    </el-select>
                  </el-form-item>
                  
                  <el-form-item label="备份时间" v-if="backupConfig.backupFrequency === 'daily'">
                    <el-time-picker
                      v-model="backupConfig.backupTime"
                      format="HH:mm"
                      placeholder="选择时间"
                    />
                  </el-form-item>
                  
                  <el-form-item label="备份时间" v-if="backupConfig.backupFrequency === 'weekly'">
                    <el-select v-model="backupConfig.backupDay" placeholder="请选择星期">
                      <el-option label="星期一" value="1" />
                      <el-option label="星期二" value="2" />
                      <el-option label="星期三" value="3" />
                      <el-option label="星期四" value="4" />
                      <el-option label="星期五" value="5" />
                      <el-option label="星期六" value="6" />
                      <el-option label="星期日" value="7" />
                    </el-select>
                    <el-time-picker
                      v-model="backupConfig.backupTime"
                      format="HH:mm"
                      placeholder="选择时间"
                      style="margin-left: 10px;"
                    />
                  </el-form-item>
                  
                  <el-form-item label="备份时间" v-if="backupConfig.backupFrequency === 'monthly'">
                    <el-select v-model="backupConfig.backupDay" placeholder="请选择日期">
                      <el-option
                        v-for="day in 31"
                        :key="day"
                        :label="`${day}日`"
                        :value="day"
                      />
                    </el-select>
                    <el-time-picker
                      v-model="backupConfig.backupTime"
                      format="HH:mm"
                      placeholder="选择时间"
                      style="margin-left: 10px;"
                    />
                  </el-form-item>
                </template>
                
                <el-form-item label="备份保留天数">
                  <el-input-number v-model="backupConfig.retentionDays" :min="7" :max="365" />
                  <span style="margin-left: 10px;">天</span>
                </el-form-item>
                
                <el-form-item label="备份存储位置">
                  <el-input v-model="backupConfig.storagePath" placeholder="请输入备份存储路径" />
                </el-form-item>
                
                <el-form-item label="备份压缩">
                  <el-switch
                    v-model="backupConfig.compression"
                    active-text="开启"
                    inactive-text="关闭"
                  />
                </el-form-item>
                
                <el-form-item label="备份加密">
                  <el-switch
                    v-model="backupConfig.encryption"
                    active-text="开启"
                    inactive-text="关闭"
                  />
                </el-form-item>
                
                <el-form-item label="备份密码" v-if="backupConfig.encryption">
                  <el-input v-model="backupConfig.backupPassword" type="password" placeholder="请输入备份密码" />
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
                </div>
              </template>
              
              <el-form :model="performanceConfig" label-width="150px">
                <el-form-item label="缓存过期时间">
                  <el-input-number v-model="performanceConfig.cacheExpiry" :min="60" :max="86400" />
                  <span style="margin-left: 10px;">秒</span>
                </el-form-item>
                
                <el-form-item label="最大并发连接数">
                  <el-input-number v-model="performanceConfig.maxConnections" :min="10" :max="1000" />
                </el-form-item>
                
                <el-form-item label="请求超时时间">
                  <el-input-number v-model="performanceConfig.requestTimeout" :min="5" :max="300" />
                  <span style="margin-left: 10px;">秒</span>
                </el-form-item>
                
                <el-form-item label="分页大小">
                  <el-input-number v-model="performanceConfig.pageSize" :min="10" :max="100" />
                </el-form-item>
                
                <el-form-item label="日志级别">
                  <el-select v-model="performanceConfig.logLevel" placeholder="请选择日志级别">
                    <el-option label="ERROR" value="error" />
                    <el-option label="WARN" value="warn" />
                    <el-option label="INFO" value="info" />
                    <el-option label="DEBUG" value="debug" />
                  </el-select>
                </el-form-item>
                
                <el-form-item label="启用性能监控">
                  <el-switch
                    v-model="performanceConfig.performanceMonitoring"
                    active-text="开启"
                    inactive-text="关闭"
                  />
                </el-form-item>
                
                <el-form-item label="启用慢查询日志">
                  <el-switch
                    v-model="performanceConfig.slowQueryLog"
                    active-text="开启"
                    inactive-text="关闭"
                  />
                </el-form-item>
                
                <el-form-item label="慢查询阈值" v-if="performanceConfig.slowQueryLog">
                  <el-input-number v-model="performanceConfig.slowQueryThreshold" :min="100" :max="10000" />
                  <span style="margin-left: 10px;">毫秒</span>
                </el-form-item>
              </el-form>
            </el-card>
          </el-tab-pane>
        </el-tabs>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, RefreshLeft, Plus } from '@element-plus/icons-vue'

// 当前激活的标签页
const activeTab = ref('basic')

// 基础设置配置
const basicConfig = reactive({
  systemName: '寝室记账系统',
  systemVersion: 'v1.0.0',
  systemDescription: '一个用于寝室费用分摊和管理的系统',
  logoUrl: 'https://picsum.photos/seed/system-logo/200/200.jpg',
  primaryColor: '#409EFF',
  language: 'zh-CN',
  timezone: 'Asia/Shanghai',
  maintenanceMode: false,
  maintenanceMessage: '系统正在维护中，请稍后再试'
})

// 安全设置配置
const securityConfig = reactive({
  passwordMinLength: 8,
  passwordComplexity: ['lowercase', 'number'],
  passwordExpiry: 90,
  loginLockEnabled: true,
  maxFailedAttempts: 5,
  lockDuration: 15,
  sessionTimeout: 120,
  twoFactorAuth: false,
  operationLogging: true,
  logRetentionDays: 90
})

// 通知设置配置
const notificationConfig = reactive({
  emailEnabled: true,
  smtpHost: 'smtp.example.com',
  smtpPort: 587,
  senderEmail: 'system@example.com',
  senderPassword: '',
  smtpSsl: true,
  smsEnabled: false,
  smsProvider: 'aliyun',
  smsAccessKey: '',
  smsSecretKey: '',
  systemNotifications: ['userRegister', 'expenseSubmit', 'expenseApproved', 'disputeCreated', 'disputeResolved']
})

// 备份设置配置
const backupConfig = reactive({
  autoBackup: true,
  backupFrequency: 'daily',
  backupDay: 1,
  backupTime: new Date(2000, 1, 1, 2, 0),
  retentionDays: 30,
  storagePath: '/var/backups/accounting-system',
  compression: true,
  encryption: false,
  backupPassword: ''
})

// 性能设置配置
const performanceConfig = reactive({
  cacheExpiry: 3600,
  maxConnections: 100,
  requestTimeout: 30,
  pageSize: 20,
  logLevel: 'info',
  performanceMonitoring: true,
  slowQueryLog: true,
  slowQueryThreshold: 1000
})

// 处理标签页切换
const handleTabClick = (tab) => {
  console.log('切换到标签页:', tab.props.name)
}

// 保存所有配置
const saveAllConfigs = () => {
  ElMessageBox.confirm('确定要保存所有配置吗？此操作将立即生效。', '确认保存', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // 模拟API调用
    setTimeout(() => {
      ElMessage.success('所有配置保存成功')
    }, 1000)
  }).catch(() => {
    // 用户取消操作
  })
}

// 恢复默认设置
const resetToDefault = () => {
  ElMessageBox.confirm('确定要恢复默认设置吗？这将覆盖当前所有配置。', '确认重置', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // 模拟API调用
    setTimeout(() => {
      ElMessage.success('已恢复默认设置')
      // 这里应该重新加载默认配置
    }, 1000)
  }).catch(() => {
    // 用户取消操作
  })
}

// Logo上传前的处理
const beforeLogoUpload = (file) => {
  const isJPG = file.type === 'image/jpeg' || file.type === 'image/png'
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isJPG) {
    ElMessage.error('上传Logo只能是 JPG/PNG 格式!')
  }
  if (!isLt2M) {
    ElMessage.error('上传Logo大小不能超过 2MB!')
  }
  return isJPG && isLt2M
}

// Logo上传成功处理
const handleLogoSuccess = (response, file) => {
  basicConfig.logoUrl = URL.createObjectURL(file.raw)
  ElMessage.success('Logo上传成功')
}

// 组件挂载时加载配置
onMounted(() => {
  // 这里应该从API加载当前配置
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