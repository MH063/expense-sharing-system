const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/tokenManager');
const checkRole = require('../middleware/role-middleware');
const { body, param, query } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation-middleware');

// 导入控制器
const inviteController = require('../controllers/invite-code-controller');

/**
 * @description 获取邀请码列表
 * @route GET /admin/invites
 * @access Private (Admin)
 */
router.get('/',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('status').optional().isIn(['active', 'used', 'expired', 'disabled']).withMessage('状态值无效'),
    query('type').optional().isIn(['user', 'room', 'admin']).withMessage('邀请码类型无效'),
    query('creator_id').optional().isUUID().withMessage('创建者ID格式无效'),
    query('room_id').optional().isUUID().withMessage('寝室ID格式无效'),
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效')
  ],
  handleValidationErrors,
  inviteController.getInvites
);

/**
 * @description 获取邀请码详情
 * @route GET /admin/invites/:id
 * @access Private (Admin)
 */
router.get('/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('邀请码ID格式无效')
  ],
  handleValidationErrors,
  inviteController.getInviteById
);

/**
 * @description 创建邀请码
 * @route POST /admin/invites
 * @access Private (Admin)
 */
router.post('/',
  authenticateToken,
  checkRole(['admin']),
  [
    body('type').isIn(['user', 'room', 'admin']).withMessage('邀请码类型无效'),
    body('name').notEmpty().withMessage('邀请码名称不能为空'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('max_uses').optional().isInt({ min: 1 }).withMessage('最大使用次数必须是正整数'),
    body('expires_at').optional().isISO8601().withMessage('过期时间格式无效'),
    body('room_id').if(body('type').equals('room')).isUUID().withMessage('寝室ID格式无效'),
    body('permissions').optional().isArray().withMessage('权限列表必须是数组'),
    body('permissions.*').optional().isString().withMessage('权限必须是字符串')
  ],
  handleValidationErrors,
  inviteController.createInvite
);

/**
 * @description 更新邀请码
 * @route PUT /admin/invites/:id
 * @access Private (Admin)
 */
router.put('/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('邀请码ID格式无效'),
    body('name').optional().notEmpty().withMessage('邀请码名称不能为空'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('max_uses').optional().isInt({ min: 1 }).withMessage('最大使用次数必须是正整数'),
    body('expires_at').optional().isISO8601().withMessage('过期时间格式无效'),
    body('status').optional().isIn(['active', 'disabled']).withMessage('状态值无效'),
    body('permissions').optional().isArray().withMessage('权限列表必须是数组'),
    body('permissions.*').optional().isString().withMessage('权限必须是字符串')
  ],
  handleValidationErrors,
  inviteController.updateInvite
);

/**
 * @description 删除邀请码
 * @route DELETE /admin/invites/:id
 * @access Private (Admin)
 */
router.delete('/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('邀请码ID格式无效')
  ],
  handleValidationErrors,
  inviteController.deleteInvite
);

/**
 * @description 禁用邀请码
 * @route POST /admin/invites/:id/disable
 * @access Private (Admin)
 */
router.post('/:id/disable',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('邀请码ID格式无效'),
    body('reason').optional().isString().withMessage('禁用原因必须是字符串')
  ],
  handleValidationErrors,
  inviteController.disableInvite
);

/**
 * @description 启用邀请码
 * @route POST /admin/invites/:id/enable
 * @access Private (Admin)
 */
router.post('/:id/enable',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('邀请码ID格式无效')
  ],
  handleValidationErrors,
  inviteController.enableInvite
);

/**
 * @description 获取邀请码使用记录
 * @route GET /admin/invites/:id/usages
 * @access Private (Admin)
 */
router.get('/:id/usages',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('邀请码ID格式无效'),
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('status').optional().isIn(['success', 'failed']).withMessage('状态值无效'),
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效')
  ],
  handleValidationErrors,
  inviteController.getInviteUsages
);

/**
 * @description 获取邀请码统计
 * @route GET /admin/invites/statistics
 * @access Private (Admin)
 */
router.get('/statistics',
  authenticateToken,
  checkRole(['admin']),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    query('type').optional().isIn(['user', 'room', 'admin']).withMessage('邀请码类型无效')
  ],
  handleValidationErrors,
  inviteController.getInviteStatistics
);

/**
 * @description 批量创建邀请码
 * @route POST /admin/invites/batch
 * @access Private (Admin)
 */
router.post('/batch',
  authenticateToken,
  checkRole(['admin']),
  [
    body('count').isInt({ min: 1, max: 100 }).withMessage('创建数量必须在1-100之间'),
    body('type').isIn(['user', 'room', 'admin']).withMessage('邀请码类型无效'),
    body('name_template').notEmpty().withMessage('名称模板不能为空'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('max_uses').optional().isInt({ min: 1 }).withMessage('最大使用次数必须是正整数'),
    body('expires_at').optional().isISO8601().withMessage('过期时间格式无效'),
    body('room_id').if(body('type').equals('room')).isUUID().withMessage('寝室ID格式无效'),
    body('permissions').optional().isArray().withMessage('权限列表必须是数组'),
    body('permissions.*').optional().isString().withMessage('权限必须是字符串')
  ],
  handleValidationErrors,
  inviteController.createBatchInvites
);

/**
 * @description 获取邀请码设置
 * @route GET /admin/invites/settings
 * @access Private (Admin)
 */
router.get('/settings',
  authenticateToken,
  checkRole(['admin']),
  inviteController.getInviteSettings
);

/**
 * @description 更新邀请码设置
 * @route PUT /admin/invites/settings
 * @access Private (Admin)
 */
router.put('/settings',
  authenticateToken,
  checkRole(['admin']),
  [
    body('default_expires_days').optional().isInt({ min: 1, max: 365 }).withMessage('默认过期天数必须在1-365之间'),
    body('default_max_uses').optional().isInt({ min: 1, max: 1000 }).withMessage('默认最大使用次数必须在1-1000之间'),
    body('enable_admin_invites').optional().isBoolean().withMessage('管理员邀请码设置必须是布尔值'),
    body('enable_room_invites').optional().isBoolean().withMessage('寝室邀请码设置必须是布尔值'),
    body('enable_user_invites').optional().isBoolean().withMessage('用户邀请码设置必须是布尔值'),
    body('max_user_invites_per_month').optional().isInt({ min: 0 }).withMessage('每月最大用户邀请数必须是非负整数'),
    body('max_room_invites_per_month').optional().isInt({ min: 0 }).withMessage('每月最大寝室邀请数必须是非负整数')
  ],
  handleValidationErrors,
  inviteController.updateInviteSettings
);

/**
 * @description 验证邀请码
 * @route POST /admin/invites/validate
 * @access Private (Admin)
 */
router.post('/validate',
  authenticateToken,
  checkRole(['admin']),
  [
    body('code').notEmpty().withMessage('邀请码不能为空')
  ],
  handleValidationErrors,
  inviteController.validateInvite
);

/**
 * @description 使用邀请码
 * @route POST /admin/invites/use
 * @access Private (Admin)
 */
router.post('/use',
  authenticateToken,
  checkRole(['admin']),
  [
    body('code').notEmpty().withMessage('邀请码不能为空'),
    body('user_id').isUUID().withMessage('用户ID格式无效'),
    body('metadata').optional().isObject().withMessage('元数据必须是对象')
  ],
  handleValidationErrors,
  inviteController.useInvite
);

/**
 * @description 获取邀请码链接
 * @route GET /admin/invites/:id/link
 * @access Private (Admin)
 */
router.get('/:id/link',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('邀请码ID格式无效')
  ],
  handleValidationErrors,
  inviteController.getInviteLink
);

/**
 * @description 重新生成邀请码
 * @route POST /admin/invites/:id/regenerate
 * @access Private (Admin)
 */
router.post('/:id/regenerate',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('邀请码ID格式无效')
  ],
  handleValidationErrors,
  inviteController.regenerateInvite
);

/**
 * @description 获取邀请码二维码
 * @route GET /admin/invites/:id/qrcode
 * @access Private (Admin)
 */
router.get('/:id/qrcode',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('邀请码ID格式无效'),
    query('size').optional().isInt({ min: 100, max: 500 }).withMessage('二维码大小必须在100-500之间')
  ],
  handleValidationErrors,
  inviteController.getInviteQRCode
);

module.exports = router;