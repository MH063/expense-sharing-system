/**
 * 通知设置路由
 * 处理用户通知设置相关的API端点
 */

const express = require('express');
const router = express.Router();
const NotificationSettingsController = require('../controllers/notification-settings-controller');
const { authenticateToken } = require('../middleware/tokenManager');

// 创建通知设置控制器实例
const notificationSettingsController = new NotificationSettingsController();

/**
 * 获取用户通知设置
 * GET /api/notification-settings
 * 需要身份验证
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.sub;

    const settings = await notificationSettingsController.getUserNotificationSettings(userId);

    res.success(200, '获取通知设置成功', settings);
  } catch (error) {
    console.error('获取通知设置失败:', error);
    res.error(500, '获取通知设置失败', process.env.NODE_ENV === 'development' ? error.message : undefined);
  }
});

/**
 * 更新用户通知设置
 * PUT /api/notification-settings
 * 需要身份验证
 */
router.put('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const settings = req.body;
    
    // 验证请求数据
    if (!settings || typeof settings !== 'object') {
      return res.error(400, '无效的请求数据');
    }
    
    const updatedSettings = await notificationSettingsController.updateUserNotificationSettings(userId, settings);
    
    res.success(200, '通知设置更新成功', updatedSettings);
  } catch (error) {
    console.error('更新通知设置失败:', error);
    res.error(500, '更新通知设置失败', process.env.NODE_ENV === 'development' ? error.message : undefined);
  }
});

/**
 * 检查用户是否启用了特定类型的通知
 * GET /api/notification-settings/check
 * 需要身份验证
 * 查询参数: notificationType, eventType
 */
router.get('/check', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { notificationType, eventType } = req.query;
    
    if (!notificationType || !eventType) {
      return res.error(400, '缺少必要的查询参数: notificationType 和 eventType');
    }
    
    const isEnabled = await notificationSettingsController.checkNotificationEnabled(userId, notificationType, eventType);
    
    res.success(200, '检查通知设置成功', { isEnabled });
  } catch (error) {
    console.error('检查通知设置失败:', error);
    res.error(500, '检查通知设置失败', process.env.NODE_ENV === 'development' ? error.message : undefined);
  }
});

module.exports = router;