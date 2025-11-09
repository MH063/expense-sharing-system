<template>
  <el-dialog
    v-model="visible"
    title="分摊确认"
    width="600px"
    :before-close="handleClose"
    class="split-confirm-dialog"
  >
    <div class="split-confirm-content">
      <div class="summary-section">
        <div class="summary-item">
          <span class="label">总金额：</span>
          <span class="value amount-text">¥{{ totalAmount.toFixed(2) }}</span>
        </div>
        <div class="summary-item">
          <span class="label">分摊方式：</span>
          <span class="value">{{ getSplitTypeText(splitType) }}</span>
        </div>
        <div class="summary-item">
          <span class="label">参与人数：</span>
          <span class="value">{{ splitMembers.length }}人</span>
        </div>
      </div>

      <div class="members-section">
        <h4>分摊明细</h4>
        <el-table :data="splitMembers" size="small" max-height="300">
          <el-table-column prop="userName" label="成员" width="120" />
          <el-table-column label="分摊金额" min-width="120">
            <template #default="{ row }">
              <span class="amount-text">¥{{ row.amount.toFixed(2) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="比例" width="80">
            <template #default="{ row }">
              {{ row.percentage }}%
            </template>
          </el-table-column>
          <el-table-column label="状态" width="80">
            <template #default="{ row }">
              <el-tag v-if="row.amount > 0" type="success" size="small">需支付</el-tag>
              <el-tag v-else type="info" size="small">无费用</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="calculation-section" v-if="showCalculation">
        <h4>计算说明</h4>
        <div class="calculation-details">
          <div v-if="splitType === 'equal'">
            <p>平均分摊：¥{{ totalAmount.toFixed(2) }} ÷ {{ splitMembers.length }}人 = ¥{{ (totalAmount / splitMembers.length).toFixed(2) }}/人</p>
            <p v-if="hasRoundingAdjustment">由于舍入规则，部分成员金额已微调以确保总额正确</p>
          </div>
          <div v-else-if="splitType === 'percentage'">
            <p>按比例分摊：</p>
            <ul>
              <li v-for="member in splitMembers" :key="member.userId">
                {{ member.userName }}: ¥{{ totalAmount.toFixed(2) }} × {{ member.percentage }}% = ¥{{ member.amount.toFixed(2) }}
              </li>
            </ul>
          </div>
          <div v-else-if="splitType === 'custom'">
            <p>自定义分摊：</p>
            <ul>
              <li v-for="member in splitMembers" :key="member.userId">
                {{ member.userName }}: ¥{{ member.amount.toFixed(2) }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleConfirm">确认分摊</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  splitType: {
    type: String,
    default: 'equal'
  },
  splitMembers: {
    type: Array,
    default: () => []
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  showCalculation: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'confirm'])

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const hasRoundingAdjustment = computed(() => {
  if (props.splitType !== 'equal' || props.splitMembers.length === 0) return false
  
  const expectedAmount = props.totalAmount / props.splitMembers.length
  const roundedAmount = Math.round(expectedAmount * 100) / 100
  const totalRounded = roundedAmount * props.splitMembers.length
  
  return Math.abs(totalRounded - props.totalAmount) > 0.01
})

const getSplitTypeText = (type) => {
  const typeMap = {
    equal: '平均分摊',
    custom: '自定义金额',
    percentage: '按比例分摊'
  }
  return typeMap[type] || '未知'
}

const handleClose = () => {
  visible.value = false
}

const handleConfirm = () => {
  emit('confirm', {
    splitType: props.splitType,
    splitMembers: props.splitMembers,
    totalAmount: props.totalAmount
  })
  visible.value = false
}
</script>

<style scoped>
.split-confirm-dialog {
  --el-dialog-padding-primary: 20px;
}

.split-confirm-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.summary-section {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  padding: 12px;
  background-color: var(--el-fill-color-lighter);
  border-radius: 6px;
}

.summary-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-item .label {
  font-weight: 500;
  color: var(--el-text-color-regular);
}

.summary-item .value {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.members-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.members-section h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.calculation-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  background-color: var(--el-fill-color-light);
  border-radius: 6px;
}

.calculation-section h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.calculation-details {
  font-size: 14px;
  color: var(--el-text-color-regular);
}

.calculation-details p {
  margin: 0 0 8px 0;
}

.calculation-details ul {
  margin: 0;
  padding-left: 20px;
}

.calculation-details li {
  margin-bottom: 4px;
}

.amount-text {
  font-weight: 600;
  color: var(--el-color-primary);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>