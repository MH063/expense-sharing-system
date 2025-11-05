const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense-controller');
const { authenticateToken } = require('../middleware/tokenManager');
const { 
  expenseValidationRules, 
  handleValidationErrors 
} = require('../middleware/validation-middleware');

// 创建费用记录 - 需要认证
router.post(
  '/',
  authenticateToken,
  expenseValidationRules.createExpense,
  handleValidationErrors,
  expenseController.createExpense
);

// 获取费用列表 - 需要认证
router.get('/', authenticateToken, expenseController.getExpenses);

// 获取费用详情 - 需要认证
router.get('/:id', authenticateToken, expenseController.getExpenseById);

// 更新费用记录 - 需要认证
router.put(
  '/:id',
  authenticateToken,
  expenseValidationRules.updateExpense,
  handleValidationErrors,
  expenseController.updateExpense
);

// 删除费用记录 - 需要认证
router.delete('/:id', authenticateToken, expenseController.deleteExpense);

// 确认支付分摊金额 - 需要认证
router.post(
  '/splits/:id/confirm',
  authenticateToken,
  expenseValidationRules.confirmSplitPayment,
  handleValidationErrors,
  expenseController.confirmSplitPayment
);

// 智能分摊计算 - 需要认证
router.post(
  '/calculate-split',
  authenticateToken,
  expenseValidationRules.calculateSmartSplit,
  handleValidationErrors,
  expenseController.calculateSmartSplit
);

// 获取费用收款码 - 需要认证
router.get('/:expenseId/qr-code', authenticateToken, expenseController.getExpenseQrCode);

// 确认费用支付 - 需要认证
router.post(
  '/:expenseId/payments/confirm',
  authenticateToken,
  expenseValidationRules.confirmExpensePayment,
  handleValidationErrors,
  expenseController.confirmExpensePayment
);

// 获取费用支付状态 - 需要认证
router.get('/:expenseId/payment-status', authenticateToken, expenseController.getExpensePaymentStatus);

// 获取用户费用支付记录 - 需要认证
router.get('/payments/user', authenticateToken, expenseController.getUserExpensePayments);

// 获取费用统计 - 需要认证
router.get('/stats/room/:roomId', authenticateToken, expenseController.getExpenseStats);

module.exports = router;