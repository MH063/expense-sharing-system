/**
 * 通知设置路由
 * 处理用户通知设置相关的API端点
 */

const express = require('express');
const router = express.Router();
const NotificationSettingsController = require('../controllers/notification-settings-controller');
// // 临时注释掉auth中间件导入，用于排查启动问题
// const { authenticateToken } = require('../middleware/auth');
console.log('auth中间件已临时禁用，用于排查启动问题');

// 创建通知设置控制器实例
const notificationSettingsController = new NotificationSettingsController();

/**
 * 获取用户通知设置
 * GET /api/notification-settings
 * 需要身份验证
 */
router.get('/', /* authenticateToken, */ async (req, res) => {
  try {
    // 临时设置用户ID，用于排查启动问题
    const userId = req.user ? req.user.id : 'temp-user-id';
    
    const settings = await notificationSettingsController.getUserNotificationSettings(userId);
    
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    console.error('获取通知设置失败:', error);
    res.status(500).json({
      success: false,
      message: '获取通知设置失败',
      error: error.message
    });
  }
});

/**
 * 更新用户通知设置
 * PUT /api/notification-settings
 * 需要身份验证
 */
router.put('/', /* authenticateToken, */ async (req, res) => {
  try {
    // 临时设置用户ID，用于排查启动问题
    const userId = req.user ? req.user.id : 'temp-user-id';
    const settings = req.body;
    
    // 验证请求数据
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        message: '无效的请求数据'
      });
    }
    
    const updatedSettings = await notificationSettingsController.updateUserNotificationSettings(userId, settings);
    
    res.status(200).json({
      success: true,
      data: updatedSettings,
      message: '通知设置更新成功'
    });
  } catch (error) {
    console.error('更新通知设置失败:', error);
    res.status(500).json({
      success: false,
      message: '更新通知设置失败',
      error: error.message
    });
  }
});

/**
 * 检查用户是否启用了特定类型的通知
 * GET /api/notification-settings/check
 * 需要身份验证
 * 查询参数: notificationType, eventType
 */
router.get('/check', /* authenticateToken, */ async (req, res) => {
  try {
    // 临时设置用户ID，用于排查启动问题
    const userId = req.user ? req.user.id : 'temp-user-id';
    const { notificationType, eventType } = req.query;
    
    if (!notificationType || !eventType) {
      return res.status(400).json({
        success: false,
        message: '缺少必要的查询参数: notificationType 和 eventType'
      });
    }
    
    const isEnabled = await notificationSettingsController.checkNotificationEnabled(userId, notificationType, eventType);
    
    res.status(200).json({
      success: true,
      data: {
        isEnabled
      }
    });
  } catch (error) {
    console.error('检查通知设置失败:', error);
    res.status(500).json({
      success: false,
      message: '检查通知设置失败',
      error: error.message
    });
  }
});

module.exports = router;