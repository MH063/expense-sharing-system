import axios from 'axios';
import { ElMessage } from 'element-plus';

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器
api.interceptors.request.use(
  config => {
    // 从localStorage获取token
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

// 响应拦截器
api.interceptors.response.use(
  response => {
    // 处理后端返回的双层嵌套结构 {success: true, data: {xxx: []}}
    const res = response.data
    
    // 如果返回的数据结构是 {success: true, data: {...}}，则返回res.data
    if (res && typeof res === 'object' && 'success' in res && 'data' in res) {
      return res.data
    }
    
    // 否则返回原始响应数据
    return response.data;
  },
  error => {
    // 处理错误响应
    if (error.response) {
      const { status, data } = error.response;
      
      if (status === 401) {
        // 未授权，清除token并跳转到登录页
        localStorage.removeItem('token');
        window.location.href = '/login';
      } else if (status === 403) {
        ElMessage.error('没有权限访问此资源');
      } else if (status === 404) {
        ElMessage.error('请求的资源不存在');
      } else if (status >= 500) {
        ElMessage.error('服务器错误，请稍后再试');
      } else {
        ElMessage.error(data.message || '请求失败');
      }
    } else if (error.request) {
      ElMessage.error('网络错误，请检查网络连接');
    } else {
      ElMessage.error('请求配置错误');
    }
    
    return Promise.reject(error);
  }
);

// 账单API
const billAPI = {
  // 创建账单
  createBill: async (billData) => {
    try {
      const response = await api.post('/bills', billData);
      return response;
    } catch (error) {
      console.error('创建账单失败:', error);
      throw error;
    }
  },

  // 获取账单列表
  getBills: async (params = {}) => {
    try {
      const response = await api.get('/bills', { params });
      return response;
    } catch (error) {
      console.error('获取账单列表失败:', error);
      throw error;
    }
  },

  // 获取账单详情
  getBillById: async (id) => {
    try {
      const response = await api.get(`/bills/${id}`);
      return response;
    } catch (error) {
      console.error('获取账单详情失败:', error);
      throw error;
    }
  },

  // 更新账单
  updateBill: async (id, billData) => {
    try {
      const response = await api.put(`/bills/${id}`, billData);
      return response;
    } catch (error) {
      console.error('更新账单失败:', error);
      throw error;
    }
  },

  // 删除账单
  deleteBill: async (id) => {
    try {
      const response = await api.delete(`/bills/${id}`);
      return response;
    } catch (error) {
      console.error('删除账单失败:', error);
      throw error;
    }
  },

  // 审核账单
  reviewBill: async (id, reviewData) => {
    try {
      const response = await api.post(`/bills/${id}/review`, reviewData);
      return response;
    } catch (error) {
      console.error('审核账单失败:', error);
      throw error;
    }
  },

  // 确认支付账单分摊
  confirmBillPayment: async (id, paymentData) => {
    try {
      const response = await api.post(`/bills/${id}/payment`, paymentData);
      return response;
    } catch (error) {
      console.error('确认支付失败:', error);
      throw error;
    }
  },

  // 获取用户账单统计
  getUserBillStats: async () => {
    try {
      const response = await api.get('/bills/stats/user');
      return response;
    } catch (error) {
      console.error('获取账单统计失败:', error);
      throw error;
    }
  },

  // 上传收据
  uploadReceipt: async (formData) => {
    try {
      const response = await api.post('/bills/receipt', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response;
    } catch (error) {
      console.error('上传收据失败:', error);
      throw error;
    }
  }
};

export default billAPI;