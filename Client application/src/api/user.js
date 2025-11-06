/**
 * 用户相关API接口
 */
import request from './request'

/**
 * 用户登录
 * @param {Object} data - 登录信息
 * @returns {Promise} 登录结果
 */
export function login(data) {
  return request({
    url: '/api/auth/login',
    method: 'post',
    data
  })
}

/**
 * 用户注册
 * @param {Object} data - 注册信息
 * @returns {Promise} 注册结果
 */
export function register(data) {
  return request({
    url: '/api/auth/register',
    method: 'post',
    data
  })
}

/**
 * 用户登出
 * @returns {Promise} 登出结果
 */
export function logout() {
  return request({
    url: '/api/auth/logout',
    method: 'post'
  })
}

/**
 * 刷新令牌
 * @returns {Promise} 刷新结果
 */
export function refreshToken() {
  return request({
    url: '/api/auth/refresh',
    method: 'post'
  })
}

/**
 * 获取当前用户信息
 * @returns {Promise} 用户信息
 */
export function getCurrentUser() {
  return request({
    url: '/api/users/profile',
    method: 'get'
  })
}

/**
 * 更新用户信息
 * @param {Object} data - 用户信息
 * @returns {Promise} 更新结果
 */
export function updateProfile(data) {
  return request({
    url: '/api/users/profile',
    method: 'put',
    data
  })
}

/**
 * 修改密码
 * @param {Object} data - 密码信息
 * @returns {Promise} 修改结果
 */
export function changePassword(data) {
  return request({
    url: '/api/users/password',
    method: 'put',
    data
  })
}

/**
 * 上传头像
 * @param {FormData} data - 头像文件
 * @returns {Promise} 上传结果
 */
export function uploadAvatar(data) {
  return request({
    url: '/api/users/avatar',
    method: 'post',
    data,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 获取用户通知列表
 * @param {Object} params - 查询参数
 * @returns {Promise} 通知列表
 */
export function getNotifications(params) {
  return request({
    url: '/api/notifications',
    method: 'get',
    params
  })
}

/**
 * 标记通知为已读
 * @param {string} notificationId - 通知ID
 * @returns {Promise} 标记结果
 */
export function markNotificationAsRead(notificationId) {
  return request({
    url: `/api/notifications/${notificationId}/read`,
    method: 'put'
  })
}

/**
 * 标记所有通知为已读
 * @returns {Promise} 标记结果
 */
export function markAllNotificationsAsRead() {
  return request({
    url: '/api/notifications/read-all',
    method: 'put'
  })
}

/**
 * 删除通知
 * @param {string} notificationId - 通知ID
 * @returns {Promise} 删除结果
 */
export function deleteNotification(notificationId) {
  return request({
    url: `/api/notifications/${notificationId}`,
    method: 'delete'
  })
}

/**
 * 获取用户设置
 * @returns {Promise} 用户设置
 */
export function getUserSettings() {
  return request({
    url: '/api/users/settings',
    method: 'get'
  })
}

/**
 * 更新用户设置
 * @param {Object} data - 设置信息
 * @returns {Promise} 更新结果
 */
export function updateUserSettings(data) {
  return request({
    url: '/api/users/settings',
    method: 'put',
    data
  })
}

/**
 * 绑定第三方账号
 * @param {string} provider - 第三方提供商
 * @param {Object} data - 绑定信息
 * @returns {Promise} 绑定结果
 */
export function bindThirdPartyAccount(provider, data) {
  return request({
    url: `/api/users/bind/${provider}`,
    method: 'post',
    data
  })
}

/**
 * 解绑第三方账号
 * @param {string} provider - 第三方提供商
 * @returns {Promise} 解绑结果
 */
export function unbindThirdPartyAccount(provider) {
  return request({
    url: `/api/users/unbind/${provider}`,
    method: 'post'
  })
}

/**
 * 获取用户活动日志
 * @param {Object} params - 查询参数
 * @returns {Promise} 活动日志
 */
export function getUserActivityLogs(params) {
  return request({
    url: '/api/users/activity-logs',
    method: 'get',
    params
  })
}

/**
 * 用户API对象
 */
export const userApi = {
  login,
  register,
  logout,
  refreshToken,
  getCurrentUser,
  updateProfile,
  changePassword,
  uploadAvatar,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUserSettings,
  updateUserSettings,
  bindThirdPartyAccount,
  unbindThirdPartyAccount,
  getUserActivityLogs
}