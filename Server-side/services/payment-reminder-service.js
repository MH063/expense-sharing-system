/**
 * 支付提醒服务
 * 处理支付提醒的创建、发送和管理
 */

const pool = require('../config/db').pool;
const { logger } = require('../config/logger');
const { v4: uuidv4 } = require('uuid');
const { sendEmail, sendSMS } = require('../utils/notification-service');

/**
 * 创建支付提醒
 * @param {Object} reminderData - 提醒数据
 * @param {string} reminderData.billId - 账单ID
 * @param {string} reminderData.userId - 用户ID
 * @param {string} reminderData.reminderType - 提醒类型
 * @param {Date} reminderData.reminderTime - 提醒时间
 * @param {string} reminderData.message - 提醒消息
 * @param {string} reminderData.channel - 提醒渠道 (email, sms, notification)
 * @returns {Object} 创建的提醒记录
 */
const createPaymentReminder = async (reminderData) => {
  try {
    logger.info('创建支付提醒', { billId: reminderData.billId, userId: reminderData.userId });
    
    const { billId, userId, reminderType, reminderTime, message, channel } = reminderData;
    
    // 检查账单是否存在
    const billQuery = 'SELECT id FROM bills WHERE id = $1';
    const billResult = await pool.query(billQuery, [billId]);
    
    if (billResult.rows.length === 0) {
      throw new Error('账单不存在');
    }
    
    // 检查用户是否存在
    const userQuery = 'SELECT id FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [userId]);
    
    if (userResult.rows.length === 0) {
      throw new Error('用户不存在');
    }
    
    // 创建提醒记录
    const reminderId = uuidv4();
    const insertQuery = `
      INSERT INTO payment_reminders 
      (id, bill_id, user_id, reminder_type, reminder_time, message, channel, status, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) 
      RETURNING *
    `;
    
    const reminderResult = await pool.query(insertQuery, [
      reminderId,
      billId,
      userId,
      reminderType,
      reminderTime,
      message,
      channel,
      'pending'
    ]);
    
    const reminder = reminderResult.rows[0];
    
    logger.info('支付提醒创建成功', { reminderId: reminder.id });
    
    return reminder;
  } catch (error) {
    logger.error('创建支付提醒失败', { error: error.message, billId: reminderData.billId });
    throw error;
  }
};

/**
 * 发送支付提醒
 * @param {string} reminderId - 提醒ID
 * @returns {Object} 更新后的提醒记录
 */
const sendPaymentReminder = async (reminderId) => {
  try {
    logger.info('发送支付提醒', { reminderId });
    
    // 开始事务
    await pool.query('BEGIN');
    
    try {
      // 查询提醒记录
      const reminderQuery = `
        SELECT pr.*, 
               b.title as bill_title, b.amount as bill_amount, b.due_date as bill_due_date,
               u.name as user_name, u.email as user_email, u.phone as user_phone
        FROM payment_reminders pr
        LEFT JOIN bills b ON pr.bill_id = b.id
        LEFT JOIN users u ON pr.user_id = u.id
        WHERE pr.id = $1
      `;
      
      const reminderResult = await pool.query(reminderQuery, [reminderId]);
      
      if (reminderResult.rows.length === 0) {
        throw new Error('提醒记录不存在');
      }
      
      const reminder = reminderResult.rows[0];
      
      if (reminder.status !== 'pending') {
        throw new Error('只能发送待发送状态的提醒');
      }
      
      let sentSuccess = false;
      let errorMessage = '';
      
      // 根据渠道发送提醒
      try {
        if (reminder.channel === 'email') {
          await sendEmail({
            to: reminder.user_email,
            subject: `支付提醒：${reminder.bill_title}`,
            message: reminder.message || `您有一笔账单待支付：${reminder.bill_title}，金额：${reminder.bill_amount}，截止日期：${reminder.bill_due_date}`
          });
          sentSuccess = true;
        } else if (reminder.channel === 'sms') {
          await sendSMS({
            to: reminder.user_phone,
            message: reminder.message || `【记账系统】您有一笔账单待支付：${reminder.bill_title}，金额：${reminder.bill_amount}，截止日期：${reminder.bill_due_date}`
          });
          sentSuccess = true;
        } else if (reminder.channel === 'app_notification') {
          // 发送应用内通知（这里简化处理，实际可能需要WebSocket或其他推送机制）
          logger.info(`发送应用内通知给用户 ${reminder.user_id}：${reminder.message}`);
          sentSuccess = true;
        }
      } catch (error) {
        errorMessage = error.message;
        logger.error(`发送${reminder.channel}提醒失败:`, error);
      }
      
      // 更新提醒记录
      const updateQuery = `
        UPDATE payment_reminders 
        SET status = $1, sent_at = $2, error_message = $3, updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `;
      
      const updateResult = await pool.query(updateQuery, [
        sentSuccess ? 'sent' : 'failed',
        sentSuccess ? new Date() : null,
        errorMessage || null,
        reminderId
      ]);
      
      // 提交事务
      await pool.query('COMMIT');
      
      logger.info(`支付提醒发送${sentSuccess ? '成功' : '失败'}，ID: ${reminderId}`);
      
      return updateResult.rows[0];
    } catch (error) {
      // 回滚事务
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('发送支付提醒失败:', error);
    throw error;
  }
};

/**
 * 获取用户的支付提醒列表
 * @param {string} userId - 用户ID
 * @param {Object} options - 查询选项
 * @param {string} options.status - 状态筛选
 * @param {string} options.channel - 渠道筛选
 * @param {number} options.page - 页码
 * @param {number} options.pageSize - 每页数量
 * @returns {Object} 支付提醒列表和分页信息
 */
const getUserPaymentReminders = async (userId, options = {}) => {
  try {
    logger.info('获取用户支付提醒列表', { userId });
    
    const {
      status,
      channel,
      page = 1,
      pageSize = 10
    } = options;
    
    // 构建查询条件
    let whereConditions = ['pr.user_id = $1'];
    let queryParams = [userId];
    let paramIndex = 2;
    
    if (status) {
      whereConditions.push(`pr.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    if (channel) {
      whereConditions.push(`pr.channel = $${paramIndex}`);
      queryParams.push(channel);
      paramIndex++;
    }
    
    // 计算分页偏移量
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as count
      FROM payment_reminders pr
      WHERE ${whereConditions.join(' AND ')}
    `;
    
    const countResult = await pool.query(countQuery, queryParams);
    const count = parseInt(countResult.rows[0].count);
    
    // 查询提醒记录
    const remindersQuery = `
      SELECT pr.*, 
             b.title as bill_title, b.amount as bill_amount, b.due_date as bill_due_date, b.status as bill_status,
             u.name as user_name, u.email as user_email, u.phone as user_phone
      FROM payment_reminders pr
      LEFT JOIN bills b ON pr.bill_id = b.id
      LEFT JOIN users u ON pr.user_id = u.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY pr.reminder_time DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    queryParams.push(limit, offset);
    const remindersResult = await pool.query(remindersQuery, queryParams);
    
    // 格式化结果
    const reminders = remindersResult.rows.map(row => ({
      id: row.id,
      billId: row.bill_id,
      userId: row.user_id,
      reminderType: row.reminder_type,
      reminderTime: row.reminder_time,
      message: row.message,
      channel: row.channel,
      status: row.status,
      sentAt: row.sent_at,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      bill: row.bill_id ? {
        id: row.bill_id,
        title: row.bill_title,
        amount: row.bill_amount,
        dueDate: row.bill_due_date,
        status: row.bill_status
      } : null,
      user: {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email,
        phone: row.user_phone
      }
    }));
    
    logger.info(`成功查询到 ${count} 条用户支付提醒记录`);
    
    return {
      items: reminders,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(count / parseInt(pageSize))
    };
  } catch (error) {
    logger.error('获取用户支付提醒列表失败', { error: error.message, userId });
    throw error;
  }
};

/**
 * 获取待发送的支付提醒
 * @param {Date} currentTime - 当前时间
 * @param {Object} options - 查询选项
 * @param {number} options.page - 页码
 * @param {number} options.pageSize - 每页数量
 * @returns {Object} 待发送的支付提醒列表和分页信息
 */
const getPendingReminders = async (currentTime = new Date(), options = {}) => {
  try {
    logger.info('获取待发送的支付提醒');
    
    const {
      page = 1,
      pageSize = 10
    } = options;
    
    // 计算分页偏移量
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    // 查询总数
    const countQuery = `
      SELECT COUNT(*) as count
      FROM payment_reminders pr
      WHERE pr.status = 'pending' AND pr.reminder_time <= $1
    `;
    
    const countResult = await pool.query(countQuery, [currentTime]);
    const count = parseInt(countResult.rows[0].count);
    
    // 查询待发送的支付提醒
    const remindersQuery = `
      SELECT pr.*, 
             b.title as bill_title, b.amount as bill_amount, b.due_date as bill_due_date,
             u.name as user_name, u.email as user_email, u.phone as user_phone
      FROM payment_reminders pr
      LEFT JOIN bills b ON pr.bill_id = b.id
      LEFT JOIN users u ON pr.user_id = u.id
      WHERE pr.status = 'pending' AND pr.reminder_time <= $1
      ORDER BY pr.reminder_time ASC
      LIMIT $2 OFFSET $3
    `;
    
    const remindersResult = await pool.query(remindersQuery, [currentTime, limit, offset]);
    
    // 格式化结果
    const reminders = remindersResult.rows.map(row => ({
      id: row.id,
      billId: row.bill_id,
      userId: row.user_id,
      reminderType: row.reminder_type,
      reminderTime: row.reminder_time,
      message: row.message,
      channel: row.channel,
      status: row.status,
      sentAt: row.sent_at,
      errorMessage: row.error_message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      bill: row.bill_id ? {
        id: row.bill_id,
        title: row.bill_title,
        amount: row.bill_amount,
        dueDate: row.bill_due_date
      } : null,
      user: {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email,
        phone: row.user_phone
      }
    }));
    
    logger.info(`成功查询到 ${count} 条待发送的支付提醒`);
    
    return {
      items: reminders,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(count / parseInt(pageSize))
    };
  } catch (error) {
    logger.error('获取待发送的支付提醒失败', { error: error.message });
    throw error;
  }
};

/**
 * 批量发送待发送的支付提醒
 * @param {number} batchSize - 批处理大小，默认为10
 * @returns {Object} 发送结果统计
 */
const sendPendingReminders = async (batchSize = 10) => {
  try {
    logger.info('批量发送待发送的支付提醒');
    
    // 获取待发送的提醒
    const { items: reminders } = await getPendingReminders(new Date(), {
      page: 1,
      pageSize: batchSize
    });
    
    if (reminders.length === 0) {
      logger.info('没有待发送的支付提醒');
      return {
        total: 0,
        success: 0,
        failed: 0
      };
    }
    
    let successCount = 0;
    let failedCount = 0;
    
    // 逐个发送提醒
    for (const reminder of reminders) {
      try {
        await sendPaymentReminder(reminder.id);
        successCount++;
      } catch (error) {
        logger.error(`发送提醒失败，ID: ${reminder.id}`, { error: error.message });
        failedCount++;
      }
    }
    
    logger.info(`批量发送支付提醒完成，成功: ${successCount}，失败: ${failedCount}`);
    
    return {
      total: reminders.length,
      success: successCount,
      failed: failedCount
    };
  } catch (error) {
    logger.error('批量发送待发送的支付提醒失败', { error: error.message });
    throw error;
  }
};

/**
 * 为账单创建自动提醒
 * @param {string} billId - 账单ID
 * @param {Array} reminderConfig - 提醒配置
 * @returns {Array} 创建的提醒记录列表
 */
const createAutoReminders = async (billId, reminderConfig = []) => {
  try {
    logger.info('为账单创建自动提醒', { billId });
    
    // 检查账单是否存在
    const billQuery = `
      SELECT b.*, r.id as room_id
      FROM bills b
      LEFT JOIN rooms r ON b.room_id = r.id
      WHERE b.id = $1
    `;
    
    const billResult = await pool.query(billQuery, [billId]);
    
    if (billResult.rows.length === 0) {
      throw new Error('账单不存在');
    }
    
    const bill = billResult.rows[0];
    
    // 查询房间成员
    const membersQuery = `
      SELECT u.*
      FROM users u
      JOIN room_members rm ON u.id = rm.user_id
      WHERE rm.room_id = $1
    `;
    
    const membersResult = await pool.query(membersQuery, [bill.room_id]);
    
    if (membersResult.rows.length === 0) {
      throw new Error('房间没有成员');
    }
    
    // 如果没有提供提醒配置，使用默认配置
    if (reminderConfig.length === 0) {
      reminderConfig = [
        {
          reminderType: 'due_date_reminder',
          daysBeforeDue: 3,
          channel: 'email'
        },
        {
          reminderType: 'due_date_reminder',
          daysBeforeDue: 1,
          channel: 'sms'
        },
        {
          reminderType: 'overdue_reminder',
          daysAfterDue: 1,
          channel: 'email'
        }
      ];
    }
    
    const createdReminders = [];
    
    // 为每个成员创建提醒
    for (const member of membersResult.rows) {
      for (const config of reminderConfig) {
        let reminderTime;
        
        if (config.reminderType === 'due_date_reminder' && config.daysBeforeDue) {
          reminderTime = new Date(bill.due_date);
          reminderTime.setDate(reminderTime.getDate() - config.daysBeforeDue);
        } else if (config.reminderType === 'overdue_reminder' && config.daysAfterDue) {
          reminderTime = new Date(bill.due_date);
          reminderTime.setDate(reminderTime.getDate() + config.daysAfterDue);
        } else {
          continue; // 跳过无效的配置
        }
        
        // 只创建未来的提醒
        if (reminderTime > new Date()) {
          const reminder = await createPaymentReminder({
            billId,
            userId: member.id,
            reminderType: config.reminderType,
            reminderTime,
            message: `提醒：账单"${bill.title}"将于${bill.due_date.toLocaleDateString()}到期，请及时支付`,
            channel: config.channel
          });
          
          createdReminders.push(reminder);
        }
      }
    }
    
    logger.info(`成功创建 ${createdReminders.length} 条自动提醒`);
    
    return createdReminders;
  } catch (error) {
    logger.error('为账单创建自动提醒失败', { error: error.message, billId });
    throw error;
  }
};

module.exports = {
  createPaymentReminder,
  sendPaymentReminder,
  getUserPaymentReminders,
  getPendingReminders,
  sendPendingReminders,
  createAutoReminders
};