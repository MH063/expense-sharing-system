/**
 * 评价路由
 */
const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/review-controller');
const { authenticateToken } = require('../middleware/tokenManager');
const { roleAwareRateLimiter } = require('../middleware/rateLimiter');

router.get('/', authenticateToken, roleAwareRateLimiter('loose'), (req, res) => reviewController.list(req, res));
const { body } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation-middleware');

router.post('/', authenticateToken, roleAwareRateLimiter('strict'), [
  body('billId').isUUID().withMessage('账单ID格式不正确'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('评分必须是1-5的整数'),
  body('comment').optional().isLength({ max: 500 }).withMessage('评论长度不能超过500')
], handleValidationErrors, (req, res) => reviewController.create(req, res));

module.exports = router;