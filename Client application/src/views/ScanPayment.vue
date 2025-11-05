<template>
  <div class="payment-container">
    <div class="payment-header">
      <h1>扫码支付</h1>
      <p>扫描下方二维码完成支付</p>
    </div>

    <div class="payment-content" v-if="billInfo">
      <div class="bill-info">
        <div class="bill-card">
          <h2>{{ billInfo.bill_title }}</h2>
          <div class="bill-details">
            <div class="detail-row">
              <span class="label">房间:</span>
              <span class="value">{{ billInfo.room_name }}</span>
            </div>
            <div class="detail-row">
              <span class="label">创建人:</span>
              <span class="value">{{ billInfo.creator_name }}</span>
            </div>
            <div class="detail-row">
              <span class="label">账单总额:</span>
              <span class="value">¥{{ billInfo.total_amount }}</span>
            </div>
            <div class="detail-row">
              <span class="label">您的分摊:</span>
              <span class="value highlight">¥{{ billInfo.user_amount }}</span>
            </div>
            <div class="detail-row" v-if="billInfo.due_date">
              <span class="label">截止日期:</span>
              <span class="value">{{ formatDate(billInfo.due_date) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="payment-method">
        <div class="method-selector">
          <button 
            class="method-btn" 
            :class="{ active: selectedMethod === 'wechat' }"
            @click="selectPaymentMethod('wechat')"
          >
            <i class="wechat-icon"></i>
            微信支付
          </button>
          <button 
            class="method-btn" 
            :class="{ active: selectedMethod === 'alipay' }"
            @click="selectPaymentMethod('alipay')"
          >
            <i class="alipay-icon"></i>
            支付宝
          </button>
        </div>

        <div class="qr-code-container" v-if="selectedMethod">
          <div v-if="loading" class="qr-loading">
            <div class="spinner"></div>
            <p>正在获取收款码...</p>
          </div>
          <div v-else-if="qrCodeUrl" class="qr-code">
            <img :src="qrCodeUrl" alt="收款码" />
            <div class="qr-code-type">
              {{ selectedMethod === 'wechat' ? '微信' : '支付宝' }}收款码
            </div>
          </div>
          <div v-else-if="errorMessage" class="qr-error">
            <div class="error-icon">!</div>
            <p>{{ errorMessage }}</p>
            <button @click="selectPaymentMethod(selectedMethod)" class="retry-btn">重试</button>
          </div>
          <div v-if="qrCodeUrl" class="payment-tips">
            <p>请使用{{ selectedMethod === 'wechat' ? '微信' : '支付宝' }}扫描上方二维码完成支付</p>
            <p>支付金额: <span class="amount">¥{{ billInfo.user_amount }}</span></p>
          </div>
        </div>

        <div class="payment-actions" v-if="selectedMethod">
          <button class="confirm-btn" @click="confirmPayment">
            我已支付
          </button>
          <button class="cancel-btn" @click="goBack">
            返回
          </button>
        </div>
      </div>
    </div>

    <div class="loading" v-if="loading">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <div class="error-message" v-if="errorMessage">
      <p>{{ errorMessage }}</p>
      <button @click="loadBillInfo">重试</button>
    </div>

    <!-- 支付确认对话框 -->
    <div class="modal-overlay" v-if="showConfirmDialog">
      <div class="modal">
        <div class="modal-header">
          <h3>确认支付信息</h3>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>支付方式</label>
            <input 
              type="text" 
              :value="selectedMethod === 'wechat' ? '微信支付' : '支付宝支付'" 
              readonly 
            />
          </div>
          <div class="form-group">
            <label>支付金额</label>
            <input type="text" :value="`¥${billInfo.user_amount}`" readonly />
          </div>
          <div class="form-group">
            <label>交易流水号</label>
            <input 
              type="text" 
              v-model="paymentForm.transaction_id" 
              placeholder="请输入交易流水号" 
            />
          </div>
          <div class="form-group">
            <label>支付时间</label>
            <input 
              type="datetime-local" 
              v-model="paymentForm.payment_time" 
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="submit-btn" @click="submitPayment">提交</button>
          <button class="cancel-btn" @click="showConfirmDialog = false">取消</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { paymentApi } from '@/api/payments';

export default {
  name: 'ScanPayment',
  setup() {
    const route = useRoute();
    const router = useRouter();
    
    const billId = route.params.billId;
    const billInfo = ref(null);
    const selectedMethod = ref('');
    const qrCodeUrl = ref('');
    const loading = ref(false);
    const errorMessage = ref('');
    const showConfirmDialog = ref(false);
    
    const paymentForm = ref({
      payment_method: '',
      transaction_id: '',
      payment_time: ''
    });

    // 加载账单信息
    const loadBillInfo = async () => {
      loading.value = true;
      errorMessage.value = '';
      
      try {
        // 调用真实API获取账单支付状态
        console.log('API调用 - 获取账单支付状态:', { billId });
        
        const response = await paymentApi.getBillPaymentStatus(billId);
        
        // 处理响应数据
        if (response.success) {
          const paymentStatus = response.data.payment_status;
          billInfo.value = {
            bill_title: paymentStatus.bill_title,
            room_name: paymentStatus.room_name,
            creator_name: paymentStatus.creator_name || '未知',
            total_amount: paymentStatus.total_amount,
            user_amount: paymentStatus.user_amount || '0.00',
            due_date: paymentStatus.due_date,
            status: paymentStatus.status
          };
          console.log('获取账单信息成功:', billInfo.value);
        } else {
          console.error('获取账单信息失败:', response.message);
          errorMessage.value = response.message || '获取账单信息失败，请稍后重试';
        }
      } catch (error) {
        console.error('获取账单信息失败:', error);
        errorMessage.value = '获取账单信息失败，请稍后重试';
      } finally {
        loading.value = false;
      }
    };

    // 选择支付方式
    const selectPaymentMethod = async (method) => {
      selectedMethod.value = method;
      paymentForm.value.payment_method = method;
      
      // 设置默认支付时间为当前时间
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      paymentForm.value.payment_time = `${year}-${month}-${day}T${hours}:${minutes}`;
      
      // 重置状态
      loading.value = true;
      errorMessage.value = '';
      qrCodeUrl.value = '';
      
      try {
        // 调用真实API获取账单二维码
        console.log('API调用 - 获取账单二维码:', { billId, method });
        
        const response = await paymentApi.getBillQrCode(billId, method);
        
        // 处理响应数据
        if (response.success) {
          qrCodeUrl.value = response.data.qr_code_url;
          console.log('获取收款码成功:', qrCodeUrl.value);
        } else {
          console.error('获取收款码失败:', response.message);
          errorMessage.value = response.message || '获取收款码失败，请稍后重试';
        }
      } catch (error) {
        console.error('获取收款码失败:', error);
        errorMessage.value = '获取收款码失败，请稍后重试';
      } finally {
        loading.value = false;
      }
    };

    // 确认支付
    const confirmPayment = () => {
      if (!paymentForm.value.transaction_id) {
        errorMessage.value = '请输入交易流水号';
        return;
      }
      
      if (!paymentForm.value.payment_time) {
        errorMessage.value = '请选择支付时间';
        return;
      }
      
      showConfirmDialog.value = true;
    };

    // 提交支付
    const submitPayment = async () => {
      loading.value = true;
      errorMessage.value = '';
      
      try {
        // 调用真实API确认支付
        console.log('API调用 - 确认支付:', { billId, paymentData: paymentForm.value });
        
        const response = await paymentApi.confirmPayment(billId, {
          payment_method: paymentForm.value.payment_method,
          transaction_id: paymentForm.value.transaction_id,
          payment_time: paymentForm.value.payment_time
        });
        
        // 处理响应数据
        if (response.success) {
          console.log('支付确认成功:', response.data);
          // 支付成功，跳转到账单详情页
          router.push(`/bills/${billId}`);
        } else {
          console.error('支付确认失败:', response.message);
          errorMessage.value = response.message || '支付确认失败，请稍后重试';
          showConfirmDialog.value = false;
        }
      } catch (error) {
        console.error('支付确认失败:', error);
        errorMessage.value = '支付确认失败，请稍后重试';
        showConfirmDialog.value = false;
      } finally {
        loading.value = false;
      }
    };

    // 返回上一页
    const goBack = () => {
      router.go(-1);
    };

    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN');
    };

    onMounted(() => {
      loadBillInfo();
    });

    return {
      billId,
      billInfo,
      selectedMethod,
      qrCodeUrl,
      loading,
      errorMessage,
      showConfirmDialog,
      paymentForm,
      loadBillInfo,
      selectPaymentMethod,
      confirmPayment,
      submitPayment,
      goBack,
      formatDate
    };
  }
};
</script>

<style scoped>
.payment-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Arial', sans-serif;
}

.payment-header {
  text-align: center;
  margin-bottom: 30px;
}

.payment-header h1 {
  color: #333;
  margin-bottom: 10px;
}

.payment-header p {
  color: #666;
  font-size: 16px;
}

.payment-content {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.bill-info {
  flex: 1;
}

.bill-card {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.bill-card h2 {
  margin-top: 0;
  color: #333;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.bill-details {
  margin-top: 15px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
}

.label {
  color: #666;
}

.value {
  font-weight: bold;
  color: #333;
}

.highlight {
  color: #4CAF50;
  font-size: 18px;
}

.payment-method {
  flex: 1;
}

.method-selector {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.method-btn {
  flex: 1;
  padding: 15px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  transition: all 0.3s;
}

.method-btn:hover {
  border-color: #4CAF50;
}

.method-btn.active {
  border-color: #4CAF50;
  background: #f1f8e9;
}

.wechat-icon, .alipay-icon {
  width: 30px;
  height: 30px;
  border-radius: 4px;
}

.wechat-icon {
  background: #07C160;
}

.alipay-icon {
  background: #1677FF;
}

.qr-code-container {
  text-align: center;
  margin-bottom: 20px;
}

.qr-code {
  display: inline-block;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  margin-bottom: 15px;
}

.qr-code img {
  width: 200px;
  height: 200px;
  display: block;
}

.qr-code-type {
  margin-top: 10px;
  color: #666;
}

.qr-loading {
  padding: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.qr-loading .spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 15px;
}

.qr-loading p {
  color: #666;
  margin: 0;
}

.qr-error {
  padding: 30px;
  background: #ffebee;
  border-radius: 8px;
  color: #d32f2f;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qr-error .error-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #d32f2f;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 15px;
}

.qr-error p {
  margin: 0 0 15px;
  text-align: center;
}

.qr-error .retry-btn {
  background: #d32f2f;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.qr-error .retry-btn:hover {
  background: #b71c1c;
}

.payment-tips {
  color: #666;
  margin-bottom: 20px;
}

.payment-tips p {
  margin: 5px 0;
}

.amount {
  color: #4CAF50;
  font-weight: bold;
  font-size: 18px;
}

.payment-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.confirm-btn {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 12px 30px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.confirm-btn:hover {
  background: #45a049;
}

.cancel-btn {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
  padding: 12px 30px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.cancel-btn:hover {
  background: #e0e0e0;
}

.loading {
  text-align: center;
  padding: 40px;
}

.spinner {
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4CAF50;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 15px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  text-align: center;
  padding: 20px;
  background: #ffebee;
  border-radius: 8px;
  color: #d32f2f;
  margin-bottom: 20px;
}

.error-message button {
  margin-top: 10px;
  background: #d32f2f;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

/* 模态框样式 */
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
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  color: #333;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #333;
  font-weight: bold;
}

.form-group input {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.modal-footer {
  padding: 20px;
  border-top: 1px solid #eee;
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.submit-btn {
  background: #4CAF50;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.submit-btn:hover {
  background: #45a049;
}

@media (max-width: 768px) {
  .payment-content {
    flex-direction: column;
  }
  
  .method-selector {
    flex-direction: column;
  }
  
  .qr-code img {
    width: 150px;
    height: 150px;
  }
}
</style>