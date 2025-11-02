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
      
      this.logger.info(`账单创建事件已发送: ${billData.id}`);
    } catch (error) {
      this.logger.error(`处理账单创建事件失败: ${error.message}`);
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
      
      this.logger.info(`支付记录创建事件已发送: ${paymentData.id}`);
    } catch (error) {
      this.logger.error(`处理支付记录创建事件失败: ${error.message}`);
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
      
      this.logger.info(`争议处理事件已发送: ${disputeData.id}`);
    } catch (error) {
      this.logger.error(`处理争议处理事件失败: ${error.message}`);
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
        // 这里需要根据用户ID找到对应的WebSocket连接
        // 实际实现中可能需要维护用户ID到客户端ID的映射
        websocketManager.broadcast(message);
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
}

module.exports = new WebSocketEventsHandler();