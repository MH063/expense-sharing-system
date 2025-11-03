/**
 * 账单相关API接口
 */
import request from './request'

/**
 * 获取账单列表
 * @param {Object} params - 查询参数
 * @returns {Promise} 账单列表
 */
export function getBills(params) {
  return request({
    url: '/api/bills',
    method: 'get',
    params
  })
}

/**
 * 获取账单详情
 * @param {string} billId - 账单ID
 * @returns {Promise} 账单详情
 */
export function getBillDetail(billId) {
  return request({
    url: `/api/bills/${billId}`,
    method: 'get'
  })
}

/**
 * 创建账单
 * @param {Object} data - 账单信息
 * @returns {Promise} 创建结果
 */
export function createBill(data) {
  return request({
    url: '/api/bills',
    method: 'post',
    data
  })
}

/**
 * 更新账单
 * @param {string} billId - 账单ID
 * @param {Object} data - 更新数据
 * @returns {Promise} 更新结果
 */
export function updateBill(billId, data) {
  return request({
    url: `/api/bills/${billId}`,
    method: 'put',
    data
  })
}

/**
 * 删除账单
 * @param {string} billId - 账单ID
 * @returns {Promise} 删除结果
 */
export function deleteBill(billId) {
  return request({
    url: `/api/bills/${billId}`,
    method: 'delete'
  })
}

/**
 * 结算账单
 * @param {string} billId - 账单ID
 * @returns {Promise} 结算结果
 */
export function settleBill(billId) {
  return request({
    url: `/api/bills/${billId}/settle`,
    method: 'post'
  })
}

/**
 * 获取账单结算详情
 * @param {string} billId - 账单ID
 * @returns {Promise} 结算详情
 */
export function getBillSettlementDetail(billId) {
  return request({
    url: `/api/bills/${billId}/settlement`,
    method: 'get'
  })
}

/**
 * 确认账单结算
 * @param {string} billId - 账单ID
 * @param {Object} data - 确认信息
 * @returns {Promise} 确认结果
 */
export function confirmBillSettlement(billId, data) {
  return request({
    url: `/api/bills/${billId}/settlement/confirm`,
    method: 'post',
    data
  })
}

/**
 * 获取账单统计
 * @param {Object} params - 查询参数
 * @returns {Promise} 统计数据
 */
export function getBillStatistics(params) {
  return request({
    url: '/api/bills/statistics',
    method: 'get',
    params
  })
}

/**
 * 导出账单
 * @param {string} billId - 账单ID
 * @param {Object} params - 导出参数
 * @returns {Promise} 导出结果
 */
export function exportBill(billId, params) {
  return request({
    url: `/api/bills/${billId}/export`,
    method: 'get',
    params,
    responseType: 'blob'
  })
}

/**
 * 分享账单
 * @param {string} billId - 账单ID
 * @returns {Promise} 分享结果
 */
export function shareBill(billId) {
  return request({
    url: `/api/bills/${billId}/share`,
    method: 'post'
  })
}

/**
 * 获取账单分享详情
 * @param {string} shareCode - 分享码
 * @returns {Promise} 分享详情
 */
export function getSharedBill(shareCode) {
  return request({
    url: `/api/bills/shared/${shareCode}`,
    method: 'get'
  })
}

/**
 * 添加账单备注
 * @param {string} billId - 账单ID
 * @param {Object} data - 备注信息
 * @returns {Promise} 添加结果
 */
export function addBillComment(billId, data) {
  return request({
    url: `/api/bills/${billId}/comments`,
    method: 'post',
    data
  })
}

/**
 * 获取账单备注列表
 * @param {string} billId - 账单ID
 * @param {Object} params - 查询参数
 * @returns {Promise} 备注列表
 */
export function getBillComments(billId, params) {
  return request({
    url: `/api/bills/${billId}/comments`,
    method: 'get',
    params
  })
}

/**
 * 删除账单备注
 * @param {string} billId - 账单ID
 * @param {string} commentId - 备注ID
 * @returns {Promise} 删除结果
 */
export function deleteBillComment(billId, commentId) {
  return request({
    url: `/api/bills/${billId}/comments/${commentId}`,
    method: 'delete'
  })
}

/**
 * 获取支付转移记录列表
 * @param {Object} params - 查询参数
 * @returns {Promise} 支付转移记录列表
 */
export function getPaymentTransfers(params) {
  return request({
    url: '/api/payment-transfers',
    method: 'get',
    params
  })
}

/**
 * 创建支付转移记录
 * @param {Object} data - 转移记录信息
 * @returns {Promise} 创建结果
 */
export function createPaymentTransfer(data) {
  return request({
    url: '/api/payment-transfers',
    method: 'post',
    data
  })
}

/**
 * 确认支付转移记录
 * @param {string} transferId - 转移记录ID
 * @returns {Promise} 确认结果
 */
export function confirmPaymentTransfer(transferId) {
  return request({
    url: `/api/payment-transfers/${transferId}/confirm`,
    method: 'post'
  })
}

/**
 * 取消支付转移记录
 * @param {string} transferId - 转移记录ID
 * @returns {Promise} 取消结果
 */
export function cancelPaymentTransfer(transferId) {
  return request({
    url: `/api/payment-transfers/${transferId}/cancel`,
    method: 'post'
  })
}

/**
 * 账单API对象
 */
export const billApi = {
  getBills,
  getBillDetail,
  createBill,
  updateBill,
  deleteBill,
  settleBill,
  getBillSettlementDetail,
  confirmBillSettlement,
  getBillStatistics,
  exportBill,
  shareBill,
  getSharedBill,
  addBillComment,
  getBillComments,
  deleteBillComment
}