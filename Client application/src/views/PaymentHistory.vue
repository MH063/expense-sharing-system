<template>
  <div class="payment-history-container" v-if="canViewPayments">
    <div class="page-header">
      <h1>支付记录</h1>
      <div class="header-actions">
        <div class="filter-group">
          <label for="status-filter">状态筛选:</label>
          <select id="status-filter" v-model="statusFilter" @change="loadPayments">
            <option value="">全部</option>
            <option value="completed">已完成</option>
            <option value="pending">处理中</option>
            <option value="failed">失败</option>
          </select>
        </div>
      </div>
    </div>

    <div class="payment-list" v-if="payments.length > 0">
      <div v-for="payment in payments" :key="payment.id" class="payment-card">
        <div class="payment-header">
          <div class="payment-info">
            <h3>{{ payment.bill_title }}</h3>
            <div class="payment-meta">
              <span class="room-name">{{ payment.room_name }}</span>
              <span class="payment-date">{{ formatDate(payment.created_at) }}</span>
            </div>
          </div>
          <div class="payment-amount">
            <div class="amount">¥{{ payment.amount }}</div>
            <div class="status-badge" :class="payment.status">
              {{ getStatusName(payment.status) }}
            </div>
          </div>
        </div>

        <div class="payment-details">
          <div class="detail-row">
            <span class="label">支付方式:</span>
            <span class="value">{{ getPaymentMethodName(payment.payment_method) }}</span>
          </div>
          <div class="detail-row">
            <span class="label">交易流水号:</span>
            <span class="value">{{ payment.transaction_id }}</span>
          </div>
          <div class="detail-row" v-if="payment.payment_time">
            <span class="label">支付时间:</span>
            <span class="value">{{ formatDateTime(payment.payment_time) }}</span>
          </div>
        </div>

        <div class="payment-actions">
          <button class="view-bill-btn" @click="viewBill(payment.bill_id)">
            查看账单
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="loading" class="loading-container">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else class="empty-state">
      <div class="empty-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
          <line x1="1" y1="10" x2="23" y2="10"></line>
        </svg>
      </div>
      <h2>暂无支付记录</h2>
      <p>您还没有任何支付记录</p>
      <button class="primary-button" @click="goToBills">查看账单</button>
    </div>

    <!-- 分页控件 -->
    <div class="pagination" v-if="pagination.pages > 1">
      <button 
        class="page-btn" 
        :disabled="pagination.page <= 1" 
        @click="changePage(pagination.page - 1)"
      >
        上一页
      </button>
      <span class="page-info">
        第 {{ pagination.page }} 页，共 {{ pagination.pages }} 页
      </span>
      <button 
        class="page-btn" 
        :disabled="pagination.page >= pagination.pages" 
        @click="changePage(pagination.page + 1)"
      >
        下一页
      </button>
    </div>
  </div>
  
  <div v-else class="no-permission-container">
    <div class="no-permission-icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      </svg>
    </div>
    <h2>访问受限</h2>
    <p>您没有权限查看支付记录</p>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { PERMISSIONS } from '@/utils/permissions';
import { paymentApi } from '@/api/payments';

export default {
  name: 'PaymentHistory',
  setup() {
    const router = useRouter();
    const authStore = useAuthStore();
    
    // 权限检查
    const canViewPayments = computed(() => {
      return authStore.checkPermission(PERMISSIONS.PAYMENT_VIEW)
    });
    
    const checkPermission = (permission) => {
      return authStore.checkPermission(permission)
    };
    
    const payments = ref([]);
    const loading = ref(false);
    const statusFilter = ref('');
    const pagination = ref({
      page: 1,
      limit: 10,
      total: 0,
      pages: 0
    });

    // 加载支付记录
    const loadPayments = async () => {
      // 检查查看权限
      if (!checkPermission(PERMISSIONS.PAYMENT_VIEW)) {
        console.warn('用户没有查看支付记录的权限');
        return;
      }
      
      loading.value = true;
      try {
        const params = { 
          page: pagination.value.page, 
          limit: pagination.value.limit,
          status: statusFilter.value || undefined 
        };
        const resp = await paymentApi.getPayments(params);
        if (resp?.data?.success) {
          const payload = resp.data.data;
          const list = Array.isArray(payload) ? payload : (payload?.data || []);
          const total = Array.isArray(payload) ? list.length : (payload?.total || 0);
          const pages = Math.ceil(total / pagination.value.limit);
          payments.value = list;
          pagination.value = { ...pagination.value, total, pages };
        } else {
          console.error('获取支付记录失败:', resp?.data?.message);
        }
      } catch (error) {
        console.error('获取支付记录失败:', error);
      } finally {
        loading.value = false;
      }
    };

    // 切换页码
    const changePage = (page) => {
      pagination.value.page = page;
      loadPayments();
    };

    // 查看账单
    const viewBill = (billId) => {
      router.push(`/bills/${billId}`);
    };

    // 跳转到账单页面
    const goToBills = () => {
      router.push('/bills');
    };

    // 获取状态名称
    const getStatusName = (status) => {
      const statusMap = {
        'completed': '已完成',
        'pending': '处理中',
        'failed': '失败'
      };
      return statusMap[status] || '未知';
    };

    // 获取支付方式名称
    const getPaymentMethodName = (method) => {
      const methodMap = {
        'wechat': '微信支付',
        'alipay': '支付宝',
        'cash': '现金',
        'bank_transfer': '银行转账'
      };
      return methodMap[method] || '未知';
    };

    // 格式化日期
    const formatDate = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN');
    };

    // 格式化日期时间
    const formatDateTime = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleString('zh-CN');
    };

    onMounted(() => {
      loadPayments();
    });

    return {
      payments,
      loading,
      statusFilter,
      pagination,
      canViewPayments,
      loadPayments,
      changePage,
      viewBill,
      goToBills,
      getStatusName,
      getPaymentMethodName,
      formatDate,
      formatDateTime
    };
  }
};
</script>

<style scoped>
.payment-history-container {
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

.filter-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-group label {
  color: #666;
}

.filter-group select {
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
}

.payment-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.payment-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.payment-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 15px;
}

.payment-info h3 {
  margin: 0 0 5px 0;
  color: #333;
}

.payment-meta {
  display: flex;
  gap: 15px;
  color: #666;
  font-size: 14px;
}

.payment-amount {
  text-align: right;
}

.amount {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.status-badge {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.status-badge.completed {
  background: #e8f5e9;
  color: #2e7d32;
}

.status-badge.pending {
  background: #fff3e0;
  color: #f57c00;
}

.status-badge.failed {
  background: #ffebee;
  color: #c62828;
}

.payment-details {
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

.payment-actions {
  display: flex;
  justify-content: flex-end;
}

.view-bill-btn {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.view-bill-btn:hover {
  background: #e0e0e0;
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

.empty-state {
  text-align: center;
  padding: 40px;
}

.empty-icon {
  color: #ccc;
  margin-bottom: 20px;
}

.empty-state h2 {
  color: #333;
  margin-bottom: 10px;
}

.empty-state p {
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

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 15px;
  margin-top: 30px;
}

.page-btn {
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.page-btn:hover:not(:disabled) {
  background: #e0e0e0;
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  color: #666;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
  
  .payment-header {
    flex-direction: column;
    gap: 10px;
  }
  
  .payment-amount {
    text-align: left;
  }
  
  .payment-meta {
    flex-direction: column;
    gap: 5px;
  }
  
  .detail-row {
    flex-direction: column;
    gap: 5px;
  }
}

.no-permission-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
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
  margin-bottom: 20px;
}
</style>