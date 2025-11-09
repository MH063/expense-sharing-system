import request from '@/utils/request'

/**
 * 在寝天数管理API
 */
export const stayDaysApi = {
  /**
   * 获取成员在指定时间段内的在寝天数
   * @param {string} memberId - 成员ID
   * @param {string} startDate - 开始日期 (YYYY-MM-DD)
   * @param {string} endDate - 结束日期 (YYYY-MM-DD)
   * @returns {Promise} API响应
   */
  getMemberStayDays(memberId, startDate, endDate) {
    return request({
      url: `/api/stay-days/member/${memberId}`,
      method: 'get',
      params: { startDate, endDate }
    })
  },

  /**
   * 获取房间所有成员在指定时间段内的在寝天数
   * @param {string} roomId - 房间ID
   * @param {string} startDate - 开始日期 (YYYY-MM-DD)
   * @param {string} endDate - 结束日期 (YYYY-MM-DD)
   * @returns {Promise} API响应
   */
  getRoomMembersStayDays(roomId, startDate, endDate) {
    return request({
      url: `/api/stay-days/room/${roomId}`,
      method: 'get',
      params: { startDate, endDate }
    })
  },

  /**
   * 计算基于在寝天数的费用分摊
   * @param {Object} data - 计算参数
   * @param {string} data.roomId - 房间ID
   * @param {string} data.startDate - 开始日期
   * @param {string} data.endDate - 结束日期
   * @param {number} data.totalAmount - 总金额
   * @param {string} data.expenseType - 费用类型 (lighting/host/air_conditioner/custom)
   * @param {Array} data.memberIds - 参与分摊的成员ID列表
   * @param {Object} data.customSettings - 自定义设置（如主机使用比例）
   * @returns {Promise} API响应
   */
  calculateStayDaysSplit(data) {
    return request({
      url: '/api/stay-days/calculate-split',
      method: 'post',
      data
    })
  },

  /**
   * 获取费用类型的默认分摊方式
   * @param {string} expenseType - 费用类型
   * @returns {Promise} API响应
   */
  getExpenseTypeDefaultSplit(expenseType) {
    return request({
      url: `/api/stay-days/expense-type/${expenseType}/default-split`,
      method: 'get'
    })
  },

  /**
   * 批量更新成员在寝天数
   * @param {Array} data - 在寝天数数据
   * @returns {Promise} API响应
   */
  batchUpdateStayDays(data) {
    return request({
      url: '/api/stay-days/batch-update',
      method: 'post',
      data
    })
  }
}