/**
 * 通知路由
 * 定义通知相关的API端点
 */

const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notification-controller');
const { authenticateToken } = require('../middleware/tokenManager');

// 获取用户通知列表
router.get('/', authenticateToken, (req, res) => NotificationController.getUserNotifications(req.user.id, req.query).then(result => {
  res.status(200).json({
    success: true,
    data: result.notifications,
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages
    }
  });
}).catch(error => {
  console.error('获取用户通知列表失败:', error);
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
}));

// 获取未读通知数量
router.get('/unread-count', authenticateToken, (req, res) => NotificationController.getUnreadNotificationsCount(req.user.id).then(count => {
  res.status(200).json({
    success: true,
    data: { count }
  });
}).catch(error => {
  console.error('获取未读通知数量失败:', error);
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
}));

// 标记通知为已读
router.patch('/:id/read', authenticateToken, (req, res) => NotificationController.markNotificationAsRead(req.params.id, req.user.id).then(success => {
  if (success) {
    res.status(200).json({
      success: true,
      message: '通知已标记为已读'
    });
  } else {
    res.status(404).json({
      success: false,
      message: '通知不存在或无权限'
    });
  }
}).catch(error => {
  console.error('标记通知为已读失败:', error);
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
}));

// 批量标记通知为已读
router.patch('/mark-all-read', authenticateToken, (req, res) => NotificationController.markAllNotificationsAsRead(req.user.id, req.body.type).then(count => {
  res.status(200).json({
    success: true,
    data: { updatedCount: count },
    message: `已标记 ${count} 条通知为已读`
  });
}).catch(error => {
  console.error('批量标记通知为已读失败:', error);
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
}));

// 删除通知
router.delete('/:id', authenticateToken, (req, res) => NotificationController.deleteNotification(req.params.id, req.user.id).then(success => {
  if (success) {
    res.status(200).json({
      success: true,
      message: '通知已删除'
    });
  } else {
    res.status(404).json({
      success: false,
      message: '通知不存在或无权限'
    });
  }
}).catch(error => {
  console.error('删除通知失败:', error);
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
}));

// 创建通知
router.post('/', authenticateToken, (req, res) => NotificationController.createNotification({
  ...req.body,
  user_id: req.user.id
}).then(notification => {
  res.status(201).json({
    success: true,
    data: notification,
    message: '通知创建成功'
  });
}).catch(error => {
  console.error('创建通知失败:', error);
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
}));

// 获取账单到期提醒
router.get('/bill-due-reminders', authenticateToken, (req, res) => NotificationController.getBillDueReminders(req.user.id).then(reminders => {
  res.status(200).json({
    success: true,
    data: reminders
  });
}).catch(error => {
  console.error('获取账单到期提醒失败:', error);
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
}));

// 获取支付状态变更通知
router.get('/payment-status-notifications', authenticateToken, (req, res) => NotificationController.getPaymentStatusNotifications(req.user.id).then(notifications => {
  res.status(200).json({
    success: true,
    data: notifications
  });
}).catch(error => {
  console.error('获取支付状态变更通知失败:', error);
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
}));

module.exports = router;