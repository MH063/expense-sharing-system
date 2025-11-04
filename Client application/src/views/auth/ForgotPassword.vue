<template>
  <div class="forgot-password-container">
    <div class="forgot-password-card">
      <div class="forgot-password-header">
        <h1 class="forgot-password-title">忘记密码</h1>
        <p class="forgot-password-subtitle">请输入您的邮箱地址，我们将向您发送重置密码的链接</p>
      </div>
      
      <form @submit.prevent="handleSubmit" class="forgot-password-form">
        <div class="form-group">
          <label for="email" class="form-label">邮箱地址</label>
          <div class="input-wrapper">
            <input
              id="email"
              v-model="email"
              type="email"
              class="form-input"
              :class="{ 'error': errors.email }"
              placeholder="请输入您的邮箱地址"
              required
            />
            <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
          </div>
        </div>
        
        <button
          type="submit"
          class="submit-button"
          :disabled="isLoading"
        >
          <span v-if="!isLoading">发送重置链接</span>
          <span v-else class="loading-spinner"></span>
        </button>
        
        <div v-if="successMessage" class="success-banner">
          {{ successMessage }}
        </div>
        
        <div v-if="errorMessage" class="error-banner">
          {{ errorMessage }}
        </div>
      </form>
      
      <div class="forgot-password-footer">
        <p>想起密码了？<router-link to="/auth/login" class="login-link">返回登录</router-link></p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'

// 路由
const router = useRouter()

// 响应式数据
const isLoading = ref(false)
const email = ref('')
const successMessage = ref('')
const errorMessage = ref('')

// 表单验证错误
const errors = reactive({
  email: ''
})

/**
 * 验证邮箱格式
 * @param {string} email - 邮箱地址
 * @returns {boolean} 邮箱格式是否正确
 */
const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

/**
 * 表单验证
 * @returns {boolean} 表单是否有效
 */
const validateForm = () => {
  let isValid = true
  
  // 重置错误
  errors.email = ''
  
  // 验证邮箱
  if (!email.value.trim()) {
    errors.email = '请输入邮箱地址'
    isValid = false
  } else if (!validateEmail(email.value)) {
    errors.email = '请输入有效的邮箱地址'
    isValid = false
  }
  
  return isValid
}

/**
 * 处理表单提交
 */
const handleSubmit = async () => {
  if (!validateForm()) {
    return
  }
  
  isLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  
  try {
    console.log('模拟发送重置密码链接到:', email.value)
    
    // 模拟API响应延迟
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // 模拟API响应成功
    successMessage.value = '重置密码链接已发送到您的邮箱，请查收并按照邮件中的指示操作'
    
    // 3秒后跳转到登录页面
    setTimeout(() => {
      router.push('/auth/login')
    }, 3000)
  } catch (error) {
    console.error('发送重置链接失败:', error)
    errorMessage.value = error.message || '发送重置链接失败，请稍后再试'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.forgot-password-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f8f9fa;
  padding: 20px;
}

.forgot-password-card {
  width: 100%;
  max-width: 400px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.forgot-password-header {
  padding: 30px 30px 20px;
  text-align: center;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  color: white;
}

.forgot-password-title {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 8px;
}

.forgot-password-subtitle {
  font-size: 16px;
  opacity: 0.9;
  margin: 0;
  line-height: 1.5;
}

.forgot-password-form {
  padding: 30px;
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.input-wrapper {
  position: relative;
}

.form-input {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.form-input:focus {
  outline: none;
  border-color: #6a11cb;
  box-shadow: 0 0 0 3px rgba(106, 17, 203, 0.1);
}

.form-input.error {
  border-color: #e74c3c;
}

.error-message {
  display: block;
  color: #e74c3c;
  font-size: 13px;
  margin-top: 5px;
}

.submit-button {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.3s;
  margin-bottom: 15px;
}

.submit-button:hover:not(:disabled) {
  opacity: 0.9;
}

.submit-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.loading-spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: white;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.success-banner {
  margin-top: 15px;
  padding: 12px;
  background-color: #d4edda;
  border: 1px solid #c3e6cb;
  border-radius: 6px;
  color: #155724;
  font-size: 14px;
}

.error-banner {
  margin-top: 15px;
  padding: 12px;
  background-color: #fdecea;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
  color: #721c24;
  font-size: 14px;
}

.forgot-password-footer {
  padding: 20px 30px;
  text-align: center;
  background-color: #f8f9fa;
  font-size: 14px;
  color: #666;
}

.login-link {
  color: #6a11cb;
  text-decoration: none;
  font-weight: 500;
}

.login-link:hover {
  text-decoration: underline;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .forgot-password-card {
    margin: 0;
    border-radius: 0;
    min-height: 100vh;
  }
  
  .forgot-password-header {
    padding: 40px 20px 20px;
  }
  
  .forgot-password-form {
    padding: 20px;
  }
  
  .forgot-password-footer {
    padding: 20px;
  }
}
</style>