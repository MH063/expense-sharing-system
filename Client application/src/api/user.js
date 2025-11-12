import http from './config';

/**
 * 认证管理API
 */
export const authApi = {
  /**
   * 用户登录
   * @param {Object} credentials - 登录凭据
   * @param {string} credentials.username - 用户名
   * @param {string} credentials.password - 密码
   * @returns {Promise} 登录结果
   */
  login(credentials) {
    return http.post('/auth/login', credentials);
  },

  /**
   * 用户注册
   * @param {Object} userData - 用户数据
   * @returns {Promise} 注册结果
   */
  register(userData) {
    return http.post('/auth/register', userData);
  },

  /**
   * 用户登出
   * @returns {Promise} 登出结果
   */
  logout() {
    return http.post('/auth/logout');
  },

  /**
   * 刷新token
   * @returns {Promise} 新token
   */
  refreshToken() {
    return http.post('/auth/refresh-token');
  }
};

/**
 * 用户管理API
 */
export const userApi = {
  /**
   * 获取当前用户信息
   * @returns {Promise} 用户信息
   */
  getCurrentUser() {
    return http.get('/users/profile');
  },

  /**
   * 更新用户信息
   * @param {Object} data - 用户信息
   * @returns {Promise} 更新结果
   */
  updateProfile(data) {
    return http.put('/users/profile', data);
  },

  /**
   * 修改密码
   * @param {Object} data - 密码信息
   * @returns {Promise} 修改结果
   */
  changePassword(data) {
    return http.put('/users/password', data);
  },

  /**
   * 上传头像
   * @param {FormData} data - 头像文件
   * @returns {Promise} 上传结果
   */
  uploadAvatar(data) {
    return http.post('/users/avatar', data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  /**
   * 获取用户通知列表
   * @param {Object} params - 查询参数
   * @returns {Promise} 通知列表
   */
  getNotifications(params) {
    return http.get('/notifications', { params });
  },

  /**
   * 标记通知为已读
   * @param {string} notificationId - 通知ID
   * @returns {Promise} 标记结果
   */
  markNotificationAsRead(notificationId) {
    return http.put(`/notifications/${notificationId}/read`);
  },

  /**
   * 标记所有通知为已读
   * @returns {Promise} 标记结果
   */
  markAllNotificationsAsRead() {
    return http.put('/notifications/mark-all-read');
  },

  /**
   * 删除通知
   * @param {string} notificationId - 通知ID
   * @returns {Promise} 删除结果
   */
  deleteNotification(notificationId) {
    return http.delete(`/notifications/${notificationId}`);
  },

  /**
   * 获取用户设置
   * @returns {Promise} 用户设置
   */
  getUserSettings() {
    return http.get('/users/settings');
  },

  /**
   * 更新用户设置
   * @param {Object} data - 设置信息
   * @returns {Promise} 更新结果
   */
  updateUserSettings(data) {
    return http.put('/users/settings', data);
  },

  /**
   * 绑定第三方账号
   * @param {string} provider - 第三方提供商
   * @param {Object} data - 绑定信息
   * @returns {Promise} 绑定结果
   */
  bindThirdPartyAccount(provider, data) {
    return http.post(`/users/bind/${provider}`, data);
  },

  /**
   * 解绑第三方账号
   * @param {string} provider - 第三方提供商
   * @returns {Promise} 解绑结果
   */
  unbindThirdPartyAccount(provider) {
    return http.post(`/users/unbind/${provider}`);
  },

  /**
   * 获取用户活动日志
   * @param {Object} params - 查询参数
   * @returns {Promise} 活动日志
   */
  getUserActivityLogs(params) {
    return http.get('/users/activity-logs', { params });
  },

  /**
   * 获取用户角色
   * @returns {Promise} 用户角色
   */
  getUserRoles() {
    return http.get('/users/roles');
  },

  /**
   * 获取用户权限
   * @returns {Promise} 用户权限
   */
  getUserPermissions() {
    return http.get('/users/permissions');
  },

  /**
   * 获取用户所属房间
   * @returns {Promise} 用户房间列表
   */
  getUserRooms() {
    return http.get('/users/rooms');
  },

  /**
   * 获取用户会话列表
   * @returns {Promise} 会话列表
   */
  getUserSessions() {
    return http.get('/users/sessions');
  },

  /**
   * 终止用户会话
   * @param {string} sessionId - 会话ID
   * @returns {Promise} 终止结果
   */
  terminateUserSession(sessionId) {
    return http.delete(`/users/sessions/${sessionId}`);
  },

  /**
   * 获取通知渠道
   * @returns {Promise} 通知渠道列表
   */
  getNotificationChannels() {
    return http.get('/users/notification-channels');
  },

  /**
   * 添加通知渠道
   * @param {Object} data - 通知渠道数据
   * @returns {Promise} 添加结果
   */
  addNotificationChannel(data) {
    return http.post('/users/notification-channels', data);
  },

  /**
   * 更新通知渠道
   * @param {string} channelId - 渠道ID
   * @param {Object} data - 通知渠道数据
   * @returns {Promise} 更新结果
   */
  updateNotificationChannel(channelId, data) {
    return http.put(`/users/notification-channels/${channelId}`, data);
  },

  /**
   * 删除通知渠道
   * @param {string} channelId - 渠道ID
   * @returns {Promise} 删除结果
   */
  deleteNotificationChannel(channelId) {
    return http.delete(`/users/notification-channels/${channelId}`);
  }
};

// 导出单独的函数以保持向后兼容
export const login = authApi.login;
export const register = authApi.register;
export const logout = authApi.logout;
export const refreshToken = authApi.refreshToken;
export const getCurrentUser = userApi.getCurrentUser;
export const updateProfile = userApi.updateProfile;
export const changePassword = userApi.changePassword;
export const uploadAvatar = userApi.uploadAvatar;
export const getNotifications = userApi.getNotifications;
export const markNotificationAsRead = userApi.markNotificationAsRead;
export const markAllNotificationsAsRead = userApi.markAllNotificationsAsRead;
export const deleteNotification = userApi.deleteNotification;
export const getUserSettings = userApi.getUserSettings;
export const updateUserSettings = userApi.updateUserSettings;
export const bindThirdPartyAccount = userApi.bindThirdPartyAccount;
export const unbindThirdPartyAccount = userApi.unbindThirdPartyAccount;
export const getUserActivityLogs = userApi.getUserActivityLogs;
export const getUserRoles = userApi.getUserRoles;
export const getUserPermissions = userApi.getUserPermissions;
export const getUserSessions = userApi.getUserSessions;
export const terminateUserSession = userApi.terminateUserSession;
export const getNotificationChannels = userApi.getNotificationChannels;
export const addNotificationChannel = userApi.addNotificationChannel;
export const updateNotificationChannel = userApi.updateNotificationChannel;
export const deleteNotificationChannel = userApi.deleteNotificationChannel;

// 默认导出用户API
export default userApi;