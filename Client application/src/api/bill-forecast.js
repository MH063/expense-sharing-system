import request from '@/utils/request'

/**
 * 账单预测分析API
 */
export const billForecastApi = {
  /**
   * 获取账单预测数据
   * @param {Object} params - 查询参数
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @param {string} params.roomId - 房间ID（可选）
   * @returns {Promise} API响应
   */
  getBillForecast(params) {
    console.log('获取账单预测数据，参数:', params)
    return request({
      url: '/api/stats/forecast',
      method: 'get',
      params
    })
  },

  /**
   * 获取账单状态分布
   * @param {Object} params - 查询参数
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @param {string} params.roomId - 房间ID（可选）
   * @returns {Promise} API响应
   */
  getBillStatusDistribution(params) {
    console.log('获取账单状态分布，参数:', params)
    return request({
      url: '/api/stats/bill-status',
      method: 'get',
      params
    })
  },

  /**
   * 获取即将到期账单
   * @param {Object} params - 查询参数
   * @param {string} params.days - 提前天数（默认7天）
   * @param {string} params.roomId - 房间ID（可选）
   * @returns {Promise} API响应
   */
  getUpcomingBills(params) {
    console.log('获取即将到期账单，参数:', params)
    return request({
      url: '/api/stats/upcoming-bills',
      method: 'get',
      params
    })
  },

  /**
   * 获取账单趋势分析
   * @param {Object} params - 查询参数
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @param {string} params.groupBy - 分组方式 (day, week, month)
   * @param {string} params.roomId - 房间ID（可选）
   * @returns {Promise} API响应
   */
  getBillTrendAnalysis(params) {
    console.log('获取账单趋势分析，参数:', params)
    return request({
      url: '/api/stats/bill-trend',
      method: 'get',
      params
    })
  }
}