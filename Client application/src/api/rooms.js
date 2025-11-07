import http from './config';

/**
 * 房间管理API
 */
export const roomsApi = {
  /**
   * 获取用户加入的房间列表
   * @returns {Promise} 房间列表
   */
  getUserRooms() {
    return http.get('/rooms');
  },

  /**
   * 获取房间详情
   * @param {string} roomId - 房间ID
   * @returns {Promise} 房间详情
   */
  getRoomDetail(roomId) {
    return http.get(`/rooms/${roomId}`);
  },

  /**
   * 创建房间
   * @param {Object} data - 房间信息
   * @returns {Promise} 创建结果
   */
  createRoom(data) {
    return http.post('/rooms', data);
  },

  /**
   * 更新房间信息
   * @param {string} roomId - 房间ID
   * @param {Object} data - 更新数据
   * @returns {Promise} 更新结果
   */
  updateRoom(roomId, data) {
    return http.put(`/rooms/${roomId}`, data);
  },

  /**
   * 删除房间
   * @param {string} roomId - 房间ID
   * @returns {Promise} 删除结果
   */
  deleteRoom(roomId) {
    return http.delete(`/rooms/${roomId}`);
  },

  /**
   * 加入房间
   * @param {string} inviteCode - 邀请码
   * @returns {Promise} 加入结果
   */
  joinRoom(inviteCode) {
    return http.post('/rooms/join', { inviteCode });
  },

  /**
   * 离开房间
   * @param {string} roomId - 房间ID
   * @returns {Promise} 离开结果
   */
  leaveRoom(roomId) {
    return http.post(`/rooms/${roomId}/leave`);
  },

  /**
   * 获取房间成员列表
   * @param {string} roomId - 房间ID
   * @returns {Promise} 成员列表
   */
  getRoomMembers(roomId) {
    return http.get(`/rooms/${roomId}/members`);
  },

  /**
   * 邀请成员加入房间
   * @param {string} roomId - 房间ID
   * @param {Object} data - 邀请信息
   * @returns {Promise} 邀请结果
   */
  inviteMember(roomId, data) {
    return http.post(`/rooms/${roomId}/invite`, data);
  },

  /**
   * 移除房间成员
   * @param {string} roomId - 房间ID
   * @param {string} userId - 用户ID
   * @returns {Promise} 移除结果
   */
  removeMember(roomId, userId) {
    return http.delete(`/rooms/${roomId}/members/${userId}`);
  },

  /**
   * 更新成员角色
   * @param {string} roomId - 房间ID
   * @param {string} userId - 用户ID
   * @param {Object} data - 角色信息
   * @returns {Promise} 更新结果
   */
  updateMemberRole(roomId, userId, data) {
    return http.put(`/rooms/${roomId}/members/${userId}/role`, data);
  },

  /**
   * 生成房间邀请码
   * @param {string} roomId - 房间ID
   * @returns {Promise} 邀请码
   */
  generateInviteCode(roomId) {
    return http.post(`/rooms/${roomId}/invite-code`);
  },

  /**
   * 获取房间邀请列表
   * @param {string} roomId - 房间ID
   * @returns {Promise} 邀请列表
   */
  getRoomInvitations(roomId) {
    return http.get(`/rooms/${roomId}/invitations`);
  },

  /**
   * 获取用户收到的邀请
   * @returns {Promise} 邀请列表
   */
  getUserInvitations() {
    return http.get('/rooms/invitations');
  },

  /**
   * 接受邀请
   * @param {string} invitationId - 邀请ID
   * @returns {Promise} 接受结果
   */
  acceptInvitation(invitationId) {
    return http.post(`/rooms/invitations/${invitationId}/accept`);
  },

  /**
   * 拒绝邀请
   * @param {string} invitationId - 邀请ID
   * @returns {Promise} 拒绝结果
   */
  rejectInvitation(invitationId) {
    return http.post(`/rooms/invitations/${invitationId}/reject`);
  },

  /**
   * 取消邀请
   * @param {string} invitationId - 邀请ID
   * @returns {Promise} 取消结果
   */
  cancelInvitation(invitationId) {
    return http.delete(`/rooms/invitations/${invitationId}`);
  },

  /**
   * 重新发送邀请
   * @param {string} invitationId - 邀请ID
   * @returns {Promise} 重新发送结果
   */
  resendInvitation(invitationId) {
    return http.post(`/rooms/invitations/${invitationId}/resend`);
  },

  /**
   * 获取用户当前房间
   * @returns {Promise} 当前房间信息
   */
  getCurrentRoom() {
    return http.get('/rooms/current');
  },

  /**
   * 获取房间统计信息
   * @param {string} roomId - 房间ID
   * @returns {Promise} 统计信息
   */
  getRoomStatistics(roomId) {
    return http.get(`/rooms/${roomId}/statistics`);
  },

  /**
   * 获取房间最近支出
   * @param {string} roomId - 房间ID
   * @returns {Promise} 最近支出列表
   */
  getRecentExpenses(roomId) {
    return http.get(`/rooms/${roomId}/expenses/recent`);
  },

  /**
   * 更新房间设置
   * @param {string} roomId - 房间ID
   * @param {Object} data - 设置数据
   * @returns {Promise} 更新结果
   */
  updateRoomSettings(roomId, data) {
    return http.put(`/rooms/${roomId}/settings`, data);
  },

  /**
   * 提升成员为寝室长
   * @param {string} roomId - 房间ID
   * @param {string} userId - 用户ID
   * @returns {Promise} 提升结果
   */
  promoteMember(roomId, userId) {
    return http.put(`/rooms/${roomId}/members/${userId}/promote`);
  },

  /**
   * 重新生成邀请码
   * @param {string} roomId - 房间ID
   * @returns {Promise} 新邀请码
   */
  regenerateInviteCode(roomId) {
    return http.post(`/rooms/${roomId}/invite-code/regenerate`);
  }
};

// 导出单独的函数以保持向后兼容
export const getUserRooms = roomsApi.getUserRooms;
export const getRoomDetail = roomsApi.getRoomDetail;
export const createRoom = roomsApi.createRoom;
export const updateRoom = roomsApi.updateRoom;
export const deleteRoom = roomsApi.deleteRoom;
export const joinRoom = roomsApi.joinRoom;
export const leaveRoom = roomsApi.leaveRoom;
export const getRoomMembers = roomsApi.getRoomMembers;
export const inviteMember = roomsApi.inviteMember;
export const removeMember = roomsApi.removeMember;
export const updateMemberRole = roomsApi.updateMemberRole;
export const generateInviteCode = roomsApi.generateInviteCode;
export const getRoomInvitations = roomsApi.getRoomInvitations;
export const getUserInvitations = roomsApi.getUserInvitations;
export const acceptInvitation = roomsApi.acceptInvitation;
export const rejectInvitation = roomsApi.rejectInvitation;
export const cancelInvitation = roomsApi.cancelInvitation;
export const resendInvitation = roomsApi.resendInvitation;
export const getCurrentRoom = roomsApi.getCurrentRoom;
export const getRoomStatistics = roomsApi.getRoomStatistics;
export const getRecentExpenses = roomsApi.getRecentExpenses;
export const updateRoomSettings = roomsApi.updateRoomSettings;
export const promoteMember = roomsApi.promoteMember;
export const regenerateInviteCode = roomsApi.regenerateInviteCode;

export default roomsApi;