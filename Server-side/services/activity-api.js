/**
 * 活动管理API服务
 * 提供活动管理相关的API调用方法
 */

import axios from 'axios';

// 创建axios实例
const api = axios.create({
  baseURL: process.env.VUE_APP_API_BASE_URL || 'http://localhost:4000/api',
  timeout: 30000,
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

// 响应拦截器 - 处理错误和统一响应格式
api.interceptors.response.use(
  response => {
    // 处理后端返回的双层嵌套结构 {success: true, data: {xxx: []}}
    if (response.data && response.data.success && response.data.data) {
      return response.data.data;
    }
    return response.data;
  },
  error => {
    console.error('API请求错误:', error);
    return Promise.reject(error);
  }
);

/**
 * 活动管理API方法
 */
const activityApi = {
  /**
   * 获取活动列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.limit - 每页数量
   * @param {string} params.status - 活动状态
   * @param {string} params.type - 活动类型
   * @param {string} params.search - 搜索关键词
   * @returns {Promise} 活动列表数据
   */
  getActivities: async (params = {}) => {
    try {
      console.log('获取活动列表，参数:', params);
      const response = await api.get('/activities', { params });
      return response;
    } catch (error) {
      console.error('获取活动列表失败:', error);
      throw error;
    }
  },

  /**
   * 获取活动详情
   * @param {string|number} id - 活动ID
   * @returns {Promise} 活动详情数据
   */
  getActivityById: async (id) => {
    try {
      console.log('获取活动详情，ID:', id);
      const response = await api.get(`/activities/${id}`);
      return response;
    } catch (error) {
      console.error('获取活动详情失败:', error);
      throw error;
    }
  },

  /**
   * 创建新活动
   * @param {Object} activityData - 活动数据
   * @returns {Promise} 创建结果
   */
  createActivity: async (activityData) => {
    try {
      console.log('创建新活动，数据:', activityData);
      const response = await api.post('/activities', activityData);
      return response;
    } catch (error) {
      console.error('创建活动失败:', error);
      throw error;
    }
  },

  /**
   * 更新活动信息
   * @param {string|number} id - 活动ID
   * @param {Object} activityData - 更新的活动数据
   * @returns {Promise} 更新结果
   */
  updateActivity: async (id, activityData) => {
    try {
      console.log('更新活动，ID:', id, '数据:', activityData);
      const response = await api.put(`/activities/${id}`, activityData);
      return response;
    } catch (error) {
      console.error('更新活动失败:', error);
      throw error;
    }
  },

  /**
   * 删除活动
   * @param {string|number} id - 活动ID
   * @returns {Promise} 删除结果
   */
  deleteActivity: async (id) => {
    try {
      console.log('删除活动，ID:', id);
      const response = await api.delete(`/activities/${id}`);
      return response;
    } catch (error) {
      console.error('删除活动失败:', error);
      throw error;
    }
  },

  /**
   * 获取活动参与者列表
   * @param {string|number} id - 活动ID
   * @param {Object} params - 查询参数
   * @returns {Promise} 参与者列表数据
   */
  getActivityParticipants: async (id, params = {}) => {
    try {
      console.log('获取活动参与者，活动ID:', id, '参数:', params);
      const response = await api.get(`/activities/${id}/participants`, { params });
      return response;
    } catch (error) {
      console.error('获取活动参与者失败:', error);
      throw error;
    }
  },

  /**
   * 加入活动
   * @param {string|number} id - 活动ID
   * @param {Object} participantData - 参与者数据
   * @returns {Promise} 参与结果
   */
  joinActivity: async (id, participantData = {}) => {
    try {
      console.log('加入活动，活动ID:', id, '数据:', participantData);
      const response = await api.post(`/activities/${id}/join`, participantData);
      return response;
    } catch (error) {
      console.error('加入活动失败:', error);
      throw error;
    }
  },

  /**
   * 退出活动
   * @param {string|number} id - 活动ID
   * @returns {Promise} 退出结果
   */
  leaveActivity: async (id) => {
    try {
      console.log('退出活动，活动ID:', id);
      const response = await api.post(`/activities/${id}/leave`);
      return response;
    } catch (error) {
      console.error('退出活动失败:', error);
      throw error;
    }
  },

  /**
   * 获取活动统计数据
   * @param {Object} params - 查询参数
   * @returns {Promise} 统计数据
   */
  getActivityStatistics: async (params = {}) => {
    try {
      console.log('获取活动统计数据，参数:', params);
      const response = await api.get('/activities/statistics', { params });
      return response;
    } catch (error) {
      console.error('获取活动统计数据失败:', error);
      throw error;
    }
  },

  /**
   * 获取活动类型列表
   * @returns {Promise} 活动类型列表
   */
  getActivityTypes: async () => {
    try {
      console.log('获取活动类型列表');
      const response = await api.get('/activities/types');
      return response;
    } catch (error) {
      console.error('获取活动类型列表失败:', error);
      throw error;
    }
  },

  /**
   * 获取用户参与的活动列表
   * @param {Object} params - 查询参数
   * @returns {Promise} 用户参与的活动列表
   */
  getUserActivities: async (params = {}) => {
    try {
      console.log('获取用户参与的活动列表，参数:', params);
      const response = await api.get('/activities/user', { params });
      return response;
    } catch (error) {
      console.error('获取用户参与的活动列表失败:', error);
      throw error;
    }
  },

  /**
   * 上传活动图片
   * @param {FormData} formData - 包含图片的表单数据
   * @returns {Promise} 上传结果
   */
  uploadActivityImage: async (formData) => {
    try {
      console.log('上传活动图片');
      const response = await api.post('/activities/upload-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response;
    } catch (error) {
      console.error('上传活动图片失败:', error);
      throw error;
    }
  },

  /**
   * 导出活动数据
   * @param {Object} params - 导出参数
   * @param {string} params.format - 导出格式 (excel, csv, pdf)
   * @param {Array} params.fields - 导出字段
   * @returns {Promise} 导出结果
   */
  exportActivities: async (params = {}) => {
    try {
      console.log('导出活动数据，参数:', params);
      const response = await api.get('/activities/export', { 
        params,
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('导出活动数据失败:', error);
      throw error;
    }
  }
};

export default activityApi;