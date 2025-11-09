<template>
  <div class="split-history-selector">
    <el-card class="history-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>历史分摊模式</span>
          <el-button
            type="text"
            size="small"
            @click="refreshHistory"
            :loading="loading"
          >
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </template>
      
      <div v-if="loading" class="loading-container">
        <el-skeleton :rows="3" animated />
      </div>
      
      <div v-else-if="splitHistory.length === 0" class="empty-container">
        <el-empty description="暂无历史分摊记录" :image-size="100">
          <el-button type="primary" size="small" @click="$emit('create-new')">
            创建新分摊
          </el-button>
        </el-empty>
      </div>
      
      <div v-else class="history-list">
        <div class="quick-actions">
          <el-button
            v-if="mostUsedPattern"
            type="primary"
            size="small"
            @click="selectPattern(mostUsedPattern)"
          >
            <el-icon><Star /></el-icon>
            使用最常用模式
          </el-button>
          <el-button
            type="default"
            size="small"
            @click="$emit('create-new')"
          >
            <el-icon><Plus /></el-icon>
            创建新分摊
          </el-button>
        </div>
        
        <div class="pattern-list">
          <div
            v-for="pattern in splitHistory"
            :key="pattern.id"
            class="pattern-item"
            :class="{ active: selectedPatternId === pattern.id }"
            @click="selectPattern(pattern)"
          >
            <div class="pattern-header">
              <div class="pattern-type">
                <el-tag :type="getSplitTypeTagType(pattern.splitType)" size="small">
                  {{ getSplitTypeLabel(pattern.splitType) }}
                </el-tag>
                <span class="pattern-date">{{ formatDate(pattern.createdAt) }}</span>
              </div>
              <div class="pattern-amount">
                ¥{{ pattern.totalAmount?.toFixed(2) || '0.00' }}
              </div>
            </div>
            
            <div class="pattern-content">
              <div class="pattern-members">
                <el-avatar-group :max="4" size="small">
                  <el-avatar
                    v-for="member in getPatternMembers(pattern)"
                    :key="member.id"
                    :src="member.avatar"
                    :title="member.name"
                  >
                    {{ member.name.charAt(0) }}
                  </el-avatar>
                </el-avatar-group>
                <span class="member-count">
                  {{ pattern.selectedMemberIds?.length || 0 }}人
                </span>
              </div>
              
              <div class="pattern-details">
                <div v-if="pattern.splitType === 'equal'" class="equal-detail">
                  每人 ¥{{ (pattern.totalAmount / (pattern.selectedMemberIds?.length || 1)).toFixed(2) }}
                </div>
                <div v-else-if="pattern.splitType === 'amount'" class="amount-detail">
                  自定义金额
                </div>
                <div v-else-if="pattern.splitType === 'percentage'" class="percentage-detail">
                  按比例分摊
                </div>
              </div>
            </div>
            
            <div class="pattern-actions">
              <el-button
                type="text"
                size="small"
                @click.stop="selectPattern(pattern)"
              >
                使用此模式
              </el-button>
              <el-button
                type="text"
                size="small"
                @click.stop="deletePattern(pattern.id)"
              >
                删除
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh, Star, Plus } from '@element-plus/icons-vue'
import { useSplitPreferencesStore } from '@/stores/splitPreferences'
import { useUserStore } from '@/stores/user'

// 定义组件名称
defineOptions({
  name: 'SplitHistorySelector'
})

// 定义事件
const emit = defineEmits(['select-pattern', 'create-new'])

// 状态管理
const splitPreferencesStore = useSplitPreferencesStore()
const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const selectedPatternId = ref(null)

// 计算属性
const splitHistory = computed(() => splitPreferencesStore.recentSplitPatterns)
const mostUsedPattern = computed(() => splitPreferencesStore.mostUsedSplitPattern)

// 方法
/**
 * 刷新历史记录
 */
const refreshHistory = async () => {
  if (!userStore.userInfo?.id) return
  
  loading.value = true
  try {
    await splitPreferencesStore.loadUserSplitHistory(userStore.userInfo.id)
  } catch (error) {
    ElMessage.error('刷新历史记录失败')
  } finally {
    loading.value = false
  }
}

/**
 * 选择分摊模式
 * @param {Object} pattern - 分摊模式
 */
const selectPattern = (pattern) => {
  selectedPatternId.value = pattern.id
  emit('select-pattern', pattern)
}

/**
 * 删除分摊模式
 * @param {string} patternId - 模式ID
 */
const deletePattern = async (patternId) => {
  try {
    await ElMessageBox.confirm('确定要删除这个分摊模式吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    // 这里应该调用API删除记录
    // 暂时从本地状态中移除
    const index = splitHistory.value.findIndex(item => item.id === patternId)
    if (index !== -1) {
      splitHistory.value.splice(index, 1)
    }
    
    ElMessage.success('删除成功')
  } catch (error) {
    // 用户取消删除
  }
}

/**
 * 获取分摊方式标签类型
 * @param {string} splitType - 分摊方式
 * @returns {string} 标签类型
 */
const getSplitTypeTagType = (splitType) => {
  const typeMap = {
    equal: 'success',
    amount: 'primary',
    percentage: 'warning'
  }
  return typeMap[splitType] || 'info'
}

/**
 * 获取分摊方式标签文本
 * @param {string} splitType - 分摊方式
 * @returns {string} 标签文本
 */
const getSplitTypeLabel = (splitType) => {
  const labelMap = {
    equal: '平均分摊',
    amount: '自定义金额',
    percentage: '按比例分摊'
  }
  return labelMap[splitType] || '未知'
}

/**
 * 格式化日期
 * @param {string} dateString - 日期字符串
 * @returns {string} 格式化后的日期
 */
const formatDate = (dateString) => {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  const now = new Date()
  const diffTime = Math.abs(now - date)
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) {
    return '今天'
  } else if (diffDays === 1) {
    return '昨天'
  } else if (diffDays < 7) {
    return `${diffDays}天前`
  } else {
    return date.toLocaleDateString()
  }
}

/**
 * 获取分摊模式中的成员信息
 * @param {Object} pattern - 分摊模式
 * @returns {Array} 成员列表
 */
const getPatternMembers = (pattern) => {
  // 这里应该根据成员ID获取成员详情
  // 暂时返回模拟数据
  return pattern.selectedMemberIds?.map(id => ({
    id,
    name: `成员${id}`,
    avatar: `https://picsum.photos/seed/${id}/40/40.jpg`
  })) || []
}

// 生命周期
onMounted(() => {
  refreshHistory()
})
</script>

<style scoped>
.split-history-selector {
  margin-bottom: 20px;
}

.history-card {
  border-radius: 8px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.loading-container,
.empty-container {
  padding: 20px;
}

.quick-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.pattern-list {
  max-height: 400px;
  overflow-y: auto;
}

.pattern-item {
  padding: 12px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.pattern-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.pattern-item.active {
  border-color: #409eff;
  background-color: #ecf5ff;
}

.pattern-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.pattern-type {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pattern-date {
  font-size: 12px;
  color: #909399;
}

.pattern-amount {
  font-weight: bold;
  color: #409eff;
}

.pattern-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.pattern-members {
  display: flex;
  align-items: center;
  gap: 8px;
}

.member-count {
  font-size: 12px;
  color: #606266;
}

.pattern-details {
  font-size: 12px;
  color: #909399;
}

.pattern-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>