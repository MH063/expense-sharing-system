<template>
  <div class="sharing-rules">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1>分摊规则管理</h1>
          <p>管理费用分摊规则和计算方式</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="addRule">
            <el-icon><Plus /></el-icon>
            添加规则
          </el-button>
          <el-button @click="refreshRules">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </el-header>
      
      <el-main class="rules-content">
        <!-- 规则筛选 -->
        <el-card class="filter-card">
          <el-form :model="filterForm" inline>
            <el-form-item label="规则类型">
              <el-select v-model="filterForm.type" placeholder="请选择规则类型" clearable>
                <el-option label="平均分摊" value="average" />
                <el-option label="按比例分摊" value="proportional" />
                <el-option label="按使用量分摊" value="usage" />
                <el-option label="固定金额分摊" value="fixed" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="费用类型">
              <el-select v-model="filterForm.expenseType" placeholder="请选择费用类型" clearable>
                <el-option label="电费" value="electricity" />
                <el-option label="水费" value="water" />
                <el-option label="燃气费" value="gas" />
                <el-option label="网络费" value="internet" />
                <el-option label="其他" value="other" />
              </el-select>
            </el-form-item>
            
            <el-form-item label="状态">
              <el-select v-model="filterForm.status" placeholder="请选择状态" clearable>
                <el-option label="启用" value="active" />
                <el-option label="禁用" value="inactive" />
              </el-select>
            </el-form-item>
            
            <el-form-item>
              <el-button type="primary" @click="filterRules">查询</el-button>
              <el-button @click="resetFilter">重置</el-button>
            </el-form-item>
          </el-form>
        </el-card>
        
        <!-- 规则列表 -->
        <el-card class="rules-card">
          <el-table :data="rulesList" style="width: 100%" v-loading="loading">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="name" label="规则名称" width="150" />
            <el-table-column prop="type" label="规则类型" width="120">
              <template #default="scope">
                <el-tag :type="getTypeTagType(scope.row.type)">
                  {{ getTypeName(scope.row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="expenseType" label="费用类型" width="100">
              <template #default="scope">
                <el-tag :type="getExpenseTypeTagType(scope.row.expenseType)">
                  {{ getExpenseTypeName(scope.row.expenseType) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="描述" min-width="200" />
            <el-table-column prop="formula" label="计算公式" width="200" />
            <el-table-column prop="priority" label="优先级" width="80" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="scope">
                <el-switch
                  v-model="scope.row.status"
                  active-value="active"
                  inactive-value="inactive"
                  @change="changeRuleStatus(scope.row)"
                />
              </template>
            </el-table-column>
            <el-table-column prop="createTime" label="创建时间" width="160" />
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="scope">
                <el-button type="primary" size="small" @click="viewRule(scope.row)">查看</el-button>
                <el-button size="small" @click="editRule(scope.row)">编辑</el-button>
                <el-button type="danger" size="small" @click="deleteRule(scope.row)">删除</el-button>
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
      </el-main>
    </el-container>
    
    <!-- 添加/编辑规则对话框 -->
    <el-dialog
      v-model="showRuleDialog"
      :title="isEdit ? '编辑规则' : '添加规则'"
      width="700px"
    >
      <el-form :model="ruleForm" :rules="ruleFormRules" ref="ruleFormRef" label-width="100px">
        <el-form-item label="规则名称" prop="name">
          <el-input v-model="ruleForm.name" placeholder="请输入规则名称" />
        </el-form-item>
        
        <el-form-item label="规则类型" prop="type">
          <el-select v-model="ruleForm.type" placeholder="请选择规则类型" @change="handleTypeChange">
            <el-option label="平均分摊" value="average" />
            <el-option label="按比例分摊" value="proportional" />
            <el-option label="按使用量分摊" value="usage" />
            <el-option label="固定金额分摊" value="fixed" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="费用类型" prop="expenseType">
          <el-select v-model="ruleForm.expenseType" placeholder="请选择费用类型">
            <el-option label="电费" value="electricity" />
            <el-option label="水费" value="water" />
            <el-option label="燃气费" value="gas" />
            <el-option label="网络费" value="internet" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="ruleForm.description"
            type="textarea"
            rows="3"
            placeholder="请输入规则描述"
          />
        </el-form-item>
        
        <el-form-item label="优先级" prop="priority">
          <el-input-number v-model="ruleForm.priority" :min="1" :max="10" />
          <span style="margin-left: 10px;">数字越大优先级越高</span>
        </el-form-item>
        
        <!-- 按比例分摊特有配置 -->
        <template v-if="ruleForm.type === 'proportional'">
          <el-form-item label="分摊比例">
            <div class="proportional-config">
              <div v-for="(item, index) in ruleForm.proportions" :key="index" class="proportion-item">
                <el-input v-model="item.userId" placeholder="用户ID" style="width: 120px;" />
                <span style="margin: 0 10px;">:</span>
                <el-input-number v-model="item.ratio" :min="0" :max="100" style="width: 120px;" />
                <span style="margin: 0 10px;">%</span>
                <el-button type="danger" size="small" @click="removeProportion(index)">删除</el-button>
              </div>
              <el-button type="primary" size="small" @click="addProportion">添加分摊项</el-button>
            </div>
          </el-form-item>
        </template>
        
        <!-- 按使用量分摊特有配置 -->
        <template v-if="ruleForm.type === 'usage'">
          <el-form-item label="使用量字段">
            <el-input v-model="ruleForm.usageField" placeholder="请输入使用量字段名" />
          </el-form-item>
          
          <el-form-item label="单价">
            <el-input-number v-model="ruleForm.unitPrice" :min="0" :precision="2" />
            <span style="margin-left: 10px;">元/单位</span>
          </el-form-item>
        </template>
        
        <!-- 固定金额分摊特有配置 -->
        <template v-if="ruleForm.type === 'fixed'">
          <el-form-item label="固定金额">
            <div class="fixed-amount-config">
              <div v-for="(item, index) in ruleForm.fixedAmounts" :key="index" class="fixed-amount-item">
                <el-input v-model="item.userId" placeholder="用户ID" style="width: 120px;" />
                <span style="margin: 0 10px;">:</span>
                <el-input-number v-model="item.amount" :min="0" :precision="2" style="width: 120px;" />
                <span style="margin: 0 10px;">元</span>
                <el-button type="danger" size="small" @click="removeFixedAmount(index)">删除</el-button>
              </div>
              <el-button type="primary" size="small" @click="addFixedAmount">添加分摊项</el-button>
            </div>
          </el-form-item>
        </template>
        
        <el-form-item label="状态">
          <el-radio-group v-model="ruleForm.status">
            <el-radio label="active">启用</el-radio>
            <el-radio label="inactive">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showRuleDialog = false">取消</el-button>
          <el-button type="primary" @click="submitRule">确定</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 查看规则详情对话框 -->
    <el-dialog v-model="showRuleDetailDialog" title="规则详情" width="700px">
      <div v-if="currentRule" class="rule-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="规则ID">{{ currentRule.id }}</el-descriptions-item>
          <el-descriptions-item label="规则名称">{{ currentRule.name }}</el-descriptions-item>
          <el-descriptions-item label="规则类型">
            <el-tag :type="getTypeTagType(currentRule.type)">
              {{ getTypeName(currentRule.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="费用类型">
            <el-tag :type="getExpenseTypeTagType(currentRule.expenseType)">
              {{ getExpenseTypeName(currentRule.expenseType) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="优先级">{{ currentRule.priority }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="currentRule.status === 'active' ? 'success' : 'danger'">
              {{ currentRule.status === 'active' ? '启用' : '禁用' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="计算公式">{{ currentRule.formula }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ currentRule.createTime }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">{{ currentRule.description }}</el-descriptions-item>
        </el-descriptions>
        
        <!-- 规则特有配置 -->
        <div class="rule-specific-config" v-if="currentRule.type === 'proportional'">
          <h3>分摊比例配置</h3>
          <el-table :data="currentRule.proportions" style="width: 100%">
            <el-table-column prop="userId" label="用户ID" />
            <el-table-column prop="ratio" label="分摊比例">
              <template #default="scope">
                {{ scope.row.ratio }}%
              </template>
            </el-table-column>
          </el-table>
        </div>
        
        <div class="rule-specific-config" v-if="currentRule.type === 'usage'">
          <h3>使用量配置</h3>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="使用量字段">{{ currentRule.usageField }}</el-descriptions-item>
            <el-descriptions-item label="单价">{{ currentRule.unitPrice }} 元/单位</el-descriptions-item>
          </el-descriptions>
        </div>
        
        <div class="rule-specific-config" v-if="currentRule.type === 'fixed'">
          <h3>固定金额配置</h3>
          <el-table :data="currentRule.fixedAmounts" style="width: 100%">
            <el-table-column prop="userId" label="用户ID" />
            <el-table-column prop="amount" label="固定金额">
              <template #default="scope">
                {{ scope.row.amount }} 元
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'

// 加载状态
const loading = ref(false)

// 筛选表单
const filterForm = reactive({
  type: '',
  expenseType: '',
  status: ''
})

// 分页配置
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 规则列表
const rulesList = ref([
  {
    id: 1,
    name: '电费平均分摊',
    type: 'average',
    expenseType: 'electricity',
    description: '寝室电费按人头平均分摊',
    formula: '总费用 / 人数',
    priority: 1,
    status: 'active',
    createTime: '2023-11-01 10:00:00'
  },
  {
    id: 2,
    name: '水费按使用量分摊',
    type: 'usage',
    expenseType: 'water',
    description: '水费按个人使用量分摊',
    formula: '个人使用量 × 单价',
    priority: 2,
    status: 'active',
    createTime: '2023-11-01 10:00:00',
    usageField: 'water_usage',
    unitPrice: 3.5
  },
  {
    id: 3,
    name: '网络费固定分摊',
    type: 'fixed',
    expenseType: 'internet',
    description: '网络费按固定金额分摊',
    formula: '每人固定金额',
    priority: 3,
    status: 'active',
    createTime: '2023-11-01 10:00:00',
    fixedAmounts: [
      { userId: 'user1', amount: 20 },
      { userId: 'user2', amount: 20 },
      { userId: 'user3', amount: 20 },
      { userId: 'user4', amount: 20 }
    ]
  },
  {
    id: 4,
    name: '燃气费按比例分摊',
    type: 'proportional',
    expenseType: 'gas',
    description: '燃气费按使用比例分摊',
    formula: '总费用 × 个人比例',
    priority: 4,
    status: 'active',
    createTime: '2023-11-01 10:00:00',
    proportions: [
      { userId: 'user1', ratio: 30 },
      { userId: 'user2', ratio: 25 },
      { userId: 'user3', ratio: 20 },
      { userId: 'user4', ratio: 25 }
    ]
  }
])

// 对话框状态
const showRuleDialog = ref(false)
const showRuleDetailDialog = ref(false)
const isEdit = ref(false)
const currentRule = ref(null)
const ruleFormRef = ref(null)

// 规则表单
const ruleForm = reactive({
  id: null,
  name: '',
  type: 'average',
  expenseType: '',
  description: '',
  priority: 1,
  status: 'active',
  proportions: [],
  usageField: '',
  unitPrice: 0,
  fixedAmounts: []
})

// 表单验证规则
const ruleFormRules = {
  name: [
    { required: true, message: '请输入规则名称', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择规则类型', trigger: 'change' }
  ],
  expenseType: [
    { required: true, message: '请选择费用类型', trigger: 'change' }
  ],
  description: [
    { required: true, message: '请输入规则描述', trigger: 'blur' }
  ],
  priority: [
    { required: true, message: '请输入优先级', trigger: 'blur' }
  ]
}

// 获取规则类型名称
const getTypeName = (type) => {
  const typeMap = {
    average: '平均分摊',
    proportional: '按比例分摊',
    usage: '按使用量分摊',
    fixed: '固定金额分摊'
  }
  return typeMap[type] || '未知'
}

// 获取规则类型标签类型
const getTypeTagType = (type) => {
  const typeMap = {
    average: 'primary',
    proportional: 'success',
    usage: 'warning',
    fixed: 'info'
  }
  return typeMap[type] || 'info'
}

// 获取费用类型名称
const getExpenseTypeName = (type) => {
  const typeMap = {
    electricity: '电费',
    water: '水费',
    gas: '燃气费',
    internet: '网络费',
    other: '其他'
  }
  return typeMap[type] || '未知'
}

// 获取费用类型标签类型
const getExpenseTypeTagType = (type) => {
  const typeMap = {
    electricity: 'danger',
    water: 'primary',
    gas: 'warning',
    internet: 'success',
    other: 'info'
  }
  return typeMap[type] || 'info'
}

// 筛选规则
const filterRules = () => {
  loading.value = true
  // 模拟API调用
  setTimeout(() => {
    loading.value = false
    ElMessage.success('筛选完成')
  }, 500)
}

// 重置筛选
const resetFilter = () => {
  filterForm.type = ''
  filterForm.expenseType = ''
  filterForm.status = ''
  filterRules()
}

// 刷新规则
const refreshRules = () => {
  loading.value = true
  // 模拟API调用
  setTimeout(() => {
    loading.value = false
    ElMessage.success('刷新成功')
  }, 500)
}

// 分页大小改变
const handleSizeChange = (size) => {
  pagination.pageSize = size
  filterRules()
}

// 当前页改变
const handleCurrentChange = (page) => {
  pagination.currentPage = page
  filterRules()
}

// 添加规则
const addRule = () => {
  isEdit.value = false
  resetRuleForm()
  showRuleDialog.value = true
}

// 查看规则
const viewRule = (rule) => {
  currentRule.value = { ...rule }
  showRuleDetailDialog.value = true
}

// 编辑规则
const editRule = (rule) => {
  isEdit.value = true
  Object.assign(ruleForm, rule)
  
  // 确保特有配置存在
  if (ruleForm.type === 'proportional' && !ruleForm.proportions) {
    ruleForm.proportions = []
  }
  if (ruleForm.type === 'usage' && !ruleForm.usageField) {
    ruleForm.usageField = ''
    ruleForm.unitPrice = 0
  }
  if (ruleForm.type === 'fixed' && !ruleForm.fixedAmounts) {
    ruleForm.fixedAmounts = []
  }
  
  showRuleDialog.value = true
}

// 删除规则
const deleteRule = (rule) => {
  ElMessageBox.confirm(`确定要删除规则"${rule.name}"吗？`, '确认删除', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(() => {
    // 模拟API调用
    const index = rulesList.value.findIndex(r => r.id === rule.id)
    if (index !== -1) {
      rulesList.value.splice(index, 1)
      ElMessage.success('删除成功')
    }
  }).catch(() => {
    // 用户取消操作
  })
}

// 改变规则状态
const changeRuleStatus = (rule) => {
  // 模拟API调用
  setTimeout(() => {
    ElMessage.success(`规则已${rule.status === 'active' ? '启用' : '禁用'}`)
  }, 500)
}

// 规则类型改变
const handleTypeChange = (type) => {
  // 重置特有配置
  ruleForm.proportions = []
  ruleForm.usageField = ''
  ruleForm.unitPrice = 0
  ruleForm.fixedAmounts = []
}

// 添加分摊比例项
const addProportion = () => {
  ruleForm.proportions.push({
    userId: '',
    ratio: 0
  })
}

// 删除分摊比例项
const removeProportion = (index) => {
  ruleForm.proportions.splice(index, 1)
}

// 添加固定金额项
const addFixedAmount = () => {
  ruleForm.fixedAmounts.push({
    userId: '',
    amount: 0
  })
}

// 删除固定金额项
const removeFixedAmount = (index) => {
  ruleForm.fixedAmounts.splice(index, 1)
}

// 提交规则
const submitRule = () => {
  ruleFormRef.value.validate((valid) => {
    if (valid) {
      // 生成计算公式
      if (ruleForm.type === 'average') {
        ruleForm.formula = '总费用 / 人数'
      } else if (ruleForm.type === 'proportional') {
        ruleForm.formula = '总费用 × 个人比例'
      } else if (ruleForm.type === 'usage') {
        ruleForm.formula = '个人使用量 × 单价'
      } else if (ruleForm.type === 'fixed') {
        ruleForm.formula = '每人固定金额'
      }
      
      if (isEdit.value) {
        // 更新规则
        const index = rulesList.value.findIndex(r => r.id === ruleForm.id)
        if (index !== -1) {
          rulesList.value[index] = { ...ruleForm }
        }
        ElMessage.success('规则更新成功')
      } else {
        // 添加规则
        const newRule = {
          ...ruleForm,
          id: rulesList.value.length + 1,
          createTime: new Date().toLocaleString()
        }
        rulesList.value.push(newRule)
        ElMessage.success('规则添加成功')
      }
      
      showRuleDialog.value = false
    }
  })
}

// 重置规则表单
const resetRuleForm = () => {
  ruleForm.id = null
  ruleForm.name = ''
  ruleForm.type = 'average'
  ruleForm.expenseType = ''
  ruleForm.description = ''
  ruleForm.priority = 1
  ruleForm.status = 'active'
  ruleForm.proportions = []
  ruleForm.usageField = ''
  ruleForm.unitPrice = 0
  ruleForm.fixedAmounts = []
}

// 组件挂载时加载数据
onMounted(() => {
  pagination.total = rulesList.value.length
})
</script>

<style scoped>
.sharing-rules {
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

.rules-content {
  padding: 20px;
  overflow-y: auto;
}

.filter-card {
  margin-bottom: 20px;
}

.rules-card {
  margin-bottom: 20px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.proportional-config {
  width: 100%;
}

.proportion-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.fixed-amount-config {
  width: 100%;
}

.fixed-amount-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.rule-detail {
  padding: 10px 0;
}

.rule-specific-config {
  margin-top: 20px;
}

.rule-specific-config h3 {
  margin-bottom: 15px;
  color: #303133;
}
</style>