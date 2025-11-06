import http from './config';

/**
 * 支付管理API
 */
export const paymentApi = {
  /**
   * 获取支付记录列表
   * @param {Object} params - 查询参数
   * @returns {Promise} 支付记录列表
   */
  getPayments(params = {}) {
    return http.get('/payments', { params });
  },

  /**
   * 获取支付记录详情
   * @param {string} id - 支付记录ID
   * @returns {Promise} 支付记录详情
   */
  getPayment(id) {
    return http.get(`/payments/${id}`);
  },

  /**
   * 创建支付记录
   * @param {Object} data - 支付数据
   * @returns {Promise} 创建的支付记录
   */
  createPayment(data) {
    return http.post('/payments', data);
  },

  /**
   * 更新支付记录
   * @param {string} id - 支付记录ID
   * @param {Object} data - 更新数据
   * @returns {Promise} 更新后的支付记录
   */
  updatePayment(id, data) {
    return http.put(`/payments/${id}`, data);
  },

  /**
   * 删除支付记录
   * @param {string} id - 支付记录ID
   * @returns {Promise} 删除结果
   */
  deletePayment(id) {
    return http.delete(`/payments/${id}`);
  },

  /**
   * 确认支付
   * @param {string} id - 支付记录ID
   * @returns {Promise} 确认结果
   */
  confirmPayment(id) {
    return http.post(`/payments/${id}/confirm`);
  },

  /**
   * 取消支付
   * @param {string} id - 支付记录ID
   * @returns {Promise} 取消结果
   */
  cancelPayment(id) {
    return http.post(`/payments/${id}/cancel`);
  },

  /**
   * 获取支付统计
   * @param {Object} params - 查询参数
   * @returns {Promise} 支付统计数据
   */
  getPaymentStats(params = {}) {
    return http.get('/payments/stats', { params });
  }
};

// 导出单独的函数以保持向后兼容
export const getPayments = paymentApi.getPayments;
export const getPayment = paymentApi.getPayment;
export const createPayment = paymentApi.createPayment;
export const updatePayment = paymentApi.updatePayment;
export const deletePayment = paymentApi.deletePayment;
export const confirmPayment = paymentApi.confirmPayment;
export const cancelPayment = paymentApi.cancelPayment;
export const getPaymentStats = paymentApi.getPaymentStats;

// 导出paymentsApi对象以保持向后兼容
export const paymentsApi = paymentApi;
export default paymentApi;