<template>
  <div class="expenses-container">
    <div class="expenses-header">
      <h1 class="page-title">费用记录</h1>
      <div class="header-actions">
        <div class="search-box">
          <input 
            type="text" 
            placeholder="搜索费用记录..." 
            v-model="searchQuery"
            @input="handleSearch"
          />
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
        </div>
        <button class="filter-button" @click="showFilterModal = true">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
          筛选
        </button>
        <button class="add-button" @click="createExpense">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          添加费用
        </button>
      </div>
    </div>
    
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载费用记录中...</p>
    </div>
    
    <div v-else-if="expenses.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"></line>
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
        </svg>
      </div>
      <h2>暂无费用记录</h2>
      <p>开始记录寝室费用，轻松管理共同开支</p>
      <button class="primary-button" @click="createExpense">添加第一笔费用</button>
    </div>
    
    <div v-else class="expenses-content">
      <div class="summary-cards">
        <div class="summary-card total">
          <div class="card-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div class="card-content">
            <div class="card-title">总支出</div>
            <div class="card-value">¥{{ totalAmount.toFixed(2) }}</div>
          </div>
        </div>
        
        <div class="summary-card this-month">
          <div class="card-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
          </div>
          <div class="card-content">
            <div class="card-title">本月支出</div>
            <div class="card-value">¥{{ thisMonthAmount.toFixed(2) }}</div>
          </div>
        </div>
        
        <div class="summary-card my-share">
          <div class="card-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div class="card-content">
            <div class="card-title">我的份额</div>
            <div class="card-value">¥{{ myShareAmount.toFixed(2) }}</div>
          </div>
        </div>
      </div>
      
      <div class="expenses-list">
        <div class="list-header">
          <div class="batch-actions" v-if="selectedExpenses.length > 0">
            <span class="selected-count">已选择 {{ selectedExpenses.length }} 项</span>
            <div class="batch-buttons">
              <button class="batch-button settle" @click="batchSettle">
                批量结算
              </button>
              <button class="batch-button delete" @click="batchDelete">
                批量删除
              </button>
              <button class="batch-button cancel" @click="clearSelection">
                取消选择
              </button>
            </div>
          </div>
          <div class="controls-container" v-else>
            <div class="sort-controls">
              <select v-model="sortBy" @change="sortExpenses">
                <option value="date-desc">日期 (最新)</option>
                <option value="date-asc">日期 (最早)</option>
                <option value="amount-desc">金额 (最高)</option>
                <option value="amount-asc">金额 (最低)</option>
              </select>
            </div>
            
            <div class="view-controls">
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
              </button>
            </div>
          </div>
        </div>
        
        <!-- 列表视图 -->
        <div v-if="viewMode === 'list'" class="list-view">
          <div v-for="expense in paginatedExpenses" :key="expense.id" class="expense-item" @click="viewExpenseDetail(expense.id)">
            <div class="expense-checkbox" @click.stop>
              <input 
                type="checkbox" 
                :id="`expense-${expense.id}`"
                v-model="selectedExpenses"
                :value="expense.id"
              />
            </div>
            <div class="expense-icon">
              <component :is="getCategoryIcon(expense.category)" />
            </div>
            
            <div class="expense-info">
              <div class="expense-title">{{ expense.title }}</div>
              <div class="expense-meta">
                <span class="expense-category">{{ getCategoryName(expense.category) }}</span>
                <span class="expense-date">{{ formatDate(expense.date) }}</span>
                <span class="expense-payer">支付者: {{ expense.payerName }}</span>
              </div>
            </div>
            
            <div class="expense-amount">
              <div class="amount-value">¥{{ expense.amount.toFixed(2) }}</div>
              <div class="my-share">我的份额: ¥{{ expense.myShare.toFixed(2) }}</div>
            </div>
            
            <div class="expense-status">
              <span class="status-badge" :class="expense.status">
                {{ getStatusDisplayName(expense.status) }}
              </span>
            </div>
          </div>
        </div>
        
        <!-- 网格视图 -->
        <div v-else class="grid-view">
          <div v-for="expense in paginatedExpenses" :key="expense.id" class="expense-card" @click="viewExpenseDetail(expense.id)">
            <div class="expense-card-checkbox" @click.stop>
              <input 
                type="checkbox" 
                :id="`expense-card-${expense.id}`"
                v-model="selectedExpenses"
                :value="expense.id"
              />
            </div>
            <div class="card-header">
              <div class="expense-icon">
                <component :is="getCategoryIcon(expense.category)" />
              </div>
              <div class="expense-status">
                <span class="status-badge" :class="expense.status">
                  {{ getStatusDisplayName(expense.status) }}
                </span>
              </div>
            </div>
            
            <div class="card-content">
              <div class="expense-title">{{ expense.title }}</div>
              <div class="expense-amount">¥{{ expense.amount.toFixed(2) }}</div>
              <div class="expense-meta">
                <span class="expense-category">{{ getCategoryName(expense.category) }}</span>
                <span class="expense-date">{{ formatDate(expense.date) }}</span>
              </div>
              <div class="expense-payer">支付者: {{ expense.payerName }}</div>
              <div class="my-share">我的份额: ¥{{ expense.myShare.toFixed(2) }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="pagination">
        <button 
          class="pagination-button" 
          :disabled="currentPage === 1"
          @click="currentPage--"
        >
          上一页
        </button>
        
        <div class="page-info">
          第 {{ currentPage }} 页，共 {{ totalPages }} 页
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
    
    <!-- 筛选模态框 -->
    <div v-if="showFilterModal" class="modal-overlay" @click="showFilterModal = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>筛选费用记录</h2>
          <button class="close-button" @click="showFilterModal = false">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="filter-group">
            <label>费用类别</label>
            <div class="checkbox-group">
              <label v-for="category in categories" :key="category.id" class="checkbox-label">
                <input 
                  type="checkbox" 
                  :value="category.id"
                  v-model="filterCategories"
                />
                <span>{{ category.name }}</span>
              </label>
            </div>
          </div>
          
          <div class="filter-group">
            <label>支付者</label>
            <select v-model="filterPayer">
              <option value="">全部</option>
              <option v-for="member in roomMembers" :key="member.id" :value="member.id">
                {{ member.name }}
              </option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>日期范围</label>
            <div class="date-range">
              <input 
                type="date" 
                v-model="filterStartDate"
              />
              <span>至</span>
              <input 
                type="date" 
                v-model="filterEndDate"
              />
            </div>
          </div>
          
          <div class="filter-group">
            <label>金额范围</label>
            <div class="amount-range">
              <input 
                type="number" 
                placeholder="最小金额"
                v-model="filterMinAmount"
              />
              <span>至</span>
              <input 
                type="number" 
                placeholder="最大金额"
                v-model="filterMaxAmount"
              />
            </div>
          </div>
          
          <div class="filter-group">
            <label>状态</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  value="pending"
                  v-model="filterStatus"
                />
                <span>待结算</span>
              </label>
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  value="settled"
                  v-model="filterStatus"
                />
                <span>已结算</span>
              </label>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="secondary-button" @click="resetFilters">重置</button>
          <button class="primary-button" @click="applyFilters">应用筛选</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { expenseApi } from '@/api/expenses'
import { roomsApi } from '@/api/rooms'

// 路由和状态管理
const router = useRouter()
const authStore = useAuthStore()

// 响应式数据
const loading = ref(true)
const showFilterModal = ref(false)
const viewMode = ref('list')
const sortBy = ref('date-desc')
const currentPage = ref(1)
const itemsPerPage = 10
const searchQuery = ref('')
const selectedExpenses = ref([])

// 筛选条件
const filterCategories = ref([])
const filterPayer = ref('')
const filterStartDate = ref('')
const filterEndDate = ref('')
const filterMinAmount = ref('')
const filterMaxAmount = ref('')
const filterStatus = ref(['pending', 'settled'])

// 费用数据
const expenses = ref([])
const categories = ref([])
const roomMembers = ref([])

// 计算属性
const totalAmount = computed(() => {
  return expenses.value.reduce((sum, expense) => sum + expense.amount, 0)
})

const thisMonthAmount = computed(() => {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  
  return expenses.value
    .filter(expense => {
      const expenseDate = new Date(expense.date)
      return expenseDate.getMonth() === currentMonth && 
             expenseDate.getFullYear() === currentYear
    })
    .reduce((sum, expense) => sum + expense.amount, 0)
})

const myShareAmount = computed(() => {
  return expenses.value.reduce((sum, expense) => sum + expense.myShare, 0)
})

const filteredExpenses = computed(() => {
  let result = [...expenses.value]
  
  // 按搜索关键词筛选
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(expense => 
      expense.title.toLowerCase().includes(query) ||
      getCategoryName(expense.category).toLowerCase().includes(query) ||
      expense.payerName.toLowerCase().includes(query)
    )
  }
  
  // 按类别筛选
  if (filterCategories.value.length > 0) {
    result = result.filter(expense => 
      filterCategories.value.includes(expense.category)
    )
  }
  
  // 按支付者筛选
  if (filterPayer.value) {
    result = result.filter(expense => expense.payerId === filterPayer.value)
  }
  
  // 按日期范围筛选
  if (filterStartDate.value) {
    const startDate = new Date(filterStartDate.value)
    result = result.filter(expense => new Date(expense.date) >= startDate)
  }
  
  if (filterEndDate.value) {
    const endDate = new Date(filterEndDate.value)
    result = result.filter(expense => new Date(expense.date) <= endDate)
  }
  
  // 按金额范围筛选
  if (filterMinAmount.value) {
    result = result.filter(expense => expense.amount >= parseFloat(filterMinAmount.value))
  }
  
  if (filterMaxAmount.value) {
    result = result.filter(expense => expense.amount <= parseFloat(filterMaxAmount.value))
  }
  
  // 按状态筛选
  if (filterStatus.value.length > 0) {
    result = result.filter(expense => filterStatus.value.includes(expense.status))
  }
  
  return result
})

const sortedExpenses = computed(() => {
  const result = [...filteredExpenses.value]
  
  switch (sortBy.value) {
    case 'date-desc':
      return result.sort((a, b) => new Date(b.date) - new Date(a.date))
    case 'date-asc':
      return result.sort((a, b) => new Date(a.date) - new Date(b.date))
    case 'amount-desc':
      return result.sort((a, b) => b.amount - a.amount)
    case 'amount-asc':
      return result.sort((a, b) => a.amount - b.amount)
    default:
      return result
  }
})

const totalPages = computed(() => {
  return Math.ceil(sortedExpenses.value.length / itemsPerPage)
})

const paginatedExpenses = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return sortedExpenses.value.slice(start, end)
})

// 获取类别图标
const getCategoryIcon = (categoryId) => {
  const category = categories.value.find(c => c.id === categoryId)
  return category?.icon || 'DefaultIcon'
}

// 获取类别名称
const getCategoryName = (categoryId) => {
  const category = categories.value.find(c => c.id === categoryId)
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

// 排序费用
const sortExpenses = () => {
  currentPage.value = 1
}

// 处理搜索
const handleSearch = () => {
  currentPage.value = 1
}

// 清除选择
const clearSelection = () => {
  selectedExpenses.value = []
}

// 批量结算
const batchSettle = async () => {
  if (selectedExpenses.value.length === 0) return
  
  try {
    console.log('批量结算费用:', selectedExpenses.value)
    // 这里应该调用批量结算API
    // await expenseApi.batchSettleExpenses(selectedExpenses.value)
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 更新本地数据状态
    expenses.value = expenses.value.map(expense => {
      if (selectedExpenses.value.includes(expense.id)) {
        return { ...expense, status: 'settled' }
      }
      return expense
    })
    
    // 清除选择
    clearSelection()
    
    console.log('批量结算成功')
  } catch (error) {
    console.error('批量结算失败:', error)
  }
}

// 批量删除
const batchDelete = async () => {
  if (selectedExpenses.value.length === 0) return
  
  if (!confirm(`确定要删除选中的 ${selectedExpenses.value.length} 条费用记录吗？`)) {
    return
  }
  
  try {
    console.log('批量删除费用:', selectedExpenses.value)
    // 这里应该调用批量删除API
    // await expenseApi.batchDeleteExpenses(selectedExpenses.value)
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 从本地数据中移除
    expenses.value = expenses.value.filter(expense => !selectedExpenses.value.includes(expense.id))
    
    // 清除选择
    clearSelection()
    
    console.log('批量删除成功')
  } catch (error) {
    console.error('批量删除失败:', error)
  }
}

// 创建费用
const createExpense = () => {
  router.push('/expenses/create')
}

// 查看费用详情
const viewExpenseDetail = (expenseId) => {
  router.push(`/expenses/${expenseId}`)
}

// 应用筛选
const applyFilters = () => {
  currentPage.value = 1
  showFilterModal.value = false
}

// 重置筛选
const resetFilters = () => {
  filterCategories.value = []
  filterPayer.value = ''
  filterStartDate.value = ''
  filterEndDate.value = ''
  filterMinAmount.value = ''
  filterMaxAmount.value = ''
  filterStatus.value = ['pending', 'settled']
  currentPage.value = 1
}

// 加载费用数据
const loadExpensesData = async (loadAllData = false) => {
  loading.value = true
  
  try {
    // 获取费用列表
    console.log('加载费用列表')
    const expensesResponse = await expenseApi.getExpenses({
      page: currentPage.value,
      limit: itemsPerPage
    })
    
    if (expensesResponse.data && expensesResponse.data.success) {
      expenses.value = expensesResponse.data.data.data || []
      console.log('费用列表加载成功:', expenses.value)
    } else {
      console.error('费用列表加载失败:', expensesResponse.data?.message || '未知错误')
    }
    
    // 只在首次加载或需要时加载类别列表和成员列表
    if (loadAllData || categories.value.length === 0) {
      // 获取类别列表
      console.log('加载费用类别列表')
      const categoriesResponse = await expenseApi.getExpenseCategories()
      
      if (categoriesResponse.data && categoriesResponse.data.success) {
        categories.value = categoriesResponse.data.data || []
        console.log('费用类别列表加载成功:', categories.value)
      } else {
        console.error('费用类别列表加载失败:', categoriesResponse.data?.message || '未知错误')
      }
    }
    
    // 只在首次加载或需要时加载寝室成员
    if (loadAllData || roomMembers.value.length === 0) {
      // 获取寝室成员
      console.log('加载寝室成员列表')
      const roomsResponse = await roomsApi.getRooms()
      
      if (roomsResponse.data && roomsResponse.data.success) {
        // 获取第一个房间的成员列表
        const rooms = roomsResponse.data.data || []
        if (rooms.length > 0) {
          const membersResponse = await roomsApi.getRoomMembers(rooms[0].id)
          if (membersResponse.data && membersResponse.data.success) {
            roomMembers.value = membersResponse.data.data || []
            console.log('寝室成员列表加载成功:', roomMembers.value)
          } else {
            console.error('寝室成员列表加载失败:', membersResponse.data?.message || '未知错误')
          }
        }
      } else {
        console.error('房间列表加载失败:', roomsResponse.data?.message || '未知错误')
      }
    }
    
  } catch (error) {
    console.error('加载费用数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 组件挂载时加载数据
onMounted(() => {
  loadExpensesData(true)
})
</script>

<style scoped>
.expenses-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.expenses-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-box input {
  padding: 8px 12px 8px 36px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  width: 200px;
  background-color: white;
}

.search-box svg {
  position: absolute;
  left: 12px;
  color: #999;
  pointer-events: none;
}

.filter-button, .add-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.filter-button {
  background-color: white;
  color: #333;
  border: 1px solid #ddd;
}

.filter-button:hover {
  background-color: #f5f5f5;
}

.add-button {
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  color: white;
  border: none;
}

.add-button:hover {
  opacity: 0.9;
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

.expenses-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
}

.total .card-icon {
  background-color: rgba(106, 17, 203, 0.1);
  color: #6a11cb;
}

.this-month .card-icon {
  background-color: rgba(37, 117, 252, 0.1);
  color: #2575fc;
}

.my-share .card-icon {
  background-color: rgba(46, 213, 115, 0.1);
  color: #2ed573;
}

.card-content {
  flex: 1;
}

.card-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.card-value {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.expenses-list {
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.selected-count {
  font-size: 14px;
  font-weight: 500;
  color: #409eff;
}

.batch-buttons {
  display: flex;
  gap: 8px;
}

.batch-button {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
}

.batch-button.settle {
  background-color: #e1f3d8;
  color: #67c23a;
}

.batch-button.settle:hover {
  background-color: #c2e7b0;
}

.batch-button.delete {
  background-color: #fef0f0;
  color: #f56c6c;
}

.batch-button.delete:hover {
  background-color: #fde2e2;
}

.batch-button.cancel {
  background-color: #f4f4f5;
  color: #909399;
}

.batch-button.cancel:hover {
  background-color: #e9e9eb;
}

.controls-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.sort-controls select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background-color: white;
}

.view-controls {
  display: flex;
  gap: 8px;
}

.view-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: white;
  color: #666;
  cursor: pointer;
  transition: all 0.3s;
}

.view-button:hover {
  background-color: #f5f5f5;
}

.view-button.active {
  background-color: #6a11cb;
  color: white;
  border-color: #6a11cb;
}

.list-view {
  display: flex;
  flex-direction: column;
}

.expense-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.3s;
}

.expense-item:hover {
  background-color: #f9f9f9;
}

.expense-checkbox {
  margin-right: 12px;
}

.expense-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.expense-item:last-child {
  border-bottom: none;
}

.expense-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #f5f5f5;
  color: #666;
}

.expense-info {
  flex: 1;
}

.expense-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.expense-meta {
  display: flex;
  gap: 12px;
  font-size: 13px;
  color: #666;
}

.expense-amount {
  text-align: right;
}

.amount-value {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.my-share {
  font-size: 13px;
  color: #666;
}

.expense-status {
  text-align: center;
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

.grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  padding: 16px;
}

.expense-card {
  padding: 16px;
  border: 1px solid #eee;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.expense-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.expense-card-checkbox {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 2;
}

.expense-card-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-left: 28px; /* 为选择框留出空间 */
}

.expense-card .expense-icon {
  width: 36px;
  height: 36px;
}

.card-content .expense-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.card-content .expense-amount {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.card-content .expense-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
}

.card-content .expense-payer,
.card-content .my-share {
  font-size: 13px;
  color: #666;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  margin-top: 16px;
}

.pagination-button {
  padding: 8px 16px;
  background-color: white;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
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

.page-info {
  font-size: 14px;
  color: #666;
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
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
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

.modal-body {
  padding: 20px;
}

.filter-group {
  margin-bottom: 20px;
}

.filter-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.checkbox-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #333;
  cursor: pointer;
}

.filter-group select,
.filter-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  background-color: white;
}

.date-range,
.amount-range {
  display: flex;
  align-items: center;
  gap: 8px;
}

.date-range input,
.amount-range input {
  flex: 1;
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

/* 响应式设计 */
@media (max-width: 768px) {
  .expenses-container {
    padding: 16px;
  }
  
  .expenses-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .summary-cards {
    grid-template-columns: 1fr;
  }
  
  .expense-item {
    flex-wrap: wrap;
    gap: 8px;
  }
  
  .expense-info {
    flex-basis: 100%;
  }
  
  .expense-meta {
    flex-wrap: wrap;
  }
  
  .grid-view {
    grid-template-columns: 1fr;
  }
  
  .modal-content {
    width: 95%;
    max-height: 90vh;
  }
  
  .date-range,
  .amount-range {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>