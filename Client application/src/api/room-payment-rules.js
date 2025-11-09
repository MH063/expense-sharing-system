import request from './request';

/**
 * 房间支付规则API
 */
const roomPaymentRuleApi = {
  /**
   * 获取所有房间支付规则
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.limit - 每页数量
   * @param {string} params.status - 状态筛选
   * @param {string} params.roomId - 房间ID筛选
   * @param {string} params.search - 搜索关键词
   * @returns {Promise} API响应
   */
  getAllRoomPaymentRules: (params = {}) => {
    return request.get('/room-payment-rules', { params });
  },

  /**
   * 根据ID获取房间支付规则
   * @param {string} id - 规则ID
   * @returns {Promise} API响应
   */
  getRoomPaymentRuleById: (id) => {
    return request.get(`/room-payment-rules/${id}`);
  },

  /**
   * 根据房间ID获取支付规则
   * @param {string} roomId - 房间ID
   * @param {Object} params - 查询参数
   * @param {string} params.status - 状态筛选
   * @returns {Promise} API响应
   */
  getRoomPaymentRulesByRoomId: (roomId, params = {}) => {
    return request.get(`/room-payment-rules/room/${roomId}`, { params });
  },

  /**
   * 创建房间支付规则
   * @param {Object} data - 规则数据
   * @param {string} data.roomId - 房间ID
   * @param {string} data.name - 规则名称
   * @param {string} data.description - 规则描述
   * @param {string} data.ruleType - 规则类型：discount, surcharge, exemption
   * @param {string} data.paymentMethod - 支付方式：cash, alipay, wechat, bank_transfer, all
   * @param {string} data.amountType - 金额类型：fixed, percentage
   * @param {number} data.fixedAmount - 固定金额
   * @param {number} data.percentage - 百分比
   * @param {number} data.maxAmount - 最大金额限制
   * @param {number} data.minAmount - 最小金额限制
   * @param {Array} data.applicableBillTypes - 适用的账单类型
   * @param {Array} data.applicableUsers - 适用的用户ID列表
   * @param {Object} data.applicableTimeRange - 适用的时间范围
   * @param {number} data.priority - 优先级
   * @param {string} data.status - 状态：active, inactive
   * @returns {Promise} API响应
   */
  createRoomPaymentRule: (data) => {
    return request.post('/room-payment-rules', data);
  },

  /**
   * 更新房间支付规则
   * @param {string} id - 规则ID
   * @param {Object} data - 更新数据
   * @returns {Promise} API响应
   */
  updateRoomPaymentRule: (id, data) => {
    return request.put(`/room-payment-rules/${id}`, data);
  },

  /**
   * 删除房间支付规则
   * @param {string} id - 规则ID
   * @returns {Promise} API响应
   */
  deleteRoomPaymentRule: (id) => {
    return request.delete(`/room-payment-rules/${id}`);
  },

  /**
   * 切换房间支付规则状态
   * @param {string} id - 规则ID
   * @returns {Promise} API响应
   */
  toggleRoomPaymentRuleStatus: (id) => {
    return request.patch(`/room-payment-rules/${id}/toggle-status`);
  },

  /**
   * 批量更新房间支付规则
   * @param {Object} data - 批量更新数据
   * @param {Array} data.ruleIds - 规则ID列表
   * @param {Object} data.updateData - 更新数据
   * @returns {Promise} API响应
   */
  batchUpdateRoomPaymentRules: (data) => {
    return request.patch('/room-payment-rules/batch-update', data);
  },

  /**
   * 计算房间支付金额
   * @param {Object} data - 计算参数
   * @param {string} data.roomId - 房间ID
   * @param {number} data.billAmount - 账单金额
   * @param {string} data.billType - 账单类型
   * @param {string} data.userId - 用户ID
   * @returns {Promise} API响应
   */
  calculateRoomPaymentAmount: (data) => {
    return request.post('/room-payment-rules/calculate', data);
  },

  /**
   * 获取房间支付规则使用统计
   * @param {string} roomId - 房间ID
   * @param {Object} params - 查询参数
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @returns {Promise} API响应
   */
  getRoomPaymentRuleStatistics: (roomId, params = {}) => {
    return request.get(`/room-payment-rules/statistics/${roomId}`, { params });
  },

  /**
   * 复制房间支付规则到其他房间
   * @param {string} id - 源规则ID
   * @param {Object} data - 复制参数
   * @param {Array} data.targetRoomIds - 目标房间ID列表
   * @param {boolean} data.updateName - 是否更新名称
   * @returns {Promise} API响应
   */
  copyRoomPaymentRuleToRoom: (id, data) => {
    return request.post(`/room-payment-rules/${id}/copy-to-room`, data);
  }
};

// 导出API对象和单独的函数以保持向后兼容
export default roomPaymentRuleApi;
export const {
  getAllRoomPaymentRules,
  getRoomPaymentRuleById,
  getRoomPaymentRulesByRoomId,
  createRoomPaymentRule,
  updateRoomPaymentRule,
  deleteRoomPaymentRule,
  toggleRoomPaymentRuleStatus,
  batchUpdateRoomPaymentRules,
  calculateRoomPaymentAmount,
  getRoomPaymentRuleStatistics,
  copyRoomPaymentRuleToRoom
} = roomPaymentRuleApi;