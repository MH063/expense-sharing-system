import http from './config';

/**
 * 账单管理API
 */
export const billApiV2 = {
  /**
   * 获取账单列表
   * @param {Object} params - 查询参数
   * @returns {Promise} 账单列表
   */
  getBills(params = {}) {
    return http.get('/bills', { params });
  },

  /**
   * 获取账单详情
   * @param {string} id - 账单ID
   * @returns {Promise} 账单详情
   */
  getBill(id) {
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
   * 分摊账单
   * @param {string} id - 账单ID
   * @param {Object} data - 分摊数据
   * @returns {Promise} 分摊结果
   */
  splitBill(id, data) {
    return http.post(`/bills/${id}/split`, data);
  },

  /**
   * 结算账单
   * @param {string} id - 账单ID
   * @returns {Promise} 结算结果
   */
  settleBill(id) {
    return http.post(`/bills/${id}/settle`);
  },

  /**
   * 获取账单统计
   * @param {Object} params - 查询参数
   * @returns {Promise} 账单统计数据
   */
  getBillStats(params = {}) {
    return http.get('/bills/stats', { params });
  },

  /**
   * 获取账单分类
   * @returns {Promise} 账单分类列表
   */
  getBillCategories() {
    return http.get('/bills/categories');
  }
};

// 为了向后兼容，也导出为billApi
export const billApi = billApiV2;

export default billApiV2;