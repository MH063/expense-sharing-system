/**
 * 通知路由
 * 定义通知相关的API端点
 */

const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification-controller');
const authMiddleware = require('../middleware/auth-middleware');

// 获取用户通知列表
router.get('/', authMiddleware, notificationController.getUserNotifications);

// 获取未读通知数量
router.get('/unread-count', authMiddleware, notificationController.getUnreadNotificationsCount);

// 标记通知为已读
router.patch('/:id/read', authMiddleware, notificationController.markNotificationAsRead);

// 批量标记通知为已读
router.patch('/mark-all-read', authMiddleware, notificationController.markAllNotificationsAsRead);

// 删除通知
router.delete('/:id', authMiddleware, notificationController.deleteNotification);

// 创建通知
router.post('/', authMiddleware, notificationController.createNotification);

// 获取账单到期提醒
router.get('/bill-due-reminders', authMiddleware, notificationController.getBillDueReminders);

// 获取支付状态变更通知
router.get('/payment-status-notifications', authMiddleware, notificationController.getPaymentStatusNotifications);

module.exports = router;