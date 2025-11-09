import request from '@/utils/request'

/**
 * 分摊偏好设置API
 */
export const splitPreferencesApi = {
  /**
   * 获取用户的分摊偏好设置
   * @param {string} userId - 用户ID
   * @returns {Promise} API响应
   */
  getUserPreferences(userId) {
    return request({
      url: `/api/split-preferences/user/${userId}`,
      method: 'get'
    })
  },

  /**
   * 保存用户的分摊偏好设置
   * @param {Object} data - 偏好设置数据
   * @returns {Promise} API响应
   */
  saveUserPreferences(data) {
    return request({
      url: '/api/split-preferences',
      method: 'post',
      data
    })
  },

  /**
   * 更新用户的分摊偏好设置
   * @param {string} id - 偏好设置ID
   * @param {Object} data - 偏好设置数据
   * @returns {Promise} API响应
   */
  updateUserPreferences(id, data) {
    return request({
      url: `/api/split-preferences/${id}`,
      method: 'put',
      data
    })
  },

  /**
   * 获取用户的历史分摊模式
   * @param {string} userId - 用户ID
   * @param {Object} params - 查询参数
   * @returns {Promise} API响应
   */
  getUserSplitHistory(userId, params = {}) {
    return request({
      url: `/api/split-preferences/user/${userId}/history`,
      method: 'get',
      params
    })
  },

  /**
   * 保存分摊模式到历史记录
   * @param {Object} data - 分摊模式数据
   * @returns {Promise} API响应
   */
  saveSplitToHistory(data) {
    return request({
      url: '/api/split-preferences/history',
      method: 'post',
      data
    })
  }
}