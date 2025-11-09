const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/tokenManager');
const checkRole = require('../middleware/role-middleware');
const { body, param, query } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation-middleware');

// 导入控制器
const notificationController = require('../controllers/notification-controller');

/**
 * @description 获取通知列表
 * @route GET /admin/notifications
 * @access Private (Admin)
 */
router.get('/',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('type').optional().isIn(['system', 'bill', 'payment', 'room', 'expense', 'activity', 'other']).withMessage('通知类型无效'),
    query('status').optional().isIn(['sent', 'pending', 'failed']).withMessage('状态值无效'),
    query('target_type').optional().isIn(['all', 'user', 'room', 'role']).withMessage('目标类型无效'),
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效')
  ],
  handleValidationErrors,
  notificationController.getNotifications
);

/**
 * @description 获取通知详情
 * @route GET /admin/notifications/:id
 * @access Private (Admin)
 */
router.get('/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('通知ID格式无效')
  ],
  handleValidationErrors,
  notificationController.getNotificationById
);

/**
 * @description 创建通知
 * @route POST /admin/notifications
 * @access Private (Admin)
 */
router.post('/',
  authenticateToken,
  checkRole(['admin']),
  [
    body('title').notEmpty().withMessage('通知标题不能为空'),
    body('content').notEmpty().withMessage('通知内容不能为空'),
    body('type').isIn(['system', 'bill', 'payment', 'room', 'expense', 'activity', 'other']).withMessage('通知类型无效'),
    body('target_type').isIn(['all', 'user', 'room', 'role']).withMessage('目标类型无效'),
    body('target_ids').if(body('target_type').not().equals('all')).isArray({ min: 1 }).withMessage('目标ID列表不能为空'),
    body('target_ids.*').if(body('target_type').not().equals('all')).isUUID().withMessage('目标ID格式无效'),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('优先级无效'),
    body('scheduled_at').optional().isISO8601().withMessage('计划发送时间格式无效'),
    body('action_url').optional().isURL().withMessage('操作链接格式无效'),
    body('action_text').optional().isString().withMessage('操作按钮文本必须是字符串'),
    body('image_url').optional().isURL().withMessage('图片URL格式无效')
  ],
  handleValidationErrors,
  notificationController.createNotification
);

/**
 * @description 更新通知
 * @route PUT /admin/notifications/:id
 * @access Private (Admin)
 */
router.put('/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('通知ID格式无效'),
    body('title').optional().notEmpty().withMessage('通知标题不能为空'),
    body('content').optional().notEmpty().withMessage('通知内容不能为空'),
    body('type').optional().isIn(['system', 'bill', 'payment', 'room', 'expense', 'activity', 'other']).withMessage('通知类型无效'),
    body('target_type').optional().isIn(['all', 'user', 'room', 'role']).withMessage('目标类型无效'),
    body('target_ids').optional().if(body('target_type').not().equals('all')).isArray({ min: 1 }).withMessage('目标ID列表不能为空'),
    body('target_ids.*').optional().if(body('target_type').not().equals('all')).isUUID().withMessage('目标ID格式无效'),
    body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('优先级无效'),
    body('scheduled_at').optional().isISO8601().withMessage('计划发送时间格式无效'),
    body('action_url').optional().isURL().withMessage('操作链接格式无效'),
    body('action_text').optional().isString().withMessage('操作按钮文本必须是字符串'),
    body('image_url').optional().isURL().withMessage('图片URL格式无效')
  ],
  handleValidationErrors,
  notificationController.updateNotification
);

/**
 * @description 删除通知
 * @route DELETE /admin/notifications/:id
 * @access Private (Admin)
 */
router.delete('/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('通知ID格式无效')
  ],
  handleValidationErrors,
  notificationController.deleteNotification
);

/**
 * @description 发送通知
 * @route POST /admin/notifications/:id/send
 * @access Private (Admin)
 */
router.post('/:id/send',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('通知ID格式无效')
  ],
  handleValidationErrors,
  notificationController.sendNotification
);

/**
 * @description 取消计划发送的通知
 * @route POST /admin/notifications/:id/cancel
 * @access Private (Admin)
 */
router.post('/:id/cancel',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('通知ID格式无效')
  ],
  handleValidationErrors,
  notificationController.cancelNotification
);

/**
 * @description 获取通知模板列表
 * @route GET /admin/notifications/templates
 * @access Private (Admin)
 */
router.get('/templates',
  authenticateToken,
  checkRole(['admin']),
  [
    query('type').optional().isIn(['system', 'bill', 'payment', 'room', 'expense', 'activity', 'other']).withMessage('通知类型无效'),
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间')
  ],
  handleValidationErrors,
  notificationController.getNotificationTemplates
);

/**
 * @description 创建通知模板
 * @route POST /admin/notifications/templates
 * @access Private (Admin)
 */
router.post('/templates',
  authenticateToken,
  checkRole(['admin']),
  [
    body('name').notEmpty().withMessage('模板名称不能为空'),
    body('title_template').notEmpty().withMessage('标题模板不能为空'),
    body('content_template').notEmpty().withMessage('内容模板不能为空'),
    body('type').isIn(['system', 'bill', 'payment', 'room', 'expense', 'activity', 'other']).withMessage('通知类型无效'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('variables').optional().isArray().withMessage('变量列表必须是数组')
  ],
  handleValidationErrors,
  notificationController.createNotificationTemplate
);

/**
 * @description 更新通知模板
 * @route PUT /admin/notifications/templates/:id
 * @access Private (Admin)
 */
router.put('/templates/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('模板ID格式无效'),
    body('name').optional().notEmpty().withMessage('模板名称不能为空'),
    body('title_template').optional().notEmpty().withMessage('标题模板不能为空'),
    body('content_template').optional().notEmpty().withMessage('内容模板不能为空'),
    body('type').optional().isIn(['system', 'bill', 'payment', 'room', 'expense', 'activity', 'other']).withMessage('通知类型无效'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('variables').optional().isArray().withMessage('变量列表必须是数组')
  ],
  handleValidationErrors,
  notificationController.updateNotificationTemplate
);

/**
 * @description 删除通知模板
 * @route DELETE /admin/notifications/templates/:id
 * @access Private (Admin)
 */
router.delete('/templates/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('模板ID格式无效')
  ],
  handleValidationErrors,
  notificationController.deleteNotificationTemplate
);

/**
 * @description 获取通知发送记录
 * @route GET /admin/notifications/delivery-logs
 * @access Private (Admin)
 */
router.get('/delivery-logs',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('notification_id').optional().isUUID().withMessage('通知ID格式无效'),
    query('status').optional().isIn(['sent', 'delivered', 'read', 'failed']).withMessage('状态值无效'),
    query('channel').optional().isIn(['app', 'email', 'sms', 'wechat']).withMessage('发送渠道无效'),
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效')
  ],
  handleValidationErrors,
  notificationController.getNotificationDeliveryLogs
);

/**
 * @description 获取通知统计
 * @route GET /admin/notifications/statistics
 * @access Private (Admin)
 */
router.get('/statistics',
  authenticateToken,
  checkRole(['admin']),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    query('type').optional().isIn(['system', 'bill', 'payment', 'room', 'expense', 'activity', 'other']).withMessage('通知类型无效')
  ],
  handleValidationErrors,
  notificationController.getNotificationStatistics
);

/**
 * @description 批量发送通知
 * @route POST /admin/notifications/batch
 * @access Private (Admin)
 */
router.post('/batch',
  authenticateToken,
  checkRole(['admin']),
  [
    body('notifications').isArray({ min: 1 }).withMessage('通知列表不能为空'),
    body('notifications.*.title').notEmpty().withMessage('通知标题不能为空'),
    body('notifications.*.content').notEmpty().withMessage('通知内容不能为空'),
    body('notifications.*.type').isIn(['system', 'bill', 'payment', 'room', 'expense', 'activity', 'other']).withMessage('通知类型无效'),
    body('notifications.*.target_type').isIn(['all', 'user', 'room', 'role']).withMessage('目标类型无效'),
    body('notifications.*.target_ids').if(body('notifications.*.target_type').not().equals('all')).isArray({ min: 1 }).withMessage('目标ID列表不能为空'),
    body('notifications.*.target_ids.*').if(body('notifications.*.target_type').not().equals('all')).isUUID().withMessage('目标ID格式无效')
  ],
  handleValidationErrors,
  notificationController.sendBatchNotifications
);

/**
 * @description 获取通知设置
 * @route GET /admin/notifications/settings
 * @access Private (Admin)
 */
router.get('/settings',
  authenticateToken,
  checkRole(['admin']),
  notificationController.getNotificationSettings
);

/**
 * @description 更新通知设置
 * @route PUT /admin/notifications/settings
 * @access Private (Admin)
 */
router.put('/settings',
  authenticateToken,
  checkRole(['admin']),
  [
    body('enable_app_notifications').optional().isBoolean().withMessage('应用通知设置必须是布尔值'),
    body('enable_email_notifications').optional().isBoolean().withMessage('邮件通知设置必须是布尔值'),
    body('enable_sms_notifications').optional().isBoolean().withMessage('短信通知设置必须是布尔值'),
    body('enable_wechat_notifications').optional().isBoolean().withMessage('微信通知设置必须是布尔值'),
    body('default_priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('默认优先级无效'),
    body('batch_size').optional().isInt({ min: 1, max: 1000 }).withMessage('批量大小必须在1-1000之间'),
    body('retry_attempts').optional().isInt({ min: 0, max: 5 }).withMessage('重试次数必须在0-5之间'),
    body('retry_interval').optional().isInt({ min: 60 }).withMessage('重试间隔必须大于等于60秒')
  ],
  handleValidationErrors,
  notificationController.updateNotificationSettings
);

module.exports = router;