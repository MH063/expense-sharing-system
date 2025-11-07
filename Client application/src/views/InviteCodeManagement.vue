<template>
  <div class="invite-code-container" v-if="canManageInviteCodes">
    <div class="page-header">
      <h1>邀请码管理</h1>
      <div class="header-actions" v-if="canManageInviteCodes">
        <button class="primary-button" @click="showCreateModal = true">
          生成邀请码
        </button>
      </div>
    </div>

    <!-- 房间选择 -->
    <div class="room-selector" v-if="rooms.length > 0">
      <label for="room-select">选择房间:</label>
      <select id="room-select" v-model="selectedRoomId" @change="loadInviteCodes">
        <option value="">请选择房间</option>
        <option v-for="room in rooms" :key="room.id" :value="room.id">
          {{ room.name }}
        </option>
      </select>
    </div>

    <!-- 邀请码列表 -->
    <div class="invite-codes-list" v-if="selectedRoomId && inviteCodes.length > 0">
      <div v-for="code in inviteCodes" :key="code.id" class="invite-code-card">
        <div class="code-header">
          <div class="code-info">
            <h3>{{ code.code }}</h3>
            <div class="code-meta">
              <span class="created-date">创建于: {{ formatDate(code.created_at) }}</span>
              <span class="expires-date" :class="{ 'expired': isExpired(code.expires_at) }">
                过期时间: {{ formatDate(code.expires_at) }}
              </span>
            </div>
          </div>
          <div class="code-status">
            <div class="status-badge" :class="getStatusClass(code)">
              {{ getStatusText(code) }}
            </div>
          </div>
        </div>

        <div class="code-details">
          <div class="detail-row">
            <span class="label">使用次数:</span>
            <span class="value">{{ code.used_count || code.actual_used_count || 0 }} / {{ code.max_uses }}</span>
          </div>
          <div class="detail-row">
            <span class="label">剩余次数:</span>
            <span class="value">{{ getRemainingUses(code) }}</span>
          </div>
        </div>

        <div class="code-actions" v-if="canManageInviteCodes">
          <button class="copy-btn" @click="copyToClipboard(code.code)">
            复制邀请码
          </button>
          <button 
            class="revoke-btn" 
            @click="confirmRevoke(code)"
            :disabled="isExpired(code.expires_at)"
          >
            撤销邀请码
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else-if="selectedRoomId" class="empty-state">
      <div class="empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="10" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0110 0v4"></path>
        </svg>
      </div>
      <h2>暂无邀请码</h2>
      <p>该房间还没有生成任何邀请码</p>
      <button class="primary-button" @click="showCreateModal = true" v-if="canManageInviteCodes">
        生成邀请码
      </button>
    </div>

    <div v-else class="room-empty">
      <h2>请选择一个房间</h2>
      <p>您需要先选择一个房间才能管理邀请码</p>
    </div>

    <!-- 创建邀请码模态框 -->
    <div v-if="showCreateModal" class="modal-overlay" @click="closeCreateModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>生成邀请码</h2>
          <button class="close-btn" @click="closeCreateModal">×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label for="room-select-modal">房间:</label>
            <select id="room-select-modal" v-model="newCode.roomId" required>
              <option value="">请选择房间</option>
              <option v-for="room in rooms" :key="room.id" :value="room.id">
                {{ room.name }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="max-uses">最大使用次数:</label>
            <input 
              type="number" 
              id="max-uses" 
              v-model.number="newCode.maxUses" 
              min="1" 
              max="100"
              required
            />
          </div>
          
          <div class="form-group">
            <label for="expires-at">过期时间:</label>
            <input 
              type="datetime-local" 
              id="expires-at" 
              v-model="newCode.expiresAt"
              :min="minDateTime"
            />
            <small>留空则默认为7天后过期</small>
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="secondary-button" @click="closeCreateModal">取消</button>
          <button class="primary-button" @click="createInviteCode" :disabled="!isFormValid">
            生成邀请码
          </button>
        </div>
      </div>
    </div>

    <!-- 撤销确认模态框 -->
    <div v-if="showRevokeModal" class="modal-overlay" @click="closeRevokeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>撤销邀请码</h2>
          <button class="close-btn" @click="closeRevokeModal">×</button>
        </div>
        
        <div class="modal-body">
          <p>确定要撤销邀请码 <strong>{{ selectedCode?.code }}</strong> 吗？</p>
          <p>撤销后，该邀请码将立即失效，无法再用于加入房间。</p>
        </div>
        
        <div class="modal-footer">
          <button class="secondary-button" @click="closeRevokeModal">取消</button>
          <button class="danger-button" @click="revokeInviteCode">确认撤销</button>
        </div>
      </div>
    </div>
  </div>
  
  <!-- 无权限访问时的提示 -->
  <div v-else class="no-permission-container">
    <div class="no-permission-icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      </svg>
    </div>
    <h2>无权限访问</h2>
    <p>您没有权限管理邀请码，请联系寝室长或管理员</p>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { inviteCodesApi } from '@/api';
import { roomsApi } from '@/api';
import { useAuthStore } from '@/stores/auth';
import { PERMISSIONS } from '@/utils/permissions';

export default {
  name: 'InviteCodeManagement',
  setup() {
    const store = useStore();
    const router = useRouter();
    const authStore = useAuthStore();
    
    const rooms = ref([]);
    const selectedRoomId = ref('');
    const inviteCodes = ref([]);
    const loading = ref(false);
    const showCreateModal = ref(false);
    const showRevokeModal = ref(false);
    const selectedCode = ref(null);
    
    const newCode = ref({
      roomId: '',
      maxUses: 10,
      expiresAt: ''
    });
    
    // 权限控制
    const canManageInviteCodes = computed(() => {
      return authStore.checkPermission(PERMISSIONS.ROOM_INVITE);
    });
    
    // 权限检查函数
    const checkPermission = (permission) => {
      return authStore.checkPermission(permission);
    };
    
    // 计算属性
    const minDateTime = computed(() => {
      const now = new Date();
      now.setDate(now.getDate() + 1);
      return now.toISOString().slice(0, 16);
    });
    
    const isFormValid = computed(() => {
      return newCode.value.roomId && newCode.value.maxUses > 0;
    });
    
    // 加载用户管理的房间列表
    const loadRooms = async () => {
      try {
        const response = await roomsApi.getUserRooms();
        if (response.data.success) {
          rooms.value = response.data.data.rooms;
        }
      } catch (error) {
        console.error('加载房间列表失败:', error);
      }
    };
    
    // 加载邀请码列表
    const loadInviteCodes = async () => {
      if (!selectedRoomId.value) return;
      
      // 检查权限
      if (!checkPermission(PERMISSIONS.ROOM_VIEW)) {
        store.dispatch('showNotification', {
          message: '您没有权限查看邀请码',
          type: 'error'
        });
        return;
      }
      
      loading.value = true;
      try {
        const response = await inviteCodesApi.getRoomInviteCodes(selectedRoomId.value);
        if (response.data.success) {
          inviteCodes.value = response.data.data;
        }
      } catch (error) {
        console.error('加载邀请码列表失败:', error);
      } finally {
        loading.value = false;
      }
    };
    
    // 创建邀请码
    const createInviteCode = async () => {
      // 检查权限
      if (!checkPermission(PERMISSIONS.ROOM_INVITE)) {
        store.dispatch('showNotification', {
          message: '您没有权限生成邀请码',
          type: 'error'
        });
        return;
      }
      
      try {
        const response = await inviteCodesApi.generateInviteCode(newCode.value);
        if (response.data.success) {
          // 添加到列表
          inviteCodes.value.unshift(response.data.data);
          closeCreateModal();
          
          // 重置表单
          newCode.value = {
            roomId: '',
            maxUses: 10,
            expiresAt: ''
          };
          
          // 显示成功消息
          store.dispatch('showNotification', {
            message: '邀请码生成成功',
            type: 'success'
          });
        }
      } catch (error) {
        console.error('生成邀请码失败:', error);
        store.dispatch('showNotification', {
          message: '生成邀请码失败',
          type: 'error'
        });
      }
    };
    
    // 撤销邀请码
    const revokeInviteCode = async () => {
      if (!selectedCode.value) return;
      
      // 检查权限
      if (!checkPermission(PERMISSIONS.ROOM_INVITE)) {
        store.dispatch('showNotification', {
          message: '您没有权限撤销邀请码',
          type: 'error'
        });
        return;
      }
      
      try {
        const response = await inviteCodesApi.revokeInviteCode(selectedCode.value.id);
        if (response.data.success) {
          // 更新列表中的状态
          const index = inviteCodes.value.findIndex(code => code.id === selectedCode.value.id);
          if (index !== -1) {
            inviteCodes.value[index].expires_at = new Date().toISOString();
          }
          
          closeRevokeModal();
          
          // 显示成功消息
          store.dispatch('showNotification', {
            message: '邀请码已撤销',
            type: 'success'
          });
        }
      } catch (error) {
        console.error('撤销邀请码失败:', error);
        store.dispatch('showNotification', {
          message: '撤销邀请码失败',
          type: 'error'
        });
      }
    };
    
    // 复制到剪贴板
    const copyToClipboard = (code) => {
      navigator.clipboard.writeText(code)
        .then(() => {
          store.dispatch('showNotification', {
            message: '邀请码已复制到剪贴板',
            type: 'success'
          });
        })
        .catch(() => {
          store.dispatch('showNotification', {
            message: '复制失败，请手动复制',
            type: 'error'
          });
        });
    };
    
    // 关闭创建模态框
    const closeCreateModal = () => {
      showCreateModal.value = false;
      newCode.value.roomId = selectedRoomId.value;
    };
    
    // 关闭撤销模态框
    const closeRevokeModal = () => {
      showRevokeModal.value = false;
      selectedCode.value = null;
    };
    
    // 确认撤销
    const confirmRevoke = (code) => {
      selectedCode.value = code;
      showRevokeModal.value = true;
    };
    
    // 辅助方法
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN');
    };
    
    const isExpired = (dateString) => {
      return new Date() > new Date(dateString);
    };
    
    const getStatusClass = (code) => {
      if (isExpired(code.expires_at)) return 'expired';
      if ((code.used_count || code.actual_used_count || 0) >= code.max_uses) return 'used-up';
      return 'active';
    };
    
    const getStatusText = (code) => {
      if (isExpired(code.expires_at)) return '已过期';
      if ((code.used_count || code.actual_used_count || 0) >= code.max_uses) return '已用完';
      return '有效';
    };
    
    const getRemainingUses = (code) => {
      const used = code.used_count || code.actual_used_count || 0;
      return Math.max(0, code.max_uses - used);
    };
    
    onMounted(() => {
      loadRooms();
      newCode.value.roomId = selectedRoomId.value;
    });
    
    return {
      rooms,
      selectedRoomId,
      inviteCodes,
      loading,
      showCreateModal,
      showRevokeModal,
      selectedCode,
      newCode,
      minDateTime,
      isFormValid,
      canManageInviteCodes,
      loadInviteCodes,
      createInviteCode,
      revokeInviteCode,
      copyToClipboard,
      closeCreateModal,
      closeRevokeModal,
      confirmRevoke,
      formatDate,
      isExpired,
      getStatusClass,
      getStatusText,
      getRemainingUses
    };
  }
};
</script>

<style scoped>
.invite-code-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-header h1 {
  margin: 0;
  color: #333;
}

.header-actions {
  display: flex;
  gap: 15px;
}

.room-selector {
  margin-bottom: 30px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.room-selector label {
  color: #666;
}

.room-selector select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  min-width: 200px;
}

.invite-codes-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.invite-code-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.code-info h3 {
  margin: 0 0 5px 0;
  color: #333;
  font-family: monospace;
  font-size: 18px;
}

.code-meta {
  display: flex;
  flex-direction: column;
  gap: 5px;
  color: #666;
  font-size: 14px;
}

.expires-date.expired {
  color: #c62828;
}

.code-status {
  text-align: right;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.status-badge.active {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-badge.expired {
  background: #ffebee;
  color: #c62828;
}

.status-badge.used-up {
  background: #fff3e0;
  color: #f57c00;
}

.code-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 15px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
}

.label {
  color: #666;
  font-size: 14px;
}

.value {
  color: #333;
  font-weight: 500;
}

.code-actions {
  display: flex;
  gap: 10px;
}

.copy-btn, .revoke-btn {
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  border: 1px solid;
}

.copy-btn {
  background: #f5f5f5;
  color: #333;
  border-color: #ddd;
}

.copy-btn:hover {
  background: #e0e0e0;
}

.revoke-btn {
  background: #fff;
  color: #c62828;
  border-color: #c62828;
}

.revoke-btn:hover:not(:disabled) {
  background: #ffebee;
}

.revoke-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4CAF50;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state, .room-empty {
  text-align: center;
  padding: 40px;
}

.empty-icon {
  color: #ccc;
  margin-bottom: 20px;
}

.empty-state h2, .room-empty h2 {
  color: #333;
  margin-bottom: 10px;
}

.empty-state p, .room-empty p {
  color: #666;
  margin-bottom: 20px;
}

.primary-button {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.primary-button:hover {
  background: #45a049;
}

.secondary-button {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.secondary-button:hover {
  background: #e0e0e0;
}

.danger-button {
  background: #c62828;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.danger-button:hover {
  background: #b71c1c;
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
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #666;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
}

.form-group input, .form-group select {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.form-group small {
  display: block;
  margin-top: 5px;
  color: #666;
  font-size: 14px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid #eee;
}

/* 无权限访问样式 */
.no-permission-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.no-permission-icon {
  color: #ccc;
  margin-bottom: 20px;
}

.no-permission-container h2 {
  color: #333;
  margin-bottom: 10px;
}

.no-permission-container p {
  color: #666;
  max-width: 500px;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .room-selector {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .code-header {
    flex-direction: column;
    gap: 10px;
  }
  
  .code-status {
    text-align: left;
  }
  
  .code-actions {
    flex-direction: column;
  }
  
  .modal-content {
    width: 95%;
  }
}
</style>