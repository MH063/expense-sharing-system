/**
 * 支付提醒服务
 * 处理支付提醒的创建、发送和管理
 */

const { Bill, User, Room, Payment, PaymentReminder } = require('../models');
const { Op } = require('sequelize');
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
 * @param {string} reminderData.channel - 提醒渠道
 * @returns {Object} 支付提醒记录
 */
const createPaymentReminder = async (reminderData) => {
  try {
    console.log('创建支付提醒，数据:', reminderData);
    
    // 验证必要参数
    const {
      billId,
      userId,
      reminderType,
      reminderTime,
      message,
      channel
    } = reminderData;
    
    if (!billId || !userId || !reminderType || !reminderTime || !channel) {
      throw new Error('缺少必要参数');
    }
    
    // 检查账单是否存在
    const bill = await Bill.findByPk(billId);
    if (!bill) {
      throw new Error('账单不存在');
    }
    
    // 检查用户是否存在
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('用户不存在');
    }
    
    // 创建支付提醒记录
    const reminder = await PaymentReminder.create({
      id: uuidv4(),
      billId,
      userId,
      reminderType,
      reminderTime,
      message: message || '',
      channel,
      status: 'pending', // 待发送状态
      sentAt: null,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log(`成功创建支付提醒，ID: ${reminder.id}`);
    
    return reminder;
  } catch (error) {
    console.error('创建支付提醒失败:', error);
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
    console.log(`发送支付提醒，ID: ${reminderId}`);
    
    // 查找提醒记录
    const reminder = await PaymentReminder.findByPk(reminderId, {
      include: [
        {
          model: Bill,
          as: 'bill',
          attributes: ['id', 'title', 'amount', 'dueDate']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ]
    });
    
    if (!reminder) {
      throw new Error('提醒记录不存在');
    }
    
    if (reminder.status !== 'pending') {
      throw new Error('只能发送待发送状态的提醒');
    }
    
    let sentSuccess = false;
    let errorMessage = '';
    
    // 根据渠道发送提醒
    try {
      if (reminder.channel === 'email') {
        await sendEmail({
          to: reminder.user.email,
          subject: `支付提醒：${reminder.bill.title}`,
          message: reminder.message || `您有一笔账单待支付：${reminder.bill.title}，金额：${reminder.bill.amount}，截止日期：${reminder.bill.dueDate}`
        });
        sentSuccess = true;
      } else if (reminder.channel === 'sms') {
        await sendSMS({
          to: reminder.user.phone,
          message: reminder.message || `【记账系统】您有一笔账单待支付：${reminder.bill.title}，金额：${reminder.bill.amount}，截止日期：${reminder.bill.dueDate}`
        });
        sentSuccess = true;
      } else if (reminder.channel === 'app_notification') {
        // 发送应用内通知（这里简化处理，实际可能需要WebSocket或其他推送机制）
        console.log(`发送应用内通知给用户 ${reminder.user.id}：${reminder.message}`);
        sentSuccess = true;
      }
    } catch (error) {
      errorMessage = error.message;
      console.error(`发送${reminder.channel}提醒失败:`, error);
    }
    
    // 更新提醒记录
    const updatedReminder = await reminder.update({
      status: sentSuccess ? 'sent' : 'failed',
      sentAt: sentSuccess ? new Date() : null,
      errorMessage: errorMessage || null,
      updatedAt: new Date()
    });
    
    console.log(`支付提醒发送${sentSuccess ? '成功' : '失败'}，ID: ${reminderId}`);
    
    return updatedReminder;
  } catch (error) {
    console.error('发送支付提醒失败:', error);
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
    console.log(`获取用户支付提醒列表，用户ID: ${userId}`);
    
    const {
      status,
      channel,
      page = 1,
      pageSize = 10
    } = options;
    
    // 构建查询条件
    const whereClause = {
      userId
    };
    
    if (status) {
      whereClause.status = status;
    }
    
    if (channel) {
      whereClause.channel = channel;
    }
    
    // 计算分页偏移量
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    // 查询支付提醒记录
    const { count, rows: reminders } = await PaymentReminder.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Bill,
          as: 'bill',
          attributes: ['id', 'title', 'amount', 'dueDate', 'status']
        }
      ],
      order: [['reminderTime', 'DESC']],
      offset,
      limit
    });
    
    console.log(`成功查询到 ${count} 条用户支付提醒记录`);
    
    return {
      items: reminders,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(count / parseInt(pageSize))
    };
  } catch (error) {
    console.error('获取用户支付提醒列表失败:', error);
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
    console.log('获取待发送的支付提醒');
    
    const {
      page = 1,
      pageSize = 10
    } = options;
    
    // 计算分页偏移量
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    // 查询待发送的支付提醒
    const { count, rows: reminders } = await PaymentReminder.findAndCountAll({
      where: {
        status: 'pending',
        reminderTime: {
          [Op.lte]: currentTime
        }
      },
      include: [
        {
          model: Bill,
          as: 'bill',
          attributes: ['id', 'title', 'amount', 'dueDate']
        },
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', 'phone']
        }
      ],
      order: [['reminderTime', 'ASC']], // 按提醒时间升序，先处理早到期的提醒
      offset,
      limit
    });
    
    console.log(`成功查询到 ${count} 条待发送的支付提醒`);
    
    return {
      items: reminders,
      total: count,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      totalPages: Math.ceil(count / parseInt(pageSize))
    };
  } catch (error) {
    console.error('获取待发送的支付提醒失败:', error);
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
    console.log('批量发送待发送的支付提醒');
    
    // 获取待发送的提醒
    const { items: reminders } = await getPendingReminders(new Date(), {
      page: 1,
      pageSize: batchSize
    });
    
    if (reminders.length === 0) {
      console.log('没有待发送的支付提醒');
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
        console.error(`发送提醒失败，ID: ${reminder.id}`, error);
        failedCount++;
      }
    }
    
    console.log(`批量发送支付提醒完成，成功: ${successCount}，失败: ${failedCount}`);
    
    return {
      total: reminders.length,
      success: successCount,
      failed: failedCount
    };
  } catch (error) {
    console.error('批量发送待发送的支付提醒失败:', error);
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
    console.log(`为账单创建自动提醒，账单ID: ${billId}`);
    
    // 检查账单是否存在
    const bill = await Bill.findByPk(billId, {
      include: [
        {
          model: Room,
          as: 'room',
          include: [
            {
              model: User,
              as: 'members'
            }
          ]
        }
      ]
    });
    
    if (!bill) {
      throw new Error('账单不存在');
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
    for (const member of bill.room.members) {
      for (const config of reminderConfig) {
        let reminderTime;
        
        if (config.reminderType === 'due_date_reminder' && config.daysBeforeDue) {
          reminderTime = new Date(bill.dueDate);
          reminderTime.setDate(reminderTime.getDate() - config.daysBeforeDue);
        } else if (config.reminderType === 'overdue_reminder' && config.daysAfterDue) {
          reminderTime = new Date(bill.dueDate);
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
            message: `提醒：账单"${bill.title}"将于${bill.dueDate.toLocaleDateString()}到期，请及时支付`,
            channel: config.channel
          });
          
          createdReminders.push(reminder);
        }
      }
    }
    
    console.log(`成功创建 ${createdReminders.length} 条自动提醒`);
    
    return createdReminders;
  } catch (error) {
    console.error('为账单创建自动提醒失败:', error);
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