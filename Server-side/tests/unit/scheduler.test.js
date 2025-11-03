/**
 * 定时任务服务单元测试
 */

const scheduler = require('../../utils/scheduler');
const offlinePaymentService = require('../../services/offline-payment-service');
const paymentReminderService = require('../../services/payment-reminder-service');
const paymentQueryService = require('../../services/payment-query-service');

// 模拟服务
jest.mock('../../services/offline-payment-service');
jest.mock('../../services/payment-reminder-service');
jest.mock('../../services/payment-query-service');

describe('定时任务服务测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 清除所有定时任务
    scheduler.stopAllTasks();
  });

  afterEach(() => {
    // 确保测试后清除所有定时任务
    scheduler.stopAllTasks();
  });

  describe('startAllTasks', () => {
    it('应该成功启动所有定时任务', () => {
      // 调用函数
      const result = scheduler.startAllTasks();

      // 验证结果
      expect(result).toEqual({
        success: true,
        message: '所有定时任务已启动',
        tasks: expect.arrayContaining([
          'paymentReminderCheck',
          'offlinePaymentSync',
          'cleanupExpiredReminders',
          'generatePaymentStats'
        ])
      });
    });

    it('应该在任务已启动时返回相应消息', () => {
      // 启动任务
      scheduler.startAllTasks();

      // 再次启动任务
      const result = scheduler.startAllTasks();

      // 验证结果
      expect(result).toEqual({
        success: true,
        message: '所有定时任务已启动',
        tasks: expect.arrayContaining([
          'paymentReminderCheck',
          'offlinePaymentSync',
          'cleanupExpiredReminders',
          'generatePaymentStats'
        ])
      });
    });
  });

  describe('stopAllTasks', () => {
    it('应该成功停止所有定时任务', () => {
      // 先启动任务
      scheduler.startAllTasks();

      // 调用函数
      const result = scheduler.stopAllTasks();

      // 验证结果
      expect(result).toEqual({
        success: true,
        message: '所有定时任务已停止'
      });
    });

    it('应该在任务未启动时返回相应消息', () => {
      // 调用函数
      const result = scheduler.stopAllTasks();

      // 验证结果
      expect(result).toEqual({
        success: true,
        message: '所有定时任务已停止'
      });
    });
  });

  describe('checkPaymentReminders', () => {
    it('应该成功检查并发送支付提醒', async () => {
      // 模拟获取待发送提醒
      const mockReminders = [
        { id: 1, billId: 1, userId: 1, reminderType: 'email' },
        { id: 2, billId: 2, userId: 2, reminderType: 'sms' }
      ];
      paymentReminderService.getPendingReminders.mockResolvedValue(mockReminders);

      // 模拟发送提醒成功
      paymentReminderService.sendPendingReminders.mockResolvedValue({
        successCount: 2,
        failureCount: 0
      });

      // 调用函数
      const result = await scheduler.checkPaymentReminders();

      // 验证结果
      expect(paymentReminderService.getPendingReminders).toHaveBeenCalled();
      expect(paymentReminderService.sendPendingReminders).toHaveBeenCalledWith(mockReminders);
      expect(result).toEqual({
        success: true,
        message: '支付提醒检查完成',
        stats: {
          total: 2,
          success: 2,
          failure: 0
        }
      });
    });

    it('应该处理没有待发送提醒的情况', async () => {
      // 模拟没有待发送提醒
      paymentReminderService.getPendingReminders.mockResolvedValue([]);

      // 调用函数
      const result = await scheduler.checkPaymentReminders();

      // 验证结果
      expect(paymentReminderService.getPendingReminders).toHaveBeenCalled();
      expect(paymentReminderService.sendPendingReminders).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: '支付提醒检查完成',
        stats: {
          total: 0,
          success: 0,
          failure: 0
        }
      });
    });

    it('应该处理发送提醒失败的情况', async () => {
      // 模拟获取待发送提醒
      const mockReminders = [
        { id: 1, billId: 1, userId: 1, reminderType: 'email' }
      ];
      paymentReminderService.getPendingReminders.mockResolvedValue(mockReminders);

      // 模拟发送提醒失败
      paymentReminderService.sendPendingReminders.mockResolvedValue({
        successCount: 0,
        failureCount: 1
      });

      // 调用函数
      const result = await scheduler.checkPaymentReminders();

      // 验证结果
      expect(paymentReminderService.getPendingReminders).toHaveBeenCalled();
      expect(paymentReminderService.sendPendingReminders).toHaveBeenCalledWith(mockReminders);
      expect(result).toEqual({
        success: true,
        message: '支付提醒检查完成',
        stats: {
          total: 1,
          success: 0,
          failure: 1
        }
      });
    });

    it('应该处理获取提醒失败的情况', async () => {
      // 模拟获取提醒失败
      paymentReminderService.getPendingReminders.mockRejectedValue(new Error('获取提醒失败'));

      // 调用函数
      const result = await scheduler.checkPaymentReminders();

      // 验证结果
      expect(paymentReminderService.getPendingReminders).toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: '支付提醒检查失败: 获取提醒失败'
      });
    });
  });

  describe('syncOfflinePayments', () => {
    it('应该成功同步离线支付', async () => {
      // 模拟获取待同步支付
      const mockPayments = [
        { id: 1, billId: 1, userId: 1, amount: 100.50 },
        { id: 2, billId: 2, userId: 2, amount: 200.00 }
      ];
      offlinePaymentService.getPendingSyncPayments.mockResolvedValue(mockPayments);

      // 模拟同步支付成功
      offlinePaymentService.syncOfflinePayment
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true });

      // 调用函数
      const result = await scheduler.syncOfflinePayments();

      // 验证结果
      expect(offlinePaymentService.getPendingSyncPayments).toHaveBeenCalled();
      expect(offlinePaymentService.syncOfflinePayment).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        success: true,
        message: '离线支付同步完成',
        stats: {
          total: 2,
          success: 2,
          failure: 0
        }
      });
    });

    it('应该处理没有待同步支付的情况', async () => {
      // 模拟没有待同步支付
      offlinePaymentService.getPendingSyncPayments.mockResolvedValue([]);

      // 调用函数
      const result = await scheduler.syncOfflinePayments();

      // 验证结果
      expect(offlinePaymentService.getPendingSyncPayments).toHaveBeenCalled();
      expect(offlinePaymentService.syncOfflinePayment).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: '离线支付同步完成',
        stats: {
          total: 0,
          success: 0,
          failure: 0
        }
      });
    });

    it('应该处理部分同步失败的情况', async () => {
      // 模拟获取待同步支付
      const mockPayments = [
        { id: 1, billId: 1, userId: 1, amount: 100.50 },
        { id: 2, billId: 2, userId: 2, amount: 200.00 }
      ];
      offlinePaymentService.getPendingSyncPayments.mockResolvedValue(mockPayments);

      // 模拟同步支付，一个成功一个失败
      offlinePaymentService.syncOfflinePayment
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false });

      // 调用函数
      const result = await scheduler.syncOfflinePayments();

      // 验证结果
      expect(offlinePaymentService.getPendingSyncPayments).toHaveBeenCalled();
      expect(offlinePaymentService.syncOfflinePayment).toHaveBeenCalledTimes(2);
      expect(result).toEqual({
        success: true,
        message: '离线支付同步完成',
        stats: {
          total: 2,
          success: 1,
          failure: 1
        }
      });
    });

    it('应该处理获取待同步支付失败的情况', async () => {
      // 模拟获取待同步支付失败
      offlinePaymentService.getPendingSyncPayments.mockRejectedValue(new Error('获取支付失败'));

      // 调用函数
      const result = await scheduler.syncOfflinePayments();

      // 验证结果
      expect(offlinePaymentService.getPendingSyncPayments).toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: '离线支付同步失败: 获取支付失败'
      });
    });
  });

  describe('cleanupExpiredReminders', () => {
    it('应该成功清理过期提醒', async () => {
      // 模拟获取过期提醒
      const mockExpiredReminders = [
        { id: 1, billId: 1, userId: 1 },
        { id: 2, billId: 2, userId: 2 }
      ];

      // 模拟数据库查询
      const mockQuery = jest.fn();
      global.query = mockQuery;
      mockQuery.mockResolvedValue({ rows: mockExpiredReminders });

      // 调用函数
      const result = await scheduler.cleanupExpiredReminders();

      // 验证结果
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payment_reminders'),
        expect.arrayContaining(['expired'])
      );
      expect(result).toEqual({
        success: true,
        message: '过期提醒清理完成',
        count: 2
      });
    });

    it('应该处理没有过期提醒的情况', async () => {
      // 模拟没有过期提醒
      const mockQuery = jest.fn();
      global.query = mockQuery;
      mockQuery.mockResolvedValue({ rows: [] });

      // 调用函数
      const result = await scheduler.cleanupExpiredReminders();

      // 验证结果
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE payment_reminders'),
        expect.arrayContaining(['expired'])
      );
      expect(result).toEqual({
        success: true,
        message: '过期提醒清理完成',
        count: 0
      });
    });

    it('应该处理清理过期提醒失败的情况', async () => {
      // 模拟数据库查询失败
      const mockQuery = jest.fn();
      global.query = mockQuery;
      mockQuery.mockRejectedValue(new Error('数据库连接失败'));

      // 调用函数
      const result = await scheduler.cleanupExpiredReminders();

      // 验证结果
      expect(mockQuery).toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: '过期提醒清理失败: 数据库连接失败'
      });
    });
  });

  describe('generatePaymentStats', () => {
    it('应该成功生成支付统计报告', async () => {
      // 模拟获取支付记录
      const mockPayments = {
        rows: [
          { id: 1, amount: 100.50, status: 'completed', payment_method: 'alipay' },
          { id: 2, amount: 200.00, status: 'completed', payment_method: 'wechat' },
          { id: 3, amount: 50.00, status: 'pending', payment_method: 'alipay' }
        ],
        count: 3
      };
      paymentQueryService.getPaymentRecords.mockResolvedValue(mockPayments);

      // 模拟数据库查询
      const mockQuery = jest.fn();
      global.query = mockQuery;
      mockQuery.mockResolvedValue({ rows: [] });

      // 调用函数
      const result = await scheduler.generatePaymentStats();

      // 验证结果
      expect(paymentQueryService.getPaymentRecords).toHaveBeenCalled();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payment_stats'),
        expect.any(Array)
      );
      expect(result).toEqual({
        success: true,
        message: '支付统计报告生成完成',
        stats: {
          totalPayments: 3,
          totalAmount: 350.50,
          completedPayments: 2,
          completedAmount: 300.50,
          pendingPayments: 1,
          pendingAmount: 50.00,
          paymentMethods: {
            alipay: 2,
            wechat: 1
          }
        }
      });
    });

    it('应该处理没有支付记录的情况', async () => {
      // 模拟没有支付记录
      const mockPayments = {
        rows: [],
        count: 0
      };
      paymentQueryService.getPaymentRecords.mockResolvedValue(mockPayments);

      // 模拟数据库查询
      const mockQuery = jest.fn();
      global.query = mockQuery;
      mockQuery.mockResolvedValue({ rows: [] });

      // 调用函数
      const result = await scheduler.generatePaymentStats();

      // 验证结果
      expect(paymentQueryService.getPaymentRecords).toHaveBeenCalled();
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO payment_stats'),
        expect.any(Array)
      );
      expect(result).toEqual({
        success: true,
        message: '支付统计报告生成完成',
        stats: {
          totalPayments: 0,
          totalAmount: 0,
          completedPayments: 0,
          completedAmount: 0,
          pendingPayments: 0,
          pendingAmount: 0,
          paymentMethods: {}
        }
      });
    });

    it('应该处理生成支付统计失败的情况', async () => {
      // 模拟获取支付记录失败
      paymentQueryService.getPaymentRecords.mockRejectedValue(new Error('获取支付记录失败'));

      // 调用函数
      const result = await scheduler.generatePaymentStats();

      // 验证结果
      expect(paymentQueryService.getPaymentRecords).toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: '支付统计报告生成失败: 获取支付记录失败'
      });
    });
  });

  describe('getTaskStatus', () => {
    it('应该返回所有任务状态', () => {
      // 启动任务
      scheduler.startAllTasks();

      // 调用函数
      const result = scheduler.getTaskStatus();

      // 验证结果
      expect(result).toEqual({
        success: true,
        message: '获取任务状态成功',
        tasks: expect.objectContaining({
          paymentReminderCheck: expect.objectContaining({
            name: 'paymentReminderCheck',
            interval: expect.any(Number),
            running: true
          }),
          offlinePaymentSync: expect.objectContaining({
            name: 'offlinePaymentSync',
            interval: expect.any(Number),
            running: true
          }),
          cleanupExpiredReminders: expect.objectContaining({
            name: 'cleanupExpiredReminders',
            interval: expect.any(Number),
            running: true
          }),
          generatePaymentStats: expect.objectContaining({
            name: 'generatePaymentStats',
            interval: expect.any(Number),
            running: true
          })
        })
      });
    });

    it('应该在任务未启动时返回相应状态', () => {
      // 调用函数
      const result = scheduler.getTaskStatus();

      // 验证结果
      expect(result).toEqual({
        success: true,
        message: '获取任务状态成功',
        tasks: expect.objectContaining({
          paymentReminderCheck: expect.objectContaining({
            name: 'paymentReminderCheck',
            interval: expect.any(Number),
            running: false
          }),
          offlinePaymentSync: expect.objectContaining({
            name: 'offlinePaymentSync',
            interval: expect.any(Number),
            running: false
          }),
          cleanupExpiredReminders: expect.objectContaining({
            name: 'cleanupExpiredReminders',
            interval: expect.any(Number),
            running: false
          }),
          generatePaymentStats: expect.objectContaining({
            name: 'generatePaymentStats',
            interval: expect.any(Number),
            running: false
          })
        })
      });
    });
  });

  describe('triggerTask', () => {
    it('应该成功触发指定任务', async () => {
      // 模拟任务函数
      const mockTaskFunction = jest.fn().mockResolvedValue({
        success: true,
        message: '任务执行成功'
      });

      // 设置任务函数
      scheduler.tasks.paymentReminderCheck.task = mockTaskFunction;

      // 调用函数
      const result = await scheduler.triggerTask('paymentReminderCheck');

      // 验证结果
      expect(mockTaskFunction).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: '任务 paymentReminderCheck 触发成功',
        result: {
          success: true,
          message: '任务执行成功'
        }
      });
    });

    it('应该在任务不存在时返回错误', async () => {
      // 调用函数
      const result = await scheduler.triggerTask('nonExistentTask');

      // 验证结果
      expect(result).toEqual({
        success: false,
        message: '任务 nonExistentTask 不存在'
      });
    });

    it('应该处理任务执行失败的情况', async () => {
      // 模拟任务函数执行失败
      const mockTaskFunction = jest.fn().mockRejectedValue(new Error('任务执行失败'));

      // 设置任务函数
      scheduler.tasks.paymentReminderCheck.task = mockTaskFunction;

      // 调用函数
      const result = await scheduler.triggerTask('paymentReminderCheck');

      // 验证结果
      expect(mockTaskFunction).toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: '任务 paymentReminderCheck 执行失败: 任务执行失败'
      });
    });
  });
});