<template>
  <div class="qr-uploader">
    <div class="upload-area" @click="triggerUpload" :class="{ 'has-image': currentImage }">
      <input 
        ref="fileInput" 
        type="file" 
        accept="image/*" 
        @change="handleFileSelect" 
        style="display: none"
      >
      <div v-if="!currentImage" class="upload-placeholder">
        <div class="upload-icon">
          <i class="icon-camera">📷</i>
        </div>
        <p class="upload-text">点击上传{{ qrType === 'wechat' ? '微信' : '支付宝' }}收款码</p>
        <p class="upload-hint">支持PNG、JPG格式，最大5MB</p>
      </div>
      <div v-else class="image-preview">
        <div class="preview-container">
          <img :src="currentImage" :alt="qrType + '收款码'" class="preview-image">
          <div class="preview-overlay">
            <button @click.stop="removeImage" class="remove-btn" title="删除图片">
              <i class="icon-delete">🗑️</i>
            </button>
            <button @click.stop="viewImage" class="view-btn" title="查看大图">
              <i class="icon-zoom">🔍</i>
            </button>
          </div>
        </div>
        <div class="image-info">
          <span class="file-name">{{ fileName }}</span>
          <span class="file-size">{{ fileSize }}</span>
        </div>
      </div>
    </div>
    
    <div v-if="error" class="error-message">
      <i class="icon-error">⚠️</i>
      <span>{{ error }}</span>
    </div>
    
    <div v-if="uploading" class="upload-progress">
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progress + '%' }"></div>
      </div>
      <span class="progress-text">上传中... {{ progress }}%</span>
    </div>
    
    <!-- 图片预览模态框 -->
    <div v-if="showPreview" class="image-preview-modal" @click="closePreview">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>{{ qrType === 'wechat' ? '微信' : '支付宝' }}收款码预览</h3>
          <button @click="closePreview" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <img :src="currentImage" alt="收款码预览" class="preview-image-large">
        </div>
        <div class="modal-footer">
          <button @click="closePreview" class="btn-secondary">关闭</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { LocalStorageManager, PaymentCodeValidator } from '../utils/payment-code-manager'

const props = defineProps({
  qrType: {
    type: String,
    required: true,
    validator: value => ['wechat', 'alipay'].includes(value)
  },
  userId: {
    type: String,
    required: true
  },
  value: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['input', 'upload-success', 'upload-error', 'remove-success', 'remove-error'])

const currentImage = ref(null)
const fileName = ref('')
const fileSize = ref('')
const error = ref(null)
const uploading = ref(false)
const progress = ref(0)
const showPreview = ref(false)
const fileInput = ref(null)
const storageManager = ref(null)
const validator = ref(null)

// 监听value变化
watch(() => props.value, (newVal) => {
  if (newVal && newVal.imageData) {
    loadExistingImage(newVal.imageData);
  }
}, { immediate: true })

// 组件挂载时初始化
onMounted(() => {
  storageManager.value = new LocalStorageManager();
  validator.value = new PaymentCodeValidator();
  
  // 加载现有图片
  loadExistingImageFromStorage();
})

// 方法定义
const loadExistingImageFromStorage = async () => {
  try {
    const imageData = await storageManager.value.getPaymentCode(props.userId, props.qrType);
    if (imageData) {
      currentImage.value = URL.createObjectURL(new Blob([imageData]));
      
      // 获取元数据
      const metadata = await storageManager.value.getMetadata(props.userId, props.qrType);
      if (metadata) {
        fileName.value = `${props.qrType}_qr.png`;
        fileSize.value = formatFileSize(metadata.fileSize);
      }
      
      emit('input', {
        type: props.qrType,
        imageData: imageData,
        metadata: metadata
      });
    }
  } catch (error) {
    console.error('加载现有图片失败:', error);
  }
}

const loadExistingImage = (imageData) => {
  if (imageData) {
    currentImage.value = URL.createObjectURL(new Blob([imageData]));
  }
}

const triggerUpload = () => {
  if (!uploading.value) {
    fileInput.value.click();
  }
}

const handleFileSelect = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  error.value = null;
  uploading.value = true;
  progress.value = 0;
  
  try {
    // 模拟上传进度
    const progressInterval = setInterval(() => {
      progress.value = Math.min(progress.value + 10, 90);
    }, 100);
    
    // 读取文件
    const fileData = await readFile(file);
    
    // 验证文件
    await validator.value.validatePaymentCode(fileData, props.qrType);
    
    // 保存到本地存储
    await storageManager.value.savePaymentCode(props.userId, props.qrType, fileData);
    
    clearInterval(progressInterval);
    progress.value = 100;
    
    // 更新预览
    currentImage.value = URL.createObjectURL(file);
    fileName.value = file.name;
    fileSize.value = formatFileSize(file.size);
    
    // 获取元数据
    const metadata = await storageManager.value.getMetadata(props.userId, props.qrType);
    
    // 发射成功事件
    emit('upload-success', {
      type: props.qrType,
      file: file,
      imageData: fileData,
      metadata: metadata
    });
    
    emit('input', {
      type: props.qrType,
      imageData: fileData,
      metadata: metadata
    });
    
    // 重置上传状态
    setTimeout(() => {
      uploading.value = false;
      progress.value = 0;
    }, 500);
    
  } catch (err) {
    error.value = err.message;
    uploading.value = false;
    progress.value = 0;
    emit('upload-error', err);
  }
}

const readFile = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

const removeImage = async () => {
  try {
    await storageManager.value.deletePaymentCode(props.userId, props.qrType);
    
    currentImage.value = null;
    fileName.value = '';
    fileSize.value = '';
    
    emit('remove-success', props.qrType);
    emit('input', null);
    
  } catch (err) {
    error.value = '删除失败：' + err.message;
    emit('remove-error', err);
  }
}

const viewImage = () => {
  showPreview.value = true;
}

const closePreview = () => {
  showPreview.value = false;
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 清理URL对象
onUnmounted(() => {
  if (currentImage.value) {
    URL.revokeObjectURL(currentImage.value);
  }
})
</script>
</script>

<style scoped>
.qr-uploader {
  width: 100%;
  max-width: 300px;
}

.upload-area {
  border: 2px dashed #dcdfe6;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: #fafafa;
}

.upload-area:hover {
  border-color: #409eff;
  background-color: #f0f7ff;
}

.upload-area.has-image {
  border-style: solid;
  border-color: #67c23a;
  background-color: #f0f9ff;
}

.upload-placeholder {
  color: #909399;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.upload-text {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
}

.upload-hint {
  font-size: 12px;
  color: #c0c4cc;
}

.image-preview {
  position: relative;
}

.preview-container {
  position: relative;
  margin-bottom: 12px;
}

.preview-image {
  max-width: 100%;
  max-height: 200px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.preview-overlay {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 8px;
}

.remove-btn, .view-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s;
}

.remove-btn:hover {
  background: #f56c6c;
}

.view-btn:hover {
  background: #409eff;
}

.image-info {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #606266;
}

.file-name {
  font-weight: 500;
}

.file-size {
  color: #909399;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 12px;
  background: #fef0f0;
  border: 1px solid #fbc4c4;
  border-radius: 4px;
  color: #f56c6c;
  font-size: 14px;
}

.upload-progress {
  margin-top: 12px;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #ebeef5;
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #409eff, #67c23a);
  transition: width 0.3s;
}

.progress-text {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
  text-align: center;
}

.image-preview-modal {
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
  border-radius: 8px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #ebeef5;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 500;
}

.close-btn {
  border: none;
  background: none;
  font-size: 24px;
  cursor: pointer;
  color: #909399;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #606266;
}

.modal-body {
  padding: 20px;
  text-align: center;
}

.preview-image-large {
  max-width: 100%;
  max-height: 60vh;
  border-radius: 4px;
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid #ebeef5;
  text-align: right;
}

.btn-secondary {
  padding: 8px 16px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: white;
  color: #606266;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-secondary:hover {
  border-color: #c0c4cc;
  background: #f5f7fa;
}

@media (max-width: 768px) {
  .qr-uploader {
    max-width: 100%;
  }
  
  .upload-area {
    padding: 16px;
  }
  
  .upload-icon {
    font-size: 36px;
  }
  
  .upload-text {
    font-size: 14px;
  }
}
</style>