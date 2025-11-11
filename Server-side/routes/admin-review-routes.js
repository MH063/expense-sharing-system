const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/tokenManager');
const checkRole = require('../middleware/role-middleware');
const { body, query, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation-middleware');

// 导入控制器
const reviewController = require('../controllers/admin/review-controller');

/**
 * @description 获取评论列表
 * @route GET /admin/reviews
 * @access Private (Admin)
 */
router.get('/',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('状态值无效'),
    query('user_id').optional().isUUID().withMessage('用户ID格式无效'),
    query('resource_type').optional().isIn(['bill', 'expense', 'room', 'other']).withMessage('资源类型无效'),
    query('resource_id').optional().isUUID().withMessage('资源ID格式无效'),
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效')
  ],
  handleValidationErrors,
  reviewController.getReviews
);

/**
 * @description 获取评论详情
 * @route GET /admin/reviews/:id
 * @access Private (Admin)
 */
router.get('/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('评论ID格式无效')
  ],
  handleValidationErrors,
  reviewController.getReviewById
);

/**
 * @description 创建评论
 * @route POST /admin/reviews
 * @access Private (Admin)
 */
router.post('/',
  authenticateToken,
  checkRole(['admin']),
  [
    body('resource_type').isIn(['bill', 'expense', 'room', 'other']).withMessage('资源类型无效'),
    body('resource_id').isUUID().withMessage('资源ID格式无效'),
    body('content').notEmpty().withMessage('评论内容不能为空'),
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('评分必须是1-5之间的整数'),
    body('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('状态值无效')
  ],
  handleValidationErrors,
  reviewController.createReview
);

/**
 * @description 更新评论
 * @route PUT /admin/reviews/:id
 * @access Private (Admin)
 */
router.put('/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('评论ID格式无效'),
    body('content').optional().notEmpty().withMessage('评论内容不能为空'),
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('评分必须是1-5之间的整数'),
    body('status').optional().isIn(['pending', 'approved', 'rejected']).withMessage('状态值无效')
  ],
  handleValidationErrors,
  reviewController.updateReview
);

/**
 * @description 删除评论
 * @route DELETE /admin/reviews/:id
 * @access Private (Admin)
 */
router.delete('/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('评论ID格式无效')
  ],
  handleValidationErrors,
  reviewController.deleteReview
);

/**
 * @description 审核通过评论
 * @route POST /admin/reviews/:id/approve
 * @access Private (Admin)
 */
router.post('/:id/approve',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('评论ID格式无效'),
    body('notes').optional().isString().withMessage('备注必须是字符串')
  ],
  handleValidationErrors,
  reviewController.approveReview
);

/**
 * @description 拒绝评论
 * @route POST /admin/reviews/:id/reject
 * @access Private (Admin)
 */
router.post('/:id/reject',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('评论ID格式无效'),
    body('reason').notEmpty().withMessage('拒绝原因不能为空'),
    body('notes').optional().isString().withMessage('备注必须是字符串')
  ],
  handleValidationErrors,
  reviewController.rejectReview
);

/**
 * @description 获取评论统计数据
 * @route GET /admin/reviews/statistics
 * @access Private (Admin)
 */
router.get('/statistics',
  authenticateToken,
  checkRole(['admin']),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    query('group_by').optional().isIn(['day', 'week', 'month', 'status', 'rating']).withMessage('分组方式无效')
  ],
  handleValidationErrors,
  reviewController.getReviewStatistics
);

/**
 * @description 获取评论图片
 * @route GET /admin/review-images
 * @access Private (Admin)
 */
router.get('/images',
  authenticateToken,
  checkRole(['admin']),
  [
    query('review_id').optional().isUUID().withMessage('评论ID格式无效'),
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间')
  ],
  handleValidationErrors,
  reviewController.getReviewImages
);

/**
 * @description 获取评论图片详情
 * @route GET /admin/review-images/:id
 * @access Private (Admin)
 */
router.get('/images/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('图片ID格式无效')
  ],
  handleValidationErrors,
  reviewController.getReviewImageById
);

/**
 * @description 删除评论图片
 * @route DELETE /admin/review-images/:id
 * @access Private (Admin)
 */
router.delete('/images/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('图片ID格式无效')
  ],
  handleValidationErrors,
  reviewController.deleteReviewImage
);

module.exports = router;