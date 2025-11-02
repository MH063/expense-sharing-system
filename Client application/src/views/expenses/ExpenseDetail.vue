<template>
  <div class="expense-detail-container">
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载费用详情中...</p>
    </div>
    
    <div v-else-if="!expense" class="error-state">
      <div class="error-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
      <h2>费用记录不存在</h2>
      <p>您要查看的费用记录不存在或已被删除</p>
      <button class="primary-button" @click="goBack">返回列表</button>
    </div>
    
    <div v-else class="expense-detail">
      <div class="detail-header">
        <button class="back-button" @click="goBack">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          返回
        </button>
        
        <div class="header-actions">
          <button v-if="canEdit" class="edit-button" @click="editExpense">
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
        <div class="expense-main">
          <div class="expense-card">
            <div class="expense-icon">
              <component :is="getCategoryIcon(expense.category)" />
            </div>
            
            <div class="expense-info">
              <h1 class="expense-title">{{ expense.title }}</h1>
              <div class="expense-meta">
                <div class="expense-category">
                  {{ getCategoryName(expense.category) }}
                </div>
                <div class="expense-date">
                  {{ formatDate(expense.date) }}
                </div>
                <div class="expense-status">
                  <span class="status-badge" :class="expense.status">
                    {{ getStatusDisplayName(expense.status) }}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="expense-amount">
              <div class="amount-value">¥{{ expense.amount.toFixed(2) }}</div>
              <div class="my-share">我的份额: ¥{{ expense.myShare.toFixed(2) }}</div>
            </div>
          </div>
          
          <div class="expense-details-card">
            <h2>费用详情</h2>
            
            <div class="detail-row">
              <div class="detail-label">支付者</div>
              <div class="detail-value">{{ expense.payerName }}</div>
            </div>
            
            <div class="detail-row">
              <div class="detail-label">参与成员</div>
              <div class="detail-value">
                <div class="participants">
                  <div 
                    v-for="participant in expense.participants" 
                    :key="participant.id" 
                    class="participant"
                  >
                    <div class="participant-avatar">
                      {{ participant.name.charAt(0) }}
                    </div>
                    <div class="participant-info">
                      <div class="participant-name">{{ participant.name }}</div>
                      <div class="participant-share">¥{{ participant.share.toFixed(2) }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-if="expense.description" class="detail-row">
              <div class="detail-label">描述</div>
              <div class="detail-value">{{ expense.description }}</div>
            </div>
            
            <div v-if="expense.receipt" class="detail-row">
              <div class="detail-label">收据</div>
              <div class="detail-value">
                <div class="receipt-preview" @click="viewReceipt">
                  <img :src="expense.receipt" alt="收据" />
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
              <div class="detail-value">{{ formatDateTime(expense.createdAt) }}</div>
            </div>
            
            <div v-if="expense.updatedAt" class="detail-row">
              <div class="detail-label">更新时间</div>
              <div class="detail-value">{{ formatDateTime(expense.updatedAt) }}</div>
            </div>
          </div>
        </div>
        
        <div class="expense-sidebar">
          <div class="settlement-card">
            <h2>结算信息</h2>
            
            <div v-if="expense.status === 'settled'" class="settled-info">
              <div class="settled-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <div class="settled-text">
                <div class="settled-title">已结算</div>
                <div class="settled-date">结算时间: {{ formatDateTime(expense.settledAt) }}</div>
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
                <div class="pending-title">待结算</div>
                <div class="pending-description">此费用尚未结算</div>
              </div>
            </div>
            
            <div v-if="canSettle && expense.status !== 'settled'" class="settle-actions">
              <button class="settle-button" @click="settleExpense">
                标记为已结算
              </button>
            </div>
          </div>
          
          <div class="balance-card">
            <h2>余额变动</h2>
            
            <div class="balance-summary">
              <div class="balance-item">
                <div class="balance-label">支付者支出</div>
                <div class="balance-value expense">-¥{{ expense.amount.toFixed(2) }}</div>
              </div>
              
              <div class="balance-item">
                <div class="balance-label">我的份额</div>
                <div class="balance-value income">+¥{{ expense.myShare.toFixed(2) }}</div>
              </div>
              
              <div class="balance-item total">
                <div class="balance-label">净影响</div>
                <div class="balance-value" :class="netBalance >= 0 ? 'income' : 'expense'">
                  {{ netBalance >= 0 ? '+' : '' }}¥{{ netBalance.toFixed(2) }}
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
          <p>确定要删除费用记录 "{{ expense.title }}" 吗？</p>
          <p>此操作不可恢复。</p>
        </div>
        
        <div class="modal-footer">
          <button class="secondary-button" @click="showDeleteModal = false">取消</button>
          <button class="danger-button" @click="deleteExpense">删除</button>
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
          <img :src="expense.receipt" alt="收据" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 路由和状态管理
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// 响应式数据
const loading = ref(true)
const expense = ref(null)
const comments = ref([])
const newComment = ref('')
const showDeleteModal = ref(false)
const showReceiptModal = ref(false)

// 计算属性
const canEdit = computed(() => {
  if (!expense.value || !authStore.user) return false
  return expense.value.payerId === authStore.user.id || authStore.user.isAdmin
})

const canDelete = computed(() => {
  if (!expense.value || !authStore.user) return false
  return expense.value.payerId === authStore.user.id || authStore.user.isAdmin
})

const canSettle = computed(() => {
  if (!expense.value || !authStore.user) return false
  return expense.value.payerId === authStore.user.id || authStore.user.isAdmin
})

const netBalance = computed(() => {
  if (!expense.value) return 0
  
  // 如果当前用户是支付者，则净影响为 -金额 + 份额
  if (expense.value.payerId === authStore.user?.id) {
    return -expense.value.amount + expense.value.myShare
  }
  
  // 如果当前用户不是支付者，则净影响为份额
  return expense.value.myShare
})

// 获取类别图标
const getCategoryIcon = (categoryId) => {
  const categories = [
    { id: 'groceries', name: '食品杂货', icon: 'GroceriesIcon' },
    { id: 'utilities', name: '水电费', icon: 'UtilitiesIcon' },
    { id: 'dining', name: '餐饮', icon: 'DiningIcon' },
    { id: 'entertainment', name: '娱乐', icon: 'EntertainmentIcon' },
    { id: 'transport', name: '交通', icon: 'TransportIcon' },
    { id: 'other', name: '其他', icon: 'OtherIcon' }
  ]
  
  const category = categories.find(c => c.id === categoryId)
  return category?.icon || 'OtherIcon'
}

// 获取类别名称
const getCategoryName = (categoryId) => {
  const categories = [
    { id: 'groceries', name: '食品杂货' },
    { id: 'utilities', name: '水电费' },
    { id: 'dining', name: '餐饮' },
    { id: 'entertainment', name: '娱乐' },
    { id: 'transport', name: '交通' },
    { id: 'other', name: '其他' }
  ]
  
  const category = categories.find(c => c.id === categoryId)
  return category?.name || '其他'
}

// 获取状态显示名称
const getStatusDisplayName = (status) => {
  const statusMap = {
    pending: '待结算',
    settled: '已结算',
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

// 返回上一页
const goBack = () => {
  router.go(-1)
}

// 编辑费用
const editExpense = () => {
  router.push(`/expenses/${expense.value.id}/edit`)
}

// 确认删除
const confirmDelete = () => {
  showDeleteModal.value = true
}

// 删除费用
const deleteExpense = async () => {
  try {
    // await api.deleteExpense(expense.value.id)
    
    // 模拟删除成功
    showDeleteModal.value = false
    
    // 返回列表页
    router.push('/expenses')
    
  } catch (error) {
    console.error('删除费用失败:', error)
    // 显示错误提示
  }
}

// 结算费用
const settleExpense = async () => {
  try {
    // await api.settleExpense(expense.value.id)
    
    // 模拟结算成功
    expense.value.status = 'settled'
    expense.value.settledAt = new Date().toISOString()
    
  } catch (error) {
    console.error('结算费用失败:', error)
    // 显示错误提示
  }
}

// 查看收据
const viewReceipt = () => {
  showReceiptModal.value = true
}

// 添加评论
const addComment = async () => {
  if (!newComment.value.trim()) return
  
  try {
    // const comment = await api.addComment(expense.value.id, newComment.value)
    
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

// 加载费用详情
const loadExpenseDetail = async () => {
  const expenseId = route.params.id
  loading.value = true
  
  try {
    // expense.value = await api.getExpense(expenseId)
    // comments.value = await api.getExpenseComments(expenseId)
    
    // 模拟费用详情数据
    expense.value = {
      id: expenseId,
      title: '超市购物',
      amount: 156.50,
      category: 'groceries',
      date: new Date('2023-10-15').toISOString(),
      payerId: 'user-1',
      payerName: '张三',
      status: 'pending',
      myShare: 52.17,
      description: '购买了一些生活用品和食材',
      receipt: 'https://picsum.photos/seed/receipt123/400/600.jpg',
      createdAt: new Date('2023-10-15T10:30:00').toISOString(),
      updatedAt: new Date('2023-10-15T10:30:00').toISOString(),
      settledAt: null,
      participants: [
        {
          id: 'user-1',
          name: '张三',
          share: 52.17
        },
        {
          id: 'user-2',
          name: '李四',
          share: 52.17
        },
        {
          id: 'user-3',
          name: '王五',
          share: 52.16
        }
      ]
    }
    
    // 模拟评论数据
    comments.value = [
      {
        id: 'comment-1',
        authorId: 'user-2',
        authorName: '李四',
        text: '下次可以多买点水果',
        createdAt: new Date('2023-10-15T14:20:00').toISOString()
      },
      {
        id: 'comment-2',
        authorId: 'user-3',
        authorName: '王五',
        text: '已收到，谢谢',
        createdAt: new Date('2023-10-15T16:45:00').toISOString()
      }
    ]
    
  } catch (error) {
    console.error('加载费用详情失败:', error)
    expense.value = null
  } finally {
    loading.value = false
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadExpenseDetail()
})
</script>

<style scoped>
.expense-detail-container {
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

.expense-main {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.expense-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.expense-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background-color: #f5f5f5;
  color: #666;
}

.expense-info {
  flex: 1;
}

.expense-title {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0 0 12px;
}

.expense-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.expense-category {
  padding: 4px 8px;
  background-color: #f0f4ff;
  color: #6a11cb;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.expense-date {
  font-size: 14px;
  color: #666;
}

.expense-status {
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

.status-badge.settled {
  background-color: #e8f5e9;
  color: #388e3c;
}

.status-badge.cancelled {
  background-color: #f5f5f5;
  color: #666;
}

.expense-amount {
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

.expense-details-card {
  padding: 24px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.expense-details-card h2 {
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
  flex-wrap: wrap;
  gap: 12px;
}

.participant {
  display: flex;
  align-items: center;
  gap: 8px;
}

.participant-avatar {
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
}

.participant-info {
  display: flex;
  flex-direction: column;
}

.participant-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.participant-share {
  font-size: 12px;
  color: #666;
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

.expense-sidebar {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settlement-card, .balance-card, .comments-card {
  padding: 20px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.settlement-card h2, .balance-card h2, .comments-card h2 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px;
}

.settled-info, .pending-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.settled-info {
  background-color: #e8f5e9;
}

.pending-info {
  background-color: #fff3e0;
}

.settled-icon, .pending-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
}

.settled-icon {
  background-color: #388e3c;
  color: white;
}

.pending-icon {
  background-color: #f57c00;
  color: white;
}

.settled-text, .pending-text {
  flex: 1;
}

.settled-title, .pending-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.settled-date, .pending-description {
  font-size: 14px;
  color: #666;
}

.settle-actions {
  text-align: center;
}

.settle-button {
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

.settle-button:hover {
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

/* 响应式设计 */
@media (max-width: 768px) {
  .expense-detail-container {
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
  
  .expense-card {
    flex-direction: column;
    text-align: center;
  }
  
  .expense-amount {
    text-align: center;
  }
  
  .detail-row {
    flex-direction: column;
    gap: 8px;
  }
  
  .detail-label {
    width: auto;
  }
}
</style>