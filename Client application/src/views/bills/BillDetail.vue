<template>
  <div class="bill-detail-container">
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载账单详情中...</p>
    </div>
    
    <div v-else-if="!bill" class="error-state">
      <div class="error-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h2>账单不存在</h2>
      <p>您要查看的账单不存在或已被删除</p>
      <button class="primary-button" @click="goBack">返回列表</button>
    </div>
    
    <div v-else class="bill-detail">
      <div class="detail-header">
        <button class="back-button" @click="goBack">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          返回
        </button>
        
        <div class="header-actions">
          <button v-if="canEdit" class="edit-button" @click="editBill">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            编辑
          </button>
          
          <button v-if="canDelete" class="delete-button" @click="confirmDelete">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            删除
          </button>
        </div>
      </div>
      
      <div class="detail-content">
        <div class="bill-main">
          <div class="bill-card">
            <div class="bill-icon">
              <BillIcon />
            </div>
            
            <div class="bill-info">
              <h1 class="bill-title">{{ bill.title }}</h1>
              <div class="bill-meta">
                <div class="bill-category">
                  {{ getCategoryName(bill.category) }}
                </div>
                <div class="bill-date">
                  创建日期: {{ formatDate(bill.createdAt) }}
                </div>
                <div class="bill-due-date">
                  到期日期: {{ formatDate(bill.dueDate) }}
                </div>
                <div class="bill-status">
                  <span class="status-badge" :class="bill.status">
                    {{ getStatusDisplayName(bill.status) }}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="bill-amount">
              <div class="amount-value">¥{{ bill.amount.toFixed(2) }}</div>
              <div class="my-share">我的份额: ¥{{ bill.myShare.toFixed(2) }}</div>
            </div>
          </div>
          
          <div v-if="bill.status === 'overdue'" class="overdue-alert">
            <div class="alert-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div class="alert-content">
              <div class="alert-title">账单已逾期</div>
              <div class="alert-message">此账单已逾期 {{ getOverdueDays(bill.dueDate) }} 天，请尽快处理</div>
            </div>
          </div>
          
          <div class="bill-details-card">
            <h2>账单详情</h2>
            
            <div class="detail-row">
              <div class="detail-label">创建者</div>
              <div class="detail-value">{{ bill.creatorName }}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">参与成员</div>
              <div class="detail-value">
                <div class="participants">
                  <div 
                    v-for="participant in bill.participants" 
                    :key="participant.id" 
                    class="participant"
                  >
                    <div class="participant-avatar">
                      {{ participant.name.charAt(0) }}
                    </div>
                    <div class="participant-info">
                      <div class="participant-name">{{ participant.name }}</div>
                      <div class="participant-share">¥{{ participant.share.toFixed(2) }}</div>
                      <div class="participant-status">
                        <span class="payment-status" :class="participant.paymentStatus">
                          {{ getPaymentStatusName(participant.paymentStatus) }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-if="bill.description" class="detail-row">
              <div class="detail-label">描述</div>
              <div class="detail-value">{{ bill.description }}</div>
            </div>
            
            <div v-if="bill.receipt" class="detail-row">
              <div class="detail-label">收据</div>
              <div class="detail-value">
                <div class="receipt-preview" @click="viewReceipt">
                  <img :src="bill.receipt" alt="收据" />
                  <div class="receipt-overlay">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    查看大图
                  </div>
                </div>
              </div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">创建时间</div>
              <div class="detail-value">{{ formatDateTime(bill.createdAt) }}</div>
            </div>
            
            <div v-if="bill.updatedAt" class="detail-row">
              <div class="detail-label">更新时间</div>
              <div class="detail-value">{{ formatDateTime(bill.updatedAt) }}</div>
            </div>
          </div>
        </div>
        
        <div class="bill-sidebar">
          <div class="payment-card">
            <h2>支付信息</h2>
            
            <div v-if="bill.status === 'paid'" class="paid-info">
              <div class="paid-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <div class="paid-text">
                <div class="paid-title">已支付</div>
                <div class="paid-date">支付时间: {{ formatDateTime(bill.paidAt) }}</div>
              </div>
            </div>
            
            <div v-else class="pending-info">
              <div class="pending-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div class="pending-text">
                <div class="pending-title">待支付</div>
                <div class="pending-description">此账单尚未支付</div>
              </div>
            </div>
            
            <div v-if="canPay && bill.status !== 'paid'" class="pay-actions">
              <button class="pay-button" @click="payBill">
                立即支付
              </button>
            </div>
            
            <div class="transfer-actions">
              <button class="transfer-button" @click="viewPaymentTransfers">
                支付转移记录
              </button>
            </div>
          </div>
          
          <div class="balance-card">
            <h2>余额变动</h2>
            
            <div class="balance-summary">
              <div class="balance-item">
                <div class="balance-label">账单总额</div>
                <div class="balance-value expense">¥{{ bill.amount.toFixed(2) }}</div>
              </div>
              
              <div class="balance-item">
                <div class="balance-label">我的份额</div>
                <div class="balance-value">¥{{ bill.myShare.toFixed(2) }}</div>
              </div>
              
              <div class="balance-item total">
                <div class="balance-label">待支付金额</div>
                <div class="balance-value" :class="netBalance >= 0 ? 'income' : 'expense'">
                  ¥{{ netBalance.toFixed(2) }}
                </div>
              </div>
            </div>
          </div>
          
          <div class="comments-card">
            <h2>评论</h2>
            
            <div v-if="comments.length === 0" class="empty-comments">
              <p>暂无评论</p>
            </div>
            
            <div v-else class="comments-list">
              <div v-for="comment in comments" :key="comment.id" class="comment-item">
                <div class="comment-avatar">
                  {{ comment.authorName.charAt(0) }}
                </div>
                <div class="comment-content">
                  <div class="comment-header">
                    <div class="comment-author">{{ comment.authorName }}</div>
                    <div class="comment-time">{{ formatDateTime(comment.createdAt) }}</div>
                  </div>
                  <div class="comment-text">{{ comment.text }}</div>
                </div>
              </div>
            </div>
            
            <div class="add-comment">
              <div class="comment-input-container">
                <input 
                  v-model="newComment" 
                  type="text" 
                  placeholder="添加评论..."
                  @keyup.enter="addComment"
                />
                <button class="comment-button" @click="addComment">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 删除确认模态框 -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="showDeleteModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>确认删除</h2>
        </div>
        
        <div class="modal-body">
          <p>确定要删除账单 "{{ bill.title }}" 吗？</p>
          <p>此操作不可恢复。</p>
        </div>
        
        <div class="modal-footer">
          <button class="secondary-button" @click="showDeleteModal = false">取消</button>
          <button class="danger-button" @click="deleteBill">删除</button>
        </div>
      </div>
    </div>
    
    <!-- 收据查看模态框 -->
    <div v-if="showReceiptModal" class="modal-overlay" @click="showReceiptModal = false">
      <div class="receipt-modal-content" @click.stop>
        <div class="receipt-modal-header">
          <h2>收据</h2>
          <button class="close-button" @click="showReceiptModal = false">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="receipt-modal-body">
          <img :src="bill.receipt" alt="收据" />
        </div>
      </div>
    </div>
    
    <!-- 支付模态框 -->
    <div v-if="showPayModal" class="modal-overlay" @click="showPayModal = false">
      <div class="pay-modal-content" @click.stop>
        <div class="pay-modal-header">
          <h2>支付账单</h2>
        </div>
        
        <div class="pay-modal-body">
          <div class="pay-amount">
            <div class="pay-label">支付金额</div>
            <div class="pay-value">¥{{ bill.myShare.toFixed(2) }}</div>
          </div>
          
          <div class="payment-methods">
            <div class="pay-label">支付方式</div>
            <div class="payment-method-options">
              <div 
                v-for="method in paymentMethods" 
                :key="method.id" 
                class="payment-method"
                :class="{ active: selectedPaymentMethod === method.id }"
                @click="selectedPaymentMethod = method.id"
              >
                <div class="method-icon">
                  <component :is="method.icon" />
                </div>
                <div class="method-name">{{ method.name }}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="pay-modal-footer">
          <button class="secondary-button" @click="showPayModal = false">取消</button>
          <button class="primary-button" @click="confirmPay">确认支付</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 图标组件
const BillIcon = {
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  `
}

// 支付方式图标
const AlipayIcon = {
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect>
      <line x1="7" y1="9" x2="17" y2="9"></line>
      <line x1="7" y1="15" x2="17" y2="15"></line>
    </svg>
  `
}

const WechatIcon = {
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
  `
}

const BankCardIcon = {
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
      <line x1="1" y1="10" x2="23" y2="10"></line>
    </svg>
  `
}

// 路由和状态管理
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// 响应式数据
const loading = ref(true)
const bill = ref(null)
const comments = ref([])
const newComment = ref('')
const showDeleteModal = ref(false)
const showReceiptModal = ref(false)
const showPayModal = ref(false)
const selectedPaymentMethod = ref('alipay')

// 支付方式
const paymentMethods = ref([
  { id: 'alipay', name: '支付宝', icon: 'AlipayIcon' },
  { id: 'wechat', name: '微信支付', icon: 'WechatIcon' },
  { id: 'bankcard', name: '银行卡', icon: 'BankCardIcon' }
])

// 计算属性
const canEdit = computed(() => {
  if (!bill.value || !authStore.user) return false
  return bill.value.creatorId === authStore.user.id || authStore.user.isAdmin
})

const canDelete = computed(() => {
  if (!bill.value || !authStore.user) return false
  return bill.value.creatorId === authStore.user.id || authStore.user.isAdmin
})

const canPay = computed(() => {
  if (!bill.value || !authStore.user) return false
  
  // 检查当前用户是否是参与者
  const participant = bill.value.participants.find(p => p.id === authStore.user.id)
  if (!participant) return false
  
  // 检查是否已支付
  return participant.paymentStatus !== 'paid'
})

const netBalance = computed(() => {
  if (!bill.value) return 0
  
  // 检查当前用户是否是参与者
  const participant = bill.value.participants.find(p => p.id === authStore.user?.id)
  if (!participant) return 0
  
  // 如果已支付，则待支付金额为0
  if (participant.paymentStatus === 'paid') return 0
  
  // 否则待支付金额为份额
  return bill.value.myShare
})

// 获取类别名称
const getCategoryName = (categoryId) => {
  const categories = [
    { id: 'utilities', name: '水电费' },
    { id: 'internet', name: '网费' },
    { id: 'rent', name: '房租' },
    { id: 'property', name: '物业费' },
    { id: 'other', name: '其他' }
  ]
  
  const category = categories.find(c => c.id === categoryId)
  return category?.name || '其他'
}

// 获取状态显示名称
const getStatusDisplayName = (status) => {
  const statusMap = {
    pending: '待支付',
    partial: '部分支付',
    paid: '已支付',
    overdue: '已逾期'
  }
  return statusMap[status] || '未知'
}

// 获取支付状态名称
const getPaymentStatusName = (status) => {
  const statusMap = {
    unpaid: '未支付',
    paid: '已支付'
  }
  return statusMap[status] || '未知'
}

// 格式化日期
const formatDate = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 格式化日期时间
const formatDateTime = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取逾期天数
const getOverdueDays = (dueDate) => {
  const today = new Date()
  const due = new Date(dueDate)
  const diffTime = today - due
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

// 返回上一页
const goBack = () => {
  router.go(-1)
}

// 编辑账单
const editBill = () => {
  router.push(`/bills/${bill.value.id}/edit`)
}

// 确认删除
const confirmDelete = () => {
  showDeleteModal.value = true
}

// 删除账单
const deleteBill = async () => {
  try {
    // await api.deleteBill(bill.value.id)
    
    // 模拟删除成功
    showDeleteModal.value = false
    
    // 返回列表页
    router.push('/bills')
    
  } catch (error) {
    console.error('删除账单失败:', error)
    // 显示错误提示
  }
}

// 支付账单
const payBill = () => {
  router.push(`/payments/${bill.value.id}/scan`)
}

// 确认支付
const confirmPay = async () => {
  try {
    // await api.payBill(bill.value.id, selectedPaymentMethod.value)
    
    // 模拟支付成功
    showPayModal.value = false
    
    // 更新账单状态
    const participant = bill.value.participants.find(p => p.id === authStore.user.id)
    if (participant) {
      participant.paymentStatus = 'paid'
    }
    
    // 检查是否所有参与者都已支付
    const allPaid = bill.value.participants.every(p => p.paymentStatus === 'paid')
    if (allPaid) {
      bill.value.status = 'paid'
      bill.value.paidAt = new Date().toISOString()
    } else {
      bill.value.status = 'partial'
    }
    
  } catch (error) {
    console.error('支付账单失败:', error)
    // 显示错误提示
  }
}

// 查看收据
const viewReceipt = () => {
  showReceiptModal.value = true
}

// 查看支付转移记录
const viewPaymentTransfers = () => {
  router.push(`/bills/${bill.value.id}/transfers`)
}

// 添加评论
const addComment = async () => {
  if (!newComment.value.trim()) return
  
  try {
    // const comment = await api.addComment(bill.value.id, newComment.value)
    
    // 模拟添加评论
    const comment = {
      id: `comment-${Date.now()}`,
      authorId: authStore.user.id,
      authorName: authStore.user.name,
      text: newComment.value,
      createdAt: new Date().toISOString()
    }
    
    comments.value.push(comment)
    newComment.value = ''
    
  } catch (error) {
    console.error('添加评论失败:', error)
    // 显示错误提示
  }
}

// 加载账单详情
const loadBillDetail = async () => {
  loading.value = true
  
  try {
    // 模拟API调用
    console.log('加载账单详情:', route.params.id)
    
    // 模拟账单数据
    const bill = {
      id: route.params.id,
      title: '11月水电费',
      amount: 156.50,
      category: 'utilities',
      due_date: '2023-11-30',
      description: '11月份的水电费账单，包含水费和电费',
      receipt_url: 'https://picsum.photos/seed/bill123/400/600.jpg',
      split_type: 'equal',
      status: 'pending',
      created_at: '2023-11-01T10:00:00Z',
      creator: {
        id: 'user-1',
        name: '张三'
      },
      participants: [
        {
          user_id: 'user-1',
          user_name: '张三',
          share: 52.17,
          paid: true,
          paid_at: '2023-11-02T14:30:00Z'
        },
        {
          user_id: 'user-2',
          user_name: '李四',
          share: 52.17,
          paid: false,
          paid_at: null
        },
        {
          user_id: 'user-3',
          user_name: '王五',
          share: 52.16,
          paid: false,
          paid_at: null
        }
      ]
    }
    
    // 获取类别名称
    const category = categories.value.find(c => c.id === bill.category)
    bill.category_name = category ? category.name : bill.category
    
    // 获取状态名称
    const status = billStatuses.value.find(s => s.id === bill.status)
    bill.status_name = status ? status.name : bill.status
    
    bill.value = bill
    
  } catch (error) {
    console.error('加载账单详情失败:', error)
    ElMessage.error('加载账单详情失败，请稍后再试')
  } finally {
    loading.value = false
  }
}

// 删除账单
const deleteBill = async () => {
  try {
    // 模拟API调用
    console.log('删除账单:', route.params.id)
    
    // 模拟成功响应
    ElMessage.success('账单删除成功')
    router.push('/bills')
    
  } catch (error) {
    console.error('删除账单失败:', error)
    ElMessage.error('删除账单失败，请稍后再试')
  }
}

// 标记为已支付
const markAsPaid = async () => {
  try {
    // 模拟API调用
    console.log('标记账单为已支付:', route.params.id)
    
    // 模拟成功响应
    ElMessage.success('已标记为已支付')
    
    // 更新账单状态
    bill.value.status = 'paid'
    bill.value.status_name = '已支付'
    
    // 更新当前用户的支付状态
    const currentUser = authStore.user
    const participant = bill.value.participants.find(p => p.user_id === currentUser.id)
    if (participant) {
      participant.paid = true
      participant.paid_at = new Date().toISOString()
    }
    
  } catch (error) {
    console.error('标记支付状态失败:', error)
    ElMessage.error('标记支付状态失败，请稍后再试')
  }
}

// 发送支付提醒
const sendReminder = async (participant) => {
  try {
    // 模拟API调用
    console.log('发送支付提醒:', participant.user_name)
    
    // 模拟成功响应
    ElMessage.success(`已向${participant.user_name}发送支付提醒`)
    
  } catch (error) {
    console.error('发送支付提醒失败:', error)
    ElMessage.error('发送支付提醒失败，请稍后再试')
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadBillDetail()
})
</script>

<style scoped>
.bill-detail-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
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

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: #666;
}

.error-icon {
  color: #ccc;
  margin-bottom: 16px;
}

.error-state h2 {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px;
  color: #333;
}

.error-state p {
  font-size: 16px;
  margin: 0 0 24px;
  max-width: 400px;
}

.primary-button {
  padding: 10px 20px;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.3s;
}

.primary-button:hover {
  opacity: 0.9;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background-color: white;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
}

.back-button:hover {
  background-color: #f5f5f5;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.edit-button, .delete-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.edit-button {
  background-color: #e3f2fd;
  color: #1976d2;
  border: none;
}

.edit-button:hover {
  background-color: #bbdefb;
}

.delete-button {
  background-color: #ffebee;
  color: #d32f2f;
  border: none;
}

.delete-button:hover {
  background-color: #ffcdd2;
}

.detail-content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
}

.bill-main {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.bill-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.bill-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: #f5f5f5;
  color: #666;
}

.bill-info {
  flex: 1;
}

.bill-title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0 0 12px;
}

.bill-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.bill-category {
  padding: 4px 8px;
  background-color: #f0f4ff;
  color: #6a11cb;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.bill-date, .bill-due-date {
  font-size: 14px;
  color: #666;
}

.bill-status {
  display: flex;
  align-items: center;
}

.status-badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-badge.pending {
  background-color: #fff3e0;
  color: #f57c00;
}

.status-badge.partial {
  background-color: #e1f5fe;
  color: #0288d1;
}

.status-badge.paid {
  background-color: #e8f5e9;
  color: #388e3c;
}

.status-badge.overdue {
  background-color: #ffebee;
  color: #d32f2f;
}

.bill-amount {
  text-align: right;
}

.amount-value {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.my-share {
  font-size: 14px;
  color: #666;
}

.overdue-alert {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background-color: #ffebee;
  border-radius: 8px;
  color: #d32f2f;
}

.alert-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #d32f2f;
  color: white;
}

.alert-content {
  flex: 1;
}

.alert-title {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 4px;
}

.alert-message {
  font-size: 14px;
}

.bill-details-card {
  padding: 24px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.bill-details-card h2 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 20px;
}

.detail-row {
  display: flex;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-label {
  width: 100px;
  font-size: 14px;
  color: #666;
}

.detail-value {
  flex: 1;
  font-size: 14px;
  color: #333;
}

.participants {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.participant {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: #f9f9f9;
  border-radius: 8px;
}

.participant-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #6a11cb;
  color: white;
  font-size: 14px;
  font-weight: 500;
}

.participant-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.participant-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.participant-share {
  font-size: 14px;
  color: #666;
}

.participant-status {
  margin-left: 8px;
}

.payment-status {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.payment-status.paid {
  background-color: #e8f5e9;
  color: #388e3c;
}

.payment-status.unpaid {
  background-color: #fff3e0;
  color: #f57c00;
}

.receipt-preview {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
}

.receipt-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.receipt-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  opacity: 0;
  transition: opacity 0.3s;
}

.receipt-preview:hover .receipt-overlay {
  opacity: 1;
}

.bill-sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.payment-card, .balance-card, .comments-card {
  padding: 20px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.payment-card h2, .balance-card h2, .comments-card h2 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px;
}

.paid-info, .pending-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.paid-info {
  background-color: #e8f5e9;
}

.pending-info {
  background-color: #fff3e0;
}

.paid-icon, .pending-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.paid-icon {
  background-color: #388e3c;
  color: white;
}

.pending-icon {
  background-color: #f57c00;
  color: white;
}

.paid-text, .pending-text {
  flex: 1;
}

.paid-title, .pending-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.paid-date, .pending-description {
  font-size: 14px;
  color: #666;
}

.pay-actions {
  text-align: center;
}

.transfer-actions {
  text-align: center;
  margin-top: 12px;
}

.transfer-button {
  padding: 8px 16px;
  background-color: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
}

.transfer-button:hover {
  background-color: #e0e0e0;
}

.pay-button {
  padding: 10px 20px;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.3s;
}

.pay-button:hover {
  opacity: 0.9;
}

.balance-summary {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.balance-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.balance-item.total {
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.balance-label {
  font-size: 14px;
  color: #666;
}

.balance-value {
  font-size: 16px;
  font-weight: 500;
}

.balance-value.expense {
  color: #d32f2f;
}

.balance-value.income {
  color: #388e3c;
}

.empty-comments {
  text-align: center;
  padding: 20px 0;
  color: #666;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 16px;
}

.comment-item {
  display: flex;
  gap: 12px;
}

.comment-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #6a11cb;
  color: white;
  font-size: 14px;
  font-weight: 500;
  flex-shrink: 0;
}

.comment-content {
  flex: 1;
}

.comment-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.comment-author {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.comment-time {
  font-size: 12px;
  color: #666;
}

.comment-text {
  font-size: 14px;
  color: #333;
}

.add-comment {
  margin-top: 16px;
}

.comment-input-container {
  display: flex;
  gap: 8px;
}

.comment-input-container input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.comment-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: #6a11cb;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: opacity 0.3s;
}

.comment-button:hover {
  opacity: 0.9;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  border-radius: 10px;
  width: 90%;
  max-width: 400px;
  overflow: hidden;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.modal-body {
  padding: 20px;
}

.modal-body p {
  margin: 0 0 12px;
  color: #333;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #eee;
}

.secondary-button {
  padding: 8px 16px;
  background-color: white;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
}

.secondary-button:hover {
  background-color: #f5f5f5;
}

.danger-button {
  padding: 8px 16px;
  background-color: #d32f2f;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.3s;
}

.danger-button:hover {
  opacity: 0.9;
}

.receipt-modal-content {
  background-color: white;
  border-radius: 10px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
}

.receipt-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.receipt-modal-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background-color: #f5f5f5;
  color: #666;
  cursor: pointer;
  transition: background-color 0.3s;
}

.close-button:hover {
  background-color: #e0e0e0;
}

.receipt-modal-body {
  padding: 20px;
  text-align: center;
}

.receipt-modal-body img {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

.pay-modal-content {
  background-color: white;
  border-radius: 10px;
  width: 90%;
  max-width: 400px;
  overflow: hidden;
}

.pay-modal-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.pay-modal-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.pay-modal-body {
  padding: 20px;
}

.pay-amount {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.pay-label {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.pay-value {
  font-size: 20px;
  font-weight: 600;
  color: #d32f2f;
}

.payment-methods {
  margin-bottom: 20px;
}

.payment-method-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 12px;
}

.payment-method {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.payment-method.active {
  border-color: #6a11cb;
  background-color: #f5f7ff;
}

.method-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #f5f5f5;
  color: #666;
}

.method-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.pay-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px;
  border-top: 1px solid #eee;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .bill-detail-container {
    padding: 16px;
  }
  
  .detail-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .detail-content {
    grid-template-columns: 1fr;
  }
  
  .bill-card {
    flex-direction: column;
    text-align: center;
  }
  
  .bill-amount {
    text-align: center;
  }
  
  .detail-row {
    flex-direction: column;
    gap: 8px;
  }
  
  .detail-label {
    width: auto;
  }
  
  .participant-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>