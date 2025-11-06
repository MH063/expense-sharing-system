// 账单API
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
   * @param {string} id - 账单ID
   * @returns {Promise} 账单详情
   */
  getBillById(id) {
    return http.get(`/bills/${id}`);
  },

  /**
   * 创建账单
   * @param {Object} data - 账单数据
   * @returns {Promise} 创建的账单
   */
  createBill(data) {
    return http.post('/bills', data);
  },

  /**
   * 更新账单
   * @param {string} id - 账单ID
   * @param {Object} data - 更新数据
   * @returns {Promise} 更新后的账单
   */
  updateBill(id, data) {
    return http.put(`/bills/${id}`, data);
  },

  /**
   * 删除账单
   * @param {string} id - 账单ID
   * @returns {Promise} 删除结果
   */
  deleteBill(id) {
    return http.delete(`/bills/${id}`);
  },

  /**
   * 获取账单统计信息
   * @param {Object} params - 查询参数
   * @returns {Promise} 统计信息
   */
  getBillStats(params) {
    return http.get('/bills/stats', { params });
  },

  /**
   * 获取支付转移记录
   * @param {Object} params - 查询参数
   * @returns {Promise} 支付转移记录
   */
  getPaymentTransfers(params) {
    return http.get('/payment-transfers', { params });
  },

  /**
   * 创建支付转移记录
   * @param {Object} data - 支付转移数据
   * @returns {Promise} 创建的支付转移记录
   */
  createPaymentTransfer(data) {
    return http.post('/payment-transfers', data);
  },

  /**
   * 确认支付转移记录
   * @param {string} id - 支付转移记录ID
   * @returns {Promise} 确认结果
   */
  confirmPaymentTransfer(id) {
    return http.put(`/payment-transfers/${id}/confirm`);
  },

  /**
   * 取消支付转移记录
   * @param {string} id - 支付转移记录ID
   * @returns {Promise} 取消结果
   */
  cancelPaymentTransfer(id) {
    return http.put(`/payment-transfers/${id}/cancel`);
  },

  /**
   * 获取费用类型
   * @param {string} roomId - 房间ID
   * @returns {Promise} 费用类型列表
   */
  getExpenseTypes(roomId) {
    return http.get(`/expense-types?room_id=${roomId}`);
  },

  /**
   * 获取特殊支付规则
   * @param {string} roomId - 房间ID
   * @returns {Promise} 特殊支付规则列表
   */
  getSpecialPaymentRules(roomId) {
    return http.get(`/special-payments/rooms/${roomId}/rules`);
  },

  /**
   * 创建特殊支付规则
   * @param {string} roomId - 房间ID
   * @param {Object} data - 规则数据
   * @returns {Promise} 创建的规则
   */
  createSpecialPaymentRule(roomId, data) {
    return http.post(`/special-payments/rooms/${roomId}/rules`, data);
  },

  /**
   * 更新特殊支付规则
   * @param {string} ruleId - 规则ID
   * @param {Object} data - 更新数据
   * @returns {Promise} 更新后的规则
   */
  updateSpecialPaymentRule(ruleId, data) {
    return http.put(`/special-payments/rules/${ruleId}`, data);
  },

  /**
   * 删除特殊支付规则
   * @param {string} ruleId - 规则ID
   * @returns {Promise} 删除结果
   */
  deleteSpecialPaymentRule(ruleId) {
    return http.delete(`/special-payments/rules/${ruleId}`);
  },

  /**
   * 获取账单分账记录
   * @param {string} billId - 账单ID
   * @returns {Promise} 分账记录列表
   */
  getBillSplits(billId) {
    return http.get(`/bills/${billId}/splits`);
  },

  /**
   * 获取适用的特殊支付规则
   * @param {string} billId - 账单ID
   * @returns {Promise} 适用的规则列表
   */
  getApplicableRules(billId) {
    return http.get(`/special-payments/bills/${billId}/applicable-rules`);
  }
};

// 导出单独的函数以保持向后兼容
export const getBills = billApi.getBills;
export const getBillById = billApi.getBillById;
export const createBill = billApi.createBill;
export const updateBill = billApi.updateBill;
export const deleteBill = billApi.deleteBill;
export const getBillStats = billApi.getBillStats;
export const getPaymentTransfers = billApi.getPaymentTransfers;
export const createPaymentTransfer = billApi.createPaymentTransfer;
export const confirmPaymentTransfer = billApi.confirmPaymentTransfer;
export const cancelPaymentTransfer = billApi.cancelPaymentTransfer;
export const getExpenseTypes = billApi.getExpenseTypes;
export const getSpecialPaymentRules = billApi.getSpecialPaymentRules;
export const createSpecialPaymentRule = billApi.createSpecialPaymentRule;
export const updateSpecialPaymentRule = billApi.updateSpecialPaymentRule;
export const deleteSpecialPaymentRule = billApi.deleteSpecialPaymentRule;
export const getBillSplits = billApi.getBillSplits;
export const getApplicableRules = billApi.getApplicableRules;

export default billApi;