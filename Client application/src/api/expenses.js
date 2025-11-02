/**
 * 费用相关API接口
 */
import request from './request'

/**
 * 获取费用列表
 * @param {Object} params - 查询参数
 * @returns {Promise} 费用列表
 */
export function getExpenses(params) {
  return request({
    url: '/api/expenses',
    method: 'get',
    params
  })
}

/**
 * 获取费用详情
 * @param {string} expenseId - 费用ID
 * @returns {Promise} 费用详情
 */
export function getExpenseDetail(expenseId) {
  return request({
    url: `/api/expenses/${expenseId}`,
    method: 'get'
  })
}

/**
 * 创建费用记录
 * @param {Object} data - 费用信息
 * @returns {Promise} 创建结果
 */
export function createExpense(data) {
  return request({
    url: '/api/expenses',
    method: 'post',
    data
  })
}

/**
 * 更新费用记录
 * @param {string} expenseId - 费用ID
 * @param {Object} data - 更新数据
 * @returns {Promise} 更新结果
 */
export function updateExpense(expenseId, data) {
  return request({
    url: `/api/expenses/${expenseId}`,
    method: 'put',
    data
  })
}

/**
 * 删除费用记录
 * @param {string} expenseId - 费用ID
 * @returns {Promise} 删除结果
 */
export function deleteExpense(expenseId) {
  return request({
    url: `/api/expenses/${expenseId}`,
    method: 'delete'
  })
}

/**
 * 批量删除费用记录
 * @param {Array} expenseIds - 费用ID数组
 * @returns {Promise} 删除结果
 */
export function batchDeleteExpenses(expenseIds) {
  return request({
    url: '/api/expenses/batch-delete',
    method: 'post',
    data: { expenseIds }
  })
}

/**
 * 获取费用分类列表
 * @param {Object} params - 查询参数
 * @returns {Promise} 分类列表
 */
export function getExpenseCategories(params) {
  return request({
    url: '/api/expenses/categories',
    method: 'get',
    params
  })
}

/**
 * 创建费用分类
 * @param {Object} data - 分类信息
 * @returns {Promise} 创建结果
 */
export function createExpenseCategory(data) {
  return request({
    url: '/api/expenses/categories',
    method: 'post',
    data
  })
}

/**
 * 更新费用分类
 * @param {string} categoryId - 分类ID
 * @param {Object} data - 更新数据
 * @returns {Promise} 更新结果
 */
export function updateExpenseCategory(categoryId, data) {
  return request({
    url: `/api/expenses/categories/${categoryId}`,
    method: 'put',
    data
  })
}

/**
 * 删除费用分类
 * @param {string} categoryId - 分类ID
 * @returns {Promise} 删除结果
 */
export function deleteExpenseCategory(categoryId) {
  return request({
    url: `/api/expenses/categories/${categoryId}`,
    method: 'delete'
  })
}

/**
 * 获取费用统计
 * @param {Object} params - 查询参数
 * @returns {Promise} 统计数据
 */
export function getExpenseStatistics(params) {
  return request({
    url: '/api/expenses/statistics',
    method: 'get',
    params
  })
}

/**
 * 获取费用趋势数据
 * @param {Object} params - 查询参数
 * @returns {Promise} 趋势数据
 */
export function getExpenseTrends(params) {
  return request({
    url: '/api/expenses/trends',
    method: 'get',
    params
  })
}

/**
 * 获取成员消费对比
 * @param {Object} params - 查询参数
 * @returns {Promise} 对比数据
 */
export function getMemberExpenseComparison(params) {
  return request({
    url: '/api/expenses/comparison',
    method: 'get',
    params
  })
}

/**
 * 获取费用分摊详情
 * @param {string} expenseId - 费用ID
 * @returns {Promise} 分摊详情
 */
export function getExpenseSplitDetail(expenseId) {
  return request({
    url: `/api/expenses/${expenseId}/split`,
    method: 'get'
  })
}

/**
 * 更新费用分摊
 * @param {string} expenseId - 费用ID
 * @param {Object} data - 分摊数据
 * @returns {Promise} 更新结果
 */
export function updateExpenseSplit(expenseId, data) {
  return request({
    url: `/api/expenses/${expenseId}/split`,
    method: 'put',
    data
  })
}

/**
 * 结算费用分摊
 * @param {string} expenseId - 费用ID
 * @returns {Promise} 结算结果
 */
export function settleExpenseSplit(expenseId) {
  return request({
    url: `/api/expenses/${expenseId}/settle`,
    method: 'post'
  })
}

/**
 * 导出费用记录
 * @param {Object} params - 查询参数
 * @returns {Promise} 导出结果
 */
export function exportExpenses(params) {
  return request({
    url: '/api/expenses/export',
    method: 'get',
    params,
    responseType: 'blob'
  })
}

/**
 * 上传费用凭证
 * @param {string} expenseId - 费用ID
 * @param {FormData} data - 凭证文件
 * @returns {Promise} 上传结果
 */
export function uploadExpenseReceipt(expenseId, data) {
  return request({
    url: `/api/expenses/${expenseId}/receipt`,
    method: 'post',
    data,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
}

/**
 * 删除费用凭证
 * @param {string} expenseId - 费用ID
 * @param {string} receiptId - 凭证ID
 * @returns {Promise} 删除结果
 */
export function deleteExpenseReceipt(expenseId, receiptId) {
  return request({
    url: `/api/expenses/${expenseId}/receipt/${receiptId}`,
    method: 'delete'
  })
}

/**
 * 费用API对象
 */
export const expenseApi = {
  getExpenses,
  getExpenseDetail,
  createExpense,
  updateExpense,
  deleteExpense,
  batchDeleteExpenses,
  getExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory,
  getExpenseStatistics,
  getExpenseTrends,
  getMemberExpenseComparison,
  getExpenseSplitDetail,
  updateExpenseSplit,
  settleExpenseSplit,
  exportExpenses,
  uploadExpenseReceipt,
  deleteExpenseReceipt
}