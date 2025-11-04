/**
 * 通知设置服务
 * 处理用户通知设置相关的数据库操作
 */

const BaseService = require('./base-service');
const { v4: uuidv4 } = require('uuid');

class NotificationSettingsService extends BaseService {
  constructor() {
    super('notification_configs');
  }

  /**
   * 获取用户通知设置
   * @param {string} userId - 用户ID
   * @returns {Promise<Array>} 用户通知设置列表
   */
  async getUserNotificationSettings(userId) {
    const sql = `SELECT * FROM notification_configs WHERE user_id = $1`;
    const result = await this.query(sql, [userId]);
    return result.rows;
  }

  /**
   * 获取格式化的用户通知设置
   * @param {string} userId - 用户ID
   * @returns {Promise<Object>} 格式化的通知设置对象
   */
  async getFormattedUserNotificationSettings(userId) {
    const settings = await this.getUserNotificationSettings(userId);
    
    // 初始化默认设置
    const formattedSettings = {
      // 通知方式
      browserNotifications: true,
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      
      // 通知类型
      expenseNotifications: true,
      billDueNotifications: true,
      paymentReceivedNotifications: true,
      invitationNotifications: true,
      systemNotifications: true
    };

    // 从数据库设置中更新值
    settings.forEach(setting => {
      const { notification_type, event_type, is_enabled } = setting;
      
      // 根据通知类型和事件类型映射到格式化设置
      if (notification_type === 'email') {
        if (event_type === 'expense_created') formattedSettings.expenseNotifications = is_enabled;
        else if (event_type === 'bill_due') formattedSettings.billDueNotifications = is_enabled;
        else if (event_type === 'payment_received') formattedSettings.paymentReceivedNotifications = is_enabled;
        else if (event_type === 'invitation_sent') formattedSettings.invitationNotifications = is_enabled;
        else if (event_type === 'system_update') formattedSettings.systemNotifications = is_enabled;
        else formattedSettings.emailNotifications = is_enabled;
      } else if (notification_type === 'sms') {
        formattedSettings.smsNotifications = is_enabled;
      } else if (notification_type === 'push') {
        formattedSettings.pushNotifications = is_enabled;
      } else if (notification_type === 'in_app') {
        formattedSettings.browserNotifications = is_enabled;
      }
    });

    return formattedSettings;
  }

  /**
   * 更新用户通知设置
   * @param {string} userId - 用户ID
   * @param {Object} settings - 通知设置
   * @returns {Promise<Array>} 更新后的设置列表
   */
  async updateUserNotificationSettings(userId, settings) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 删除现有设置
      await client.query('DELETE FROM notification_configs WHERE user_id = $1', [userId]);
      
      // 插入新设置
      const newSettings = [];
      
      // 通知方式设置
      if (settings.browserNotifications !== undefined) {
        newSettings.push({
          id: uuidv4(),
          userId,
          notificationType: 'in_app',
          eventType: 'general',
          isEnabled: settings.browserNotifications
        });
      }
      
      if (settings.emailNotifications !== undefined) {
        newSettings.push({
          id: uuidv4(),
          userId,
          notificationType: 'email',
          eventType: 'general',
          isEnabled: settings.emailNotifications
        });
      }
      
      if (settings.smsNotifications !== undefined) {
        newSettings.push({
          id: uuidv4(),
          userId,
          notificationType: 'sms',
          eventType: 'general',
          isEnabled: settings.smsNotifications
        });
      }
      
      if (settings.pushNotifications !== undefined) {
        newSettings.push({
          id: uuidv4(),
          userId,
          notificationType: 'push',
          eventType: 'general',
          isEnabled: settings.pushNotifications
        });
      }
      
      // 通知类型设置
      if (settings.expenseNotifications !== undefined) {
        newSettings.push({
          id: uuidv4(),
          userId,
          notificationType: 'email',
          eventType: 'expense_created',
          isEnabled: settings.expenseNotifications
        });
      }
      
      if (settings.billDueNotifications !== undefined) {
        newSettings.push({
          id: uuidv4(),
          userId,
          notificationType: 'email',
          eventType: 'bill_due',
          isEnabled: settings.billDueNotifications
        });
      }
      
      if (settings.paymentReceivedNotifications !== undefined) {
        newSettings.push({
          id: uuidv4(),
          userId,
          notificationType: 'email',
          eventType: 'payment_received',
          isEnabled: settings.paymentReceivedNotifications
        });
      }
      
      if (settings.invitationNotifications !== undefined) {
        newSettings.push({
          id: uuidv4(),
          userId,
          notificationType: 'email',
          eventType: 'invitation_sent',
          isEnabled: settings.invitationNotifications
        });
      }
      
      if (settings.systemNotifications !== undefined) {
        newSettings.push({
          id: uuidv4(),
          userId,
          notificationType: 'email',
          eventType: 'system_update',
          isEnabled: settings.systemNotifications
        });
      }
      
      // 批量插入新设置
      for (const setting of newSettings) {
        await client.query(
          `INSERT INTO notification_configs 
           (id, user_id, notification_type, event_type, is_enabled, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [setting.id, setting.userId, setting.notificationType, setting.eventType, setting.isEnabled]
        );
      }
      
      await client.query('COMMIT');
      
      return await this.getUserNotificationSettings(userId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 检查用户是否启用了特定类型的通知
   * @param {string} userId - 用户ID
   * @param {string} notificationType - 通知类型 (email, sms, push, in_app)
   * @param {string} eventType - 事件类型 (expense_created, bill_due, payment_received, etc.)
   * @returns {Promise<boolean>} 是否启用
   */
  async isNotificationEnabled(userId, notificationType, eventType) {
    const sql = `
      SELECT is_enabled FROM notification_configs 
      WHERE user_id = $1 AND notification_type = $2 AND event_type = $3
    `;
    const result = await this.query(sql, [userId, notificationType, eventType]);
    
    // 如果没有找到设置，默认返回true
    if (result.rows.length === 0) {
      return true;
    }
    
    return result.rows[0].is_enabled;
  }
}

module.exports = NotificationSettingsService;