/**
 * 支付流程优化路由
 * 处理离线支付、支付提醒和支付记录查询的路由
 */

const express = require('express');
const router = express.Router();
const paymentOptimizationController = require('../controllers/payment-optimization-controller');
const { authenticateToken } = require('../middleware/tokenManager');

// 应用身份验证中间件
router.use(authenticateToken);

// 离线支付相关路由
router.post('/offline-payments', paymentOptimizationController.createOfflinePayment);
router.put('/offline-payments/:paymentId/sync', paymentOptimizationController.syncOfflinePayment);
router.get('/offline-payments/user/:userId', paymentOptimizationController.getUserOfflinePayments);
router.get('/offline-payments/pending', paymentOptimizationController.getPendingSyncPayments);

// 支付提醒相关路由
router.post('/reminders', paymentOptimizationController.createPaymentReminder);
router.get('/reminders/user/:userId', paymentOptimizationController.getUserPaymentReminders);

// 支付记录查询相关路由
router.get('/records', paymentOptimizationController.getPaymentRecords);
router.get('/records/:paymentId', paymentOptimizationController.getPaymentRecordById);
router.get('/stats/user/:userId', paymentOptimizationController.getUserPaymentStats);
router.get('/stats/room/:roomId', paymentOptimizationController.getRoomPaymentStats);

// 定时任务相关路由
router.post('/tasks/trigger/:taskName', paymentOptimizationController.triggerTask);
router.get('/tasks/status', paymentOptimizationController.getTaskStatus);

module.exports = router;