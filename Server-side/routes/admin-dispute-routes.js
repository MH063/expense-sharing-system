const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/tokenManager');
const checkRole = require('../middleware/role-middleware');
const { body, query, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation-middleware');

// 导入控制器
const disputeController = require('../controllers/admin/dispute-controller');

/**
 * @description 获取争议列表
 * @route GET /admin/disputes
 * @access Private (Admin)
 */
router.get('/',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('status').optional().isIn(['open', 'resolved', 'rejected']).withMessage('状态值无效'),
    query('type').optional().isIn(['amount', 'description', 'other']).withMessage('争议类型无效'),
    query('user_id').optional().isUUID().withMessage('用户ID格式无效'),
    query('expense_id').optional().isUUID().withMessage('费用ID格式无效'),
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效')
  ],
  handleValidationErrors,
  disputeController.getDisputes
);

/**
 * @description 获取争议详情
 * @route GET /admin/disputes/:id
 * @access Private (Admin)
 */
router.get('/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('争议ID格式无效')
  ],
  handleValidationErrors,
  disputeController.getDisputeById
);

/**
 * @description 创建争议
 * @route POST /admin/disputes
 * @access Private (Admin)
 */
router.post('/',
  authenticateToken,
  checkRole(['admin']),
  [
    body('expense_id').isUUID().withMessage('费用ID格式无效'),
    body('title').notEmpty().withMessage('争议标题不能为空'),
    body('description').notEmpty().withMessage('争议描述不能为空'),
    body('type').isIn(['amount', 'description', 'other']).withMessage('争议类型无效'),
    body('assigned_to').optional().isUUID().withMessage('处理人ID格式无效')
  ],
  handleValidationErrors,
  disputeController.createDispute
);

/**
 * @description 更新争议
 * @route PUT /admin/disputes/:id
 * @access Private (Admin)
 */
router.put('/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('争议ID格式无效'),
    body('title').optional().notEmpty().withMessage('争议标题不能为空'),
    body('description').optional().notEmpty().withMessage('争议描述不能为空'),
    body('type').optional().isIn(['amount', 'description', 'other']).withMessage('争议类型无效'),
    body('assigned_to').optional().isUUID().withMessage('处理人ID格式无效')
  ],
  handleValidationErrors,
  disputeController.updateDispute
);

/**
 * @description 删除争议
 * @route DELETE /admin/disputes/:id
 * @access Private (Admin)
 */
router.delete('/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('争议ID格式无效')
  ],
  handleValidationErrors,
  disputeController.deleteDispute
);

/**
 * @description 分配处理人
 * @route POST /admin/disputes/:id/assign
 * @access Private (Admin)
 */
router.post('/:id/assign',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('争议ID格式无效'),
    body('assigned_to').isUUID().withMessage('处理人ID格式无效'),
    body('notes').optional().isString().withMessage('备注必须是字符串')
  ],
  handleValidationErrors,
  disputeController.assignDispute
);

/**
 * @description 处理争议
 * @route POST /admin/disputes/:id/handle
 * @access Private (Admin)
 */
router.post('/:id/handle',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('争议ID格式无效'),
    body('action').isIn(['accept', 'reject', 'modify']).withMessage('处理方式无效'),
    body('resolution').notEmpty().withMessage('解决方案不能为空'),
    body('notes').optional().isString().withMessage('备注必须是字符串')
  ],
  handleValidationErrors,
  disputeController.handleDispute
);

/**
 * @description 解决争议
 * @route POST /admin/disputes/:id/resolve
 * @access Private (Admin)
 */
router.post('/:id/resolve',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('争议ID格式无效'),
    body('resolution').notEmpty().withMessage('解决方案不能为空'),
    body('action').isIn(['accept', 'reject', 'modify']).withMessage('处理方式无效'),
    body('notes').optional().isString().withMessage('备注必须是字符串')
  ],
  handleValidationErrors,
  disputeController.resolveDispute
);

/**
 * @description 获取可分配的处理人列表
 * @route GET /admin/disputes/handlers
 * @access Private (Admin)
 */
router.get('/handlers',
  authenticateToken,
  checkRole(['admin']),
  disputeController.getDisputeHandlers
);

/**
 * @description 获取争议统计数据
 * @route GET /admin/disputes/stats
 * @access Private (Admin)
 */
router.get('/stats',
  authenticateToken,
  checkRole(['admin']),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    query('group_by').optional().isIn(['day', 'week', 'month', 'status', 'type']).withMessage('分组方式无效')
  ],
  handleValidationErrors,
  disputeController.getDisputeStats
);

/**
 * @description 获取争议参与者
 * @route GET /admin/disputes/:id/participants
 * @access Private (Admin)
 */
router.get('/:id/participants',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('争议ID格式无效')
  ],
  handleValidationErrors,
  disputeController.getDisputeParticipants
);

/**
 * @description 添加争议参与者
 * @route POST /admin/disputes/:id/participants
 * @access Private (Admin)
 */
router.post('/:id/participants',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('争议ID格式无效'),
    body('user_id').isUUID().withMessage('用户ID格式无效'),
    body('role').isIn(['creator', 'participant', 'observer']).withMessage('参与者角色无效')
  ],
  handleValidationErrors,
  disputeController.addDisputeParticipant
);

/**
 * @description 移除争议参与者
 * @route DELETE /admin/disputes/:id/participants/:userId
 * @access Private (Admin)
 */
router.delete('/:id/participants/:userId',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('争议ID格式无效'),
    param('userId').isUUID().withMessage('用户ID格式无效')
  ],
  handleValidationErrors,
  disputeController.removeDisputeParticipant
);

/**
 * @description 获取争议证据
 * @route GET /admin/disputes/:id/evidence
 * @access Private (Admin)
 */
router.get('/:id/evidence',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('争议ID格式无效')
  ],
  handleValidationErrors,
  disputeController.getDisputeEvidence
);

/**
 * @description 上传争议证据
 * @route POST /admin/disputes/:id/evidence
 * @access Private (Admin)
 */
router.post('/:id/evidence',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('争议ID格式无效'),
    body('file_url').notEmpty().withMessage('文件URL不能为空'),
    body('file_name').notEmpty().withMessage('文件名不能为空'),
    body('file_type').notEmpty().withMessage('文件类型不能为空'),
    body('description').optional().isString().withMessage('描述必须是字符串')
  ],
  handleValidationErrors,
  disputeController.uploadDisputeEvidence
);

/**
 * @description 删除争议证据
 * @route DELETE /admin/disputes/evidence/:evidenceId
 * @access Private (Admin)
 */
router.delete('/evidence/:evidenceId',
  authenticateToken,
  checkRole(['admin']),
  [
    param('evidenceId').isUUID().withMessage('证据ID格式无效')
  ],
  handleValidationErrors,
  disputeController.deleteDisputeEvidence
);

/**
 * @description 获取争议处理日志
 * @route GET /admin/disputes/:id/handling-logs
 * @access Private (Admin)
 */
router.get('/:id/handling-logs',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('争议ID格式无效')
  ],
  handleValidationErrors,
  disputeController.getDisputeHandlingLogs
);

module.exports = router;