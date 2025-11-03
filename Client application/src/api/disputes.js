import request from '@/utils/request'

/**
 * 争议API
 */
export const disputeApi = {
  /**
   * 获取争议列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.limit - 每页数量
   * @param {string} params.status - 争议状态 (pending, processing, resolved, escalated)
   * @param {string} params.type - 争议类型 (payment, expense, room, other)
   * @param {string} params.priority - 优先级 (low, medium, high)
   * @param {string} params.roomId - 房间ID
   * @param {string} params.userId - 用户ID
   * @returns {Promise} API响应
   */
  getDisputes(params) {
    console.log('获取争议列表，参数:', params)
    return request({
      url: '/api/disputes',
      method: 'get',
      params
    })
  },

  /**
   * 获取争议详情
   * @param {string} id - 争议ID
   * @returns {Promise} API响应
   */
  getDisputeById(id) {
    console.log('获取争议详情，ID:', id)
    return request({
      url: `/api/disputes/${id}`,
      method: 'get'
    })
  },

  /**
   * 创建争议
   * @param {Object} data - 争议数据
   * @param {string} data.title - 争议标题
   * @param {string} data.description - 争议描述
   * @param {string} data.type - 争议类型 (payment, expense, room, other)
   * @param {string} data.priority - 优先级 (low, medium, high)
   * @param {string} data.roomId - 房间ID
   * @param {Array} data.participants - 相关方ID数组
   * @param {Array} data.evidence - 证据材料数组
   * @returns {Promise} API响应
   */
  createDispute(data) {
    console.log('创建争议，数据:', data)
    return request({
      url: '/api/disputes',
      method: 'post',
      data
    })
  },

  /**
   * 更新争议
   * @param {string} id - 争议ID
   * @param {Object} data - 更新数据
   * @param {string} data.title - 争议标题
   * @param {string} data.description - 争议描述
   * @param {string} data.type - 争议类型 (payment, expense, room, other)
   * @param {string} data.priority - 优先级 (low, medium, high)
   * @param {Array} data.participants - 相关方ID数组
   * @param {Array} data.evidence - 证据材料数组
   * @returns {Promise} API响应
   */
  updateDispute(id, data) {
    console.log('更新争议，ID:', id, '数据:', data)
    return request({
      url: `/api/disputes/${id}`,
      method: 'put',
      data
    })
  },

  /**
   * 删除争议
   * @param {string} id - 争议ID
   * @returns {Promise} API响应
   */
  deleteDispute(id) {
    console.log('删除争议，ID:', id)
    return request({
      url: `/api/disputes/${id}`,
      method: 'delete'
    })
  },

  /**
   * 解决争议
   * @param {string} id - 争议ID
   * @param {Object} data - 解决方案
   * @param {string} data.content - 解决方案内容
   * @param {string} data.result - 处理结果 (approved, rejected, compromise)
   * @returns {Promise} API响应
   */
  resolveDispute(id, data) {
    console.log('解决争议，ID:', id, '数据:', data)
    return request({
      url: `/api/disputes/${id}/resolve`,
      method: 'post',
      data
    })
  },

  /**
   * 上报争议
   * @param {string} id - 争议ID
   * @returns {Promise} API响应
   */
  escalateDispute(id) {
    console.log('上报争议，ID:', id)
    return request({
      url: `/api/disputes/${id}/escalate`,
      method: 'post'
    })
  },

  /**
   * 重新开启争议
   * @param {string} id - 争议ID
   * @returns {Promise} API响应
   */
  reopenDispute(id) {
    console.log('重新开启争议，ID:', id)
    return request({
      url: `/api/disputes/${id}/reopen`,
      method: 'post'
    })
  },

  /**
   * 获取争议统计数据
   * @param {Object} params - 查询参数
   * @param {string} params.roomId - 房间ID
   * @param {string} params.dateRange - 日期范围
   * @returns {Promise} API响应
   */
  getStats(params = {}) {
    console.log('获取争议统计数据，参数:', params)
    return request({
      url: '/api/disputes/stats',
      method: 'get',
      params
    })
  },

  /**
   * 获取房间争议
   * @param {string} roomId - 房间ID
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.limit - 每页数量
   * @param {string} params.status - 争议状态
   * @returns {Promise} API响应
   */
  getRoomDisputes(roomId, params = {}) {
    console.log('获取房间争议，房间ID:', roomId, '参数:', params)
    return request({
      url: `/api/rooms/${roomId}/disputes`,
      method: 'get',
      params
    })
  },

  /**
   * 获取用户争议
   * @param {string} userId - 用户ID
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.limit - 每页数量
   * @param {string} params.status - 争议状态
   * @returns {Promise} API响应
   */
  getUserDisputes(userId, params = {}) {
    console.log('获取用户争议，用户ID:', userId, '参数:', params)
    return request({
      url: `/api/users/${userId}/disputes`,
      method: 'get',
      params
    })
  },

  /**
   * 上传争议证据
   * @param {FormData} formData - 包含证据文件的FormData
   * @returns {Promise} API响应
   */
  uploadDisputeEvidence(formData) {
    console.log('上传争议证据')
    return request({
      url: '/api/disputes/upload-evidence',
      method: 'post',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  },

  /**
   * 添加争议参与者
   * @param {string} id - 争议ID
   * @param {Object} data - 参与者数据
   * @param {string} data.userId - 用户ID
   * @param {string} data.role - 角色
   * @returns {Promise} API响应
   */
  addDisputeParticipant(id, data) {
    console.log('添加争议参与者，争议ID:', id, '数据:', data)
    return request({
      url: `/api/disputes/${id}/participants`,
      method: 'post',
      data
    })
  },

  /**
   * 移除争议参与者
   * @param {string} id - 争议ID
   * @param {string} userId - 用户ID
   * @returns {Promise} API响应
   */
  removeDisputeParticipant(id, userId) {
    console.log('移除争议参与者，争议ID:', id, '用户ID:', userId)
    return request({
      url: `/api/disputes/${id}/participants/${userId}`,
      method: 'delete'
    })
  }
}

// 导出disputesApi对象
export const disputesApi = disputeApi;

export default disputeApi;