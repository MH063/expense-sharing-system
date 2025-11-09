import request from '@/utils/request';

/**
 * 特殊支付规则API
 */
export const specialPaymentRuleApi = {
  /**
   * 获取特殊支付规则列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.limit - 每页数量
   * @param {string} params.roomId - 房间ID
   * @param {string} params.type - 规则类型
   * @param {boolean} params.isActive - 是否激活
   * @param {string} params.search - 搜索关键词
   * @returns {Promise} API响应
   */
  getSpecialPaymentRules(params) {
    console.log('获取特殊支付规则列表，参数:', params);
    return request.get('/special-payment-rules', { params });
  },

  /**
   * 获取特殊支付规则详情
   * @param {string} id - 规则ID
   * @returns {Promise} API响应
   */
  getSpecialPaymentRuleById(id) {
    console.log('获取特殊支付规则详情，ID:', id);
    return request.get(`/special-payment-rules/${id}`);
  },

  /**
   * 创建特殊支付规则
   * @param {Object} data - 规则数据
   * @returns {Promise} API响应
   */
  createSpecialPaymentRule(data) {
    console.log('创建特殊支付规则，数据:', data);
    return request.post('/special-payment-rules', data);
  },

  /**
   * 更新特殊支付规则
   * @param {string} id - 规则ID
   * @param {Object} data - 更新数据
   * @returns {Promise} API响应
   */
  updateSpecialPaymentRule(id, data) {
    console.log('更新特殊支付规则，ID:', id, '数据:', data);
    return request.put(`/special-payment-rules/${id}`, data);
  },

  /**
   * 删除特殊支付规则
   * @param {string} id - 规则ID
   * @returns {Promise} API响应
   */
  deleteSpecialPaymentRule(id) {
    console.log('删除特殊支付规则，ID:', id);
    return request.delete(`/special-payment-rules/${id}`);
  },

  /**
   * 激活/停用特殊支付规则
   * @param {string} id - 规则ID
   * @param {boolean} isActive - 是否激活
   * @returns {Promise} API响应
   */
  toggleSpecialPaymentRuleStatus(id, isActive) {
    console.log('切换特殊支付规则状态，ID:', id, '状态:', isActive);
    return request.patch(`/special-payment-rules/${id}/status`, { isActive });
  },

  /**
   * 获取房间的特殊支付规则
   * @param {string} roomId - 房间ID
   * @returns {Promise} API响应
   */
  getRoomSpecialPaymentRules(roomId) {
    console.log('获取房间的特殊支付规则，房间ID:', roomId);
    return request.get(`/special-payment-rules/room/${roomId}`);
  },

  /**
   * 计算应用特殊支付规则后的金额
   * @param {Object} data - 计算参数
   * @param {string} data.roomId - 房间ID
   * @param {string} data.billType - 账单类型
   * @param {number} data.originalAmount - 原始金额
   * @param {string} data.userId - 用户ID
   * @param {Date} data.billDate - 账单日期
   * @returns {Promise} API响应
   */
  calculatePaymentWithRules(data) {
    console.log('计算应用特殊支付规则后的金额，参数:', data);
    return request.post('/special-payment-rules/calculate', data);
  },

  /**
   * 获取特殊支付规则使用统计
   * @param {string} id - 规则ID
   * @param {Object} params - 查询参数
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @returns {Promise} API响应
   */
  getSpecialPaymentRuleStats(id, params) {
    console.log('获取特殊支付规则使用统计，ID:', id, '参数:', params);
    return request.get(`/special-payment-rules/${id}/stats`, { params });
  },

  /**
   * 复制特殊支付规则
   * @param {string} id - 原规则ID
   * @param {Object} data - 复制参数
   * @param {string} data.name - 新规则名称
   * @param {string} data.roomId - 新房间ID（可选）
   * @returns {Promise} API响应
   */
  copySpecialPaymentRule(id, data) {
    console.log('复制特殊支付规则，ID:', id, '数据:', data);
    return request.post(`/special-payment-rules/${id}/copy`, data);
  }
};

// 导出单独的函数以保持向后兼容
export const getSpecialPaymentRules = specialPaymentRuleApi.getSpecialPaymentRules;
export const getSpecialPaymentRuleById = specialPaymentRuleApi.getSpecialPaymentRuleById;
export const createSpecialPaymentRule = specialPaymentRuleApi.createSpecialPaymentRule;
export const updateSpecialPaymentRule = specialPaymentRuleApi.updateSpecialPaymentRule;
export const deleteSpecialPaymentRule = specialPaymentRuleApi.deleteSpecialPaymentRule;
export const toggleSpecialPaymentRuleStatus = specialPaymentRuleApi.toggleSpecialPaymentRuleStatus;
export const getRoomSpecialPaymentRules = specialPaymentRuleApi.getRoomSpecialPaymentRules;
export const calculatePaymentWithRules = specialPaymentRuleApi.calculatePaymentWithRules;
export const getSpecialPaymentRuleStats = specialPaymentRuleApi.getSpecialPaymentRuleStats;
export const copySpecialPaymentRule = specialPaymentRuleApi.copySpecialPaymentRule;

// 默认导出API对象
export default specialPaymentRuleApi;