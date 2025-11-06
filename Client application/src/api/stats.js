import http from './config';

/**
 * 统计数据API
 */
export const statsApi = {
  /**
   * 获取用户统计数据
   * @param {Object} params - 查询参数
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @returns {Promise} 用户统计数据
   */
  getUserStats(params = {}) {
    console.log('获取用户统计数据，参数:', params);
    return http.get('/stats/user', { params });
  },

  /**
   * 获取房间统计数据
   * @param {Object} params - 查询参数
   * @param {string} params.roomId - 房间ID
   * @param {string} params.startDate - 开始日期
   * @param {string} params.endDate - 结束日期
   * @returns {Promise} 房间统计数据
   */
  getRoomStats(params = {}) {
    console.log('获取房间统计数据，参数:', params);
    return http.get('/stats/room', { params });
  },

  /**
   * 获取系统统计数据
   * @returns {Promise} 系统统计数据
   */
  getSystemStats() {
    console.log('获取系统统计数据');
    return http.get('/stats/system');
  },

  /**
   * 获取预测统计数据
   * @param {Object} params - 查询参数
   * @param {string} params.type - 预测类型
   * @param {string} params.period - 预测周期
   * @returns {Promise} 预测统计数据
   */
  getForecastStats(params = {}) {
    console.log('获取预测统计数据，参数:', params);
    return http.get('/stats/forecast', { params });
  }
};

// 导出单独的函数以保持向后兼容
export const getUserStats = statsApi.getUserStats;
export const getRoomStats = statsApi.getRoomStats;
export const getSystemStats = statsApi.getSystemStats;
export const getForecastStats = statsApi.getForecastStats;

export default statsApi;