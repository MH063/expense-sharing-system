const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/tokenManager');
const checkRole = require('../middleware/role-middleware');
const { body, query, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation-middleware');

// 导入控制器
const systemConfigController = require('../controllers/admin/system-config-controller');

/**
 * @description 获取系统配置
 * @route GET /admin/system/config
 * @access Private (Admin)
 */
router.get('/config',
  authenticateToken,
  checkRole(['admin']),
  systemConfigController.getSystemConfig
);

/**
 * @description 更新系统配置
 * @route PUT /admin/system/config
 * @access Private (Admin)
 */
router.put('/config',
  authenticateToken,
  checkRole(['admin']),
  [
    body('system_name').optional().isString().withMessage('系统名称必须是字符串'),
    body('maintenance_mode').optional().isBoolean().withMessage('维护模式设置必须是布尔值'),
    body('max_users_per_room').optional().isInt({ min: 1 }).withMessage('每间寝室最大用户数必须是正整数'),
    body('expense_categories').optional().isArray().withMessage('费用分类必须是数组'),
    body('payment_methods').optional().isArray().withMessage('支付方式必须是数组'),
    body('notification_settings').optional().isObject().withMessage('通知设置必须是对象')
  ],
  handleValidationErrors,
  systemConfigController.updateSystemConfig
);

/**
 * @description 获取功能开关列表
 * @route GET /admin/system/feature-flags
 * @access Private (Admin)
 */
router.get('/feature-flags',
  authenticateToken,
  checkRole(['admin']),
  systemConfigController.getFeatureFlags
);

/**
 * @description 更新功能开关
 * @route PUT /admin/system/feature-flags/:id
 * @access Private (Admin)
 */
router.put('/feature-flags/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('功能开关ID格式无效'),
    body('enabled').isBoolean().withMessage('启用状态必须是布尔值'),
    body('description').optional().isString().withMessage('描述必须是字符串')
  ],
  handleValidationErrors,
  systemConfigController.updateFeatureFlag
);

/**
 * @description 获取维护窗口列表
 * @route GET /admin/system/maintenance-windows
 * @access Private (Admin)
 */
router.get('/maintenance-windows',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('status').optional().isIn(['scheduled', 'active', 'completed']).withMessage('状态值无效')
  ],
  handleValidationErrors,
  systemConfigController.getMaintenanceWindows
);

/**
 * @description 创建维护窗口
 * @route POST /admin/system/maintenance-windows
 * @access Private (Admin)
 */
router.post('/maintenance-windows',
  authenticateToken,
  checkRole(['admin']),
  [
    body('title').notEmpty().withMessage('维护窗口标题不能为空'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('start_time').isISO8601().withMessage('开始时间格式无效'),
    body('end_time').isISO8601().withMessage('结束时间格式无效'),
    body('affected_services').optional().isArray().withMessage('受影响服务必须是数组'),
    body('notification_settings').optional().isObject().withMessage('通知设置必须是对象')
  ],
  handleValidationErrors,
  systemConfigController.createMaintenanceWindow
);

/**
 * @description 更新维护窗口
 * @route PUT /admin/system/maintenance-windows/:id
 * @access Private (Admin)
 */
router.put('/maintenance-windows/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('维护窗口ID格式无效'),
    body('title').optional().notEmpty().withMessage('维护窗口标题不能为空'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('start_time').optional().isISO8601().withMessage('开始时间格式无效'),
    body('end_time').optional().isISO8601().withMessage('结束时间格式无效'),
    body('status').optional().isIn(['scheduled', 'active', 'completed']).withMessage('状态值无效'),
    body('affected_services').optional().isArray().withMessage('受影响服务必须是数组'),
    body('notification_settings').optional().isObject().withMessage('通知设置必须是对象')
  ],
  handleValidationErrors,
  systemConfigController.updateMaintenanceWindow
);

/**
 * @description 删除维护窗口
 * @route DELETE /admin/system/maintenance-windows/:id
 * @access Private (Admin)
 */
router.delete('/maintenance-windows/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('维护窗口ID格式无效')
  ],
  handleValidationErrors,
  systemConfigController.deleteMaintenanceWindow
);

/**
 * @description 获取公告列表
 * @route GET /admin/system/announcements
 * @access Private (Admin)
 */
router.get('/announcements',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('status').optional().isIn(['draft', 'published', 'archived']).withMessage('状态值无效')
  ],
  handleValidationErrors,
  systemConfigController.getAnnouncements
);

/**
 * @description 创建公告
 * @route POST /admin/system/announcements
 * @access Private (Admin)
 */
router.post('/announcements',
  authenticateToken,
  checkRole(['admin']),
  [
    body('title').notEmpty().withMessage('公告标题不能为空'),
    body('content').notEmpty().withMessage('公告内容不能为空'),
    body('status').isIn(['draft', 'published', 'archived']).withMessage('状态值无效'),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('优先级无效'),
    body('publish_at').optional().isISO8601().withMessage('发布时间格式无效'),
    body('expire_at').optional().isISO8601().withMessage('过期时间格式无效')
  ],
  handleValidationErrors,
  systemConfigController.createAnnouncement
);

/**
 * @description 更新公告
 * @route PUT /admin/system/announcements/:id
 * @access Private (Admin)
 */
router.put('/announcements/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('公告ID格式无效'),
    body('title').optional().notEmpty().withMessage('公告标题不能为空'),
    body('content').optional().notEmpty().withMessage('公告内容不能为空'),
    body('status').optional().isIn(['draft', 'published', 'archived']).withMessage('状态值无效'),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('优先级无效'),
    body('publish_at').optional().isISO8601().withMessage('发布时间格式无效'),
    body('expire_at').optional().isISO8601().withMessage('过期时间格式无效')
  ],
  handleValidationErrors,
  systemConfigController.updateAnnouncement
);

/**
 * @description 删除公告
 * @route DELETE /admin/system/announcements/:id
 * @access Private (Admin)
 */
router.delete('/announcements/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('公告ID格式无效')
  ],
  handleValidationErrors,
  systemConfigController.deleteAnnouncement
);

module.exports = router;