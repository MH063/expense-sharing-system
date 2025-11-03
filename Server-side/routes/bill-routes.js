const express = require('express');
const router = express.Router();
const billController = require('../controllers/bill-controller');
const { authenticateToken, requireRole } = require('../middleware/auth-middleware');
const { uploadReceipt } = require('../middleware/upload');

// 创建账单
router.post('/', authenticateToken, billController.createBill);

// 上传账单收据
router.post('/receipt', authenticateToken, uploadReceipt.single('receipt'), billController.uploadReceipt);

// 获取账单列表
router.get('/', authenticateToken, billController.getBills);

// 获取账单详情
router.get('/:id', authenticateToken, billController.getBillById);

// 更新账单
router.put('/:id', authenticateToken, billController.updateBill);

// 删除账单
router.delete('/:id', authenticateToken, billController.deleteBill);

// 审核账单（寝室管理员）
router.post('/:id/review', authenticateToken, billController.reviewBill);

// 确认支付账单分摊
router.post('/:id/payment', authenticateToken, billController.confirmBillPayment);

// 获取用户的账单统计
router.get('/stats/user', authenticateToken, billController.getUserBillStats);

module.exports = router;