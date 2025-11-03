<template>
  <div class="qr-code-management">
    <div class="page-header">
      <h1>收款码管理</h1>
      <p>管理您的微信和支付宝收款码</p>
    </div>

    <!-- 上传收款码区域 -->
    <div class="upload-section">
      <div class="upload-card">
        <h2>上传收款码</h2>
        <div class="upload-form">
          <div class="form-group">
            <label for="qr-type">收款码类型</label>
            <select id="qr-type" v-model="qrType" class="form-control">
              <option value="">请选择收款码类型</option>
              <option value="wechat">微信收款码</option>
              <option value="alipay">支付宝收款码</option>
            </select>
          </div>
          <div class="form-group">
            <label for="qr-image">收款码图片</label>
            <div class="file-upload" @click="triggerFileInput">
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                @change="handleFileChange"
                style="display: none"
              />
              <div v-if="!selectedFile" class="upload-placeholder">
                <i class="upload-icon">📷</i>
                <p>点击选择图片</p>
                <small>支持JPG、PNG格式，大小不超过5MB</small>
              </div>
              <div v-else class="file-preview">
                <img :src="previewUrl" alt="收款码预览" />
                <button @click.stop="clearFile" class="clear-btn">×</button>
              </div>
            </div>
          </div>
          <button
            @click="uploadQrCode"
            :disabled="!qrType || !selectedFile || uploading"
            class="btn btn-primary"
          >
            {{ uploading ? '上传中...' : '上传收款码' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 收款码列表 -->
    <div class="qr-codes-list">
      <h2>我的收款码</h2>
      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="qrCodes.length === 0" class="empty-state">
        <p>您还没有上传任何收款码</p>
      </div>
      <div v-else class="qr-codes-grid">
        <div
          v-for="qrCode in qrCodes"
          :key="qrCode.id"
          class="qr-code-card"
          :class="{ inactive: !qrCode.is_active }"
        >
          <div class="qr-code-image">
            <img :src="qrCode.qr_image_url" :alt="qrCode.qr_type" />
            <div v-if="!qrCode.is_active" class="inactive-overlay">
              <span>已停用</span>
            </div>
          </div>
          <div class="qr-code-info">
            <div class="qr-type">
              <span class="type-label">{{ getQrTypeLabel(qrCode.qr_type) }}</span>
              <span v-if="qrCode.is_default" class="default-badge">默认</span>
            </div>
            <div class="qr-status">
              <span :class="['status', qrCode.is_active ? 'active' : 'inactive']">
                {{ qrCode.is_active ? '已激活' : '已停用' }}
              </span>
            </div>
            <div class="qr-date">
              创建于: {{ formatDate(qrCode.created_at) }}
            </div>
          </div>
          <div class="qr-code-actions">
            <button
              @click="toggleQrCodeStatus(qrCode.id, !qrCode.is_active)"
              :class="['btn', qrCode.is_active ? 'btn-warning' : 'btn-success']"
            >
              {{ qrCode.is_active ? '停用' : '激活' }}
            </button>
            <button
              @click="setDefaultQrCode(qrCode.id)"
              :disabled="qrCode.is_default"
              class="btn btn-outline"
            >
              设为默认
            </button>
            <button
              @click="confirmDeleteQrCode(qrCode.id)"
              class="btn btn-danger"
            >
              删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 确认删除对话框 -->
    <div v-if="showDeleteDialog" class="modal-overlay" @click="closeDeleteDialog">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>确认删除</h3>
          <button @click="closeDeleteDialog" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <p>确定要删除这个收款码吗？此操作不可恢复。</p>
        </div>
        <div class="modal-footer">
          <button @click="closeDeleteDialog" class="btn btn-outline">取消</button>
          <button @click="deleteQrCode" class="btn btn-danger">删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { getUserQrCodes, uploadQrCode as uploadQrCodeApi, toggleQrCodeStatus as toggleQrCodeStatusApi, setDefaultQrCode as setDefaultQrCodeApi, deleteQrCode as deleteQrCodeApi } from '@/api/qr-codes';

export default {
  name: 'QrCodeManagement',
  setup() {
    const qrCodes = ref([]);
    const loading = ref(true);
    const qrType = ref('');
    const selectedFile = ref(null);
    const previewUrl = ref('');
    const uploading = ref(false);
    const fileInput = ref(null);
    const showDeleteDialog = ref(false);
    const qrCodeToDelete = ref(null);

    // 获取收款码列表
    const fetchQrCodes = async () => {
      try {
        loading.value = true;
        const response = await getUserQrCodes();
        if (response.success) {
          qrCodes.value = response.data.qr_codes;
        } else {
          console.error('获取收款码列表失败:', response.message);
        }
      } catch (error) {
        console.error('获取收款码列表失败:', error);
      } finally {
        loading.value = false;
      }
    };

    // 触发文件选择
    const triggerFileInput = () => {
      fileInput.value.click();
    };

    // 处理文件选择
    const handleFileChange = (event) => {
      const file = event.target.files[0];
      if (file) {
        // 验证文件类型
        if (!file.type.match(/image.*/)) {
          alert('请选择图片文件');
          return;
        }

        // 验证文件大小
        if (file.size > 5 * 1024 * 1024) {
          alert('图片大小不能超过5MB');
          return;
        }

        selectedFile.value = file;
        previewUrl.value = URL.createObjectURL(file);
      }
    };

    // 清除选择的文件
    const clearFile = () => {
      selectedFile.value = null;
      previewUrl.value = '';
      fileInput.value.value = '';
    };

    // 上传收款码
    const uploadQrCode = async () => {
      if (!qrType.value || !selectedFile.value) {
        alert('请选择收款码类型和上传图片');
        return;
      }

      try {
        uploading.value = true;
        const formData = new FormData();
        formData.append('qr_image', selectedFile.value);
        formData.append('qr_type', qrType.value);

        const response = await uploadQrCodeApi(formData);
        if (response.success) {
          alert('收款码上传成功');
          clearFile();
          qrType.value = '';
          await fetchQrCodes();
        } else {
          alert('上传失败: ' + response.message);
        }
      } catch (error) {
        console.error('上传收款码失败:', error);
        alert('上传失败，请重试');
      } finally {
        uploading.value = false;
      }
    };

    // 切换收款码状态
    const toggleQrCodeStatus = async (id, isActive) => {
      try {
        const response = await toggleQrCodeStatusApi(id, isActive);
        if (response.success) {
          await fetchQrCodes();
        } else {
          alert('操作失败: ' + response.message);
        }
      } catch (error) {
        console.error('更新收款码状态失败:', error);
        alert('操作失败，请重试');
      }
    };

    // 设置默认收款码
    const setDefaultQrCode = async (id) => {
      try {
        const response = await setDefaultQrCodeApi(id);
        if (response.success) {
          await fetchQrCodes();
        } else {
          alert('设置失败: ' + response.message);
        }
      } catch (error) {
        console.error('设置默认收款码失败:', error);
        alert('设置失败，请重试');
      }
    };

    // 确认删除收款码
    const confirmDeleteQrCode = (id) => {
      qrCodeToDelete.value = id;
      showDeleteDialog.value = true;
    };

    // 关闭删除对话框
    const closeDeleteDialog = () => {
      showDeleteDialog.value = false;
      qrCodeToDelete.value = null;
    };

    // 删除收款码
    const deleteQrCode = async () => {
      if (!qrCodeToDelete.value) return;

      try {
        const response = await deleteQrCodeApi(qrCodeToDelete.value);
        if (response.success) {
          await fetchQrCodes();
          closeDeleteDialog();
        } else {
          alert('删除失败: ' + response.message);
        }
      } catch (error) {
        console.error('删除收款码失败:', error);
        alert('删除失败，请重试');
      }
    };

    // 获取收款码类型标签
    const getQrTypeLabel = (type) => {
      return type === 'wechat' ? '微信收款码' : '支付宝收款码';
    };

    // 格式化日期
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    };

    // 组件挂载时获取收款码列表
    onMounted(() => {
      fetchQrCodes();
    });

    return {
      qrCodes,
      loading,
      qrType,
      selectedFile,
      previewUrl,
      uploading,
      fileInput,
      showDeleteDialog,
      qrCodeToDelete,
      triggerFileInput,
      handleFileChange,
      clearFile,
      uploadQrCode,
      toggleQrCodeStatus,
      setDefaultQrCode,
      confirmDeleteQrCode,
      closeDeleteDialog,
      deleteQrCode,
      getQrTypeLabel,
      formatDate
    };
  }
};
</script>

<style scoped>
.qr-code-management {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 30px;
  text-align: center;
}

.page-header h1 {
  margin-bottom: 10px;
  color: #333;
}

.page-header p {
  color: #666;
}

.upload-section {
  margin-bottom: 40px;
}

.upload-card {
  background: #fff;
  border-radius: 8px;
  padding: 25px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.upload-card h2 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #333;
}

.upload-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-weight: 500;
  color: #333;
}

.form-control {
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.file-upload {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.3s;
}

.file-upload:hover {
  border-color: #4a90e2;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.upload-icon {
  font-size: 48px;
}

.upload-placeholder p {
  margin: 0;
  font-weight: 500;
}

.upload-placeholder small {
  color: #666;
}

.file-preview {
  position: relative;
  display: inline-block;
}

.file-preview img {
  max-width: 200px;
  max-height: 200px;
  border-radius: 4px;
}

.clear-btn {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f44336;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  line-height: 1;
}

.btn {
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.3s;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background-color: #4a90e2;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #3a80d2;
}

.btn-success {
  background-color: #4caf50;
  color: white;
}

.btn-success:hover {
  background-color: #45a049;
}

.btn-warning {
  background-color: #ff9800;
  color: white;
}

.btn-warning:hover {
  background-color: #e68900;
}

.btn-danger {
  background-color: #f44336;
  color: white;
}

.btn-danger:hover {
  background-color: #e53935;
}

.btn-outline {
  background-color: transparent;
  border: 1px solid #4a90e2;
  color: #4a90e2;
}

.btn-outline:hover:not(:disabled) {
  background-color: #f0f7ff;
}

.qr-codes-list h2 {
  margin-bottom: 20px;
  color: #333;
}

.loading, .empty-state {
  text-align: center;
  padding: 40px;
  color: #666;
}

.qr-codes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.qr-code-card {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  transition: transform 0.3s, box-shadow 0.3s;
}

.qr-code-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.qr-code-card.inactive {
  opacity: 0.7;
}

.qr-code-image {
  position: relative;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9f9f9;
}

.qr-code-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.inactive-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 500;
}

.qr-code-info {
  padding: 15px;
}

.qr-type {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.type-label {
  font-weight: 500;
  color: #333;
}

.default-badge {
  background: #4caf50;
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.qr-status {
  margin-bottom: 8px;
}

.status {
  font-size: 14px;
  padding: 2px 8px;
  border-radius: 12px;
}

.status.active {
  background: #e8f5e9;
  color: #4caf50;
}

.status.inactive {
  background: #ffebee;
  color: #f44336;
}

.qr-date {
  font-size: 12px;
  color: #666;
}

.qr-code-actions {
  padding: 0 15px 15px;
  display: flex;
  gap: 10px;
}

.qr-code-actions .btn {
  flex: 1;
  padding: 8px 10px;
  font-size: 14px;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  overflow: hidden;
}

.modal-header {
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #999;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  padding: 15px 20px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 768px) {
  .qr-codes-grid {
    grid-template-columns: 1fr;
  }
  
  .qr-code-actions {
    flex-direction: column;
  }
}
</style>