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
  static async getUnreadNotificationsCount(userId, type = null) {
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

  /**
   * 获取账单到期提醒
   * @param {string} userId - 用户ID
   * @returns {Promise<Array>} 账单到期提醒列表
   */
  static async getBillDueReminders(userId) {
    try {
      logger.info('获取账单到期提醒，用户ID:', userId);
      
      // 查询用户相关的账单到期提醒
      const result = await pool.query(
        `SELECT n.*, b.description as bill_description, b.amount as bill_amount, b.due_date
         FROM notifications n
         JOIN bills b ON n.related_id = b.id
         WHERE n.user_id = $1 AND n.type = 'bill_due' AND n.is_read = false
         ORDER BY b.due_date ASC`,
        [userId]
      );
      
      const reminders = result.rows;
      logger.info(`找到 ${reminders.length} 条账单到期提醒`);
      
      return reminders;
    } catch (error) {
      logger.error('获取账单到期提醒失败:', error);
      throw error;
    }
  }

  /**
   * 获取支付状态变更通知
   * @param {string} userId - 用户ID
   * @returns {Promise<Array>} 支付状态变更通知列表
   */
  static async getPaymentStatusNotifications(userId) {
    try {
      logger.info('获取支付状态变更通知，用户ID:', userId);
      
      // 查询用户相关的支付状态变更通知
      const result = await pool.query(
        `SELECT n.*, b.description as bill_description, b.amount as bill_amount
         FROM notifications n
         JOIN bills b ON n.related_id = b.id
         WHERE n.user_id = $1 AND n.type = 'payment_status' AND n.is_read = false
         ORDER BY n.created_at DESC`,
        [userId]
      );
      
      const notifications = result.rows;
      logger.info(`找到 ${notifications.length} 条支付状态变更通知`);
      
      return notifications;
    } catch (error) {
      logger.error('获取支付状态变更通知失败:', error);
      throw error;
    }
  }

  /**
   * 管理员 - 获取通知列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async getNotifications(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        type,
        status,
        target_type,
        start_date,
        end_date
      } = req.query;

      const conditions = [];
      const queryParams = [];
      let paramIndex = 1;

      if (type) {
        conditions.push(`type = $${paramIndex++}`);
        queryParams.push(type);
      }

      if (status) {
        conditions.push(`status = $${paramIndex++}`);
        queryParams.push(status);
      }

      if (target_type) {
        conditions.push(`target_type = $${paramIndex++}`);
        queryParams.push(target_type);
      }

      if (start_date) {
        conditions.push(`created_at >= $${paramIndex++}`);
        queryParams.push(start_date);
      }

      if (end_date) {
        conditions.push(`created_at <= $${paramIndex++}`);
        queryParams.push(end_date);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const offset = (page - 1) * limit;

      const notificationsQuery = `
        SELECT * FROM notifications
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      queryParams.push(limit, offset);

      const notificationsResult = await pool.query(notificationsQuery, queryParams);
      const countQuery = `SELECT COUNT(*) FROM notifications ${whereClause}`;
      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));

      const total = parseInt(countResult.rows[0].count);

      return res.success(200, '获取通知列表成功', {
        notifications: notificationsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('获取通知列表失败:', error);
      return res.error(500, '获取通知列表失败', error.message);
    }
  }

  /**
   * 管理员 - 获取通知详情
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async getNotificationById(req, res) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'SELECT * FROM notifications WHERE id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        return res.error(404, '通知不存在');
      }

      return res.success(200, '获取通知详情成功', { notification: result.rows[0] });
    } catch (error) {
      logger.error('获取通知详情失败:', error);
      return res.error(500, '获取通知详情失败', error.message);
    }
  }

  /**
   * 管理员 - 创建通知（路由处理器）
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async createNotificationHandler(req, res) {
    const client = await pool.connect();
    try {
      const {
        title,
        content,
        type,
        target_type,
        target_ids = [],
        priority = 'normal',
        scheduled_at,
        action_url,
        action_text,
        image_url
      } = req.body;

      await client.query('BEGIN');

      // 确定目标用户列表
      let userIds = [];
      if (target_type === 'all') {
        const usersResult = await client.query('SELECT id FROM users WHERE is_active = true');
        userIds = usersResult.rows.map(row => row.id);
      } else if (target_type === 'user') {
        userIds = target_ids;
      } else if (target_type === 'room') {
        const roomMembersResult = await client.query(
          'SELECT DISTINCT user_id FROM room_members WHERE room_id = ANY($1)',
          [target_ids]
        );
        userIds = roomMembersResult.rows.map(row => row.user_id);
      } else if (target_type === 'role') {
        const roleUsersResult = await client.query(
          'SELECT id FROM users WHERE role = ANY($1) AND is_active = true',
          [target_ids]
        );
        userIds = roleUsersResult.rows.map(row => row.id);
      }

      // 批量创建通知
      const notifications = [];
      for (const userId of userIds) {
        const result = await client.query(
          `INSERT INTO notifications (
            user_id, title, content, type, priority, status,
            action_url, action_text, image_url, scheduled_at, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
          RETURNING *`,
          [
            userId, title, content, type, priority,
            scheduled_at ? 'pending' : 'sent',
            action_url, action_text, image_url, scheduled_at
          ]
        );
        notifications.push(result.rows[0]);
      }

      await client.query('COMMIT');

      return res.success(201, '通知创建成功', {
        count: notifications.length,
        notifications: notifications.slice(0, 10) // 只返回前10条作为示例
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('创建通知失败:', error);
      return res.error(500, '创建通知失败', error.message);
    } finally {
      client.release();
    }
  }

  /**
   * 管理员 - 更新通知
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async updateNotification(req, res) {
    try {
      const { id } = req.params;
      const {
        title,
        content,
        type,
        priority,
        scheduled_at,
        action_url,
        action_text,
        image_url
      } = req.body;

      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (title !== undefined) {
        updates.push(`title = $${paramIndex++}`);
        values.push(title);
      }
      if (content !== undefined) {
        updates.push(`content = $${paramIndex++}`);
        values.push(content);
      }
      if (type !== undefined) {
        updates.push(`type = $${paramIndex++}`);
        values.push(type);
      }
      if (priority !== undefined) {
        updates.push(`priority = $${paramIndex++}`);
        values.push(priority);
      }
      if (scheduled_at !== undefined) {
        updates.push(`scheduled_at = $${paramIndex++}`);
        values.push(scheduled_at);
      }
      if (action_url !== undefined) {
        updates.push(`action_url = $${paramIndex++}`);
        values.push(action_url);
      }
      if (action_text !== undefined) {
        updates.push(`action_text = $${paramIndex++}`);
        values.push(action_text);
      }
      if (image_url !== undefined) {
        updates.push(`image_url = $${paramIndex++}`);
        values.push(image_url);
      }

      if (updates.length === 0) {
        return res.error(400, '没有可更新的字段');
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const result = await pool.query(
        `UPDATE notifications SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.error(404, '通知不存在');
      }

      return res.success(200, '通知更新成功', { notification: result.rows[0] });
    } catch (error) {
      logger.error('更新通知失败:', error);
      return res.error(500, '更新通知失败', error.message);
    }
  }

  /**
   * 管理员 - 删除通知
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async deleteNotification(req, res) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'DELETE FROM notifications WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.error(404, '通知不存在');
      }

      return res.success(200, '通知删除成功');
    } catch (error) {
      logger.error('删除通知失败:', error);
      return res.error(500, '删除通知失败', error.message);
    }
  }

  /**
   * 管理员 - 发送通知
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async sendNotification(req, res) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `UPDATE notifications 
         SET status = 'sent', sent_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND status = 'pending'
         RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.error(404, '通知不存在或已发送');
      }

      return res.success(200, '通知发送成功', { notification: result.rows[0] });
    } catch (error) {
      logger.error('发送通知失败:', error);
      return res.error(500, '发送通知失败', error.message);
    }
  }

  /**
   * 管理员 - 取消计划发送的通知
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async cancelNotification(req, res) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        `UPDATE notifications 
         SET status = 'cancelled', updated_at = NOW()
         WHERE id = $1 AND status = 'pending'
         RETURNING *`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.error(404, '通知不存在或无法取消');
      }

      return res.success(200, '通知取消成功', { notification: result.rows[0] });
    } catch (error) {
      logger.error('取消通知失败:', error);
      return res.error(500, '取消通知失败', error.message);
    }
  }

  /**
   * 管理员 - 获取通知模板列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async getNotificationTemplates(req, res) {
    try {
      const { type, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      const conditions = [];
      const queryParams = [];
      let paramIndex = 1;

      if (type) {
        conditions.push(`type = $${paramIndex++}`);
        queryParams.push(type);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const templatesQuery = `
        SELECT * FROM notification_templates
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      queryParams.push(limit, offset);

      const templatesResult = await pool.query(templatesQuery, queryParams);
      const countQuery = `SELECT COUNT(*) FROM notification_templates ${whereClause}`;
      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));

      const total = parseInt(countResult.rows[0].count);

      return res.success(200, '获取通知模板列表成功', {
        templates: templatesResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('获取通知模板列表失败:', error);
      return res.error(500, '获取通知模板列表失败', error.message);
    }
  }

  /**
   * 管理员 - 创建通知模板
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async createNotificationTemplate(req, res) {
    try {
      const {
        name,
        title_template,
        content_template,
        type,
        description,
        variables = []
      } = req.body;

      const result = await pool.query(
        `INSERT INTO notification_templates (
          name, title_template, content_template, type, description, variables, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *`,
        [name, title_template, content_template, type, description, JSON.stringify(variables)]
      );

      return res.success(201, '通知模板创建成功', { template: result.rows[0] });
    } catch (error) {
      logger.error('创建通知模板失败:', error);
      return res.error(500, '创建通知模板失败', error.message);
    }
  }

  /**
   * 管理员 - 更新通知模板
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async updateNotificationTemplate(req, res) {
    try {
      const { id } = req.params;
      const {
        name,
        title_template,
        content_template,
        type,
        description,
        variables
      } = req.body;

      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name);
      }
      if (title_template !== undefined) {
        updates.push(`title_template = $${paramIndex++}`);
        values.push(title_template);
      }
      if (content_template !== undefined) {
        updates.push(`content_template = $${paramIndex++}`);
        values.push(content_template);
      }
      if (type !== undefined) {
        updates.push(`type = $${paramIndex++}`);
        values.push(type);
      }
      if (description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(description);
      }
      if (variables !== undefined) {
        updates.push(`variables = $${paramIndex++}`);
        values.push(JSON.stringify(variables));
      }

      if (updates.length === 0) {
        return res.error(400, '没有可更新的字段');
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const result = await pool.query(
        `UPDATE notification_templates SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.error(404, '通知模板不存在');
      }

      return res.success(200, '通知模板更新成功', { template: result.rows[0] });
    } catch (error) {
      logger.error('更新通知模板失败:', error);
      return res.error(500, '更新通知模板失败', error.message);
    }
  }

  /**
   * 管理员 - 删除通知模板
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async deleteNotificationTemplate(req, res) {
    try {
      const { id } = req.params;

      const result = await pool.query(
        'DELETE FROM notification_templates WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rows.length === 0) {
        return res.error(404, '通知模板不存在');
      }

      return res.success(200, '通知模板删除成功');
    } catch (error) {
      logger.error('删除通知模板失败:', error);
      return res.error(500, '删除通知模板失败', error.message);
    }
  }

  /**
   * 管理员 - 获取通知统计
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async getNotificationStatistics(req, res) {
    try {
      const { start_date, end_date, type } = req.query;

      const conditions = [];
      const queryParams = [];
      let paramIndex = 1;

      if (start_date) {
        conditions.push(`created_at >= $${paramIndex++}`);
        queryParams.push(start_date);
      }

      if (end_date) {
        conditions.push(`created_at <= $${paramIndex++}`);
        queryParams.push(end_date);
      }

      if (type) {
        conditions.push(`type = $${paramIndex++}`);
        queryParams.push(type);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await pool.query(
        `SELECT 
           COUNT(*) as total_count,
           COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_count,
           COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
           COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
           COUNT(CASE WHEN is_read = true THEN 1 END) as read_count,
           COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count
         FROM notifications
         ${whereClause}`,
        queryParams
      );

      return res.success(200, '获取通知统计成功', { statistics: result.rows[0] });
    } catch (error) {
      logger.error('获取通知统计失败:', error);
      return res.error(500, '获取通知统计失败', error.message);
    }
  }

  /**
   * 管理员 - 获取通知发送记录
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async getNotificationDeliveryLogs(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        notification_id,
        status,
        channel,
        start_date,
        end_date
      } = req.query;

      const conditions = [];
      const queryParams = [];
      let paramIndex = 1;

      if (notification_id) {
        conditions.push(`notification_id = $${paramIndex++}`);
        queryParams.push(notification_id);
      }

      if (status) {
        conditions.push(`status = $${paramIndex++}`);
        queryParams.push(status);
      }

      if (channel) {
        conditions.push(`channel = $${paramIndex++}`);
        queryParams.push(channel);
      }

      if (start_date) {
        conditions.push(`created_at >= $${paramIndex++}`);
        queryParams.push(start_date);
      }

      if (end_date) {
        conditions.push(`created_at <= $${paramIndex++}`);
        queryParams.push(end_date);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const offset = (page - 1) * limit;

      const logsQuery = `
        SELECT * FROM notification_delivery_logs
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      queryParams.push(limit, offset);

      const logsResult = await pool.query(logsQuery, queryParams);
      const countQuery = `SELECT COUNT(*) FROM notification_delivery_logs ${whereClause}`;
      const countResult = await pool.query(countQuery, queryParams.slice(0, -2));

      const total = parseInt(countResult.rows[0].count);

      return res.success(200, '获取通知发送记录成功', {
        logs: logsResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      logger.error('获取通知发送记录失败:', error);
      return res.error(500, '获取通知发送记录失败', error.message);
    }
  }

  /**
   * 管理员 - 批量发送通知
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async sendBatchNotifications(req, res) {
    const client = await pool.connect();
    try {
      const { notifications } = req.body;

      await client.query('BEGIN');

      const results = [];
      for (const notification of notifications) {
        const {
          title,
          content,
          type,
          target_type,
          target_ids = [],
          priority = 'normal',
          scheduled_at,
          action_url,
          action_text
        } = notification;

        // 确定目标用户列表
        let userIds = [];
        if (target_type === 'all') {
          const usersResult = await client.query('SELECT id FROM users WHERE is_active = true');
          userIds = usersResult.rows.map(row => row.id);
        } else if (target_type === 'user') {
          userIds = target_ids;
        } else if (target_type === 'room') {
          const roomMembersResult = await client.query(
            'SELECT DISTINCT user_id FROM room_members WHERE room_id = ANY($1)',
            [target_ids]
          );
          userIds = roomMembersResult.rows.map(row => row.user_id);
        } else if (target_type === 'role') {
          const roleUsersResult = await client.query(
            'SELECT id FROM users WHERE role = ANY($1) AND is_active = true',
            [target_ids]
          );
          userIds = roleUsersResult.rows.map(row => row.id);
        }

        // 批量创建通知
        for (const userId of userIds) {
          const result = await client.query(
            `INSERT INTO notifications (
              user_id, title, content, type, priority, status,
              action_url, action_text, scheduled_at, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
            RETURNING *`,
            [
              userId, title, content, type, priority,
              scheduled_at ? 'pending' : 'sent',
              action_url, action_text, scheduled_at
            ]
          );
          results.push(result.rows[0]);
        }
      }

      await client.query('COMMIT');

      return res.success(201, '批量通知发送成功', {
        count: results.length,
        notifications: results.slice(0, 20) // 只返回前20条作为示例
      });
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('批量发送通知失败:', error);
      return res.error(500, '批量发送通知失败', error.message);
    } finally {
      client.release();
    }
  }

  /**
   * 管理员 - 获取通知设置
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async getNotificationSettings(req, res) {
    try {
      const result = await pool.query(
        'SELECT * FROM notification_settings ORDER BY created_at DESC LIMIT 1'
      );

      if (result.rows.length === 0) {
        // 返回默认设置
        return res.success(200, '获取通知设置成功', {
          settings: {
            enable_app_notifications: true,
            enable_email_notifications: false,
            enable_sms_notifications: false,
            enable_wechat_notifications: false,
            default_priority: 'normal',
            batch_size: 100,
            retry_attempts: 3,
            retry_interval: 300
          }
        });
      }

      return res.success(200, '获取通知设置成功', { settings: result.rows[0] });
    } catch (error) {
      logger.error('获取通知设置失败:', error);
      return res.error(500, '获取通知设置失败', error.message);
    }
  }

  /**
   * 管理员 - 更新通知设置
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  static async updateNotificationSettings(req, res) {
    try {
      const {
        enable_app_notifications,
        enable_email_notifications,
        enable_sms_notifications,
        enable_wechat_notifications,
        default_priority,
        batch_size,
        retry_attempts,
        retry_interval
      } = req.body;

      // 先检查是否存在设置
      const checkResult = await pool.query(
        'SELECT id FROM notification_settings ORDER BY created_at DESC LIMIT 1'
      );

      let result;
      if (checkResult.rows.length === 0) {
        // 创建新设置
        result = await pool.query(
          `INSERT INTO notification_settings (
            enable_app_notifications, enable_email_notifications,
            enable_sms_notifications, enable_wechat_notifications,
            default_priority, batch_size, retry_attempts, retry_interval,
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
          RETURNING *`,
          [
            enable_app_notifications ?? true,
            enable_email_notifications ?? false,
            enable_sms_notifications ?? false,
            enable_wechat_notifications ?? false,
            default_priority ?? 'normal',
            batch_size ?? 100,
            retry_attempts ?? 3,
            retry_interval ?? 300
          ]
        );
      } else {
        // 更新现有设置
        const updates = [];
        const values = [];
        let paramIndex = 1;

        if (enable_app_notifications !== undefined) {
          updates.push(`enable_app_notifications = $${paramIndex++}`);
          values.push(enable_app_notifications);
        }
        if (enable_email_notifications !== undefined) {
          updates.push(`enable_email_notifications = $${paramIndex++}`);
          values.push(enable_email_notifications);
        }
        if (enable_sms_notifications !== undefined) {
          updates.push(`enable_sms_notifications = $${paramIndex++}`);
          values.push(enable_sms_notifications);
        }
        if (enable_wechat_notifications !== undefined) {
          updates.push(`enable_wechat_notifications = $${paramIndex++}`);
          values.push(enable_wechat_notifications);
        }
        if (default_priority !== undefined) {
          updates.push(`default_priority = $${paramIndex++}`);
          values.push(default_priority);
        }
        if (batch_size !== undefined) {
          updates.push(`batch_size = $${paramIndex++}`);
          values.push(batch_size);
        }
        if (retry_attempts !== undefined) {
          updates.push(`retry_attempts = $${paramIndex++}`);
          values.push(retry_attempts);
        }
        if (retry_interval !== undefined) {
          updates.push(`retry_interval = $${paramIndex++}`);
          values.push(retry_interval);
        }

        if (updates.length === 0) {
          return res.error(400, '没有可更新的字段');
        }

        updates.push(`updated_at = NOW()`);
        values.push(checkResult.rows[0].id);

        result = await pool.query(
          `UPDATE notification_settings SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
          values
        );
      }

      return res.success(200, '通知设置更新成功', { settings: result.rows[0] });
    } catch (error) {
      logger.error('更新通知设置失败:', error);
      return res.error(500, '更新通知设置失败', error.message);
    }
  }
}

module.exports = NotificationController;