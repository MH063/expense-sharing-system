<template>
  <!-- 配置弹窗 -->
  <div v-if="show" class="modal-overlay" @click="closeModal">
    <div class="modal-container" @click.stop>
      <div class="modal-header">
        <h3>WebSocket配置</h3>
        <button @click="closeModal" class="modal-close-btn">×</button>
      </div>
      <div class="modal-body">
        <div class="config-form">
          <div class="form-group">
            <label>服务器地址</label>
            <input v-model="localConfig.serverUrl" type="text" placeholder="ws://localhost:4000" class="config-input" />
          </div>
          <div class="form-group">
            <label>重连间隔(毫秒)</label>
            <input v-model.number="localConfig.reconnectInterval" type="number" min="1000" step="1000" class="config-input" />
          </div>
          <div class="form-group">
            <label>最大重连次数</label>
            <input v-model.number="localConfig.maxReconnectAttempts" type="number" min="1" max="10" class="config-input" />
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button @click="resetConfig" class="btn btn-secondary">重置</button>
        <button @click="saveConfig" class="btn btn-primary">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

// Props
const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  config: {
    type: Object,
    required: true
  }
})

// Emits
const emit = defineEmits(['close', 'save', 'reset'])

// 本地配置状态
const localConfig = ref({
  serverUrl: 'ws://localhost:4000',
  reconnectInterval: 5000,
  maxReconnectAttempts: 5
})

// 监听props.config变化，更新本地配置
watch(() => props.config, (newConfig) => {
  localConfig.value = { ...newConfig }
}, { immediate: true })

// 关闭弹窗
const closeModal = () => {
  emit('close')
}

// 保存配置
const saveConfig = () => {
  emit('save', { ...localConfig.value })
  closeModal()
}

// 重置配置
const resetConfig = () => {
  emit('reset')
}
</script>

<style scoped>
/* 弹窗遮罩 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  backdrop-filter: blur(2px);
}

/* 弹窗容器 */
.modal-container {
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 20px 64px rgba(0, 0, 0, 0.12);
  width: 90%;
  max-width: 400px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: modalFadeIn 0.2s ease-out;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* 弹窗头部 */
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 1.5rem 1rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
}

.modal-close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #64748b;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
}

.modal-close-btn:hover {
  background-color: rgba(0, 0, 0, 0.05);
  color: #374151;
}

/* 弹窗内容 */
.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0; /* 确保flex子元素能正确收缩 */
}

/* 配置表单 */
.config-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.config-input {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.config-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

/* 弹窗底部 */
.modal-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 1rem 1.5rem 1.5rem 1.5rem;
  border-top: 1px solid #e2e8f0;
  flex-shrink: 0; /* 防止footer被压缩 */
  background: white; /* 确保背景色固定 */
}

/* 按钮样式 */
.btn {
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  border: none;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap; /* 防止按钮文字换行 */
  min-width: 80px; /* 设置最小宽度确保按钮不会太小 */
}

.btn-primary {
  background-color: #3b82f6;
  color: white;
}

.btn-primary:hover {
  background-color: #2563eb;
}

.btn-secondary {
  background-color: #f1f5f9;
  color: #475569;
  border: 1px solid #e2e8f0;
}

.btn-secondary:hover {
  background-color: #e2e8f0;
  color: #334155;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .modal-container {
    width: 95%;
    max-width: none;
    margin: 0.5rem;
    max-height: 95vh;
  }
  
  .modal-header {
    padding: 1rem 1rem 0.75rem 1rem;
  }
  
  .modal-header h3 {
    font-size: 1rem;
  }
  
  .modal-body {
    padding: 1rem;
  }
  
  .modal-footer {
    padding: 0.75rem 1rem 1rem 1rem;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .modal-footer .btn {
    width: 100%;
    justify-content: center;
    padding: 0.875rem 1.5rem;
  }
}

@media (max-height: 500px) {
  .modal-container {
    max-height: 95vh;
  }
  
  .modal-header {
    padding: 1rem 1rem 0.75rem 1rem;
  }
  
  .modal-body {
    padding: 1rem;
  }
  
  .modal-footer {
    padding: 0.75rem 1rem 1rem 1rem;
  }
}
</style>