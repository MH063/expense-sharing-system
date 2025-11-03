/**
 * 支付流程优化控制器单元测试
 */

const paymentOptimizationController = require('../../controllers/payment-optimization-controller');
const offlinePaymentService = require('../../services/offline-payment-service');
const paymentReminderService = require('../../services/payment-reminder-service');
const paymentQueryService = require('../../services/payment-query-service');
const scheduler = require('../../utils/scheduler');

// 模拟服务
jest.mock('../../services/offline-payment-service');
jest.mock('../../services/payment-reminder-service');
jest.mock('../../services/payment-query-service');
jest.mock('../../utils/scheduler');

describe('支付流程优化控制器测试', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    // 模拟请求和响应对象
    mockReq = {
      user: { id: 1 },
      body: {},
      params: {},
      query: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('createOfflinePayment', () => {
    it('应该成功创建离线支付', async () => {
      // 准备测试数据
      mockReq.body = {
        billId: 1,
        userId: 1,
        amount: 100.50,
        paymentMethod: 'cash',
        description: '现金支付'
      };
      mockReq.user = { id: 1 };

      const mockResult = {
        success: true,
        data: {
          id: 1,
          billId: 1,
          userId: 1,
          amount: 100.50,
          paymentMethod: 'cash',
          status: 'pending'
        }
      };

      // 模拟服务返回结果
      offlinePaymentService.createOfflinePayment.mockResolvedValue(mockResult);

      // 调用函数
      await paymentOptimizationController.createOfflinePayment(mockReq, mockRes);

      // 验证结果
      expect(offlinePaymentService.createOfflinePayment).toHaveBeenCalledWith({
        billId: 1,
        userId: 1,
        amount: 100.50,
        paymentMethod: 'cash',
        description: '现金支付',
        createdBy: 1
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
        message: '离线支付记录创建成功'
      });
    });

    it('应该在缺少必要参数时返回错误', async () => {
      // 准备不完整的测试数据
      mockReq.body = {
        billId: 1,
        // 缺少 userId
        amount: 100.50,
        paymentMethod: 'cash'
      };

      // 模拟服务抛出错误
      offlinePaymentService.createOfflinePayment.mockRejectedValue(new Error('缺少必要参数'));

      // 调用函数
      await paymentOptimizationController.createOfflinePayment(mockReq, mockRes);

      // 验证结果
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: '缺少必要参数'
      });
    });

    it('应该在服务失败时返回错误', async () => {
      // 准备测试数据
      mockReq.body = {
        billId: 1,
        userId: 1,
        amount: 100.50,
        paymentMethod: 'cash'
      };

      // 模拟服务失败
      offlinePaymentService.createOfflinePayment.mockRejectedValue(new Error('服务错误'));

      // 调用函数
      await paymentOptimizationController.createOfflinePayment(mockReq, mockRes);

      // 验证结果
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: '创建离线支付记录失败',
        error: '服务错误'
      });
    });
  });

  describe('syncOfflinePayment', () => {
    it('应该成功同步离线支付', async () => {
      // 准备测试数据
      mockReq.params.paymentId = '1';
      mockReq.user = { id: 1 };

      const mockResult = {
        success: true,
        data: {
          id: 1,
          billId: 1,
          userId: 1,
          amount: 100.50,
          status: 'completed'
        }
      };

      // 模拟服务返回结果
      offlinePaymentService.syncOfflinePayment.mockResolvedValue(mockResult);

      // 调用函数
      await paymentOptimizationController.syncOfflinePayment(mockReq, mockRes);

      // 验证结果
      expect(offlinePaymentService.syncOfflinePayment).toHaveBeenCalledWith('1', 1);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
        message: '离线支付记录同步成功'
      });
    });

    it('应该在ID无效时返回错误', async () => {
      // 准备无效的ID
      mockReq.params.paymentId = null;

      // 调用函数
      await paymentOptimizationController.syncOfflinePayment(mockReq, mockRes);

      // 验证结果
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: '缺少支付记录ID'
      });
    });

    it('应该在支付记录不存在时返回错误', async () => {
      // 准备测试数据
      mockReq.params.paymentId = '999';

      // 模拟服务返回不存在的结果
      offlinePaymentService.syncOfflinePayment.mockResolvedValue({
        success: false,
        message: '支付记录不存在'
      });

      // 调用函数
      await paymentOptimizationController.syncOfflinePayment(mockReq, mockRes);

      // 验证结果
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: {
          success: false,
          message: '支付记录不存在'
        },
        message: '离线支付记录同步成功'
      });
    });
  });

  describe('getUserOfflinePayments', () => {
    it('应该成功获取用户离线支付记录', async () => {
      // 准备测试数据
      mockReq.params.userId = '1';
      mockReq.query = {
        page: 1,
        limit: 20,
        status: 'pending'
      };

      const mockResult = {
        success: true,
        data: {
          payments: [
            {
              id: 1,
              billId: 1,
              amount: 100.50,
              status: 'pending'
            }
          ],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1
        }
      };

      // 模拟服务返回结果
      offlinePaymentService.getUserOfflinePayments.mockResolvedValue(mockResult);

      // 调用函数
      await paymentOptimizationController.getUserOfflinePayments(mockReq, mockRes);

      // 验证结果
      expect(offlinePaymentService.getUserOfflinePayments).toHaveBeenCalledWith(
        '1',
        1,
        20,
        'pending'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });

    it('应该在用户ID无效时返回错误', async () => {
      // 准备无效的用户ID
      mockReq.params.userId = null;

      // 调用函数
      await paymentOptimizationController.getUserOfflinePayments(mockReq, mockRes);

      // 验证结果
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: '缺少用户ID'
      });
    });
  });

  describe('getPendingSyncPayments', () => {
    it('应该成功获取待同步的离线支付记录', async () => {
      // 准备测试数据
      mockReq.query = {
        page: 1,
        limit: 20
      };

      const mockResult = {
        success: true,
        data: {
          payments: [
            {
              id: 1,
              billId: 1,
              userId: 1,
              amount: 100.50,
              status: 'pending'
            }
          ],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1
        }
      };

      // 模拟服务返回结果
      offlinePaymentService.getPendingSyncPayments.mockResolvedValue(mockResult);

      // 调用函数
      await paymentOptimizationController.getPendingSyncPayments(mockReq, mockRes);

      // 验证结果
      expect(offlinePaymentService.getPendingSyncPayments).toHaveBeenCalledWith(1, 20);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });
  });

  describe('createPaymentReminder', () => {
    it('应该成功创建支付提醒', async () => {
      // 准备测试数据
      mockReq.body = {
        billId: 1,
        userId: 1,
        reminderTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        reminderType: 'email',
        message: '请及时支付账单'
      };
      mockReq.user = { id: 1 };

      const mockResult = {
        id: 1,
        billId: 1,
        userId: 1,
        reminderTime: mockReq.body.reminderTime,
        reminderType: 'email',
        status: 'pending'
      };

      // 模拟服务返回结果
      paymentReminderService.createPaymentReminder.mockResolvedValue(mockResult);

      // 调用函数
      await paymentOptimizationController.createPaymentReminder(mockReq, mockRes);

      // 验证结果
      expect(paymentReminderService.createPaymentReminder).toHaveBeenCalledWith({
        billId: 1,
        userId: 1,
        reminderTime: mockReq.body.reminderTime,
        reminderType: 'email',
        message: '请及时支付账单',
        createdBy: 1
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult,
        message: '支付提醒创建成功'
      });
    });

    it('应该在缺少必要参数时返回错误', async () => {
      // 准备不完整的测试数据
      mockReq.body = {
        billId: 1,
        // 缺少 userId
        reminderTime: new Date().toISOString(),
        reminderType: 'email'
      };

      // 模拟服务抛出错误
      paymentReminderService.createPaymentReminder.mockRejectedValue(new Error('缺少必要参数'));

      // 调用函数
      await paymentOptimizationController.createPaymentReminder(mockReq, mockRes);

      // 验证结果
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: '缺少必要参数'
      });
    });
  });

  describe('getUserPaymentReminders', () => {
    it('应该成功获取用户支付提醒列表', async () => {
      // 准备测试数据
      mockReq.params.userId = '1';
      mockReq.query = {
        page: 1,
        limit: 20,
        status: 'pending'
      };

      const mockResult = {
        success: true,
        data: {
          reminders: [
            {
              id: 1,
              billId: 1,
              reminderTime: new Date(),
              reminderType: 'email',
              status: 'pending'
            }
          ],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1
        }
      };

      // 模拟服务返回结果
      paymentReminderService.getUserPaymentReminders.mockResolvedValue(mockResult);

      // 调用函数
      await paymentOptimizationController.getUserPaymentReminders(mockReq, mockRes);

      // 验证结果
      expect(paymentReminderService.getUserPaymentReminders).toHaveBeenCalledWith(
        '1',
        1,
        20,
        'pending'
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });
  });

  describe('getPaymentRecords', () => {
    it('应该成功获取支付记录列表', async () => {
      // 准备测试数据
      mockReq.query = {
        page: 1,
        limit: 20,
        billId: 1,
        userId: 1
      };

      const mockResult = {
        success: true,
        data: {
          payments: [
            {
              id: 1,
              billId: 1,
              userId: 1,
              amount: 100.50,
              status: 'completed'
            }
          ],
          total: 1,
          page: 1,
          limit: 20,
          totalPages: 1
        }
      };

      // 模拟服务返回结果
      paymentQueryService.getPaymentRecords.mockResolvedValue(mockResult);

      // 调用函数
      await paymentOptimizationController.getPaymentRecords(mockReq, mockRes);

      // 验证结果
      expect(paymentQueryService.getPaymentRecords).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        billId: 1,
        userId: 1
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });
  });

  describe('getPaymentRecordById', () => {
    it('应该成功获取支付记录详情', async () => {
      // 准备测试数据
      mockReq.params.paymentId = '1';

      const mockResult = {
        id: 1,
        billId: 1,
        userId: 1,
        amount: 100.50,
        status: 'completed'
      };

      // 模拟服务返回结果
      paymentQueryService.getPaymentRecordById.mockResolvedValue(mockResult);

      // 调用函数
      await paymentOptimizationController.getPaymentRecordById(mockReq, mockRes);

      // 验证结果
      expect(paymentQueryService.getPaymentRecordById).toHaveBeenCalledWith('1');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });

    it('应该在支付记录不存在时返回404', async () => {
      // 准备测试数据
      mockReq.params.paymentId = 'nonExistentPaymentId';

      // 模拟服务返回null
      paymentQueryService.getPaymentRecordById.mockResolvedValue(null);

      // 调用函数
      await paymentOptimizationController.getPaymentRecordById(mockReq, mockRes);

      // 验证结果
      expect(paymentQueryService.getPaymentRecordById).toHaveBeenCalledWith('nonExistentPaymentId');
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: '支付记录不存在'
      });
    });
  });

  describe('getUserPaymentStats', () => {
    it('应该成功获取用户支付统计', async () => {
      // 准备测试数据
      mockReq.params.userId = '1';
      mockReq.query.startDate = '2023-01-01';
      mockReq.query.endDate = '2023-12-31';

      const mockResult = {
        totalPayments: 10,
        totalAmount: 1000,
        completedPayments: 8,
        completedAmount: 800,
        pendingPayments: 2,
        pendingAmount: 200,
        failedPayments: 0,
        failedAmount: 0,
        paymentMethods: {
          'alipay': { count: 5, amount: 500 },
          'wechat': { count: 5, amount: 500 }
        },
        monthlyStats: [
          { month: '2023-01', count: 5, amount: 500 },
          { month: '2023-02', count: 5, amount: 500 }
        ]
      };

      // 模拟服务返回结果
      paymentQueryService.getUserPaymentStats.mockResolvedValue(mockResult);

      // 调用函数
      await paymentOptimizationController.getUserPaymentStats(mockReq, mockRes);

      // 验证结果
      expect(paymentQueryService.getUserPaymentStats).toHaveBeenCalledWith({
        userId: '1',
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });
  });

  describe('getRoomPaymentStats', () => {
    it('应该成功获取房间支付统计', async () => {
      // 准备测试数据
      mockReq.params.roomId = '1';
      mockReq.query.startDate = '2023-01-01';
      mockReq.query.endDate = '2023-12-31';

      const mockResult = {
        totalPayments: 20,
        totalAmount: 2000,
        completedPayments: 18,
        completedAmount: 1800,
        pendingPayments: 2,
        pendingAmount: 200,
        failedPayments: 0,
        failedAmount: 0,
        userStats: [
          { userId: '1', name: '用户1', email: 'user1@example.com', count: 10, amount: 1000 },
          { userId: '2', name: '用户2', email: 'user2@example.com', count: 10, amount: 1000 }
        ],
        monthlyStats: [
          { month: '2023-01', count: 10, amount: 1000 },
          { month: '2023-02', count: 10, amount: 1000 }
        ]
      };

      // 模拟服务返回结果
      paymentQueryService.getRoomPaymentStats.mockResolvedValue(mockResult);

      // 调用函数
      await paymentOptimizationController.getRoomPaymentStats(mockReq, mockRes);

      // 验证结果
      expect(paymentQueryService.getRoomPaymentStats).toHaveBeenCalledWith({
        roomId: '1',
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      });
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });
  });

  describe('triggerTask', () => {
    it('应该成功触发定时任务', async () => {
      // 准备测试数据
      mockReq.params.taskName = 'paymentReminderCheck';

      const mockResult = {
        success: true,
        message: '任务 paymentReminderCheck 触发成功',
        result: {
          success: true,
          message: '任务执行成功'
        }
      };

      // 模拟服务返回结果
      scheduler.triggerTask.mockResolvedValue(mockResult);

      // 调用函数
      await paymentOptimizationController.triggerTask(mockReq, mockRes);

      // 验证结果
      expect(scheduler.triggerTask).toHaveBeenCalledWith('paymentReminderCheck');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });

    it('应该在任务不存在时返回错误', async () => {
      // 准备测试数据
      mockReq.params.taskName = 'nonExistentTask';

      const mockResult = {
        success: false,
        message: '未知的任务名称: nonExistentTask'
      };

      // 模拟服务返回结果
      scheduler.triggerTask.mockResolvedValue(mockResult);

      // 调用函数
      await paymentOptimizationController.triggerTask(mockReq, mockRes);

      // 验证结果
      expect(scheduler.triggerTask).toHaveBeenCalledWith('nonExistentTask');
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });
  });

  describe('getTaskStatus', () => {
    it('应该成功获取任务状态', async () => {
      const mockResult = {
        paymentReminder: {
          running: true
        },
        offlinePaymentSync: {
          running: true
        },
        cleanupExpiredReminders: {
          running: true
        },
        paymentStats: {
          running: true
        }
      };

      // 模拟服务返回结果
      jest.spyOn(scheduler, 'getTasksStatus').mockReturnValue(mockResult);

      // 调用函数
      await paymentOptimizationController.getTaskStatus(mockReq, mockRes);

      // 验证结果
      expect(scheduler.getTasksStatus).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockResult
      });
    });
  });
});