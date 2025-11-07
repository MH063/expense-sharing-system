<template>
  <div class="abnormal-expense">
    <el-container>
      <el-header class="page-header">
        <div class="header-content">
          <h1>异常费用识别</h1>
          <p>自动识别和处理系统中的异常费用</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" @click="runDetection">
            <el-icon><Search /></el-icon>
            运行检测
          </el-button>
          <el-button @click="exportReport">
            <el-icon><Download /></el-icon>
            导出报告
          </el-button>
        </div>
      </el-header>
      
      <el-main class="abnormal-content">
        <!-- 检测规则配置 -->
        <el-card class="rules-card">
          <div class="card-header">
            <h3>检测规则配置</h3>
            <el-button type="primary" size="small" @click="showAddRuleDialog = true">
              <el-icon><Plus /></el-icon>
              添加规则
            </el-button>
          </div>
          
          <el-table :data="detectionRules" style="width: 100%">
            <el-table-column prop="name" label="规则名称" width="200" />
            <el-table-column prop="type" label="规则类型" width="120">
              <template #default="scope">
                <el-tag :type="getRuleTypeTagType(scope.row.type)">
                  {{ getRuleTypeName(scope.row.type) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="description" label="规则描述" />
            <el-table-column prop="threshold" label="阈值" width="120" />
            <el-table-column prop="status" label="状态" width="100">
              <template #default="scope">
                <el-switch
                  v-model="scope.row.enabled"
                  @change="toggleRule(scope.row)"
                />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="scope">
                <el-button size="small" @click="editRule(scope.row)">编辑</el-button>
                <el-button type="danger" size="small" @click="deleteRule(scope.row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
        
        <!-- 异常费用列表 -->
        <el-card class="abnormal-list-card">
          <div class="list-header">
            <h3>异常费用列表</h3>
            <div class="list-actions">
              <el-select v-model="filterStatus" placeholder="处理状态" clearable @change="filterAbnormalExpenses">
                <el-option label="全部" value="" />
                <el-option label="待处理" value="pending" />
                <el-option label="已确认" value="confirmed" />
                <el-option label="已忽略" value="ignored" />
              </el-select>
              <el-select v-model="filterSeverity" placeholder="严重程度" clearable @change="filterAbnormalExpenses">
                <el-option label="全部" value="" />
                <el-option label="低" value="low" />
                <el-option label="中" value="medium" />
                <el-option label="高" value="high" />
              </el-select>
              <el-button type="primary" @click="filterAbnormalExpenses">筛选</el-button>
            </div>
          </div>
          
          <el-table :data="abnormalExpenses" style="width: 100%" v-loading="loading">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="expenseId" label="费用ID" width="100" />
            <el-table-column prop="category" label="费用类型" width="100">
              <template #default="scope">
                <el-tag :type="getCategoryTagType(scope.row.category)">
                  {{ getCategoryName(scope.row.category) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" width="120">
              <template #default="scope">
                ¥{{ scope.row.amount.toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="payer" label="支付人" width="120" />
            <el-table-column prop="dorm" label="寝室" width="100" />
            <el-table-column prop="date" label="日期" width="120" />
            <el-table-column prop="severity" label="严重程度" width="100">
              <template #default="scope">
                <el-tag :type="getSeverityTagType(scope.row.severity)">
                  {{ getSeverityName(scope.row.severity) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="处理状态" width="100">
              <template #default="scope">
                <el-tag :type="getStatusTagType(scope.row.status)">
                  {{ getStatusName(scope.row.status) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="scope">
                <el-button type="primary" size="small" @click="viewAbnormalExpense(scope.row)">查看</el-button>
                <el-button v-if="scope.row.status === 'pending'" size="small" @click="confirmAbnormal(scope.row)">确认</el-button>
                <el-button v-if="scope.row.status === 'pending'" size="small" @click="ignoreAbnormal(scope.row)">忽略</el-button>
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
              :total="totalAbnormalExpenses"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </el-card>
        
        <!-- 统计图表 -->
        <el-row :gutter="20" class="chart-row">
          <el-col :span="12">
            <el-card class="chart-card">
              <div class="chart-header">
                <h3>异常费用趋势</h3>
              </div>
              <div class="chart-container">
                <!-- 这里应该使用图表库，如ECharts -->
                <div class="chart-placeholder">
                  <img src="https://picsum.photos/seed/abnormal-trend/500/300.jpg" alt="异常费用趋势" />
                </div>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="12">
            <el-card class="chart-card">
              <div class="chart-header">
                <h3>异常类型分布</h3>
              </div>
              <div class="chart-container">
                <!-- 这里应该使用图表库，如ECharts -->
                <div class="chart-placeholder">
                  <img src="https://picsum.photos/seed/abnormal-type/500/300.jpg" alt="异常类型分布" />
                </div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </el-main>
    </el-container>
    
    <!-- 添加/编辑规则对话框 -->
    <el-dialog
      v-model="showAddRuleDialog"
      :title="isEditRule ? '编辑规则' : '添加规则'"
      width="600px"
    >
      <el-form :model="ruleForm" :rules="ruleFormRules" ref="ruleFormRef" label-width="100px">
        <el-form-item label="规则名称" prop="name">
          <el-input v-model="ruleForm.name" placeholder="请输入规则名称" />
        </el-form-item>
        
        <el-form-item label="规则类型" prop="type">
          <el-select v-model="ruleForm.type" placeholder="请选择规则类型" style="width: 100%">
            <el-option label="金额阈值" value="amount_threshold" />
            <el-option label="频率异常" value="frequency_anomaly" />
            <el-option label="时间异常" value="time_anomaly" />
            <el-option label="类型异常" value="category_anomaly" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="规则描述" prop="description">
          <el-input v-model="ruleForm.description" type="textarea" rows="3" placeholder="请输入规则描述" />
        </el-form-item>
        
        <el-form-item label="阈值" prop="threshold">
          <el-input-number v-model="ruleForm.threshold" :min="0" style="width: 100%" />
        </el-form-item>
        
        <el-form-item label="严重程度" prop="severity">
          <el-select v-model="ruleForm.severity" placeholder="请选择严重程度" style="width: 100%">
            <el-option label="低" value="low" />
            <el-option label="中" value="medium" />
            <el-option label="高" value="high" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="启用状态" prop="enabled">
          <el-switch v-model="ruleForm.enabled" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddRuleDialog = false">取消</el-button>
          <el-button type="primary" @click="saveRule">确定</el-button>
        </span>
      </template>
    </el-dialog>
    
    <!-- 异常费用详情对话框 -->
    <el-dialog v-model="showAbnormalDetailDialog" title="异常费用详情" width="700px">
      <div v-if="currentAbnormalExpense" class="abnormal-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="异常ID">{{ currentAbnormalExpense.id }}</el-descriptions-item>
          <el-descriptions-item label="费用ID">{{ currentAbnormalExpense.expenseId }}</el-descriptions-item>
          <el-descriptions-item label="费用类型">
            <el-tag :type="getCategoryTagType(currentAbnormalExpense.category)">
              {{ getCategoryName(currentAbnormalExpense.category) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="金额">¥{{ currentAbnormalExpense.amount.toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="支付人">{{ currentAbnormalExpense.payer }}</el-descriptions-item>
          <el-descriptions-item label="寝室">{{ currentAbnormalExpense.dorm }}</el-descriptions-item>
          <el-descriptions-item label="支付日期">{{ currentAbnormalExpense.date }}</el-descriptions-item>
          <el-descriptions-item label="严重程度">
            <el-tag :type="getSeverityTagType(currentAbnormalExpense.severity)">
              {{ getSeverityName(currentAbnormalExpense.severity) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="处理状态">
            <el-tag :type="getStatusTagType(currentAbnormalExpense.status)">
              {{ getStatusName(currentAbnormalExpense.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="检测时间">{{ currentAbnormalExpense.detectTime }}</el-descriptions-item>
          <el-descriptions-item label="触发规则">{{ currentAbnormalExpense.ruleName }}</el-descriptions-item>
          <el-descriptions-item label="异常原因" :span="2">{{ currentAbnormalExpense.reason }}</el-descriptions-item>
          <el-descriptions-item label="处理备注" :span="2">{{ currentAbnormalExpense.handleRemark || '无' }}</el-descriptions-item>
        </el-descriptions>
        
        <div class="abnormal-actions">
          <el-button v-if="currentAbnormalExpense.status === 'pending'" type="success" @click="confirmAbnormal(currentAbnormalExpense)">确认异常</el-button>
          <el-button v-if="currentAbnormalExpense.status === 'pending'" @click="ignoreAbnormal(currentAbnormalExpense)">忽略异常</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Download, Plus } from '@element-plus/icons-vue'
import { expenseApi } from '@/api'

// 检测规则列表
const detectionRules = ref([])

// 异常费用列表
const abnormalExpenses = ref([])

// 筛选条件
const filterStatus = ref('')
const filterSeverity = ref('')

// 分页相关
const currentPage = ref(1)
const pageSize = ref(10)
const totalAbnormalExpenses = ref(50)

// 加载状态
const loading = ref(false)

// 对话框状态
const showAddRuleDialog = ref(false)
const showAbnormalDetailDialog = ref(false)
const isEditRule = ref(false)
const currentAbnormalExpense = ref(null)
const ruleFormRef = ref(null)

// 规则表单
const ruleForm = reactive({
  id: null,
  name: '',
  type: 'amount_threshold',
  description: '',
  threshold: 0,
  severity: 'medium',
  enabled: true
})

// 表单验证规则
const ruleFormRules = {
  name: [
    { required: true, message: '请输入规则名称', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择规则类型', trigger: 'change' }
  ],
  description: [
    { required: true, message: '请输入规则描述', trigger: 'blur' }
  ],
  threshold: [
    { required: true, message: '请输入阈值', trigger: 'blur' }
  ],
  severity: [
    { required: true, message: '请选择严重程度', trigger: 'change' }
  ]
}

// 获取规则类型名称
const getRuleTypeName = (type) => {
  const typeMap = {
    amount_threshold: '金额阈值',
    frequency_anomaly: '频率异常',
    time_anomaly: '时间异常',
    category_anomaly: '类型异常'
  }
  return typeMap[type] || '未知'
}

// 获取规则类型标签类型
const getRuleTypeTagType = (type) => {
  const typeMap = {
    amount_threshold: 'danger',
    frequency_anomaly: 'warning',
    time_anomaly: 'info',
    category_anomaly: 'primary'
  }
  return typeMap[type] || 'info'
}

// 获取费用类型名称
const getCategoryName = (category) => {
  const categoryMap = {
    water: '水费',
    electricity: '电费',
    internet: '网费',
    other: '其他'
  }
  return categoryMap[category] || '未知'
}

// 获取费用类型标签类型
const getCategoryTagType = (category) => {
  const typeMap = {
    water: 'primary',
    electricity: 'success',
    internet: 'info',
    other: 'warning'
  }
  return typeMap[category] || 'info'
}

// 获取严重程度名称
const getSeverityName = (severity) => {
  const severityMap = {
    low: '低',
    medium: '中',
    high: '高'
  }
  return severityMap[severity] || '未知'
}

// 获取严重程度标签类型
const getSeverityTagType = (severity) => {
  const typeMap = {
    low: 'info',
    medium: 'warning',
    high: 'danger'
  }
  return typeMap[severity] || 'info'
}

// 获取状态名称
const getStatusName = (status) => {
  const statusMap = {
    pending: '待处理',
    confirmed: '已确认',
    ignored: '已忽略'
  }
  return statusMap[status] || '未知'
}

// 获取状态标签类型
const getStatusTagType = (status) => {
  const typeMap = {
    pending: 'warning',
    confirmed: 'success',
    ignored: 'info'
  }
  return typeMap[status] || 'info'
}

// 运行检测
const runDetection = async () => {
  loading.value = true
  try {
    // 调用异常检测API
    const response = await fetch('/api/abnormal-expenses/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    const result = await response.json()
    
    if (result.success) {
      ElMessage.success(result.message || '检测完成')
      // 刷新数据
      fetchAbnormalExpenses()
      fetchStatistics()
    } else {
      ElMessage.error(result.message || '检测失败')
    }
  } catch (error) {
    console.error('运行检测失败:', error)
    ElMessage.error('检测失败，请重试')
  } finally {
    loading.value = false
  }
}

// 导出报告
const exportReport = () => {
  ElMessageBox.confirm(
    '请选择导出格式',
    '导出报告',
    {
      confirmButtonText: '导出Excel',
      cancelButtonText: '导出PDF',
      type: 'info'
    }
  )
    .then(() => {
      // 导出Excel
      exportToExcel()
    })
    .catch(() => {
      // 导出PDF
      exportToPDF()
    })
}

// 导出Excel格式报告
const exportToExcel = async () => {
  loading.value = true
  try {
    // 构建查询参数
    const params = new URLSearchParams()
    if (filterStatus.value) {
      params.append('status', filterStatus.value)
    }
    if (filterSeverity.value) {
      params.append('severity', filterSeverity.value)
    }
    
    // 调用导出API
    const response = await fetch(`/api/abnormal-expenses/export?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    if (response.ok) {
      // 获取文件名
      const contentDisposition = response.headers.get('content-disposition')
      let fileName = '异常费用报告.xlsx'
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (fileNameMatch && fileNameMatch[1]) {
          fileName = fileNameMatch[1].replace(/['"]/g, '')
        }
      }
      
      // 创建Blob并下载
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      ElMessage.success('Excel报告导出成功')
    } else {
      ElMessage.error('导出失败，请重试')
    }
  } catch (error) {
    console.error('导出Excel失败:', error)
    ElMessage.error('导出Excel失败，请重试')
  } finally {
    loading.value = false
  }
}

// 导出PDF格式报告
const exportToPDF = async () => {
  loading.value = true
  try {
    // 构建查询参数
    const params = new URLSearchParams()
    if (filterStatus.value) {
      params.append('status', filterStatus.value)
    }
    if (filterSeverity.value) {
      params.append('severity', filterSeverity.value)
    }
    params.append('format', 'pdf') // 指定导出格式为PDF
    
    // 调用导出API
    const response = await fetch(`/api/abnormal-expenses/export?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    if (response.ok) {
      // 获取文件名
      const contentDisposition = response.headers.get('content-disposition')
      let fileName = '异常费用报告.pdf'
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
        if (fileNameMatch && fileNameMatch[1]) {
          fileName = fileNameMatch[1].replace(/['"]/g, '')
        }
      }
      
      // 创建Blob并下载
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      ElMessage.success('PDF报告导出成功')
    } else {
      ElMessage.error('导出失败，请重试')
    }
  } catch (error) {
    console.error('导出PDF失败:', error)
    ElMessage.error('导出PDF失败，请重试')
  } finally {
    loading.value = false
  }
}
        
        // 添加表头
        headers.forEach((header, index) => {
          const xPosition = 14 + (index * 15)
          if (xPosition < 190) { // 确保不超出页面宽度
            pdf.text(header, xPosition, yPosition)
          }
        })
        
        yPosition += 5
        
        // 添加表格数据（每页最多25行）
        let rowCount = 0
        tableData.forEach((row, rowIndex) => {
          if (rowCount >= 25) {
            // 添加新页面
            pdf.addPage()
            yPosition = 20
            rowCount = 0
            
            // 在新页面重新添加表头
            pdf.setFontSize(9)
            headers.forEach((header, index) => {
              const xPosition = 14 + (index * 15)
              if (xPosition < 190) {
                pdf.text(header, xPosition, yPosition)
              }
            })
            yPosition += 5
          }
          
          // 添加数据行
          row.forEach((cell, cellIndex) => {
            const xPosition = 14 + (cellIndex * 15)
            if (xPosition < 190) {
              pdf.text(cell.toString(), xPosition, yPosition)
            }
          })
          
          yPosition += 5
          rowCount++
          
          // 如果接近页面底部，添加新页面
          if (yPosition > 270) {
            pdf.addPage()
            yPosition = 20
            rowCount = 0
            
            // 在新页面重新添加表头
            pdf.setFontSize(9)
            headers.forEach((header, index) => {
              const xPosition = 14 + (index * 15)
              if (xPosition < 190) {
                pdf.text(header, xPosition, yPosition)
              }
            })
            yPosition += 5
          }
        })
        
        // 生成文件名（包含日期）
        const dateStrForFile = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`
        const fileName = `Abnormal_Expense_Report_${dateStrForFile}.pdf`
        
        // 保存PDF
        pdf.save(fileName)
        
        ElMessage.success('PDF报告导出成功')
      } catch (error) {
        console.error('导出PDF失败:', error)
        ElMessage.error('导出PDF失败，请重试')
      } finally {
        loading.value = false
      }
    })
  })
}

// 切换规则状态
const toggleRule = (rule) => {
  ElMessage.success(`规则"${rule.name}"已${rule.enabled ? '启用' : '禁用'}`)
}

// 编辑规则
const editRule = (rule) => {
  isEditRule.value = true
  Object.assign(ruleForm, rule)
  showAddRuleDialog.value = true
}

// 删除规则
const deleteRule = async (rule) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除规则"${rule.name}"吗？`,
      '删除规则',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    loading.value = true
    
    try {
      // 调用删除规则API
      const response = await fetch(`/api/abnormal-expenses/rules/${rule.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      const result = await response.json()
      
      if (result.success) {
        // 从本地列表中移除规则
        const index = detectionRules.value.findIndex(r => r.id === rule.id)
        if (index !== -1) {
          detectionRules.value.splice(index, 1)
        }
        ElMessage.success('删除成功')
      } else {
        ElMessage.error(result.message || '删除失败')
      }
    } catch (error) {
      console.error('删除规则失败:', error)
      ElMessage.error('删除规则失败，请重试')
    } finally {
      loading.value = false
    }
  } catch {
    ElMessage.info('已取消操作')
  }
}

// 保存规则
const saveRule = async () => {
  try {
    const valid = await ruleFormRef.value.validate()
    if (!valid) return
    
    loading.value = true
    
    try {
      let response
      const ruleData = {
        name: ruleForm.name,
        type: ruleForm.type,
        description: ruleForm.description,
        threshold: ruleForm.threshold,
        severity: ruleForm.severity,
        enabled: ruleForm.enabled
      }
      
      if (isEditRule.value) {
        // 编辑规则
        response = await fetch(`/api/abnormal-expenses/rules/${ruleForm.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(ruleData)
        })
      } else {
        // 添加规则
        response = await fetch('/api/abnormal-expenses/rules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(ruleData)
        })
      }
      
      const result = await response.json()
      
      if (result.success) {
        if (isEditRule.value) {
          // 更新本地规则列表
          const index = detectionRules.value.findIndex(r => r.id === ruleForm.id)
          if (index !== -1) {
            detectionRules.value[index] = { ...ruleForm }
          }
          ElMessage.success('更新成功')
        } else {
          // 添加到本地规则列表
          const newRule = {
            ...ruleForm,
            id: result.data.id // 使用后端返回的ID
          }
          detectionRules.value.push(newRule)
          ElMessage.success('添加成功')
        }
        
        showAddRuleDialog.value = false
        resetRuleForm()
      } else {
        ElMessage.error(result.message || '操作失败')
      }
    } catch (error) {
      console.error('保存规则失败:', error)
      ElMessage.error('保存规则失败，请重试')
    } finally {
      loading.value = false
    }
  } catch (error) {
    console.log('表单验证失败:', error)
  }
}

// 查看异常费用详情
const viewAbnormalExpense = (abnormalExpense) => {
  currentAbnormalExpense.value = { ...abnormalExpense }
  showAbnormalDetailDialog.value = true
}

// 确认异常
const confirmAbnormal = async (abnormalExpense) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入处理备注', '确认异常', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputType: 'textarea',
      inputPlaceholder: '请输入处理备注'
    })
    
    loading.value = true
    
    try {
      // 调用确认异常API
      const response = await fetch(`/api/abnormal-expenses/${abnormalExpense.id}/confirm`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: 'confirmed',
          note: value || '已确认异常'
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // 更新本地数据
        const index = abnormalExpenses.value.findIndex(a => a.id === abnormalExpense.id)
        if (index !== -1) {
          abnormalExpenses.value[index].status = 'confirmed'
          abnormalExpenses.value[index].handleRemark = value || '已确认异常'
        }
        
        // 如果是从详情对话框操作的，也更新当前显示的数据
        if (currentAbnormalExpense.value && currentAbnormalExpense.value.id === abnormalExpense.id) {
          currentAbnormalExpense.value.status = 'confirmed'
          currentAbnormalExpense.value.handleRemark = value || '已确认异常'
        }
        
        ElMessage.success('已确认异常')
        showAbnormalDetailDialog.value = false
      } else {
        ElMessage.error(result.message || '操作失败')
      }
    } catch (error) {
      console.error('确认异常失败:', error)
      ElMessage.error('确认异常失败，请重试')
    } finally {
      loading.value = false
    }
  } catch {
    ElMessage.info('已取消操作')
  }
}

// 忽略异常
const ignoreAbnormal = async (abnormalExpense) => {
  try {
    const { value } = await ElMessageBox.prompt('请输入忽略原因', '忽略异常', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputType: 'textarea',
      inputPlaceholder: '请输入忽略原因'
    })
    
    loading.value = true
    
    try {
      // 调用忽略异常API
      const response = await fetch(`/api/abnormal-expenses/${abnormalExpense.id}/ignore`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: 'ignored',
          note: value || '已忽略异常'
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        // 更新本地数据
        const index = abnormalExpenses.value.findIndex(a => a.id === abnormalExpense.id)
        if (index !== -1) {
          abnormalExpenses.value[index].status = 'ignored'
          abnormalExpenses.value[index].handleRemark = value || '已忽略异常'
        }
        
        // 如果是从详情对话框操作的，也更新当前显示的数据
        if (currentAbnormalExpense.value && currentAbnormalExpense.value.id === abnormalExpense.id) {
          currentAbnormalExpense.value.status = 'ignored'
          currentAbnormalExpense.value.handleRemark = value || '已忽略异常'
        }
        
        ElMessage.success('已忽略异常')
        showAbnormalDetailDialog.value = false
      } else {
        ElMessage.error(result.message || '操作失败')
      }
    } catch (error) {
      console.error('忽略异常失败:', error)
      ElMessage.error('忽略异常失败，请重试')
    } finally {
      loading.value = false
    }
  } catch {
    ElMessage.info('已取消操作')
  }
}

// 重置规则表单
const resetRuleForm = () => {
  ruleForm.id = null
  ruleForm.name = ''
  ruleForm.type = 'amount_threshold'
  ruleForm.description = ''
  ruleForm.threshold = 0
  ruleForm.severity = 'medium'
  ruleForm.enabled = true
  isEditRule.value = false
}

// 处理分页大小变化
const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
  // 重新加载数据
  filterAbnormalExpenses()
}

// 处理当前页变化
const handleCurrentChange = (page) => {
  currentPage.value = page
  // 重新加载数据
  filterAbnormalExpenses()
}

// 获取异常费用数据
const fetchAbnormalExpenses = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: currentPage.value,
      limit: pageSize.value
    })
    
    if (filterStatus.value) {
      params.append('status', filterStatus.value)
    }
    
    if (filterSeverity.value) {
      params.append('severity', filterSeverity.value)
    }
    
    const response = await fetch(`/api/abnormal-expenses?${params}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    const result = await response.json()
    
    if (result.success) {
      abnormalExpenses.value = result.data.items.map(item => ({
        id: item.id,
        expenseId: item.expense_id,
        category: item.type_name.toLowerCase(),
        amount: item.amount,
        payer: item.paid_by_name,
        dorm: item.dorm || '未知', // 使用API返回的数据
        date: new Date(item.expense_date).toLocaleDateString(),
        severity: item.rule_type === 'amount_threshold' ? 'high' : 'medium', // 根据规则类型设置严重程度
        status: item.status,
        detectTime: new Date(item.created_at).toLocaleString(),
        ruleName: item.rule_name,
        reason: item.reason,
        handleRemark: item.note || ''
      }))
      totalAbnormalExpenses.value = result.data.pagination.totalItems
    } else {
      ElMessage.error(result.message || '获取异常费用数据失败')
    }
  } catch (error) {
    console.error('获取异常费用数据失败:', error)
    ElMessage.error('获取异常费用数据失败')
  } finally {
    loading.value = false
  }
}

// 获取统计数据
const fetchStatistics = async () => {
  try {
    const response = await fetch('/api/abnormal-expenses/stats', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
    
    const result = await response.json()
    
    if (result.success) {
      // 更新统计数据
      // 这里可以根据实际返回的数据结构更新统计图表
      console.log('统计数据:', result.data)
    } else {
      ElMessage.error(result.message || '获取统计数据失败')
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
  }
}

// 筛选异常费用
const filterAbnormalExpenses = () => {
  currentPage.value = 1
  fetchAbnormalExpenses()
}

// 组件挂载时加载数据
onMounted(() => {
  fetchAbnormalExpenses()
  fetchStatistics()
})
</script>

<style scoped>
.abnormal-expense {
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%);
}

.page-header {
  background: linear-gradient(135deg, #409eff 0%, #3a8ee6 100%);
  border-bottom: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.header-content h1 {
  margin: 0 0 5px 0;
  color: #ffffff;
  font-weight: 600;
  font-size: 24px;
}

.header-content p {
  margin: 0;
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.header-actions .el-button {
  border-radius: 20px;
  padding: 8px 20px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.header-actions .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.abnormal-content {
  padding: 25px;
  overflow-y: auto;
  height: calc(100vh - 80px);
}

.rules-card {
  margin-bottom: 25px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: none;
  overflow: hidden;
  transition: all 0.3s ease;
}

.rules-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ebeef5;
}

.card-header h3 {
  margin: 0;
  color: #303133;
  font-weight: 600;
  font-size: 18px;
  position: relative;
  padding-left: 12px;
}

.card-header h3::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 18px;
  background-color: #409eff;
  border-radius: 2px;
}

.abnormal-list-card {
  margin-bottom: 25px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: none;
  overflow: hidden;
  transition: all 0.3s ease;
}

.abnormal-list-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ebeef5;
}

.list-header h3 {
  margin: 0;
  color: #303133;
  font-weight: 600;
  font-size: 18px;
  position: relative;
  padding-left: 12px;
}

.list-header h3::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 18px;
  background-color: #409eff;
  border-radius: 2px;
}

.list-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.list-actions .el-select {
  border-radius: 20px;
}

.list-actions .el-button {
  border-radius: 20px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.list-actions .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

/* 表格样式美化 */
:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

:deep(.el-table th) {
  background-color: #f5f7fa;
  color: #606266;
  font-weight: 600;
}

:deep(.el-table tr) {
  transition: all 0.2s ease;
}

:deep(.el-table tr:hover > td) {
  background-color: #f0f9ff !important;
}

:deep(.el-table td) {
  padding: 12px 0;
}

:deep(.el-tag) {
  border-radius: 12px;
  font-weight: 500;
  padding: 0 10px;
  height: 24px;
  line-height: 22px;
}

:deep(.el-button--small) {
  border-radius: 16px;
  font-weight: 500;
  padding: 6px 15px;
  transition: all 0.3s ease;
}

:deep(.el-button--small:hover) {
  transform: translateY(-2px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.12);
}

:deep(.el-button--danger) {
  background: linear-gradient(135deg, #f56c6c 0%, #f78989 100%);
  border: none;
}

:deep(.el-button--primary) {
  background: linear-gradient(135deg, #409eff 0%, #66b1ff 100%);
  border: none;
}

.pagination-container {
  margin-top: 25px;
  display: flex;
  justify-content: center;
  padding: 15px 0;
}

:deep(.el-pagination) {
  border-radius: 20px;
  padding: 10px 20px;
  background-color: rgba(255, 255, 255, 0.8);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
}

.chart-row {
  margin-bottom: 25px;
}

.chart-card {
  height: 380px;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  border: none;
  overflow: hidden;
  transition: all 0.3s ease;
}

.chart-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ebeef5;
}

.chart-header h3 {
  margin: 0;
  color: #303133;
  font-weight: 600;
  font-size: 18px;
  position: relative;
  padding-left: 12px;
}

.chart-header h3::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 18px;
  background-color: #409eff;
  border-radius: 2px;
}

.chart-container {
  height: calc(100% - 60px);
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #f9f9f9;
  border-radius: 8px;
  overflow: hidden;
}

.chart-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.chart-placeholder img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
  transition: all 0.3s ease;
}

.chart-placeholder img:hover {
  transform: scale(1.02);
}

/* 对话框美化 */
:deep(.el-dialog) {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
}

:deep(.el-dialog__header) {
  background: linear-gradient(135deg, #409eff 0%, #3a8ee6 100%);
  padding: 20px 25px;
  color: #ffffff;
}

:deep(.el-dialog__title) {
  color: #ffffff;
  font-weight: 600;
  font-size: 18px;
}

:deep(.el-dialog__headerbtn .el-dialog__close) {
  color: #ffffff;
  font-size: 18px;
}

:deep(.el-dialog__body) {
  padding: 25px;
}

:deep(.el-form-item__label) {
  font-weight: 600;
  color: #606266;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
  transition: all 0.3s ease;
}

:deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

:deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.5);
}

:deep(.el-select .el-input__wrapper) {
  border-radius: 8px;
}

:deep(.el-switch) {
  --el-switch-on-color: #409eff;
}

:deep(.el-switch__core) {
  border-radius: 10px;
}

.abnormal-detail {
  padding: 15px 0;
}

:deep(.el-descriptions) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.el-descriptions__header) {
  background-color: #f5f7fa;
  margin-bottom: 0;
}

:deep(.el-descriptions__body) {
  background-color: #ffffff;
}

:deep(.el-descriptions__table .el-descriptions__cell.is-bordered-label) {
  background-color: #f5f7fa;
  font-weight: 600;
  color: #606266;
}

.abnormal-actions {
  margin-top: 25px;
  display: flex;
  gap: 15px;
  justify-content: center;
}

.abnormal-actions .el-button {
  border-radius: 20px;
  font-weight: 500;
  padding: 10px 25px;
  transition: all 0.3s ease;
}

.abnormal-actions .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

/* 加载状态美化 */
:deep(.el-loading-mask) {
  background-color: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(3px);
}

:deep(.el-loading-spinner) {
  margin-top: -30px;
}

/* 消息提示美化 */
:deep(.el-message) {
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .chart-row .el-col {
    margin-bottom: 20px;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    padding: 20px;
    text-align: center;
  }
  
  .header-actions {
    margin-top: 15px;
  }
  
  .list-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .list-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .abnormal-content {
    padding: 15px;
  }
}
</style>