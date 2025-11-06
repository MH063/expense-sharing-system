import http from './config';

/**
 * 争议管理API
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
    console.log('获取争议列表，参数:', params);
    return http.get('/disputes', { params });
  },

  /**
   * 获取争议详情
   * @param {string} id - 争议ID
   * @returns {Promise} API响应
   */
  getDisputeById(id) {
    console.log('获取争议详情，ID:', id);
    return http.get(`/disputes/${id}`);
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
    console.log('创建争议，数据:', data);
    return http.post('/disputes', data);
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
    console.log('更新争议，ID:', id, '数据:', data);
    return http.put(`/disputes/${id}`, data);
  },

  /**
   * 删除争议
   * @param {string} id - 争议ID
   * @returns {Promise} API响应
   */
  deleteDispute(id) {
    console.log('删除争议，ID:', id);
    return http.delete(`/disputes/${id}`);
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
    console.log('解决争议，ID:', id, '数据:', data);
    return http.post(`/disputes/${id}/resolve`, data);
  },

  /**
   * 上报争议
   * @param {string} id - 争议ID
   * @returns {Promise} API响应
   */
  escalateDispute(id) {
    console.log('上报争议，ID:', id);
    return http.post(`/disputes/${id}/escalate`);
  },

  /**
   * 重新开启争议
   * @param {string} id - 争议ID
   * @returns {Promise} API响应
   */
  reopenDispute(id) {
    console.log('重新开启争议，ID:', id);
    return http.post(`/disputes/${id}/reopen`);
  },

  /**
   * 获取争议统计数据
   * @param {Object} params - 查询参数
   * @param {string} params.roomId - 房间ID
   * @param {string} params.dateRange - 日期范围
   * @returns {Promise} API响应
   */
  getStats(params = {}) {
    console.log('获取争议统计数据，参数:', params);
    return http.get('/disputes/stats', { params });
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
    console.log('获取房间争议，房间ID:', roomId, '参数:', params);
    return http.get(`/rooms/${roomId}/disputes`, { params });
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
    console.log('获取用户争议，用户ID:', userId, '参数:', params);
    return http.get(`/users/${userId}/disputes`, { params });
  },

  /**
   * 上传争议证据
   * @param {FormData} formData - 包含证据文件的FormData
   * @returns {Promise} API响应
   */
  uploadDisputeEvidence(formData) {
    console.log('上传争议证据');
    return http.post('/disputes/upload-evidence', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
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
    console.log('添加争议参与者，争议ID:', id, '数据:', data);
    return http.post(`/disputes/${id}/participants`, data);
  },

  /**
   * 移除争议参与者
   * @param {string} id - 争议ID
   * @param {string} userId - 用户ID
   * @returns {Promise} API响应
   */
  removeDisputeParticipant(id, userId) {
    console.log('移除争议参与者，争议ID:', id, '用户ID:', userId);
    return http.delete(`/disputes/${id}/participants/${userId}`);
  }
};

// 导出disputesApi对象
export const disputesApi = disputeApi;

export default disputeApi;