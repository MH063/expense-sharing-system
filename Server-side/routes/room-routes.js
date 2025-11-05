const express = require('express');
const router = express.Router();
const roomController = require('../controllers/room-controller');
const { authenticateToken } = require('../middleware/tokenManager');
const { 
  roomValidationRules, 
  handleValidationErrors 
} = require('../middleware/validation-middleware');

// 创建寝室 - 需要认证
router.post(
  '/',
  authenticateToken,
  roomValidationRules.createRoom,
  handleValidationErrors,
  roomController.createRoom
);

// 获取寝室列表 - 需要认证
router.get('/', authenticateToken, roomController.getRooms);

// 获取用户所属的寝室列表
router.get('/my-rooms', authenticateToken, roomController.getMyRooms);

// 获取寝室详情 - 需要认证
router.get('/:id', authenticateToken, roomController.getRoomById);

// 加入寝室 - 需要认证
router.post(
  '/join',
  authenticateToken,
  roomValidationRules.joinRoom,
  handleValidationErrors,
  roomController.joinRoom
);

// 离开寝室 - 需要认证
router.post('/:id/leave', authenticateToken, roomController.leaveRoom);

// 获取寝室成员 - 需要认证
router.get('/:id/members', authenticateToken, roomController.getRoomMembers);

// 移除成员 - 需要认证（寝室长权限）
router.delete('/:id/members/:userId', authenticateToken, roomController.removeMember);

// 转移寝室所有权 - 需要认证（寝室长权限）
router.put(
  '/:id/transfer-ownership',
  authenticateToken,
  roomValidationRules.transferOwnership,
  handleValidationErrors,
  roomController.transferOwnership
);

// 更新寝室信息 - 需要认证（寝室长权限）
router.put(
  '/:id',
  authenticateToken,
  roomValidationRules.updateRoom,
  handleValidationErrors,
  roomController.updateRoom
);

// 删除寝室 - 需要认证（寝室长权限）
router.delete('/:id', authenticateToken, roomController.deleteRoom);

// 获取邀请码列表 - 需要认证（寝室长权限）
router.get('/:id/invite-codes', authenticateToken, roomController.getInviteCodes);

// 生成新的邀请码 - 需要认证（寝室长权限）
router.post('/:id/generate-invite-code', authenticateToken, roomController.generateInviteCode);

// 验证邀请码 - 需要认证
router.post(
  '/verify-invite-code',
  authenticateToken,
  roomValidationRules.verifyInviteCode,
  handleValidationErrors,
  roomController.verifyInviteCode
);

// 撤销邀请码 - 需要认证（寝室长权限）
router.put('/:id/revoke-invite-code', authenticateToken, roomController.revokeInviteCode);

// 删除邀请码 - 需要认证（寝室长权限）
router.delete('/:id/invite-codes/:codeId', authenticateToken, roomController.deleteInviteCode);

module.exports = router;