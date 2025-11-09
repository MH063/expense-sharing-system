const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/tokenManager');
const checkRole = require('../middleware/role-middleware');
const { body, query, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation-middleware');

// 导入控制器
const analyticsController = require('../controllers/analytics-controller');

/**
 * @description 获取总体统计概览
 * @route GET /admin/analytics/overview
 * @access Private (Admin)
 */
router.get('/overview',
  authenticateToken,
  checkRole(['admin']),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    query('room_id').optional().isUUID().withMessage('寝室ID格式无效')
  ],
  handleValidationErrors,
  analyticsController.getOverview
);

/**
 * @description 获取用户统计
 * @route GET /admin/analytics/users
 * @access Private (Admin)
 */
router.get('/users',
  authenticateToken,
  checkRole(['admin']),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    query('room_id').optional().isUUID().withMessage('寝室ID格式无效'),
    query('group_by').optional().isIn(['day', 'week', 'month']).withMessage('分组方式无效')
  ],
  handleValidationErrors,
  analyticsController.getUserAnalytics
);

/**
 * @description 获取账单统计
 * @route GET /admin/analytics/bills
 * @access Private (Admin)
 */
router.get('/bills',
  authenticateToken,
  checkRole(['admin']),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    query('room_id').optional().isUUID().withMessage('寝室ID格式无效'),
    query('status').optional().isIn(['pending', 'paid', 'overdue']).withMessage('状态值无效'),
    query('group_by').optional().isIn(['day', 'week', 'month']).withMessage('分组方式无效')
  ],
  handleValidationErrors,
  analyticsController.getBillAnalytics
);

/**
 * @description 获取费用统计
 * @route GET /admin/analytics/expenses
 * @access Private (Admin)
 */
router.get('/expenses',
  authenticateToken,
  checkRole(['admin']),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    query('room_id').optional().isUUID().withMessage('寝室ID格式无效'),
    query('category').optional().isString().withMessage('费用类别必须是字符串'),
    query('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('状态值无效'),
    query('group_by').optional().isIn(['day', 'week', 'month', 'category']).withMessage('分组方式无效')
  ],
  handleValidationErrors,
  analyticsController.getExpenseAnalytics
);

/**
 * @description 获取支付统计
 * @route GET /admin/analytics/payments
 * @access Private (Admin)
 */
router.get('/payments',
  authenticateToken,
  checkRole(['admin']),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    query('room_id').optional().isUUID().withMessage('寝室ID格式无效'),
    query('method').optional().isIn(['cash', 'wechat', 'alipay', 'bank_transfer', 'credit_card']).withMessage('支付方式无效'),
    query('status').optional().isIn(['pending', 'completed', 'failed', 'cancelled']).withMessage('状态值无效'),
    query('group_by').optional().isIn(['day', 'week', 'month', 'method']).withMessage('分组方式无效')
  ],
  handleValidationErrors,
  analyticsController.getPaymentAnalytics
);

/**
 * @description 获取房间统计
 * @route GET /admin/analytics/rooms
 * @access Private (Admin)
 */
router.get('/rooms',
  authenticateToken,
  checkRole(['admin']),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    query('room_id').optional().isUUID().withMessage('寝室ID格式无效'),
    query('group_by').optional().isIn(['day', 'week', 'month']).withMessage('分组方式无效')
  ],
  handleValidationErrors,
  analyticsController.getRoomAnalytics
);

/**
 * @description 获取活动统计
 * @route GET /admin/analytics/activities
 * @access Private (Admin)
 */
router.get('/activities',
  authenticateToken,
  checkRole(['admin']),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    query('room_id').optional().isUUID().withMessage('寝室ID格式无效'),
    query('type').optional().isString().withMessage('活动类型必须是字符串'),
    query('group_by').optional().isIn(['day', 'week', 'month', 'type']).withMessage('分组方式无效')
  ],
  handleValidationErrors,
  analyticsController.getActivityAnalytics
);

/**
 * @description 获取请假统计
 * @route GET /admin/analytics/leaves
 * @access Private (Admin)
 */
router.get('/leaves',
  authenticateToken,
  checkRole(['admin']),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    query('room_id').optional().isUUID().withMessage('寝室ID格式无效'),
    query('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('状态值无效'),
    query('type').optional().isString().withMessage('请假类型必须是字符串'),
    query('group_by').optional().isIn(['day', 'week', 'month', 'type']).withMessage('分组方式无效')
  ],
  handleValidationErrors,
  analyticsController.getLeaveAnalytics
);

/**
 * @description 获取系统使用统计
 * @route GET /admin/analytics/system
 * @access Private (Admin)
 */
router.get('/system',
  authenticateToken,
  checkRole(['admin']),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    query('metric').optional().isIn(['logins', 'page_views', 'api_calls', 'errors']).withMessage('指标类型无效'),
    query('group_by').optional().isIn(['day', 'week', 'month', 'hour']).withMessage('分组方式无效')
  ],
  handleValidationErrors,
  analyticsController.getSystemAnalytics
);

/**
 * @description 获取财务报表
 * @route GET /admin/analytics/financial-report
 * @access Private (Admin)
 */
router.get('/financial-report',
  authenticateToken,
  checkRole(['admin']),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    query('room_id').optional().isUUID().withMessage('寝室ID格式无效'),
    query('format').optional().isIn(['json', 'csv', 'excel']).withMessage('报表格式无效')
  ],
  handleValidationErrors,
  analyticsController.getFinancialReport
);

/**
 * @description 获取用户活跃度报表
 * @route GET /admin/analytics/user-activity-report
 * @access Private (Admin)
 */
router.get('/user-activity-report',
  authenticateToken,
  checkRole(['admin']),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    query('room_id').optional().isUUID().withMessage('寝室ID格式无效'),
    query('format').optional().isIn(['json', 'csv', 'excel']).withMessage('报表格式无效')
  ],
  handleValidationErrors,
  analyticsController.getUserActivityReport
);

/**
 * @description 获取费用趋势分析
 * @route GET /admin/analytics/expense-trends
 * @access Private (Admin)
 */
router.get('/expense-trends',
  authenticateToken,
  checkRole(['admin']),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    query('room_id').optional().isUUID().withMessage('寝室ID格式无效'),
    query('category').optional().isString().withMessage('费用类别必须是字符串'),
    query('period').optional().isIn(['week', 'month', 'quarter', 'year']).withMessage('时间周期无效')
  ],
  handleValidationErrors,
  analyticsController.getExpenseTrends
);

/**
 * @description 获取用户消费分析
 * @route GET /admin/analytics/user-spending
 * @access Private (Admin)
 */
router.get('/user-spending',
  authenticateToken,
  checkRole(['admin']),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    query('room_id').optional().isUUID().withMessage('寝室ID格式无效'),
    query('user_id').optional().isUUID().withMessage('用户ID格式无效'),
    query('group_by').optional().isIn(['day', 'week', 'month', 'category']).withMessage('分组方式无效')
  ],
  handleValidationErrors,
  analyticsController.getUserSpendingAnalysis
);

/**
 * @description 获取房间收支对比
 * @route GET /admin/analytics/room-balance
 * @access Private (Admin)
 */
router.get('/room-balance',
  authenticateToken,
  checkRole(['admin']),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    query('room_id').optional().isUUID().withMessage('寝室ID格式无效'),
    query('group_by').optional().isIn(['day', 'week', 'month']).withMessage('分组方式无效')
  ],
  handleValidationErrors,
  analyticsController.getRoomBalanceAnalysis
);

/**
 * @description 获取支付方式分析
 * @route GET /admin/analytics/payment-methods
 * @access Private (Admin)
 */
router.get('/payment-methods',
  authenticateToken,
  checkRole(['admin']),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    query('room_id').optional().isUUID().withMessage('寝室ID格式无效'),
    query('group_by').optional().isIn(['day', 'week', 'month']).withMessage('分组方式无效')
  ],
  handleValidationErrors,
  analyticsController.getPaymentMethodAnalysis
);

/**
 * @description 获取系统性能指标
 * @route GET /admin/analytics/performance
 * @access Private (Admin)
 */
router.get('/performance',
  authenticateToken,
  checkRole(['admin']),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    query('metric').optional().isIn(['response_time', 'cpu_usage', 'memory_usage', 'disk_usage']).withMessage('性能指标无效')
  ],
  handleValidationErrors,
  analyticsController.getPerformanceMetrics
);

/**
 * @description 获取自定义报表
 * @route GET /admin/analytics/custom-report
 * @access Private (Admin)
 */
router.get('/custom-report',
  authenticateToken,
  checkRole(['admin']),
  [
    query('report_id').isUUID().withMessage('报表ID格式无效'),
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    query('format').optional().isIn(['json', 'csv', 'excel']).withMessage('报表格式无效')
  ],
  handleValidationErrors,
  analyticsController.getCustomReport
);

/**
 * @description 获取报表模板列表
 * @route GET /admin/analytics/report-templates
 * @access Private (Admin)
 */
router.get('/report-templates',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('category').optional().isString().withMessage('类别必须是字符串')
  ],
  handleValidationErrors,
  analyticsController.getReportTemplates
);

/**
 * @description 创建报表模板
 * @route POST /admin/analytics/report-templates
 * @access Private (Admin)
 */
router.post('/report-templates',
  authenticateToken,
  checkRole(['admin']),
  [
    body('name').notEmpty().withMessage('模板名称不能为空'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('category').optional().isString().withMessage('类别必须是字符串'),
    body('config').isObject().withMessage('配置必须是对象'),
    body('is_public').optional().isBoolean().withMessage('公开设置必须是布尔值')
  ],
  handleValidationErrors,
  analyticsController.createReportTemplate
);

/**
 * @description 更新报表模板
 * @route PUT /admin/analytics/report-templates/:id
 * @access Private (Admin)
 */
router.put('/report-templates/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('模板ID格式无效'),
    body('name').optional().notEmpty().withMessage('模板名称不能为空'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('category').optional().isString().withMessage('类别必须是字符串'),
    body('config').optional().isObject().withMessage('配置必须是对象'),
    body('is_public').optional().isBoolean().withMessage('公开设置必须是布尔值')
  ],
  handleValidationErrors,
  analyticsController.updateReportTemplate
);

/**
 * @description 删除报表模板
 * @route DELETE /admin/analytics/report-templates/:id
 * @access Private (Admin)
 */
router.delete('/report-templates/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('模板ID格式无效')
  ],
  handleValidationErrors,
  analyticsController.deleteReportTemplate
);

module.exports = router;