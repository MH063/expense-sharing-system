/**
 * 离线支付服务单元测试
 */

const offlinePaymentService = require('../../services/offline-payment-service');
const { Payment, Bill, User } = require('../../models');

// 模拟数据库查询
jest.mock('../../models', () => ({
  Payment: {
    create: jest.fn(),
    findByPk: jest.fn(),
    findAndCountAll: jest.fn(),
    update: jest.fn()
  },
  Bill: {
    findByPk: jest.fn()
  },
  User: {
    findByPk: jest.fn()
  }
}));

describe('离线支付服务测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createOfflinePayment', () => {
    it('应该成功创建离线支付记录', async () => {
      // 准备测试数据
      const paymentData = {
        billId: 1,
        userId: 1,
        amount: 100.50,
        paymentMethod: 'cash',
        note: '测试支付',
        deviceId: 'device123'
      };

      const mockBill = { id: 1, title: '测试账单' };
      const mockUser = { id: 1, name: '测试用户' };
      const mockPayment = {
        id: 'payment-uuid',
        billId: paymentData.billId,
        userId: paymentData.userId,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        note: paymentData.note,
        status: 'offline_pending',
        syncStatus: 'pending',
        createdAt: new Date()
      };

      // 模拟数据库查询返回结果
      Bill.findByPk.mockResolvedValue(mockBill);
      User.findByPk.mockResolvedValue(mockUser);
      Payment.create.mockResolvedValue(mockPayment);

      // 调用函数
      const result = await offlinePaymentService.createOfflinePayment(paymentData);

      // 验证结果
      expect(Bill.findByPk).toHaveBeenCalledWith(paymentData.billId);
      expect(User.findByPk).toHaveBeenCalledWith(paymentData.userId);
      expect(Payment.create).toHaveBeenCalledWith(expect.objectContaining({
        billId: paymentData.billId,
        userId: paymentData.userId,
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        note: paymentData.note,
        deviceId: paymentData.deviceId,
        isOffline: true,
        syncStatus: 'pending'
      }));

      expect(result).toEqual(mockPayment);
    });

    it('应该在缺少必要参数时抛出错误', async () => {
      // 准备不完整的测试数据
      const incompleteData = {
        billId: 1,
        // 缺少 userId
        amount: 100.50,
        paymentMethod: 'cash'
      };

      // 验证函数抛出错误
      await expect(offlinePaymentService.createOfflinePayment(incompleteData))
        .rejects.toThrow('缺少必要参数');
    });

    it('应该在账单不存在时抛出错误', async () => {
      // 准备测试数据
      const paymentData = {
        billId: 999,
        userId: 1,
        amount: 100.50,
        paymentMethod: 'cash',
        deviceId: 'device123'
      };

      // 模拟账单不存在
      Bill.findByPk.mockResolvedValue(null);

      // 验证函数抛出错误
      await expect(offlinePaymentService.createOfflinePayment(paymentData))
        .rejects.toThrow('账单不存在');
    });

    it('应该在用户不存在时抛出错误', async () => {
      // 准备测试数据
      const paymentData = {
        billId: 1,
        userId: 999,
        amount: 100.50,
        paymentMethod: 'cash',
        deviceId: 'device123'
      };

      // 模拟账单存在但用户不存在
      Bill.findByPk.mockResolvedValue({ id: 1, title: '测试账单' });
      User.findByPk.mockResolvedValue(null);

      // 验证函数抛出错误
      await expect(offlinePaymentService.createOfflinePayment(paymentData))
        .rejects.toThrow('用户不存在');
    });
  });

  describe('syncOfflinePayment', () => {
    it('应该成功同步离线支付记录', async () => {
      // 准备测试数据
      const paymentId = 'payment-uuid';
      const syncData = { transactionId: 'txn_123', receipt: 'receipt_data' };

      const mockPayment = {
        id: paymentId,
        billId: 1,
        userId: 1,
        amount: 100.50,
        paymentMethod: 'cash',
        status: 'offline_pending',
        syncStatus: 'pending',
        update: jest.fn().mockResolvedValue({
          id: paymentId,
          status: 'completed',
          transactionId: syncData.transactionId,
          receipt: syncData.receipt,
          isOffline: false,
          syncedAt: new Date(),
          syncStatus: 'completed',
          updatedAt: new Date()
        })
      };

      // 模拟数据库查询返回结果
      Payment.findByPk.mockResolvedValue(mockPayment);

      // 调用函数
      const result = await offlinePaymentService.syncOfflinePayment(paymentId, syncData);

      // 验证结果
      expect(Payment.findByPk).toHaveBeenCalledWith(paymentId);
      expect(mockPayment.update).toHaveBeenCalledWith({
        status: 'completed',
        transactionId: syncData.transactionId,
        receipt: syncData.receipt,
        isOffline: false,
        syncedAt: expect.any(Date),
        syncStatus: 'completed',
        updatedAt: expect.any(Date)
      });

      expect(result.status).toBe('completed');
      expect(result.transactionId).toBe(syncData.transactionId);
    });

    it('应该在支付记录不存在时抛出错误', async () => {
      // 准备测试数据
      const paymentId = 'nonexistent-payment';
      const syncData = { transactionId: 'txn_123' };

      // 模拟数据库查询返回空结果
      Payment.findByPk.mockResolvedValue(null);

      // 验证函数抛出错误
      await expect(offlinePaymentService.syncOfflinePayment(paymentId, syncData))
        .rejects.toThrow('支付记录不存在');
    });

    it('应该在支付记录状态不正确时抛出错误', async () => {
      // 准备测试数据
      const paymentId = 'payment-uuid';
      const syncData = { transactionId: 'txn_123' };

      const mockPayment = {
        id: paymentId,
        status: 'completed', // 不是offline_pending状态
        syncStatus: 'completed'
      };

      // 模拟数据库查询返回结果
      Payment.findByPk.mockResolvedValue(mockPayment);

      // 验证函数抛出错误
      await expect(offlinePaymentService.syncOfflinePayment(paymentId, syncData))
        .rejects.toThrow('只能同步离线待同步状态的支付记录');
    });
  });

  describe('getUserOfflinePayments', () => {
    it('应该成功获取用户离线支付记录', async () => {
      // 准备测试数据
      const userId = 1;
      const options = {
        status: 'pending',
        page: 1,
        pageSize: 10
      };

      const mockPayments = [
        {
          id: 'payment-uuid-1',
          billId: 1,
          userId: userId,
          amount: 100.50,
          paymentMethod: 'cash',
          status: 'pending',
          isOffline: true,
          bill: { id: 1, title: '测试账单1', amount: 100.50, status: 'pending' }
        },
        {
          id: 'payment-uuid-2',
          billId: 2,
          userId: userId,
          amount: 200.00,
          paymentMethod: 'alipay',
          status: 'pending',
          isOffline: true,
          bill: { id: 2, title: '测试账单2', amount: 200.00, status: 'pending' }
        }
      ];

      // 模拟数据库查询返回结果
      Payment.findAndCountAll.mockResolvedValue({
        count: 2,
        rows: mockPayments
      });

      // 调用函数
      const result = await offlinePaymentService.getUserOfflinePayments(userId, options);

      // 验证结果
      expect(Payment.findAndCountAll).toHaveBeenCalledWith({
        where: {
          userId,
          isOffline: true,
          status: 'pending'
        },
        include: [
          {
            model: Bill,
            as: 'bill',
            attributes: ['id', 'title', 'amount', 'status']
          }
        ],
        order: [['createdAt', 'DESC']],
        offset: 0,
        limit: 10
      });

      expect(result).toEqual({
        items: mockPayments,
        total: 2,
        page: 1,
        pageSize: 10,
        totalPages: 1
      });
    });

    it('应该在用户ID无效时抛出错误', async () => {
      // 准备测试数据
      const invalidUserId = null;

      // 模拟Payment.findAndCountAll在userId为null时抛出错误
      Payment.findAndCountAll.mockRejectedValue(new Error('Cannot read properties of null (reading \'isOffline\')'));

      // 验证函数抛出错误
      await expect(offlinePaymentService.getUserOfflinePayments(invalidUserId))
        .rejects.toThrow('Cannot read properties of null (reading \'isOffline\')');
    });
  });

  describe('getPendingSyncPayments', () => {
    it('应该成功获取待同步的离线支付记录', async () => {
      // 准备测试数据
      const options = {
        page: 1,
        pageSize: 10
      };

      const mockPayments = [
        {
          id: 'payment-uuid-1',
          billId: 1,
          userId: 1,
          amount: 100.50,
          paymentMethod: 'cash',
          status: 'pending',
          isOffline: true,
          syncStatus: 'pending',
          bill: { id: 1, title: '测试账单1', amount: 100.50, status: 'pending' },
          user: { id: 1, name: '测试用户1', email: 'user1@example.com' }
        }
      ];

      // 模拟数据库查询返回结果
      Payment.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: mockPayments
      });

      // 调用函数
      const result = await offlinePaymentService.getPendingSyncPayments(options);

      // 验证结果
      expect(Payment.findAndCountAll).toHaveBeenCalledWith({
        where: {
          isOffline: true,
          syncStatus: 'pending'
        },
        include: [
          {
            model: Bill,
            as: 'bill',
            attributes: ['id', 'title', 'amount', 'status']
          },
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          }
        ],
        order: [['createdAt', 'ASC']],
        offset: 0,
        limit: 10
      });

      expect(result).toEqual({
        items: mockPayments,
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1
      });
    });
  });

  describe('markPaymentSyncFailed', () => {
    it('应该成功标记支付同步失败', async () => {
      // 准备测试数据
      const paymentId = 'payment-uuid';
      const errorMessage = '网络连接失败';

      const mockPayment = {
        id: paymentId,
        status: 'pending',
        syncStatus: 'pending',
        update: jest.fn().mockResolvedValue({
          id: paymentId,
          syncStatus: 'failed',
          syncFailureReason: errorMessage,
          updatedAt: new Date()
        })
      };

      // 模拟数据库查询返回结果
      Payment.findByPk.mockResolvedValue(mockPayment);

      // 调用函数
      const result = await offlinePaymentService.markPaymentSyncFailed(paymentId, errorMessage);

      // 验证结果
      expect(Payment.findByPk).toHaveBeenCalledWith(paymentId);
      expect(mockPayment.update).toHaveBeenCalledWith({
        syncStatus: 'failed',
        syncFailureReason: errorMessage,
        updatedAt: expect.any(Date)
      });

      expect(result.syncStatus).toBe('failed');
      expect(result.syncFailureReason).toBe(errorMessage);
    });

    it('应该在支付记录不存在时抛出错误', async () => {
      // 准备测试数据
      const paymentId = 'nonexistent-payment';
      const errorMessage = '网络连接失败';

      // 模拟数据库查询返回空结果
      Payment.findByPk.mockResolvedValue(null);

      // 验证函数抛出错误
      await expect(offlinePaymentService.markPaymentSyncFailed(paymentId, errorMessage))
        .rejects.toThrow('支付记录不存在');
    });

    it('应该在支付记录状态不正确时抛出错误', async () => {
      // 准备测试数据
      const paymentId = 'payment-uuid';
      const errorMessage = '网络连接失败';

      const mockPayment = {
        id: paymentId,
        status: 'completed',
        syncStatus: 'completed' // 不是pending状态
      };

      // 模拟数据库查询返回结果
      Payment.findByPk.mockResolvedValue(mockPayment);

      // 验证函数抛出错误
      await expect(offlinePaymentService.markPaymentSyncFailed(paymentId, errorMessage))
        .rejects.toThrow('只能标记待同步状态的支付记录');
    });
  });

  describe('retryPaymentSync', () => {
    it('应该成功重试同步失败的支付记录', async () => {
      // 准备测试数据
      const paymentId = 'payment-uuid';

      const mockPayment = {
        id: paymentId,
        billId: 1,
        userId: 1,
        amount: 100.50,
        paymentMethod: 'cash',
        status: 'pending',
        syncStatus: 'failed',
        syncFailureReason: '网络连接失败',
        update: jest.fn().mockResolvedValue({
          id: paymentId,
          billId: 1,
          userId: 1,
          amount: 100.50,
          paymentMethod: 'cash',
          status: 'pending',
          syncStatus: 'pending', // 状态应该更新为pending
          syncFailureReason: null, // 失败原因应该被清除
          updatedAt: new Date()
        })
      };

      // 模拟数据库查询返回结果
      Payment.findByPk.mockResolvedValue(mockPayment);

      // 调用函数
      const result = await offlinePaymentService.retryPaymentSync(paymentId);

      // 验证结果
      expect(Payment.findByPk).toHaveBeenCalledWith(paymentId);
      expect(mockPayment.update).toHaveBeenCalledWith({
        syncStatus: 'pending',
        syncFailureReason: null,
        updatedAt: expect.any(Date)
      });

      expect(result.syncStatus).toBe('pending');
      expect(result.syncFailureReason).toBeNull();
    });

    it('应该在支付记录不存在时抛出错误', async () => {
      // 准备测试数据
      const paymentId = 'nonexistent-payment';

      // 模拟数据库查询返回空结果
      Payment.findByPk.mockResolvedValue(null);

      // 验证函数抛出错误
      await expect(offlinePaymentService.retryPaymentSync(paymentId))
        .rejects.toThrow('支付记录不存在');
    });

    it('应该在支付记录状态不正确时抛出错误', async () => {
      // 准备测试数据
      const paymentId = 'payment-uuid';

      const mockPayment = {
        id: paymentId,
        status: 'pending',
        syncStatus: 'pending' // 不是failed状态
      };

      // 模拟数据库查询返回结果
      Payment.findByPk.mockResolvedValue(mockPayment);

      // 验证函数抛出错误
      await expect(offlinePaymentService.retryPaymentSync(paymentId))
        .rejects.toThrow('只能重试同步失败状态的支付记录');
    });
  });
});