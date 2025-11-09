<template>
  <div class="leave-records-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/dashboard' }">首页</el-breadcrumb-item>
        <el-breadcrumb-item>请假记录管理</el-breadcrumb-item>
      </el-breadcrumb>
      <h1>请假记录管理</h1>
    </div>

    <!-- 筛选条件 -->
    <div class="filter-section">
      <el-card>
        <div class="filter-row">
          <div class="filter-item">
            <label>成员:</label>
            <el-select
              v-model="filters.memberId"
              placeholder="选择成员"
              clearable
              style="width: 150px"
            >
              <el-option
                v-for="member in roomMembers"
                :key="member.id"
                :label="member.name"
                :value="member.id"
              />
            </el-select>
          </div>
          <div class="filter-item">
            <label>日期范围:</label>
            <el-date-picker
              v-model="filters.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 240px"
            />
          </div>
          <div class="filter-item">
            <el-button type="primary" @click="fetchLeaveRecords">查询</el-button>
            <el-button @click="resetFilters">重置</el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 操作按钮 -->
    <div class="action-section">
      <el-button type="primary" @click="showCreateDialog = true">
        <el-icon><Plus /></el-icon>
        新增请假记录
      </el-button>
      <el-button 
        type="success" 
        @click="autoUpdateStayDays"
        :loading="autoUpdateLoading"
        :disabled="!hasActiveRoom"
      >
        <el-icon><Refresh /></el-icon>
        自动更新在寝天数
      </el-button>
    </div>

    <!-- 请假记录列表 -->
    <div class="records-section">
      <el-card>
        <el-table
          v-loading="loading"
          :data="leaveRecordsList"
          style="width: 100%"
          stripe
        >
          <el-table-column prop="memberName" label="成员" width="120" />
          <el-table-column prop="startDate" label="开始日期" width="120" />
          <el-table-column prop="endDate" label="结束日期" width="120" />
          <el-table-column prop="leaveDays" label="请假天数" width="100" />
          <el-table-column prop="reason" label="请假原因" min-width="150" />
          <el-table-column prop="status" label="状态" width="100">
            <template #default="scope">
              <el-tag :type="getStatusType(scope.row.status)">
                {{ getStatusText(scope.row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="created_at" label="创建时间" width="160" />
          <el-table-column label="操作" width="180" fixed="right">
            <template #default="scope">
              <el-button
                size="small"
                type="primary"
                link
                @click="viewRecord(scope.row)"
              >
                查看
              </el-button>
              <el-button
                size="small"
                type="warning"
                link
                @click="editRecord(scope.row)"
              >
                编辑
              </el-button>
              <el-button
                size="small"
                type="danger"
                link
                @click="deleteRecord(scope.row)"
              >
                删除
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

    <!-- 新增/编辑请假记录对话框 -->
    <el-dialog
      v-model="showCreateDialog"
      :title="isEditing ? '编辑请假记录' : '新增请假记录'"
      width="500px"
      :before-close="handleCloseDialog"
    >
      <el-form
        ref="leaveRecordFormRef"
        :model="leaveRecordForm"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="成员" prop="memberId">
          <el-select
            v-model="leaveRecordForm.memberId"
            placeholder="选择成员"
            style="width: 100%"
            :disabled="isEditing"
          >
            <el-option
              v-for="member in roomMembers"
              :key="member.id"
              :label="member.name"
              :value="member.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="开始日期" prop="startDate">
          <el-date-picker
            v-model="leaveRecordForm.startDate"
            type="date"
            placeholder="选择开始日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="结束日期" prop="endDate">
          <el-date-picker
            v-model="leaveRecordForm.endDate"
            type="date"
            placeholder="选择结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="请假原因" prop="reason">
          <el-input
            v-model="leaveRecordForm.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入请假原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleCloseDialog">取消</el-button>
          <el-button type="primary" @click="saveLeaveRecord" :loading="saveLoading">
            {{ isEditing ? '更新' : '创建' }}
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 查看请假记录详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="请假记录详情"
      width="500px"
    >
      <div v-if="currentRecord" class="record-detail">
        <div class="detail-item">
          <span class="label">成员:</span>
          <span class="value">{{ currentRecord.memberName }}</span>
        </div>
        <div class="detail-item">
          <span class="label">开始日期:</span>
          <span class="value">{{ currentRecord.startDate }}</span>
        </div>
        <div class="detail-item">
          <span class="label">结束日期:</span>
          <span class="value">{{ currentRecord.endDate }}</span>
        </div>
        <div class="detail-item">
          <span class="label">请假天数:</span>
          <span class="value">{{ currentRecord.leaveDays }} 天</span>
        </div>
        <div class="detail-item">
          <span class="label">请假原因:</span>
          <span class="value">{{ currentRecord.reason || '无' }}</span>
        </div>
        <div class="detail-item">
          <span class="label">状态:</span>
          <el-tag :type="getStatusType(currentRecord.status)">
            {{ getStatusText(currentRecord.status) }}
          </el-tag>
        </div>
        <div class="detail-item">
          <span class="label">创建时间:</span>
          <span class="value">{{ currentRecord.created_at }}</span>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { useRoomStore } from '@/stores/rooms'
import { useLeaveRecordsStore } from '@/stores/leaveRecords'
import { leaveRecordsApi } from '@/api/leaveRecords'

// 状态管理
const roomStore = useRoomStore()
const leaveRecordsStore = useLeaveRecordsStore()

// 响应式数据
const loading = ref(false)
const autoUpdateLoading = ref(false)
const saveLoading = ref(false)
const showCreateDialog = ref(false)
const showDetailDialog = ref(false)
const isEditing = ref(false)
const currentRecord = ref(null)
const leaveRecordFormRef = ref(null)

// 筛选条件
const filters = reactive({
  memberId: '',
  dateRange: []
})

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 表单数据
const leaveRecordForm = reactive({
  id: '',
  memberId: '',
  startDate: '',
  endDate: '',
  reason: ''
})

// 表单验证规则
const formRules = {
  memberId: [
    { required: true, message: '请选择成员', trigger: 'change' }
  ],
  startDate: [
    { required: true, message: '请选择开始日期', trigger: 'change' }
  ],
  endDate: [
    { required: true, message: '请选择结束日期', trigger: 'change' }
  ],
  reason: [
    { required: true, message: '请输入请假原因', trigger: 'blur' }
  ]
}

// 计算属性
const hasActiveRoom = computed(() => {
  return !!roomStore.activeRoomId
})

const roomMembers = computed(() => {
  return roomStore.roomMembers || []
})

const leaveRecordsList = computed(() => {
  let records = []
  
  if (filters.memberId) {
    // 如果选择了特定成员，获取该成员的请假记录
    const memberRecords = leaveRecordsStore.memberLeaveRecords[filters.memberId] || []
    records = memberRecords.map(record => ({
      ...record,
      memberName: roomMembers.value.find(m => m.id === record.memberId)?.name || '未知成员'
    }))
  } else if (roomStore.activeRoomId) {
    // 获取房间所有成员的请假记录
    const roomRecords = leaveRecordsStore.roomMembersLeaveRecords[roomStore.activeRoomId] || {}
    Object.keys(roomRecords).forEach(memberId => {
      const memberRecords = roomRecords[memberId].map(record => ({
        ...record,
        memberName: roomMembers.value.find(m => m.id === memberId)?.name || '未知成员'
      }))
      records = [...records, ...memberRecords]
    })
  }
  
  // 按日期范围筛选
  if (filters.dateRange && filters.dateRange.length === 2) {
    const [startDate, endDate] = filters.dateRange
    records = records.filter(record => {
      return record.startDate >= startDate && record.endDate <= endDate
    })
  }
  
  // 按创建时间倒序排序
  records.sort((a, b) => {
    return new Date(b.created_at) - new Date(a.created_at)
  })
  
  // 更新分页总数
  pagination.total = records.length
  
  // 返回当前页的数据
  const start = (pagination.currentPage - 1) * pagination.pageSize
  const end = start + pagination.pageSize
  return records.slice(start, end)
})

// 方法
/**
 * 获取请假记录
 */
const fetchLeaveRecords = async () => {
  if (!hasActiveRoom.value) {
    ElMessage.warning('请先加入房间')
    return
  }
  
  loading.value = true
  
  try {
    // 设置默认日期范围为当前月份
    if (!filters.dateRange || filters.dateRange.length === 0) {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth()
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      
      filters.dateRange = [
        firstDay.toISOString().split('T')[0],
        lastDay.toISOString().split('T')[0]
      ]
    }
    
    const [startDate, endDate] = filters.dateRange
    
    if (filters.memberId) {
      // 获取特定成员的请假记录
      await leaveRecordsStore.fetchMemberLeaveRecords(filters.memberId, startDate, endDate)
    } else {
      // 获取房间所有成员的请假记录
      await leaveRecordsStore.fetchRoomMembersLeaveRecords(roomStore.activeRoomId, startDate, endDate)
    }
    
    ElMessage.success('获取请假记录成功')
  } catch (error) {
    console.error('获取请假记录失败:', error)
    ElMessage.error('获取请假记录失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

/**
 * 重置筛选条件
 */
const resetFilters = () => {
  filters.memberId = ''
  filters.dateRange = []
  pagination.currentPage = 1
  fetchLeaveRecords()
}

/**
 * 查看请假记录详情
 */
const viewRecord = (record) => {
  currentRecord.value = record
  showDetailDialog.value = true
}

/**
 * 编辑请假记录
 */
const editRecord = (record) => {
  isEditing.value = true
  leaveRecordForm.id = record.id
  leaveRecordForm.memberId = record.memberId
  leaveRecordForm.startDate = record.startDate
  leaveRecordForm.endDate = record.endDate
  leaveRecordForm.reason = record.reason
  showCreateDialog.value = true
}

/**
 * 删除请假记录
 */
const deleteRecord = async (record) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除 ${record.memberName} 在 ${record.startDate} 至 ${record.endDate} 的请假记录吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await leaveRecordsStore.deleteLeaveRecord(record.id)
    ElMessage.success('删除成功')
    fetchLeaveRecords()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除请假记录失败:', error)
      ElMessage.error('删除失败: ' + error.message)
    }
  }
}

/**
 * 保存请假记录
 */
const saveLeaveRecord = async () => {
  if (!leaveRecordFormRef.value) return
  
  try {
    await leaveRecordFormRef.value.validate()
    
    saveLoading.value = true
    
    if (isEditing.value) {
      await leaveRecordsStore.updateLeaveRecord(leaveRecordForm.id, leaveRecordForm)
      ElMessage.success('更新成功')
    } else {
      await leaveRecordsStore.createLeaveRecord(leaveRecordForm)
      ElMessage.success('创建成功')
    }
    
    handleCloseDialog()
    fetchLeaveRecords()
  } catch (error) {
    console.error('保存请假记录失败:', error)
    ElMessage.error('保存失败: ' + error.message)
  } finally {
    saveLoading.value = false
  }
}

/**
 * 自动更新在寝天数
 */
const autoUpdateStayDays = async () => {
  if (!hasActiveRoom.value) {
    ElMessage.warning('请先加入房间')
    return
  }
  
  // 设置默认日期范围为当前月份
  let dateRange = filters.dateRange
  if (!dateRange || dateRange.length === 0) {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    dateRange = [
      firstDay.toISOString().split('T')[0],
      lastDay.toISOString().split('T')[0]
    ]
  }
  
  try {
    autoUpdateLoading.value = true
    
    const result = await leaveRecordsStore.autoUpdateStayDaysByLeaveRecords(
      roomStore.activeRoomId,
      dateRange[0],
      dateRange[1]
    )
    
    if (result) {
      ElMessage.success('自动更新在寝天数成功')
      // 这里可以刷新在寝天数相关的数据
    } else {
      ElMessage.error('自动更新在寝天数失败')
    }
  } catch (error) {
    console.error('自动更新在寝天数失败:', error)
    ElMessage.error('自动更新在寝天数失败: ' + error.message)
  } finally {
    autoUpdateLoading.value = false
  }
}

/**
 * 关闭对话框
 */
const handleCloseDialog = () => {
  showCreateDialog.value = false
  isEditing.value = false
  
  // 重置表单
  if (leaveRecordFormRef.value) {
    leaveRecordFormRef.value.resetFields()
  }
  
  leaveRecordForm.id = ''
  leaveRecordForm.memberId = ''
  leaveRecordForm.startDate = ''
  leaveRecordForm.endDate = ''
  leaveRecordForm.reason = ''
}

/**
 * 处理分页大小变化
 */
const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.currentPage = 1
}

/**
 * 处理当前页变化
 */
const handleCurrentChange = (page) => {
  pagination.currentPage = page
}

/**
 * 获取状态类型
 */
const getStatusType = (status) => {
  switch (status) {
    case 'approved':
      return 'success'
    case 'rejected':
      return 'danger'
    case 'pending':
    default:
      return 'warning'
  }
}

/**
 * 获取状态文本
 */
const getStatusText = (status) => {
  switch (status) {
    case 'approved':
      return '已批准'
    case 'rejected':
      return '已拒绝'
    case 'pending':
    default:
      return '待审批'
  }
}

// 生命周期
onMounted(() => {
  fetchLeaveRecords()
})
</script>

<style scoped>
.leave-records-management {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h1 {
  margin: 10px 0 0 0;
  font-size: 24px;
  color: #303133;
}

.filter-section {
  margin-bottom: 20px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 15px;
  align-items: center;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-item label {
  font-weight: 500;
  color: #606266;
  white-space: nowrap;
}

.action-section {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.records-section {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.record-detail {
  padding: 10px 0;
}

.detail-item {
  display: flex;
  margin-bottom: 15px;
  align-items: center;
}

.detail-item .label {
  font-weight: 500;
  color: #606266;
  width: 100px;
  flex-shrink: 0;
}

.detail-item .value {
  color: #303133;
  flex: 1;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .leave-records-management {
    padding: 15px;
  }
  
  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-item {
    flex-direction: column;
    align-items: stretch;
  }
  
  .action-section {
    flex-direction: column;
  }
}
</style>