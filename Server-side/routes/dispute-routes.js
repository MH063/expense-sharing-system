/**
 * 争议路由
 */
const express = require('express');
const router = express.Router();
const disputeController = require('../controllers/dispute-controller');
const { authenticateToken } = require('../middleware/tokenManager');
const { roleAwareRateLimiter } = require('../middleware/rateLimiter');

router.get('/', authenticateToken, roleAwareRateLimiter('loose'), (req, res) => disputeController.list(req, res));
router.get('/:id', authenticateToken, roleAwareRateLimiter('loose'), (req, res) => disputeController.get(req, res));
const { body, param } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation-middleware');

router.post('/', authenticateToken, roleAwareRateLimiter('strict'), [
  body('billId').isUUID().withMessage('账单ID格式不正确'),
  body('reason').isLength({ min: 1, max: 500 }).withMessage('争议原因长度应在1-500之间')
], handleValidationErrors, (req, res) => disputeController.create(req, res));
router.patch('/:id/status', authenticateToken, roleAwareRateLimiter('strict'), [
  param('id').isUUID().withMessage('争议ID格式不正确'),
  body('status').isIn(['open','in_review','resolved','rejected']).withMessage('争议状态无效')
], handleValidationErrors, (req, res) => disputeController.updateStatus(req, res));

module.exports = router;