const request = require('../utils/request');

/**
 * 管理员会话管理相关API
 */
const adminSessionApi = {
  /**
   * 获取所有活跃会话列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.pageSize - 每页数量
   * @param {string} params.userId - 用户ID筛选
   * @param {string} params.ipAddress - IP地址筛选
   * @param {string} params.userAgent - 用户代理筛选
   * @param {string} params.status - 状态筛选 (active, expired, revoked)
   * @param {string} params.startTime - 开始时间
   * @param {string} params.endTime - 结束时间
   * @returns {Promise} API响应
   */
  getActiveSessions: (params = {}) => {
    console.log('获取所有活跃会话列表', params);
    return request.get('/api/admin/sessions/active', { params });
  },

  /**
   * 获取会话详情
   * @param {string} sessionId - 会话ID
   * @returns {Promise} API响应
   */
  getSessionDetails: (sessionId) => {
    console.log('获取会话详情', sessionId);
    return request.get(`/api/admin/sessions/${sessionId}`);
  },

  /**
   * 获取用户的所有会话
   * @param {string} userId - 用户ID
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.pageSize - 每页数量
   * @param {string} params.status - 状态筛选
   * @returns {Promise} API响应
   */
  getUserSessions: (userId, params = {}) => {
    console.log('获取用户的所有会话', userId, params);
    return request.get(`/api/admin/sessions/user/${userId}`, { params });
  },

  /**
   * 撤销指定会话
   * @param {string} sessionId - 会话ID
   * @param {Object} data - 请求数据
   * @param {string} data.reason - 撤销原因
   * @returns {Promise} API响应
   */
  revokeSession: (sessionId, data = {}) => {
    console.log('撤销指定会话', sessionId, data);
    return request.post(`/api/admin/sessions/${sessionId}/revoke`, data);
  },

  /**
   * 批量撤销会话
   * @param {Object} data - 请求数据
   * @param {Array} data.sessionIds - 会话ID列表
   * @param {string} data.reason - 撤销原因
   * @returns {Promise} API响应
   */
  revokeMultipleSessions: (data = {}) => {
    console.log('批量撤销会话', data);
    return request.post('/api/admin/sessions/batch-revoke', data);
  },

  /**
   * 撤销用户的所有会话
   * @param {string} userId - 用户ID
   * @param {Object} data - 请求数据
   * @param {string} data.reason - 撤销原因
   * @param {boolean} data.excludeCurrent - 是否排除当前会话
   * @returns {Promise} API响应
   */
  revokeUserAllSessions: (userId, data = {}) => {
    console.log('撤销用户的所有会话', userId, data);
    return request.post(`/api/admin/sessions/user/${userId}/revoke-all`, data);
  },

  /**
   * 延长会话有效期
   * @param {string} sessionId - 会话ID
   * @param {Object} data - 请求数据
   * @param {number} data.extensionHours - 延长小时数
   * @param {string} data.reason - 延长原因
   * @returns {Promise} API响应
   */
  extendSession: (sessionId, data = {}) => {
    console.log('延长会话有效期', sessionId, data);
    return request.post(`/api/admin/sessions/${sessionId}/extend`, data);
  },

  /**
   * 获取会话活动日志
   * @param {string} sessionId - 会话ID
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.pageSize - 每页数量
   * @returns {Promise} API响应
   */
  getSessionActivityLogs: (sessionId, params = {}) => {
    console.log('获取会话活动日志', sessionId, params);
    return request.get(`/api/admin/sessions/${sessionId}/activity-logs`, { params });
  },

  /**
   * 获取会话统计信息
   * @param {Object} params - 查询参数
   * @param {string} params.timeRange - 时间范围 (today, week, month, year)
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @returns {Promise} API响应
   */
  getSessionStatistics: (params = {}) => {
    console.log('获取会话统计信息', params);
    return request.get('/api/admin/sessions/statistics', { params });
  },

  /**
   * 获取可疑会话列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.pageSize - 每页数量
   * @param {string} params.riskLevel - 风险级别 (low, medium, high, critical)
   * @returns {Promise} API响应
   */
  getSuspiciousSessions: (params = {}) => {
    console.log('获取可疑会话列表', params);
    return request.get('/api/admin/sessions/suspicious', { params });
  },

  /**
   * 标记会话为可疑
   * @param {string} sessionId - 会话ID
   * @param {Object} data - 请求数据
   * @param {string} data.riskLevel - 风险级别
   * @param {string} data.reason - 标记原因
   * @returns {Promise} API响应
   */
  markSessionAsSuspicious: (sessionId, data = {}) => {
    console.log('标记会话为可疑', sessionId, data);
    return request.post(`/api/admin/sessions/${sessionId}/mark-suspicious`, data);
  },

  /**
   * 获取会话地理位置信息
   * @param {string} sessionId - 会话ID
   * @returns {Promise} API响应
   */
  getSessionLocation: (sessionId) => {
    console.log('获取会话地理位置信息', sessionId);
    return request.get(`/api/admin/sessions/${sessionId}/location`);
  },

  /**
   * 获取会话设备信息
   * @param {string} sessionId - 会话ID
   * @returns {Promise} API响应
   */
  getSessionDeviceInfo: (sessionId) => {
    console.log('获取会话设备信息', sessionId);
    return request.get(`/api/admin/sessions/${sessionId}/device-info`);
  },

  /**
   * 获取会话安全信息
   * @param {string} sessionId - 会话ID
   * @returns {Promise} API响应
   */
  getSessionSecurityInfo: (sessionId) => {
    console.log('获取会话安全信息', sessionId);
    return request.get(`/api/admin/sessions/${sessionId}/security-info`);
  },

  /**
   * 强制用户重新认证
   * @param {string} userId - 用户ID
   * @param {Object} data - 请求数据
   * @param {string} data.reason - 原因
   * @returns {Promise} API响应
   */
  forceUserReauthentication: (userId, data = {}) => {
    console.log('强制用户重新认证', userId, data);
    return request.post(`/api/admin/sessions/user/${userId}/force-reauth`, data);
  },

  /**
   * 获取会话访问模式
   * @param {string} sessionId - 会话ID
   * @returns {Promise} API响应
   */
  getSessionAccessPattern: (sessionId) => {
    console.log('获取会话访问模式', sessionId);
    return request.get(`/api/admin/sessions/${sessionId}/access-pattern`);
  },

  /**
   * 设置会话访问限制
   * @param {string} sessionId - 会话ID
   * @param {Object} data - 请求数据
   * @param {Array} data.allowedIPs - 允许的IP列表
   * @param {Array} data.blockedIPs - 阻止的IP列表
   * @param {Array} data.allowedLocations - 允许的地理位置
   * @returns {Promise} API响应
   */
  setSessionAccessRestrictions: (sessionId, data = {}) => {
    console.log('设置会话访问限制', sessionId, data);
    return request.post(`/api/admin/sessions/${sessionId}/access-restrictions`, data);
  },

  /**
   * 获取会话异常行为
   * @param {string} sessionId - 会话ID
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.pageSize - 每页数量
   * @returns {Promise} API响应
   */
  getSessionAnomalies: (sessionId, params = {}) => {
    console.log('获取会话异常行为', sessionId, params);
    return request.get(`/api/admin/sessions/${sessionId}/anomalies`, { params });
  },

  /**
   * 获取会话风险评估
   * @param {string} sessionId - 会话ID
   * @returns {Promise} API响应
   */
  getSessionRiskAssessment: (sessionId) => {
    console.log('获取会话风险评估', sessionId);
    return request.get(`/api/admin/sessions/${sessionId}/risk-assessment`);
  },

  /**
   * 导出会话数据
   * @param {Object} params - 查询参数
   * @param {string} params.format - 导出格式 (json, csv, xlsx)
   * @param {Array} params.fields - 导出字段
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @returns {Promise} API响应
   */
  exportSessionData: (params = {}) => {
    console.log('导出会话数据', params);
    return request.get('/api/admin/sessions/export', { 
      params,
      responseType: 'blob'
    });
  },

  /**
   * 获取会话配置
   * @returns {Promise} API响应
   */
  getSessionConfig: () => {
    console.log('获取会话配置');
    return request.get('/api/admin/sessions/config');
  },

  /**
   * 更新会话配置
   * @param {Object} data - 请求数据
   * @param {number} data.defaultSessionTimeout - 默认会话超时时间(分钟)
   * @param {number} data.maxSessionTimeout - 最大会话超时时间(分钟)
   * @param {boolean} data.enableSessionMonitoring - 是否启用会话监控
   * @param {boolean} data.enableAnomalyDetection - 是否启用异常检测
   * @returns {Promise} API响应
   */
  updateSessionConfig: (data = {}) => {
    console.log('更新会话配置', data);
    return request.put('/api/admin/sessions/config', data);
  }
};

module.exports = adminSessionApi;