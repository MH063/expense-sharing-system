<template>
  <div class="bill-list-container">
    <div class="page-header">
      <h1>账单管理</h1>
      <button v-if="canCreateBill" class="add-button" @click="createBill">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        创建账单
      </button>
    </div>
    
    <div class="filters-section">
      <div class="filter-row">
        <div class="filter-group">
          <label>状态</label>
          <select v-model="filters.status" @change="applyFilters">
            <option value="">全部状态</option>
            <option value="pending">待支付</option>
            <option value="partial">部分支付</option>
            <option value="paid">已支付</option>
            <option value="overdue">已逾期</option>
          </select>
        </div>
        
        <div class="filter-group">
          <label>创建者</label>
          <select v-model="filters.creator" @change="applyFilters">
              <option value="">全部创建者</option>
              <option v-for="member in members" :key="member.id || member.user_id" :value="member.id || member.user_id">
                {{ member.name || member.username }}
              </option>
            </select>
        </div>
        
        <div class="filter-group">
          <label>日期范围</label>
          <div class="date-range">
            <input 
              v-model="filters.startDate" 
              type="date" 
              @change="applyFilters"
            />
            <span>至</span>
            <input 
              v-model="filters.endDate" 
              type="date" 
              @change="applyFilters"
            />
          </div>
        </div>
        
        <div class="filter-group">
          <label>金额范围</label>
          <div class="amount-range">
            <input 
              v-model="filters.minAmount" 
              type="number" 
              placeholder="最小金额"
              @change="applyFilters"
            />
            <span>至</span>
            <input 
              v-model="filters.maxAmount" 
              type="number" 
              placeholder="最大金额"
              @change="applyFilters"
            />
          </div>
        </div>
      </div>
      
      <div class="filter-actions">
        <button class="reset-button" @click="resetFilters">重置</button>
        <button class="apply-button" @click="applyFilters">应用筛选</button>
      </div>
    </div>
    
    <div class="bills-stats">
      <div class="stat-card">
        <div class="stat-icon pending">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.pending }}</div>
          <div class="stat-label">待支付</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon paid">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.paid }}</div>
          <div class="stat-label">已支付</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon overdue">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stats.overdue }}</div>
          <div class="stat-label">已逾期</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon total">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"></line>
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
          </svg>
        </div>
        <div class="stat-info">
          <div class="stat-value">¥{{ stats.totalAmount.toFixed(2) }}</div>
          <div class="stat-label">总金额</div>
        </div>
      </div>
    </div>
    
    <div class="view-controls">
      <div class="view-toggle">
        <button 
          class="view-button" 
          :class="{ active: viewMode === 'list' }" 
          @click="viewMode = 'list'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
          列表
        </button>
        <button 
          class="view-button" 
          :class="{ active: viewMode === 'grid' }" 
          @click="viewMode = 'grid'"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          网格
        </button>
      </div>
      
      <div class="sort-controls">
        <label>排序:</label>
        <select v-model="sortBy" @change="applySorting">
          <option value="createdAt-desc">创建时间 (最新)</option>
          <option value="createdAt-asc">创建时间 (最旧)</option>
          <option value="dueDate-asc">到期日 (最近)</option>
          <option value="dueDate-desc">到期日 (最远)</option>
          <option value="amount-desc">金额 (高到低)</option>
          <option value="amount-asc">金额 (低到高)</option>
        </select>
      </div>
    </div>
    
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载账单中...</p>
    </div>
    
    <div v-else-if="bills.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      </div>
      <h2>暂无账单</h2>
      <p>您还没有创建任何账单</p>
      <button v-if="canCreateBill" class="primary-button" @click="createBill">创建第一个账单</button>
    </div>
    
    <div v-else>
      <!-- 列表视图 -->
      <div v-if="viewMode === 'list'" class="bills-list">
        <div v-for="bill in paginatedBills" :key="bill.id" class="bill-card" @click="viewBill(bill.id)">
          <div class="bill-header">
            <div class="bill-title">{{ bill.title }}</div>
            <div class="bill-status">
              <span class="status-badge" :class="bill.status">
                {{ getStatusDisplayName(bill.status) }}
              </span>
            </div>
          </div>
          
          <div class="bill-details">
            <div class="bill-amount">¥{{ parseFloat(bill.total_amount || bill.amount || 0).toFixed(2) }}</div>
            <div class="bill-info">
              <div class="bill-creator">创建者: {{ bill.creator_name || bill.creatorName }}</div>
              <div class="bill-date">到期日: {{ formatDate(bill.due_date || bill.dueDate) }}</div>
            </div>
          </div>
          
          <div class="bill-participants">
            <div class="participants-label">参与者:</div>
            <div class="participants-avatars">
              <div 
                v-for="participant in bill.participants.slice(0, 3)" 
                :key="participant.id" 
                class="participant-avatar"
                :title="participant.name"
              >
                {{ participant.name.charAt(0) }}
              </div>
              <div v-if="bill.participants.length > 3" class="more-participants">
                +{{ bill.participants.length - 3 }}
              </div>
            </div>
          </div>
          
          <div v-if="bill.status === 'overdue'" class="bill-overdue">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            已逾期 {{ getOverdueDays(bill.due_date || bill.dueDate) }} 天
          </div>
        </div>
      </div>
      
      <!-- 网格视图 -->
      <div v-else class="bills-grid">
        <div 
          v-for="bill in paginatedBills" 
          :key="bill.id" 
          class="bill-grid-card" 
          @click="viewBill(bill.id)"
        >
          <div class="bill-grid-header">
            <div class="bill-grid-title">{{ bill.title }}</div>
            <div class="bill-grid-status">
              <span class="status-badge" :class="bill.status">
                {{ getStatusDisplayName(bill.status) }}
              </span>
            </div>
          </div>
          
          <div class="bill-grid-amount">¥{{ parseFloat(bill.total_amount || bill.amount || 0).toFixed(2) }}</div>
          
          <div class="bill-grid-info">
            <div class="bill-grid-creator">创建者: {{ bill.creator_name || bill.creatorName }}</div>
            <div class="bill-grid-date">到期: {{ formatDate(bill.due_date || bill.dueDate) }}</div>
          </div>
          
          <div class="bill-grid-participants">
            <div class="participants-avatars">
              <div 
                v-for="participant in bill.participants.slice(0, 4)" 
                :key="participant.id" 
                class="participant-avatar"
                :title="participant.name"
              >
                {{ participant.name.charAt(0) }}
              </div>
              <div v-if="bill.participants.length > 4" class="more-participants">
                +{{ bill.participants.length - 4 }}
              </div>
            </div>
          </div>
          
          <div v-if="bill.status === 'overdue'" class="bill-grid-overdue">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            逾期 {{ getOverdueDays(bill.due_date || bill.dueDate) }} 天
          </div>
        </div>
      </div>
      
      <!-- 分页控件 -->
      <div class="pagination">
        <div class="pagination-info">
          显示 {{ (currentPage - 1) * itemsPerPage + 1 }} - {{ Math.min(currentPage * itemsPerPage, filteredBills.length) }} 
          项，共 {{ filteredBills.length }} 项
        </div>
        
        <div class="pagination-controls">
          <button 
            class="pagination-button" 
            :disabled="currentPage === 1" 
            @click="currentPage--"
          >
            上一页
          </button>
          
          <div class="page-numbers">
            <button 
              v-for="page in visiblePages" 
              :key="page" 
              class="page-number" 
              :class="{ active: page === currentPage }"
              @click="currentPage = page"
            >
              {{ page }}
            </button>
          </div>
          
          <button 
            class="pagination-button" 
            :disabled="currentPage === totalPages" 
            @click="currentPage++"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { PERMISSIONS } from '@/utils/permissions'

// 路由和状态管理
const router = useRouter()
const authStore = useAuthStore()

// 权限检查
const canCreateBill = computed(() => {
  return authStore.checkPermission(PERMISSIONS.BILL_CREATE)
})

const checkPermission = (permission) => {
  return authStore.checkPermission(permission)
}

// 响应式数据
const loading = ref(true)
const bills = ref([])
const members = ref([])
const viewMode = ref('list')
const sortBy = ref('createdAt-desc')
const currentPage = ref(1)
const itemsPerPage = ref(10)

// 筛选条件
const filters = ref({
  status: '',
  creator_id: '',
  dateRange: [],
  amountRange: []
})

// 统计数据
const stats = ref({
  pending: 0,
  paid: 0,
  overdue: 0,
  totalAmount: 0
})

// 计算属性
const filteredBills = computed(() => {
  let result = [...bills.value]
  
  // 状态筛选
  if (filters.value.status) {
    result = result.filter(bill => bill.status === filters.value.status)
  }
  
  // 创建者筛选
  if (filters.value.creator) {
    result = result.filter(bill => bill.creator_id == filters.value.creator)
  }
  
  // 日期范围筛选 - 使用due_date字段
  if (filters.value.startDate) {
    const startDate = new Date(filters.value.startDate)
    result = result.filter(bill => new Date(bill.due_date || bill.dueDate) >= startDate)
  }
  
  if (filters.value.endDate) {
    const endDate = new Date(filters.value.endDate)
    result = result.filter(bill => new Date(bill.due_date || bill.dueDate) <= endDate)
  }
  
  // 金额范围筛选 - 使用total_amount字段
  if (filters.value.minAmount) {
    result = result.filter(bill => parseFloat(bill.total_amount || bill.amount || 0) >= parseFloat(filters.value.minAmount))
  }
  
  if (filters.value.maxAmount) {
    result = result.filter(bill => parseFloat(bill.total_amount || bill.amount || 0) <= parseFloat(filters.value.maxAmount))
  }
  
  return result
})

const paginatedBills = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredBills.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredBills.value.length / itemsPerPage.value)
})

const visiblePages = computed(() => {
  const pages = []
  const maxVisible = 5
  
  if (totalPages.value <= maxVisible) {
    for (let i = 1; i <= totalPages.value; i++) {
      pages.push(i)
    }
  } else {
    const start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
    const end = Math.min(totalPages.value, start + maxVisible - 1)
    
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
  }
  
  return pages
})

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

// 格式化日期
const formatDate = (timestamp) => {
  const date = new Date(timestamp)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

// 获取逾期天数
const getOverdueDays = (dueDate) => {
  const today = new Date()
  const due = new Date(dueDate)
  const diffTime = today - due
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  return days > 0 ? days : 0
}

// 应用筛选
const applyFilters = () => {
  console.log('应用筛选条件:', filters.value)
  currentPage.value = 1 // 重置到第一页
  loadBills()
}

// 应用排序
const applySorting = () => {
  const [field, order] = sortBy.value.split('-')
  
  bills.value.sort((a, b) => {
    let valueA = a[field]
    let valueB = b[field]
    
    // 处理字段名称映射
    if (field === 'createdAt') {
      valueA = a.created_at || a.createdAt
      valueB = b.created_at || b.createdAt
    } else if (field === 'dueDate') {
      valueA = a.due_date || a.dueDate
      valueB = b.due_date || b.dueDate
    } else if (field === 'amount') {
      valueA = parseFloat(a.total_amount || a.amount || 0)
      valueB = parseFloat(b.total_amount || b.amount || 0)
    }
    
    if (order === 'asc') {
      return valueA > valueB ? 1 : -1
    } else {
      return valueA < valueB ? 1 : -1
    }
  })
}

// 重置筛选
const resetFilters = () => {
  console.log('重置筛选条件')
  filters.value = {
    status: '',
    creator: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: ''
  }
  currentPage.value = 1
  loadBills()
}

// 创建账单
const createBill = () => {
  if (!canCreateBill.value) {
    console.warn('用户没有创建账单的权限')
    return
  }
  router.push('/bills/create')
}

// 查看账单详情
const viewBill = (billId) => {
  router.push(`/bills/${billId}`)
}

// 加载账单数据
const loadBills = async () => {
  // 检查查看权限
  if (!checkPermission(PERMISSIONS.BILL_VIEW)) {
    console.warn('用户没有查看账单的权限')
    loading.value = false
    return
  }
  
  loading.value = true
  
  try {
    console.log('开始加载账单数据...')
    
    // 调用真实后端接口获取账单列表
    // 后端会自动获取用户房间，不需要前端传递roomId
    const resp = await (await import('@/api/bills')).billApi.getBills({
      page: currentPage.value,
      limit: itemsPerPage.value,
      status: filters.value.status || undefined,
      creator: filters.value.creator || undefined,
      startDate: filters.value.startDate || undefined,
      endDate: filters.value.endDate || undefined,
      minAmount: filters.value.minAmount || undefined,
      maxAmount: filters.value.maxAmount || undefined
    })
    
    if (resp.success && resp.data) {
      // 处理后端返回的双层嵌套数据结构 {success: true, data: {xxx: []}}
      bills.value = Array.isArray(resp.data.data) ? resp.data.data : []
    } else {
      bills.value = []
      console.error('账单列表加载失败:', resp.message || '未知错误')
    }
    
    // 计算统计数据
    stats.value = {
      pending: bills.value.filter(bill => bill.status === 'pending').length,
      paid: bills.value.filter(bill => bill.status === 'paid').length,
      overdue: bills.value.filter(bill => bill.status === 'overdue').length,
      totalAmount: bills.value.reduce((sum, bill) => sum + parseFloat(bill.total_amount || bill.amount || 0), 0)
    }
    
    console.log('账单数据加载成功，共', bills.value.length, '条记录')
    
  } catch (error) {
    console.error('加载账单失败:', error)
    bills.value = []
  } finally {
    loading.value = false
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadBills()
})
</script>

<style scoped>
.bill-list-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.add-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.3s;
}

.add-button:hover {
  opacity: 0.9;
}

.filters-section {
  background-color: white;
  border-radius: 10px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.filter-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-group label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.filter-group select,
.filter-group input {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.date-range, .amount-range {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-range span, .amount-range span {
  font-size: 14px;
  color: #666;
}

.filter-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.reset-button, .apply-button {
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.reset-button {
  background-color: white;
  color: #333;
  border: 1px solid #ddd;
}

.reset-button:hover {
  background-color: #f5f5f5;
}

.apply-button {
  background-color: #6a11cb;
  color: white;
  border: none;
}

.apply-button:hover {
  background-color: #5a0fb8;
}

.bills-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  color: white;
}

.stat-icon.pending {
  background-color: #f57c00;
}

.stat-icon.paid {
  background-color: #388e3c;
}

.stat-icon.overdue {
  background-color: #d32f2f;
}

.stat-icon.total {
  background-color: #6a11cb;
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.view-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.view-toggle {
  display: flex;
  gap: 4px;
  background-color: white;
  border-radius: 6px;
  padding: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.view-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background-color: transparent;
  color: #666;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.view-button.active {
  background-color: #6a11cb;
  color: white;
}

.sort-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-controls label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.sort-controls select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
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

.bills-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.bill-card {
  padding: 20px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
}

.bill-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.bill-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.bill-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
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

.bill-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.bill-amount {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.bill-info {
  text-align: right;
}

.bill-creator, .bill-date {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.bill-participants {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.participants-label {
  font-size: 14px;
  color: #666;
}

.participants-avatars {
  display: flex;
  align-items: center;
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
  font-size: 12px;
  font-weight: 500;
  margin-right: -8px;
  border: 2px solid white;
}

.more-participants {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #f0f0f0;
  color: #666;
  font-size: 12px;
  font-weight: 500;
  margin-left: 4px;
  border: 2px solid white;
}

.bill-overdue {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #d32f2f;
  font-size: 14px;
  font-weight: 500;
}

.bills-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.bill-grid-card {
  padding: 20px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: transform 0.3s, box-shadow 0.3s;
}

.bill-grid-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}

.bill-grid-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.bill-grid-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.bill-grid-amount {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
}

.bill-grid-info {
  margin-bottom: 16px;
}

.bill-grid-creator, .bill-grid-date {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.bill-grid-participants {
  margin-bottom: 16px;
}

.bill-grid-overdue {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #d32f2f;
  font-size: 14px;
  font-weight: 500;
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  padding: 16px 0;
}

.pagination-info {
  font-size: 14px;
  color: #666;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-button {
  padding: 8px 12px;
  background-color: white;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.pagination-button:hover:not(:disabled) {
  background-color: #f5f5f5;
}

.pagination-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-numbers {
  display: flex;
  gap: 4px;
}

.page-number {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background-color: white;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.page-number:hover {
  background-color: #f5f5f5;
}

.page-number.active {
  background-color: #6a11cb;
  color: white;
  border-color: #6a11cb;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .bill-list-container {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .filter-row {
    grid-template-columns: 1fr;
  }
  
  .bills-stats {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .view-controls {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .bills-grid {
    grid-template-columns: 1fr;
  }
  
  .bill-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .bill-info {
    text-align: left;
  }
  
  .pagination {
    flex-direction: column;
    gap: 16px;
  }
}
</style>