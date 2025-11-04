const express = require('express');
const InviteCodeController = require('../controllers/invite-code-controller');
const { authenticateToken } = require('../middleware/tokenManager');

const router = express.Router();
const inviteCodeController = new InviteCodeController();

/**
 * @route POST /api/invite-codes
 * @desc 生成新的邀请码
 * @access Private
 */
router.post('/', authenticateToken, inviteCodeController.generateInviteCode.bind(inviteCodeController));

/**
 * @route POST /api/invite-codes/verify
 * @desc 验证邀请码
 * @access Private
 */
router.post('/verify', authenticateToken, inviteCodeController.verifyInviteCode.bind(inviteCodeController));

/**
 * @route POST /api/invite-codes/use
 * @desc 使用邀请码加入房间
 * @access Private
 */
router.post('/use', authenticateToken, inviteCodeController.useInviteCode.bind(inviteCodeController));

/**
 * @route GET /api/invite-codes/room/:roomId
 * @desc 获取房间的邀请码列表
 * @access Private
 */
router.get('/room/:roomId', authenticateToken, inviteCodeController.getRoomInviteCodes.bind(inviteCodeController));

/**
 * @route DELETE /api/invite-codes/:id
 * @desc 撤销邀请码
 * @access Private
 */
router.delete('/:id', authenticateToken, inviteCodeController.revokeInviteCode.bind(inviteCodeController));

module.exports = router;