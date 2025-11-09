import request from '../utils/request';

/**
 * 活动管理API接口
 */
const activityApi = {
  /**
   * 获取活动列表
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.limit - 每页数量
   * @param {string} params.status - 活动状态筛选
   * @param {string} params.type - 活动类型筛选
   * @param {string} params.roomId - 房间ID筛选
   * @param {string} params.search - 搜索关键词
   * @param {string} params.sortBy - 排序字段
   * @param {string} params.sortOrder - 排序方向
   * @returns {Promise} 活动列表数据
   */
  getActivities(params = {}) {
    return request.get('/activities', { params });
  },

  /**
   * 获取活动详情
   * @param {string} id - 活动ID
   * @returns {Promise} 活动详情数据
   */
  getActivityById(id) {
    return request.get(`/activities/${id}`);
  },

  /**
   * 创建活动
   * @param {Object} data - 活动数据
   * @param {string} data.title - 活动标题
   * @param {string} data.description - 活动描述
   * @param {string} data.type - 活动类型
   * @param {string} data.roomId - 关联房间ID
   * @param {string} data.startTime - 开始时间
   * @param {string} data.endTime - 结束时间
   * @param {number} data.maxParticipants - 最大参与人数
   * @param {string} data.location - 活动地点
   * @param {boolean} data.isPublic - 是否公开
   * @param {Array} data.tags - 活动标签
   * @returns {Promise} 创建结果
   */
  createActivity(data) {
    return request.post('/activities', data);
  },

  /**
   * 更新活动
   * @param {string} id - 活动ID
   * @param {Object} data - 更新数据
   * @returns {Promise} 更新结果
   */
  updateActivity(id, data) {
    return request.put(`/activities/${id}`, data);
  },

  /**
   * 删除活动
   * @param {string} id - 活动ID
   * @returns {Promise} 删除结果
   */
  deleteActivity(id) {
    return request.delete(`/activities/${id}`);
  },

  /**
   * 切换活动状态
   * @param {string} id - 活动ID
   * @param {string} status - 新状态
   * @returns {Promise} 更新结果
   */
  toggleActivityStatus(id, status) {
    return request.patch(`/activities/${id}/status`, { status });
  },

  /**
   * 批量更新活动
   * @param {Object} data - 批量更新数据
   * @param {Array} data.activityIds - 活动ID列表
   * @param {Object} data.updates - 更新字段
   * @returns {Promise} 更新结果
   */
  batchUpdateActivities(data) {
    return request.patch('/activities/batch', data);
  },

  /**
   * 获取活动参与统计
   * @param {string} id - 活动ID
   * @param {string} period - 统计周期
   * @returns {Promise} 统计数据
   */
  getActivityParticipationStats(id, period = 'week') {
    return request.get(`/activities/${id}/participation-stats`, { params: { period } });
  },

  /**
   * 报名参加活动
   * @param {string} id - 活动ID
   * @returns {Promise} 报名结果
   */
  joinActivity(id) {
    return request.post(`/activities/${id}/join`);
  },

  /**
   * 取消报名
   * @param {string} id - 活动ID
   * @returns {Promise} 取消结果
   */
  leaveActivity(id) {
    return request.delete(`/activities/${id}/leave`);
  },

  /**
   * 复制活动
   * @param {string} id - 活动ID
   * @param {Object} data - 复制数据
   * @param {string} data.startTime - 新开始时间
   * @param {string} data.endTime - 新结束时间
   * @returns {Promise} 复制结果
   */
  copyActivity(id, data) {
    return request.post(`/activities/${id}/copy`, data);
  }
};

// 导出API对象
export default activityApi;

// 单独导出各个方法以保持向后兼容
export const {
  getActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  toggleActivityStatus,
  batchUpdateActivities,
  getActivityParticipationStats,
  joinActivity,
  leaveActivity,
  copyActivity
} = activityApi;