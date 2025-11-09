const express = require('express');
const router = express.Router();
const specialPaymentRuleController = require('../controllers/special-payment-rule-controller');
const { authenticateToken, checkRole } = require('../middleware/auth-middleware');
const { body, param, query } = require('express-validator');

// 创建authenticate和authorize函数的别名
const authenticate = authenticateToken;
const authorize = checkRole;

// 获取特殊支付规则列表
router.get('/', 
  authenticate,
  authorize(['admin', 'room_admin']),
  specialPaymentRuleController.getSpecialPaymentRules
);

// 获取特殊支付规则详情
router.get('/:id', 
  authenticate,
  authorize(['admin', 'room_admin']),
  param('id').isUUID().withMessage('规则ID必须是有效的UUID'),
  specialPaymentRuleController.getSpecialPaymentRuleById
);

// 创建特殊支付规则
router.post('/', 
  authenticate,
  authorize(['admin', 'room_admin']),
  [
    body('name').notEmpty().withMessage('规则名称不能为空'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('roomId').isUUID().withMessage('房间ID必须是有效的UUID'),
    body('type').isIn(['discount', 'surcharge', 'exemption']).withMessage('规则类型必须是discount、surcharge或exemption'),
    body('amount').isFloat({ min: 0 }).withMessage('金额必须是非负数'),
    body('amountType').isIn(['fixed', 'percentage']).withMessage('金额类型必须是fixed或percentage'),
    body('applicableBillTypes').isArray().withMessage('适用账单类型必须是数组'),
    body('applicableUsers').optional().isArray().withMessage('适用用户必须是数组'),
    body('conditions').optional().isObject().withMessage('条件必须是对象'),
    body('startDate').isISO8601().withMessage('开始日期必须是有效的日期'),
    body('endDate').optional().isISO8601().withMessage('结束日期必须是有效的日期'),
    body('isActive').optional().isBoolean().withMessage('激活状态必须是布尔值')
  ],
  specialPaymentRuleController.createSpecialPaymentRule
);

// 更新特殊支付规则
router.put('/:id', 
  authenticate,
  authorize(['admin', 'room_admin']),
  param('id').isUUID().withMessage('规则ID必须是有效的UUID'),
  [
    body('name').optional().notEmpty().withMessage('规则名称不能为空'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('type').optional().isIn(['discount', 'surcharge', 'exemption']).withMessage('规则类型必须是discount、surcharge或exemption'),
    body('amount').optional().isFloat({ min: 0 }).withMessage('金额必须是非负数'),
    body('amountType').optional().isIn(['fixed', 'percentage']).withMessage('金额类型必须是fixed或percentage'),
    body('applicableBillTypes').optional().isArray().withMessage('适用账单类型必须是数组'),
    body('applicableUsers').optional().isArray().withMessage('适用用户必须是数组'),
    body('conditions').optional().isObject().withMessage('条件必须是对象'),
    body('startDate').optional().isISO8601().withMessage('开始日期必须是有效的日期'),
    body('endDate').optional().isISO8601().withMessage('结束日期必须是有效的日期'),
    body('isActive').optional().isBoolean().withMessage('激活状态必须是布尔值')
  ],
  specialPaymentRuleController.updateSpecialPaymentRule
);

// 删除特殊支付规则
router.delete('/:id', 
  authenticate,
  authorize(['admin', 'room_admin']),
  param('id').isUUID().withMessage('规则ID必须是有效的UUID'),
  specialPaymentRuleController.deleteSpecialPaymentRule
);

// 激活/停用特殊支付规则
router.patch('/:id/status', 
  authenticate,
  authorize(['admin', 'room_admin']),
  param('id').isUUID().withMessage('规则ID必须是有效的UUID'),
  body('isActive').isBoolean().withMessage('激活状态必须是布尔值'),
  specialPaymentRuleController.toggleSpecialPaymentRuleStatus
);

// 获取房间的特殊支付规则
router.get('/room/:roomId', 
  authenticate,
  authorize(['admin', 'room_admin', 'user']),
  param('roomId').isUUID().withMessage('房间ID必须是有效的UUID'),
  specialPaymentRuleController.getRoomSpecialPaymentRules
);

// 计算应用特殊支付规则后的金额
router.post('/calculate', 
  authenticate,
  authorize(['admin', 'room_admin', 'user']),
  [
    body('roomId').isUUID().withMessage('房间ID必须是有效的UUID'),
    body('billType').notEmpty().withMessage('账单类型不能为空'),
    body('originalAmount').isFloat({ min: 0 }).withMessage('原始金额必须是非负数'),
    body('userId').optional().isUUID().withMessage('用户ID必须是有效的UUID'),
    body('billDate').optional().isISO8601().withMessage('账单日期必须是有效的日期')
  ],
  specialPaymentRuleController.calculatePaymentWithRules
);

// 获取特殊支付规则使用统计
router.get('/:id/stats', 
  authenticate,
  authorize(['admin', 'room_admin']),
  param('id').isUUID().withMessage('规则ID必须是有效的UUID'),
  query('startDate').optional().isISO8601().withMessage('开始日期必须是有效的日期'),
  query('endDate').optional().isISO8601().withMessage('结束日期必须是有效的日期'),
  specialPaymentRuleController.getSpecialPaymentRuleStats
);

// 复制特殊支付规则
router.post('/:id/copy', 
  authenticate,
  authorize(['admin', 'room_admin']),
  param('id').isUUID().withMessage('规则ID必须是有效的UUID'),
  body('name').notEmpty().withMessage('新规则名称不能为空'),
  body('roomId').optional().isUUID().withMessage('房间ID必须是有效的UUID'),
  specialPaymentRuleController.copySpecialPaymentRule
);

module.exports = router;