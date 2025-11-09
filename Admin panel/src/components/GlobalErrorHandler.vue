<template>
  <div v-if="hasError" class="global-error-container">
    <el-result
      icon="error"
      title="页面出现错误"
      :sub-title="errorInfo.message || '抱歉，页面遇到了一些问题'"
    >
      <template #extra>
        <div class="error-actions">
          <el-button type="primary" @click="refreshPage">
            刷新页面
          </el-button>
          <el-button @click="resetError">
            返回上一页
          </el-button>
        </div>
        
        <!-- 开发环境显示错误详情 -->
        <details v-if="isDev" class="error-details">
          <summary>错误详情</summary>
          <pre>{{ errorInfo.stack }}</pre>
        </details>
      </template>
    </el-result>
  </div>
  <slot v-else />
</template>

<script setup>
import { onErrorCaptured, ref } from 'vue'
import { ElResult, ElButton } from 'element-plus'
import errorHandler from '@/utils/errorHandler'

const hasError = ref(false)
const errorInfo = ref({
  message: '',
  stack: '',
  timestamp: ''
})
const isDev = ref(import.meta.env.DEV)

// 捕获子组件错误
onErrorCaptured((err, instance, info) => {
  console.error('[Admin][组件错误]', err, instance, info)
  
  // 使用错误处理器处理组件错误
  errorHandler.handleBusinessError(`组件错误: ${err.message}`, {
    logError: true,
    showMessage: false
  })

  // 更新错误状态
  errorInfo.value = {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  }
  hasError.value = true

  // 阻止错误继续向上传播
  return false
})

// 重置错误状态
const resetError = () => {
  hasError.value = false
  errorInfo.value = {
    message: '',
    stack: '',
    timestamp: ''
  }
}

// 刷新页面
const refreshPage = () => {
  window.location.reload()
}
</script>

<style scoped>
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
</style>