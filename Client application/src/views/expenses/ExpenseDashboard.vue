<template>
  <div class="expense-dashboard">
    <div class="dashboard-header">
      <h1>费用管理</h1>
      <el-button type="primary" @click="createExpense">
        <el-icon><Plus /></el-icon>
        创建费用记录
      </el-button>
    </div>

    <div class="filter-section">
      <el-form :inline="true" :model="filterForm" class="filter-form">
        <el-form-item label="房间">
          <el-select v-model="filterForm.roomId" placeholder="选择房间" clearable>
            <el-option
              v-for="room in rooms"
              :key="room.id"
              :label="room.name"
              :value="room.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="费用类型">
          <el-select v-model="filterForm.category" placeholder="选择类型" clearable>
            <el-option
              v-for="item in expenseCategories"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
          <el-date-picker
            v-model="filterForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadExpenses">查询</el-button>
          <el-button @click="resetFilter">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">¥{{ stats.totalAmount }}</div>
              <div class="stat-label">总支出</div>
            </div>
            <div class="stat-icon total">
              <el-icon><Money /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">¥{{ stats.myAmount }}</div>
              <div class="stat-label">我的支出</div>
            </div>
            <div class="stat-icon my">
              <el-icon><User /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">¥{{ stats.owedAmount }}</div>
              <div class="stat-label">待收金额</div>
            </div>
            <div class="stat-icon owed">
              <el-icon><ArrowDown /></el-icon>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card">
            <div class="stat-content">
              <div class="stat-value">¥{{ stats.owingAmount }}</div>
              <div class="stat-label">待付金额</div>
            </div>
            <div class="stat-icon owing">
              <el-icon><ArrowUp /></el-icon>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <div class="expense-list">
      <el-card shadow="hover">
        <template #header>
          <div class="card-header">
            <span>费用记录</span>
            <div class="header-actions">
              <el-button-group>
                <el-button
                  :type="viewMode === 'list' ? 'primary' : ''"
                  @click="viewMode = 'list'"
                >
                  <el-icon><List /></el-icon>
                  列表视图
                </el-button>
                <el-button
                  :type="viewMode === 'card' ? 'primary' : ''"
                  @click="viewMode = 'card'"
                >
                  <el-icon><Grid /></el-icon>
                  卡片视图
                </el-button>
              </el-button-group>
            </div>
          </div>
        </template>

        <div v-loading="loading" class="expense-content">
          <!-- 列表视图 -->
          <el-table
            v-if="viewMode === 'list'"
            :data="expenses"
            stripe
            style="width: 100%"
          >
            <el-table-column prop="title" label="费用名称" width="180" />
            <el-table-column prop="amount" label="金额" width="120">
              <template #default="scope">
                ¥{{ scope.row.amount.toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="category" label="类型" width="100">
              <template #default="scope">
                <el-tag :type="getCategoryTagType(scope.row.category)">
                  {{ getCategoryText(scope.row.category) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="roomName" label="房间" width="120" />
            <el-table-column prop="payerName" label="支付人" width="100" />
            <el-table-column prop="paymentDate" label="支付日期" width="120">
              <template #default="scope">
                {{ formatDate(scope.row.paymentDate) }}
              </template>
            </el-table-column>
            <el-table-column label="我的分摊" width="120">
              <template #default="scope">
                ¥{{ getMyShare(scope.row).toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="scope">
                <el-tag :type="getStatusTagType(getMyShareStatus(scope.row))">
                  {{ getStatusText(getMyShareStatus(scope.row)) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="scope">
                <el-button type="text" @click="viewExpenseDetail(scope.row)">
                  详情
                </el-button>
                <el-button
                  v-if="scope.row.payerId === currentUserId"
                  type="text"
                  @click="editExpense(scope.row)"
                >
                  编辑
                </el-button>
                <el-button
                  v-if="scope.row.payerId === currentUserId"
                  type="text"
                  @click="deleteExpense(scope.row)"
                >
                  删除
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 卡片视图 -->
          <div v-else class="card-view">
            <el-row :gutter="20">
              <el-col
                v-for="expense in expenses"
                :key="expense.id"
                :span="8"
                class="expense-col"
              >
                <el-card shadow="hover" class="expense-card">
                  <template #header>
                    <div class="card-header">
                      <span class="expense-title">{{ expense.title }}</span>
                      <el-tag :type="getCategoryTagType(expense.category)" size="small">
                        {{ getCategoryText(expense.category) }}
                      </el-tag>
                    </div>
                  </template>
                  <div class="expense-info">
                    <div class="info-item">
                      <span class="label">金额:</span>
                      <span class="value">¥{{ expense.amount.toFixed(2) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">房间:</span>
                      <span class="value">{{ expense.roomName }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">支付人:</span>
                      <span class="value">{{ expense.payerName }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">支付日期:</span>
                      <span class="value">{{ formatDate(expense.paymentDate) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">我的分摊:</span>
                      <span class="value">¥{{ getMyShare(expense).toFixed(2) }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">状态:</span>
                      <el-tag :type="getStatusTagType(getMyShareStatus(expense))" size="small">
                        {{ getStatusText(getMyShareStatus(expense)) }}
                      </el-tag>
                    </div>
                  </div>
                  <div class="card-actions">
                    <el-button type="text" @click="viewExpenseDetail(expense)">
                      详情
                    </el-button>
                    <el-button
                      v-if="expense.payerId === currentUserId"
                      type="text"
                      @click="editExpense(expense)"
                    >
                      编辑
                    </el-button>
                    <el-button
                      v-if="expense.payerId === currentUserId"
                      type="text"
                      @click="deleteExpense(expense)"
                    >
                      删除
                    </el-button>
                  </div>
                </el-card>
              </el-col>
            </el-row>
          </div>

          <div v-if="expenses.length === 0 && !loading" class="empty-state">
            <el-empty description="暂无费用记录" />
          </div>
        </div>

        <div class="pagination-container">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Money, User, ArrowDown, ArrowUp, List, Grid } from '@element-plus/icons-vue'
import { expenseApi } from '@/api/expenses'
import { roomsApi } from '@/api/rooms'
import { useUserStore } from '@/stores/user'

// 路由
const router = useRouter()

// 状态
const userStore = useUserStore()
const loading = ref(false)
const viewMode = ref('list')
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const expenses = ref([])
const rooms = ref([])

// 过滤表单
const filterForm = reactive({
  roomId: '',
  category: '',
  dateRange: []
})

// 统计数据
const stats = reactive({
  totalAmount: 0,
  myAmount: 0,
  owedAmount: 0,
  owingAmount: 0
})

// 费用类型选项
const expenseCategories = [
  { value: 'food', label: '餐饮' },
  { value: 'utilities', label: '水电费' },
  { value: 'rent', label: '房租' },
  { value: 'daily', label: '日用品' },
  { value: 'entertainment', label: '娱乐' },
  { value: 'transport', label: '交通' },
  { value: 'medical', label: '医疗' },
  { value: 'education', label: '教育' },
  { value: 'other', label: '其他' }
]

// 计算属性
const currentUserId = computed(() => userStore.userId)

// 方法
/**
 * 加载费用列表
 */
const loadExpenses = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      roomId: filterForm.roomId || undefined,
      category: filterForm.category || undefined,
      startDate: filterForm.dateRange?.[0] || undefined,
      endDate: filterForm.dateRange?.[1] || undefined
    }
    
    // 模拟API调用
    console.log('加载费用列表，参数:', params)
    
    // 模拟费用数据
    const mockExpenses = [
      {
        id: 'expense-1',
        title: '超市购物',
        amount: 256.8,
        category: 'daily',
        payerId: 'user-1',
        payerName: '张三',
        paymentDate: '2023-11-05',
        splitMembers: [
          { userId: 'user-1', userName: '张三', amount: 85.6, paid: true },
          { userId: 'user-2', userName: '李四', amount: 85.6, paid: false },
          { userId: 'user-3', userName: '王五', amount: 85.6, paid: true }
        ],
        createdAt: '2023-11-05T10:30:00Z'
      },
      {
        id: 'expense-2',
        title: '水电费',
        amount: 420.0,
        category: 'utilities',
        payerId: 'user-2',
        payerName: '李四',
        paymentDate: '2023-11-01',
        splitMembers: [
          { userId: 'user-1', userName: '张三', amount: 140.0, paid: true },
          { userId: 'user-2', userName: '李四', amount: 140.0, paid: true },
          { userId: 'user-3', userName: '王五', amount: 140.0, paid: false }
        ],
        createdAt: '2023-11-01T09:15:00Z'
      },
      {
        id: 'expense-3',
        title: '聚餐',
        amount: 580.0,
        category: 'food',
        payerId: 'user-3',
        payerName: '王五',
        paymentDate: '2023-10-28',
        splitMembers: [
          { userId: 'user-1', userName: '张三', amount: 193.33, paid: true },
          { userId: 'user-2', userName: '李四', amount: 193.33, paid: true },
          { userId: 'user-3', userName: '王五', amount: 193.34, paid: true }
        ],
        createdAt: '2023-10-28T18:45:00Z'
      },
      {
        id: 'expense-4',
        title: '网费',
        amount: 99.0,
        category: 'other',
        payerId: 'user-1',
        payerName: '张三',
        paymentDate: '2023-10-15',
        splitMembers: [
          { userId: 'user-1', userName: '张三', amount: 33.0, paid: true },
          { userId: 'user-2', userName: '李四', amount: 33.0, paid: true },
          { userId: 'user-3', userName: '王五', amount: 33.0, paid: true }
        ],
        createdAt: '2023-10-15T14:20:00Z'
      }
    ]
    
    // 应用筛选条件
    let filteredExpenses = [...mockExpenses]
    
    if (filterForm.roomId) {
      filteredExpenses = filteredExpenses.filter(expense => expense.roomId === filterForm.roomId)
    }
    
    if (filterForm.category) {
      filteredExpenses = filteredExpenses.filter(expense => expense.category === filterForm.category)
    }
    
    if (filterForm.dateRange && filterForm.dateRange.length === 2) {
      const startDate = new Date(filterForm.dateRange[0])
      const endDate = new Date(filterForm.dateRange[1])
      filteredExpenses = filteredExpenses.filter(expense => {
        const expenseDate = new Date(expense.paymentDate)
        return expenseDate >= startDate && expenseDate <= endDate
      })
    }
    
    // 分页处理
    total.value = filteredExpenses.length
    const startIndex = (currentPage.value - 1) * pageSize.value
    const endIndex = startIndex + pageSize.value
    expenses.value = filteredExpenses.slice(startIndex, endIndex)
    
    // 加载统计数据
    loadStats()
  } catch (error) {
    console.error('加载费用列表失败:', error)
    ElMessage.error('加载费用列表失败')
  } finally {
    loading.value = false
  }
}

/**
 * 加载统计数据
 */
const loadStats = async () => {
  try {
    const params = {
      roomId: filterForm.roomId || undefined,
      startDate: filterForm.dateRange?.[0] || undefined,
      endDate: filterForm.dateRange?.[1] || undefined
    }
    
    // 模拟API调用
    console.log('加载统计数据，参数:', params)
    
    // 模拟统计数据
    const mockStats = {
      totalAmount: 1355.8,
      myAmount: 511.93,
      owedAmount: 140.0,
      owingAmount: 85.6
    }
    
    Object.assign(stats, mockStats)
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

/**
 * 加载房间列表
 */
const loadRooms = async () => {
  try {
    // 模拟API调用
    console.log('加载房间列表')
    
    // 模拟房间数据
    const mockRooms = [
      {
        id: 'room-1',
        name: '我的寝室',
        description: '404寝室',
        memberCount: 3,
        createdAt: '2023-09-01T00:00:00Z'
      },
      {
        id: 'room-2',
        name: '家庭账本',
        description: '家庭日常开销',
        memberCount: 5,
        createdAt: '2023-08-15T00:00:00Z'
      }
    ]
    
    rooms.value = mockRooms
  } catch (error) {
    console.error('加载房间列表失败:', error)
  }
}

/**
 * 创建费用记录
 */
const createExpense = () => {
  router.push('/expenses/create')
}

/**
 * 查看费用详情
 */
const viewExpenseDetail = (expense) => {
  router.push(`/expenses/${expense.id}`)
}

/**
 * 编辑费用记录
 */
const editExpense = (expense) => {
  router.push(`/expenses/${expense.id}/edit`)
}

/**
 * 删除费用记录
 */
const deleteExpense = async (expense) => {
  try {
    await ElMessageBox.confirm('确定要删除这条费用记录吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    // 模拟API调用
    console.log('删除费用记录:', expense.id)
    
    // 模拟删除成功
    ElMessage.success('删除成功')
    loadExpenses()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除费用记录失败:', error)
      ElMessage.error('删除费用记录失败')
    }
  }
}

/**
 * 重置过滤条件
 */
const resetFilter = () => {
  filterForm.roomId = ''
  filterForm.category = ''
  filterForm.dateRange = []
  currentPage.value = 1
  loadExpenses()
}

/**
 * 处理页码变化
 */
const handleCurrentChange = (page) => {
  currentPage.value = page
  loadExpenses()
}

/**
 * 处理每页数量变化
 */
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  loadExpenses()
}

/**
 * 格式化日期
 */
const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

/**
 * 获取我的分摊金额
 */
const getMyShare = (expense) => {
  const mySplit = expense.splitMembers?.find(member => member.userId === currentUserId.value)
  return mySplit?.amount || 0
}

/**
 * 获取我的分摊状态
 */
const getMyShareStatus = (expense) => {
  if (expense.payerId === currentUserId.value) {
    return 'paid'
  }
  
  const mySplit = expense.splitMembers?.find(member => member.userId === currentUserId.value)
  if (!mySplit) {
    return 'not_involved'
  }
  
  return mySplit.paid ? 'paid' : 'unpaid'
}

/**
 * 获取费用类型标签类型
 */
const getCategoryTagType = (category) => {
  const typeMap = {
    food: '',
    utilities: 'success',
    rent: 'warning',
    daily: 'info',
    entertainment: 'danger',
    transport: '',
    medical: 'warning',
    education: 'success',
    other: 'info'
  }
  return typeMap[category] || ''
}

/**
 * 获取费用类型文本
 */
const getCategoryText = (category) => {
  const categoryMap = {
    food: '餐饮',
    utilities: '水电费',
    rent: '房租',
    daily: '日用品',
    entertainment: '娱乐',
    transport: '交通',
    medical: '医疗',
    education: '教育',
    other: '其他'
  }
  return categoryMap[category] || '未知'
}

/**
 * 获取状态标签类型
 */
const getStatusTagType = (status) => {
  const statusMap = {
    paid: 'success',
    unpaid: 'warning',
    not_involved: 'info'
  }
  return statusMap[status] || 'info'
}

/**
 * 获取状态文本
 */
const getStatusText = (status) => {
  const statusMap = {
    paid: '已支付',
    unpaid: '待支付',
    not_involved: '不涉及'
  }
  return statusMap[status] || '未知'
}

// 生命周期
onMounted(() => {
  loadExpenses()
  loadRooms()
})
</script>

<style scoped>
.expense-dashboard {
  padding: 20px;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filter-section {
  margin-bottom: 20px;
}

.filter-form {
  background-color: #f5f7fa;
  padding: 15px;
  border-radius: 4px;
}

.stats-section {
  margin-bottom: 20px;
}

.stat-card {
  position: relative;
  overflow: hidden;
}

.stat-content {
  position: relative;
  z-index: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 5px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.stat-icon {
  position: absolute;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 40px;
  opacity: 0.2;
}

.stat-icon.total {
  color: #409eff;
}

.stat-icon.my {
  color: #67c23a;
}

.stat-icon.owed {
  color: #e6a23c;
}

.stat-icon.owing {
  color: #f56c6c;
}

.expense-list {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.expense-content {
  min-height: 400px;
}

.card-view {
  margin-top: 10px;
}

.expense-col {
  margin-bottom: 20px;
}

.expense-card {
  height: 100%;
}

.expense-title {
  font-weight: bold;
}

.expense-info {
  margin-bottom: 15px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.label {
  color: #666;
}

.value {
  font-weight: 500;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.empty-state {
  margin-top: 50px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}
</style>