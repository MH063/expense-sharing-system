<template>
  <div class="payment-modal" v-if="visible">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">确认支付</h3>
        <button @click="close" class="close-btn" title="关闭">
          <i class="icon-close">×</i>
        </button>
      </div>
      
      <div class="modal-body">
        <!-- 支付信息 -->
        <div class="payment-info">
          <div class="info-item">
            <span class="label">收款人：</span>
            <span class="value payee-name">{{ paymentInfo.payeeName }}</span>
          </div>
          <div class="info-item">
            <span class="label">支付金额：</span>
            <span class="value amount">¥{{ formatAmount(paymentInfo.amount) }}</span>
          </div>
          <div class="info-item">
            <span class="label">账单编号：</span>
            <span class="value bill-id">{{ paymentInfo.billId }}</span>
          </div>
          <div class="info-item">
            <span class="label">支付方式：</span>
            <span class="value payment-type">{{ paymentInfo.qrType === 'wechat' ? '微信支付' : '支付宝' }}</span>
          </div>
        </div>
        
        <!-- 二维码展示 -->
        <div class="qr-code-section">
          <div class="qr-code-container">
            <img 
              :src="paymentInfo.qrCode" 
              :alt="paymentInfo.qrType + '收款码'" 
              class="qr-image"
              @load="onImageLoad"
              @error="onImageError"
            >
            <div v-if="imageLoading" class="loading-overlay">
              <div class="loading-spinner"></div>
              <span>加载中...</span>
            </div>
            <div v-if="imageError" class="error-overlay">
              <i class="icon-error">⚠️</i>
              <span>二维码加载失败</span>
            </div>
          </div>
          
          <div class="qr-tips">
            <p class="qr-tip">
              请使用{{ paymentInfo.qrType === 'wechat' ? '微信' : '支付宝' }}扫描二维码完成支付
            </p>
            <p class="qr-hint">
              支付完成后请点击"我已支付"按钮确认
            </p>
          </div>
        </div>
        
        <!-- 支付状态 -->
        <div class="payment-status" v-if="paymentStatus">
          <div class="status-item" :class="statusClass">
            <i class="status-icon">{{ statusIcon }}</i>
            <span class="status-text">{{ statusText }}</span>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button 
          @click="confirmPayment" 
          class="confirm-btn"
          :disabled="!canConfirm || confirming"
        >
          <span v-if="!confirming">我已支付</span>
          <span v-else class="confirming-text">
            <i class="loading-icon">⏳</i>
            确认中...
          </span>
        </button>
        <button @click="close" class="cancel-btn">取消支付</button>
        
        <!-- 辅助操作 -->
        <div class="helper-actions">
          <button @click="refreshQRCode" class="refresh-btn" title="刷新二维码">
            <i class="icon-refresh">🔄</i>
          </button>
          <button @click="saveQRCode" class="save-btn" title="保存二维码">
            <i class="icon-save">💾</i>
          </button>
        </div>
      </div>
    </div>
    
    <!-- 支付成功提示 -->
    <div v-if="showSuccess" class="success-overlay">
      <div class="success-content">
        <div class="success-icon">✅</div>
        <h3>支付成功！</h3>
        <p>支付金额：¥{{ formatAmount(paymentInfo.amount) }}</p>
        <button @click="closeSuccess" class="success-btn">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { PaymentFlowManager } from '../utils/payment-code-manager';

// 定义props
const props = defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  paymentInfo: {
    type: Object,
    required: true,
    validator: value => {
      return value && 
             value.payeeName && 
             value.amount && 
             value.qrCode && 
             value.qrType;
    }
  }
});

// 定义emits
const emit = defineEmits(['update:visible', 'close', 'payment-success', 'payment-error', 'qr-saved', 'save-error']);

// 响应式数据
const imageLoading = ref(true);
const imageError = ref(false);
const confirming = ref(false);
const paymentStatus = ref(null);
const showSuccess = ref(false);
const paymentManager = ref(null);

// 计算属性
const canConfirm = computed(() => {
  return !imageLoading.value && !imageError.value && !confirming.value;
});

const statusClass = computed(() => {
  switch (paymentStatus.value) {
    case 'pending': return 'status-pending';
    case 'processing': return 'status-processing';
    case 'completed': return 'status-completed';
    case 'failed': return 'status-failed';
    default: return '';
  }
});

const statusIcon = computed(() => {
  switch (paymentStatus.value) {
    case 'pending': return '⏳';
    case 'processing': return '🔄';
    case 'completed': return '✅';
    case 'failed': return '❌';
    default: return '';
  }
});

const statusText = computed(() => {
  switch (paymentStatus.value) {
    case 'pending': return '等待支付';
    case 'processing': return '支付处理中';
    case 'completed': return '支付完成';
    case 'failed': return '支付失败';
    default: return '';
  }
});

// 监听器
watch(() => props.visible, (newVal) => {
  if (newVal) {
    resetState();
    paymentStatus.value = 'pending';
  }
});

// 方法
const resetState = () => {
  imageLoading.value = true;
  imageError.value = false;
  confirming.value = false;
  paymentStatus.value = null;
  showSuccess.value = false;
};

const onImageLoad = () => {
  imageLoading.value = false;
  imageError.value = false;
};

const onImageError = () => {
  imageLoading.value = false;
  imageError.value = true;
  paymentStatus.value = 'failed';
};

const confirmPayment = async () => {
  if (!canConfirm.value) return;
  
  confirming.value = true;
  paymentStatus.value = 'processing';
  
  try {
    // 调用支付完成确认
    const result = await paymentManager.value.completePayment(props.paymentInfo.paymentId);
    
    if (result.success) {
      paymentStatus.value = 'completed';
      showSuccess.value = true;
      
      // 发射支付成功事件
      emit('payment-success', {
        paymentId: props.paymentInfo.paymentId,
        amount: props.paymentInfo.amount,
        timestamp: new Date().toISOString()
      });
    } else {
      throw new Error(result.message || '支付确认失败');
    }
    
  } catch (error) {
    console.error('支付确认失败:', error);
    paymentStatus.value = 'failed';
    emit('payment-error', error);
  } finally {
    confirming.value = false;
  }
};

const close = () => {
  emit('update:visible', false);
  emit('close');
};

const closeSuccess = () => {
  showSuccess.value = false;
  close();
};

const refreshQRCode = () => {
  imageLoading.value = true;
  imageError.value = false;
  
  // 模拟刷新二维码（实际项目中可能需要重新获取）
  const img = new Image();
  img.onload = () => {
    imageLoading.value = false;
    imageError.value = false;
  };
  img.onerror = () => {
    imageLoading.value = false;
    imageError.value = true;
  };
  img.src = props.paymentInfo.qrCode;
};

const saveQRCode = () => {
  try {
    const link = document.createElement('a');
    link.href = props.paymentInfo.qrCode;
    link.download = `payment_qr_${props.paymentInfo.billId}.png`;
    link.click();
    
    emit('qr-saved', {
      billId: props.paymentInfo.billId,
      fileName: link.download
    });
    
  } catch (error) {
    console.error('保存二维码失败:', error);
    emit('save-error', error);
  }
};

const formatAmount = (amount) => {
  return parseFloat(amount).toFixed(2);
};

// 生命周期钩子
onMounted(() => {
  paymentManager.value = new PaymentFlowManager();
});
</script>

<style scoped>
.payment-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 500px;
  width: 90vw;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #ebeef5;
}

.modal-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.close-btn {
  border: none;
  background: none;
  font-size: 24px;
  cursor: pointer;
  color: #909399;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.3s;
}

.close-btn:hover {
  color: #606266;
  background: #f5f7fa;
}

.modal-body {
  padding: 24px;
}

.payment-info {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.label {
  font-weight: 500;
  color: #606266;
  font-size: 14px;
}

.value {
  font-weight: 600;
  color: #303133;
}

.payee-name {
  color: #409eff;
}

.amount {
  color: #f56c6c;
  font-size: 18px;
}

.bill-id {
  font-family: 'Courier New', monospace;
  background: #f0f2f5;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.payment-type {
  color: #67c23a;
}

.qr-code-section {
  text-align: center;
  margin-bottom: 20px;
}

.qr-code-container {
  position: relative;
  display: inline-block;
  margin-bottom: 16px;
}

.qr-image {
  max-width: 200px;
  max-height: 200px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.loading-overlay,
.error-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 8px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-overlay {
  color: #f56c6c;
}

.qr-tips {
  text-align: center;
}

.qr-tip {
  font-size: 14px;
  color: #606266;
  margin-bottom: 4px;
}

.qr-hint {
  font-size: 12px;
  color: #909399;
}

.payment-status {
  margin-top: 16px;
}

.status-item {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
}

.status-pending {
  background: #f0f9ff;
  color: #409eff;
}

.status-processing {
  background: #f0f9ff;
  color: #409eff;
}

.status-completed {
  background: #f0f9eb;
  color: #67c23a;
}

.status-failed {
  background: #fef0f0;
  color: #f56c6c;
}

.status-icon {
  margin-right: 8px;
  font-size: 16px;
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.confirm-btn {
  padding: 10px 24px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 100px;
}

.confirm-btn:hover:not(:disabled) {
  background: #66b1ff;
  transform: translateY(-1px);
}

.confirm-btn:disabled {
  background: #c0c4cc;
  cursor: not-allowed;
  transform: none;
}

.confirming-text {
  display: flex;
  align-items: center;
  gap: 8px;
}

.loading-icon {
  animation: spin 1s linear infinite;
}

.cancel-btn {
  padding: 10px 20px;
  background: white;
  color: #606266;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s;
}

.cancel-btn:hover {
  border-color: #c0c4cc;
  background: #f5f7fa;
}

.helper-actions {
  display: flex;
  gap: 8px;
}

.refresh-btn,
.save-btn {
  padding: 8px;
  background: white;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
}

.refresh-btn:hover,
.save-btn:hover {
  border-color: #409eff;
  background: #f0f7ff;
}

.success-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}

.success-content {
  background: white;
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  max-width: 300px;
}

.success-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.success-content h3 {
  margin: 0 0 8px 0;
  color: #67c23a;
}

.success-content p {
  margin: 0 0 20px 0;
  color: #606266;
}

.success-btn {
  padding: 8px 20px;
  background: #67c23a;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.3s;
}

.success-btn:hover {
  background: #85ce61;
}

@media (max-width: 768px) {
  .modal-content {
    width: 95vw;
    margin: 20px;
  }
  
  .modal-header {
    padding: 16px 20px;
  }
  
  .modal-body {
    padding: 20px;
  }
  
  .modal-footer {
    padding: 16px 20px;
    flex-direction: column;
    gap: 12px;
  }
  
  .helper-actions {
    order: -1;
    align-self: stretch;
    justify-content: center;
  }
  
  .qr-image {
    max-width: 150px;
    max-height: 150px;
  }
}
</style>