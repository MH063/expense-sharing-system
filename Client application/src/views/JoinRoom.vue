<template>
  <div class="join-room-container">
    <div class="join-card">
      <div class="join-header">
        <h1>加入房间</h1>
        <p>输入邀请码加入共享记账房间</p>
      </div>

      <div class="join-form">
        <div class="form-group">
          <label for="invite-code">邀请码</label>
          <input 
            type="text" 
            id="invite-code" 
            v-model="inviteCode" 
            placeholder="请输入8位邀请码"
            maxlength="8"
            @input="formatInviteCode"
          />
          <small class="help-text">邀请码不区分大小写</small>
        </div>

        <div v-if="verificationResult" class="verification-result">
          <div v-if="verificationSuccess" class="success-message">
            <div class="room-info">
              <h3>{{ verificationResult.room_name }}</h3>
              <p>房间ID: {{ verificationResult.room_id }}</p>
            </div>
            <button class="join-button" @click="joinRoom" :disabled="joining">
              {{ joining ? '加入中...' : '确认加入' }}
            </button>
          </div>
          <div v-else class="error-message">
            <p>{{ errorMessage }}</p>
          </div>
        </div>

        <div v-else class="form-actions">
          <button 
            class="verify-button" 
            @click="verifyCode" 
            :disabled="!inviteCode || verifying"
          >
            {{ verifying ? '验证中...' : '验证邀请码' }}
          </button>
        </div>
      </div>

      <div class="join-footer">
        <p>没有邀请码？</p>
        <router-link to="/rooms/create" class="create-room-link">创建新房间</router-link>
      </div>
    </div>

    <!-- 成功加入提示 -->
    <div v-if="showSuccessModal" class="modal-overlay" @click="closeSuccessModal">
      <div class="modal-content success-modal" @click.stop>
        <div class="success-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
        </div>
        <h2>成功加入房间！</h2>
        <p>您已成功加入房间 "{{ joinedRoomName }}"</p>
        <button class="primary-button" @click="goToRoom">进入房间</button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useStore } from 'vuex';
import inviteCodeApi from '@/api/invite-codes';

export default {
  name: 'JoinRoom',
  setup() {
    const router = useRouter();
    const store = useStore();
    
    const inviteCode = ref('');
    const verifying = ref(false);
    const joining = ref(false);
    const verificationResult = ref(null);
    const verificationSuccess = ref(false);
    const errorMessage = ref('');
    const showSuccessModal = ref(false);
    const joinedRoomName = ref('');
    
    // 格式化邀请码输入
    const formatInviteCode = () => {
      // 移除空格并转换为大写
      inviteCode.value = inviteCode.value.replace(/\s/g, '').toUpperCase();
    };
    
    // 验证邀请码
    const verifyCode = async () => {
      if (!inviteCode.value) return;
      
      verifying.value = true;
      verificationResult.value = null;
      verificationSuccess.value = false;
      errorMessage.value = '';
      
      try {
        const response = await inviteCodeApi.verifyInviteCode({ code: inviteCode.value });
        
        if (response.data.success) {
          verificationResult.value = response.data.data;
          verificationSuccess.value = true;
        } else {
          errorMessage.value = response.data.message || '邀请码验证失败';
          verificationSuccess.value = false;
        }
      } catch (error) {
        console.error('验证邀请码失败:', error);
        errorMessage.value = '网络错误，请稍后重试';
        verificationSuccess.value = false;
      } finally {
        verifying.value = false;
      }
    };
    
    // 加入房间
    const joinRoom = async () => {
      if (!verificationResult.value) return;
      
      joining.value = true;
      
      try {
        const response = await inviteCodeApi.useInviteCode({ code: inviteCode.value });
        
        if (response.data.success) {
          joinedRoomName.value = response.data.data.room_name;
          showSuccessModal.value = true;
          
          // 刷新房间列表
          store.dispatch('rooms/fetchRooms');
        } else {
          errorMessage.value = response.data.message || '加入房间失败';
          verificationSuccess.value = false;
        }
      } catch (error) {
        console.error('加入房间失败:', error);
        errorMessage.value = '网络错误，请稍后重试';
        verificationSuccess.value = false;
      } finally {
        joining.value = false;
      }
    };
    
    // 关闭成功模态框
    const closeSuccessModal = () => {
      showSuccessModal.value = false;
      // 重置表单
      inviteCode.value = '';
      verificationResult.value = null;
      verificationSuccess.value = false;
    };
    
    // 进入房间
    const goToRoom = () => {
      if (verificationResult.value) {
        router.push(`/rooms/${verificationResult.value.room_id}`);
      }
    };
    
    return {
      inviteCode,
      verifying,
      joining,
      verificationResult,
      verificationSuccess,
      errorMessage,
      showSuccessModal,
      joinedRoomName,
      formatInviteCode,
      verifyCode,
      joinRoom,
      closeSuccessModal,
      goToRoom
    };
  }
};
</script>

<style scoped>
.join-room-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 20px;
  background-color: #f5f7fa;
}

.join-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 500px;
  padding: 40px;
  text-align: center;
}

.join-header {
  margin-bottom: 30px;
}

.join-header h1 {
  margin: 0 0 10px 0;
  color: #333;
  font-size: 28px;
}

.join-header p {
  margin: 0;
  color: #666;
  font-size: 16px;
}

.join-form {
  margin-bottom: 30px;
}

.form-group {
  margin-bottom: 20px;
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
  font-size: 16px;
}

.form-group input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 18px;
  text-align: center;
  letter-spacing: 2px;
  font-family: monospace;
  transition: border-color 0.3s;
}

.form-group input:focus {
  border-color: #4CAF50;
  outline: none;
}

.help-text {
  display: block;
  margin-top: 5px;
  color: #666;
  font-size: 14px;
}

.verification-result {
  margin-top: 20px;
}

.success-message {
  background: #e8f5e9;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.room-info h3 {
  margin: 0 0 10px 0;
  color: #2e7d32;
  font-size: 20px;
}

.room-info p {
  margin: 0 0 20px 0;
  color: #388e3c;
  font-size: 14px;
}

.join-button {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: background-color 0.3s;
}

.join-button:hover:not(:disabled) {
  background: #45a049;
}

.join-button:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

.error-message {
  background: #ffebee;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.error-message p {
  margin: 0;
  color: #c62828;
  font-size: 16px;
}

.form-actions {
  margin-top: 20px;
}

.verify-button {
  background: #2196F3;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: background-color 0.3s;
  width: 100%;
}

.verify-button:hover:not(:disabled) {
  background: #1976D2;
}

.verify-button:disabled {
  background: #cccccc;
  cursor: not-allowed;
}

.join-footer {
  text-align: center;
  color: #666;
  font-size: 14px;
}

.join-footer p {
  margin: 0 0 10px 0;
}

.create-room-link {
  color: #2196F3;
  text-decoration: none;
  font-weight: 500;
}

.create-room-link:hover {
  text-decoration: underline;
}

/* 成功模态框样式 */
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
  border-radius: 12px;
  width: 90%;
  max-width: 400px;
  padding: 30px;
  text-align: center;
}

.success-modal .success-icon {
  margin-bottom: 20px;
}

.success-modal h2 {
  margin: 0 0 15px 0;
  color: #333;
  font-size: 24px;
}

.success-modal p {
  margin: 0 0 25px 0;
  color: #666;
  font-size: 16px;
}

.primary-button {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: background-color 0.3s;
}

.primary-button:hover {
  background: #45a049;
}

@media (max-width: 600px) {
  .join-card {
    padding: 30px 20px;
  }
  
  .join-header h1 {
    font-size: 24px;
  }
  
  .form-group input {
    font-size: 16px;
  }
}
</style>