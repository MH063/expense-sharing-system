const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/tokenManager');
const checkRole = require('../middleware/role-middleware');
const { body, query, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation-middleware');

// 导入控制器
const monitoringController = require('../controllers/admin/monitoring-controller');

/**
 * @description 获取操作日志列表
 * @route GET /admin/monitoring/operation-logs
 * @access Private (Admin)
 */
router.get('/operation-logs',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('user_id').optional().isUUID().withMessage('用户ID格式无效'),
    query('action').optional().isString().withMessage('操作类型必须是字符串'),
    query('resource').optional().isString().withMessage('资源类型必须是字符串'),
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效')
  ],
  handleValidationErrors,
  monitoringController.getOperationLogs
);

/**
 * @description 获取数据变更审计日志
 * @route GET /admin/monitoring/data-change-audits
 * @access Private (Admin)
 */
router.get('/data-change-audits',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('table_name').optional().isString().withMessage('表名必须是字符串'),
    query('operation').optional().isIn(['INSERT', 'UPDATE', 'DELETE']).withMessage('操作类型无效'),
    query('user_id').optional().isUUID().withMessage('用户ID格式无效'),
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效')
  ],
  handleValidationErrors,
  monitoringController.getDataChangeAudits
);

/**
 * @description 获取用户活动日志
 * @route GET /admin/monitoring/user-activity-logs
 * @access Private (Admin)
 */
router.get('/user-activity-logs',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('user_id').optional().isUUID().withMessage('用户ID格式无效'),
    query('activity_type').optional().isString().withMessage('活动类型必须是字符串'),
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效')
  ],
  handleValidationErrors,
  monitoringController.getUserActivityLogs
);

/**
 * @description 获取用户状态变更日志
 * @route GET /admin/monitoring/user-status-logs
 * @access Private (Admin)
 */
router.get('/user-status-logs',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('user_id').optional().isUUID().withMessage('用户ID格式无效'),
    query('status_from').optional().isString().withMessage('原状态必须是字符串'),
    query('status_to').optional().isString().withMessage('新状态必须是字符串'),
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效')
  ],
  handleValidationErrors,
  monitoringController.getUserStatusLogs
);

/**
 * @description 获取系统错误日志
 * @route GET /admin/monitoring/system-error-logs
 * @access Private (Admin)
 */
router.get('/system-error-logs',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('error_level').optional().isIn(['error', 'warn', 'info']).withMessage('错误级别无效'),
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效')
  ],
  handleValidationErrors,
  monitoringController.getSystemErrorLogs
);

/**
 * @description 获取系统审计日志
 * @route GET /admin/monitoring/system-audit-logs
 * @access Private (Admin)
 */
router.get('/system-audit-logs',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('audit_type').optional().isString().withMessage('审计类型必须是字符串'),
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效')
  ],
  handleValidationErrors,
  monitoringController.getSystemAuditLogs
);

/**
 * @description 获取告警列表
 * @route GET /admin/monitoring/alerts
 * @access Private (Admin)
 */
router.get('/alerts',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('status').optional().isIn(['active', 'acknowledged', 'resolved']).withMessage('状态值无效'),
    query('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('严重级别无效'),
    query('type').optional().isString().withMessage('告警类型必须是字符串'),
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效')
  ],
  handleValidationErrors,
  monitoringController.getAlerts
);

/**
 * @description 获取告警详情
 * @route GET /admin/monitoring/alerts/:id
 * @access Private (Admin)
 */
router.get('/alerts/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('告警ID格式无效')
  ],
  handleValidationErrors,
  monitoringController.getAlertById
);

/**
 * @description 确认告警
 * @route POST /admin/monitoring/alerts/:id/acknowledge
 * @access Private (Admin)
 */
router.post('/alerts/:id/acknowledge',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('告警ID格式无效'),
    body('notes').optional().isString().withMessage('备注必须是字符串')
  ],
  handleValidationErrors,
  monitoringController.acknowledgeAlert
);

/**
 * @description 解决告警
 * @route POST /admin/monitoring/alerts/:id/resolve
 * @access Private (Admin)
 */
router.post('/alerts/:id/resolve',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('告警ID格式无效'),
    body('resolution').notEmpty().withMessage('解决方案不能为空'),
    body('notes').optional().isString().withMessage('备注必须是字符串')
  ],
  handleValidationErrors,
  monitoringController.resolveAlert
);

/**
 * @description 获取告警规则列表
 * @route GET /admin/monitoring/alert-rules
 * @access Private (Admin)
 */
router.get('/alert-rules',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('enabled').optional().isBoolean().withMessage('启用状态必须是布尔值'),
    query('type').optional().isString().withMessage('规则类型必须是字符串')
  ],
  handleValidationErrors,
  monitoringController.getAlertRules
);

/**
 * @description 创建告警规则
 * @route POST /admin/monitoring/alert-rules
 * @access Private (Admin)
 */
router.post('/alert-rules',
  authenticateToken,
  checkRole(['admin']),
  [
    body('name').notEmpty().withMessage('规则名称不能为空'),
    body('type').isIn(['system', 'database', 'application', 'security']).withMessage('规则类型无效'),
    body('condition').notEmpty().withMessage('触发条件不能为空'),
    body('threshold').isFloat({ min: 0 }).withMessage('阈值必须是非负数'),
    body('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('严重级别无效'),
    body('enabled').optional().isBoolean().withMessage('启用状态必须是布尔值'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('notification_channels').optional().isArray().withMessage('通知渠道必须是数组')
  ],
  handleValidationErrors,
  monitoringController.createAlertRule
);

/**
 * @description 更新告警规则
 * @route PUT /admin/monitoring/alert-rules/:id
 * @access Private (Admin)
 */
router.put('/alert-rules/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('告警规则ID格式无效'),
    body('name').optional().notEmpty().withMessage('规则名称不能为空'),
    body('type').optional().isIn(['system', 'database', 'application', 'security']).withMessage('规则类型无效'),
    body('condition').optional().notEmpty().withMessage('触发条件不能为空'),
    body('threshold').optional().isFloat({ min: 0 }).withMessage('阈值必须是非负数'),
    body('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('严重级别无效'),
    body('enabled').optional().isBoolean().withMessage('启用状态必须是布尔值'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('notification_channels').optional().isArray().withMessage('通知渠道必须是数组')
  ],
  handleValidationErrors,
  monitoringController.updateAlertRule
);

/**
 * @description 删除告警规则
 * @route DELETE /admin/monitoring/alert-rules/:id
 * @access Private (Admin)
 */
router.delete('/alert-rules/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('告警规则ID格式无效')
  ],
  handleValidationErrors,
  monitoringController.deleteAlertRule
);

module.exports = router;