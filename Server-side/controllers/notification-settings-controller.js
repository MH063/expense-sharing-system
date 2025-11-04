/**
 * 通知设置控制器
 * 处理用户通知设置相关的请求
 */

const NotificationSettingsService = require('../services/database/notification-settings-service');
const winston = require('winston');

// 创建日志记录器
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/notification-settings-controller.log' })
  ]
});

/**
 * 通知设置控制器
 */
class NotificationSettingsController {
  constructor() {
    this.notificationSettingsService = new NotificationSettingsService();
    this.logger = logger;
  }

  /**
   * 获取用户通知设置
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 用户通知设置
   */
  async getUserNotificationSettings(userId) {
    try {
      logger.info(`获取用户通知设置，用户ID: ${userId}`);
      
      const settings = await this.notificationSettingsService.getFormattedUserNotificationSettings(userId);
      
      logger.info(`获取用户通知设置成功，用户ID: ${userId}`);
      return settings;
    } catch (error) {
      logger.error(`获取用户通知设置失败，用户ID: ${userId}`, error);
      throw error;
    }
  }

  /**
   * 更新用户通知设置
   * @param {string} userId - 用户ID
   * @param {Object} settings - 通知设置
   * @returns {Promise<Object>} 更新后的通知设置
   */
  async updateUserNotificationSettings(userId, settings) {
    try {
      logger.info(`更新用户通知设置，用户ID: ${userId}, 设置:`, settings);
      
      const updatedSettings = await this.notificationSettingsService.updateUserNotificationSettings(userId, settings);
      
      logger.info(`更新用户通知设置成功，用户ID: ${userId}`);
      return updatedSettings;
    } catch (error) {
      logger.error(`更新用户通知设置失败，用户ID: ${userId}`, error);
      throw error;
    }
  }

  /**
   * 检查用户是否启用了特定类型的通知
   * @param {string} userId - 用户ID
   * @param {string} notificationType - 通知类型
   * @param {string} eventType - 事件类型
   * @returns {Promise<boolean>} 是否启用
   */
  async checkNotificationEnabled(userId, notificationType, eventType) {
    try {
      logger.info(`检查通知是否启用，用户ID: ${userId}, 通知类型: ${notificationType}, 事件类型: ${eventType}`);
      
      const isEnabled = await this.notificationSettingsService.isNotificationEnabled(userId, notificationType, eventType);
      
      logger.info(`检查通知是否启用完成，用户ID: ${userId}, 结果: ${isEnabled}`);
      return isEnabled;
    } catch (error) {
      logger.error(`检查通知是否启用失败，用户ID: ${userId}`, error);
      throw error;
    }
  }
}

module.exports = NotificationSettingsController;