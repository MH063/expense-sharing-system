<template>
  <div class="invite-container">
    <div class="invite-header">
      <h1 class="page-title">邀请码管理</h1>
      <p class="page-subtitle">生成和管理寝室邀请码</p>
    </div>
    
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载邀请码信息中...</p>
    </div>
    
    <div v-else-if="!hasRoom" class="empty-state">
      <div class="empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="8.5" cy="7" r="4"></circle>
          <line x1="20" y1="8" x2="20" y2="14"></line>
          <line x1="23" y1="11" x2="17" y2="11"></line>
        </svg>
      </div>
      <h2>您还没有加入任何寝室</h2>
      <p>加入或创建一个寝室后才能管理邀请码</p>
      <div class="empty-actions">
        <button class="primary-button" @click="createRoom">创建寝室</button>
        <button class="secondary-button" @click="joinRoom">加入寝室</button>
      </div>
    </div>
    
    <div v-else class="invite-content">
      <div class="current-invite-section">
        <div class="section-header">
          <h2>当前邀请码</h2>
          <button class="refresh-button" @click="regenerateInviteCode" :disabled="isRegenerating">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            <span v-if="!isRegenerating">重新生成</span>
            <span v-else class="loading-spinner"></span>
          </button>
        </div>
        
        <div class="invite-code-card">
          <div class="invite-code-display">
            <div class="code-value">{{ currentInviteCode }}</div>
            <button class="copy-button" @click="copyInviteCode">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              复制
            </button>
          </div>
          
          <div class="invite-link-display">
            <div class="link-value">{{ inviteLink }}</div>
            <button class="copy-button" @click="copyInviteLink">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              复制链接
            </button>
          </div>
          
          <div class="qr-code-section">
            <h3>二维码</h3>
            <div class="qr-code-container">
              <div class="qr-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                  <rect x="8" y="8" width="8" height="8"></rect>
                </svg>
              </div>
            </div>
            <button class="download-button" @click="downloadQRCode">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              下载二维码
            </button>
          </div>
        </div>
      </div>
      
      <div class="invite-history-section">
        <div class="section-header">
          <h2>邀请历史</h2>
          <div class="filter-tabs">
            <button
              class="filter-tab"
              :class="{ active: activeFilter === 'all' }"
              @click="activeFilter = 'all'"
            >
              全部
            </button>
            <button
              class="filter-tab"
              :class="{ active: activeFilter === 'accepted' }"
              @click="activeFilter = 'accepted'"
            >
              已接受
            </button>
            <button
              class="filter-tab"
              :class="{ active: activeFilter === 'pending' }"
              @click="activeFilter = 'pending'"
            >
              待处理
            </button>
            <button
              class="filter-tab"
              :class="{ active: activeFilter === 'expired' }"
              @click="activeFilter = 'expired'"
            >
              已过期
            </button>
          </div>
        </div>
        
        <div v-if="filteredInvites.length === 0" class="empty-invite-state">
          <div class="empty-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <p>暂无{{ getFilterName(activeFilter) }}邀请记录</p>
        </div>
        
        <div v-else class="invite-list">
          <div v-for="invite in filteredInvites" :key="invite.id" class="invite-item">
            <div class="invite-info">
              <div class="invite-code">{{ invite.code }}</div>
              <div class="invite-details">
                <div class="invite-status">
                  <span class="status-badge" :class="invite.status">
                    {{ getStatusDisplayName(invite.status) }}
                  </span>
                </div>
                <div class="invite-date">
                  创建于 {{ formatDate(invite.createdAt) }}
                </div>
                <div v-if="invite.acceptedAt" class="invite-accepted-date">
                  接受于 {{ formatDate(invite.acceptedAt) }}
                </div>
                <div v-if="invite.expiresAt" class="invite-expire-date">
                  {{ invite.status === 'expired' ? '已于' : '将于' }} {{ formatDate(invite.expiresAt) }} {{ invite.status === 'expired' ? '过期' : '过期' }}
                </div>
              </div>
            </div>
            
            <div class="invite-actions">
              <button
                v-if="invite.status === 'pending'"
                class="cancel-button"
                @click="cancelInvite(invite)"
              >
                取消
              </button>
              <button
                class="copy-button"
                @click="copyInviteCode(invite.code)"
              >
                复制
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div class="invite-settings-section">
        <div class="section-header">
          <h2>邀请设置</h2>
        </div>
        
        <div class="settings-card">
          <div class="setting-item">
            <div class="setting-info">
              <h3>邀请码有效期</h3>
              <p>设置邀请码的有效期限</p>
            </div>
            <div class="setting-control">
              <select v-model="inviteSettings.expiryDays" @change="updateInviteSettings">
                <option value="7">7天</option>
                <option value="14">14天</option>
                <option value="30">30天</option>
                <option value="0">永不过期</option>
              </select>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <h3>自动批准加入</h3>
              <p>新成员使用邀请码加入时自动批准</p>
            </div>
            <div class="setting-control">
              <label class="toggle-switch">
                <input
                  type="checkbox"
                  v-model="inviteSettings.autoApprove"
                  @change="updateInviteSettings"
                />
                <span class="toggle-slider"></span>
              </label>
            </div>
          </div>
          
          <div class="setting-item">
            <div class="setting-info">
              <h3>最大成员数</h3>
              <p>设置寝室最大成员数量限制</p>
            </div>
            <div class="setting-control">
              <input
                type="number"
                v-model="inviteSettings.maxMembers"
                min="2"
                max="20"
                @change="updateInviteSettings"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 成功/错误提示 -->
    <div v-if="successMessage" class="success-banner">
      {{ successMessage }}
    </div>
    
    <div v-if="errorMessage" class="error-banner">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 路由和状态管理
const router = useRouter()
const authStore = useAuthStore()

// 响应式数据
const loading = ref(true)
const hasRoom = ref(false)
const isRegenerating = ref(false)
const activeFilter = ref('all')
const successMessage = ref('')
const errorMessage = ref('')

// 当前邀请码
const currentInviteCode = ref('')

// 邀请历史
const inviteHistory = ref([])

// 邀请设置
const inviteSettings = reactive({
  expiryDays: '14',
  autoApprove: true,
  maxMembers: 8
})

// 计算属性
const inviteLink = computed(() => {
  if (!currentInviteCode.value) return ''
  return `${window.location.origin}/join?code=${currentInviteCode.value}`
})

const filteredInvites = computed(() => {
  if (activeFilter.value === 'all') return inviteHistory.value
  return inviteHistory.value.filter(invite => invite.status === activeFilter.value)
})

// 获取筛选器名称
const getFilterName = (filter) => {
  const filterMap = {
    all: '',
    accepted: '已接受的',
    pending: '待处理的',
    expired: '已过期的'
  }
  return filterMap[filter] || ''
}

// 获取状态显示名称
const getStatusDisplayName = (status) => {
  const statusMap = {
    pending: '待处理',
    accepted: '已接受',
    expired: '已过期',
    cancelled: '已取消'
  }
  return statusMap[status] || '未知'
}

// 格式化日期
const formatDate = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 加载邀请码数据
const loadInviteData = async () => {
  loading.value = true
  
  try {
    // 检查用户是否有寝室
    // const roomInfo = await api.getCurrentRoom()
    // hasRoom.value = !!roomInfo
    
    // 检查用户是否有寝室
    const roomInfo = await api.getCurrentRoom()
    hasRoom.value = !!roomInfo
    
    if (hasRoom.value) {
      // 获取当前邀请码
      currentInviteCode.value = await api.getCurrentInviteCode()
      
      // 获取邀请历史
      inviteHistory.value = await api.getInviteHistory()
      
      // 获取邀请设置
      Object.assign(inviteSettings, await api.getInviteSettings())
    }
    
  } catch (error) {
    console.error('加载邀请码数据失败:', error)
    errorMessage.value = '加载邀请码数据失败'
  } finally {
    loading.value = false
  }
}

// 创建寝室
const createRoom = () => {
  router.push('/rooms/create')
}

// 加入寝室
const joinRoom = () => {
  router.push('/rooms/join')
}

// 复制邀请码
const copyInviteCode = async (code = currentInviteCode.value) => {
  try {
    await navigator.clipboard.writeText(code)
    successMessage.value = '邀请码已复制到剪贴板'
    
    // 3秒后隐藏成功消息
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error) {
    console.error('复制邀请码失败:', error)
    errorMessage.value = '复制邀请码失败'
  }
}

// 复制邀请链接
const copyInviteLink = async () => {
  try {
    await navigator.clipboard.writeText(inviteLink.value)
    successMessage.value = '邀请链接已复制到剪贴板'
    
    // 3秒后隐藏成功消息
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
  } catch (error) {
    console.error('复制邀请链接失败:', error)
    errorMessage.value = '复制邀请链接失败'
  }
}

// 下载二维码
const downloadQRCode = () => {
  // 这里应该实现下载二维码的逻辑
  // 可以使用qrcode库生成二维码并下载
  successMessage.value = '二维码下载功能将在后续实现'
  
  setTimeout(() => {
    successMessage.value = ''
  }, 3000)
}

// 重新生成邀请码
const regenerateInviteCode = async () => {
  if (!confirm('确定要重新生成邀请码吗？旧邀请码将失效。')) return
  
  isRegenerating.value = true
  errorMessage.value = ''
  
  try {
    const newCode = await api.regenerateInviteCode()
    currentInviteCode.value = newCode
    
    successMessage.value = '邀请码已重新生成'
    
    // 3秒后隐藏成功消息
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
    
  } catch (error) {
    console.error('重新生成邀请码失败:', error)
    errorMessage.value = error.message || '重新生成邀请码失败'
  } finally {
    isRegenerating.value = false
  }
}

// 取消邀请
const cancelInvite = async (invite) => {
  if (!confirm(`确定要取消邀请码 ${invite.code} 吗？`)) return
  
  try {
    // await api.cancelInvite(invite.id)
    
    // 更新本地状态
    invite.status = 'cancelled'
    
    successMessage.value = '邀请已取消'
    
    // 3秒后隐藏成功消息
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
    
  } catch (error) {
    console.error('取消邀请失败:', error)
    errorMessage.value = error.message || '取消邀请失败'
  }
}

// 更新邀请设置
const updateInviteSettings = async () => {
  try {
    // await api.updateInviteSettings(inviteSettings)
    
    successMessage.value = '邀请设置已更新'
    
    // 3秒后隐藏成功消息
    setTimeout(() => {
      successMessage.value = ''
    }, 3000)
    
  } catch (error) {
    console.error('更新邀请设置失败:', error)
    errorMessage.value = '更新邀请设置失败'
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadInviteData()
})
</script>

<style scoped>
.invite-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.invite-header {
  margin-bottom: 30px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px;
}

.page-subtitle {
  font-size: 16px;
  color: #666;
  margin: 0;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(106, 17, 203, 0.1);
  border-radius: 50%;
  border-top-color: #6a11cb;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #666;
}

.empty-icon {
  color: #ccc;
  margin-bottom: 16px;
}

.empty-state h2 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px;
  color: #333;
}

.empty-state p {
  font-size: 16px;
  margin: 0 0 24px;
  max-width: 400px;
}

.empty-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.primary-button, .secondary-button {
  padding: 10px 20px;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.primary-button {
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  color: white;
  border: none;
}

.primary-button:hover {
  opacity: 0.9;
}

.secondary-button {
  background-color: white;
  color: #6a11cb;
  border: 1px solid #6a11cb;
}

.secondary-button:hover {
  background-color: #f5f7ff;
}

.invite-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.refresh-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background-color: #f5f5f5;
  color: #333;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
}

.refresh-button:hover:not(:disabled) {
  background-color: #e0e0e0;
}

.refresh-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.current-invite-section {
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  padding: 24px;
}

.invite-code-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.invite-code-display, .invite-link-display {
  display: flex;
  align-items: center;
  gap: 12px;
}

.code-value, .link-value {
  flex: 1;
  padding: 12px 15px;
  background-color: #f9f9f9;
  border: 1px solid #eee;
  border-radius: 6px;
  font-family: monospace;
  font-size: 16px;
  word-break: break-all;
}

.copy-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background-color: #6a11cb;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.3s;
  white-space: nowrap;
}

.copy-button:hover {
  opacity: 0.9;
}

.qr-code-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.qr-code-section h3 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.qr-code-container {
  width: 200px;
  height: 200px;
  border: 1px solid #eee;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: white;
}

.qr-placeholder {
  color: #ccc;
}

.download-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background-color: #f5f5f5;
  color: #333;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
}

.download-button:hover {
  background-color: #e0e0e0;
}

.invite-history-section {
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  padding: 24px;
}

.filter-tabs {
  display: flex;
  gap: 8px;
}

.filter-tab {
  padding: 8px 16px;
  background: none;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  color: #666;
  cursor: pointer;
  transition: all 0.3s;
}

.filter-tab:hover {
  color: #333;
}

.filter-tab.active {
  background-color: #f0f4ff;
  color: #6a11cb;
}

.empty-invite-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  color: #666;
}

.invite-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.invite-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border: 1px solid #eee;
  border-radius: 8px;
}

.invite-info {
  flex: 1;
}

.invite-code {
  font-family: monospace;
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.invite-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.invite-status {
  margin-bottom: 4px;
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.pending {
  background-color: #fff3e0;
  color: #f57c00;
}

.status-badge.accepted {
  background-color: #e8f5e9;
  color: #388e3c;
}

.status-badge.expired {
  background-color: #f5f5f5;
  color: #666;
}

.status-badge.cancelled {
  background-color: #ffebee;
  color: #d32f2f;
}

.invite-date, .invite-accepted-date, .invite-expire-date {
  font-size: 13px;
  color: #666;
}

.invite-actions {
  display: flex;
  gap: 8px;
}

.cancel-button {
  padding: 6px 12px;
  background-color: #ffebee;
  color: #d32f2f;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
}

.cancel-button:hover {
  background-color: #ffcdd2;
}

.invite-settings-section {
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  padding: 24px;
}

.settings-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.setting-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.setting-info h3 {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 4px;
}

.setting-info p {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.setting-control select, .setting-control input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background-color: white;
}

.setting-control input[type="number"] {
  width: 80px;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: background-color 0.3s;
  border-radius: 24px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: transform 0.3s;
  border-radius: 50%;
}

input:checked + .toggle-slider {
  background-color: #6a11cb;
}

input:checked + .toggle-slider:before {
  transform: translateX(24px);
}

.success-banner, .error-banner {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 16px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  z-index: 1000;
  max-width: 400px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.success-banner {
  background-color: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #c8e6c9;
}

.error-banner {
  background-color: #fdecea;
  color: #d32f2f;
  border: 1px solid #f5c6cb;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .invite-container {
    padding: 16px;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .filter-tabs {
    width: 100%;
    overflow-x: auto;
  }
  
  .invite-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .invite-actions {
    width: 100%;
    justify-content: flex-end;
  }
  
  .setting-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .setting-control {
    width: 100%;
  }
  
  .setting-control select, .setting-control input {
    width: 100%;
  }
}
</style>