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
 * 收款码管理相关API
 */

// 获取用户收款码列表
export const getUserQrCodes = async () => {
  try {
    const response = await api.get('/qr-codes');
    return response.data;
  } catch (error) {
    console.error('获取收款码列表失败:', error);
    throw error;
  }
};

// 上传收款码
export const uploadQrCode = async (formData) => {
  try {
    const response = await api.post('/qr-codes/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('上传收款码失败:', error);
    throw error;
  }
};

// 激活/停用收款码
export const toggleQrCodeStatus = async (id, isActive) => {
  try {
    const response = await api.patch(`/qr-codes/${id}/status`, {
      is_active: isActive
    });
    return response.data;
  } catch (error) {
    console.error('更新收款码状态失败:', error);
    throw error;
  }
};

// 设置默认收款码
export const setDefaultQrCode = async (id) => {
  try {
    const response = await api.patch(`/qr-codes/${id}/default`);
    return response.data;
  } catch (error) {
    console.error('设置默认收款码失败:', error);
    throw error;
  }
};

// 删除收款码
export const deleteQrCode = async (id) => {
  try {
    const response = await api.delete(`/qr-codes/${id}`);
    return response.data;
  } catch (error) {
    console.error('删除收款码失败:', error);
    throw error;
  }
};

// 获取用户的默认收款码
export const getDefaultQrCode = async (qrType) => {
  try {
    const response = await api.get(`/qr-codes/default?qr_type=${qrType}`);
    return response.data;
  } catch (error) {
    console.error('获取默认收款码失败:', error);
    throw error;
  }
};

// 导出qrCodesApi对象
export const qrCodesApi = {
  getUserQrCodes,
  uploadQrCode,
  toggleQrCodeStatus,
  setDefaultQrCode,
  deleteQrCode,
  getDefaultQrCode
};