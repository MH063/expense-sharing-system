const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment-controller');
const { authenticateToken } = require('../middleware/auth-middleware');
const offlinePaymentService = require('../services/offline-payment-service');

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * 获取账单收款码
 * GET /api/payments/bills/:billId/qr-code
 * 查询参数: qr_type (wechat 或 alipay)
 */
router.get('/bills/:billId/qr-code', paymentController.getBillQrCode);

/**
 * 确认支付
 * POST /api/payments/bills/:billId/confirm
 * 请求体: { payment_method, transaction_id, payment_time }
 */
router.post('/bills/:billId/confirm', paymentController.confirmPayment);

/**
 * 获取账单支付状态
 * GET /api/payments/bills/:billId/status
 */
router.get('/bills/:billId/status', paymentController.getBillPaymentStatus);

/**
 * 获取用户支付记录
 * GET /api/payments/user
 * 查询参数: page, limit, status
 */
router.get('/user', paymentController.getUserPayments);

// 离线支付相关路由

/**
 * 创建离线支付记录
 * POST /api/payments/offline
 * 请求体: { billId, amount, paymentMethod, note, deviceId, location }
 */
router.post('/offline', async (req, res) => {
  try {
    const { billId, amount, paymentMethod, note, deviceId, location } = req.body;
    const userId = req.user.id;
    
    const paymentData = {
      billId,
      userId,
      amount,
      paymentMethod,
      note,
      deviceId,
      location
    };
    
    const offlinePayment = await offlinePaymentService.createOfflinePayment(paymentData);
    
    res.status(201).json({
      success: true,
      data: offlinePayment
    });
  } catch (error) {
    console.error('创建离线支付记录失败:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 同步离线支付记录
 * POST /api/payments/:paymentId/sync
 * 请求体: { transactionId, receipt }
 */
router.post('/:paymentId/sync', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { transactionId, receipt } = req.body;
    
    const syncData = {
      transactionId,
      receipt
    };
    
    const updatedPayment = await offlinePaymentService.syncOfflinePayment(paymentId, syncData);
    
    res.status(200).json({
      success: true,
      data: updatedPayment
    });
  } catch (error) {
    console.error('同步离线支付记录失败:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 获取用户离线支付记录
 * GET /api/payments/offline
 * 查询参数: status, page, pageSize
 */
router.get('/offline', async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, page, pageSize } = req.query;
    
    const options = {
      status,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 10
    };
    
    const result = await offlinePaymentService.getUserOfflinePayments(userId, options);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取用户离线支付记录失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 获取所有待同步的离线支付记录
 * GET /api/payments/offline/pending-sync
 * 查询参数: page, pageSize
 */
router.get('/offline/pending-sync', async (req, res) => {
  try {
    const { page, pageSize } = req.query;
    
    const options = {
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 10
    };
    
    const result = await offlinePaymentService.getPendingSyncPayments(options);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('获取待同步的离线支付记录失败:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 标记离线支付记录为同步失败
 * PATCH /api/payments/:paymentId/sync-failed
 * 请求体: { failureReason }
 */
router.patch('/:paymentId/sync-failed', async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { failureReason } = req.body;
    
    const updatedPayment = await offlinePaymentService.markPaymentSyncFailed(paymentId, failureReason);
    
    res.status(200).json({
      success: true,
      data: updatedPayment
    });
  } catch (error) {
    console.error('标记离线支付记录为同步失败失败:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * 重试同步失败的离线支付记录
 * POST /api/payments/:paymentId/retry-sync
 */
router.post('/:paymentId/retry-sync', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    const updatedPayment = await offlinePaymentService.retryPaymentSync(paymentId);
    
    res.status(200).json({
      success: true,
      data: updatedPayment
    });
  } catch (error) {
    console.error('重试同步失败的离线支付记录失败:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;