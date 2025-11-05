/**
 * 通知路由
 * 定义通知相关的API端点
 */

const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notification-controller');
const { authenticateToken } = require('../middleware/tokenManager');
const { 
  notificationValidationRules, 
  handleValidationErrors 
} = require('../middleware/validation-middleware');
const { strictRateLimiter, looseRateLimiter } = require('../middleware/rateLimiter');
const { logger } = require('../config/logger');

// 获取通知列表 - 需要认证（读接口：宽松限流）
router.get('/', authenticateToken, looseRateLimiter, async (req, res) => {
  const { page = 1, limit = 20, unreadOnly, type } = req.query;
  try {
    const result = await NotificationController.getUserNotifications(req.user.sub, {
      unreadOnly: unreadOnly === 'true',
      type: type || null,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    logger.info('audit:notifications:list', { userId: req.user.sub, page, limit, unreadOnly, type });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    logger.error('audit:notifications:list:error', { userId: req.user.sub, error: error.message });
    res.status(500).json({ success: false, message: '获取通知失败', error: error.message });
  }
});

// 获取未读通知数量 - 需要认证（读接口：宽松限流）
router.get('/unread-count', authenticateToken, looseRateLimiter, async (req, res) => {
  try {
    const count = await NotificationController.getUnreadNotificationsCount(req.user.sub);
    logger.info('audit:notifications:unread_count', { userId: req.user.sub, count });
    res.status(200).json({ success: true, data: { count } });
  } catch (error) {
    logger.error('audit:notifications:unread_count:error', { userId: req.user.sub, error: error.message });
    res.status(500).json({ success: false, message: '获取未读通知数量失败', error: error.message });
  }
});

// 标记通知为已读 - 需要认证（写接口：严格限流）
router.put(
  '/:id/read',
  authenticateToken,
  strictRateLimiter,
  async (req, res) => {
    try {
      const success = await NotificationController.markNotificationAsRead(req.params.id, req.user.sub);
      logger.info('audit:notifications:mark_read', { userId: req.user.sub, notificationId: req.params.id, success });
      res.status(200).json({ success, message: success ? '标记成功' : '标记失败' });
    } catch (error) {
      logger.error('audit:notifications:mark_read:error', { userId: req.user.sub, notificationId: req.params.id, error: error.message });
      res.status(500).json({ success: false, message: '标记通知为已读失败', error: error.message });
    }
  }
);

// 批量标记通知为已读 - 需要认证（写接口：严格限流）
router.put(
  '/mark-all-read',
  authenticateToken,
  strictRateLimiter,
  notificationValidationRules.markAllRead,
  handleValidationErrors,
  async (req, res) => {
    try {
      const updated = await NotificationController.markAllNotificationsAsRead(req.user.sub, req.body.type);
      logger.info('audit:notifications:mark_all_read', { userId: req.user.sub, type: req.body.type, updated });
      res.status(200).json({ success: true, data: { updated } });
    } catch (error) {
      logger.error('audit:notifications:mark_all_read:error', { userId: req.user.sub, type: req.body.type, error: error.message });
      res.status(500).json({ success: false, message: '批量标记已读失败', error: error.message });
    }
  }
);

// 删除通知 - 需要认证（写接口：严格限流）
router.delete('/:id', authenticateToken, strictRateLimiter, async (req, res) => {
  try {
    const success = await NotificationController.deleteNotification(req.params.id, req.user.sub);
    logger.info('audit:notifications:delete', { userId: req.user.sub, notificationId: req.params.id, success });
    res.status(200).json({ success, message: success ? '删除成功' : '删除失败' });
  } catch (error) {
    logger.error('audit:notifications:delete:error', { userId: req.user.sub, notificationId: req.params.id, error: error.message });
    res.status(500).json({ success: false, message: '删除通知失败', error: error.message });
  }
});

// 创建通知 - 需要认证（管理员功能）（写接口：严格限流）
router.post(
  '/',
  authenticateToken,
  strictRateLimiter,
  notificationValidationRules.create,
  handleValidationErrors,
  async (req, res) => {
    try {
      const notification = await NotificationController.createNotification({
        user_id: req.body.user_id,
        title: req.body.title,
        content: req.body.content,
        type: req.body.type,
        related_id: req.body.related_id
      });
      logger.info('audit:notifications:create', { adminUserId: req.user.sub, targetUserId: req.body.user_id, type: req.body.type, notificationId: notification.id });
      res.status(201).json({ success: true, data: notification });
    } catch (error) {
      logger.error('audit:notifications:create:error', { adminUserId: req.user.sub, targetUserId: req.body.user_id, error: error.message });
      res.status(500).json({ success: false, message: '创建通知失败', error: error.message });
    }
  }
);

// 获取账单到期提醒 - 需要认证（读接口：宽松限流）
router.get('/bill-due-reminders', authenticateToken, looseRateLimiter, async (req, res) => {
  try {
    const reminders = await NotificationController.getBillDueReminders(req.user.sub);
    logger.info('audit:notifications:bill_due_reminders', { userId: req.user.sub, count: Array.isArray(reminders) ? reminders.length : undefined });
    res.status(200).json({ success: true, data: reminders });
  } catch (error) {
    logger.error('audit:notifications:bill_due_reminders:error', { userId: req.user.sub, error: error.message });
    res.status(500).json({ success: false, message: '获取账单到期提醒失败', error: error.message });
  }
});

// 获取支付状态变更通知 - 需要认证（读接口：宽松限流）
router.get('/payment-status-changes', authenticateToken, looseRateLimiter, async (req, res) => {
  try {
    const notifications = await NotificationController.getPaymentStatusNotifications(req.user.sub);
    logger.info('audit:notifications:payment_status_changes', { userId: req.user.sub, count: Array.isArray(notifications) ? notifications.length : undefined });
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    logger.error('audit:notifications:payment_status_changes:error', { userId: req.user.sub, error: error.message });
    res.status(500).json({ success: false, message: '获取支付状态变更通知失败', error: error.message });
  }
});

// WebSocket 订阅管理占位端点（HTTP占位，实际订阅通过WS消息）
router.post('/subscriptions/subscribe', authenticateToken, strictRateLimiter, async (req, res) => {
  try {
    const { events = [] } = req.body || {};
    logger.info('audit:websocket:subscribe', { userId: req.user.sub, events });
    // 占位：返回确认，指引客户端使用WS消息 { type: 'subscribe', events }
    res.status(200).json({ success: true, message: '订阅请求已记录，请在WebSocket连接中发送订阅消息', data: { events } });
  } catch (error) {
    logger.error('audit:websocket:subscribe:error', { userId: req.user.sub, error: error.message });
    res.status(500).json({ success: false, message: '订阅管理失败', error: error.message });
  }
});

router.post('/subscriptions/unsubscribe', authenticateToken, strictRateLimiter, async (req, res) => {
  try {
    const { events = [] } = req.body || {};
    logger.info('audit:websocket:unsubscribe', { userId: req.user.sub, events });
    res.status(200).json({ success: true, message: '取消订阅请求已记录，请在WebSocket连接中发送取消订阅消息', data: { events } });
  } catch (error) {
    logger.error('audit:websocket:unsubscribe:error', { userId: req.user.sub, error: error.message });
    res.status(500).json({ success: false, message: '取消订阅失败', error: error.message });
  }
});

module.exports = router;