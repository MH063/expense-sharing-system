<template>
  <div class="bill-payment">
    <div class="payment-header">
      <button class="back-button" @click="goBack">
        <i class="fas fa-arrow-left"></i>
      </button>
      <h1>账单支付</h1>
    </div>

    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载账单信息中...</p>
    </div>

    <div v-else-if="bill" class="payment-content">
      <!-- 账单信息卡片 -->
      <div class="bill-info-card">
        <div class="bill-header">
          <h2>{{ bill.title }}</h2>
          <span :class="['status-badge', bill.status]">{{ getStatusText(bill.status) }}</span>
        </div>
        
        <div class="bill-details">
          <div class="detail-row">
            <span class="label">总金额:</span>
            <span class="value">¥{{ bill.totalAmount.toFixed(2) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">我的份额:</span>
            <span class="value highlight">¥{{ userShare.toFixed(2) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">创建者:</span>
            <span class="value">{{ bill.creator.name }}</span>
          </div>
          <div class="detail-row">
            <span class="label">到期日期:</span>
            <span class="value">{{ formatDate(bill.dueDate) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">创建时间:</span>
            <span class="value">{{ formatDate(bill.createdAt) }}</span>
          </div>
        </div>
      </div>

      <!-- 支付状态卡片 -->
      <div class="payment-status-card">
        <h3>支付状态</h3>
        
        <div v-if="isPaid" class="paid-status">
          <div class="success-icon">
            <i class="fas fa-check-circle"></i>
          </div>
          <p>您已支付此账单</p>
          <p class="payment-time">支付时间: {{ formatDate(paymentTime) }}</p>
        </div>
        
        <div v-else class="unpaid-status">
          <div class="payment-methods">
            <h4>选择支付方式</h4>
            <div class="method-options">
              <div 
                v-for="method in paymentMethods" 
                :key="method.id"
                :class="['method-option', { active: selectedPaymentMethod === method.id }]"
                @click="selectPaymentMethod(method.id)"
              >
                <i :class="method.icon"></i>
                <span>{{ method.name }}</span>
              </div>
            </div>
          </div>
          
          <button 
            class="pay-button" 
            :disabled="!selectedPaymentMethod || processing"
            @click="processPayment"
          >
            <span v-if="!processing">确认支付 ¥{{ userShare.toFixed(2) }}</span>
            <span v-else>
              <i class="fas fa-spinner fa-spin"></i>
              处理中...
            </span>
          </button>
          
          <div v-if="isOverdue" class="overdue-warning">
            <i class="fas fa-exclamation-triangle"></i>
            <span>此账单已逾期，请尽快支付</span>
          </div>
        </div>
      </div>

      <!-- 参与者支付状态 -->
      <div class="participants-card">
        <h3>参与者支付状态</h3>
        <div class="participants-list">
          <div 
            v-for="participant in bill.participants" 
            :key="participant.id"
            class="participant-item"
          >
            <div class="participant-avatar">
              <img :src="participant.avatar || getDefaultAvatar()" :alt="participant.name">
            </div>
            <div class="participant-info">
              <p class="participant-name">{{ participant.name }}</p>
              <p class="participant-share">¥{{ participant.share.toFixed(2) }}</p>
            </div>
            <div class="participant-status">
              <span :class="['status-indicator', participant.paid ? 'paid' : 'unpaid']">
                {{ participant.paid ? '已支付' : '未支付' }}
              </span>
              <p v-if="participant.paid && participant.paymentTime" class="payment-time">
                {{ formatDate(participant.paymentTime) }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 账单备注 -->
      <div v-if="bill.description" class="description-card">
        <h3>账单备注</h3>
        <p>{{ bill.description }}</p>
      </div>
    </div>

    <div v-else class="error-container">
      <div class="error-icon">
        <i class="fas fa-exclamation-circle"></i>
      </div>
      <h2>账单不存在</h2>
      <p>您访问的账单不存在或已被删除</p>
      <button class="back-button" @click="goBack">返回</button>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import axios from 'axios'

export default {
  name: 'BillPayment',
  props: {
    billId: {
      type: String,
      required: true
    }
  },
  setup(props) {
    const route = useRoute()
    const router = useRouter()
    const store = useStore()
    
    // 状态管理
    const loading = ref(true)
    const bill = ref(null)
    const processing = ref(false)
    const selectedPaymentMethod = ref('')
    const paymentTime = ref(null)
    
    // 支付方式选项
    const paymentMethods = ref([
      { id: 'alipay', name: '支付宝', icon: 'fab fa-alipay' },
      { id: 'wechat', name: '微信支付', icon: 'fab fa-weixin' },
      { id: 'bank', name: '银行卡', icon: 'fas fa-credit-card' }
    ])
    
    // 计算属性
    const currentUser = computed(() => store.state.user.user)
    const userShare = computed(() => {
      if (!bill.value || !currentUser.value) return 0
      
      const participant = bill.value.participants.find(
        p => p.id === currentUser.value.id
      )
      return participant ? participant.share : 0
    })
    
    const isPaid = computed(() => {
      if (!bill.value || !currentUser.value) return false
      
      const participant = bill.value.participants.find(
        p => p.id === currentUser.value.id
      )
      return participant ? participant.paid : false
    })
    
    const isOverdue = computed(() => {
      if (!bill.value) return false
      return new Date(bill.value.dueDate) < new Date() && !isPaid.value
    })
    
    // 方法
    const fetchBillDetails = async () => {
      try {
        loading.value = true
        
        const response = await axios.get(`/api/bills/${props.billId}`)
        console.log('获取账单详情:', response.data)
        
        if (response.data.success) {
          bill.value = response.data.data
          
          // 检查当前用户是否已支付
          const participant = bill.value.participants.find(
            p => p.id === currentUser.value.id
          )
          if (participant && participant.paid) {
            paymentTime.value = participant.paymentTime
          }
        } else {
          console.error('获取账单详情失败:', response.data.message)
          bill.value = null
        }
      } catch (error) {
        console.error('获取账单详情出错:', error)
        bill.value = null
      } finally {
        loading.value = false
      }
    }
    
    const selectPaymentMethod = (methodId) => {
      selectedPaymentMethod.value = methodId
    }
    
    const processPayment = async () => {
      if (!selectedPaymentMethod.value) return
      
      try {
        processing.value = true
        
        const response = await axios.post(`/api/bills/${props.billId}/payment`, {
          paymentMethod: selectedPaymentMethod.value
        })
        
        console.log('支付结果:', response.data)
        
        if (response.data.success) {
          // 更新账单状态
          const participant = bill.value.participants.find(
            p => p.id === currentUser.value.id
          )
          if (participant) {
            participant.paid = true
            participant.paymentTime = new Date().toISOString()
            paymentTime.value = participant.paymentTime
          }
          
          // 显示成功消息
          store.dispatch('notification/addNotification', {
            type: 'success',
            message: '支付成功！'
          })
        } else {
          console.error('支付失败:', response.data.message)
          store.dispatch('notification/addNotification', {
            type: 'error',
            message: response.data.message || '支付失败，请重试'
          })
        }
      } catch (error) {
        console.error('支付出错:', error)
        store.dispatch('notification/addNotification', {
          type: 'error',
          message: '支付出错，请重试'
        })
      } finally {
        processing.value = false
      }
    }
    
    const getStatusText = (status) => {
      const statusMap = {
        'pending': '待支付',
        'partial': '部分支付',
        'completed': '已完成',
        'overdue': '已逾期'
      }
      return statusMap[status] || status
    }
    
    const formatDate = (dateString) => {
      if (!dateString) return ''
      
      const date = new Date(dateString)
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
    
    const getDefaultAvatar = () => {
      return 'https://picsum.photos/seed/default-avatar/100/100.jpg'
    }
    
    const goBack = () => {
      router.go(-1)
    }
    
    // 生命周期
    onMounted(() => {
      fetchBillDetails()
    })
    
    return {
      loading,
      bill,
      processing,
      selectedPaymentMethod,
      paymentTime,
      paymentMethods,
      currentUser,
      userShare,
      isPaid,
      isOverdue,
      selectPaymentMethod,
      processPayment,
      getStatusText,
      formatDate,
      getDefaultAvatar,
      goBack
    }
  }
}
</script>

<style scoped>
.bill-payment {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f9f9f9;
  min-height: 100vh;
}

.payment-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.back-button {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #666;
  cursor: pointer;
  margin-right: 15px;
  padding: 8px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s;
}

.back-button:hover {
  background-color: #e0e0e0;
}

.payment-header h1 {
  margin: 0;
  color: #333;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  border-top-color: #4a6cf7;
  animation: spin 1s ease-in-out infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.payment-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.bill-info-card, .payment-status-card, .participants-card, .description-card {
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.bill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.bill-header h2 {
  margin: 0;
  color: #333;
}

.status-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-badge.pending {
  background-color: #fff3cd;
  color: #856404;
}

.status-badge.partial {
  background-color: #cce5ff;
  color: #004085;
}

.status-badge.completed {
  background-color: #d4edda;
  color: #155724;
}

.status-badge.overdue {
  background-color: #f8d7da;
  color: #721c24;
}

.bill-details {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
}

.label {
  color: #666;
}

.value {
  font-weight: 500;
  color: #333;
}

.value.highlight {
  color: #4a6cf7;
  font-weight: 600;
  font-size: 1.1rem;
}

.payment-status-card h3, .participants-card h3, .description-card h3 {
  margin-top: 0;
  margin-bottom: 15px;
  color: #333;
}

.paid-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
  text-align: center;
}

.success-icon {
  font-size: 3rem;
  color: #28a745;
  margin-bottom: 15px;
}

.payment-time {
  color: #666;
  font-size: 0.9rem;
  margin-top: 5px;
}

.unpaid-status {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.payment-methods h4 {
  margin: 0 0 10px;
  color: #333;
}

.method-options {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.method-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 80px;
}

.method-option:hover {
  border-color: #4a6cf7;
  background-color: #f8f9ff;
}

.method-option.active {
  border-color: #4a6cf7;
  background-color: #f0f4ff;
}

.method-option i {
  font-size: 1.5rem;
  margin-bottom: 8px;
  color: #4a6cf7;
}

.method-option span {
  font-size: 0.9rem;
  color: #333;
}

.pay-button {
  background-color: #4a6cf7;
  color: white;
  border: none;
  padding: 15px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pay-button:hover:not(:disabled) {
  background-color: #3a5bd9;
}

.pay-button:disabled {
  background-color: #a0a0a0;
  cursor: not-allowed;
}

.overdue-warning {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background-color: #fff3cd;
  border-radius: 8px;
  color: #856404;
}

.overdue-warning i {
  color: #ffc107;
}

.participants-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.participant-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 10px 0;
  border-bottom: 1px solid #eee;
}

.participant-item:last-child {
  border-bottom: none;
}

.participant-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.participant-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.participant-info {
  flex-grow: 1;
}

.participant-name {
  margin: 0;
  font-weight: 500;
  color: #333;
}

.participant-share {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
}

.participant-status {
  text-align: right;
}

.status-indicator {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 500;
}

.status-indicator.paid {
  background-color: #d4edda;
  color: #155724;
}

.status-indicator.unpaid {
  background-color: #f8d7da;
  color: #721c24;
}

.description-card p {
  margin: 0;
  color: #666;
  line-height: 1.5;
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  text-align: center;
}

.error-icon {
  font-size: 3rem;
  color: #dc3545;
  margin-bottom: 15px;
}

.error-container h2 {
  margin: 0 0 10px;
  color: #333;
}

.error-container p {
  margin: 0 0 20px;
  color: #666;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .bill-payment {
    padding: 15px;
  }
  
  .method-options {
    justify-content: space-between;
  }
  
  .method-option {
    min-width: 70px;
    padding: 12px 8px;
  }
  
  .participant-item {
    gap: 10px;
  }
  
  .participant-avatar {
    width: 35px;
    height: 35px;
  }
}
</style>