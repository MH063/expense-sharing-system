const { Notification, User, Bill, Payment } = require('../models');
const { Op } = require('sequelize');
const { sequelize } = require('../config/database');

/**
 * 通知控制器
 */
class NotificationController {
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
      console.log('创建通知，数据:', notificationData);
      
      const notification = await Notification.create({
        user_id: notificationData.user_id,
        title: notificationData.title,
        content: notificationData.content,
        type: notificationData.type,
        related_id: notificationData.related_id || null,
        is_read: notificationData.is_read || false
      });
      
      console.log('通知创建成功:', notification.id);
      return notification;
    } catch (error) {
      console.error('创建通知失败:', error);
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
      console.log('获取用户通知列表，用户ID:', userId, '选项:', options);
      
      const {
        unreadOnly = false,
        type = null,
        page = 1,
        limit = 20
      } = options;
      
      // 构建查询条件
      const whereClause = {
        user_id: userId
      };
      
      if (unreadOnly) {
        whereClause.is_read = false;
      }
      
      if (type) {
        whereClause.type = type;
      }
      
      // 计算偏移量
      const offset = (page - 1) * limit;
      
      // 查询通知
      const { count, rows: notifications } = await Notification.findAndCountAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      console.log(`找到 ${count} 条通知，返回第 ${page} 页，每页 ${limit} 条`);
      
      return {
        notifications,
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      };
    } catch (error) {
      console.error('获取用户通知列表失败:', error);
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
      console.log('标记通知为已读，通知ID:', notificationId, '用户ID:', userId);
      
      const [updatedRowsCount] = await Notification.update(
        { is_read: true },
        {
          where: {
            id: notificationId,
            user_id: userId
          }
        }
      );
      
      const success = updatedRowsCount > 0;
      console.log(`标记通知为已读${success ? '成功' : '失败'}，影响行数:`, updatedRowsCount);
      
      return success;
    } catch (error) {
      console.error('标记通知为已读失败:', error);
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
      console.log('标记所有通知为已读，用户ID:', userId, '类型:', type);
      
      const whereClause = {
        user_id: userId,
        is_read: false
      };
      
      if (type) {
        whereClause.type = type;
      }
      
      const [updatedRowsCount] = await Notification.update(
        { is_read: true },
        { where: whereClause }
      );
      
      console.log(`标记 ${updatedRowsCount} 条通知为已读`);
      
      return updatedRowsCount;
    } catch (error) {
      console.error('标记所有通知为已读失败:', error);
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
      console.log('删除通知，通知ID:', notificationId, '用户ID:', userId);
      
      const deletedRowsCount = await Notification.destroy({
        where: {
          id: notificationId,
          user_id: userId
        }
      });
      
      const success = deletedRowsCount > 0;
      console.log(`删除通知${success ? '成功' : '失败'}，影响行数:`, deletedRowsCount);
      
      return success;
    } catch (error) {
      console.error('删除通知失败:', error);
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
      console.log('获取未读通知数量，用户ID:', userId, '类型:', type);
      
      const whereClause = {
        user_id: userId,
        is_read: false
      };
      
      if (type) {
        whereClause.type = type;
      }
      
      const count = await Notification.count({ where: whereClause });
      
      console.log(`找到 ${count} 条未读通知`);
      
      return count;
    } catch (error) {
      console.error('获取未读通知数量失败:', error);
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
      console.log('创建账单到期提醒通知，账单ID:', billData.id, '距离到期天数:', daysUntilDue);
      
      const notifications = [];
      
      // 获取账单分摊信息，找出需要支付的用户
      const billSplits = await BillSplit.findAll({
        where: {
          bill_id: billData.id
        },
        include: [
          {
            model: User,
            attributes: ['id', 'username', 'email']
          }
        ]
      });
      
      // 为每个需要支付的用户创建通知
      for (const split of billSplits) {
        if (split.amount > 0) { // 只为需要支付的用户创建通知
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
      
      console.log(`创建了 ${notifications.length} 条账单到期提醒通知`);
      
      return notifications;
    } catch (error) {
      console.error('创建账单到期提醒通知失败:', error);
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
      console.log('创建支付状态变更通知，支付ID:', paymentData.id, '状态:', status);
      
      const notifications = [];
      
      // 获取账单信息
      const bill = await Bill.findByPk(paymentData.bill_id, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username', 'email']
          }
        ]
      });
      
      if (!bill) {
        console.error('未找到账单信息');
        return notifications;
      }
      
      // 获取账单分摊信息
      const billSplits = await BillSplit.findAll({
        where: {
          bill_id: bill.id
        },
        include: [
          {
            model: User,
            attributes: ['id', 'username', 'email']
          }
        ]
      });
      
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
      
      console.log(`创建了 ${notifications.length} 条支付状态变更通知`);
      
      return notifications;
    } catch (error) {
      console.error('创建支付状态变更通知失败:', error);
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
      console.log(`检查并发送即将到期的账单提醒，提前天数: ${days}`);
      
      // 计算目标日期
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      const targetDateStr = targetDate.toISOString().split('T')[0];
      
      // 查找即将到期的账单
      const dueBills = await Bill.findAll({
        where: {
          due_date: targetDateStr,
          status: {
            [Op.notIn]: ['paid', 'cancelled']
          }
        },
        include: [
          {
            model: BillSplit,
            include: [
              {
                model: User,
                attributes: ['id', 'username', 'email']
              }
            ]
          }
        ]
      });
      
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
      
      const overdueBills = await Bill.findAll({
        where: {
          due_date: {
            [Op.lt]: today
          },
          status: {
            [Op.notIn]: ['paid', 'cancelled']
          }
        },
        include: [
          {
            model: BillSplit,
            include: [
              {
                model: User,
                attributes: ['id', 'username', 'email']
              }
            ]
          }
        ]
      });
      
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