/**
 * 数据导出路由
 * 提供账单、费用、支付记录等数据的导出功能
 */

const express = require('express');
const router = express.Router();
const { body, query, param } = require('express-validator');
const dataExportController = require('../controllers/data-export-controller');
const { authenticateToken } = require('../middleware/auth-middleware');
const { checkRole } = require('../middleware/permission-middleware');
const { roleAwareRateLimiter } = require('../middleware/rateLimiter');

/**
 * @route GET /api/data-export/bills
 * @desc 导出账单数据
 * @access 需要认证
 */
router.get(
  '/bills',
  authenticateToken,
  checkRole(['user', 'admin']),
  roleAwareRateLimiter(100, 15 * 60), // 15分钟内最多100次请求
  [
    query('startDate').optional().isISO8601().withMessage('开始日期格式不正确'),
    query('endDate').optional().isISO8601().withMessage('结束日期格式不正确'),
    query('roomId').optional().isInt().withMessage('房间ID必须是整数'),
    query('format').optional().isIn(['csv', 'json', 'xlsx']).withMessage('导出格式只能是csv、json或xlsx')
  ],
  dataExportController.exportBills
);

/**
 * @route GET /api/data-export/expenses
 * @desc 导出费用数据
 * @access 需要认证
 */
router.get(
  '/expenses',
  authenticateToken,
  checkRole(['user', 'admin']),
  roleAwareRateLimiter(100, 15 * 60), // 15分钟内最多100次请求
  [
    query('startDate').optional().isISO8601().withMessage('开始日期格式不正确'),
    query('endDate').optional().isISO8601().withMessage('结束日期格式不正确'),
    query('roomId').optional().isInt().withMessage('房间ID必须是整数'),
    query('format').optional().isIn(['csv', 'json', 'xlsx']).withMessage('导出格式只能是csv、json或xlsx')
  ],
  dataExportController.exportExpenses
);

/**
 * @route GET /api/data-export/payments
 * @desc 导出支付记录数据
 * @access 需要认证
 */
router.get(
  '/payments',
  authenticateToken,
  checkRole(['user', 'admin']),
  roleAwareRateLimiter(100, 15 * 60), // 15分钟内最多100次请求
  [
    query('startDate').optional().isISO8601().withMessage('开始日期格式不正确'),
    query('endDate').optional().isISO8601().withMessage('结束日期格式不正确'),
    query('roomId').optional().isInt().withMessage('房间ID必须是整数'),
    query('format').optional().isIn(['csv', 'json', 'xlsx']).withMessage('导出格式只能是csv、json或xlsx')
  ],
  dataExportController.exportPayments
);

/**
 * @route GET /api/data-export/activities
 * @desc 导出活动数据
 * @access 需要认证
 */
router.get(
  '/activities',
  authenticateToken,
  checkRole(['user', 'admin']),
  roleAwareRateLimiter(100, 15 * 60), // 15分钟内最多100次请求
  [
    query('startDate').optional().isISO8601().withMessage('开始日期格式不正确'),
    query('endDate').optional().isISO8601().withMessage('结束日期格式不正确'),
    query('roomId').optional().isInt().withMessage('房间ID必须是整数'),
    query('format').optional().isIn(['csv', 'json', 'xlsx']).withMessage('导出格式只能是csv、json或xlsx')
  ],
  dataExportController.exportActivities
);

/**
 * @route GET /api/data-export/room-summary
 * @desc 导出房间汇总数据
 * @access 需要认证
 */
router.get(
  '/room-summary/:roomId',
  authenticateToken,
  checkRole(['user', 'admin']),
  roleAwareRateLimiter(50, 15 * 60), // 15分钟内最多50次请求
  [
    param('roomId').isInt().withMessage('房间ID必须是整数'),
    query('startDate').optional().isISO8601().withMessage('开始日期格式不正确'),
    query('endDate').optional().isISO8601().withMessage('结束日期格式不正确'),
    query('format').optional().isIn(['csv', 'json', 'xlsx']).withMessage('导出格式只能是csv、json或xlsx')
  ],
  dataExportController.exportRoomSummary
);

/**
 * @route GET /api/data-export/user-summary
 * @desc 导出用户汇总数据
 * @access 需要认证
 */
router.get(
  '/user-summary',
  authenticateToken,
  checkRole(['user', 'admin']),
  roleAwareRateLimiter(50, 15 * 60), // 15分钟内最多50次请求
  [
    query('startDate').optional().isISO8601().withMessage('开始日期格式不正确'),
    query('endDate').optional().isISO8601().withMessage('结束日期格式不正确'),
    query('format').optional().isIn(['csv', 'json', 'xlsx']).withMessage('导出格式只能是csv、json或xlsx')
  ],
  dataExportController.exportUserSummary
);

/**
 * @route POST /api/data-export/custom
 * @desc 自定义数据导出
 * @access 需要认证
 */
router.post(
  '/custom',
  authenticateToken,
  checkRole(['user', 'admin']),
  roleAwareRateLimiter(20, 15 * 60), // 15分钟内最多20次请求
  [
    body('query').notEmpty().withMessage('查询条件不能为空'),
    body('format').isIn(['csv', 'json', 'xlsx']).withMessage('导出格式只能是csv、json或xlsx'),
    body('fileName').optional().isString().withMessage('文件名必须是字符串')
  ],
  dataExportController.customExport
);

/**
 * @route GET /api/data-export/templates
 * @desc 获取导出模板列表
 * @access 需要认证
 */
router.get(
  '/templates',
  authenticateToken,
  checkRole(['user', 'admin']),
  roleAwareRateLimiter(100, 15 * 60), // 15分钟内最多100次请求
  dataExportController.getExportTemplates
);

/**
 * @route POST /api/data-export/templates
 * @desc 创建导出模板
 * @access 需要认证
 */
router.post(
  '/templates',
  authenticateToken,
  checkRole(['admin']),
  roleAwareRateLimiter(20, 15 * 60), // 15分钟内最多20次请求
  [
    body('name').notEmpty().withMessage('模板名称不能为空'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('query').notEmpty().withMessage('查询条件不能为空'),
    body('columns').isArray().withMessage('列配置必须是数组')
  ],
  dataExportController.createExportTemplate
);

/**
 * @route PUT /api/data-export/templates/:templateId
 * @desc 更新导出模板
 * @access 需要认证
 */
router.put(
  '/templates/:templateId',
  authenticateToken,
  checkRole(['admin']),
  roleAwareRateLimiter(20, 15 * 60), // 15分钟内最多20次请求
  [
    param('templateId').isInt().withMessage('模板ID必须是整数'),
    body('name').optional().notEmpty().withMessage('模板名称不能为空'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('query').optional().notEmpty().withMessage('查询条件不能为空'),
    body('columns').optional().isArray().withMessage('列配置必须是数组')
  ],
  dataExportController.updateExportTemplate
);

/**
 * @route DELETE /api/data-export/templates/:templateId
 * @desc 删除导出模板
 * @access 需要认证
 */
router.delete(
  '/templates/:templateId',
  authenticateToken,
  checkRole(['admin']),
  roleAwareRateLimiter(20, 15 * 60), // 15分钟内最多20次请求
  [
    param('templateId').isInt().withMessage('模板ID必须是整数')
  ],
  dataExportController.deleteExportTemplate
);

/**
 * @route GET /api/data-export/history
 * @desc 获取导出历史记录
 * @access 需要认证
 */
router.get(
  '/history',
  authenticateToken,
  checkRole(['user', 'admin']),
  roleAwareRateLimiter(100, 15 * 60), // 15分钟内最多100次请求
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须是1-100之间的整数')
  ],
  dataExportController.getExportHistory
);

/**
 * @route GET /api/data-export/history/:exportId
 * @desc 获取导出历史记录详情
 * @access 需要认证
 */
router.get(
  '/history/:exportId',
  authenticateToken,
  checkRole(['user', 'admin']),
  roleAwareRateLimiter(100, 15 * 60), // 15分钟内最多100次请求
  [
    param('exportId').isInt().withMessage('导出记录ID必须是整数')
  ],
  dataExportController.getExportHistoryDetail
);

module.exports = router;