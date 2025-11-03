/**
 * 定时任务服务
 * 处理支付提醒、数据同步等定时任务
 */

const cron = require('node-cron');
const { query } = require('../config/db');
const paymentReminderService = require('../services/payment-reminder-service');
const offlinePaymentService = require('../services/offline-payment-service');
const notificationService = require('../utils/notification-service');

// 存储已启动的定时任务
const scheduledTasks = {};

/**
 * 启动所有定时任务
 */
const startAllTasks = () => {
  console.log('启动所有定时任务...');
  
  // 每小时检查一次待发送的支付提醒
  startPaymentReminderTask();
  
  // 每30分钟尝试同步一次离线支付记录
  startOfflinePaymentSyncTask();
  
  // 每天凌晨2点清理过期的提醒记录
  startCleanupExpiredRemindersTask();
  
  // 每天凌晨3点生成支付统计报告
  startPaymentStatsTask();
  
  console.log('所有定时任务已启动');
};

/**
 * 停止所有定时任务
 */
const stopAllTasks = () => {
  console.log('停止所有定时任务...');
  
  Object.keys(scheduledTasks).forEach(taskName => {
    if (scheduledTasks[taskName]) {
      scheduledTasks[taskName].stop();
      console.log(`已停止任务: ${taskName}`);
    }
  });
  
  // 清空任务对象
  Object.keys(scheduledTasks).forEach(taskName => {
    delete scheduledTasks[taskName];
  });
  
  console.log('所有定时任务已停止');
};

/**
 * 启动支付提醒任务
 * 每小时检查一次待发送的支付提醒
 */
const startPaymentReminderTask = () => {
  // 每小时在第0分钟执行
  const task = cron.schedule('0 * * * *', async () => {
    console.log('执行支付提醒检查任务...');
    
    try {
      // 获取待发送的提醒
      const pendingReminders = await paymentReminderService.getPendingReminders();
      
      if (pendingReminders && pendingReminders.length > 0) {
        console.log(`发现 ${pendingReminders.length} 条待发送的支付提醒`);
        
        // 批量发送提醒
        const results = await paymentReminderService.sendPendingReminders(pendingReminders);
        
        console.log(`支付提醒发送完成，成功: ${results.successCount}, 失败: ${results.failureCount}`);
      } else {
        console.log('没有待发送的支付提醒');
      }
    } catch (error) {
      console.error('支付提醒任务执行失败:', error);
    }
  }, {
    scheduled: false
  });
  
  task.start();
  scheduledTasks['paymentReminder'] = task;
  console.log('支付提醒任务已启动');
};

/**
 * 启动离线支付同步任务
 * 每30分钟尝试同步一次离线支付记录
 */
const startOfflinePaymentSyncTask = () => {
  // 每30分钟执行一次
  const task = cron.schedule('*/30 * * * *', async () => {
    console.log('执行离线支付同步任务...');
    
    try {
      // 获取待同步的离线支付记录
      const pendingPayments = await offlinePaymentService.getPendingSyncPayments();
      
      if (pendingPayments && pendingPayments.length > 0) {
        console.log(`发现 ${pendingPayments.length} 条待同步的离线支付记录`);
        
        let successCount = 0;
        let failureCount = 0;
        
        // 逐个尝试同步
        for (const payment of pendingPayments) {
          try {
            await offlinePaymentService.retryPaymentSync(payment.id);
            successCount++;
          } catch (error) {
            console.error(`同步离线支付记录失败 (ID: ${payment.id}):`, error);
            failureCount++;
          }
        }
        
        console.log(`离线支付同步完成，成功: ${successCount}, 失败: ${failureCount}`);
      } else {
        console.log('没有待同步的离线支付记录');
      }
    } catch (error) {
      console.error('离线支付同步任务执行失败:', error);
    }
  }, {
    scheduled: false
  });
  
  task.start();
  scheduledTasks['offlinePaymentSync'] = task;
  console.log('离线支付同步任务已启动');
};

/**
 * 启动清理过期提醒任务
 * 每天凌晨2点清理过期的提醒记录
 */
const startCleanupExpiredRemindersTask = () => {
  // 每天凌晨2点执行
  const task = cron.schedule('0 2 * * *', async () => {
    console.log('执行清理过期提醒任务...');
    
    try {
      // 删除7天前的已发送提醒
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const deleteQuery = `
        DELETE FROM payment_reminders 
        WHERE status = 'sent' AND sent_at < $1
      `;
      
      const result = await query(deleteQuery, [sevenDaysAgo]);
      
      console.log(`已清理 ${result.rowCount} 条过期的提醒记录`);
    } catch (error) {
      console.error('清理过期提醒任务执行失败:', error);
    }
  }, {
    scheduled: false
  });
  
  task.start();
  scheduledTasks['cleanupExpiredReminders'] = task;
  console.log('清理过期提醒任务已启动');
};

/**
 * 启动支付统计任务
 * 每天凌晨3点生成支付统计报告
 */
const startPaymentStatsTask = () => {
  // 每天凌晨3点执行
  const task = cron.schedule('0 3 * * *', async () => {
    console.log('执行支付统计任务...');
    
    try {
      // 获取昨天的日期范围
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // 查询昨天的支付统计
      const statsQuery = `
        SELECT 
          COUNT(*) as total_payments,
          COALESCE(SUM(amount), 0) as total_amount,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT bill_id) as unique_bills
        FROM payments 
        WHERE created_at >= $1 AND created_at < $2
      `;
      
      const statsResult = await query(statsQuery, [yesterday, today]);
      const stats = statsResult.rows[0];
      
      // 查询昨天的支付方式统计
      const methodStatsQuery = `
        SELECT 
          payment_method,
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as total_amount
        FROM payments 
        WHERE created_at >= $1 AND created_at < $2
        GROUP BY payment_method
        ORDER BY total_amount DESC
      `;
      
      const methodStatsResult = await query(methodStatsQuery, [yesterday, today]);
      
      // 生成统计报告
      const report = {
        date: yesterday.toISOString().split('T')[0],
        totalPayments: parseInt(stats.total_payments),
        totalAmount: parseFloat(stats.total_amount),
        uniqueUsers: parseInt(stats.unique_users),
        uniqueBills: parseInt(stats.unique_bills),
        paymentMethods: methodStatsResult.rows
      };
      
      console.log('支付统计报告:', report);
      
      // 可以在这里将报告保存到数据库或发送邮件
      // 例如，发送给管理员
      if (process.env.ADMIN_EMAIL) {
        const emailContent = `
          昨日支付统计报告 (${report.date}):
          
          总支付笔数: ${report.totalPayments}
          总支付金额: ¥${report.totalAmount.toFixed(2)}
          活跃用户数: ${report.uniqueUsers}
          涉及账单数: ${report.uniqueBills}
          
          支付方式统计:
          ${report.paymentMethods.map(method => 
            `${method.payment_method}: ${method.count}笔, ¥${parseFloat(method.total_amount).toFixed(2)}`
          ).join('\n')}
        `;
        
        try {
          await notificationService.sendEmail({
            to: process.env.ADMIN_EMAIL,
            subject: `每日支付统计报告 - ${report.date}`,
            message: emailContent
          });
          
          console.log('支付统计报告已发送至管理员邮箱');
        } catch (emailError) {
          console.error('发送支付统计报告邮件失败:', emailError);
        }
      }
    } catch (error) {
      console.error('支付统计任务执行失败:', error);
    }
  }, {
    scheduled: false
  });
  
  task.start();
  scheduledTasks['paymentStats'] = task;
  console.log('支付统计任务已启动');
};

/**
 * 手动触发特定任务
 * @param {string} taskName - 任务名称
 * @returns {Object} 执行结果
 */
const triggerTask = async (taskName) => {
  console.log(`手动触发任务: ${taskName}`);
  
  try {
    switch (taskName) {
      case 'paymentReminder':
        // 执行支付提醒任务
        const pendingReminders = await paymentReminderService.getPendingReminders();
        if (pendingReminders && pendingReminders.length > 0) {
          const results = await paymentReminderService.sendPendingReminders(pendingReminders);
          return {
            success: true,
            message: `支付提醒任务执行完成，成功: ${results.successCount}, 失败: ${results.failureCount}`
          };
        } else {
          return {
            success: true,
            message: '没有待发送的支付提醒'
          };
        }
        
      case 'offlinePaymentSync':
        // 执行离线支付同步任务
        const pendingPayments = await offlinePaymentService.getPendingSyncPayments();
        if (pendingPayments && pendingPayments.length > 0) {
          let successCount = 0;
          let failureCount = 0;
          
          for (const payment of pendingPayments) {
            try {
              await offlinePaymentService.retryPaymentSync(payment.id);
              successCount++;
            } catch (error) {
              console.error(`同步离线支付记录失败 (ID: ${payment.id}):`, error);
              failureCount++;
            }
          }
          
          return {
            success: true,
            message: `离线支付同步完成，成功: ${successCount}, 失败: ${failureCount}`
          };
        } else {
          return {
            success: true,
            message: '没有待同步的离线支付记录'
          };
        }
        
      default:
        return {
          success: false,
          message: `未知的任务名称: ${taskName}`
        };
    }
  } catch (error) {
    console.error(`手动触发任务失败 (${taskName}):`, error);
    return {
      success: false,
      message: `任务执行失败: ${error.message}`
    };
  }
};

/**
 * 获取所有定时任务的状态
 * @returns {Object} 任务状态
 */
const getTasksStatus = () => {
  const status = {};
  
  Object.keys(scheduledTasks).forEach(taskName => {
    status[taskName] = {
      running: scheduledTasks[taskName] ? scheduledTasks[taskName].running : false
    };
  });
  
  return status;
};

module.exports = {
  startAllTasks,
  stopAllTasks,
  triggerTask,
  getTasksStatus
};