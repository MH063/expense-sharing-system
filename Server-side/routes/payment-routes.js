const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment-controller');
const { authenticateToken } = require('../middleware/tokenManager');
const { 
  paymentValidationRules, 
  handleValidationErrors 
} = require('../middleware/validation-middleware');

// ===== 常规支付接口 =====

// 获取账单收款码 - 需要认证
router.get('/bills/:billId/qr-code', authenticateToken, paymentController.getBillQrCode);

// 确认支付 - 需要认证
router.post(
  '/bills/:billId/confirm',
  authenticateToken,
  paymentValidationRules.confirmPayment,
  handleValidationErrors,
  paymentController.confirmPayment
);

// 获取账单支付状态 - 需要认证
router.get('/bills/:billId/status', authenticateToken, paymentController.getBillPaymentStatus);

// 获取用户支付记录 - 需要认证
router.get('/user', authenticateToken, paymentController.getUserPayments);

// ===== 离线支付接口迁移到 payment-optimization =====
// 离线与优化相关接口已在 /api/payment-optimization 下提供，避免重复定义

module.exports = router;