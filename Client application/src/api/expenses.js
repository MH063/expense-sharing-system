import http from './config';

/**
 * 费用管理API
 */
export const expenseApi = {
  /**
   * 获取费用列表
   * @param {Object} params - 查询参数
   * @returns {Promise} 费用列表
   */
  getExpenses(params) {
    return http.get('/expenses', { params });
  },

  /**
   * 获取费用详情
   * @param {string} expenseId - 费用ID
   * @returns {Promise} 费用详情
   */
  getExpenseDetail(expenseId) {
    return http.get(`/expenses/${expenseId}`);
  },

  /**
   * 创建费用记录
   * @param {Object} data - 费用信息
   * @returns {Promise} 创建结果
   */
  createExpense(data) {
    return http.post('/expenses', data);
  },

  /**
   * 更新费用记录
   * @param {string} expenseId - 费用ID
   * @param {Object} data - 更新数据
   * @returns {Promise} 更新结果
   */
  updateExpense(expenseId, data) {
    return http.put(`/expenses/${expenseId}`, data);
  },

  /**
   * 删除费用记录
   * @param {string} expenseId - 费用ID
   * @returns {Promise} 删除结果
   */
  deleteExpense(expenseId) {
    return http.delete(`/expenses/${expenseId}`);
  },

  /**
   * 批量删除费用记录
   * @param {Array} expenseIds - 费用ID数组
   * @returns {Promise} 删除结果
   */
  batchDeleteExpenses(expenseIds) {
    return http.post('/expenses/batch-delete', { expenseIds });
  },

  /**
   * 获取费用分类列表
   * @param {Object} params - 查询参数
   * @returns {Promise} 分类列表
   */
  getExpenseCategories(params) {
    return http.get('/expenses/categories', { params });
  },

  /**
   * 创建费用分类
   * @param {Object} data - 分类信息
   * @returns {Promise} 创建结果
   */
  createExpenseCategory(data) {
    return http.post('/expenses/categories', data);
  },

  /**
   * 更新费用分类
   * @param {string} categoryId - 分类ID
   * @param {Object} data - 更新数据
   * @returns {Promise} 更新结果
   */
  updateExpenseCategory(categoryId, data) {
    return http.put(`/expenses/categories/${categoryId}`, data);
  },

  /**
   * 删除费用分类
   * @param {string} categoryId - 分类ID
   * @returns {Promise} 删除结果
   */
  deleteExpenseCategory(categoryId) {
    return http.delete(`/expenses/categories/${categoryId}`);
  },

  /**
   * 获取费用统计
   * @param {Object} params - 查询参数
   * @returns {Promise} 统计数据
   */
  getExpenseStatistics(params) {
    return http.get('/expenses/statistics', { params });
  },

  /**
   * 获取费用分类统计
   * @param {Object} params - 查询参数
   * @returns {Promise} 分类统计数据
   */
  getExpenseCategoryStats(params) {
    return http.get('/expenses/category-stats', { params });
  },

  /**
   * 获取费用趋势数据
   * @param {Object} params - 查询参数
   * @returns {Promise} 趋势数据
   */
  getExpenseTrends(params) {
    return http.get('/expenses/trends', { params });
  },

  /**
   * 获取成员消费对比
   * @param {Object} params - 查询参数
   * @returns {Promise} 对比数据
   */
  getMemberExpenseComparison(params) {
    return http.get('/expenses/comparison', { params });
  },

  /**
   * 获取费用分摊详情
   * @param {string} expenseId - 费用ID
   * @returns {Promise} 分摊详情
   */
  getExpenseSplitDetail(expenseId) {
    return http.get(`/expenses/${expenseId}/split`);
  },

  /**
   * 更新费用分摊
   * @param {string} expenseId - 费用ID
   * @param {Object} data - 分摊数据
   * @returns {Promise} 更新结果
   */
  updateExpenseSplit(expenseId, data) {
    return http.put(`/expenses/${expenseId}/split`, data);
  },

  /**
   * 结算费用分摊
   * @param {string} expenseId - 费用ID
   * @returns {Promise} 结算结果
   */
  settleExpenseSplit(expenseId) {
    return http.post(`/expenses/${expenseId}/settle`);
  },

  /**
   * 导出费用记录
   * @param {Object} params - 查询参数
   * @returns {Promise} 导出结果
   */
  exportExpenses(params) {
    return http.get('/expenses/export', {
      params,
      responseType: 'blob'
    });
  },

  /**
   * 上传费用凭证
   * @param {string} expenseId - 费用ID
   * @param {FormData} data - 凭证文件
   * @returns {Promise} 上传结果
   */
  uploadExpenseReceipt(expenseId, data) {
    return http.post(`/expenses/${expenseId}/receipt`, data, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },

  /**
   * 删除费用凭证
   * @param {string} expenseId - 费用ID
   * @param {string} receiptId - 凭证ID
   * @returns {Promise} 删除结果
   */
  deleteExpenseReceipt(expenseId, receiptId) {
    return http.delete(`/expenses/${expenseId}/receipt/${receiptId}`);
  }
};

// 导出单独的函数以保持向后兼容
export const getExpenses = expenseApi.getExpenses;
export const getExpenseDetail = expenseApi.getExpenseDetail;
export const createExpense = expenseApi.createExpense;
export const updateExpense = expenseApi.updateExpense;
export const deleteExpense = expenseApi.deleteExpense;
export const batchDeleteExpenses = expenseApi.batchDeleteExpenses;
export const getExpenseCategories = expenseApi.getExpenseCategories;
export const createExpenseCategory = expenseApi.createExpenseCategory;
export const updateExpenseCategory = expenseApi.updateExpenseCategory;
export const deleteExpenseCategory = expenseApi.deleteExpenseCategory;
export const getExpenseStatistics = expenseApi.getExpenseStatistics;
export const getExpenseCategoryStats = expenseApi.getExpenseCategoryStats;
export const getExpenseTrends = expenseApi.getExpenseTrends;
export const getMemberExpenseComparison = expenseApi.getMemberExpenseComparison;
export const getExpenseSplitDetail = expenseApi.getExpenseSplitDetail;
export const updateExpenseSplit = expenseApi.updateExpenseSplit;
export const settleExpenseSplit = expenseApi.settleExpenseSplit;
export const exportExpenses = expenseApi.exportExpenses;
export const uploadExpenseReceipt = expenseApi.uploadExpenseReceipt;
export const deleteExpenseReceipt = expenseApi.deleteExpenseReceipt;

// 导出expensesApi对象
export const expensesApi = expenseApi;
export default expenseApi;