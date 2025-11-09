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
const { roleAwareRateLimiter } = require('../middleware/rateLimiter');
const { logger } = require('../config/logger');

// 获取通知列表 - 需要认证（读接口：宽松限流）
router.get('/', authenticateToken, roleAwareRateLimiter('loose'), async (req, res) => {
  const { page = 1, limit = 20, unreadOnly, type } = req.query;
  try {
    const result = await NotificationController.getUserNotifications(req.user.sub, {
      unreadOnly: unreadOnly === 'true',
      type: type || null,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    logger.info('audit:notifications:list', { userId: req.user.sub, page, limit, unreadOnly, type });
    res.success(200, '获取通知列表成功', result);
  } catch (error) {
    logger.error('audit:notifications:list:error', { userId: req.user.sub, error: error.message });
    res.error(500, '获取通知失败', error.message);
  }
});

// 获取未读通知数量 - 需要认证（读接口：宽松限流）
router.get('/unread-count', authenticateToken, roleAwareRateLimiter('loose'), async (req, res) => {
  try {
    const count = await NotificationController.getUnreadNotificationsCount(req.user.sub);
    logger.info('audit:notifications:unread_count', { userId: req.user.sub, count });
    res.success(200, '获取未读通知数量成功', { count });
  } catch (error) {
    logger.error('audit:notifications:unread_count:error', { userId: req.user.sub, error: error.message });
    res.error(500, '获取未读通知数量失败', error.message);
  }
});

// 标记通知为已读 - 需要认证（写接口：严格限流）
router.put(
  '/:id/read',
  authenticateToken,
  roleAwareRateLimiter('strict'),
  async (req, res) => {
    try {
      const success = await NotificationController.markNotificationAsRead(req.params.id, req.user.sub);
      logger.info('audit:notifications:mark_read', { userId: req.user.sub, notificationId: req.params.id, success });
      res.success(200, success ? '标记成功' : '标记失败', { success });
    } catch (error) {
      logger.error('audit:notifications:mark_read:error', { userId: req.user.sub, notificationId: req.params.id, error: error.message });
      res.error(500, '标记通知为已读失败', error.message);
    }
  }
);

// 批量标记通知为已读 - 需要认证（写接口：严格限流）
router.put(
  '/mark-all-read',
  authenticateToken,
  roleAwareRateLimiter('strict'),
  notificationValidationRules.markAllRead,
  handleValidationErrors,
  async (req, res) => {
    try {
      const updated = await NotificationController.markAllNotificationsAsRead(req.user.sub, req.body.type);
      logger.info('audit:notifications:mark_all_read', { userId: req.user.sub, type: req.body.type, updated });
      res.success(200, '批量标记已读成功', { updated });
    } catch (error) {
      logger.error('audit:notifications:mark_all_read:error', { userId: req.user.sub, type: req.body.type, error: error.message });
      res.error(500, '批量标记已读失败', error.message);
    }
  }
);

// 删除通知 - 需要认证（写接口：严格限流）
router.delete('/:id', authenticateToken, roleAwareRateLimiter('strict'), async (req, res) => {
  try {
    const success = await NotificationController.deleteNotification(req.params.id, req.user.sub);
    logger.info('audit:notifications:delete', { userId: req.user.sub, notificationId: req.params.id, success });
    res.success(200, success ? '删除成功' : '删除失败', { success });
  } catch (error) {
    logger.error('audit:notifications:delete:error', { userId: req.user.sub, notificationId: req.params.id, error: error.message });
    res.error(500, '删除通知失败', error.message);
  }
});

// 创建通知 - 需要认证（管理员功能）（写接口：严格限流）
router.post(
  '/',
  authenticateToken,
  roleAwareRateLimiter('strict'),
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
      res.success(201, '创建通知成功', notification);
    } catch (error) {
      logger.error('audit:notifications:create:error', { adminUserId: req.user.sub, targetUserId: req.body.user_id, error: error.message });
      res.error(500, '创建通知失败', error.message);
    }
  }
);

// 获取账单到期提醒 - 需要认证（读接口：宽松限流）
router.get('/bill-due-reminders', authenticateToken, roleAwareRateLimiter('loose'), async (req, res) => {
  try {
    const reminders = await NotificationController.getBillDueReminders(req.user.sub);
    logger.info('audit:notifications:bill_due_reminders', { userId: req.user.sub, count: Array.isArray(reminders) ? reminders.length : undefined });
    res.success(200, '获取账单到期提醒成功', reminders);
  } catch (error) {
    logger.error('audit:notifications:bill_due_reminders:error', { userId: req.user.sub, error: error.message });
    res.error(500, '获取账单到期提醒失败', error.message);
  }
});

// 获取支付状态变更通知 - 需要认证（读接口：宽松限流）
router.get('/payment-status-changes', authenticateToken, roleAwareRateLimiter('loose'), async (req, res) => {
  try {
    const notifications = await NotificationController.getPaymentStatusNotifications(req.user.sub);
    logger.info('audit:notifications:payment_status_changes', { userId: req.user.sub, count: Array.isArray(notifications) ? notifications.length : undefined });
    res.success(200, '获取支付状态变更通知成功', notifications);
  } catch (error) {
    logger.error('audit:notifications:payment_status_changes:error', { userId: req.user.sub, error: error.message });
    res.error(500, '获取支付状态变更通知失败', error.message);
  }
});

// WebSocket 订阅管理占位端点（HTTP占位，实际订阅通过WS消息）
router.post('/subscriptions/subscribe', authenticateToken, roleAwareRateLimiter('strict'), async (req, res) => {
  try {
    const { events = [] } = req.body || {};
    logger.info('audit:websocket:subscribe', { userId: req.user.sub, events });
    // 占位：返回确认，指引客户端使用WS消息 { type: 'subscribe', events }
    res.success(200, '订阅请求已记录，请在WebSocket连接中发送订阅消息', { events });
  } catch (error) {
    logger.error('audit:websocket:subscribe:error', { userId: req.user.sub, error: error.message });
    res.error(500, '订阅管理失败', error.message);
  }
});

router.post('/subscriptions/unsubscribe', authenticateToken, roleAwareRateLimiter('strict'), async (req, res) => {
  try {
    const { events = [] } = req.body || {};
    logger.info('audit:websocket:unsubscribe', { userId: req.user.sub, events });
    res.success(200, '取消订阅请求已记录，请在WebSocket连接中发送取消订阅消息', { events });
  } catch (error) {
    logger.error('audit:websocket:unsubscribe:error', { userId: req.user.sub, error: error.message });
    res.error(500, '取消订阅失败', error.message);
  }
});

module.exports = router;