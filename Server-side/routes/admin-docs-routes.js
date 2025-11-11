const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/tokenManager');
const checkRole = require('../middleware/role-middleware');
const { body, query, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation-middleware');

// 导入控制器
const docsController = require('../controllers/admin/docs-controller');

/**
 * @description 获取文档列表
 * @route GET /admin/docs
 * @access Private (Admin)
 */
router.get('/',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('type').optional().isString().withMessage('文档类型必须是字符串'),
    query('status').optional().isIn(['draft', 'published', 'archived']).withMessage('状态值无效'),
    query('search').optional().isString().withMessage('搜索关键词必须是字符串')
  ],
  handleValidationErrors,
  docsController.getDocuments
);

/**
 * @description 获取文档详情
 * @route GET /admin/docs/:id
 * @access Private (Admin)
 */
router.get('/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('文档ID格式无效')
  ],
  handleValidationErrors,
  docsController.getDocumentById
);

/**
 * @description 创建文档
 * @route POST /admin/docs
 * @access Private (Admin)
 */
router.post('/',
  authenticateToken,
  checkRole(['admin']),
  [
    body('title').notEmpty().withMessage('文档标题不能为空'),
    body('content').notEmpty().withMessage('文档内容不能为空'),
    body('type').isIn(['policy', 'guide', 'faq', 'announcement', 'other']).withMessage('文档类型无效'),
    body('status').isIn(['draft', 'published', 'archived']).withMessage('状态值无效'),
    body('tags').optional().isArray().withMessage('标签必须是数组'),
    body('version').optional().isString().withMessage('版本必须是字符串'),
    body('published_at').optional().isISO8601().withMessage('发布时间格式无效')
  ],
  handleValidationErrors,
  docsController.createDocument
);

/**
 * @description 更新文档
 * @route PUT /admin/docs/:id
 * @access Private (Admin)
 */
router.put('/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('文档ID格式无效'),
    body('title').optional().notEmpty().withMessage('文档标题不能为空'),
    body('content').optional().notEmpty().withMessage('文档内容不能为空'),
    body('type').optional().isIn(['policy', 'guide', 'faq', 'announcement', 'other']).withMessage('文档类型无效'),
    body('status').optional().isIn(['draft', 'published', 'archived']).withMessage('状态值无效'),
    body('tags').optional().isArray().withMessage('标签必须是数组'),
    body('version').optional().isString().withMessage('版本必须是字符串'),
    body('published_at').optional().isISO8601().withMessage('发布时间格式无效')
  ],
  handleValidationErrors,
  docsController.updateDocument
);

/**
 * @description 删除文档
 * @route DELETE /admin/docs/:id
 * @access Private (Admin)
 */
router.delete('/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('文档ID格式无效')
  ],
  handleValidationErrors,
  docsController.deleteDocument
);

/**
 * @description 获取文档历史记录
 * @route GET /admin/docs/:id/history
 * @access Private (Admin)
 */
router.get('/:id/history',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('文档ID格式无效'),
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间')
  ],
  handleValidationErrors,
  docsController.getDocumentHistory
);

/**
 * @description 获取文档统计
 * @route GET /admin/docs/:id/statistics
 * @access Private (Admin)
 */
router.get('/:id/statistics',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('文档ID格式无效')
  ],
  handleValidationErrors,
  docsController.getDocumentStatistics
);

/**
 * @description 获取文档类型
 * @route GET /admin/docs/types
 * @access Private (Admin)
 */
router.get('/types',
  authenticateToken,
  checkRole(['admin']),
  docsController.getDocumentTypes
);

/**
 * @description 获取最近文档
 * @route GET /admin/docs/recent
 * @access Private (Admin)
 */
router.get('/recent',
  authenticateToken,
  checkRole(['admin']),
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('数量必须是1-50之间的整数')
  ],
  handleValidationErrors,
  docsController.getRecentDocuments
);

/**
 * @description 获取热门文档
 * @route GET /admin/docs/popular
 * @access Private (Admin)
 */
router.get('/popular',
  authenticateToken,
  checkRole(['admin']),
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('数量必须是1-50之间的整数'),
    query('period').optional().isIn(['week', 'month', 'year']).withMessage('时间段无效')
  ],
  handleValidationErrors,
  docsController.getPopularDocuments
);

/**
 * @description 获取最近更新
 * @route GET /admin/docs/updates
 * @access Private (Admin)
 */
router.get('/updates',
  authenticateToken,
  checkRole(['admin']),
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('数量必须是1-50之间的整数')
  ],
  handleValidationErrors,
  docsController.getRecentUpdates
);

/**
 * @description 导出文档概览
 * @route GET /admin/docs/export/summary
 * @access Private (Admin)
 */
router.get('/export/summary',
  authenticateToken,
  checkRole(['admin']),
  [
    query('format').optional().isIn(['csv', 'excel', 'pdf']).withMessage('导出格式无效'),
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效')
  ],
  handleValidationErrors,
  docsController.exportDocumentSummary
);

/**
 * @description 导出PDF文档
 * @route GET /admin/docs/export/pdf
 * @access Private (Admin)
 */
router.get('/export/pdf',
  authenticateToken,
  checkRole(['admin']),
  [
    query('document_id').isUUID().withMessage('文档ID格式无效')
  ],
  handleValidationErrors,
  docsController.exportDocumentToPDF
);

/**
 * @description 导出Excel文档
 * @route GET /admin/docs/export/excel
 * @access Private (Admin)
 */
router.get('/export/excel',
  authenticateToken,
  checkRole(['admin']),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效')
  ],
  handleValidationErrors,
  docsController.exportDocumentsToExcel
);

/**
 * @description 搜索文档
 * @route GET /admin/docs/search
 * @access Private (Admin)
 */
router.get('/search',
  authenticateToken,
  checkRole(['admin']),
  [
    query('q').notEmpty().withMessage('搜索关键词不能为空'),
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间')
  ],
  handleValidationErrors,
  docsController.searchDocuments
);

/**
 * @description 下载文档
 * @route GET /admin/docs/:id/download
 * @access Private (Admin)
 */
router.get('/:id/download',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('文档ID格式无效')
  ],
  handleValidationErrors,
  docsController.downloadDocument
);

/**
 * @description 记录文档访问日志
 * @route POST /admin/docs/:id/access-log
 * @access Private (Admin)
 */
router.post('/:id/access-log',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('文档ID格式无效'),
    body('ip_address').optional().isIP().withMessage('IP地址格式无效'),
    body('user_agent').optional().isString().withMessage('用户代理必须是字符串')
  ],
  handleValidationErrors,
  docsController.recordDocumentAccess
);

/**
 * @description 获取文档访问日志
 * @route GET /admin/docs/:id/access-logs
 * @access Private (Admin)
 */
router.get('/:id/access-logs',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('文档ID格式无效'),
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效')
  ],
  handleValidationErrors,
  docsController.getDocumentAccessLogs
);

module.exports = router;