const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense-controller');
const { authenticateToken } = require('../middleware/tokenManager');

// 创建费用记录
router.post('/', authenticateToken, expenseController.createExpense);

// 获取费用列表
router.get('/', authenticateToken, expenseController.getExpenses);

// 获取费用详情
router.get('/:id', authenticateToken, expenseController.getExpenseById);

// 更新费用记录
router.put('/:id', authenticateToken, expenseController.updateExpense);

// 删除费用记录
router.delete('/:id', authenticateToken, expenseController.deleteExpense);

// 确认支付分摊金额
router.post('/splits/:id/confirm', authenticateToken, expenseController.confirmSplitPayment);

// 智能分摊计算
router.post('/calculate-split', authenticateToken, expenseController.calculateSmartSplit);

// 获取费用收款码
router.get('/:expenseId/qr-code', authenticateToken, expenseController.getExpenseQrCode);

// 确认费用支付
router.post('/:expenseId/payments/confirm', authenticateToken, expenseController.confirmExpensePayment);

// 获取费用支付状态
router.get('/:expenseId/payment-status', authenticateToken, expenseController.getExpensePaymentStatus);

// 获取用户费用支付记录
router.get('/payments/user', authenticateToken, expenseController.getUserExpensePayments);

module.exports = router;