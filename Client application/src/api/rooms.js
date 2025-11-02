/**
 * 房间相关API接口
 */
import request from './request'

/**
 * 获取用户加入的房间列表
 * @returns {Promise} 房间列表
 */
export function getUserRooms() {
  return request({
    url: '/api/rooms',
    method: 'get'
  })
}

/**
 * 获取房间详情
 * @param {string} roomId - 房间ID
 * @returns {Promise} 房间详情
 */
export function getRoomDetail(roomId) {
  return request({
    url: `/api/rooms/${roomId}`,
    method: 'get'
  })
}

/**
 * 创建房间
 * @param {Object} data - 房间信息
 * @returns {Promise} 创建结果
 */
export function createRoom(data) {
  return request({
    url: '/api/rooms',
    method: 'post',
    data
  })
}

/**
 * 更新房间信息
 * @param {string} roomId - 房间ID
 * @param {Object} data - 更新数据
 * @returns {Promise} 更新结果
 */
export function updateRoom(roomId, data) {
  return request({
    url: `/api/rooms/${roomId}`,
    method: 'put',
    data
  })
}

/**
 * 删除房间
 * @param {string} roomId - 房间ID
 * @returns {Promise} 删除结果
 */
export function deleteRoom(roomId) {
  return request({
    url: `/api/rooms/${roomId}`,
    method: 'delete'
  })
}

/**
 * 加入房间
 * @param {string} inviteCode - 邀请码
 * @returns {Promise} 加入结果
 */
export function joinRoom(inviteCode) {
  return request({
    url: '/api/rooms/join',
    method: 'post',
    data: { inviteCode }
  })
}

/**
 * 离开房间
 * @param {string} roomId - 房间ID
 * @returns {Promise} 离开结果
 */
export function leaveRoom(roomId) {
  return request({
    url: `/api/rooms/${roomId}/leave`,
    method: 'post'
  })
}

/**
 * 获取房间成员列表
 * @param {string} roomId - 房间ID
 * @returns {Promise} 成员列表
 */
export function getRoomMembers(roomId) {
  return request({
    url: `/api/rooms/${roomId}/members`,
    method: 'get'
  })
}

/**
 * 邀请成员加入房间
 * @param {string} roomId - 房间ID
 * @param {Object} data - 邀请信息
 * @returns {Promise} 邀请结果
 */
export function inviteMember(roomId, data) {
  return request({
    url: `/api/rooms/${roomId}/invite`,
    method: 'post',
    data
  })
}

/**
 * 移除房间成员
 * @param {string} roomId - 房间ID
 * @param {string} userId - 用户ID
 * @returns {Promise} 移除结果
 */
export function removeMember(roomId, userId) {
  return request({
    url: `/api/rooms/${roomId}/members/${userId}`,
    method: 'delete'
  })
}

/**
 * 更新成员角色
 * @param {string} roomId - 房间ID
 * @param {string} userId - 用户ID
 * @param {Object} data - 角色信息
 * @returns {Promise} 更新结果
 */
export function updateMemberRole(roomId, userId, data) {
  return request({
    url: `/api/rooms/${roomId}/members/${userId}/role`,
    method: 'put',
    data
  })
}

/**
 * 生成房间邀请码
 * @param {string} roomId - 房间ID
 * @returns {Promise} 邀请码
 */
export function generateInviteCode(roomId) {
  return request({
    url: `/api/rooms/${roomId}/invite-code`,
    method: 'post'
  })
}

/**
 * 获取房间邀请列表
 * @param {string} roomId - 房间ID
 * @returns {Promise} 邀请列表
 */
export function getRoomInvitations(roomId) {
  return request({
    url: `/api/rooms/${roomId}/invitations`,
    method: 'get'
  })
}

/**
 * 获取用户收到的邀请
 * @returns {Promise} 邀请列表
 */
export function getUserInvitations() {
  return request({
    url: '/api/rooms/invitations',
    method: 'get'
  })
}

/**
 * 接受邀请
 * @param {string} invitationId - 邀请ID
 * @returns {Promise} 接受结果
 */
export function acceptInvitation(invitationId) {
  return request({
    url: `/api/rooms/invitations/${invitationId}/accept`,
    method: 'post'
  })
}

/**
 * 拒绝邀请
 * @param {string} invitationId - 邀请ID
 * @returns {Promise} 拒绝结果
 */
export function rejectInvitation(invitationId) {
  return request({
    url: `/api/rooms/invitations/${invitationId}/reject`,
    method: 'post'
  })
}

/**
 * 取消邀请
 * @param {string} invitationId - 邀请ID
 * @returns {Promise} 取消结果
 */
export function cancelInvitation(invitationId) {
  return request({
    url: `/api/rooms/invitations/${invitationId}`,
    method: 'delete'
  })
}

/**
 * 重新发送邀请
 * @param {string} invitationId - 邀请ID
 * @returns {Promise} 重新发送结果
 */
export function resendInvitation(invitationId) {
  return request({
    url: `/api/rooms/invitations/${invitationId}/resend`,
    method: 'post'
  })
}

/**
 * 房间API对象
 */
export const roomsApi = {
  getUserRooms,
  getRoomDetail,
  createRoom,
  updateRoom,
  deleteRoom,
  joinRoom,
  leaveRoom,
  getRoomMembers,
  inviteMember,
  removeMember,
  updateMemberRole,
  generateInviteCode,
  getRoomInvitations,
  getUserInvitations,
  acceptInvitation,
  rejectInvitation,
  cancelInvitation,
  resendInvitation
}