const express = require('express');
const router = express.Router();
const roomPaymentRuleController = require('../controllers/room-payment-rule-controller');
const { authenticateToken, checkRole } = require('../middleware/auth-middleware');

// 创建authenticate和authorize函数的别名
const authenticate = authenticateToken;
const authorize = checkRole;

// 获取所有房间支付规则
router.get('/', authenticate, roomPaymentRuleController.getAllRoomPaymentRules);

// 根据ID获取房间支付规则
router.get('/:id', authenticate, roomPaymentRuleController.getRoomPaymentRuleById);

// 根据房间ID获取支付规则
router.get('/room/:roomId', authenticate, roomPaymentRuleController.getRoomPaymentRulesByRoomId);

// 创建房间支付规则
router.post('/', authenticate, authorize(['admin', 'room_admin']), roomPaymentRuleController.createRoomPaymentRule);

// 更新房间支付规则
router.put('/:id', authenticate, authorize(['admin', 'room_admin']), roomPaymentRuleController.updateRoomPaymentRule);

// 删除房间支付规则
router.delete('/:id', authenticate, authorize(['admin', 'room_admin']), roomPaymentRuleController.deleteRoomPaymentRule);

// 切换房间支付规则状态
router.patch('/:id/toggle-status', authenticate, authorize(['admin', 'room_admin']), roomPaymentRuleController.toggleRoomPaymentRuleStatus);

// 批量更新房间支付规则
router.patch('/batch-update', authenticate, authorize(['admin', 'room_admin']), roomPaymentRuleController.batchUpdateRoomPaymentRules);

// 计算房间支付金额
router.post('/calculate', authenticate, roomPaymentRuleController.calculateRoomPaymentAmount);

// 获取房间支付规则使用统计
router.get('/statistics/:roomId', authenticate, roomPaymentRuleController.getRoomPaymentRuleStatistics);

// 复制房间支付规则到其他房间
router.post('/:id/copy-to-room', authenticate, authorize(['admin', 'room_admin']), roomPaymentRuleController.copyRoomPaymentRuleToRoom);

module.exports = router;