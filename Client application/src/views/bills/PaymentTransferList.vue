<template>
  <div class="payment-transfer-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1>支付转移记录</h1>
      <div class="header-actions">
        <el-button type="primary" @click="showAddTransferDialog = true">
          <el-icon><Plus /></el-icon>
          添加转移记录
        </el-button>
      </div>
    </div>

    <!-- 筛选和搜索 -->
    <div class="filter-section">
      <el-card>
        <el-form :inline="true" :model="filterForm" class="filter-form">
          <el-form-item label="转移类型">
            <el-select v-model="filterForm.transferType" placeholder="请选择" clearable>
              <el-option label="本人支付" value="self_pay" />
              <el-option label="多人支付" value="multi_pay" />
              <el-option label="代付" value="proxy_pay" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="filterForm.status" placeholder="请选择" clearable>
              <el-option label="待确认" value="pending" />
              <el-option label="已完成" value="completed" />
              <el-option label="已取消" value="cancelled" />
            </el-select>
          </el-form-item>
          <el-form-item label="日期范围">
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
            <el-button type="primary" @click="loadTransfers">查询</el-button>
            <el-button @click="resetFilter">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 转移记录列表 -->
    <div class="transfers-section">
      <el-card>
        <el-table
          v-loading="loading"
          :data="transfers"
          style="width: 100%"
          empty-text="暂无转移记录"
        >
          <el-table-column prop="id" label="ID" width="80" />
          <el-table-column prop="transferType" label="转移类型" width="120">
            <template #default="scope">
              <el-tag :type="getTransferTypeTagType(scope.row.transferType)">
                {{ getTransferTypeText(scope.row.transferType) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="amount" label="金额" width="120">
            <template #default="scope">
              <span class="amount">¥{{ scope.row.amount.toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="fromUser" label="付款人" width="120">
            <template #default="scope">
              <div class="user-info">
                <el-avatar :size="30" :src="scope.row.fromUser.avatar">
                  {{ scope.row.fromUser.name.charAt(0) }}
                </el-avatar>
                <span>{{ scope.row.fromUser.name }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="toUser" label="收款人" width="120">
            <template #default="scope">
              <div class="user-info">
                <el-avatar :size="30" :src="scope.row.toUser.avatar">
                  {{ scope.row.toUser.name.charAt(0) }}
                </el-avatar>
                <span>{{ scope.row.toUser.name }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="scope">
              <el-tag :type="getStatusTagType(scope.row.status)">
                {{ getStatusText(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="createdAt" label="创建时间" width="180">
            <template #default="scope">
              {{ formatDate(scope.row.createdAt) }}
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="scope">
              <el-button
                type="primary"
                size="small"
                @click="viewTransferDetail(scope.row)"
              >
                查看
              </el-button>
              <el-button
                v-if="canConfirmTransfer(scope.row)"
                type="success"
                size="small"
                @click="confirmTransfer(scope.row)"
              >
                确认
              </el-button>
              <el-button
                v-if="canCancelTransfer(scope.row)"
                type="danger"
                size="small"
                @click="cancelTransfer(scope.row)"
              >
                取消
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.currentPage"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="pagination.total"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>

    <!-- 添加转移记录对话框 -->
    <el-dialog
      v-model="showAddTransferDialog"
      title="添加转移记录"
      width="500px"
      @close="resetTransferForm"
    >
      <el-form
        ref="transferFormRef"
        :model="transferForm"
        :rules="transferFormRules"
        label-width="100px"
      >
        <el-form-item label="转移类型" prop="transferType">
          <el-select
            v-model="transferForm.transferType"
            placeholder="请选择转移类型"
            @change="handleTransferTypeChange"
          >
            <el-option label="本人支付" value="self_pay" />
            <el-option label="多人支付" value="multi_pay" />
            <el-option label="代付" value="proxy_pay" />
          </el-select>
        </el-form-item>
        <el-form-item label="金额" prop="amount">
          <el-input-number
            v-model="transferForm.amount"
            :precision="2"
            :step="0.01"
            :min="0"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="付款人" prop="fromUserId">
          <el-select
            v-model="transferForm.fromUserId"
            placeholder="请选择付款人"
            filterable
          >
            <el-option
              v-for="user in billParticipants"
              :key="user.id"
              :label="user.name"
              :value="user.id"
            >
              <div class="user-option">
                <el-avatar :size="24" :src="user.avatar">
                  {{ user.name.charAt(0) }}
                </el-avatar>
                <span>{{ user.name }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="收款人" prop="toUserId">
          <el-select
            v-model="transferForm.toUserId"
            placeholder="请选择收款人"
            filterable
          >
            <el-option
              v-for="user in billParticipants"
              :key="user.id"
              :label="user.name"
              :value="user.id"
            >
              <div class="user-option">
                <el-avatar :size="24" :src="user.avatar">
                  {{ user.name.charAt(0) }}
                </el-avatar>
                <span>{{ user.name }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="note">
          <el-input
            v-model="transferForm.note"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddTransferDialog = false">取消</el-button>
          <el-button type="primary" @click="submitTransfer">确定</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 转移详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="转移详情"
      width="600px"
    >
      <div v-if="selectedTransfer" class="transfer-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="ID">{{ selectedTransfer.id }}</el-descriptions-item>
          <el-descriptions-item label="转移类型">
            <el-tag :type="getTransferTypeTagType(selectedTransfer.transferType)">
              {{ getTransferTypeText(selectedTransfer.transferType) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="金额">¥{{ selectedTransfer.amount.toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTagType(selectedTransfer.status)">
              {{ getStatusText(selectedTransfer.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="付款人">
            <div class="user-info">
              <el-avatar :size="30" :src="selectedTransfer.fromUser.avatar">
                {{ selectedTransfer.fromUser.name.charAt(0) }}
              </el-avatar>
              <span>{{ selectedTransfer.fromUser.name }}</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="收款人">
            <div class="user-info">
              <el-avatar :size="30" :src="selectedTransfer.toUser.avatar">
                {{ selectedTransfer.toUser.name.charAt(0) }}
              </el-avatar>
              <span>{{ selectedTransfer.toUser.name }}</span>
            </div>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(selectedTransfer.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="更新时间">{{ formatDate(selectedTransfer.updatedAt) }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">{{ selectedTransfer.note || '无' }}</el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showDetailDialog = false">关闭</el-button>
          <el-button
            v-if="canConfirmTransfer(selectedTransfer)"
            type="success"
            @click="confirmTransfer(selectedTransfer)"
          >
            确认转移
          </el-button>
          <el-button
            v-if="canCancelTransfer(selectedTransfer)"
            type="danger"
            @click="cancelTransfer(selectedTransfer)"
          >
            取消转移
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { billApi } from '@/api/bill'
import { userApi } from '@/api/user'

const route = useRoute()
const router = useRouter()
const billId = route.params.billId

// 数据状态
const loading = ref(false)
const transfers = ref([])
const billParticipants = ref([])
const selectedTransfer = ref(null)

// 对话框状态
const showAddTransferDialog = ref(false)
const showDetailDialog = ref(false)

// 筛选表单
const filterForm = reactive({
  transferType: '',
  status: '',
  dateRange: []
})

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 转移表单
const transferForm = reactive({
  transferType: '',
  amount: 0,
  fromUserId: '',
  toUserId: '',
  note: ''
})

// 表单校验规则
const transferFormRules = {
  transferType: [
    { required: true, message: '请选择转移类型', trigger: 'change' }
  ],
  amount: [
    { required: true, message: '请输入金额', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '金额必须大于0', trigger: 'blur' }
  ],
  fromUserId: [
    { required: true, message: '请选择付款人', trigger: 'change' }
  ],
  toUserId: [
    { required: true, message: '请选择收款人', trigger: 'change' }
  ]
}

// 当前用户ID（从用户状态管理获取）
const currentUserId = computed(() => {
  // 这里应该从用户状态管理中获取，暂时使用localStorage
  return localStorage.getItem('userId')
})

// 加载转移记录
const loadTransfers = async () => {
  try {
    loading.value = true
    
    console.log(`加载账单 ${billId} 的转移记录`)
    
    // 构建查询参数
    const params = {
      billId,
      page: pagination.currentPage,
      pageSize: pagination.pageSize
    }
    
    // 添加筛选条件
    if (filterForm.transferType) {
      params.transferType = filterForm.transferType
    }
    
    if (filterForm.status) {
      params.status = filterForm.status
    }
    
    if (filterForm.dateRange && filterForm.dateRange.length === 2) {
      params.startDate = filterForm.dateRange[0]
      params.endDate = filterForm.dateRange[1]
    }
    
    // 调用真实API获取转移记录
    const response = await billApi.getPaymentTransfers(params)
    
    if (response && response.success) {
      transfers.value = response.data.transfers || []
      pagination.total = response.data.total || 0
      console.log(`成功加载 ${transfers.value.length} 条转移记录`)
    } else {
      ElMessage.error(response?.message || '加载转移记录失败')
      transfers.value = []
      pagination.total = 0
    }
  } catch (error) {
    console.error('加载转移记录失败:', error)
    ElMessage.error('加载转移记录失败')
    transfers.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// 加载账单参与者
const loadBillParticipants = async () => {
  try {
    console.log(`加载账单 ${billId} 的参与者信息`)
    
    const resp = await billApi.getBillDetail(billId)
    if (resp && resp.success) {
      const bill = resp.data
      billParticipants.value = bill?.participants || []
      console.log(`成功加载 ${billParticipants.value.length} 位参与者`)
    } else {
      ElMessage.error(resp?.message || '加载参与者失败')
      billParticipants.value = []
    }
  } catch (error) {
    console.error('加载参与者信息失败:', error)
    ElMessage.error('加载参与者信息失败')
    billParticipants.value = []
  }
}

// 重置筛选条件
const resetFilter = () => {
  filterForm.transferType = ''
  filterForm.status = ''
  filterForm.dateRange = []
  pagination.currentPage = 1
  loadTransfers()
}

// 分页处理
const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.currentPage = 1
  loadTransfers()
}

const handleCurrentChange = (page) => {
  pagination.currentPage = page
  loadTransfers()
}

// 转移类型变化处理
const handleTransferTypeChange = (value) => {
  // 根据转移类型预设付款人和收款人
  if (value === 'self_pay') {
    // 本人支付：付款人和收款人都是当前用户
    transferForm.fromUserId = currentUserId.value
    transferForm.toUserId = currentUserId.value
  }
  // 其他类型不自动设置，让用户手动选择
}

// 重置转移表单
const resetTransferForm = () => {
  transferForm.transferType = ''
  transferForm.amount = 0
  transferForm.fromUserId = ''
  transferForm.toUserId = ''
  transferForm.note = ''
}

// 提交转移记录
const submitTransfer = async () => {
  try {
    // 表单验证
    const valid = await transferFormRef.value.validate()
    if (!valid) return
    
    // 检查付款人和收款人不能相同（除非是本人支付）
    if (transferForm.transferType !== 'self_pay' && 
        transferForm.fromUserId === transferForm.toUserId) {
      ElMessage.warning('付款人和收款人不能相同')
      return
    }
    
    console.log('提交支付转移记录:', transferForm)
    
    // 构建提交数据
    const data = {
      billId,
      transferType: transferForm.transferType,
      amount: transferForm.amount,
      fromUserId: transferForm.fromUserId,
      toUserId: transferForm.toUserId,
      note: transferForm.note
    }
    
    const resp = await billApi.createPaymentTransfer(data)
    if (resp && resp.success) {
      const newTransfer = resp.data
      transfers.value.unshift(newTransfer)
      pagination.total += 1
      ElMessage.success('转移记录创建成功')
      showAddTransferDialog.value = false
      resetTransferForm()
    } else {
      ElMessage.error(resp?.message || '创建转移记录失败')
    }
  } catch (error) {
    console.error('创建转移记录失败:', error)
    ElMessage.error('创建转移记录失败')
  }
}

// 查看转移详情
const viewTransferDetail = (transfer) => {
  selectedTransfer.value = transfer
  showDetailDialog.value = true
}

// 确认转移
const confirmTransfer = async (transfer) => {
  try {
    await ElMessageBox.confirm(
      `确认完成这笔转移记录吗？金额：¥${transfer.amount.toFixed(2)}`,
      '确认操作',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    console.log(`确认转移记录: ${transfer.id}`)
    
    const resp = await billApi.confirmPaymentTransfer(transfer.id)
    if (resp && resp.success) {
      const updatedTransfer = resp.data
      const index = transfers.value.findIndex(t => t.id === transfer.id)
      if (index !== -1) {
        transfers.value[index] = { ...transfers.value[index], ...updatedTransfer }
      }
      if (selectedTransfer.value && selectedTransfer.value.id === transfer.id) {
        selectedTransfer.value = { ...selectedTransfer.value, ...updatedTransfer }
      }
      ElMessage.success('转移记录已确认')
      showDetailDialog.value = false
    } else {
      ElMessage.error(resp?.message || '确认转移失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('确认转移失败:', error)
      ElMessage.error('确认转移失败')
    }
  }
}

// 取消转移
const cancelTransfer = async (transfer) => {
  try {
    await ElMessageBox.confirm(
      `确认取消这笔转移记录吗？金额：¥${transfer.amount.toFixed(2)}`,
      '取消操作',
      {
        confirmButtonText: '确认取消',
        cancelButtonText: '返回',
        type: 'warning'
      }
    )
    
    console.log(`取消转移记录: ${transfer.id}`)
    
    const resp = await billApi.cancelPaymentTransfer(transfer.id)
    if (resp && resp.success) {
      const updatedTransfer = resp.data
      const index = transfers.value.findIndex(t => t.id === transfer.id)
      if (index !== -1) {
        transfers.value[index] = { ...transfers.value[index], ...updatedTransfer }
      }
      if (selectedTransfer.value && selectedTransfer.value.id === transfer.id) {
        selectedTransfer.value = { ...selectedTransfer.value, ...updatedTransfer }
      }
      ElMessage.success('转移记录已取消')
      showDetailDialog.value = false
    } else {
      ElMessage.error(resp?.message || '取消转移失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消转移失败:', error)
      ElMessage.error('取消转移失败')
    }
  }
}

// 权限判断：是否可以确认转移
const canConfirmTransfer = (transfer) => {
  if (!transfer) return false
  // 只有待确认状态的转移才能确认
  if (transfer.status !== 'pending') return false
  // 只有收款人或管理员可以确认
  return transfer.toUserId === currentUserId.value || transfer.toUser.isAdmin
}

// 权限判断：是否可以取消转移
const canCancelTransfer = (transfer) => {
  if (!transfer) return false
  // 只有待确认状态的转移才能取消
  if (transfer.status !== 'pending') return false
  // 只有付款人、收款人或管理员可以取消
  return transfer.fromUserId === currentUserId.value || 
         transfer.toUserId === currentUserId.value || 
         transfer.toUser.isAdmin
}

// 获取转移类型标签类型
const getTransferTypeTagType = (type) => {
  const typeMap = {
    self_pay: 'primary',
    multi_pay: 'success',
    proxy_pay: 'warning'
  }
  return typeMap[type] || 'info'
}

// 获取转移类型文本
const getTransferTypeText = (type) => {
  const typeMap = {
    self_pay: '本人支付',
    multi_pay: '多人支付',
    proxy_pay: '代付'
  }
  return typeMap[type] || type
}

// 获取状态标签类型
const getStatusTagType = (status) => {
  const statusMap = {
    pending: 'warning',
    completed: 'success',
    cancelled: 'danger'
  }
  return statusMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status) => {
  const statusMap = {
    pending: '待确认',
    completed: '已完成',
    cancelled: '已取消'
  }
  return statusMap[status] || status
}

// 格式化日期
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

// 表单引用
const transferFormRef = ref(null)

// 页面加载时获取数据
onMounted(() => {
  loadTransfers()
  loadBillParticipants()
})
</script>

<style scoped>
.payment-transfer-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.filter-section {
  margin-bottom: 20px;
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.transfers-section {
  margin-bottom: 20px;
}

.amount {
  font-weight: 600;
  color: #d32f2f;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.transfer-detail {
  margin-bottom: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .payment-transfer-container {
    padding: 10px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .filter-form {
    flex-direction: column;
  }
  
  .el-form-item {
    margin-bottom: 10px;
  }
}
</style>