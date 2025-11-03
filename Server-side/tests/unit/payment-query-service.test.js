/**
 * 支付记录查询服务单元测试
 */

const paymentQueryService = require('../../services/payment-query-service');
const { Payment, PaymentTransfer, Bill, User, Room } = require('../../models');

// 模拟Sequelize模型
jest.mock('../../models', () => ({
  Payment: {
    findAndCountAll: jest.fn(),
    findByPk: jest.fn()
  },
  PaymentTransfer: {
    findAndCountAll: jest.fn(),
    findAll: jest.fn()
  },
  Bill: {
    findByPk: jest.fn()
  },
  User: {
    findByPk: jest.fn()
  },
  Room: {
    findByPk: jest.fn()
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
        billId: 1,
        userId: 1,
        status: 'completed',
        startDate: '2023-01-01',
        endDate: '2023-12-31'
      };

      const mockPayments = {
        rows: [
          {
            id: 1,
            bill_id: 1,
            user_id: 1,
            amount: 100.50,
            status: 'completed',
            payment_method: 'alipay',
            created_at: new Date('2023-06-15'),
            updated_at: new Date('2023-06-15'),
            Bill: {
              id: 1,
              title: '测试账单',
              description: '测试账单描述'
            },
            User: {
              id: 1,
              username: 'testuser',
              email: 'test@example.com'
            }
          },
          {
            id: 2,
            bill_id: 2,
            user_id: 1,
            amount: 200.00,
            status: 'completed',
            payment_method: 'wechat',
            created_at: new Date('2023-07-20'),
            updated_at: new Date('2023-07-20'),
            Bill: {
              id: 2,
              title: '测试账单2',
              description: '测试账单描述2'
            },
            User: {
              id: 1,
              username: 'testuser',
              email: 'test@example.com'
            }
          }
        ],
        count: 2
      };

      // 模拟数据库查询返回结果
      Payment.findAndCountAll.mockResolvedValue(mockPayments);

      // 调用函数
      const result = await paymentQueryService.getPaymentRecords(options);

      // 验证结果
      expect(Payment.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.arrayContaining([
            expect.objectContaining({ model: Bill }),
            expect.objectContaining({ model: User })
          ]),
          where: expect.objectContaining({
            bill_id: 1,
            user_id: 1,
            status: 'completed',
            created_at: expect.objectContaining({
              [expect.any(String)]: expect.any(Object)
            })
          }),
          limit: 20,
          offset: 0,
          order: [['created_at', 'DESC']]
        })
      );

      expect(result).toEqual({
        payments: [
          {
            id: 1,
            billId: 1,
            userId: 1,
            amount: 100.50,
            status: 'completed',
            paymentMethod: 'alipay',
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
            Bill: {
              id: 1,
              title: '测试账单',
              description: '测试账单描述'
            },
            User: {
              id: 1,
              username: 'testuser',
              email: 'test@example.com'
            }
          },
          {
            id: 2,
            billId: 2,
            userId: 1,
            amount: 200.00,
            status: 'completed',
            paymentMethod: 'wechat',
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
            Bill: {
              id: 2,
              title: '测试账单2',
              description: '测试账单描述2'
            },
            User: {
              id: 1,
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

      const mockPayments = {
        rows: [],
        count: 0
      };

      // 模拟数据库查询返回结果
      Payment.findAndCountAll.mockResolvedValue(mockPayments);

      // 调用函数
      await paymentQueryService.getPaymentRecords(options);

      // 验证结果
      expect(Payment.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          offset: 0 // 应该使用默认页码1，偏移量为0
        })
      );
    });

    it('应该在每页数量无效时使用默认值', async () => {
      // 准备测试数据
      const options = {
        page: 1,
        limit: 0
      };

      const mockPayments = {
        rows: [],
        count: 0
      };

      // 模拟数据库查询返回结果
      Payment.findAndCountAll.mockResolvedValue(mockPayments);

      // 调用函数
      await paymentQueryService.getPaymentRecords(options);

      // 验证结果
      expect(Payment.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20 // 应该使用默认限制20
        })
      );
    });

    it('应该在数据库查询失败时抛出错误', async () => {
      // 准备测试数据
      const options = {
        page: 1,
        limit: 20
      };

      // 模拟数据库查询失败
      Payment.findAndCountAll.mockRejectedValue(new Error('数据库连接失败'));

      // 验证函数抛出错误
      await expect(paymentQueryService.getPaymentRecords(options))
        .rejects.toThrow('数据库连接失败');
    });
  });

  describe('getPaymentRecordById', () => {
    it('应该成功获取支付记录详情', async () => {
      // 准备测试数据
      const paymentId = 1;

      const mockPayment = {
        id: paymentId,
        bill_id: 1,
        user_id: 1,
        amount: 100.50,
        status: 'completed',
        payment_method: 'alipay',
        created_at: new Date('2023-06-15'),
        updated_at: new Date('2023-06-15'),
        Bill: {
          id: 1,
          title: '测试账单',
          description: '测试账单描述'
        },
        User: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com'
        }
      };

      // 模拟数据库查询返回结果
      Payment.findByPk.mockResolvedValue(mockPayment);

      // 调用函数
      const result = await paymentQueryService.getPaymentRecordById(paymentId);

      // 验证结果
      expect(Payment.findByPk).toHaveBeenCalledWith(
        paymentId,
        expect.objectContaining({
          include: expect.arrayContaining([
            expect.objectContaining({ model: Bill }),
            expect.objectContaining({ model: User })
          ])
        })
      );

      expect(result).toEqual({
        id: paymentId,
        billId: 1,
        userId: 1,
        amount: 100.50,
        status: 'completed',
        paymentMethod: 'alipay',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        Bill: {
          id: 1,
          title: '测试账单',
          description: '测试账单描述'
        },
        User: {
          id: 1,
          username: 'testuser',
          email: 'test@example.com'
        }
      });
    });

    it('应该在支付记录不存在时返回null', async () => {
      // 准备测试数据
      const paymentId = 999;

      // 模拟数据库查询返回空结果
      Payment.findByPk.mockResolvedValue(null);

      // 调用函数
      const result = await paymentQueryService.getPaymentRecordById(paymentId);

      // 验证结果
      expect(result).toBeNull();
    });

    it('应该在支付ID无效时抛出错误', async () => {
      // 准备无效的支付ID
      const invalidPaymentId = null;

      // 验证函数抛出错误
      await expect(paymentQueryService.getPaymentRecordById(invalidPaymentId))
        .rejects.toThrow('支付ID无效');
    });
  });

  describe('getUserPaymentStats', () => {
    it('应该成功获取用户支付统计', async () => {
      // 准备测试数据
      const userId = 1;
      const startDate = '2023-01-01';
      const endDate = '2023-12-31';

      const mockPayments = {
        rows: [
          {
            id: 1,
            amount: 100.50,
            status: 'completed',
            payment_method: 'alipay',
            created_at: new Date('2023-06-15')
          },
          {
            id: 2,
            amount: 200.00,
            status: 'completed',
            payment_method: 'wechat',
            created_at: new Date('2023-07-20')
          },
          {
            id: 3,
            amount: 50.00,
            status: 'pending',
            payment_method: 'alipay',
            created_at: new Date('2023-08-10')
          }
        ],
        count: 3
      };

      // 模拟数据库查询返回结果
      Payment.findAndCountAll.mockResolvedValue(mockPayments);

      // 调用函数
      const result = await paymentQueryService.getUserPaymentStats(userId, startDate, endDate);

      // 验证结果
      expect(Payment.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user_id: userId,
            created_at: expect.objectContaining({
              [expect.any(String)]: expect.any(Object)
            })
          })
        })
      );

      expect(result).toEqual({
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
      });
    });

    it('应该在用户ID无效时抛出错误', async () => {
      // 准备无效的用户ID
      const invalidUserId = null;

      // 验证函数抛出错误
      await expect(paymentQueryService.getUserPaymentStats(invalidUserId))
        .rejects.toThrow('用户ID无效');
    });
  });

  describe('getBillPayments', () => {
    it('应该成功获取账单支付记录', async () => {
      // 准备测试数据
      const billId = 1;
      const page = 1;
      const limit = 20;

      const mockPayments = {
        rows: [
          {
            id: 1,
            bill_id: billId,
            user_id: 1,
            amount: 100.50,
            status: 'completed',
            payment_method: 'alipay',
            created_at: new Date('2023-06-15'),
            User: {
              id: 1,
              username: 'testuser',
              email: 'test@example.com'
            }
          },
          {
            id: 2,
            bill_id: billId,
            user_id: 2,
            amount: 50.00,
            status: 'pending',
            payment_method: 'wechat',
            created_at: new Date('2023-06-20'),
            User: {
              id: 2,
              username: 'testuser2',
              email: 'test2@example.com'
            }
          }
        ],
        count: 2
      };

      // 模拟数据库查询返回结果
      Payment.findAndCountAll.mockResolvedValue(mockPayments);

      // 调用函数
      const result = await paymentQueryService.getBillPayments(billId, page, limit);

      // 验证结果
      expect(Payment.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.arrayContaining([
            expect.objectContaining({ model: User })
          ]),
          where: expect.objectContaining({
            bill_id: billId
          }),
          limit: limit,
          offset: (page - 1) * limit,
          order: [['created_at', 'DESC']]
        })
      );

      expect(result).toEqual({
        payments: [
          {
            id: 1,
            billId: billId,
            userId: 1,
            amount: 100.50,
            status: 'completed',
            paymentMethod: 'alipay',
            createdAt: expect.any(Date),
            User: {
              id: 1,
              username: 'testuser',
              email: 'test@example.com'
            }
          },
          {
            id: 2,
            billId: billId,
            userId: 2,
            amount: 50.00,
            status: 'pending',
            paymentMethod: 'wechat',
            createdAt: expect.any(Date),
            User: {
              id: 2,
              username: 'testuser2',
              email: 'test2@example.com'
            }
          }
        ],
        total: 2,
        page: 1,
        limit: 20,
        totalPages: 1
      });
    });

    it('应该在账单ID无效时抛出错误', async () => {
      // 准备无效的账单ID
      const invalidBillId = null;

      // 验证函数抛出错误
      await expect(paymentQueryService.getBillPayments(invalidBillId))
        .rejects.toThrow('账单ID无效');
    });
  });

  describe('getUserPaymentTransfers', () => {
    it('应该成功获取用户支付转移记录', async () => {
      // 准备测试数据
      const userId = 1;
      const page = 1;
      const limit = 20;

      const mockTransfers = {
        rows: [
          {
            id: 1,
            from_payment_id: 1,
            to_payment_id: 2,
            amount: 50.00,
            status: 'completed',
            created_at: new Date('2023-06-15'),
            FromPayment: {
              id: 1,
              bill_id: 1,
              amount: 100.50,
              Bill: {
                id: 1,
                title: '测试账单'
              }
            },
            ToPayment: {
              id: 2,
              bill_id: 2,
              amount: 150.00,
              Bill: {
                id: 2,
                title: '测试账单2'
              }
            }
          }
        ],
        count: 1
      };

      // 模拟数据库查询返回结果
      PaymentTransfer.findAndCountAll.mockResolvedValue(mockTransfers);

      // 调用函数
      const result = await paymentQueryService.getUserPaymentTransfers(userId, page, limit);

      // 验证结果
      expect(PaymentTransfer.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.arrayContaining([
            expect.objectContaining({
              model: Payment,
              as: 'FromPayment',
              include: expect.arrayContaining([
                expect.objectContaining({ model: Bill })
              ])
            }),
            expect.objectContaining({
              model: Payment,
              as: 'ToPayment',
              include: expect.arrayContaining([
                expect.objectContaining({ model: Bill })
              ])
            })
          ]),
          where: expect.objectContaining({
            [expect.any(String)]: expect.objectContaining({
              [expect.any(String)]: userId
            })
          }),
          limit: limit,
          offset: (page - 1) * limit,
          order: [['created_at', 'DESC']]
        })
      );

      expect(result).toEqual({
        transfers: [
          {
            id: 1,
            fromPaymentId: 1,
            toPaymentId: 2,
            amount: 50.00,
            status: 'completed',
            createdAt: expect.any(Date),
            FromPayment: {
              id: 1,
              billId: 1,
              amount: 100.50,
              Bill: {
                id: 1,
                title: '测试账单'
              }
            },
            ToPayment: {
              id: 2,
              billId: 2,
              amount: 150.00,
              Bill: {
                id: 2,
                title: '测试账单2'
              }
            }
          }
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      });
    });

    it('应该在用户ID无效时抛出错误', async () => {
      // 准备无效的用户ID
      const invalidUserId = null;

      // 验证函数抛出错误
      await expect(paymentQueryService.getUserPaymentTransfers(invalidUserId))
        .rejects.toThrow('用户ID无效');
    });
  });

  describe('getRoomPaymentStats', () => {
    it('应该成功获取房间支付统计', async () => {
      // 准备测试数据
      const roomId = 1;
      const startDate = '2023-01-01';
      const endDate = '2023-12-31';

      const mockPayments = {
        rows: [
          {
            id: 1,
            amount: 100.50,
            status: 'completed',
            payment_method: 'alipay',
            created_at: new Date('2023-06-15'),
            User: {
              id: 1,
              username: 'testuser'
            }
          },
          {
            id: 2,
            amount: 200.00,
            status: 'completed',
            payment_method: 'wechat',
            created_at: new Date('2023-07-20'),
            User: {
              id: 2,
              username: 'testuser2'
            }
          }
        ],
        count: 2
      };

      // 模拟数据库查询返回结果
      Payment.findAndCountAll.mockResolvedValue(mockPayments);

      // 调用函数
      const result = await paymentQueryService.getRoomPaymentStats(roomId, startDate, endDate);

      // 验证结果
      expect(Payment.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.arrayContaining([
            expect.objectContaining({
              model: User,
              where: expect.objectContaining({
                room_id: roomId
              })
            })
          ]),
          where: expect.objectContaining({
            created_at: expect.objectContaining({
              [expect.any(String)]: expect.any(Object)
            })
          })
        })
      );

      expect(result).toEqual({
        totalPayments: 2,
        totalAmount: 300.50,
        completedPayments: 2,
        completedAmount: 300.50,
        pendingPayments: 0,
        pendingAmount: 0,
        paymentMethods: {
          alipay: 1,
          wechat: 1
        },
        userStats: [
          {
            userId: 1,
            username: 'testuser',
            paymentCount: 1,
            totalAmount: 100.50
          },
          {
            userId: 2,
            username: 'testuser2',
            paymentCount: 1,
            totalAmount: 200.00
          }
        ]
      });
    });

    it('应该在房间ID无效时抛出错误', async () => {
      // 准备无效的房间ID
      const invalidRoomId = null;

      // 验证函数抛出错误
      await expect(paymentQueryService.getRoomPaymentStats(invalidRoomId))
        .rejects.toThrow('房间ID无效');
    });
  });
});