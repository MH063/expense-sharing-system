import axios from 'axios';
import { tokenManager } from '@/utils/token-manager';

// 创建axios实例
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器 - 添加认证token
apiClient.interceptors.request.use(
  (config) => {
    const token = tokenManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 处理认证错误
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token过期或无效，移除本地token并跳转到登录页
      tokenManager.removeToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * 邀请码管理API
 */
const inviteCodeApi = {
  /**
   * 生成新的邀请码
   * @param {Object} data - 邀请码数据
   * @param {string} data.roomId - 房间ID
   * @param {number} data.maxUses - 最大使用次数
   * @param {string} data.expiresAt - 过期时间
   * @returns {Promise} API响应
   */
  generateInviteCode: (data) => {
    return apiClient.post('/invite-codes', data);
  },

  /**
   * 验证邀请码
   * @param {Object} data - 验证数据
   * @param {string} data.code - 邀请码
   * @returns {Promise} API响应
   */
  verifyInviteCode: (data) => {
    return apiClient.post('/invite-codes/verify', data);
  },

  /**
   * 使用邀请码加入房间
   * @param {Object} data - 使用数据
   * @param {string} data.code - 邀请码
   * @returns {Promise} API响应
   */
  useInviteCode: (data) => {
    return apiClient.post('/invite-codes/use', data);
  },

  /**
   * 获取房间的邀请码列表
   * @param {string} roomId - 房间ID
   * @returns {Promise} API响应
   */
  getRoomInviteCodes: (roomId) => {
    return apiClient.get(`/invite-codes/room/${roomId}`);
  },

  /**
   * 撤销邀请码
   * @param {string} id - 邀请码ID
   * @returns {Promise} API响应
   */
  revokeInviteCode: (id) => {
    return apiClient.delete(`/invite-codes/${id}`);
  },
};

export default inviteCodeApi;

// 命名导出
export const inviteCodesApi = inviteCodeApi;