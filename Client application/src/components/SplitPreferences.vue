<template>
  <div class="split-preferences">
    <el-card class="preferences-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span>分摊偏好设置</span>
          <div class="header-actions">
            <el-button
              type="text"
              size="small"
              @click="resetToDefaults"
            >
              重置为默认
            </el-button>
            <el-button
              type="primary"
              size="small"
              @click="savePreferences"
              :loading="saving"
            >
              保存设置
            </el-button>
          </div>
        </div>
      </template>
      
      <el-form
        ref="preferencesForm"
        :model="preferences"
        :rules="rules"
        label-width="140px"
        size="default"
      >
        <el-form-item label="默认分摊方式" prop="defaultSplitType">
          <el-radio-group v-model="preferences.defaultSplitType">
            <el-radio label="equal">平均分摊</el-radio>
            <el-radio label="amount">自定义金额</el-radio>
            <el-radio label="percentage">按比例分摊</el-radio>
          </el-radio-group>
          <div class="form-item-tip">
            选择创建费用记录时的默认分摊方式
          </div>
        </el-form-item>
        
        <el-form-item label="自动选择成员" prop="autoSelectAll">
          <el-switch
            v-model="preferences.autoSelectAll"
            active-text="开启"
            inactive-text="关闭"
          />
          <div class="form-item-tip">
            创建费用记录时自动选择所有房间成员
          </div>
        </el-form-item>
        
        <el-form-item label="显示分摊预览" prop="showPreview">
          <el-switch
            v-model="preferences.showPreview"
            active-text="显示"
            inactive-text="隐藏"
          />
          <div class="form-item-tip">
            在分摊设置界面显示分摊详情预览
          </div>
        </el-form-item>
        
        <el-form-item label="启用通知" prop="enableNotifications">
          <el-switch
            v-model="preferences.enableNotifications"
            active-text="开启"
            inactive-text="关闭"
          />
          <div class="form-item-tip">
            分摊计算完成时显示通知提示
          </div>
        </el-form-item>
        
        <el-form-item label="默认货币" prop="currency">
          <el-select v-model="preferences.currency" placeholder="请选择货币">
            <el-option
              v-for="currency in currencyOptions"
              :key="currency.value"
              :label="currency.label"
              :value="currency.value"
            />
          </el-select>
          <div class="form-item-tip">
            设置费用记录的默认货币类型
          </div>
        </el-form-item>
        
        <el-form-item label="舍入规则" prop="roundingRule">
          <el-radio-group v-model="preferences.roundingRule">
            <el-radio label="round">四舍五入</el-radio>
            <el-radio label="ceil">向上取整</el-radio>
            <el-radio label="floor">向下取整</el-radio>
          </el-radio-group>
          <div class="form-item-tip">
            分摊金额计算时的舍入规则
          </div>
        </el-form-item>
        
        <el-divider content-position="left">高级设置</el-divider>
        
        <el-form-item label="历史记录数量" prop="historyLimit">
          <el-input-number
            v-model="preferences.historyLimit"
            :min="10"
            :max="100"
            :step="10"
            controls-position="right"
          />
          <div class="form-item-tip">
            保留的历史分摊记录数量（10-100条）
          </div>
        </el-form-item>
        
        <el-form-item label="自动保存间隔" prop="autoSaveInterval">
          <el-input-number
            v-model="preferences.autoSaveInterval"
            :min="30"
            :max="300"
            :step="30"
            controls-position="right"
          />
          <span class="input-suffix">秒</span>
          <div class="form-item-tip">
            编辑费用记录时的自动保存间隔（30-300秒）
          </div>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useSplitPreferencesStore } from '@/stores/splitPreferences'
import { useUserStore } from '@/stores/user'

// 定义组件名称
defineOptions({
  name: 'SplitPreferences'
})

// 状态管理
const splitPreferencesStore = useSplitPreferencesStore()
const userStore = useUserStore()

// 响应式数据
const preferencesForm = ref(null)
const saving = ref(false)
const preferences = reactive({
  defaultSplitType: 'equal',
  autoSelectAll: true,
  showPreview: true,
  enableNotifications: true,
  currency: 'CNY',
  roundingRule: 'round',
  historyLimit: 50,
  autoSaveInterval: 60
})

// 表单验证规则
const rules = {
  defaultSplitType: [
    { required: true, message: '请选择默认分摊方式', trigger: 'change' }
  ],
  currency: [
    { required: true, message: '请选择默认货币', trigger: 'change' }
  ],
  roundingRule: [
    { required: true, message: '请选择舍入规则', trigger: 'change' }
  ]
}

// 货币选项
const currencyOptions = [
  { value: 'CNY', label: '人民币 (¥)' },
  { value: 'USD', label: '美元 ($)' },
  { value: 'EUR', label: '欧元 (€)' },
  { value: 'JPY', label: '日元 (¥)' },
  { value: 'GBP', label: '英镑 (£)' },
  { value: 'HKD', label: '港币 (HK$)' },
  { value: 'TWD', label: '台币 (NT$)' }
]

// 方法
/**
 * 加载用户偏好设置
 */
const loadPreferences = async () => {
  if (!userStore.userInfo?.id) return
  
  try {
    await splitPreferencesStore.loadUserPreferences(userStore.userInfo.id)
    
    // 更新本地表单数据
    Object.keys(preferences).forEach(key => {
      if (splitPreferencesStore.userPreferences[key] !== undefined) {
        preferences[key] = splitPreferencesStore.userPreferences[key]
      }
    })
  } catch (error) {
    ElMessage.error('加载偏好设置失败')
  }
}

/**
 * 保存偏好设置
 */
const savePreferences = async () => {
  if (!preferencesForm.value) return
  
  try {
    // 验证表单
    await preferencesForm.value.validate()
    
    if (!userStore.userInfo?.id) {
      ElMessage.error('用户信息不完整，无法保存设置')
      return
    }
    
    saving.value = true
    
    await splitPreferencesStore.saveUserPreferences(userStore.userInfo.id, preferences)
    
    ElMessage.success('偏好设置保存成功')
  } catch (error) {
    if (error.message) {
      ElMessage.error('保存失败: ' + error.message)
    }
  } finally {
    saving.value = false
  }
}

/**
 * 重置为默认设置
 */
const resetToDefaults = () => {
  splitPreferencesStore.resetToDefaults()
  
  // 更新本地表单数据
  Object.keys(preferences).forEach(key => {
    if (splitPreferencesStore.userPreferences[key] !== undefined) {
      preferences[key] = splitPreferencesStore.userPreferences[key]
    }
  })
  
  ElMessage.success('已重置为默认设置')
}

// 生命周期
onMounted(() => {
  loadPreferences()
})
</script>

<style scoped>
.split-preferences {
  margin-bottom: 20px;
}

.preferences-card {
  border-radius: 8px;
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

.form-item-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}

.input-suffix {
  margin-left: 8px;
  color: #606266;
}
</style>