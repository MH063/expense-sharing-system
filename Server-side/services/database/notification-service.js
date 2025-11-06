/**
 * 通知服务
 * 处理通知相关的数据库操作
 */

const BaseService = require('./base-service');
const { v4: uuidv4 } = require('uuid');

class NotificationService extends BaseService {
  constructor() {
    super('notifications');
  }

  /**
   * 创建通知
   * @param {Object} notificationData - 通知数据
   * @returns {Promise<Object>} 创建的通知
   */
  async createNotification(notificationData) {
    const id = uuidv4();
    const { 
      userId, 
      title, 
      content, 
      type = 'info', 
      relatedId = null, 
      relatedType = null 
    } = notificationData;
    
    const sql = `
      INSERT INTO notifications (
        id, user_id, title, content, type, is_read, 
        related_id, related_type, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const values = [
      id, userId, title, content, type, false, 
      relatedId, relatedType
    ];
    
    const result = await this.query(sql, values);
    return result.rows[0];
  }

  /**
   * 批量创建通知（用于发送给多个用户）
   * @param {Array} userIds - 用户ID列表
   * @param {Object} notificationData - 通知数据（不包含userId）
   * @returns {Promise<Array>} 创建的通知列表
   */
  async createBatchNotifications(userIds, notificationData) {
    if (!userIds || userIds.length === 0) {
      return [];
    }

    const { title, content, type = 'info', relatedId = null, relatedType = null } = notificationData;
    const notifications = [];
    
    for (const userId of userIds) {
      const id = uuidv4();
      notifications.push([
        id, userId, title, content, type, false, relatedId, relatedType
      ]);
    }

    // 使用事务确保所有通知都创建成功
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      const createdNotifications = [];
      for (const notificationValues of notifications) {
        const sql = `
          INSERT INTO notifications (
            id, user_id, title, content, type, is_read, 
            related_id, related_type, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          RETURNING *
        `;
        
        const result = await client.query(sql, notificationValues);
        createdNotifications.push(result.rows[0]);
      }
      
      await client.query('COMMIT');
      return createdNotifications;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 获取用户通知列表
   * @param {string} userId - 用户ID
   * @param {Object} options - 查询选项
   * @returns {Promise<Array>} 通知列表
   */
  async getUserNotifications(userId, options = {}) {
    let sql = `SELECT * FROM notifications WHERE user_id = $1`;
    const params = [userId];
    let paramIndex = 2;

    // 添加已读状态过滤
    if (options.isRead !== undefined) {
      sql += ` AND is_read = $${paramIndex}`;
      params.push(options.isRead);
      paramIndex++;
    }

    // 添加类型过滤
    if (options.type) {
      sql += ` AND type = $${paramIndex}`;
      params.push(options.type);
      paramIndex++;
    }

    // 添加相关类型过滤
    if (options.relatedType) {
      sql += ` AND related_type = $${paramIndex}`;
      params.push(options.relatedType);
      paramIndex++;
    }

    // 排序
    sql += ` ORDER BY created_at DESC`;

    // 分页
    if (options.limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(options.limit);
      paramIndex++;

      if (options.offset) {
        sql += ` OFFSET $${paramIndex}`;
        params.push(options.offset);
      }
    }

    const result = await this.query(sql, params);
    return result.rows;
  }

  /**
   * 获取未读通知数量
   * @param {string} userId - 用户ID
   * @returns {Promise<number>} 未读通知数量
   */
  async getUnreadCount(userId) {
    const sql = `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = $2`;
    const result = await this.query(sql, [userId, false]);
    return parseInt(result.rows[0].count);
  }

  /**
   * 标记通知为已读
   * @param {string} notificationId - 通知ID
   * @returns {Promise<Object|null>} 更新后的通知
   */
  async markAsRead(notificationId) {
    const sql = `
      UPDATE notifications 
      SET is_read = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await this.query(sql, [true, notificationId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 批量标记通知为已读
   * @param {string} userId - 用户ID
   * @param {Array} notificationIds - 通知ID列表（可选，如果不提供则标记所有未读通知）
   * @returns {Promise<number>} 更新的记录数
   */
  async batchMarkAsRead(userId, notificationIds = null) {
    let sql = `
      UPDATE notifications 
      SET is_read = $1, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2 AND is_read = $3
    `;
    const params = [true, userId, false];
    let paramIndex = 4;

    if (notificationIds && notificationIds.length > 0) {
      const placeholders = notificationIds.map(() => `$${paramIndex++}`).join(', ');
      sql += ` AND id IN (${placeholders})`;
      params.push(...notificationIds);
    }

    const result = await this.query(sql, params);
    return result.rowCount;
  }

  /**
   * 删除通知
   * @param {string} notificationId - 通知ID
   * @returns {Promise<boolean>} 是否删除成功
   */
  async deleteNotification(notificationId) {
    const sql = `DELETE FROM notifications WHERE id = $1`;
    const result = await this.query(sql, [notificationId]);
    return result.rowCount > 0;
  }

  /**
   * 批量删除通知
   * @param {string} userId - 用户ID
   * @param {Array} notificationIds - 通知ID列表（可选，如果不提供则删除所有已读通知）
   * @returns {Promise<number>} 删除的记录数
   */
  async batchDeleteNotifications(userId, notificationIds = null) {
    let sql = `DELETE FROM notifications WHERE user_id = $1`;
    const params = [userId];
    let paramIndex = 2;

    if (notificationIds && notificationIds.length > 0) {
      const placeholders = notificationIds.map(() => `$${paramIndex++}`).join(', ');
      sql += ` AND id IN (${placeholders})`;
      params.push(...notificationIds);
    } else {
      // 如果没有指定通知ID，则删除所有已读通知
      sql += ` AND is_read = $2`;
      params.push(true);
    }

    const result = await this.query(sql, params);
    return result.rowCount;
  }

  /**
   * 获取通知详情
   * @param {string} notificationId - 通知ID
   * @returns {Promise<Object|null>} 通知详情
   */
  async getNotificationDetails(notificationId) {
    const sql = `SELECT * FROM notifications WHERE id = $1`;
    const result = await this.query(sql, [notificationId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 创建账单相关通知
   * @param {string} billId - 账单ID
   * @param {string} notificationType - 通知类型
   * @param {Object} additionalData - 额外数据
   * @returns {Promise<Array>} 创建的通知列表
   */
  async createBillNotifications(billId, notificationType, additionalData = {}) {
    // 获取账单信息和房间成员
    const billSql = `
      SELECT b.title, b.room_id, b.creator_id, r.name as room_name
      FROM bills b
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE b.id = $1
    `;
    const billResult = await this.query(billSql, [billId]);
    
    if (billResult.rows.length === 0) {
      return [];
    }
    
    const bill = billResult.rows[0];
    
    // 获取房间成员（不包括创建者）
    const membersSql = `
      SELECT rm.user_id
      FROM room_members rm
      WHERE rm.room_id = $1 AND rm.is_active = $2 AND rm.user_id != $3
    `;
    const membersResult = await this.query(membersSql, [bill.room_id, true, bill.creator_id]);
    
    const memberIds = membersResult.rows.map(row => row.user_id);
    
    // 根据通知类型生成通知内容
    let title, content;
    switch (notificationType) {
      case 'bill_created':
        title = '新账单通知';
        content = `房间"${bill.room_name}"创建了新账单"${bill.title}"`;
        break;
      case 'bill_updated':
        title = '账单更新通知';
        content = `账单"${bill.title}"已更新`;
        break;
      case 'bill_paid':
        title = '账单支付通知';
        const payerName = additionalData.payerName || '有人';
        content = `${payerName}已支付账单"${bill.title}"`;
        break;
      case 'bill_overdue':
        title = '账单逾期提醒';
        content = `账单"${bill.title}"已逾期，请尽快支付`;
        break;
      default:
        title = '账单通知';
        content = `账单"${bill.title}"有更新`;
    }
    
    // 创建通知
    return await this.createBatchNotifications(memberIds, {
      title,
      content,
      type: 'bill',
      relatedId: billId,
      relatedType: 'bill'
    });
  }

  /**
   * 清理过期通知
   * @param {number} days - 保留天数
   * @returns {Promise<number>} 删除的记录数
   */
  async cleanupOldNotifications(days = 30) {
    const sql = `
      DELETE FROM notifications 
      WHERE created_at < CURRENT_DATE - INTERVAL '${days} days'
    `;
    const result = await this.query(sql);
    return result.rowCount;
  }
}

module.exports = new NotificationService();