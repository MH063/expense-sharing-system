const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth-middleware');
const checkRole = require('../middleware/role-middleware');
const { body, param, query } = require('express-validator');
const { handleValidationErrors } = require('../middleware/validation-middleware');

// 导入控制器
const paymentController = require('../controllers/payment-controller');

/**
 * @description 获取支付记录列表
 * @route GET /admin/payments
 * @access Private (Admin)
 */
router.get('/',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('status').optional().isIn(['pending', 'completed', 'failed', 'cancelled']).withMessage('状态值无效'),
    query('method').optional().isIn(['cash', 'wechat', 'alipay', 'bank_transfer', 'credit_card']).withMessage('支付方式无效'),
    query('user_id').optional().isUUID().withMessage('用户ID格式无效'),
    query('bill_id').optional().isUUID().withMessage('账单ID格式无效'),
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效')
  ],
  handleValidationErrors,
  paymentController.getPayments
);

/**
 * @description 获取支付统计
 * @route GET /admin/payments/statistics
 * @access Private (Admin)
 */
router.get('/statistics',
  authenticateToken,
  checkRole(['admin']),
  [
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效'),
    query('room_id').optional().isUUID().withMessage('寝室ID格式无效'),
    query('method').optional().isIn(['cash', 'wechat', 'alipay', 'bank_transfer', 'credit_card']).withMessage('支付方式无效')
  ],
  handleValidationErrors,
  paymentController.getPaymentStatistics
);

/**
 * @description 获取支付方式列表
 * @route GET /admin/payments/methods
 * @access Private (Admin)
 */
router.get('/methods',
  authenticateToken,
  checkRole(['admin']),
  paymentController.getPaymentMethods
);

/**
 * @description 导出支付记录
 * @route GET /admin/payments/export
 * @access Private (Admin)
 */
router.get('/export',
  authenticateToken,
  checkRole(['admin']),
  [
    query('start_date').isISO8601().withMessage('开始日期格式无效'),
    query('end_date').isISO8601().withMessage('结束日期格式无效'),
    query('format').optional().isIn(['csv', 'excel', 'pdf']).withMessage('导出格式无效'),
    query('room_id').optional().isUUID().withMessage('寝室ID格式无效'),
    query('method').optional().isIn(['cash', 'wechat', 'alipay', 'bank_transfer', 'credit_card']).withMessage('支付方式无效')
  ],
  handleValidationErrors,
  paymentController.exportPayments
);

/**
 * @description 批量创建支付记录
 * @route POST /admin/payments/batch
 * @access Private (Admin)
 */
router.post('/batch',
  authenticateToken,
  checkRole(['admin']),
  [
    body('payments').isArray({ min: 1 }).withMessage('支付记录列表不能为空'),
    body('payments.*.user_id').isUUID().withMessage('用户ID格式无效'),
    body('payments.*.bill_id').isUUID().withMessage('账单ID格式无效'),
    body('payments.*.amount').isFloat({ min: 0.01 }).withMessage('金额必须大于0'),
    body('payments.*.method').isIn(['cash', 'wechat', 'alipay', 'bank_transfer', 'credit_card']).withMessage('支付方式无效'),
    body('payments.*.payment_date').isISO8601().withMessage('支付日期格式无效'),
    body('payments.*.notes').optional().isString().withMessage('备注必须是字符串'),
    body('payments.*.receipt_url').optional().isURL().withMessage('收据URL格式无效')
  ],
  handleValidationErrors,
  paymentController.createBatchPayments
);

/**
 * @description 获取支付对账单
 * @route GET /admin/payments/reconciliation
 * @access Private (Admin)
 */
router.get('/reconciliation',
  authenticateToken,
  checkRole(['admin']),
  [
    query('start_date').isISO8601().withMessage('开始日期格式无效'),
    query('end_date').isISO8601().withMessage('结束日期格式无效'),
    query('room_id').optional().isUUID().withMessage('寝室ID格式无效'),
    query('method').optional().isIn(['cash', 'wechat', 'alipay', 'bank_transfer', 'credit_card']).withMessage('支付方式无效')
  ],
  handleValidationErrors,
  paymentController.getPaymentReconciliation
);

/**
 * @description 获取支付退款记录
 * @route GET /admin/payments/refunds
 * @access Private (Admin)
 */
router.get('/refunds',
  authenticateToken,
  checkRole(['admin']),
  [
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
    query('payment_id').optional().isUUID().withMessage('支付ID格式无效'),
    query('status').optional().isIn(['pending', 'completed', 'failed']).withMessage('状态值无效'),
    query('start_date').optional().isISO8601().withMessage('开始日期格式无效'),
    query('end_date').optional().isISO8601().withMessage('结束日期格式无效')
  ],
  handleValidationErrors,
  paymentController.getPaymentRefunds
);

/**
 * @description 获取支付详情
 * @route GET /admin/payments/:id
 * @access Private (Admin)
 */
router.get('/:id',
  authenticateToken,
  checkRole(['admin']),
  [
    param('id').isUUID().withMessage('支付ID格式无效')
  ],
  handleValidationErrors,
  paymentController.getPaymentById
);

/**
 * @description 创建支付记录
 * @route POST /admin/payments
 * @access Private (Admin)
 */
router.post('/',
  authenticateToken,
  checkRole(['admin']),
  [
    body('user_id').isUUID().withMessage('用户ID格式无效'),
    body('bill_id').isUUID().withMessage('账单ID格式无效'),
    body('amount').isFloat({ min: 0.01 }).withMessage('金额必须大于0'),
    body('method').isIn(['cash', 'wechat', 'alipay', 'bank_transfer', 'credit_card']).withMessage('支付方式无效'),
    body('payment_date').isISO8601().withMessage('支付日期格式无效'),
    body('notes').optional().isString().withMessage('备注必须是字符串'),
    body('receipt_url').optional().isURL().withMessage('收据URL格式无效')
  ],
  handleValidationErrors,
  paymentController.createPayment
);

module.exports = router;