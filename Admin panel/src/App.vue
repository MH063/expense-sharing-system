<template>
  <div id="app">
    <GlobalErrorHandler>
      <router-view />
    </GlobalErrorHandler>
  </div>
</template>

<script setup>
import { onMounted, onErrorCaptured } from 'vue'
import GlobalErrorHandler from '@/components/GlobalErrorHandler.vue'
import errorHandler from '@/utils/errorHandler'

// 管理端主应用组件

// 捕获全局错误
onErrorCaptured((err, instance, info) => {
  console.error('[Admin][全局错误]', err, instance, info)
  
  // 使用错误处理器处理全局错误
  errorHandler.handleBusinessError(`应用错误: ${err.message}`, {
    logError: true,
    showMessage: true
  })

  // 阻止错误继续向上传播
  return false
})

// 应用初始化
onMounted(() => {
  console.log('[Admin][应用初始化]')
  
  // 检查用户认证状态
  const token = localStorage.getItem('admin-token')
  if (!token && window.location.pathname !== '/login') {
    console.warn('[Admin][未检测到认证信息，跳转到登录页]')
    window.location.href = '/login'
  }
})
</script>

<style>
#app {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: #2c3e50;
  min-height: 100vh;
}

/* 全局错误容器样式 */
.global-error-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f7fa;
}

.error-actions {
  margin-top: 20px;
  display: flex;
  gap: 12px;
  justify-content: center;
}

.error-details {
  margin-top: 20px;
  padding: 12px;
  background-color: #f4f4f5;
  border-radius: 4px;
  font-size: 12px;
  color: #909399;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.error-details summary {
  cursor: pointer;
  font-weight: bold;
  margin-bottom: 8px;
}

.error-details pre {
  white-space: pre-wrap;
  word-break: break-all;
}

/* 全局加载样式 */
.global-loading .el-loading-text {
  color: #fff;
  font-size: 16px;
}

/* Element Plus 组件样式覆盖 */
.el-message {
  min-width: 300px;
}

.el-notification {
  min-width: 330px;
}
</style>