// 账单API
import http from '../utils/http'

/**
 * 获取账单列表
 * @param {Object} params - 查询参数
 * @returns {Promise} 账单列表
 */
export const getBills = (params) => {
  return http.get('/api/bills', { params })
}

/**
 * 获取账单详情
 * @param {string} id - 账单ID
 * @returns {Promise} 账单详情
 */
export const getBillById = (id) => {
  return http.get(`/api/bills/${id}`)
}

/**
 * 创建账单
 * @param {Object} data - 账单数据
 * @returns {Promise} 创建的账单
 */
export const createBill = (data) => {
  return http.post('/api/bills', data)
}

/**
 * 更新账单
 * @param {string} id - 账单ID
 * @param {Object} data - 更新数据
 * @returns {Promise} 更新后的账单
 */
export const updateBill = (id, data) => {
  return http.put(`/api/bills/${id}`, data)
}

/**
 * 删除账单
 * @param {string} id - 账单ID
 * @returns {Promise} 删除结果
 */
export const deleteBill = (id) => {
  return http.delete(`/api/bills/${id}`)
}

/**
 * 获取账单统计信息
 * @param {Object} params - 查询参数
 * @returns {Promise} 统计信息
 */
export const getBillStats = (params) => {
  return http.get('/api/bills/stats', { params })
}

/**
 * 获取支付转移记录
 * @param {Object} params - 查询参数
 * @returns {Promise} 支付转移记录
 */
export const getPaymentTransfers = (params) => {
  return http.get('/api/payment-transfers', { params })
}

/**
 * 创建支付转移记录
 * @param {Object} data - 支付转移数据
 * @returns {Promise} 创建的支付转移记录
 */
export const createPaymentTransfer = (data) => {
  return http.post('/api/payment-transfers', data)
}

/**
 * 确认支付转移记录
 * @param {string} id - 支付转移记录ID
 * @returns {Promise} 确认结果
 */
export const confirmPaymentTransfer = (id) => {
  return http.put(`/api/payment-transfers/${id}/confirm`)
}

/**
 * 取消支付转移记录
 * @param {string} id - 支付转移记录ID
 * @returns {Promise} 取消结果
 */
export const cancelPaymentTransfer = (id) => {
  return http.put(`/api/payment-transfers/${id}/cancel`)
}

/**
 * 获取费用类型
 * @param {string} roomId - 房间ID
 * @returns {Promise} 费用类型列表
 */
export const getExpenseTypes = (roomId) => {
  return http.get(`/api/expense-types?room_id=${roomId}`)
}

/**
 * 获取特殊支付规则
 * @param {string} roomId - 房间ID
 * @returns {Promise} 特殊支付规则列表
 */
export const getSpecialPaymentRules = (roomId) => {
  return http.get(`/api/special-payments/rooms/${roomId}/rules`)
}

/**
 * 创建特殊支付规则
 * @param {string} roomId - 房间ID
 * @param {Object} data - 规则数据
 * @returns {Promise} 创建的规则
 */
export const createSpecialPaymentRule = (roomId, data) => {
  return http.post(`/api/special-payments/rooms/${roomId}/rules`, data)
}

/**
 * 更新特殊支付规则
 * @param {string} ruleId - 规则ID
 * @param {Object} data - 更新数据
 * @returns {Promise} 更新后的规则
 */
export const updateSpecialPaymentRule = (ruleId, data) => {
  return http.put(`/api/special-payments/rules/${ruleId}`, data)
}

/**
 * 删除特殊支付规则
 * @param {string} ruleId - 规则ID
 * @returns {Promise} 删除结果
 */
export const deleteSpecialPaymentRule = (ruleId) => {
  return http.delete(`/api/special-payments/rules/${ruleId}`)
}

/**
 * 获取账单分账记录
 * @param {string} billId - 账单ID
 * @returns {Promise} 分账记录列表
 */
export const getBillSplits = (billId) => {
  return http.get(`/api/bills/${billId}/splits`)
}

/**
 * 获取适用的特殊支付规则
 * @param {string} billId - 账单ID
 * @returns {Promise} 适用的规则列表
 */
export const getApplicableRules = (billId) => {
  return http.get(`/api/special-payments/bills/${billId}/applicable-rules`)
}

// 导出billApi对象
export const billApi = {
  getBills,
  getBillById,
  createBill,
  updateBill,
  deleteBill,
  getBillStats,
  getPaymentTransfers,
  createPaymentTransfer,
  confirmPaymentTransfer,
  cancelPaymentTransfer,
  getExpenseTypes,
  getSpecialPaymentRules,
  createSpecialPaymentRule,
  updateSpecialPaymentRule,
  deleteSpecialPaymentRule,
  getBillSplits,
  getApplicableRules
}

export default {
  getBills,
  getBillById,
  createBill,
  updateBill,
  deleteBill,
  getBillStats,
  getPaymentTransfers,
  createPaymentTransfer,
  confirmPaymentTransfer,
  cancelPaymentTransfer,
  getExpenseTypes,
  getSpecialPaymentRules,
  createSpecialPaymentRule,
  updateSpecialPaymentRule,
  deleteSpecialPaymentRule,
  getBillSplits,
  getApplicableRules
}