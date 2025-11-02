<template>
  <div class="dorm-management">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1>寝室管理</h1>
          <p>管理系统中的寝室信息和成员</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="showAddDormDialog = true">
            <el-icon><Plus /></el-icon>
            添加寝室
          </el-button>
          <el-button @click="exportDorms">
            <el-icon><Download /></el-icon>
            导出寝室
          </el-button>
        </div>
      </el-header>
      
      <el-main class="dorm-content">
        <!-- 搜索和筛选区域 -->
        <el-card class="search-card">
          <el-form :model="searchForm" inline>
            <el-form-item label="寝室号">
              <el-input
                v-model="searchForm.roomNumber"
                placeholder="请输入寝室号"
                clearable
              />
            </el-form-item>
            
            <el-form-item label="寝室状态">
              <el-select
                v-model="searchForm.status"
                placeholder="请选择状态"
                clearable
              >
                <el-option label="全部" value="" />
                <el-option label="正常" value="active" />
                <el-option label="空闲" value="vacant" />
                <el-option label="维修中" value="maintenance" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="楼栋">
              <el-select
                v-model="searchForm.building"
                placeholder="请选择楼栋"
                clearable
              >
                <el-option label="全部" value="" />
                <el-option label="A栋" value="A" />
                <el-option label="B栋" value="B" />
                <el-option label="C栋" value="C" />
                <el-option label="D栋" value="D" />
              </el-select>
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="handleSearch">搜索</el-button>
              <el-button @click="resetSearch">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
        
        <!-- 寝室列表 -->
        <el-card class="dorm-list-card">
          <el-table :data="dormList" style="width: 100%" v-loading="loading">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="roomNumber" label="寝室号" width="120" />
            <el-table-column prop="building" label="楼栋" width="80" />
            <el-table-column prop="floor" label="楼层" width="80" />
            <el-table-column prop="capacity" label="容纳人数" width="100" />
            <el-table-column prop="currentCount" label="当前人数" width="100" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="scope">
                <el-tag :type="getStatusTagType(scope.row.status)">
                  {{ getStatusName(scope.row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="leader" label="寝室长" width="120">
              <template #default="scope">
                <span v-if="scope.row.leader">{{ scope.row.leader }}</span>
                <el-button v-else type="text" size="small" @click="assignLeader(scope.row)">指定寝室长</el-button>
              </template>
            </el-table-column>
            <el-table-column prop="totalExpense" label="本月费用" width="120">
              <template #default="scope">
                ¥{{ scope.row.totalExpense.toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="createTime" label="创建时间" width="160" />
            <el-table-column label="操作" width="250" fixed="right">
              <template #default="scope">
                <el-button type="primary" size="small" @click="viewDorm(scope.row)">查看</el-button>
                <el-button size="small" @click="editDorm(scope.row)">编辑</el-button>
                <el-button size="small" @click="manageMembers(scope.row)">成员管理</el-button>
                <el-button type="danger" size="small" @click="deleteDorm(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <!-- 分页 -->
          <div class="pagination-container">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="totalDorms"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </el-card>
      </el-main>
    </el-container>
    
    <!-- 添加/编辑寝室对话框 -->
    <el-dialog
      v-model="showAddDormDialog"
      :title="isEdit ? '编辑寝室' : '添加寝室'"
      width="600px"
    >
      <el-form :model="dormForm" :rules="dormFormRules" ref="dormFormRef" label-width="80px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="寝室号" prop="roomNumber">
              <el-input v-model="dormForm.roomNumber" :disabled="isEdit" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="楼栋" prop="building">
              <el-select v-model="dormForm.building" style="width: 100%">
                <el-option label="A栋" value="A" />
                <el-option label="B栋" value="B" />
                <el-option label="C栋" value="C" />
                <el-option label="D栋" value="D" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="楼层" prop="floor">
              <el-input-number v-model="dormForm.floor" :min="1" :max="20" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="容纳人数" prop="capacity">
              <el-input-number v-model="dormForm.capacity" :min="1" :max="10" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="dormForm.status">
            <el-radio label="active">正常</el-radio>
            <el-radio label="vacant">空闲</el-radio>
            <el-radio label="maintenance">维修中</el-radio>
          </el-radio-group>
        </el-form-item>
        
        <el-form-item label="备注" prop="remarks">
          <el-input v-model="dormForm.remarks" type="textarea" rows="3" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddDormDialog = false">取消</el-button>
          <el-button type="primary" @click="saveDorm">确定</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 寝室详情对话框 -->
    <el-dialog v-model="showDormDetailDialog" title="寝室详情" width="800px">
      <div v-if="currentDorm" class="dorm-detail">
        <el-descriptions :column="3" border>
          <el-descriptions-item label="寝室号">{{ currentDorm.roomNumber }}</el-descriptions-item>
          <el-descriptions-item label="楼栋">{{ currentDorm.building }}栋</el-descriptions-item>
          <el-descriptions-item label="楼层">{{ currentDorm.floor }}层</el-descriptions-item>
          <el-descriptions-item label="容纳人数">{{ currentDorm.capacity }}人</el-descriptions-item>
          <el-descriptions-item label="当前人数">{{ currentDorm.currentCount }}人</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusTagType(currentDorm.status)">
              {{ getStatusName(currentDorm.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="寝室长">{{ currentDorm.leader || '未指定' }}</el-descriptions-item>
          <el-descriptions-item label="本月费用">¥{{ currentDorm.totalExpense.toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ currentDorm.createTime }}</el-descriptions-item>
          <el-descriptions-item label="备注" :span="3">{{ currentDorm.remarks || '无' }}</el-descriptions-item>
        </el-descriptions>
        
        <div class="dorm-members">
          <h3>寝室成员</h3>
          <el-table :data="currentDorm.members" style="width: 100%">
            <el-table-column prop="username" label="用户名" width="120" />
            <el-table-column prop="realName" label="真实姓名" width="120" />
            <el-table-column prop="phone" label="手机号" width="120" />
            <el-table-column prop="joinTime" label="入住时间" width="160" />
            <el-table-column prop="role" label="角色" width="100">
              <template #default="scope">
                <el-tag v-if="scope.row.isLeader" type="warning">寝室长</el-tag>
                <el-tag v-else type="info">成员</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default="scope">
                <el-button v-if="!scope.row.isLeader" type="text" size="small" @click="setAsLeader(scope.row)">设为寝室长</el-button>
                <el-button v-else type="text" size="small" @click="removeLeader(scope.row)">移除寝室长</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        
        <div class="dorm-expenses">
          <h3>本月费用统计</h3>
          <el-row :gutter="20">
            <el-col :span="8">
              <el-statistic title="总费用" :value="currentDorm.totalExpense" precision="2" prefix="¥" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="人均费用" :value="currentDorm.totalExpense / currentDorm.currentCount" precision="2" prefix="¥" />
            </el-col>
            <el-col :span="8">
              <el-statistic title="费用笔数" :value="currentDorm.expenseCount" />
            </el-col>
          </el-row>
        </div>
      </div>
    </el-dialog>
    
    <!-- 成员管理对话框 -->
    <el-dialog v-model="showMemberManageDialog" title="成员管理" width="700px">
      <div v-if="currentDorm" class="member-manage">
        <div class="current-members">
          <h3>当前成员</h3>
          <el-table :data="currentDorm.members" style="width: 100%">
            <el-table-column prop="username" label="用户名" width="120" />
            <el-table-column prop="realName" label="真实姓名" width="120" />
            <el-table-column prop="phone" label="手机号" width="120" />
            <el-table-column prop="joinTime" label="入住时间" width="160" />
            <el-table-column label="操作" width="120">
              <template #default="scope">
                <el-button type="danger" size="small" @click="removeMember(scope.row)">移除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
        
        <div class="add-member">
          <h3>添加成员</h3>
          <el-form :model="addMemberForm" inline>
            <el-form-item label="选择用户">
              <el-select
                v-model="addMemberForm.userId"
                placeholder="请选择用户"
                filterable
                style="width: 300px"
              >
                <el-option
                  v-for="user in availableUsers"
                  :key="user.id"
                  :label="`${user.username} (${user.realName})`"
                  :value="user.id"
                />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="addMember">添加</el-button>
            </el-form-item>
          </el-form>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Download } from '@element-plus/icons-vue'

// 搜索表单
const searchForm = reactive({
  roomNumber: '',
  status: '',
  building: ''
})

// 寝室列表
const dormList = ref([
  {
    id: 1,
    roomNumber: 'A101',
    building: 'A',
    floor: 1,
    capacity: 4,
    currentCount: 4,
    status: 'active',
    leader: '张三',
    totalExpense: 580.50,
    expenseCount: 12,
    createTime: '2023-09-01 10:00:00',
    remarks: '朝南，阳光充足',
    members: [
      { id: 1, username: 'zhangsan', realName: '张三', phone: '13800138001', joinTime: '2023-09-01 10:00:00', isLeader: true },
      { id: 2, username: 'lisi', realName: '李四', phone: '13800138002', joinTime: '2023-09-01 10:30:00', isLeader: false },
      { id: 3, username: 'wangwu', realName: '王五', phone: '13800138003', joinTime: '2023-09-01 11:00:00', isLeader: false },
      { id: 4, username: 'zhaoliu', realName: '赵六', phone: '13800138004', joinTime: '2023-09-01 11:30:00', isLeader: false }
    ]
  },
  {
    id: 2,
    roomNumber: 'B201',
    building: 'B',
    floor: 2,
    capacity: 4,
    currentCount: 3,
    status: 'active',
    leader: '钱七',
    totalExpense: 420.30,
    expenseCount: 8,
    createTime: '2023-09-01 14:00:00',
    remarks: '靠近楼梯，方便出行',
    members: [
      { id: 5, username: 'qianqi', realName: '钱七', phone: '13800138005', joinTime: '2023-09-01 14:00:00', isLeader: true },
      { id: 6, username: 'sunba', realName: '孙八', phone: '13800138006', joinTime: '2023-09-01 14:30:00', isLeader: false },
      { id: 7, username: 'zhoujiu', realName: '周九', phone: '13800138007', joinTime: '2023-09-01 15:00:00', isLeader: false }
    ]
  },
  {
    id: 3,
    roomNumber: 'C301',
    building: 'C',
    floor: 3,
    capacity: 4,
    currentCount: 0,
    status: 'vacant',
    leader: null,
    totalExpense: 0,
    expenseCount: 0,
    createTime: '2023-09-01 16:00:00',
    remarks: '新装修，设施齐全',
    members: []
  },
  {
    id: 4,
    roomNumber: 'D401',
    building: 'D',
    floor: 4,
    capacity: 4,
    currentCount: 2,
    status: 'maintenance',
    leader: null,
    totalExpense: 120.00,
    expenseCount: 3,
    createTime: '2023-09-01 17:00:00',
    remarks: '空调维修中',
    members: [
      { id: 8, username: 'wushi', realName: '吴十', phone: '13800138008', joinTime: '2023-09-01 17:00:00', isLeader: false },
      { id: 9, username: 'zhengyi', realName: '郑一', phone: '13800138009', joinTime: '2023-09-01 17:30:00', isLeader: false }
    ]
  }
])

// 可分配用户列表
const availableUsers = ref([
  { id: 10, username: 'chener', realName: '陈二' },
  { id: 11, username: 'linthree', realName: '林三' },
  { id: 12, username: 'huangfour', realName: '黄四' }
])

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)
const totalDorms = ref(100)

// 加载状态
const loading = ref(false)

// 对话框状态
const showAddDormDialog = ref(false)
const showDormDetailDialog = ref(false)
const showMemberManageDialog = ref(false)
const isEdit = ref(false)
const currentDorm = ref(null)
const dormFormRef = ref(null)

// 寝室表单
const dormForm = reactive({
  id: null,
  roomNumber: '',
  building: 'A',
  floor: 1,
  capacity: 4,
  status: 'active',
  remarks: ''
})

// 添加成员表单
const addMemberForm = reactive({
  userId: null
})

// 表单验证规则
const dormFormRules = {
  roomNumber: [
    { required: true, message: '请输入寝室号', trigger: 'blur' },
    { pattern: /^[A-D]\d{3}$/, message: '寝室号格式为A-D开头加3位数字', trigger: 'blur' }
  ],
  building: [
    { required: true, message: '请选择楼栋', trigger: 'change' }
  ],
  floor: [
    { required: true, message: '请输入楼层', trigger: 'blur' }
  ],
  capacity: [
    { required: true, message: '请输入容纳人数', trigger: 'blur' }
  ],
  status: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ]
}

// 获取状态名称
const getStatusName = (status) => {
  const statusMap = {
    active: '正常',
    vacant: '空闲',
    maintenance: '维修中'
  }
  return statusMap[status] || '未知'
}

// 获取状态标签类型
const getStatusTagType = (status) => {
  const typeMap = {
    active: 'success',
    vacant: 'info',
    maintenance: 'danger'
  }
  return typeMap[status] || 'info'
}

// 搜索寝室
const handleSearch = () => {
  loading.value = true
  // 模拟API调用
  setTimeout(() => {
    loading.value = false
    ElMessage.success('搜索完成')
  }, 500)
}

// 重置搜索
const resetSearch = () => {
  searchForm.roomNumber = ''
  searchForm.status = ''
  searchForm.building = ''
  handleSearch()
}

// 查看寝室详情
const viewDorm = (dorm) => {
  currentDorm.value = { ...dorm }
  showDormDetailDialog.value = true
}

// 编辑寝室
const editDorm = (dorm) => {
  isEdit.value = true
  Object.assign(dormForm, dorm)
  showAddDormDialog.value = true
}

// 管理成员
const manageMembers = (dorm) => {
  currentDorm.value = { ...dorm }
  showMemberManageDialog.value = true
}

// 指定寝室长
const assignLeader = (dorm) => {
  if (!dorm.members || dorm.members.length === 0) {
    ElMessage.warning('该寝室没有成员，无法指定寝室长')
    return
  }
  
  const memberOptions = dorm.members.map(member => ({
    value: member.id,
    label: `${member.realName} (${member.username})`
  }))
  
  ElMessageBox.prompt('请选择寝室长', '指定寝室长', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputType: 'select',
    inputOptions: memberOptions
  })
    .then(({ value }) => {
      // 模拟API调用
      const memberId = parseInt(value)
      const member = dorm.members.find(m => m.id === memberId)
      
      if (member) {
        // 清除所有成员的寝室长标记
        dorm.members.forEach(m => m.isLeader = false)
        // 设置新的寝室长
        member.isLeader = true
        dorm.leader = member.realName
        
        ElMessage.success(`已指定 ${member.realName} 为寝室长`)
      }
    })
    .catch(() => {
      ElMessage.info('已取消操作')
    })
}

// 设为寝室长
const setAsLeader = (member) => {
  if (!currentDorm.value) return
  
  // 清除所有成员的寝室长标记
  currentDorm.value.members.forEach(m => m.isLeader = false)
  // 设置新的寝室长
  member.isLeader = true
  currentDorm.value.leader = member.realName
  
  // 更新原寝室列表中的数据
  const dorm = dormList.value.find(d => d.id === currentDorm.value.id)
  if (dorm) {
    dorm.leader = member.realName
    dorm.members.forEach(m => m.isLeader = false)
    const targetMember = dorm.members.find(m => m.id === member.id)
    if (targetMember) {
      targetMember.isLeader = true
    }
  }
  
  ElMessage.success(`已指定 ${member.realName} 为寝室长`)
}

// 移除寝室长
const removeLeader = (member) => {
  if (!currentDorm.value) return
  
  member.isLeader = false
  currentDorm.value.leader = null
  
  // 更新原寝室列表中的数据
  const dorm = dormList.value.find(d => d.id === currentDorm.value.id)
  if (dorm) {
    dorm.leader = null
    const targetMember = dorm.members.find(m => m.id === member.id)
    if (targetMember) {
      targetMember.isLeader = false
    }
  }
  
  ElMessage.success(`已移除 ${member.realName} 的寝室长身份`)
}

// 删除寝室
const deleteDorm = (dorm) => {
  ElMessageBox.confirm(
    `确定要删除寝室 "${dorm.roomNumber}" 吗？此操作不可恢复！`,
    '删除寝室',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(() => {
      // 模拟API调用
      const index = dormList.value.findIndex(d => d.id === dorm.id)
      if (index !== -1) {
        dormList.value.splice(index, 1)
        ElMessage.success('删除成功')
      }
    })
    .catch(() => {
      ElMessage.info('已取消操作')
    })
}

// 保存寝室
const saveDorm = () => {
  dormFormRef.value.validate((valid) => {
    if (valid) {
      if (isEdit.value) {
        // 编辑寝室
        const index = dormList.value.findIndex(d => d.id === dormForm.id)
        if (index !== -1) {
          dormList.value[index] = { ...dormForm }
          ElMessage.success('更新成功')
        }
      } else {
        // 添加寝室
        const newDorm = {
          ...dormForm,
          id: dormList.value.length + 1,
          currentCount: 0,
          leader: null,
          totalExpense: 0,
          expenseCount: 0,
          createTime: new Date().toLocaleString(),
          members: []
        }
        dormList.value.unshift(newDorm)
        ElMessage.success('添加成功')
      }
      showAddDormDialog.value = false
      resetDormForm()
    }
  })
}

// 添加成员
const addMember = () => {
  if (!addMemberForm.userId) {
    ElMessage.warning('请选择用户')
    return
  }
  
  if (!currentDorm.value) return
  
  // 检查寝室是否已满
  if (currentDorm.value.currentCount >= currentDorm.value.capacity) {
    ElMessage.warning('寝室已满，无法添加更多成员')
    return
  }
  
  // 查找用户
  const user = availableUsers.value.find(u => u.id === addMemberForm.userId)
  if (!user) return
  
  // 添加成员
  const newMember = {
    id: user.id,
    username: user.username,
    realName: user.realName,
    phone: user.phone || '',
    joinTime: new Date().toLocaleString(),
    isLeader: false
  }
  
  currentDorm.value.members.push(newMember)
  currentDorm.value.currentCount += 1
  
  // 更新原寝室列表中的数据
  const dorm = dormList.value.find(d => d.id === currentDorm.value.id)
  if (dorm) {
    dorm.members.push(newMember)
    dorm.currentCount += 1
  }
  
  // 从可用用户列表中移除
  const index = availableUsers.value.findIndex(u => u.id === addMemberForm.userId)
  if (index !== -1) {
    availableUsers.value.splice(index, 1)
  }
  
  ElMessage.success('成员添加成功')
  addMemberForm.userId = null
}

// 移除成员
const removeMember = (member) => {
  if (!currentDorm.value) return
  
  ElMessageBox.confirm(
    `确定要移除成员 "${member.realName}" 吗？`,
    '移除成员',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(() => {
      // 从寝室成员列表中移除
      const index = currentDorm.value.members.findIndex(m => m.id === member.id)
      if (index !== -1) {
        currentDorm.value.members.splice(index, 1)
        currentDorm.value.currentCount -= 1
      }
      
      // 更新原寝室列表中的数据
      const dorm = dormList.value.find(d => d.id === currentDorm.value.id)
      if (dorm) {
        const memberIndex = dorm.members.findIndex(m => m.id === member.id)
        if (memberIndex !== -1) {
          dorm.members.splice(memberIndex, 1)
          dorm.currentCount -= 1
        }
        
        // 如果移除的是寝室长，清除寝室长
        if (member.isLeader) {
          dorm.leader = null
        }
      }
      
      // 添加到可用用户列表
      availableUsers.value.push({
        id: member.id,
        username: member.username,
        realName: member.realName,
        phone: member.phone
      })
      
      ElMessage.success('成员移除成功')
    })
    .catch(() => {
      ElMessage.info('已取消操作')
    })
}

// 导出寝室
const exportDorms = () => {
  ElMessage.success('寝室数据导出成功')
}

// 重置寝室表单
const resetDormForm = () => {
  dormForm.id = null
  dormForm.roomNumber = ''
  dormForm.building = 'A'
  dormForm.floor = 1
  dormForm.capacity = 4
  dormForm.status = 'active'
  dormForm.remarks = ''
  isEdit.value = false
}

// 处理分页大小变化
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  // 重新加载数据
  handleSearch()
}

// 处理当前页变化
const handleCurrentChange = (page) => {
  currentPage.value = page
  // 重新加载数据
  handleSearch()
}

// 组件挂载时加载数据
onMounted(() => {
  handleSearch()
})
</script>

<style scoped>
.dorm-management {
  height: 100vh;
  overflow: hidden;
}

.page-header {
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.header-content h1 {
  margin: 0 0 5px 0;
  color: #303133;
}

.header-content p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.dorm-content {
  padding: 20px;
  overflow-y: auto;
}

.search-card {
  margin-bottom: 20px;
}

.dorm-list-card {
  margin-bottom: 20px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.dorm-detail {
  padding: 10px 0;
}

.dorm-members {
  margin-top: 20px;
}

.dorm-members h3 {
  margin-bottom: 15px;
  color: #303133;
}

.dorm-expenses {
  margin-top: 20px;
}

.dorm-expenses h3 {
  margin-bottom: 15px;
  color: #303133;
}

.member-manage {
  padding: 10px 0;
}

.current-members {
  margin-bottom: 20px;
}

.current-members h3 {
  margin-bottom: 15px;
  color: #303133;
}

.add-member {
  border-top: 1px solid #e4e7ed;
  padding-top: 20px;
}

.add-member h3 {
  margin-bottom: 15px;
  color: #303133;
}
</style>