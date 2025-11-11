import request from '@/utils/request'

/**
 * 请假记录管理API
 */
export const leaveRecordsApi = {
  /**
   * 获取成员的请假记录
   * @param {string} memberId - 成员ID
   * @param {string} startDate - 开始日期 (YYYY-MM-DD)
   * @param {string} endDate - 结束日期 (YYYY-MM-DD)
   * @returns {Promise} API响应
   */
  getMemberLeaveRecords(memberId, startDate, endDate) {
    return request({
      url: `/api/leave-records/member/${memberId}`,
      method: 'get',
      params: { startDate, endDate }
    })
  },

  /**
   * 获取房间所有成员的请假记录
   * @param {string} roomId - 房间ID
   * @param {string} startDate - 开始日期 (YYYY-MM-DD)
   * @param {string} endDate - 结束日期 (YYYY-MM-DD)
   * @returns {Promise} API响应
   */
  getRoomMembersLeaveRecords(roomId, startDate, endDate) {
    return request({
      url: `/api/leave-records/room/${roomId}`,
      method: 'get',
      params: { startDate, endDate }
    })
  },

  /**
   * 获取请假记录详情
   * @param {string} recordId - 记录ID
   * @returns {Promise} API响应
   */
  getLeaveRecordDetail(recordId) {
    return request({
      url: `/api/leave-records/${recordId}`,
      method: 'get'
    })
  },

  /**
   * 创建请假记录
   * @param {Object} data - 请假记录数据
   * @param {string} data.memberId - 成员ID
   * @param {string} data.roomId - 房间ID
   * @param {string} data.startDate - 请假开始日期
   * @param {string} data.endDate - 请假结束日期
   * @param {string} data.reason - 请假原因
   * @param {string} data.type - 请假类型 (personal/home/other)
   * @param {string} data.notes - 备注
   * @returns {Promise} API响应
   */
  createLeaveRecord(data) {
    return request({
      url: '/api/leave-records',
      method: 'post',
      data
    })
  },

  /**
   * 更新请假记录
   * @param {string} recordId - 记录ID
   * @param {Object} data - 更新数据
   * @returns {Promise} API响应
   */
  updateLeaveRecord(recordId, data) {
    return request({
      url: `/api/leave-records/${recordId}`,
      method: 'put',
      data
    })
  },

  /**
   * 删除请假记录
   * @param {string} recordId - 记录ID
   * @returns {Promise} API响应
   */
  deleteLeaveRecord(recordId) {
    return request({
      url: `/api/leave-records/${recordId}`,
      method: 'delete'
    })
  },

  /**
   * 获取请假类型列表
   * @returns {Promise} API响应
   */
  getLeaveTypes() {
    return request({
      url: '/api/leave-records/types',
      method: 'get'
    })
  },

  /**
   * 获取请假统计
   * @param {Object} params - 查询参数
   * @param {string} params.startDate - 开始日期 (YYYY-MM-DD)
   * @param {string} params.endDate - 结束日期 (YYYY-MM-DD)
   * @param {string} params.roomId - 房间ID
   * @returns {Promise} API响应
   */
  getLeaveStats(params) {
    return request({
      url: '/api/leave-records/stats',
      method: 'get',
      params
    })
  },

  /**
   * 批量计算请假期间的离寝天数
   * @param {Array} data - 请假记录数据
   * @returns {Promise} API响应
   */
  calculateLeaveDays(data) {
    return request({
      url: '/api/leave-records/calculate-days',
      method: 'post',
      data
    })
  },

  /**
   * 根据请假记录自动更新在寝天数
   * @param {string} roomId - 房间ID
   * @param {string} startDate - 开始日期
   * @param {string} endDate - 结束日期
   * @returns {Promise} API响应
   */
  autoUpdateStayDaysByLeaveRecords(roomId, startDate, endDate) {
    return request({
      url: '/api/leave-records/auto-update-stay-days',
      method: 'post',
      data: { roomId, startDate, endDate }
    })
  }
}