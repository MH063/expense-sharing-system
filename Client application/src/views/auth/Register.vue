<template>
  <div class="register-container">
    <div class="register-card">
      <div class="register-header">
        <h1 class="register-title">注册</h1>
        <p class="register-subtitle">创建您的寝室记账系统账号</p>
      </div>
      
      <form @submit.prevent="handleRegister" class="register-form">
        <div class="form-group">
          <label for="username" class="form-label">用户名</label>
          <div class="input-wrapper">
            <input
              id="username"
              v-model="registerForm.username"
              type="text"
              class="form-input"
              :class="{ 'error': errors.username }"
              placeholder="请输入用户名"
              required
            />
            <span v-if="errors.username" class="error-message">{{ errors.username }}</span>
          </div>
        </div>
        
        <div class="form-group">
          <label for="email" class="form-label">邮箱</label>
          <div class="input-wrapper">
            <input
              id="email"
              v-model="registerForm.email"
              type="email"
              class="form-input"
              :class="{ 'error': errors.email }"
              placeholder="请输入邮箱地址"
              required
            />
            <span v-if="errors.email" class="error-message">{{ errors.email }}</span>
          </div>
        </div>
        
        <div class="form-group">
          <label for="password" class="form-label">密码</label>
          <div class="input-wrapper">
            <div class="password-input">
              <input
                id="password"
                v-model="registerForm.password"
                :type="showPassword ? 'text' : 'password'"
                class="form-input"
                :class="{ 'error': errors.password }"
                placeholder="请输入密码"
                required
              />
              <button
                type="button"
                class="password-toggle"
                @click="showPassword = !showPassword"
              >
                <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              </button>
            </div>
            <span v-if="errors.password" class="error-message">{{ errors.password }}</span>
            <div class="password-strength">
              <div class="strength-bar">
                <div 
                  class="strength-fill" 
                  :class="passwordStrengthClass"
                  :style="{ width: passwordStrengthWidth }"
                ></div>
              </div>
              <span class="strength-text">{{ passwordStrengthText }}</span>
            </div>
            
            <!-- 密码要求提示 -->
            <div class="password-requirements" v-if="registerForm.password">
              <div class="requirements-title">密码要求：</div>
              <div class="requirements-list">
                <div class="requirement-item" :class="{ met: registerForm.password.length >= 8 }">
                  ✓ 至少8个字符
                </div>
                <div class="requirement-item" :class="{ met: /[a-z]/.test(registerForm.password) }">
                  ✓ 包含小写字母
                </div>
                <div class="requirement-item" :class="{ met: /[A-Z]/.test(registerForm.password) }">
                  ✓ 包含大写字母
                </div>
                <div class="requirement-item" :class="{ met: /[0-9]/.test(registerForm.password) }">
                  ✓ 包含数字
                </div>
                <div class="requirement-item" :class="{ met: /[^a-zA-Z0-9]/.test(registerForm.password) }">
                  ✓ 包含特殊字符
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="form-group">
          <label for="confirmPassword" class="form-label">确认密码</label>
          <div class="input-wrapper">
            <div class="password-input">
              <input
                id="confirmPassword"
                v-model="registerForm.confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                class="form-input"
                :class="{ 'error': errors.confirmPassword }"
                placeholder="请再次输入密码"
                required
              />
              <button
                type="button"
                class="password-toggle"
                @click="showConfirmPassword = !showConfirmPassword"
              >
                <svg v-if="showConfirmPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              </button>
            </div>
            <span v-if="errors.confirmPassword" class="error-message">{{ errors.confirmPassword }}</span>
          </div>
        </div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" v-model="registerForm.agree" />
            <span class="checkbox-text">我同意<a href="#" class="terms-link">服务条款</a>和<a href="#" class="terms-link">隐私政策</a></span>
          </label>
          <span v-if="errors.agree" class="error-message">{{ errors.agree }}</span>
        </div>
        
        <button
          type="submit"
          class="register-button"
          :disabled="isLoading"
        >
          <span v-if="!isLoading">注册</span>
          <span v-else class="loading-spinner"></span>
        </button>
        
        <div v-if="errorMessage" class="error-banner">
          {{ errorMessage }}
        </div>
      </form>
      
      <div class="register-footer">
        <p>已有账号？<router-link to="/auth/login" class="login-link">立即登录</router-link></p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

// 路由和状态管理
const router = useRouter()
const userStore = useUserStore()

// 响应式数据
const isLoading = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const errorMessage = ref('')

// 表单数据
const registerForm = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  agree: false
})

// 表单验证错误
const errors = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  agree: ''
})

// 计算密码强度
const passwordStrength = computed(() => {
  const password = registerForm.password
  if (!password) return 0
  
  let strength = 0
  
  // 长度检查
  if (password.length >= 8) strength += 1
  if (password.length >= 12) strength += 1
  
  // 复杂度检查
  if (/[a-z]/.test(password)) strength += 1
  if (/[A-Z]/.test(password)) strength += 1
  if (/[0-9]/.test(password)) strength += 1
  if (/[^a-zA-Z0-9]/.test(password)) strength += 1
  
  return Math.min(strength, 4)
})

// 密码强度样式类
const passwordStrengthClass = computed(() => {
  const strength = passwordStrength.value
  if (strength <= 1) return 'weak'
  if (strength === 2) return 'fair'
  if (strength === 3) return 'good'
  if (strength >= 4) return 'strong'
  return 'weak'
})

// 密码强度宽度百分比
const passwordStrengthWidth = computed(() => {
  return `${(passwordStrength.value / 4) * 100}%`
})

// 密码强度文本
const passwordStrengthText = computed(() => {
  const strength = passwordStrength.value
  if (strength === 0) return ''
  if (strength <= 1) return '弱'
  if (strength === 2) return '一般'
  if (strength === 3) return '良好'
  return '强'
})

// 表单验证
const validateForm = () => {
  let isValid = true
  
  // 重置错误
  errors.username = ''
  errors.email = ''
  errors.password = ''
  errors.confirmPassword = ''
  errors.agree = ''
  
  // 验证用户名
  if (!registerForm.username.trim()) {
    errors.username = '请输入用户名'
    isValid = false
  } else if (registerForm.username.length < 3) {
    errors.username = '用户名至少需要3个字符'
    isValid = false
  } else if (!/^[a-zA-Z0-9_]+$/.test(registerForm.username)) {
    errors.username = '用户名只能包含字母、数字和下划线'
    isValid = false
  }
  
  // 验证邮箱
  if (!registerForm.email.trim()) {
    errors.email = '请输入邮箱地址'
    isValid = false
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerForm.email)) {
    errors.email = '请输入有效的邮箱地址'
    isValid = false
  }
  
  // 验证密码
  if (!registerForm.password) {
    errors.password = '请输入密码'
    isValid = false
  } else if (registerForm.password.length < 8) {
    errors.password = '密码至少需要8个字符'
    isValid = false
  } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}/.test(registerForm.password)) {
    errors.password = '密码需包含大小写字母、数字和特殊字符'
    isValid = false
  }
  
  // 验证确认密码
  if (!registerForm.confirmPassword) {
    errors.confirmPassword = '请确认密码'
    isValid = false
  } else if (registerForm.password !== registerForm.confirmPassword) {
    errors.confirmPassword = '两次输入的密码不一致'
    isValid = false
  }
  
  // 验证同意条款
  if (!registerForm.agree) {
    errors.agree = '请同意服务条款和隐私政策'
    isValid = false
  }
  
  return isValid
}

// 处理注册
const handleRegister = async () => {
  if (!validateForm()) {
    return
  }
  
  isLoading.value = true
  errorMessage.value = ''
  
  try {
    const { authApi } = await import('@/api/user')
    const resp = await authApi.register({
      username: registerForm.username,
      email: registerForm.email,
      password: registerForm.password
    })
    if (resp?.data?.success) {
      router.push({ path: '/auth/login', query: { registered: 'true' } })
    } else {
      errorMessage.value = resp?.data?.message || '注册失败，请稍后再试'
    }
  } catch (error) {
    console.error('注册失败:', error)
    errorMessage.value = error.message || '注册失败，请稍后再试'
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.register-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f8f9fa;
  padding: 20px;
}

.register-card {
  width: 100%;
  max-width: 450px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.register-header {
  padding: 30px 30px 20px;
  text-align: center;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  color: white;
}

.register-title {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 8px;
}

.register-subtitle {
  font-size: 16px;
  opacity: 0.9;
  margin: 0;
}

.register-form {
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

.password-input {
  position: relative;
  display: flex;
  align-items: center;
}

.password-toggle {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
}

.password-strength {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.strength-bar {
  flex: 1;
  height: 4px;
  background-color: #eee;
  border-radius: 2px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  transition: width 0.3s, background-color 0.3s;
}

.strength-fill.weak {
  background-color: #e74c3c;
}

.strength-fill.fair {
  background-color: #f39c12;
}

.strength-fill.good {
  background-color: #3498db;
}

.strength-fill.strong {
  background-color: #2ecc71;
}

.strength-text {
  font-size: 12px;
  color: #666;
  min-width: 30px;
}

.password-requirements {
  margin-top: 10px;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.requirements-title {
  font-size: 13px;
  font-weight: 500;
  color: #495057;
  margin-bottom: 8px;
}

.requirements-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.requirement-item {
  font-size: 12px;
  color: #6c757d;
  display: flex;
  align-items: center;
  gap: 6px;
}

.requirement-item.met {
  color: #28a745;
  font-weight: 500;
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  font-size: 14px;
  color: #666;
  cursor: pointer;
  line-height: 1.4;
}

.checkbox-label input {
  margin-right: 8px;
  margin-top: 2px;
}

.terms-link {
  color: #6a11cb;
  text-decoration: none;
}

.terms-link:hover {
  text-decoration: underline;
}

.register-button {
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
  margin-top: 10px;
}

.register-button:hover:not(:disabled) {
  opacity: 0.9;
}

.register-button:disabled {
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

.error-banner {
  margin-top: 15px;
  padding: 12px;
  background-color: #fdecea;
  border: 1px solid #f5c6cb;
  border-radius: 6px;
  color: #721c24;
  font-size: 14px;
}

.register-footer {
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
  .register-card {
    margin: 0;
    border-radius: 0;
    min-height: 100vh;
  }
  
  .register-header {
    padding: 40px 20px 20px;
  }
  
  .register-form {
    padding: 20px;
  }
  
  .register-footer {
    padding: 20px;
  }
}
</style>