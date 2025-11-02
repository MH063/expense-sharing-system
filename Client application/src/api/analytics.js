import request from '@/utils/request'

/**
 * 数据分析API
 */
export const analyticsApi = {
  /**
   * 获取概览数据
   * @param {Object} params - 查询参数
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @returns {Promise} API响应
   */
  getOverviewData(params) {
    console.log('获取概览数据，参数:', params)
    return request({
      url: '/api/analytics/overview',
      method: 'get',
      params
    })
  },

  /**
   * 获取支出趋势数据
   * @param {Object} params - 查询参数
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @param {string} params.groupBy - 分组方式 (day, week, month)
   * @param {string} params.roomId - 房间ID（可选）
   * @returns {Promise} API响应
   */
  getExpenseTrendsData(params) {
    console.log('获取支出趋势数据，参数:', params)
    return request({
      url: '/api/analytics/expense-trend',
      method: 'get',
      params
    })
  },

  /**
   * 获取用户增长数据
   * @param {Object} params - 查询参数
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @param {string} params.groupBy - 分组方式 (day, week, month)
   * @returns {Promise} API响应
   */
  getUserGrowthData(params) {
    console.log('获取用户增长数据，参数:', params)
    return request({
      url: '/api/analytics/user-growth',
      method: 'get',
      params
    })
  },

  /**
   * 获取支出分类数据
   * @param {Object} params - 查询参数
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @param {string} params.roomId - 房间ID（可选）
   * @returns {Promise} API响应
   */
  getExpenseCategoryData(params) {
    console.log('获取支出分类数据，参数:', params)
    return request({
      url: '/api/analytics/expense-category',
      method: 'get',
      params
    })
  },

  /**
   * 获取房间活跃度数据
   * @param {Object} params - 查询参数
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @param {number} params.limit - 返回数量限制
   * @returns {Promise} API响应
   */
  getRoomActivityData(params) {
    console.log('获取房间活跃度数据，参数:', params)
    return request({
      url: '/api/analytics/room-activity',
      method: 'get',
      params
    })
  },

  /**
   * 获取用户消费数据
   * @param {Object} params - 查询参数
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @param {string} params.roomId - 房间ID（可选）
   * @param {string} params.userId - 用户ID（可选）
   * @param {number} params.limit - 返回数量限制
   * @returns {Promise} API响应
   */
  getUserExpenseData(params) {
    console.log('获取用户消费数据，参数:', params)
    return request({
      url: '/api/analytics/user-expense',
      method: 'get',
      params
    })
  },

  /**
   * 获取房间详细数据
   * @param {Object} params - 查询参数
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @param {string} params.roomId - 房间ID
   * @returns {Promise} API响应
   */
  getRoomDetailData(params) {
    console.log('获取房间详细数据，参数:', params)
    return request({
      url: '/api/analytics/room-detail',
      method: 'get',
      params
    })
  },

  /**
   * 获取最近活动
   * @param {Object} params - 查询参数
   * @param {number} params.limit - 返回数量限制
   * @param {string} params.type - 活动类型（可选）
   * @returns {Promise} API响应
   */
  getRecentActivities(params) {
    console.log('获取最近活动，参数:', params)
    return request({
      url: '/api/analytics/recent-activities',
      method: 'get',
      params
    })
  },

  /**
   * 获取用户活跃度数据
   * @param {Object} params - 查询参数
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @param {string} params.groupBy - 分组方式 (day, week, month)
   * @returns {Promise} API响应
   */
  getUserActivityData(params) {
    console.log('获取用户活跃度数据，参数:', params)
    return request({
      url: '/api/analytics/user-activity',
      method: 'get',
      params
    })
  },

  /**
   * 获取支付统计数据
   * @param {Object} params - 查询参数
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @param {string} params.roomId - 房间ID（可选）
   * @returns {Promise} API响应
   */
  getPaymentStatsData(params) {
    console.log('获取支付统计数据，参数:', params)
    return request({
      url: '/api/analytics/payment-stats',
      method: 'get',
      params
    })
  },

  /**
   * 获取争议统计数据
   * @param {Object} params - 查询参数
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @param {string} params.roomId - 房间ID（可选）
   * @returns {Promise} API响应
   */
  getDisputeStatsData(params) {
    console.log('获取争议统计数据，参数:', params)
    return request({
      url: '/api/analytics/dispute-stats',
      method: 'get',
      params
    })
  },

  /**
   * 获取评论统计数据
   * @param {Object} params - 查询参数
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @param {string} params.roomId - 房间ID（可选）
   * @returns {Promise} API响应
   */
  getReviewStatsData(params) {
    console.log('获取评论统计数据，参数:', params)
    return request({
      url: '/api/analytics/review-stats',
      method: 'get',
      params
    })
  },

  /**
   * 导出数据报表
   * @param {Object} params - 查询参数
   * @param {string} params.type - 报表类型 (expense, user, room, payment)
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @param {string} params.format - 导出格式 (excel, csv, pdf)
   * @param {string} params.roomId - 房间ID（可选）
   * @returns {Promise} API响应
   */
  exportReport(params) {
    console.log('导出数据报表，参数:', params)
    return request({
      url: '/api/analytics/export',
      method: 'get',
      params,
      responseType: 'blob'
    })
  }
}