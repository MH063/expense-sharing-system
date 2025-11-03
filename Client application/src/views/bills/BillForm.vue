<template>
  <div class="bill-form-container">
    <div class="form-header">
      <div class="header-left">
        <button class="back-button" @click="goBack">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          返回
        </button>
        
        <h1>{{ isEditing ? '编辑账单' : '创建账单' }}</h1>
      </div>
      <div class="header-right">
        <div v-if="lastSavedTime" class="auto-save-indicator">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          已自动保存于 {{ formatTime(lastSavedTime) }}
        </div>
      </div>
    </div>
    
    <div class="form-content">
      <div class="form-card">
        <form @submit.prevent="handleSubmit">
          <div class="form-group" :class="{ 'has-error': errors.title }">
            <label for="title">账单标题 *</label>
            <div class="input-wrapper">
              <input 
                id="title"
                v-model="form.title" 
                type="text" 
                placeholder="请输入账单标题"
                required
                @blur="validateField('title')"
                :class="{ 'is-error': errors.title }"
              />
              <div class="validation-status" v-if="validationStatus.title !== 'pending'">
                <svg v-if="validationStatus.title" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="valid-icon">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="invalid-icon">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </div>
            </div>
            <div v-if="errors.title" class="error-message">{{ errors.title }}</div>
          </div>
          
          <div class="form-group" :class="{ 'has-error': errors.amount }">
            <label for="amount">总金额 (¥) *</label>
            <div class="input-wrapper">
              <input 
                id="amount"
                v-model="form.amount" 
                type="number" 
                step="0.01" 
                min="0.01"
                placeholder="0.00"
                required
                @blur="validateField('amount')"
                :class="{ 'is-error': errors.amount }"
              />
              <div class="validation-status" v-if="validationStatus.amount !== 'pending'">
                <svg v-if="validationStatus.amount" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="valid-icon">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="invalid-icon">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </div>
            </div>
            <div v-if="errors.amount" class="error-message">{{ errors.amount }}</div>
          </div>
          
          <div class="form-group" :class="{ 'has-error': errors.category }">
            <label for="category">类别 *</label>
            <div class="input-wrapper">
              <select 
                id="category" 
                v-model="form.category" 
                required
                @change="validateField('category')"
                :class="{ 'is-error': errors.category }"
              >
                <option value="" disabled>请选择类别</option>
                <option v-for="category in categories" :key="category.id" :value="category.id">
                  {{ category.name }}
                </option>
              </select>
              <div class="validation-status" v-if="validationStatus.category !== 'pending'">
                <svg v-if="validationStatus.category" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="valid-icon">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="invalid-icon">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </div>
            </div>
            <div v-if="errors.category" class="error-message">{{ errors.category }}</div>
          </div>
          
          <div class="form-group" :class="{ 'has-error': errors.dueDate }">
            <label for="dueDate">到期日期 *</label>
            <div class="input-wrapper">
              <input 
                id="dueDate"
                v-model="form.dueDate" 
                type="date" 
                required
                @change="validateField('dueDate')"
                :class="{ 'is-error': errors.dueDate }"
              />
              <div class="validation-status" v-if="validationStatus.dueDate !== 'pending'">
                <svg v-if="validationStatus.dueDate" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="valid-icon">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="invalid-icon">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </div>
            </div>
            <div v-if="errors.dueDate" class="error-message">{{ errors.dueDate }}</div>
          </div>
          
          <div class="form-group">
            <label for="description">描述</label>
            <textarea 
              id="description"
              v-model="form.description" 
              rows="3" 
              placeholder="请输入账单描述"
            ></textarea>
          </div>
          
          <div class="form-group">
            <label for="receipt">收据图片</label>
            <div class="receipt-upload">
              <div v-if="!form.receipt" class="upload-placeholder" @click="triggerFileInput">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <span>点击上传收据图片</span>
              </div>
              <div v-else class="receipt-preview">
                <img :src="form.receipt" alt="收据" />
                <div class="receipt-actions">
                  <button type="button" class="view-button" @click="viewReceipt">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </button>
                  <button type="button" class="remove-button" @click="removeReceipt">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>
              <input 
                ref="fileInput"
                type="file" 
                accept="image/*" 
                @change="handleFileChange"
                style="display: none;"
              />
            </div>
          </div>
          
          <div class="form-group">
            <label>分摊方式 *</label>
            <div class="split-options">
              <div 
                class="split-option" 
                :class="{ active: form.splitType === 'equal' }"
                @click="form.splitType = 'equal'"
              >
                <div class="option-radio">
                  <div class="radio-circle" :class="{ checked: form.splitType === 'equal' }"></div>
                </div>
                <div class="option-content">
                  <div class="option-title">平均分摊</div>
                  <div class="option-description">所有参与者平均分摊费用</div>
                </div>
              </div>
              
              <div 
                class="split-option" 
                :class="{ active: form.splitType === 'custom' }"
                @click="form.splitType = 'custom'"
              >
                <div class="option-radio">
                  <div class="radio-circle" :class="{ checked: form.splitType === 'custom' }"></div>
                </div>
                <div class="option-content">
                  <div class="option-title">自定义分摊</div>
                  <div class="option-description">手动设置每个参与者的金额</div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="form-group">
            <label>参与者 *</label>
            <div class="participants-section">
              <div class="participants-header">
                <div class="participant-count">
                  已选择 {{ selectedParticipants.length }} 人
                </div>
                <button type="button" class="add-participant-button" @click="showParticipantSelector = true">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  添加参与者
                </button>
              </div>
              
              <div v-if="selectedParticipants.length === 0" class="empty-participants">
                <p>请添加参与者</p>
              </div>
              
              <div v-else class="participants-list">
                <div 
                  v-for="participant in selectedParticipants" 
                  :key="participant.id" 
                  class="participant-item"
                >
                  <div class="participant-avatar">
                    {{ participant.name.charAt(0) }}
                  </div>
                  <div class="participant-info">
                    <div class="participant-name">{{ participant.name }}</div>
                    <div v-if="form.splitType === 'equal'" class="participant-share">
                      ¥{{ getParticipantShare(participant).toFixed(2) }}
                    </div>
                    <div v-else class="participant-share-input">
                      <input 
                        type="number" 
                        step="0.01" 
                        min="0.01"
                        v-model="participant.customShare"
                        @input="validateCustomShares"
                      />
                    </div>
                  </div>
                  <button 
                    type="button" 
                    class="remove-participant-button" 
                    @click="removeParticipant(participant.id)"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>
              
              <div v-if="form.splitType === 'custom'" class="custom-share-summary">
                <div class="summary-row">
                  <div class="summary-label">分摊总额</div>
                  <div class="summary-value">¥{{ totalCustomShares.toFixed(2) }}</div>
                </div>
                <div class="summary-row">
                  <div class="summary-label">账单金额</div>
                  <div class="summary-value">¥{{ parseFloat(form.amount || 0).toFixed(2) }}</div>
                </div>
                <div class="summary-row" :class="{ error: shareDifference !== 0 }">
                  <div class="summary-label">差额</div>
                  <div class="summary-value" :class="{ error: shareDifference !== 0 }">
                    ¥{{ shareDifference.toFixed(2) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="button" class="cancel-button" @click="goBack">取消</button>
            <button type="submit" class="submit-button" :disabled="isSubmitting || (!formChanged && !isEditing)">
              {{ isSubmitting ? '保存中...' : (isEditing ? '更新账单' : '创建账单') }}
            </button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- 参与者选择模态框 -->
    <div v-if="showParticipantSelector" class="modal-overlay" @click="showParticipantSelector = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>选择参与者</h2>
          <button class="close-button" @click="showParticipantSelector = false">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="modal-body">
          <div class="search-box">
            <input 
              v-model="participantSearchQuery" 
              type="text" 
              placeholder="搜索成员..."
            />
          </div>
          
          <div class="participant-options">
            <div 
              v-for="member in filteredRoomMembers" 
              :key="member.id" 
              class="participant-option"
              :class="{ selected: isParticipantSelected(member.id) }"
              @click="toggleParticipantSelection(member)"
            >
              <div class="participant-avatar">
                {{ member.name.charAt(0) }}
              </div>
              <div class="participant-info">
                <div class="participant-name">{{ member.name }}</div>
                <div class="participant-role">{{ member.role }}</div>
              </div>
              <div class="participant-checkbox">
                <div class="checkbox" :class="{ checked: isParticipantSelected(member.id) }">
                  <svg v-if="isParticipantSelected(member.id)" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="secondary-button" @click="showParticipantSelector = false">取消</button>
          <button class="primary-button" @click="confirmParticipantSelection">确定</button>
        </div>
      </div>
    </div>
    
    <!-- 收据查看模态框 -->
    <div v-if="showReceiptModal" class="modal-overlay" @click="showReceiptModal = false">
      <div class="receipt-modal-content" @click.stop>
        <div class="receipt-modal-header">
          <h2>收据预览</h2>
          <button class="close-button" @click="showReceiptModal = false">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <div class="receipt-modal-body">
          <img :src="form.receipt" alt="收据" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ElMessage, ElMessageBox } from 'element-plus'
import billAPI from '@/api/bill-api'

// 路由和状态管理
const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// 响应式数据
const isEditing = computed(() => !!route.params.id)
const isSubmitting = ref(false)
const showParticipantSelector = ref(false)
const showReceiptModal = ref(false)
const participantSearchQuery = ref('')
const fileInput = ref(null)
const uploading = ref(false)
const autoSaveTimer = ref(null)
const lastSavedTime = ref(null)
const formChanged = ref(false)
const validationStatus = ref({
  title: 'pending',
  amount: 'pending',
  category: 'pending',
  dueDate: 'pending',
  participants: 'pending',
  customShares: 'pending'
})

// 表单数据
const form = ref({
  title: '',
  amount: '',
  category: '',
  dueDate: '',
  description: '',
  receipt: '',
  receipt_url: '', // 用于存储后端返回的URL
  splitType: 'equal',
  participants: []
})

// 表单验证错误
const errors = ref({})

// 类别选项
const categories = ref([
  { id: 'utilities', name: '水电费' },
  { id: 'internet', name: '网费' },
  { id: 'rent', name: '房租' },
  { id: 'property', name: '物业费' },
  { id: 'other', name: '其他' }
])

// 寝室成员
const roomMembers = ref([
  { id: 'user-1', name: '张三', role: '寝室长' },
  { id: 'user-2', name: '李四', role: '成员' },
  { id: 'user-3', name: '王五', role: '成员' },
  { id: 'user-4', name: '赵六', role: '成员' }
])

// 选中的参与者
const selectedParticipants = ref([])

// 临时选中的参与者（在模态框中）
const tempSelectedParticipants = ref([])

// 计算属性
const filteredRoomMembers = computed(() => {
  if (!participantSearchQuery.value) return roomMembers.value
  
  return roomMembers.value.filter(member => 
    member.name.toLowerCase().includes(participantSearchQuery.value.toLowerCase())
  )
})

const totalCustomShares = computed(() => {
  return selectedParticipants.value.reduce((total, participant) => {
    return total + parseFloat(participant.customShare || 0)
  }, 0)
})

const shareDifference = computed(() => {
  return totalCustomShares.value - parseFloat(form.value.amount || 0)
})

// 方法
const goBack = async () => {
  // 如果表单已更改，提示用户保存
  if (formChanged.value) {
    try {
      await ElMessageBox.confirm(
        '您有未保存的更改，确定要离开吗？',
        '提示',
        {
          confirmButtonText: '离开',
          cancelButtonText: '取消',
          type: 'warning'
        }
      )
    } catch {
      return
    }
  }
  router.go(-1)
}

/**
 * 实时验证单个字段
 * @param {string} field - 要验证的字段名
 * @returns {boolean} - 验证是否通过
 */
const validateField = (field) => {
  let isValid = true
  let errorMessage = ''
  
  switch (field) {
    case 'title':
      if (!form.value.title.trim()) {
        errorMessage = '请输入账单标题'
        isValid = false
      } else if (form.value.title.trim().length < 2) {
        errorMessage = '账单标题至少需要2个字符'
        isValid = false
      } else if (form.value.title.trim().length > 50) {
        errorMessage = '账单标题不能超过50个字符'
        isValid = false
      }
      break
      
    case 'amount':
      if (!form.value.amount || parseFloat(form.value.amount) <= 0) {
        errorMessage = '请输入有效的金额'
        isValid = false
      } else if (parseFloat(form.value.amount) > 999999.99) {
        errorMessage = '金额不能超过999,999.99'
        isValid = false
      }
      break
      
    case 'category':
      if (!form.value.category) {
        errorMessage = '请选择类别'
        isValid = false
      }
      break
      
    case 'dueDate':
      if (!form.value.dueDate) {
        errorMessage = '请选择到期日期'
        isValid = false
      } else {
        const dueDate = new Date(form.value.dueDate)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        if (dueDate < today) {
          errorMessage = '到期日期不能早于今天'
          isValid = false
        }
      }
      break
      
    case 'participants':
      if (selectedParticipants.value.length === 0) {
        errorMessage = '请至少选择一个参与者'
        isValid = false
      }
      break
      
    case 'customShares':
      if (form.value.splitType === 'custom' && Math.abs(shareDifference.value) > 0.01) {
        errorMessage = '分摊总额必须等于账单金额'
        isValid = false
      }
      break
  }
  
  // 更新验证状态和错误信息
  validationStatus.value[field] = isValid ? true : false
  if (errorMessage) {
    errors.value[field] = errorMessage
  } else {
    delete errors.value[field]
  }
  
  return isValid
}

/**
 * 验证整个表单
 * @returns {boolean} - 表单是否有效
 */
const validateForm = () => {
  // 验证所有必填字段
  const fields = ['title', 'amount', 'category', 'dueDate', 'participants']
  let isValid = true
  
  fields.forEach(field => {
    if (!validateField(field)) {
      isValid = false
    }
  })
  
  // 如果是自定义分摊，验证分摊金额
  if (form.value.splitType === 'custom') {
    if (!validateField('customShares')) {
      isValid = false
    }
  }
  
  return isValid
}

/**
 * 自动保存表单数据
 */
const autoSave = async () => {
  if (!formChanged.value || isEditing.value) return
  
  try {
    // 只保存非敏感数据，不包括收据图片
    const draftData = {
      title: form.value.title,
      amount: form.value.amount,
      category: form.value.category,
      dueDate: form.value.dueDate,
      description: form.value.description,
      splitType: form.value.splitType,
      participants: selectedParticipants.value.map(p => ({
        id: p.id,
        name: p.name,
        customShare: p.customShare
      }))
    }
    
    // 保存到本地存储
    localStorage.setItem('billDraft', JSON.stringify(draftData))
    lastSavedTime.value = new Date()
    
    // 显示自动保存提示
    ElMessage.success({
      message: '已自动保存草稿',
      duration: 1000
    })
  } catch (error) {
    console.error('自动保存失败:', error)
  }
}

/**
 * 从本地存储加载草稿
 */
const loadDraft = () => {
  try {
    const draftData = localStorage.getItem('billDraft')
    if (!draftData) return
    
    const draft = JSON.parse(draftData)
    
    // 填充表单
    form.value.title = draft.title || ''
    form.value.amount = draft.amount || ''
    form.value.category = draft.category || ''
    form.value.dueDate = draft.dueDate || ''
    form.value.description = draft.description || ''
    form.value.splitType = draft.splitType || 'equal'
    
    // 设置参与者
    if (draft.participants && draft.participants.length > 0) {
      selectedParticipants.value = draft.participants
      tempSelectedParticipants.value = [...draft.participants]
    }
    
    // 提示用户是否加载草稿
    ElMessageBox.confirm(
      '检测到未完成的账单草稿，是否加载？',
      '加载草稿',
      {
        confirmButtonText: '加载',
        cancelButtonText: '不加载',
        type: 'info'
      }
    ).then(() => {
      // 用户选择加载草稿
      formChanged.value = false
    }).catch(() => {
      // 用户选择不加载草稿，清除草稿
      localStorage.removeItem('billDraft')
    })
  } catch (error) {
    console.error('加载草稿失败:', error)
    localStorage.removeItem('billDraft')
  }
}

/**
 * 清除草稿
 */
const clearDraft = () => {
  localStorage.removeItem('billDraft')
}

const triggerFileInput = () => {
  fileInput.value.click()
}

const handleFileChange = (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return
  }
  
  // 检查文件大小（限制为5MB）
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过5MB')
    return
  }
  
  // 创建预览URL
  const reader = new FileReader()
  reader.onload = (e) => {
    form.value.receipt = e.target.result
  }
  reader.readAsDataURL(file)
  
  // 上传收据到后端
  uploadReceipt(event)
}

const viewReceipt = () => {
  showReceiptModal.value = true
}

const removeReceipt = () => {
  form.value.receipt = ''
  form.value.receipt_url = ''
}

const isParticipantSelected = (participantId) => {
  return tempSelectedParticipants.value.some(p => p.id === participantId)
}

const toggleParticipantSelection = (participant) => {
  const index = tempSelectedParticipants.value.findIndex(p => p.id === participant.id)
  
  if (index === -1) {
    // 添加参与者
    tempSelectedParticipants.value.push({
      ...participant,
      customShare: 0
    })
  } else {
    // 移除参与者
    tempSelectedParticipants.value.splice(index, 1)
  }
}

const confirmParticipantSelection = () => {
  selectedParticipants.value = [...tempSelectedParticipants.value]
  showParticipantSelector.value = false
}

const removeParticipant = (participantId) => {
  const index = selectedParticipants.value.findIndex(p => p.id === participantId)
  if (index !== -1) {
    selectedParticipants.value.splice(index, 1)
  }
}

const getParticipantShare = (participant) => {
  if (!form.value.amount || selectedParticipants.value.length === 0) return 0
  
  const amount = parseFloat(form.value.amount)
  return amount / selectedParticipants.value.length
}

const validateCustomShares = () => {
  // 实时验证自定义分摊
  if (form.value.splitType === 'custom') {
    validateField('customShares')
  }
}

const handleSubmit = async () => {
  if (!validateForm()) {
    // 滚动到第一个错误字段
    const firstErrorField = Object.keys(errors.value)[0]
    if (firstErrorField) {
      const element = document.getElementById(firstErrorField)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        element.focus()
      }
    }
    return
  }
  
  isSubmitting.value = true
  
  try {
    // 准备提交数据
    const billData = {
      title: form.value.title,
      amount: parseFloat(form.value.amount),
      category: form.value.category,
      dueDate: form.value.dueDate,
      description: form.value.description,
      receipt_url: form.value.receipt_url, // 使用后端返回的URL
      split_type: form.value.splitType, // 使用下划线命名以匹配后端
      participants: selectedParticipants.value.map(participant => ({
        user_id: participant.id, // 使用下划线命名以匹配后端
        share: form.value.splitType === 'equal' 
          ? getParticipantShare(participant)
          : parseFloat(participant.customShare || 0)
      }))
    }
    
    let response;
    if (isEditing.value) {
      // 编辑账单
      response = await billAPI.updateBill(route.params.id, billData)
      console.log('更新账单:', response)
    } else {
      // 创建账单
      response = await billAPI.createBill(billData)
      console.log('创建账单:', response)
    }
    
    // 检查响应是否成功
    if (response.success) {
      // 清除草稿
      clearDraft()
      formChanged.value = false
      
      ElMessage.success(isEditing.value ? '账单更新成功' : '账单创建成功')
      
      // 跳转到账单详情页
      if (isEditing.value) {
        router.push(`/bills/${route.params.id}`)
      } else {
        // 使用返回的账单ID
        const newBillId = response.data.id || `bill-${Date.now()}`
        router.push(`/bills/${newBillId}`)
      }
    } else {
      ElMessage.error(response.message || '操作失败')
    }
    
  } catch (error) {
    console.error('保存账单失败:', error)
    ElMessage.error('保存账单失败，请稍后再试')
  } finally {
    isSubmitting.value = false
  }
}

const loadBillDetail = async () => {
  if (!isEditing.value) return
  
  try {
    const response = await billAPI.getBillById(route.params.id)
    
    if (response.success) {
      const bill = response.data
      
      // 填充表单
      form.value = {
        title: bill.title,
        amount: bill.amount.toString(),
        category: bill.category,
        dueDate: bill.due_date, // 使用下划线命名以匹配后端
        description: bill.description || '',
        receipt: bill.receipt_url || '', // 使用后端返回的URL
        receipt_url: bill.receipt_url || '',
        splitType: bill.split_type || 'equal', // 使用下划线命名以匹配后端
        participants: []
      }
      
      // 设置参与者
      selectedParticipants.value = bill.participants.map(p => ({
        id: p.user_id, // 使用下划线命名以匹配后端
        name: p.user_name,
        customShare: p.share.toString()
      }))
      
      // 初始化临时选中的参与者
      tempSelectedParticipants.value = [...selectedParticipants.value]
    } else {
      ElMessage.error(response.message || '加载账单详情失败')
    }
    
  } catch (error) {
    console.error('加载账单详情失败:', error)
    ElMessage.error('加载账单详情失败，请稍后再试')
  }
}

// 上传收据
const uploadReceipt = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // 检查文件大小 (5MB限制)
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('文件大小不能超过5MB');
    return;
  }

  // 检查文件类型
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    ElMessage.error('只支持JPG、PNG、GIF图片和PDF文件');
    return;
  }

  try {
    uploading.value = true;
    const formData = new FormData();
    formData.append('receipt', file);

    // 调用后端API上传收据
    const response = await billAPI.uploadReceipt(formData);
    
    if (response.success) {
      form.value.receipt_url = response.data.fileUrl;
      ElMessage.success('收据上传成功');
    } else {
      ElMessage.error(response.message || '上传失败');
    }
  } catch (error) {
    console.error('上传收据失败:', error);
    ElMessage.error('上传收据失败');
  } finally {
    uploading.value = false;
  }
};

// 监听器
watch(() => form.value.splitType, (newType) => {
  formChanged.value = true
  if (newType === 'equal') {
    // 切换到平均分摊时，重置自定义份额
    selectedParticipants.value.forEach(participant => {
      participant.customShare = getParticipantShare(participant).toFixed(2)
    })
  }
  
  // 触发自动保存
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
  }
  autoSaveTimer.value = setTimeout(() => {
    autoSave()
  }, 2000)
})

watch(() => form.value.amount, () => {
  formChanged.value = true
  if (form.value.splitType === 'equal') {
    // 金额变化时，更新平均分摊
    selectedParticipants.value.forEach(participant => {
      participant.customShare = getParticipantShare(participant).toFixed(2)
    })
  }
  
  // 触发自动保存
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
  }
  autoSaveTimer.value = setTimeout(() => {
    autoSave()
  }, 2000)
})

// 监听表单字段变化，实现自动保存
watch([
  () => form.value.title,
  () => form.value.category,
  () => form.value.dueDate,
  () => form.value.description,
  () => selectedParticipants.value.length
], () => {
  formChanged.value = true
  
  // 清除之前的自动保存定时器
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
  }
  
  // 设置新的自动保存定时器
  autoSaveTimer.value = setTimeout(() => {
    autoSave()
  }, 2000)
}, { deep: true })

// 监听自定义分摊变化
watch(() => totalCustomShares.value, () => {
  if (form.value.splitType === 'custom') {
    validateField('customShares')
  }
})

// 格式化时间显示
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  // 如果是今天，只显示时间
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  
  // 如果是昨天，显示"昨天 HH:MM"
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return `昨天 ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
  }
  
  // 其他情况显示日期和时间
  return date.toLocaleString('zh-CN', { 
    month: 'numeric', 
    day: 'numeric',
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

// 组件挂载时加载数据
onMounted(async () => {
  // 加载草稿数据
  loadDraft()
  
  // 初始化临时选中的参与者
  tempSelectedParticipants.value = [...selectedParticipants.value]
  
  // 如果是编辑模式，加载账单详情
  if (isEditing.value) {
    await loadBillDetail()
  } else {
    // 如果不是编辑模式，初始化默认值
    // 设置默认到期日期为7天后
    const defaultDueDate = new Date()
    defaultDueDate.setDate(defaultDueDate.getDate() + 7)
    form.value.dueDate = defaultDueDate.toISOString().split('T')[0]
  }
  
  // 初始化验证状态
  Object.keys(validationStatus.value).forEach(key => {
    validationStatus.value[key] = 'pending'
  })
  
  // 初始表单状态设为未更改
  formChanged.value = false
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (autoSaveTimer.value) {
    clearTimeout(autoSaveTimer.value)
  }
})
</script>

<style scoped>
.bill-form-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-right {
  display: flex;
  align-items: center;
}

.auto-save-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #67c23a;
  background-color: rgba(103, 194, 58, 0.1);
  padding: 4px 8px;
  border-radius: 4px;
}

.back-button {
  display: flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  color: #606266;
  cursor: pointer;
  font-size: 14px;
  transition: color 0.3s;
}

.back-button:hover {
  color: #409eff;
}

.form-header h1 {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin: 0;
  flex: 1;
}

.auto-save-status {
  font-size: 14px;
  color: #4caf50;
  font-weight: 500;
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.form-card {
  padding: 24px;
  background-color: white;
  border-radius: 10px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.form-group {
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group.has-error input,
.form-group.has-error select,
.form-group.has-error textarea {
  border-color: #f44336;
}

.form-group label {
  display: block;
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
  color: #333;
  background-color: white;
  transition: border-color 0.3s, box-shadow 0.3s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #6a11cb;
  box-shadow: 0 0 0 2px rgba(106, 17, 203, 0.2);
}

.error-message {
  color: #f44336;
  font-size: 14px;
  margin-top: 4px;
}

.receipt-upload {
  margin-top: 8px;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  border: 2px dashed #ddd;
  border-radius: 6px;
  color: #666;
  cursor: pointer;
  transition: border-color 0.3s;
}

.upload-placeholder:hover {
  border-color: #6a11cb;
  color: #6a11cb;
}

.receipt-preview {
  position: relative;
  width: 200px;
  height: 200px;
  border-radius: 6px;
  overflow: hidden;
}

.receipt-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.receipt-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 8px;
}

.view-button, .remove-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  cursor: pointer;
  transition: background-color 0.3s;
}

.view-button:hover, .remove-button:hover {
  background-color: rgba(0, 0, 0, 0.8);
}

.split-options {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.split-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.split-option.active {
  border-color: #6a11cb;
  background-color: #f5f7ff;
}

.option-radio {
  display: flex;
  align-items: center;
  justify-content: center;
}

.radio-circle {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #ddd;
  transition: all 0.3s;
}

.radio-circle.checked {
  border-color: #6a11cb;
  background-color: #6a11cb;
  position: relative;
}

.radio-circle.checked::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: white;
}

.option-content {
  flex: 1;
}

.option-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
}

.option-description {
  font-size: 14px;
  color: #666;
}

.participants-section {
  margin-top: 8px;
}

.participants-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.participant-count {
  font-size: 14px;
  color: #666;
}

.add-participant-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background-color: #6a11cb;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.3s;
}

.add-participant-button:hover {
  opacity: 0.9;
}

.empty-participants {
  padding: 20px;
  text-align: center;
  background-color: #f9f9f9;
  border-radius: 8px;
  color: #666;
}

.participants-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.participant-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background-color: #f9f9f9;
  border-radius: 8px;
}

.participant-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #6a11cb;
  color: white;
  font-size: 14px;
  font-weight: 500;
  flex-shrink: 0;
}

.participant-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.participant-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.participant-share {
  font-size: 14px;
  color: #666;
}

.participant-share-input input {
  width: 100px;
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  text-align: right;
}

.remove-participant-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: #f5f5f5;
  color: #666;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
}

.remove-participant-button:hover {
  background-color: #ffebee;
  color: #f44336;
}

.custom-share-summary {
  margin-top: 16px;
  padding: 12px;
  background-color: #f9f9f9;
  border-radius: 8px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
}

.summary-row.error {
  color: #f44336;
}

.summary-label {
  font-size: 14px;
  color: #666;
}

.summary-value {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.summary-value.error {
  color: #f44336;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.cancel-button {
  padding: 10px 20px;
  background-color: white;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
}

.cancel-button:hover {
  background-color: #f5f5f5;
}

.submit-button {
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

.submit-button:hover {
  opacity: 0.9;
}

.submit-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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
  overflow: hidden;
  display: flex;
  flex-direction: column;
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
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.search-box {
  margin-bottom: 16px;
}

.search-box input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
}

.participant-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.participant-option {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.participant-option:hover {
  background-color: #f5f5f5;
}

.participant-option.selected {
  background-color: #f5f7ff;
}

.participant-option .participant-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background-color: #6a11cb;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 500;
}

.participant-option .participant-info {
  flex: 1;
}

.participant-option .participant-name {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.participant-option .participant-role {
  font-size: 12px;
  color: #666;
}

.participant-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
}

.checkbox {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.checkbox.checked {
  border-color: #6a11cb;
  background-color: #6a11cb;
  color: white;
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

.primary-button {
  padding: 8px 16px;
  background-color: #6a11cb;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.3s;
}

.primary-button:hover {
  opacity: 0.9;
}

.receipt-modal-content {
  background-color: white;
  border-radius: 10px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
}

.receipt-modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.receipt-modal-header h2 {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin: 0;
}

.receipt-modal-body {
  padding: 20px;
  text-align: center;
}

.receipt-modal-body img {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .bill-form-container {
    padding: 16px;
  }
  
  .form-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .participants-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .participant-info {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  
  .form-actions {
    flex-direction: column;
  }
  
  .modal-content {
    width: 95%;
    max-height: 90vh;
  }
}
</style>