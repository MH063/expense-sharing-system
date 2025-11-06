import http from './config';

/**
 * 账单管理API
 */
export const billApi = {
  /**
   * 获取账单列表
   * @param {Object} params - 查询参数
   * @returns {Promise} 账单列表
   */
  getBills(params) {
    return http.get('/bills', { params });
  },

  /**
   * 获取账单详情
   * @param {string} billId - 账单ID
   * @returns {Promise} 账单详情
   */
  getBillDetail(billId) {
    return http.get(`/bills/${billId}`);
  },

  /**
   * 创建账单
   * @param {Object} data - 账单信息
   * @returns {Promise} 创建结果
   */
  createBill(data) {
    return http.post('/bills', data);
  },

  /**
   * 更新账单
   * @param {string} billId - 账单ID
   * @param {Object} data - 更新数据
   * @returns {Promise} 更新结果
   */
  updateBill(billId, data) {
    return http.put(`/bills/${billId}`, data);
  },

  /**
   * 删除账单
   * @param {string} billId - 账单ID
   * @returns {Promise} 删除结果
   */
  deleteBill(billId) {
    return http.delete(`/bills/${billId}`);
  },

  /**
   * 结算账单
   * @param {string} billId - 账单ID
   * @returns {Promise} 结算结果
   */
  settleBill(billId) {
    return http.post(`/bills/${billId}/settle`);
  },

  /**
   * 获取账单结算详情
   * @param {string} billId - 账单ID
   * @returns {Promise} 结算详情
   */
  getBillSettlementDetail(billId) {
    return http.get(`/bills/${billId}/settlement`);
  },

  /**
   * 确认账单结算
   * @param {string} billId - 账单ID
   * @param {Object} data - 确认信息
   * @returns {Promise} 确认结果
   */
  confirmBillSettlement(billId, data) {
    return http.post(`/bills/${billId}/settlement/confirm`, data);
  },

  /**
   * 获取账单统计
   * @param {Object} params - 查询参数
   * @returns {Promise} 统计数据
   */
  getBillStatistics(params) {
    return http.get('/bills/statistics', { params });
  },

  /**
   * 导出账单
   * @param {string} billId - 账单ID
   * @param {Object} params - 导出参数
   * @returns {Promise} 导出结果
   */
  exportBill(billId, params) {
    return http.get(`/bills/${billId}/export`, {
      params,
      responseType: 'blob'
    });
  },

  /**
   * 分享账单
   * @param {string} billId - 账单ID
   * @returns {Promise} 分享结果
   */
  shareBill(billId) {
    return http.post(`/bills/${billId}/share`);
  },

  /**
   * 获取账单分享详情
   * @param {string} shareCode - 分享码
   * @returns {Promise} 分享详情
   */
  getSharedBill(shareCode) {
    return http.get(`/bills/shared/${shareCode}`);
  },

  /**
   * 添加账单备注
   * @param {string} billId - 账单ID
   * @param {Object} data - 备注信息
   * @returns {Promise} 添加结果
   */
  addBillComment(billId, data) {
    return http.post(`/bills/${billId}/comments`, data);
  },

  /**
   * 获取账单备注列表
   * @param {string} billId - 账单ID
   * @param {Object} params - 查询参数
   * @returns {Promise} 备注列表
   */
  getBillComments(billId, params) {
    return http.get(`/bills/${billId}/comments`, { params });
  },

  /**
   * 删除账单备注
   * @param {string} billId - 账单ID
   * @param {string} commentId - 备注ID
   * @returns {Promise} 删除结果
   */
  deleteBillComment(billId, commentId) {
    return http.delete(`/bills/${billId}/comments/${commentId}`);
  },

  /**
   * 获取支付转移记录列表
   * @param {Object} params - 查询参数
   * @returns {Promise} 支付转移记录列表
   */
  getPaymentTransfers(params) {
    return http.get('/payment-transfers', { params });
  },

  /**
   * 创建支付转移记录
   * @param {Object} data - 转移记录信息
   * @returns {Promise} 创建结果
   */
  createPaymentTransfer(data) {
    return http.post('/payment-transfers', data);
  },

  /**
   * 确认支付转移记录
   * @param {string} transferId - 转移记录ID
   * @returns {Promise} 确认结果
   */
  confirmPaymentTransfer(transferId) {
    return http.post(`/payment-transfers/${transferId}/confirm`);
  },

  /**
   * 取消支付转移记录
   * @param {string} transferId - 转移记录ID
   * @returns {Promise} 取消结果
   */
  cancelPaymentTransfer(transferId) {
    return http.post(`/payment-transfers/${transferId}/cancel`);
  }
};

// 导出单独的函数以保持向后兼容
export const getBills = billApi.getBills;
export const getBillDetail = billApi.getBillDetail;
export const createBill = billApi.createBill;
export const updateBill = billApi.updateBill;
export const deleteBill = billApi.deleteBill;
export const settleBill = billApi.settleBill;
export const getBillSettlementDetail = billApi.getBillSettlementDetail;
export const confirmBillSettlement = billApi.confirmBillSettlement;
export const getBillStatistics = billApi.getBillStatistics;
export const exportBill = billApi.exportBill;
export const shareBill = billApi.shareBill;
export const getSharedBill = billApi.getSharedBill;
export const addBillComment = billApi.addBillComment;
export const getBillComments = billApi.getBillComments;
export const deleteBillComment = billApi.deleteBillComment;
export const getPaymentTransfers = billApi.getPaymentTransfers;
export const createPaymentTransfer = billApi.createPaymentTransfer;
export const confirmPaymentTransfer = billApi.confirmPaymentTransfer;
export const cancelPaymentTransfer = billApi.cancelPaymentTransfer;

export default billApi;