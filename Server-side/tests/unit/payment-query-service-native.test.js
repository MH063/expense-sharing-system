/**
 * 支付记录查询服务单元测试（原生SQL版本）
 */

const paymentQueryService = require('../../services/payment-query-service');
const { pool } = require('../../config/db');

// 模拟数据库连接池
jest.mock('../../config/db', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn()
  }
}));

describe('支付记录查询服务测试', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getPaymentRecords', () => {
    it('应该成功获取支付记录列表', async () => {
      // 准备测试数据
      const options = {
        page: 1,
        limit: 20,
        billId: 'test-bill-id',
        userId: 'test-user-id',
        status: 'completed',
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      };

      // 模拟COUNT查询结果
      const mockCountResult = {
        rows: [{ count: '2' }]
      };

      // 模拟主查询结果
      const mockPaymentsResult = {
        rows: [
          {
            id: 'test-payment-id-1',
            bill_id: 'test-bill-id',
            user_id: 'test-user-id',
            amount: 100.50,
            status: 'completed',
            payment_method: 'alipay',
            created_at: new Date('2023-06-15'),
            updated_at: new Date('2023-06-15'),
            bill_title: '测试账单',
            bill_description: '测试账单描述',
            username: 'testuser',
            email: 'test@example.com'
          },
          {
            id: 'test-payment-id-2',
            bill_id: 'test-bill-id-2',
            user_id: 'test-user-id',
            amount: 200.00,
            status: 'completed',
            payment_method: 'wechat',
            created_at: new Date('2023-07-20'),
            updated_at: new Date('2023-07-20'),
            bill_title: '测试账单2',
            bill_description: '测试账单描述2',
            username: 'testuser',
            email: 'test@example.com'
          }
        ]
      };

      // 设置模拟返回值
      pool.query
        .mockResolvedValueOnce(mockCountResult) // COUNT查询
        .mockResolvedValueOnce(mockPaymentsResult); // 主查询

      // 调用函数
      const result = await paymentQueryService.getPaymentRecords(options);

      // 验证COUNT查询被调用
      expect(pool.query).toHaveBeenNthCalledWith(1, 
        expect.stringContaining('SELECT COUNT(*)'),
        expect.arrayContaining([
          'test-bill-id',
          'test-user-id',
          'completed',
          '2023-01-01',
          '2023-12-31'
        ])
      );

      // 验证主查询被调用
      expect(pool.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('SELECT p.*, b.title as bill_title'),
        expect.arrayContaining([
          'test-bill-id',
          'test-user-id',
          'completed',
          '2023-01-01',
          '2023-12-31',
          20,
          0
        ])
      );

      // 验证结果
      expect(result).toEqual({
        payments: [
          {
            id: 'test-payment-id-1',
            billId: 'test-bill-id',
            userId: 'test-user-id',
            amount: 100.50,
            status: 'completed',
            paymentMethod: 'alipay',
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
            bill: {
              title: '测试账单',
              description: '测试账单描述'
            },
            user: {
              username: 'testuser',
              email: 'test@example.com'
            }
          },
          {
            id: 'test-payment-id-2',
            billId: 'test-bill-id-2',
            userId: 'test-user-id',
            amount: 200.00,
            status: 'completed',
            paymentMethod: 'wechat',
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
            bill: {
              title: '测试账单2',
              description: '测试账单描述2'
            },
            user: {
              username: 'testuser',
              email: 'test@example.com'
            }
          }
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1
      });
    });

    it('应该在页码无效时使用默认值', async () => {
      // 准备测试数据
      const options = {
        page: -1,
        limit: 20
      };

      // 模拟查询结果
      const mockCountResult = { rows: [{ count: '0' }] };
      const mockPaymentsResult = { rows: [] };

      // 设置模拟返回值
      pool.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockPaymentsResult);

      // 调用函数
      await paymentQueryService.getPaymentRecords(options);

      // 验证偏移量为0（默认页码1）
      expect(pool.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        expect.arrayContaining([20, 0])
      );
    });

    it('应该在每页数量无效时使用默认值', async () => {
      // 准备测试数据
      const options = {
        page: 1,
        limit: 0
      };

      // 模拟查询结果
      const mockCountResult = { rows: [{ count: '0' }] };
      const mockPaymentsResult = { rows: [] };

      // 设置模拟返回值
      pool.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockPaymentsResult);

      // 调用函数
      await paymentQueryService.getPaymentRecords(options);

      // 验证使用默认限制数量20
      expect(pool.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('LIMIT $1 OFFSET $2'),
        expect.arrayContaining([20, 0])
      );
    });

    it('应该处理数据库错误', async () => {
      // 准备测试数据
      const options = {
        page: 1,
        limit: 20
      };

      // 模拟数据库错误
      pool.query.mockRejectedValue(new Error('数据库连接错误'));

      // 调用函数并验证错误
      await expect(paymentQueryService.getPaymentRecords(options))
        .rejects.toThrow('数据库连接错误');
    });
  });

  describe('getPaymentById', () => {
    it('应该根据ID获取支付记录', async () => {
      // 准备测试数据
      const paymentId = 'test-payment-id';

      // 模拟查询结果
      const mockPaymentResult = {
        rows: [
          {
            id: paymentId,
            bill_id: 'test-bill-id',
            user_id: 'test-user-id',
            amount: 100.50,
            status: 'completed',
            payment_method: 'alipay',
            created_at: new Date('2023-06-15'),
            updated_at: new Date('2023-06-15'),
            bill_title: '测试账单',
            bill_description: '测试账单描述',
            username: 'testuser',
            email: 'test@example.com'
          }
        ]
      };

      // 设置模拟返回值
      pool.query.mockResolvedValue(mockPaymentResult);

      // 调用函数
      const result = await paymentQueryService.getPaymentById(paymentId);

      // 验证查询被调用
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT p.*, b.title as bill_title'),
        [paymentId]
      );

      // 验证结果
      expect(result).toEqual({
        id: paymentId,
        billId: 'test-bill-id',
        userId: 'test-user-id',
        amount: 100.50,
        status: 'completed',
        paymentMethod: 'alipay',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        bill: {
          title: '测试账单',
          description: '测试账单描述'
        },
        user: {
          username: 'testuser',
          email: 'test@example.com'
        }
      });
    });

    it('应该在支付记录不存在时返回null', async () => {
      // 准备测试数据
      const paymentId = 'non-existent-payment-id';

      // 模拟查询结果
      const mockPaymentResult = { rows: [] };

      // 设置模拟返回值
      pool.query.mockResolvedValue(mockPaymentResult);

      // 调用函数
      const result = await paymentQueryService.getPaymentById(paymentId);

      // 验证查询被调用
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT p.*, b.title as bill_title'),
        [paymentId]
      );

      // 验证结果为null
      expect(result).toBeNull();
    });
  });

  describe('getUserPaymentStats', () => {
    it('应该获取用户支付统计', async () => {
      // 准备测试数据
      const userId = 'test-user-id';

      // 模拟查询结果
      const mockStatsResult = {
        rows: [
          {
            total_amount: '500.50',
            total_count: '5',
            completed_amount: '450.00',
            completed_count: '4',
            pending_amount: '50.50',
            pending_count: '1'
          }
        ]
      };

      // 设置模拟返回值
      pool.query.mockResolvedValue(mockStatsResult);

      // 调用函数
      const result = await paymentQueryService.getUserPaymentStats(userId);

      // 验证查询被调用
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [userId]
      );

      // 验证结果
      expect(result).toEqual({
        totalAmount: 500.50,
        totalCount: 5,
        completedAmount: 450.00,
        completedCount: 4,
        pendingAmount: 50.50,
        pendingCount: 1
      });
    });
  });

  describe('getBillPayments', () => {
    it('应该获取账单的支付记录', async () => {
      // 准备测试数据
      const billId = 'test-bill-id';
      const options = {
        page: 1,
        limit: 10
      };

      // 模拟COUNT查询结果
      const mockCountResult = {
        rows: [{ count: '3' }]
      };

      // 模拟主查询结果
      const mockPaymentsResult = {
        rows: [
          {
            id: 'test-payment-id-1',
            bill_id: billId,
            user_id: 'test-user-id-1',
            amount: 100.50,
            status: 'completed',
            payment_method: 'alipay',
            created_at: new Date('2023-06-15'),
            updated_at: new Date('2023-06-15'),
            username: 'testuser1',
            email: 'test1@example.com'
          },
          {
            id: 'test-payment-id-2',
            bill_id: billId,
            user_id: 'test-user-id-2',
            amount: 200.00,
            status: 'pending',
            payment_method: 'wechat',
            created_at: new Date('2023-07-20'),
            updated_at: new Date('2023-07-20'),
            username: 'testuser2',
            email: 'test2@example.com'
          }
        ]
      };

      // 设置模拟返回值
      pool.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockPaymentsResult);

      // 调用函数
      const result = await paymentQueryService.getBillPayments(billId, options);

      // 验证COUNT查询被调用
      expect(pool.query).toHaveBeenNthCalledWith(1, 
        expect.stringContaining('SELECT COUNT(*)'),
        [billId]
      );

      // 验证主查询被调用
      expect(pool.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('SELECT p.*, u.username, u.email'),
        [billId, 10, 0]
      );

      // 验证结果
      expect(result).toEqual({
        payments: [
          {
            id: 'test-payment-id-1',
            billId: billId,
            userId: 'test-user-id-1',
            amount: 100.50,
            status: 'completed',
            paymentMethod: 'alipay',
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
            user: {
              username: 'testuser1',
              email: 'test1@example.com'
            }
          },
          {
            id: 'test-payment-id-2',
            billId: billId,
            userId: 'test-user-id-2',
            amount: 200.00,
            status: 'pending',
            paymentMethod: 'wechat',
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
            user: {
              username: 'testuser2',
              email: 'test2@example.com'
            }
          }
        ],
        total: 3,
        page: 1,
        limit: 10,
        totalPages: 1
      });
    });
  });

  describe('getUserPaymentTransfers', () => {
    it('应该获取用户支付转账记录', async () => {
      // 准备测试数据
      const userId = 'test-user-id';
      const options = {
        page: 1,
        limit: 10
      };

      // 模拟COUNT查询结果
      const mockCountResult = {
        rows: [{ count: '2' }]
      };

      // 模拟主查询结果
      const mockTransfersResult = {
        rows: [
          {
            id: 'test-transfer-id-1',
            from_payment_id: 'test-payment-id-1',
            to_payment_id: 'test-payment-id-2',
            amount: 50.00,
            status: 'completed',
            created_at: new Date('2023-06-15'),
            updated_at: new Date('2023-06-15'),
            from_bill_title: '测试账单1',
            to_bill_title: '测试账单2'
          }
        ]
      };

      // 设置模拟返回值
      pool.query
        .mockResolvedValueOnce(mockCountResult)
        .mockResolvedValueOnce(mockTransfersResult);

      // 调用函数
      const result = await paymentQueryService.getUserPaymentTransfers(userId, options);

      // 验证COUNT查询被调用
      expect(pool.query).toHaveBeenNthCalledWith(1, 
        expect.stringContaining('SELECT COUNT(*)'),
        [userId]
      );

      // 验证主查询被调用
      expect(pool.query).toHaveBeenNthCalledWith(2, 
        expect.stringContaining('SELECT pt.*,'),
        [userId, 10, 0]
      );

      // 验证结果
      expect(result).toEqual({
        transfers: [
          {
            id: 'test-transfer-id-1',
            fromPaymentId: 'test-payment-id-1',
            toPaymentId: 'test-payment-id-2',
            amount: 50.00,
            status: 'completed',
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
            fromBill: {
              title: '测试账单1'
            },
            toBill: {
              title: '测试账单2'
            }
          }
        ],
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1
      });
    });
  });

  describe('getRoomPaymentStats', () => {
    it('应该获取房间支付统计', async () => {
      // 准备测试数据
      const roomId = 'test-room-id';

      // 模拟查询结果
      const mockStatsResult = {
        rows: [
          {
            total_amount: '1000.00',
            total_count: '10',
            completed_amount: '900.00',
            completed_count: '8',
            pending_amount: '100.00',
            pending_count: '2'
          }
        ]
      };

      // 设置模拟返回值
      pool.query.mockResolvedValue(mockStatsResult);

      // 调用函数
      const result = await paymentQueryService.getRoomPaymentStats(roomId);

      // 验证查询被调用
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [roomId]
      );

      // 验证结果
      expect(result).toEqual({
        totalAmount: 1000.00,
        totalCount: 10,
        completedAmount: 900.00,
        completedCount: 8,
        pendingAmount: 100.00,
        pendingCount: 2
      });
    });
  });
});