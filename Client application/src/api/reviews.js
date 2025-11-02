import request from '@/utils/request'

/**
 * 评论API
 */
export const reviewApi = {
  /**
   * 获取评论列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.limit - 每页数量
   * @param {string} params.status - 评论状态 (pending, approved, rejected)
   * @param {string} params.roomId - 房间ID
   * @param {string} params.userId - 用户ID
   * @returns {Promise} API响应
   */
  getReviews(params) {
    console.log('获取评论列表，参数:', params)
    return request({
      url: '/api/reviews',
      method: 'get',
      params
    })
  },

  /**
   * 获取评论详情
   * @param {string} id - 评论ID
   * @returns {Promise} API响应
   */
  getReviewById(id) {
    console.log('获取评论详情，ID:', id)
    return request({
      url: `/api/reviews/${id}`,
      method: 'get'
    })
  },

  /**
   * 创建评论
   * @param {Object} data - 评论数据
   * @param {string} data.roomId - 房间ID
   * @param {number} data.rating - 评分 (1-5)
   * @param {string} data.content - 评论内容
   * @param {Array} data.images - 图片URL数组
   * @returns {Promise} API响应
   */
  createReview(data) {
    console.log('创建评论，数据:', data)
    return request({
      url: '/api/reviews',
      method: 'post',
      data
    })
  },

  /**
   * 更新评论
   * @param {string} id - 评论ID
   * @param {Object} data - 更新数据
   * @param {number} data.rating - 评分 (1-5)
   * @param {string} data.content - 评论内容
   * @param {Array} data.images - 图片URL数组
   * @returns {Promise} API响应
   */
  updateReview(id, data) {
    console.log('更新评论，ID:', id, '数据:', data)
    return request({
      url: `/api/reviews/${id}`,
      method: 'put',
      data
    })
  },

  /**
   * 删除评论
   * @param {string} id - 评论ID
   * @returns {Promise} API响应
   */
  deleteReview(id) {
    console.log('删除评论，ID:', id)
    return request({
      url: `/api/reviews/${id}`,
      method: 'delete'
    })
  },

  /**
   * 审核通过评论
   * @param {string} id - 评论ID
   * @returns {Promise} API响应
   */
  approveReview(id) {
    console.log('审核通过评论，ID:', id)
    return request({
      url: `/api/reviews/${id}/approve`,
      method: 'post'
    })
  },

  /**
   * 拒绝评论
   * @param {string} id - 评论ID
   * @param {Object} data - 拒绝原因
   * @param {string} data.reason - 拒绝原因
   * @returns {Promise} API响应
   */
  rejectReview(id, data) {
    console.log('拒绝评论，ID:', id, '数据:', data)
    return request({
      url: `/api/reviews/${id}/reject`,
      method: 'post',
      data
    })
  },

  /**
   * 获取评论统计数据
   * @param {Object} params - 查询参数
   * @param {string} params.roomId - 房间ID
   * @param {string} params.dateRange - 日期范围
   * @returns {Promise} API响应
   */
  getStats(params = {}) {
    console.log('获取评论统计数据，参数:', params)
    return request({
      url: '/api/reviews/stats',
      method: 'get',
      params
    })
  },

  /**
   * 获取房间评论
   * @param {string} roomId - 房间ID
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.limit - 每页数量
   * @param {string} params.status - 评论状态
   * @returns {Promise} API响应
   */
  getRoomReviews(roomId, params = {}) {
    console.log('获取房间评论，房间ID:', roomId, '参数:', params)
    return request({
      url: `/api/rooms/${roomId}/reviews`,
      method: 'get',
      params
    })
  },

  /**
   * 获取用户评论
   * @param {string} userId - 用户ID
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.limit - 每页数量
   * @param {string} params.status - 评论状态
   * @returns {Promise} API响应
   */
  getUserReviews(userId, params = {}) {
    console.log('获取用户评论，用户ID:', userId, '参数:', params)
    return request({
      url: `/api/users/${userId}/reviews`,
      method: 'get',
      params
    })
  },

  /**
   * 上传评论图片
   * @param {FormData} formData - 包含图片文件的FormData
   * @returns {Promise} API响应
   */
  uploadReviewImage(formData) {
    console.log('上传评论图片')
    return request({
      url: '/api/reviews/upload-image',
      method: 'post',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
  }
}