<template>
  <div class="split-selector">
    <!-- 历史分摊模式选择 -->
    <SplitHistorySelector
      v-if="showHistorySelector"
      @select-pattern="applyHistoryPattern"
      @create-new="hideHistorySelector"
    />
    
    <div class="split-header">
      <div class="header-left">
        <h3>分摊设置</h3>
        <el-button
          type="text"
          size="small"
          @click="showHistorySelector = true"
          v-if="!showHistorySelector"
        >
          <el-icon><Clock /></el-icon>
          历史模式
        </el-button>
      </div>
      <div class="header-right">
        <div class="total-amount">
          总金额: <span class="amount-value">¥{{ totalAmount.toFixed(2) }}</span>
        </div>
        <el-dropdown trigger="click" @command="handlePreferencesCommand">
          <el-button type="text" size="small">
            <el-icon><Setting /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="preferences">偏好设置</el-dropdown-item>
              <el-dropdown-item command="save-pattern">保存当前模式</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <!-- 分摊方式选择 -->
    <div class="split-type-selector">
      <el-radio-group v-model="splitType" @change="handleSplitTypeChange">
        <el-radio-button label="equal">平均分摊</el-radio-button>
        <el-radio-button label="stay_days">按在寝天数</el-radio-button>
        <el-radio-button label="custom">自定义金额</el-radio-button>
        <el-radio-button label="percentage">按比例分摊</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 快捷操作按钮 -->
    <div class="quick-actions">
      <el-button size="small" @click="selectAllMembers">全选</el-button>
      <el-button size="small" @click="deselectAllMembers">取消全选</el-button>
      <el-button v-if="splitType === 'custom'" size="small" @click="distributeEqually">平均分配</el-button>
      <el-button v-if="splitType === 'percentage'" size="small" @click="distributePercentageEqually">平均分配比例</el-button>
    </div>

    <!-- 成员选择区域 -->
    <div class="members-container">
      <div class="members-grid">
        <div
          v-for="member in members"
          :key="member.id"
          class="member-card"
          :class="{
            'selected': member.selected,
            'disabled': !member.selected && (splitType === 'custom' || splitType === 'percentage')
          }"
          @click="toggleMemberSelection(member)"
        >
          <div class="member-avatar">
            <el-avatar :src="member.avatar" :size="50">
              {{ member.name.charAt(0) }}
            </el-avatar>
            <div v-if="member.selected" class="selected-indicator">
              <el-icon><Check /></el-icon>
            </div>
          </div>
          
          <div class="member-info">
            <div class="member-name">{{ member.name }}</div>
            <div class="member-role" v-if="member.role">{{ member.role }}</div>
          </div>
          
          <!-- 在寝天数输入 -->
          <div v-if="splitType === 'stay_days' && member.selected" class="stay-days-input">
            <el-input-number
              v-model="member.stayDays"
              :min="0"
              :max="maxStayDays"
              size="small"
              placeholder="天数"
              @change="handleStayDaysChange"
            />
          </div>
          
          <!-- 自定义金额输入 -->
          <div v-if="splitType === 'custom' && member.selected" class="custom-amount-input">
            <el-input-number
              v-model="member.customAmount"
              :precision="2"
              :step="0.01"
              :min="0"
              size="small"
              placeholder="金额"
              @change="handleCustomAmountChange"
            />
          </div>
          
          <!-- 比例输入 -->
          <div v-if="splitType === 'percentage' && member.selected" class="percentage-input">
            <el-input-number
              v-model="member.percentage"
              :precision="1"
              :step="0.1"
              :min="0"
              :max="100"
              size="small"
              placeholder="%"
              @change="handlePercentageChange"
            />
          </div>
          
          <!-- 显示分摊金额 -->
          <div v-if="member.selected && splitType === 'equal'" class="split-amount">
            ¥{{ perPersonAmount.toFixed(2) }}
          </div>
          
          <div v-if="member.selected && splitType === 'stay_days'" class="split-amount">
            ¥{{ calculateAmountByStayDays(member).toFixed(2) }}
          </div>
          
          <div v-if="member.selected && splitType === 'custom'" class="split-amount">
            ¥{{ (member.customAmount || 0).toFixed(2) }}
          </div>
          
          <div v-if="member.selected && splitType === 'percentage'" class="split-amount">
            ¥{{ calculateAmountByPercentage(member.percentage).toFixed(2) }}
          </div>
        </div>
      </div>
    </div>

    <!-- 分摊汇总 -->
    <div class="split-summary">
      <div class="summary-card">
        <div class="summary-title">分摊汇总</div>
        <div class="summary-content">
          <div class="summary-item">
            <span class="label">已选成员:</span>
            <span class="value">{{ selectedMembers.length }} 人</span>
          </div>
          
          <div v-if="splitType === 'equal'" class="summary-item">
            <span class="label">每人应付:</span>
            <span class="value amount">¥{{ perPersonAmount.toFixed(2) }}</span>
          </div>
          
          <div v-if="splitType === 'stay_days'" class="summary-item">
            <span class="label">总在寝天数:</span>
            <span class="value">{{ totalStayDays }} 天</span>
          </div>
          
          <div v-if="splitType === 'stay_days'" class="summary-item">
            <span class="label">已分摊金额:</span>
            <span class="value" :class="{ 'error': totalStayDaysAmount !== totalAmount }">
              ¥{{ totalStayDaysAmount.toFixed(2) }}
            </span>
            <span v-if="totalStayDaysAmount !== totalAmount" class="error-text">
              (差额: ¥{{ Math.abs(totalStayDaysAmount - totalAmount).toFixed(2) }})
            </span>
          </div>
          
          <div v-if="splitType === 'custom'" class="summary-item">
            <span class="label">已分摊金额:</span>
            <span class="value" :class="{ 'error': totalCustomAmount !== totalAmount }">
              ¥{{ totalCustomAmount.toFixed(2) }}
            </span>
            <span v-if="totalCustomAmount !== totalAmount" class="error-text">
              (差额: ¥{{ Math.abs(totalCustomAmount - totalAmount).toFixed(2) }})
            </span>
          </div>
          
          <div v-if="splitType === 'percentage'" class="summary-item">
            <span class="label">已分配比例:</span>
            <span class="value" :class="{ 'error': totalPercentage !== 100 }">
              {{ totalPercentage.toFixed(1) }}%
            </span>
            <span v-if="totalPercentage !== 100" class="error-text">
              (剩余: {{ (100 - totalPercentage).toFixed(1) }}%)
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 确认按钮 -->
    <div class="split-actions">
      <el-button 
        type="primary" 
        :disabled="!isValid"
        @click="showConfirmSplit"
      >
        确认分摊
      </el-button>
    </div>

    <!-- 分摊预览 -->
    <div v-if="selectedMembers.length > 0 && showPreview" class="split-preview">
      <el-collapse v-model="activePreview">
        <el-collapse-item title="分摊详情预览" name="preview">
          <div class="preview-table">
            <el-table :data="previewData" size="small">
              <el-table-column prop="name" label="成员" width="120" />
        <el-table-column label="分摊金额" prop="amount" min-width="120">
          <template #default="{ row }">
            <span class="amount-display">¥{{ getMemberActualAmount(row).toFixed(2) }}</span>
          </template>
        </el-table-column>
              <el-table-column v-if="splitType === 'percentage'" prop="percentage" label="比例" width="80">
                <template #default="scope">
                  {{ scope.row.percentage }}%
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态">
                <template #default="scope">
                  <el-tag :type="scope.row.status === 'valid' ? 'success' : 'danger'" size="small">
                    {{ scope.row.status === 'valid' ? '有效' : '无效' }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-collapse-item>
      </el-collapse>
    </div>

    <!-- 智能建议 -->
    <div v-if="showSuggestions" class="suggestions">
      <el-alert
        v-for="(suggestion, index) in suggestions"
        :key="index"
        :title="suggestion.title"
        :type="suggestion.type"
        :description="suggestion.description"
        show-icon
        :closable="false"
        class="suggestion-item"
      />
    </div>
    
    <!-- 偏好设置对话框 -->
    <el-dialog
      v-model="preferencesDialogVisible"
      title="分摊偏好设置"
      width="600px"
      :before-close="handleClosePreferences"
    >
      <SplitPreferences @saved="handlePreferencesSaved" />
    </el-dialog>

    <!-- 分摊确认对话框 -->
    <SplitConfirmDialog
      v-model="showConfirmDialog"
      :split-type="splitType"
      :split-members="previewData"
      :total-amount="totalAmount"
      :show-calculation="showCalculationDetails"
      @confirm="handleConfirmSplit"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Check, Clock, Setting } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useSplitPreferencesStore } from '../stores/splitPreferences'
import { useUserStore } from '@/stores/user'
import { useStayDaysStore } from '../stores/stayDays'
import { SplitCalculator } from '../utils/splitCalculator'
import SplitHistorySelector from './SplitHistorySelector.vue'
import SplitPreferences from './SplitPreferences.vue'
import SplitConfirmDialog from './SplitConfirmDialog.vue'

// Props
const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  members: {
    type: Array,
    default: () => []
  },
  initialSplitType: {
    type: String,
    default: 'equal'
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'change', 'validate', 'confirm'])

// 状态管理
const splitPreferencesStore = useSplitPreferencesStore()
const userStore = useUserStore()
const stayDaysStore = useStayDaysStore()

// 响应式数据
const splitType = ref(props.initialSplitType)
const activePreview = ref([])
const showHistorySelector = ref(false)
const preferencesDialogVisible = ref(false)
const showPreview = ref(true)

// 在寝天数相关数据
const maxStayDays = ref(31) // 默认最大在寝天数为31天
const expenseType = ref('custom') // 默认费用类型为自定义
const customSettings = ref({}) // 自定义设置

// 分摊确认对话框状态
const showConfirmDialog = ref(false)
const showCalculationDetails = ref(false)

// 计算属性
const selectedMembers = computed(() => {
  return props.members.filter(member => member.selected)
})

const perPersonAmount = computed(() => {
  if (props.totalAmount && selectedMembers.value.length > 0) {
    // 根据舍入规则计算
    const amount = props.totalAmount / selectedMembers.value.length
    return applyRoundingRule(amount)
  }
  return 0
})

// 计算每个成员的实际分摊金额（包括调整）
const getMemberActualAmount = (member) => {
  if (splitType.value === 'equal') {
    const baseAmount = perPersonAmount.value
    const adjustment = member.amountAdjustment || 0
    return applyRoundingRule(baseAmount + adjustment)
  } else if (splitType.value === 'custom') {
    return member.customAmount || 0
  } else if (splitType.value === 'percentage') {
    return calculateAmountByPercentage(member)
  } else if (splitType.value === 'stay_days') {
    return calculateAmountByStayDays(member)
  }
  return 0
}

const totalCustomAmount = computed(() => {
  return selectedMembers.value.reduce((total, member) => {
    return total + (member.customAmount || 0)
  }, 0)
})

const totalPercentage = computed(() => {
  return selectedMembers.value.reduce((total, member) => {
    return total + (member.percentage || 0)
  }, 0)
})

// 总在寝天数
const totalStayDays = computed(() => {
  return selectedMembers.value.reduce((total, member) => {
    return total + (member.stayDays || 0)
  }, 0)
})

// 基于在寝天数的总分摊金额
const totalStayDaysAmount = computed(() => {
  return selectedMembers.value.reduce((total, member) => {
    return total + calculateAmountByStayDays(member)
  }, 0)
})

const previewData = computed(() => {
  return selectedMembers.value.map(member => {
    let amount = 0
    let percentage = 0
    let stayDays = 0
    let status = 'valid'
    
    if (splitType.value === 'equal') {
      amount = perPersonAmount.value
    } else if (splitType.value === 'custom') {
      amount = member.customAmount || 0
    } else if (splitType.value === 'percentage') {
      percentage = member.percentage || 0
      amount = calculateAmountByPercentage(percentage)
    } else if (splitType.value === 'stay_days') {
      stayDays = member.stayDays || 0
      amount = calculateAmountByStayDays(member)
    }
    
    // 验证状态
    if (splitType.value === 'custom' && amount <= 0) {
      status = 'invalid'
    } else if (splitType.value === 'percentage' && (percentage <= 0 || percentage > 100)) {
      status = 'invalid'
    } else if (splitType.value === 'stay_days' && stayDays <= 0) {
      status = 'invalid'
    }
    
    return {
      id: member.id,
      name: member.name,
      avatar: member.avatar,
      amount,
      percentage,
      stayDays,
      status,
      isCustom: splitType.value === 'custom' && member.customAmount > 0,
      isPercentage: splitType.value === 'percentage' && member.percentage > 0,
      isStayDays: splitType.value === 'stay_days' && member.stayDays > 0,
      isSelected: member.selected
    }
  })
})

const showSuggestions = computed(() => {
  return suggestions.value.length > 0
})

const suggestions = computed(() => {
  const result = []
  
  if (selectedMembers.value.length === 0) {
    result.push({
      type: 'warning',
      title: '请选择分摊成员',
      description: '至少需要选择一个成员进行分摊'
    })
  }
  
  if (splitType.value === 'custom' && Math.abs(totalCustomAmount.value - props.totalAmount) > 0.01) {
    result.push({
      type: 'error',
      title: '分摊金额不匹配',
      description: `已分摊金额(¥${totalCustomAmount.value.toFixed(2)})与总金额(¥${props.totalAmount.toFixed(2)})不一致`
    })
  }
  
  if (splitType.value === 'percentage' && Math.abs(totalPercentage.value - 100) > 0.1) {
    result.push({
      type: 'error',
      title: '分摊比例不匹配',
      description: `已分配比例(${totalPercentage.value.toFixed(1)}%)不等于100%`
    })
  }
  
  if (splitType.value === 'stay_days' && totalStayDays.value === 0) {
    result.push({
      type: 'error',
      title: '在寝天数无效',
      description: '至少需要有一个成员的在寝天数大于0'
    })
  }
  
  return result
})

// 方法
/**
 * 应用舍入规则
 * @param {number} amount - 金额
 * @returns {number} 舍入后的金额
 */
const applyRoundingRule = (amount) => {
  const roundingRule = splitPreferencesStore.userPreferences.roundingRule || 'round'
  
  switch (roundingRule) {
    case 'ceil':
      return Math.ceil(amount * 100) / 100
    case 'floor':
      return Math.floor(amount * 100) / 100
    case 'round':
    default:
      return Math.round(amount * 100) / 100
  }
}

/**
 * 智能分配差额
 * @param {Array} members - 成员列表
 * @param {number} totalAmount - 总金额
 * @param {string} splitType - 分摊类型
 */
const distributeRemainder = (members, totalAmount, splitType) => {
  if (splitType !== 'equal' || members.length === 0) return
  
  // 计算每个人的基础金额
  const baseAmount = totalAmount / members.length
  const roundedBaseAmount = applyRoundingRule(baseAmount)
  
  // 计算总差额
  const totalRounded = roundedBaseAmount * members.length
  const remainder = totalAmount - totalRounded
  
  // 如果没有差额，直接返回
  if (Math.abs(remainder) < 0.01) return
  
  // 将差额分配给前几个成员
  const remainderInCents = Math.round(remainder * 100)
  const membersToAdjust = Math.abs(remainderInCents)
  const adjustment = remainderInCents > 0 ? 0.01 : -0.01
  
  // 按余额从大到小排序，优先调整余额较大的成员
  const sortedMembers = [...members].sort((a, b) => {
    const balanceA = (a.balance || 0) - (a.totalPaid || 0)
    const balanceB = (b.balance || 0) - (b.totalPaid || 0)
    return balanceB - balanceA
  })
  
  // 调整前几个成员的金额
  for (let i = 0; i < Math.min(membersToAdjust, sortedMembers.length); i++) {
    const member = sortedMembers[i]
    const memberIndex = members.findIndex(m => m.id === member.id)
    if (memberIndex !== -1) {
      if (splitType === 'equal') {
        // 平均分摊模式下，调整实际分摊金额
        // 这里我们通过添加一个临时属性来记录调整
        members[memberIndex].amountAdjustment = (members[memberIndex].amountAdjustment || 0) + adjustment
      }
    }
  }
}

/**
 * 应用历史分摊模式
 * @param {Object} pattern - 历史分摊模式
 */
const applyHistoryPattern = (pattern) => {
  if (!pattern || !pattern.splitType) {
    ElMessage.error('无效的分摊模式')
    return
  }
  
  // 设置分摊类型
  splitType.value = pattern.splitType
  
  // 重置所有成员选择状态
  props.members.forEach(member => {
    member.selected = false
    member.customAmount = 0
    member.percentage = 0
    member.stayDays = 0
  })
  
  // 根据历史模式设置成员选择和金额
  if (pattern.selectedMemberIds && Array.isArray(pattern.selectedMemberIds)) {
    props.members.forEach(member => {
      if (pattern.selectedMemberIds.includes(member.id)) {
        member.selected = true
        
        // 根据分摊类型设置金额或比例
        if (pattern.splitType === 'custom' && pattern.memberAmounts) {
          member.customAmount = pattern.memberAmounts[member.id] || 0
        } else if (pattern.splitType === 'percentage' && pattern.memberPercentages) {
          member.percentage = pattern.memberPercentages[member.id] || 0
        } else if (pattern.splitType === 'stay_days' && pattern.memberStayDays) {
          member.stayDays = pattern.memberStayDays[member.id] || 0
        }
      }
    })
  }
  
  // 隐藏历史选择器
  hideHistorySelector()
  
  // 触发变化事件
  emitChange()
  
  ElMessage.success('已应用历史分摊模式')
}

/**
 * 隐藏历史分摊模式选择器
 */
const hideHistorySelector = () => {
  showHistorySelector.value = false
}

/**
 * 处理偏好设置命令
 * @param {string} command - 命令
 */
const handlePreferencesCommand = (command) => {
  if (command === 'preferences') {
    preferencesDialogVisible.value = true
  } else if (command === 'save-pattern') {
    saveCurrentPattern()
  }
}

/**
 * 保存当前分摊模式
 */
const saveCurrentPattern = async () => {
  if (!userStore.userInfo?.id) {
    ElMessage.error('用户信息不完整，无法保存模式')
    return
  }
  
  if (selectedMembers.value.length === 0) {
    ElMessage.warning('请先选择分摊成员')
    return
  }
  
  try {
    const patternData = {
      splitType: splitType.value,
      totalAmount: props.totalAmount,
      selectedMemberIds: selectedMembers.value.map(member => member.id),
      memberAmounts: {},
      memberPercentages: {},
      memberStayDays: {},
      description: `${splitType.value === 'equal' ? '平均分摊' : splitType.value === 'custom' ? '自定义金额' : splitType.value === 'percentage' ? '按比例分摊' : '按在寝天数分摊'} - ${selectedMembers.value.length}人`
    }
    
    // 收集成员金额和比例信息
    selectedMembers.value.forEach(member => {
      if (splitType.value === 'custom') {
        patternData.memberAmounts[member.id] = member.customAmount || 0
      } else if (splitType.value === 'percentage') {
        patternData.memberPercentages[member.id] = member.percentage || 0
      } else if (splitType.value === 'stay_days') {
        patternData.memberStayDays[member.id] = member.stayDays || 0
      }
    })
    
    await splitPreferencesStore.saveSplitToHistory(userStore.userInfo.id, patternData)
    
    ElMessage.success('分摊模式已保存到历史记录')
  } catch (error) {
    ElMessage.error('保存失败: ' + error.message)
  }
}

/**
 * 关闭偏好设置对话框
 */
const handleClosePreferences = () => {
  preferencesDialogVisible.value = false
}

/**
 * 处理偏好设置保存
 */
const handlePreferencesSaved = () => {
  preferencesDialogVisible.value = false
  
  // 更新显示预览设置
  showPreview.value = splitPreferencesStore.showPreview
  
  // 如果启用了自动选择所有成员，则自动选择
  if (splitPreferencesStore.autoSelectAll && selectedMembers.value.length === 0) {
    selectAllMembers()
  }
  
  ElMessage.success('偏好设置已保存')
}
/**
 * 切换成员选择状态
 */
const toggleMemberSelection = (member) => {
  // 在自定义、比例和在寝天数分摊模式下，不能直接取消选择
  if (member.selected && (splitType.value === 'custom' || splitType.value === 'percentage' || splitType.value === 'stay_days')) {
    return
  }
  
  member.selected = !member.selected
  
  // 如果是平均分摊，自动计算金额
  if (splitType.value === 'equal') {
    // 不需要额外处理，计算属性会自动计算
  } else if (splitType.value === 'custom') {
    // 初始化自定义金额
    if (member.selected && !member.customAmount) {
      member.customAmount = perPersonAmount.value
    }
  } else if (splitType.value === 'percentage') {
    // 初始化比例
    if (member.selected && !member.percentage) {
      member.percentage = 100 / selectedMembers.value.length
    }
  } else if (splitType.value === 'stay_days') {
    // 初始化在寝天数
    if (member.selected && !member.stayDays) {
      member.stayDays = maxStayDays.value
    }
  }
  
  emitChange()
}

/**
 * 选择所有成员
 */
const selectAllMembers = () => {
  props.members.forEach(member => {
    member.selected = true
    
    if (splitType.value === 'custom' && !member.customAmount) {
      member.customAmount = perPersonAmount.value
    } else if (splitType.value === 'percentage' && !member.percentage) {
      member.percentage = 100 / props.members.length
    } else if (splitType.value === 'stay_days' && !member.stayDays) {
      member.stayDays = maxStayDays.value
    }
  })
  
  emitChange()
}

/**
 * 取消选择所有成员
 */
const deselectAllMembers = () => {
  props.members.forEach(member => {
    member.selected = false
  })
  
  emitChange()
}

/**
 * 平均分配金额
 */
const distributeEqually = () => {
  if (props.totalAmount > 0 && selectedMembers.value.length > 0) {
    selectedMembers.value.forEach(member => {
      member.amountAdjustment = 0 // 重置调整金额
    })
    
    // 应用智能差额分配
    distributeRemainder(selectedMembers.value, props.totalAmount, 'equal')
    
    emitChange()
  }
}

/**
 * 平均分配比例
 */
const distributePercentageEqually = () => {
  if (selectedMembers.value.length > 0) {
    const percentagePerPerson = 100 / selectedMembers.value.length
    selectedMembers.value.forEach(member => {
      member.percentage = percentagePerPerson
    })
    
    emitChange()
  }
}

/**
 * 处理分摊类型变化
 */
const handleSplitTypeChange = (newType) => {
  splitType.value = newType
  
  // 初始化分摊数据
  initializeSplitData()
  
  // 保存分摊类型变化到偏好设置
  splitPreferencesStore.updateLastUsedSettings({
    splitType: newType
  })
  
  emitChange()
}

/**
 * 处理自定义金额变化
 */
const handleCustomAmountChange = () => {
  emitChange()
}

/**
 * 处理比例变化
 */
const handlePercentageChange = () => {
  emitChange()
}

/**
 * 根据比例计算金额
 */
const calculateAmountByPercentage = (percentage) => {
  if (!percentage) return 0
  return applyRoundingRule(props.totalAmount * (percentage / 100))
}

// 基于在寝天数计算金额
const calculateAmountByStayDays = (member) => {
  if (!member.stayDays || totalStayDays.value === 0) return 0
  return (totalAmount.value * member.stayDays) / totalStayDays.value
}

/**
 * 初始化分摊数据
 */
const initializeSplitData = () => {
  selectedMembers.value.forEach(member => {
    if (splitType.value === 'equal') {
      // 平均分摊
      member.amount = perPersonAmount.value
      member.percentage = 100 / selectedMembers.value.length
    } else if (splitType.value === 'custom') {
      // 自定义金额
      if (!member.customAmount) member.customAmount = perPersonAmount.value
    } else if (splitType.value === 'percentage') {
      // 按比例分摊
      if (!member.percentage) member.percentage = 100 / selectedMembers.value.length
    } else if (splitType.value === 'stay_days') {
      // 按在寝天数分摊
      if (!member.stayDays) member.stayDays = maxStayDays.value
    }
  })
}

/**
 * 处理在寝天数变化
 */
const handleStayDaysChange = (member, value) => {
  const memberIndex = selectedMembers.value.findIndex(m => m.id === member.id)
  if (memberIndex !== -1) {
    selectedMembers.value[memberIndex].stayDays = value
  }
  emitChange()
}

/**
 * 触发变化事件
 */
const emitChange = () => {
  const splitData = selectedMembers.value.map(member => {
    const baseData = {
      userId: member.id,
      userName: member.name,
      selected: true
    }
    
    if (splitType.value === 'equal') {
      baseData.amount = getMemberActualAmount(member)
      baseData.percentage = (baseData.amount / props.totalAmount * 100).toFixed(2)
    } else if (splitType.value === 'custom') {
      baseData.amount = member.customAmount || 0
      baseData.percentage = (baseData.amount / props.totalAmount * 100).toFixed(2)
    } else if (splitType.value === 'percentage') {
      baseData.percentage = member.percentage || 0
      baseData.amount = calculateAmountByPercentage(member.percentage)
    }
    
    return baseData
  })
  
  emit('update:modelValue', splitData)
  emit('change', {
    splitType: splitType.value,
    splitMembers: splitData,
    totalAmount: props.totalAmount,
    isValid: isValid.value
  })
  
  // 如果启用了通知，显示计算完成通知
  if (splitPreferencesStore.userPreferences.enableNotifications && isValid.value) {
    // 这里可以添加通知逻辑
  }
}

/**
 * 显示分摊确认对话框
 */
const showConfirmSplit = () => {
  if (!isValid.value) {
    ElMessage.warning('请完善分摊设置后再确认')
    return
  }
  showConfirmDialog.value = true
}

/**
 * 确认分摊
 * @param {Object} splitData - 分摊数据
 */
const handleConfirmSplit = (splitData) => {
  emit('confirm', splitData)
  ElMessage.success('分摊已确认')
}

// 验证
const isValid = computed(() => {
  if (selectedMembers.value.length === 0) {
    return false
  }
  
  if (splitType.value === 'custom') {
    return Math.abs(totalCustomAmount.value - props.totalAmount) <= 0.01
  }
  
  if (splitType.value === 'percentage') {
    return Math.abs(totalPercentage.value - 100) <= 0.1
  }
  
  return true
})

// 监听验证状态变化
watch(isValid, (newVal) => {
  emit('validate', newVal)
})

// 初始化
onMounted(async () => {
  // 加载用户偏好设置
  if (userStore.userInfo?.id) {
    try {
      await splitPreferencesStore.loadUserPreferences(userStore.userInfo.id)
      
      // 应用偏好设置
      const preferences = splitPreferencesStore.userPreferences
      
      // 设置默认分摊类型
      if (preferences.defaultSplitType && !props.initialSplitType) {
        splitType.value = preferences.defaultSplitType
      }
      
      // 设置是否显示预览
      showPreview.value = preferences.showPreview !== false
      
      // 如果启用了自动选择所有成员，则自动选择
      if (preferences.autoSelectAll && selectedMembers.value.length === 0) {
        selectAllMembers()
      }
    } catch (error) {
      console.error('加载用户偏好设置失败:', error)
    }
  }
  
  // 初始化成员数据
  props.members.forEach(member => {
    if (member.selected === undefined) {
      member.selected = false
    }
    if (member.customAmount === undefined) {
      member.customAmount = 0
    }
    if (member.percentage === undefined) {
      member.percentage = 0
    }
    if (member.stayDays === undefined) {
      member.stayDays = maxStayDays.value // 默认设置为最大在寝天数
    }
  })
  
  // 初始化分摊数据
  initializeSplitData()
  emitChange()
})
</script>

<style scoped>
.split-selector {
  width: 100%;
  padding: 20px;
  background-color: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.split-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 15px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 15px;
}

.split-header h3 {
  margin: 0;
  font-size: 18px;
  color: #303133;
}

.total-amount {
  font-size: 16px;
  color: #606266;
}

.amount-value {
  font-weight: bold;
  color: #409eff;
  font-size: 18px;
}

.split-type-selector {
  margin-bottom: 15px;
}

.quick-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.members-container {
  margin-bottom: 20px;
}

.members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 15px;
}

.member-card {
  background-color: #fff;
  border: 2px solid #e4e7ed;
  border-radius: 8px;
  padding: 15px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  text-align: center;
}

.member-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.member-card.selected {
  border-color: #409eff;
  background-color: rgba(64, 158, 255, 0.05);
}

.member-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.member-avatar {
  position: relative;
  margin-bottom: 10px;
  display: inline-block;
}

.selected-indicator {
  position: absolute;
  top: -5px;
  right: -5px;
  background-color: #409eff;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}

.member-info {
  margin-bottom: 10px;
}

.member-name {
  font-weight: bold;
  margin-bottom: 5px;
}

.member-role {
  font-size: 12px;
  color: #909399;
}

.custom-amount-input,
.percentage-input {
  margin: 10px 0;
}

.split-amount {
  font-weight: bold;
  color: #409eff;
  font-size: 16px;
}

.split-summary {
  margin-bottom: 20px;
}

.summary-card {
  background-color: #fff;
  border-radius: 8px;
  padding: 15px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.summary-title {
  font-weight: bold;
  margin-bottom: 10px;
  color: #303133;
}

.summary-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.summary-item:last-child {
  margin-bottom: 0;
}

.label {
  color: #606266;
}

.value {
  font-weight: bold;
}

.value.amount {
  color: #409eff;
}

.value.error {
  color: #f56c6c;
}

.error-text {
  color: #f56c6c;
  font-size: 12px;
  margin-left: 5px;
}

.split-preview {
  margin-bottom: 20px;
}

.preview-table {
  margin-top: 10px;
}

.amount-text {
  font-weight: bold;
  color: #409eff;
}

.suggestions {
  margin-top: 15px;
}

.suggestion-item {
  margin-bottom: 10px;
}

.suggestion-item:last-child {
  margin-bottom: 0;
}

.split-actions {
  display: flex;
  justify-content: center;
  margin: 20px 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .split-selector {
    padding: 15px;
  }
  
  .members-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 10px;
  }
  
  .member-card {
    padding: 10px;
  }
  
  .quick-actions {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .split-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .header-left,
  .header-right {
    width: 100%;
    justify-content: space-between;
  }
}
</style>