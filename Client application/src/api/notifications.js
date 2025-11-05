/**
 * 通知相关API接口
 */

import request from './request';

const notificationApi = {
  /**
   * 获取用户通知列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.limit - 每页数量
   * @param {string} params.type - 通知类型
   * @param {boolean} params.isRead - 是否已读
   * @returns {Promise} 通知列表
   */
  getNotifications(params = {}) {
    console.log('获取通知列表，参数:', params);
    return request({
        url: '/notifications',
        method: 'get',
        params
      });
  },

  /**
   * 获取未读通知数量
   * @returns {Promise} 未读通知数量
   */
  getUnreadCount() {
    console.log('获取未读通知数量');
    return request({
      url: '/notifications/unread-count',
      method: 'get'
    });
  },

  /**
   * 标记通知为已读
   * @param {string} id - 通知ID
   * @returns {Promise} 标记结果
   */
  markAsRead(id) {
    console.log('标记通知为已读，ID:', id);
    return request({
      url: `/notifications/${id}/read`,
      method: 'patch'
    });
  },

  /**
   * 批量标记通知为已读
   * @returns {Promise} 标记结果
   */
  markAllAsRead() {
    console.log('批量标记通知为已读');
    return request({
      url: '/notifications/mark-all-read',
      method: 'patch'
    });
  },

  /**
   * 删除通知
   * @param {string} id - 通知ID
   * @returns {Promise} 删除结果
   */
  deleteNotification(id) {
    console.log('删除通知，ID:', id);
    return request({
      url: `/notifications/${id}`,
      method: 'delete'
    });
  },

  /**
   * 创建通知
   * @param {Object} data - 通知数据
   * @returns {Promise} 创建结果
   */
  createNotification(data) {
    console.log('创建通知，数据:', data);
    return request({
      url: '/notifications',
      method: 'post',
      data
    });
  },

  /**
   * 获取账单到期提醒
   * @param {Object} params - 查询参数
   * @returns {Promise} 账单到期提醒列表
   */
  getBillDueReminders(params = {}) {
    console.log('获取账单到期提醒，参数:', params);
    return request({
      url: '/notifications/bill-due-reminders',
      method: 'get',
      params
    });
  },

  /**
   * 获取支付状态变更通知
   * @param {Object} params - 查询参数
   * @returns {Promise} 支付状态变更通知列表
   */
  getPaymentStatusNotifications(params = {}) {
    console.log('获取支付状态变更通知，参数:', params);
    return request({
      url: '/notifications/payment-status-notifications',
      method: 'get',
      params
    });
  }
};

export default notificationApi;