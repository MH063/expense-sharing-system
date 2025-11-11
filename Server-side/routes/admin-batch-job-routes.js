const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/tokenManager');
const checkRole = require('../middleware/role-middleware');
const { body, query, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation-middleware');

// 导入控制器
const batchJobController = require('../controllers/admin/batch-job-controller');

/**
 * @description 获取批量任务列表
 * @route GET /admin/batch-jobs
 * @access Private (Admin)
 */
router.get('/batch-jobs',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('status').optional().isIn(['pending', 'processing', 'completed', 'failed', 'cancelled']).withMessage('状态值无效'),
    query('type').optional().isString().withMessage('任务类型必须是字符串'),
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效')
  ],
  handleValidationErrors,
  batchJobController.getBatchJobs
);

/**
 * @description 创建批量任务
 * @route POST /admin/batch-jobs
 * @access Private (Admin)
 */
router.post('/batch-jobs',
  authenticateToken,
  checkRole(['admin']),
  [
    body('type').isIn(['data_export', 'data_import', 'data_cleanup', 'report_generation']).withMessage('任务类型无效'),
    body('name').notEmpty().withMessage('任务名称不能为空'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('parameters').optional().isObject().withMessage('参数必须是对象'),
    body('scheduled_at').optional().isISO8601().withMessage('计划执行时间格式无效')
  ],
  handleValidationErrors,
  batchJobController.createBatchJob
);

/**
 * @description 获取任务详情
 * @route GET /admin/batch-jobs/:id
 * @access Private (Admin)
 */
router.get('/batch-jobs/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('任务ID格式无效')
  ],
  handleValidationErrors,
  batchJobController.getBatchJobById
);

/**
 * @description 更新任务状态
 * @route PUT /admin/batch-jobs/:id
 * @access Private (Admin)
 */
router.put('/batch-jobs/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('任务ID格式无效'),
    body('status').isIn(['pending', 'processing', 'completed', 'failed', 'cancelled']).withMessage('状态值无效'),
    body('progress').optional().isInt({ min: 0, max: 100 }).withMessage('进度必须是0-100之间的整数'),
    body('result').optional().isObject().withMessage('结果必须是对象'),
    body('error_message').optional().isString().withMessage('错误信息必须是字符串')
  ],
  handleValidationErrors,
  batchJobController.updateBatchJob
);

/**
 * @description 删除任务
 * @route DELETE /admin/batch-jobs/:id
 * @access Private (Admin)
 */
router.delete('/batch-jobs/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('任务ID格式无效')
  ],
  handleValidationErrors,
  batchJobController.deleteBatchJob
);

/**
 * @description 获取报表定义列表
 * @route GET /admin/reports
 * @access Private (Admin)
 */
router.get('/reports',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('type').optional().isString().withMessage('报表类型必须是字符串'),
    query('name').optional().isString().withMessage('报表名称必须是字符串')
  ],
  handleValidationErrors,
  batchJobController.getReports
);

/**
 * @description 创建报表定义
 * @route POST /admin/reports
 * @access Private (Admin)
 */
router.post('/reports',
  authenticateToken,
  checkRole(['admin']),
  [
    body('name').notEmpty().withMessage('报表名称不能为空'),
    body('type').isIn(['financial', 'user', 'room', 'expense', 'payment', 'activity']).withMessage('报表类型无效'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('query').notEmpty().withMessage('查询语句不能为空'),
    body('columns').isArray({ min: 1 }).withMessage('列定义不能为空'),
    body('columns.*.name').notEmpty().withMessage('列名不能为空'),
    body('columns.*.label').notEmpty().withMessage('列标签不能为空'),
    body('columns.*.type').isIn(['string', 'number', 'date', 'boolean']).withMessage('列类型无效'),
    body('filters').optional().isArray().withMessage('过滤条件必须是数组'),
    body('scheduling').optional().isObject().withMessage('调度设置必须是对象')
  ],
  handleValidationErrors,
  batchJobController.createReport
);

/**
 * @description 获取报表定义详情
 * @route GET /admin/reports/:id
 * @access Private (Admin)
 */
router.get('/reports/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('报表ID格式无效')
  ],
  handleValidationErrors,
  batchJobController.getReportById
);

/**
 * @description 更新报表定义
 * @route PUT /admin/reports/:id
 * @access Private (Admin)
 */
router.put('/reports/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('报表ID格式无效'),
    body('name').optional().notEmpty().withMessage('报表名称不能为空'),
    body('type').optional().isIn(['financial', 'user', 'room', 'expense', 'payment', 'activity']).withMessage('报表类型无效'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('query').optional().notEmpty().withMessage('查询语句不能为空'),
    body('columns').optional().isArray({ min: 1 }).withMessage('列定义不能为空'),
    body('columns.*.name').optional().notEmpty().withMessage('列名不能为空'),
    body('columns.*.label').optional().notEmpty().withMessage('列标签不能为空'),
    body('columns.*.type').optional().isIn(['string', 'number', 'date', 'boolean']).withMessage('列类型无效'),
    body('filters').optional().isArray().withMessage('过滤条件必须是数组'),
    body('scheduling').optional().isObject().withMessage('调度设置必须是对象')
  ],
  handleValidationErrors,
  batchJobController.updateReport
);

/**
 * @description 删除报表定义
 * @route DELETE /admin/reports/:id
 * @access Private (Admin)
 */
router.delete('/reports/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('报表ID格式无效')
  ],
  handleValidationErrors,
  batchJobController.deleteReport
);

/**
 * @description 获取报表快照
 * @route GET /admin/reports/:id/snapshots
 * @access Private (Admin)
 */
router.get('/reports/:id/snapshots',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('报表ID格式无效'),
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效')
  ],
  handleValidationErrors,
  batchJobController.getReportSnapshots
);

/**
 * @description 生成报表
 * @route POST /admin/reports/:id/generate
 * @access Private (Admin)
 */
router.post('/reports/:id/generate',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('报表ID格式无效'),
    body('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    body('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    body('format').optional().isIn(['csv', 'excel', 'pdf', 'json']).withMessage('导出格式无效')
  ],
  handleValidationErrors,
  batchJobController.generateReport
);

/**
 * @description 获取导出任务列表
 * @route GET /admin/exports
 * @access Private (Admin)
 */
router.get('/exports',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('status').optional().isIn(['pending', 'processing', 'completed', 'failed', 'cancelled']).withMessage('状态值无效'),
    query('type').optional().isIn(['csv', 'excel', 'pdf', 'json']).withMessage('导出类型无效'),
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效')
  ],
  handleValidationErrors,
  batchJobController.getExportTasks
);

/**
 * @description 创建导出任务
 * @route POST /admin/exports
 * @access Private (Admin)
 */
router.post('/exports',
  authenticateToken,
  checkRole(['admin']),
  [
    body('type').isIn(['csv', 'excel', 'pdf', 'json']).withMessage('导出类型无效'),
    body('name').notEmpty().withMessage('导出任务名称不能为空'),
    body('description').optional().isString().withMessage('描述必须是字符串'),
    body('query').notEmpty().withMessage('查询语句不能为空'),
    body('columns').isArray({ min: 1 }).withMessage('列定义不能为空'),
    body('filters').optional().isObject().withMessage('过滤条件必须是对象'),
    body('scheduled_at').optional().isISO8601().withMessage('计划执行时间格式无效')
  ],
  handleValidationErrors,
  batchJobController.createExportTask
);

/**
 * @description 获取导出任务详情
 * @route GET /admin/exports/:id
 * @access Private (Admin)
 */
router.get('/exports/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('导出任务ID格式无效')
  ],
  handleValidationErrors,
  batchJobController.getExportTaskById
);

/**
 * @description 删除导出任务
 * @route DELETE /admin/exports/:id
 * @access Private (Admin)
 */
router.delete('/exports/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('导出任务ID格式无效')
  ],
  handleValidationErrors,
  batchJobController.deleteExportTask
);

module.exports = router;