<template>
  <transition name="permission-toast">
    <div v-if="visible" class="permission-toast" :class="type">
      <div class="toast-icon">
        <el-icon v-if="type === 'error'"><CircleCloseFilled /></el-icon>
        <el-icon v-else-if="type === 'warning'"><WarningFilled /></el-icon>
        <el-icon v-else><InfoFilled /></el-icon>
      </div>
      <div class="toast-content">
        <div class="toast-title">{{ title }}</div>
        <div class="toast-message">{{ message }}</div>
        <div v-if="suggestion" class="toast-suggestion">{{ suggestion }}</div>
      </div>
      <div class="toast-actions">
        <el-button v-if="showLoginButton" size="small" type="primary" @click="goToLogin">
          去登录
        </el-button>
        <el-button v-if="showBackButton" size="small" @click="goBack">
          返回
        </el-button>
        <el-button size="small" text @click="close">
          关闭
        </el-button>
      </div>
    </div>
  </transition>
</template>

<script>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { CircleCloseFilled, WarningFilled, InfoFilled } from '@element-plus/icons-vue'

export default {
  name: 'PermissionToast',
  components: {
    CircleCloseFilled,
    WarningFilled,
    InfoFilled
  },
  setup() {
    const router = useRouter()
    const authStore = useAuthStore()
    
    const visible = ref(false)
    const type = ref('error') // error, warning, info
    const title = ref('')
    const message = ref('')
    const suggestion = ref('')
    const showLoginButton = ref(false)
    const showBackButton = ref(false)
    
    // 计算属性
    const isAuthenticated = computed(() => authStore.isAuthenticated)
    
    // 显示提示
    const show = (options) => {
      type.value = options.type || 'error'
      title.value = options.title || '权限错误'
      message.value = options.message || '您没有权限执行此操作'
      suggestion.value = options.suggestion || ''
      
      // 根据用户状态和错误类型决定显示哪些按钮
      showLoginButton.value = !isAuthenticated.value && options.showLoginButton !== false
      showBackButton.value = options.showBackButton !== false
      
      visible.value = true
      
      // 自动关闭（可选）
      if (options.autoClose !== false) {
        setTimeout(() => {
          close()
        }, options.duration || 5000)
      }
    }
    
    // 关闭提示
    const close = () => {
      visible.value = false
    }
    
    // 去登录页
    const goToLogin = () => {
      close()
      router.push('/auth/login')
    }
    
    // 返回上一页
    const goBack = () => {
      close()
      router.go(-1)
    }
    
    return {
      visible,
      type,
      title,
      message,
      suggestion,
      showLoginButton,
      showBackButton,
      show,
      close,
      goToLogin,
      goBack
    }
  }
}
</script>

<style scoped>
.permission-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  display: flex;
  align-items: flex-start;
  width: 380px;
  max-width: 90vw;
  padding: 16px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-left: 4px solid #f56c6c;
}

.permission-toast.warning {
  border-left-color: #e6a23c;
}

.permission-toast.info {
  border-left-color: #409eff;
}

.toast-icon {
  margin-right: 12px;
  font-size: 24px;
  color: #f56c6c;
}

.permission-toast.warning .toast-icon {
  color: #e6a23c;
}

.permission-toast.info .toast-icon {
  color: #409eff;
}

.toast-content {
  flex: 1;
}

.toast-title {
  font-weight: bold;
  margin-bottom: 4px;
  color: #303133;
}

.toast-message {
  font-size: 14px;
  color: #606266;
  margin-bottom: 8px;
}

.toast-suggestion {
  font-size: 13px;
  color: #909399;
  font-style: italic;
}

.toast-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-left: 12px;
}

.permission-toast-enter-active,
.permission-toast-leave-active {
  transition: all 0.3s ease;
}

.permission-toast-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.permission-toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

@media (max-width: 768px) {
  .permission-toast {
    width: calc(100vw - 40px);
    right: 20px;
    left: 20px;
  }
  
  .toast-actions {
    flex-direction: row;
    margin-left: 0;
    margin-top: 8px;
  }
}
</style>