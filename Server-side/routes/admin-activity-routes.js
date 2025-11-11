const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/tokenManager');
const checkRole = require('../middleware/role-middleware');
const { body, query, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation-middleware');

// 导入控制器
const activityController = require('../controllers/admin/activity-controller');

/**
 * @description 获取活动列表
 * @route GET /admin/activities
 * @access Private (Admin)
 */
router.get('/',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('status').optional().isIn(['draft', 'published', 'ongoing', 'completed', 'cancelled']).withMessage('状态值无效'),
    query('type').optional().isString().withMessage('活动类型必须是字符串'),
    query('name').optional().isString().withMessage('活动名称必须是字符串'),
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效')
  ],
  handleValidationErrors,
  activityController.getActivities
);

/**
 * @description 获取活动详情
 * @route GET /admin/activities/:id
 * @access Private (Admin)
 */
router.get('/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('活动ID格式无效')
  ],
  handleValidationErrors,
  activityController.getActivityById
);

/**
 * @description 创建活动
 * @route POST /admin/activities
 * @access Private (Admin)
 */
router.post('/',
  authenticateToken,
  checkRole(['admin']),
  [
    body('name').notEmpty().withMessage('活动名称不能为空'),
    body('description').notEmpty().withMessage('活动描述不能为空'),
    body('type').isIn(['social', 'educational', 'sports', 'cultural', 'other']).withMessage('活动类型无效'),
    body('start_time').isISO8601().withMessage('开始时间格式无效'),
    body('end_time').isISO8601().withMessage('结束时间格式无效'),
    body('location').notEmpty().withMessage('活动地点不能为空'),
    body('max_participants').isInt({ min: 1 }).withMessage('最大参与人数必须是正整数'),
    body('status').isIn(['draft', 'published', 'ongoing', 'completed', 'cancelled']).withMessage('状态值无效'),
    body('registration_deadline').optional().isISO8601().withMessage('报名截止时间格式无效'),
    body('fee').optional().isFloat({ min: 0 }).withMessage('费用必须是非负数'),
    body('tags').optional().isArray().withMessage('标签必须是数组')
  ],
  handleValidationErrors,
  activityController.createActivity
);

/**
 * @description 更新活动
 * @route PUT /admin/activities/:id
 * @access Private (Admin)
 */
router.put('/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('活动ID格式无效'),
    body('name').optional().notEmpty().withMessage('活动名称不能为空'),
    body('description').optional().notEmpty().withMessage('活动描述不能为空'),
    body('type').optional().isIn(['social', 'educational', 'sports', 'cultural', 'other']).withMessage('活动类型无效'),
    body('start_time').optional().isISO8601().withMessage('开始时间格式无效'),
    body('end_time').optional().isISO8601().withMessage('结束时间格式无效'),
    body('location').optional().notEmpty().withMessage('活动地点不能为空'),
    body('max_participants').optional().isInt({ min: 1 }).withMessage('最大参与人数必须是正整数'),
    body('status').optional().isIn(['draft', 'published', 'ongoing', 'completed', 'cancelled']).withMessage('状态值无效'),
    body('registration_deadline').optional().isISO8601().withMessage('报名截止时间格式无效'),
    body('fee').optional().isFloat({ min: 0 }).withMessage('费用必须是非负数'),
    body('tags').optional().isArray().withMessage('标签必须是数组')
  ],
  handleValidationErrors,
  activityController.updateActivity
);

/**
 * @description 删除活动
 * @route DELETE /admin/activities/:id
 * @access Private (Admin)
 */
router.delete('/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('活动ID格式无效')
  ],
  handleValidationErrors,
  activityController.deleteActivity
);

/**
 * @description 获取活动参与者
 * @route GET /admin/activities/:id/participants
 * @access Private (Admin)
 */
router.get('/:id/participants',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('活动ID格式无效'),
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('status').optional().isIn(['registered', 'confirmed', 'attended', 'cancelled']).withMessage('状态值无效')
  ],
  handleValidationErrors,
  activityController.getActivityParticipants
);

/**
 * @description 添加活动参与者
 * @route POST /admin/activities/:id/participants
 * @access Private (Admin)
 */
router.post('/:id/participants',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('活动ID格式无效'),
    body('user_id').isUUID().withMessage('用户ID格式无效'),
    body('status').isIn(['registered', 'confirmed', 'attended', 'cancelled']).withMessage('状态值无效'),
    body('notes').optional().isString().withMessage('备注必须是字符串')
  ],
  handleValidationErrors,
  activityController.addActivityParticipant
);

/**
 * @description 移除活动参与者
 * @route DELETE /admin/activities/:id/participants/:userId
 * @access Private (Admin)
 */
router.delete('/:id/participants/:userId',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('活动ID格式无效'),
    param('userId').isUUID().withMessage('用户ID格式无效')
  ],
  handleValidationErrors,
  activityController.removeActivityParticipant
);

/**
 * @description 获取活动统计数据
 * @route GET /admin/activities/statistics
 * @access Private (Admin)
 */
router.get('/statistics',
  authenticateToken,
  checkRole(['admin']),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    query('group_by').optional().isIn(['day', 'week', 'month', 'type', 'status']).withMessage('分组方式无效')
  ],
  handleValidationErrors,
  activityController.getActivityStatistics
);

module.exports = router;