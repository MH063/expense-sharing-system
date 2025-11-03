const { pool } = require('../config/db');
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
    new winston.transports.File({ filename: 'logs/notification-controller.log' })
  ]
});

/**
 * 通知控制器
 */
class NotificationController {
  constructor() {
    this.logger = logger;
  }

  /**
   * 创建通知
   * @param {Object} notificationData - 通知数据
   * @param {string} notificationData.user_id - 用户ID
   * @param {string} notificationData.title - 通知标题
   * @param {string} notificationData.content - 通知内容
   * @param {string} notificationData.type - 通知类型 (bill_due, payment_status, system)
   * @param {string} notificationData.related_id - 关联ID (账单ID等)
   * @param {boolean} notificationData.is_read - 是否已读
   * @returns {Promise<Object>} 创建的通知
   */
  static async createNotification(notificationData) {
    try {
      logger.info('创建通知，数据:', notificationData);
      
      const result = await pool.query(
        `INSERT INTO notifications (user_id, title, content, type, related_id, is_read, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *`,
        [
          notificationData.user_id,
          notificationData.title,
          notificationData.content,
          notificationData.type,
          notificationData.related_id || null,
          notificationData.is_read || false
        ]
      );
      
      const notification = result.rows[0];
      logger.info('通知创建成功:', notification.id);
      return notification;
    } catch (error) {
      logger.error('创建通知失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户通知列表
   * @param {string} userId - 用户ID
   * @param {Object} options - 查询选项
   * @param {boolean} options.unreadOnly - 是否只获取未读通知
   * @param {string} options.type - 通知类型过滤
   * @param {number} options.page - 页码
   * @param {number} options.limit - 每页数量
   * @returns {Promise<Object>} 通知列表和总数
   */
  static async getUserNotifications(userId, options = {}) {
    try {
      logger.info('获取用户通知列表，用户ID:', userId, '选项:', options);
      
      const {
        unreadOnly = false,
        type = null,
        page = 1,
        limit = 20
      } = options;
      
      // 构建查询条件
      const conditions = ['user_id = $1'];
      const queryParams = [userId];
      let paramIndex = 2;
      
      if (unreadOnly) {
        conditions.push(`is_read = $${paramIndex++}`);
        queryParams.push(false);
      }
      
      if (type) {
        conditions.push(`type = $${paramIndex++}`);
        queryParams.push(type);
      }
      
      const whereClause = conditions.join(' AND ');
      
      // 计算偏移量
      const offset = (page - 1) * limit;
      
      // 查询通知
      const notificationsQuery = `
        SELECT * FROM notifications
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      
      queryParams.push(limit, offset);
      
      const notificationsResult = await pool.query(notificationsQuery, queryParams);
      const notifications = notificationsResult.rows;
      
      // 查询总数
      const countQuery = `SELECT COUNT(*) FROM notifications WHERE ${whereClause}`;
      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].count);
      
      logger.info(`找到 ${total} 条通知，返回第 ${page} 页，每页 ${limit} 条`);
      
      return {
        notifications,
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      logger.error('获取用户通知列表失败:', error);
      throw error;
    }
  }

  /**
   * 标记通知为已读
   * @param {string} notificationId - 通知ID
   * @param {string} userId - 用户ID (用于验证权限)
   * @returns {Promise<boolean>} 是否成功
   */
  static async markNotificationAsRead(notificationId, userId) {
    try {
      logger.info('标记通知为已读，通知ID:', notificationId, '用户ID:', userId);
      
      const result = await pool.query(
        `UPDATE notifications 
         SET is_read = true, updated_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [notificationId, userId]
      );
      
      const success = result.rowCount > 0;
      logger.info(`标记通知为已读${success ? '成功' : '失败'}，影响行数:`, result.rowCount);
      
      return success;
    } catch (error) {
      logger.error('标记通知为已读失败:', error);
      throw error;
    }
  }

  /**
   * 标记所有通知为已读
   * @param {string} userId - 用户ID
   * @param {string} type - 通知类型 (可选)
   * @returns {Promise<number>} 更新的通知数量
   */
  static async markAllNotificationsAsRead(userId, type = null) {
    try {
      logger.info('标记所有通知为已读，用户ID:', userId, '类型:', type);
      
      const conditions = ['user_id = $1', 'is_read = false'];
      const queryParams = [userId];
      let paramIndex = 2;
      
      if (type) {
        conditions.push(`type = $${paramIndex++}`);
        queryParams.push(type);
      }
      
      const whereClause = conditions.join(' AND ');
      
      const result = await pool.query(
        `UPDATE notifications 
         SET is_read = true, updated_at = NOW()
         WHERE ${whereClause}`,
        queryParams
      );
      
      const updatedRowsCount = result.rowCount;
      logger.info(`标记 ${updatedRowsCount} 条通知为已读`);
      
      return updatedRowsCount;
    } catch (error) {
      logger.error('标记所有通知为已读失败:', error);
      throw error;
    }
  }

  /**
   * 删除通知
   * @param {string} notificationId - 通知ID
   * @param {string} userId - 用户ID (用于验证权限)
   * @returns {Promise<boolean>} 是否成功
   */
  static async deleteNotification(notificationId, userId) {
    try {
      logger.info('删除通知，通知ID:', notificationId, '用户ID:', userId);
      
      const result = await pool.query(
        'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
        [notificationId, userId]
      );
      
      const success = result.rowCount > 0;
      logger.info(`删除通知${success ? '成功' : '失败'}，影响行数:`, result.rowCount);
      
      return success;
    } catch (error) {
      logger.error('删除通知失败:', error);
      throw error;
    }
  }

  /**
   * 获取未读通知数量
   * @param {string} userId - 用户ID
   * @param {string} type - 通知类型 (可选)
   * @returns {Promise<number>} 未读通知数量
   */
  static async getUnreadNotificationCount(userId, type = null) {
    try {
      logger.info('获取未读通知数量，用户ID:', userId, '类型:', type);
      
      const conditions = ['user_id = $1', 'is_read = false'];
      const queryParams = [userId];
      let paramIndex = 2;
      
      if (type) {
        conditions.push(`type = $${paramIndex++}`);
        queryParams.push(type);
      }
      
      const whereClause = conditions.join(' AND ');
      
      const result = await pool.query(
        `SELECT COUNT(*) FROM notifications WHERE ${whereClause}`,
        queryParams
      );
      
      const count = parseInt(result.rows[0].count);
      logger.info(`找到 ${count} 条未读通知`);
      
      return count;
    } catch (error) {
      logger.error('获取未读通知数量失败:', error);
      throw error;
    }
  }

  /**
   * 创建账单到期提醒通知
   * @param {Object} billData - 账单数据
   * @param {number} daysUntilDue - 距离到期天数
   * @returns {Promise<Array>} 创建的通知列表
   */
  static async createBillDueNotifications(billData, daysUntilDue) {
    try {
      logger.info('创建账单到期提醒通知，账单ID:', billData.id, '距离到期天数:', daysUntilDue);
      
      const notifications = [];
      
      // 获取账单分摊信息，找出需要支付的用户
      const billSplitsResult = await pool.query(
        `SELECT bs.*, u.username, u.email
         FROM bill_splits bs
         JOIN users u ON bs.user_id = u.id
         WHERE bs.bill_id = $1`,
        [billData.id]
      );
      
      const billSplits = billSplitsResult.rows;
      
      // 为每个需要支付的用户创建通知
      for (const split of billSplits) {
        if (parseFloat(split.amount) > 0) { // 只为需要支付的用户创建通知
          const title = daysUntilDue <= 0 
            ? '账单已逾期' 
            : daysUntilDue <= 3 
              ? '账单即将到期' 
              : '账单到期提醒';
          
          let content = `您有一笔账单${title}：${billData.description}，金额：¥${split.amount}`;
          
          if (daysUntilDue <= 0) {
            content += `，已逾期${Math.abs(daysUntilDue)}天，请尽快支付`;
          } else if (daysUntilDue <= 3) {
            content += `，将在${daysUntilDue}天后到期，请及时支付`;
          } else {
            content += `，将在${daysUntilDue}天后到期`;
          }
          
          const notification = await this.createNotification({
            user_id: split.user_id,
            title,
            content,
            type: 'bill_due',
            related_id: billData.id
          });
          
          notifications.push(notification);
        }
      }
      
      logger.info(`创建了 ${notifications.length} 条账单到期提醒通知`);
      
      return notifications;
    } catch (error) {
      logger.error('创建账单到期提醒通知失败:', error);
      throw error;
    }
  }

  /**
   * 创建支付状态变更通知
   * @param {Object} paymentData - 支付数据
   * @param {string} status - 新状态
   * @returns {Promise<Array>} 创建的通知列表
   */
  static async createPaymentStatusNotifications(paymentData, status) {
    try {
      logger.info('创建支付状态变更通知，支付ID:', paymentData.id, '状态:', status);
      
      const notifications = [];
      
      // 获取账单信息
      const billResult = await pool.query(
        `SELECT b.*, u.username as creator_username, u.email as creator_email
         FROM bills b
         JOIN users u ON b.creator_id = u.id
         WHERE b.id = $1`,
        [paymentData.bill_id]
      );
      
      if (billResult.rows.length === 0) {
        logger.error('未找到账单信息');
        return notifications;
      }
      
      const bill = billResult.rows[0];
      
      // 获取账单分摊信息
      const billSplitsResult = await pool.query(
        `SELECT bs.*, u.username, u.email
         FROM bill_splits bs
         JOIN users u ON bs.user_id = u.id
         WHERE bs.bill_id = $1`,
        [bill.id]
      );
      
      const billSplits = billSplitsResult.rows;
      
      // 根据状态创建不同的通知
      let title, content;
      
      switch (status) {
        case 'paid':
          title = '账单已支付';
          content = `账单"${bill.description}"已由${paymentData.payer_username}支付，金额：¥${paymentData.amount}`;
          break;
        case 'partial':
          title = '账单部分支付';
          content = `账单"${bill.description}"已由${paymentData.payer_username}部分支付，金额：¥${paymentData.amount}`;
          break;
        case 'overdue':
          title = '账单已逾期';
          content = `账单"${bill.description}"已逾期，请尽快处理`;
          break;
        default:
          title = '账单状态更新';
          content = `账单"${bill.description}"状态已更新为${status}`;
      }
      
      // 为账单创建者和所有分摊用户创建通知
      const userIds = new Set();
      userIds.add(bill.creator_id); // 添加创建者
      
      billSplits.forEach(split => {
        userIds.add(split.user_id); // 添加分摊用户
      });
      
      for (const userId of userIds) {
        const notification = await this.createNotification({
          user_id: userId,
          title,
          content,
          type: 'payment_status',
          related_id: bill.id
        });
        
        notifications.push(notification);
      }
      
      logger.info(`创建了 ${notifications.length} 条支付状态变更通知`);
      
      return notifications;
    } catch (error) {
      logger.error('创建支付状态变更通知失败:', error);
      throw error;
    }
  }

  /**
   * 检查并发送即将到期的账单提醒
   * @param {number} days - 提前天数 (默认3天)
   * @returns {Promise<number>} 发送的通知数量
   */
  static async checkAndSendDueBillNotifications(days = 3) {
    try {
      logger.info(`检查并发送即将到期的账单提醒，提前天数: ${days}`);
      
      // 计算目标日期
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      const targetDateStr = targetDate.toISOString().split('T')[0];
      
      // 查找即将到期的账单
      const dueBillsResult = await pool.query(
        `SELECT * FROM bills WHERE due_date = $1 AND status != 'PAID'`,
        [targetDateStr]
      );
      
      const dueBills = dueBillsResult.rows;
      
      let totalNotifications = 0;
      
      // 为每个即将到期的账单创建通知
      for (const bill of dueBills) {
        const notifications = await this.createBillDueNotifications(bill, days);
        totalNotifications += notifications.length;
      }
      
      console.log(`检查完成，发送了 ${totalNotifications} 条账单到期提醒通知`);
      
      return totalNotifications;
    } catch (error) {
      console.error('检查并发送即将到期的账单提醒失败:', error);
      throw error;
    }
  }

  /**
   * 检查并发送逾期账单提醒
   * @returns {Promise<number>} 发送的通知数量
   */
  static async checkAndSendOverdueBillNotifications() {
    try {
      console.log('检查并发送逾期账单提醒');
      
      // 查找已逾期的账单
      const today = new Date().toISOString().split('T')[0];
      
      const overdueBillsResult = await pool.query(
        `SELECT * FROM bills WHERE due_date < $1 AND status NOT IN ('paid', 'cancelled')`,
        [today]
      );
      
      const overdueBills = overdueBillsResult.rows;
      
      let totalNotifications = 0;
      
      // 为每个逾期账单创建通知
      for (const bill of overdueBills) {
        // 计算逾期天数
        const dueDate = new Date(bill.due_date);
        const todayDate = new Date();
        const diffTime = Math.abs(todayDate - dueDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const notifications = await this.createBillDueNotifications(bill, -diffDays);
        totalNotifications += notifications.length;
      }
      
      console.log(`检查完成，发送了 ${totalNotifications} 条逾期账单提醒通知`);
      
      return totalNotifications;
    } catch (error) {
      console.error('检查并发送逾期账单提醒失败:', error);
      throw error;
    }
  }
}

module.exports = NotificationController;