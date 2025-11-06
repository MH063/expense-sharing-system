import http from './config';
import { tokenManager } from '@/utils/token-manager';

/**
 * 邀请码管理API
 */
const inviteCodeApi = {
  /**
   * 生成新的邀请码
   * @param {Object} data - 邀请码数据
   * @returns {Promise} 生成的邀请码
   */
  generateInviteCode(data) {
    return http.post('/invite-codes', data);
  },

  /**
   * 获取邀请码列表
   * @param {Object} params - 查询参数
   * @returns {Promise} 邀请码列表
   */
  getInviteCodes(params = {}) {
    return http.get('/invite-codes', { params });
  },

  /**
   * 获取邀请码详情
   * @param {string} id - 邀请码ID
   * @returns {Promise} 邀请码详情
   */
  getInviteCode(id) {
    return http.get(`/invite-codes/${id}`);
  },

  /**
   * 更新邀请码
   * @param {string} id - 邀请码ID
   * @param {Object} data - 更新数据
   * @returns {Promise} 更新后的邀请码
   */
  updateInviteCode(id, data) {
    return http.put(`/invite-codes/${id}`, data);
  },

  /**
   * 删除邀请码
   * @param {string} id - 邀请码ID
   * @returns {Promise} 删除结果
   */
  deleteInviteCode(id) {
    return http.delete(`/invite-codes/${id}`);
  },

  /**
   * 验证邀请码
   * @param {string} code - 邀请码
   * @returns {Promise} 验证结果
   */
  verifyInviteCode(code) {
    return http.post('/invite-codes/verify', { code });
  },

  /**
   * 使用邀请码
   * @param {string} code - 邀请码
   * @returns {Promise} 使用结果
   */
  useInviteCode(code) {
    return http.post('/invite-codes/use', { code });
  }
};

export default inviteCodeApi;

// 命名导出
export const inviteCodesApi = inviteCodeApi;