const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/tokenManager');
const checkRole = require('../middleware/role-middleware');
const { body, query, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation-middleware');

// 导入控制器
const specialPaymentRuleController = require('../controllers/admin/special-payment-rule-controller');

/**
 * @description 获取费用类型列表
 * @route GET /admin/expense-types
 * @access Private (Admin)
 */
router.get('/expense-types',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('name').optional().isString().withMessage('费用类型名称必须是字符串')
  ],
  handleValidationErrors,
  specialPaymentRuleController.getExpenseTypes
);

/**
 * @description 获取费用类型详情
 * @route GET /admin/expense-types/:id
 * @access Private (Admin)
 */
router.get('/expense-types/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('费用类型ID格式无效')
  ],
  handleValidationErrors,
  specialPaymentRuleController.getExpenseTypeById
);

/**
 * @description 创建费用类型
 * @route POST /admin/expense-types
 * @access Private (Admin)
 */
router.post('/expense-types',
  authenticateToken,
  checkRole(['admin']),
  [
    body('name').notEmpty().withMessage('费用类型名称不能为空'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('default_split_method').isIn(['equal', 'custom', 'percentage']).withMessage('默认分摊方式无效'),
    body('icon').optional().isString().withMessage('图标必须是字符串')
  ],
  handleValidationErrors,
  specialPaymentRuleController.createExpenseType
);

/**
 * @description 更新费用类型
 * @route PUT /admin/expense-types/:id
 * @access Private (Admin)
 */
router.put('/expense-types/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('费用类型ID格式无效'),
    body('name').optional().notEmpty().withMessage('费用类型名称不能为空'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('default_split_method').optional().isIn(['equal', 'custom', 'percentage']).withMessage('默认分摊方式无效'),
    body('icon').optional().isString().withMessage('图标必须是字符串')
  ],
  handleValidationErrors,
  specialPaymentRuleController.updateExpenseType
);

/**
 * @description 删除费用类型
 * @route DELETE /admin/expense-types/:id
 * @access Private (Admin)
 */
router.delete('/expense-types/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('费用类型ID格式无效')
  ],
  handleValidationErrors,
  specialPaymentRuleController.deleteExpenseType
);

/**
 * @description 获取特殊支付规则列表
 * @route GET /admin/special-payment-rules
 * @access Private (Admin)
 */
router.get('/special-payment-rules',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('expense_type_id').optional().isUUID().withMessage('费用类型ID格式无效'),
    query('room_id').optional().isUUID().withMessage('寝室ID格式无效'),
    query('active').optional().isBoolean().withMessage('激活状态必须是布尔值')
  ],
  handleValidationErrors,
  specialPaymentRuleController.getSpecialPaymentRules
);

/**
 * @description 获取特殊支付规则详情
 * @route GET /admin/special-payment-rules/:id
 * @access Private (Admin)
 */
router.get('/special-payment-rules/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('特殊支付规则ID格式无效')
  ],
  handleValidationErrors,
  specialPaymentRuleController.getSpecialPaymentRuleById
);

/**
 * @description 创建特殊支付规则
 * @route POST /admin/special-payment-rules
 * @access Private (Admin)
 */
router.post('/special-payment-rules',
  authenticateToken,
  checkRole(['admin']),
  [
    body('name').notEmpty().withMessage('规则名称不能为空'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('expense_type_id').optional().isUUID().withMessage('费用类型ID格式无效'),
    body('room_id').optional().isUUID().withMessage('寝室ID格式无效'),
    body('split_method').isIn(['equal', 'custom', 'percentage']).withMessage('分摊方式无效'),
    body('split_details').isArray({ min: 1 }).withMessage('分摊详情不能为空'),
    body('split_details.*.user_id').isUUID().withMessage('用户ID格式无效'),
    body('split_details.*.amount').optional().isFloat({ min: 0 }).withMessage('金额必须是非负数'),
    body('split_details.*.percentage').optional().isFloat({ min: 0, max: 100 }).withMessage('百分比必须是0-100之间的数'),
    body('active').optional().isBoolean().withMessage('激活状态必须是布尔值'),
    body('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    body('end_date').optional().isISO8601().withMessage('结束日期格式无效')
  ],
  handleValidationErrors,
  specialPaymentRuleController.createSpecialPaymentRule
);

/**
 * @description 更新特殊支付规则
 * @route PUT /admin/special-payment-rules/:id
 * @access Private (Admin)
 */
router.put('/special-payment-rules/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('特殊支付规则ID格式无效'),
    body('name').optional().notEmpty().withMessage('规则名称不能为空'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('expense_type_id').optional().isUUID().withMessage('费用类型ID格式无效'),
    body('room_id').optional().isUUID().withMessage('寝室ID格式无效'),
    body('split_method').optional().isIn(['equal', 'custom', 'percentage']).withMessage('分摊方式无效'),
    body('split_details').optional().isArray({ min: 1 }).withMessage('分摊详情不能为空'),
    body('split_details.*.user_id').optional().isUUID().withMessage('用户ID格式无效'),
    body('split_details.*.amount').optional().isFloat({ min: 0 }).withMessage('金额必须是非负数'),
    body('split_details.*.percentage').optional().isFloat({ min: 0, max: 100 }).withMessage('百分比必须是0-100之间的数'),
    body('active').optional().isBoolean().withMessage('激活状态必须是布尔值'),
    body('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    body('end_date').optional().isISO8601().withMessage('结束日期格式无效')
  ],
  handleValidationErrors,
  specialPaymentRuleController.updateSpecialPaymentRule
);

/**
 * @description 删除特殊支付规则
 * @route DELETE /admin/special-payment-rules/:id
 * @access Private (Admin)
 */
router.delete('/special-payment-rules/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('特殊支付规则ID格式无效')
  ],
  handleValidationErrors,
  specialPaymentRuleController.deleteSpecialPaymentRule
);

/**
 * @description 获取房间支付规则列表
 * @route GET /admin/room-payment-rules
 * @access Private (Admin)
 */
router.get('/room-payment-rules',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('room_id').optional().isUUID().withMessage('寝室ID格式无效'),
    query('active').optional().isBoolean().withMessage('激活状态必须是布尔值')
  ],
  handleValidationErrors,
  specialPaymentRuleController.getRoomPaymentRules
);

/**
 * @description 获取房间支付规则详情
 * @route GET /admin/room-payment-rules/:id
 * @access Private (Admin)
 */
router.get('/room-payment-rules/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('房间支付规则ID格式无效')
  ],
  handleValidationErrors,
  specialPaymentRuleController.getRoomPaymentRuleById
);

/**
 * @description 创建房间支付规则
 * @route POST /admin/room-payment-rules
 * @access Private (Admin)
 */
router.post('/room-payment-rules',
  authenticateToken,
  checkRole(['admin']),
  [
    body('room_id').isUUID().withMessage('寝室ID格式无效'),
    body('name').notEmpty().withMessage('规则名称不能为空'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('split_method').isIn(['equal', 'custom', 'percentage']).withMessage('分摊方式无效'),
    body('split_details').isArray({ min: 1 }).withMessage('分摊详情不能为空'),
    body('split_details.*.user_id').isUUID().withMessage('用户ID格式无效'),
    body('split_details.*.amount').optional().isFloat({ min: 0 }).withMessage('金额必须是非负数'),
    body('split_details.*.percentage').optional().isFloat({ min: 0, max: 100 }).withMessage('百分比必须是0-100之间的数'),
    body('active').optional().isBoolean().withMessage('激活状态必须是布尔值'),
    body('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    body('end_date').optional().isISO8601().withMessage('结束日期格式无效')
  ],
  handleValidationErrors,
  specialPaymentRuleController.createRoomPaymentRule
);

/**
 * @description 更新房间支付规则
 * @route PUT /admin/room-payment-rules/:id
 * @access Private (Admin)
 */
router.put('/room-payment-rules/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('房间支付规则ID格式无效'),
    body('name').optional().notEmpty().withMessage('规则名称不能为空'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('split_method').optional().isIn(['equal', 'custom', 'percentage']).withMessage('分摊方式无效'),
    body('split_details').optional().isArray({ min: 1 }).withMessage('分摊详情不能为空'),
    body('split_details.*.user_id').optional().isUUID().withMessage('用户ID格式无效'),
    body('split_details.*.amount').optional().isFloat({ min: 0 }).withMessage('金额必须是非负数'),
    body('split_details.*.percentage').optional().isFloat({ min: 0, max: 100 }).withMessage('百分比必须是0-100之间的数'),
    body('active').optional().isBoolean().withMessage('激活状态必须是布尔值'),
    body('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    body('end_date').optional().isISO8601().withMessage('结束日期格式无效')
  ],
  handleValidationErrors,
  specialPaymentRuleController.updateRoomPaymentRule
);

/**
 * @description 删除房间支付规则
 * @route DELETE /admin/room-payment-rules/:id
 * @access Private (Admin)
 */
router.delete('/room-payment-rules/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('房间支付规则ID格式无效')
  ],
  handleValidationErrors,
  specialPaymentRuleController.deleteRoomPaymentRule
);

module.exports = router;