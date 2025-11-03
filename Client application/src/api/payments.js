import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器 - 添加认证token
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    if (error.response && error.response.status === 401) {
      // Token过期或无效，清除本地存储并重定向到登录页
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * 支付管理API
 */
export const paymentApi = {
  /**
   * 获取账单收款码
   * @param {string} billId - 账单ID
   * @param {string} qrType - 收款码类型 (wechat 或 alipay)
   * @returns {Promise} - API响应
   */
  getBillQrCode(billId, qrType) {
    return api.get(`/payments/bills/${billId}/qr-code`, {
      params: { qr_type: qrType }
    });
  },

  /**
   * 确认支付
   * @param {string} billId - 账单ID
   * @param {Object} paymentData - 支付数据
   * @returns {Promise} - API响应
   */
  confirmPayment(billId, paymentData) {
    return api.post(`/payments/bills/${billId}/confirm`, paymentData);
  },

  /**
   * 获取账单支付状态
   * @param {string} billId - 账单ID
   * @returns {Promise} - API响应
   */
  getBillPaymentStatus(billId) {
    return api.get(`/payments/bills/${billId}/status`);
  },

  /**
   * 获取用户支付记录
   * @param {Object} params - 查询参数
   * @returns {Promise} - API响应
   */
  getUserPayments(params = {}) {
    return api.get('/payments/user', { params });
  }
};

// 导出paymentsApi对象
export const paymentsApi = paymentApi;

export default paymentApi;