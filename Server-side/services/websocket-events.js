const websocketManager = require('../config/websocket');
const winston = require('winston');

// WebSocket事件处理器
class WebSocketEventsHandler {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/websocket-events.log' })
      ]
    });
    
    // 用户ID到WebSocket连接的映射
    this.userConnections = new Map();
  }

  // 注册用户连接
  registerUserConnection(userId, ws) {
    this.userConnections.set(userId, ws);
    this.logger.info(`用户 ${userId} 已连接WebSocket`);
  }

  // 注销用户连接
  unregisterUserConnection(userId) {
    this.userConnections.delete(userId);
    this.logger.info(`用户 ${userId} 已断开WebSocket连接`);
  }

  // 向特定用户发送消息
  sendToUser(userId, message) {
    const ws = this.userConnections.get(userId);
    if (ws && ws.readyState === 1) { // WebSocket.OPEN = 1
      ws.send(JSON.stringify(message));
      return true;
    }
    return false;
  }

  // 费用记录创建事件
  async handleExpenseCreated(expenseData) {
    try {
      const message = {
        type: 'expense_created',
        data: expenseData,
        timestamp: new Date().toISOString()
      };
      
      // 向订阅了费用相关事件的客户端发送消息
      websocketManager.sendToSubscribers('expenses', message);
      
      // 向寝室成员发送通知
      if (expenseData.room_id) {
        this.sendToRoomMembers(expenseData.room_id, message);
      }
      
      this.logger.info(`费用创建事件已发送: ${expenseData.id}`);
    } catch (error) {
      this.logger.error(`处理费用创建事件失败: ${error.message}`);
    }
  }

  // 费用记录更新事件
  async handleExpenseUpdated(expenseData) {
    try {
      const message = {
        type: 'expense_updated',
        data: expenseData,
        timestamp: new Date().toISOString()
      };
      
      // 向订阅了费用相关事件的客户端发送消息
      websocketManager.sendToSubscribers('expenses', message);
      
      // 向寝室成员发送通知
      if (expenseData.room_id) {
        this.sendToRoomMembers(expenseData.room_id, message);
      }
      
      this.logger.info(`费用更新事件已发送: ${expenseData.id}`);
    } catch (error) {
      this.logger.error(`处理费用更新事件失败: ${error.message}`);
    }
  }

  // 账单创建事件
  async handleBillCreated(billData) {
    try {
      const message = {
        type: 'bill_created',
        data: billData,
        timestamp: new Date().toISOString()
      };
      
      // 向订阅了账单相关事件的客户端发送消息
      websocketManager.sendToSubscribers('bills', message);
      
      // 向寝室成员发送通知
      if (billData.room_id) {
        this.sendToRoomMembers(billData.room_id, message);
      }
      
      this.logger.info(`账单创建事件已发送: ${billData.id}`);
    } catch (error) {
      this.logger.error(`处理账单创建事件失败: ${error.message}`);
    }
  }

  // 账单审核事件
  async handleBillReviewed(billData) {
    try {
      const message = {
        type: 'bill_reviewed',
        data: billData,
        timestamp: new Date().toISOString()
      };
      
      // 向订阅了账单相关事件的客户端发送消息
      websocketManager.sendToSubscribers('bills', message);
      
      // 向寝室成员发送通知
      if (billData.room_id) {
        this.sendToRoomMembers(billData.room_id, message);
      }
      
      this.logger.info(`账单审核事件已发送: ${billData.id}`);
    } catch (error) {
      this.logger.error(`处理账单审核事件失败: ${error.message}`);
    }
  }

  // 账单支付确认事件
  async handleBillPaymentConfirmed(billData, userId) {
    try {
      const message = {
        type: 'bill_payment_confirmed',
        data: billData,
        timestamp: new Date().toISOString()
      };
      
      // 向订阅了账单相关事件的客户端发送消息
      websocketManager.sendToSubscribers('bills', message);
      
      // 向寝室成员发送通知
      if (billData.room_id) {
        this.sendToRoomMembers(billData.room_id, message);
      }
      
      // 向支付用户发送确认通知
      this.sendToUser(userId, {
        type: 'payment_confirmation',
        data: {
          bill_id: billData.id,
          message: '您的账单支付已确认'
        },
        timestamp: new Date().toISOString()
      });
      
      this.logger.info(`账单支付确认事件已发送: ${billData.id}, 用户: ${userId}`);
    } catch (error) {
      this.logger.error(`处理账单支付确认事件失败: ${error.message}`);
    }
  }

  // 支付记录创建事件
  async handlePaymentCreated(paymentData) {
    try {
      const message = {
        type: 'payment_created',
        data: paymentData,
        timestamp: new Date().toISOString()
      };
      
      // 向订阅了支付相关事件的客户端发送消息
      websocketManager.sendToSubscribers('payments', message);
      
      // 向相关用户发送通知
      if (paymentData.user_id) {
        this.sendToUser(paymentData.user_id, message);
      }
      
      this.logger.info(`支付记录创建事件已发送: ${paymentData.id}`);
    } catch (error) {
      this.logger.error(`处理支付记录创建事件失败: ${error.message}`);
    }
  }

  // 分摊支付确认事件
  async handleSplitPaymentConfirmed(splitData, userId) {
    try {
      const message = {
        type: 'split_payment_confirmed',
        data: splitData,
        timestamp: new Date().toISOString()
      };
      
      // 向订阅了支付相关事件的客户端发送消息
      websocketManager.sendToSubscribers('payments', message);
      
      // 向支付用户发送确认通知
      this.sendToUser(userId, {
        type: 'payment_confirmation',
        data: {
          split_id: splitData.id,
          message: '您的分摊支付已确认'
        },
        timestamp: new Date().toISOString()
      });
      
      this.logger.info(`分摊支付确认事件已发送: ${splitData.id}, 用户: ${userId}`);
    } catch (error) {
      this.logger.error(`处理分摊支付确认事件失败: ${error.message}`);
    }
  }

  // 审核状态更新事件
  async handleReviewStatusUpdated(reviewData) {
    try {
      const message = {
        type: 'review_status_updated',
        data: reviewData,
        timestamp: new Date().toISOString()
      };
      
      // 向订阅了审核相关事件的客户端发送消息
      websocketManager.sendToSubscribers('reviews', message);
      
      // 向相关用户发送通知
      if (reviewData.user_id) {
        this.sendToUser(reviewData.user_id, message);
      }
      
      this.logger.info(`审核状态更新事件已发送: ${reviewData.id}`);
    } catch (error) {
      this.logger.error(`处理审核状态更新事件失败: ${error.message}`);
    }
  }

  // 争议处理事件
  async handleDisputeProcessed(disputeData) {
    try {
      const message = {
        type: 'dispute_processed',
        data: disputeData,
        timestamp: new Date().toISOString()
      };
      
      // 向订阅了争议相关事件的客户端发送消息
      websocketManager.sendToSubscribers('disputes', message);
      
      // 向相关用户发送通知
      if (disputeData.user_id) {
        this.sendToUser(disputeData.user_id, message);
      }
      
      this.logger.info(`争议处理事件已发送: ${disputeData.id}`);
    } catch (error) {
      this.logger.error(`处理争议处理事件失败: ${error.message}`);
    }
  }

  // 寝室成员变更事件
  async handleRoomMemberChanged(roomData, userId, action) {
    try {
      const message = {
        type: 'room_member_changed',
        data: {
          room_id: roomData.id,
          user_id: userId,
          action: action, // 'added', 'removed', 'role_changed'
          room: roomData
        },
        timestamp: new Date().toISOString()
      };
      
      // 向订阅了寝室相关事件的客户端发送消息
      websocketManager.sendToSubscribers('rooms', message);
      
      // 向寝室成员发送通知
      this.sendToRoomMembers(roomData.id, message);
      
      this.logger.info(`寝室成员变更事件已发送: 寝室 ${roomData.id}, 用户 ${userId}, 动作 ${action}`);
    } catch (error) {
      this.logger.error(`处理寝室成员变更事件失败: ${error.message}`);
    }
  }

  // 通知事件
  async handleNotification(notificationData) {
    try {
      const message = {
        type: 'notification',
        data: notificationData,
        timestamp: new Date().toISOString()
      };
      
      // 向特定用户发送通知
      if (notificationData.userId) {
        this.sendToUser(notificationData.userId, message);
      } else {
        // 向所有客户端广播通知
        websocketManager.broadcast(message);
      }
      
      this.logger.info(`通知事件已发送: ${notificationData.id}`);
    } catch (error) {
      this.logger.error(`处理通知事件失败: ${error.message}`);
    }
  }

  // 系统状态更新事件
  async handleSystemStatusUpdated(statusData) {
    try {
      const message = {
        type: 'system_status_updated',
        data: statusData,
        timestamp: new Date().toISOString()
      };
      
      // 向订阅了系统状态相关事件的客户端发送消息
      websocketManager.sendToSubscribers('system', message);
      
      this.logger.info(`系统状态更新事件已发送`);
    } catch (error) {
      this.logger.error(`处理系统状态更新事件失败: ${error.message}`);
    }
  }

  // 向寝室成员发送消息
  async sendToRoomMembers(roomId, message) {
    try {
      // 这里需要查询数据库获取寝室成员列表
      // 为了简化，这里使用一个假设的查询
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      });
      
      const result = await pool.query(
        'SELECT user_id FROM room_members WHERE room_id = $1',
        [roomId]
      );
      
      // 向每个寝室成员发送消息
      for (const member of result.rows) {
        this.sendToUser(member.user_id, message);
      }
      
      await pool.end();
    } catch (error) {
      this.logger.error(`向寝室成员发送消息失败: ${error.message}`);
    }
  }
}

module.exports = new WebSocketEventsHandler();