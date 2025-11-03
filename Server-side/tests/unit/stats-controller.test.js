const StatsController = require('../../controllers/stats-controller');
const { Pool } = require('pg');

// 模拟数据库连接
// 强制使用真实数据库，禁止 mock pg
// jest.mock('pg', ...) 已移除

// 模拟日志记录器
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    json: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}));

describe('StatsController单元测试', () => {
  let statsController;
  let mockPool;
  let mockReq;
  let mockRes;
  
  beforeEach(() => {
    // 获取模拟的Pool实例
    mockPool = new Pool();
    
    // 使用已导出的控制器实例
    statsController = StatsController;
    
    // 创建模拟请求和响应对象
    mockReq = {
      body: {},
      params: {},
      query: {},
      user: { sub: '1', username: 'testuser', roles: ['user'], permissions: ['read', 'write'] }
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('getUserStats', () => {
    it('应该成功获取用户统计信息', async () => {
      // 设置查询参数
      mockReq.query = {
        start_date: '2023-01-01',
        end_date: '2023-12-31'
      };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{
            total_paid: 1000.50,
            total_owed: 500.25,
            total_balance: 500.25,
            bills_count: 15,
            expenses_count: 20
          }]
        }) // 获取支付统计
        .mockResolvedValueOnce({
          rows: [{
            total_shared: 800.00,
            total_personal: 200.50,
            shared_percentage: 0.8,
            personal_percentage: 0.2
          }]
        }) // 获取分摊统计
        .mockResolvedValueOnce({
          rows: [{
            total_amount: 1500.75,
            avg_amount: 75.04,
            max_amount: 300.00,
            min_amount: 10.00
          }]
        }); // 获取账单统计
      
      // 调用控制器方法
      await statsController.getUserStats(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '获取用户统计信息成功',
          data: expect.objectContaining({
            payment_stats: expect.objectContaining({
              total_paid: 1000.50,
              total_owed: 500.25,
              total_balance: 500.25
            }),
            sharing_stats: expect.objectContaining({
              total_shared: 800.00,
              total_personal: 200.50
            }),
            bill_stats: expect.objectContaining({
              total_amount: 1500.75,
              avg_amount: 75.04
            })
          })
        })
      );
      
      // 验证数据库查询被调用
      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });
    
    it('应该在数据库错误时返回500错误', async () => {
      // 设置查询参数
      mockReq.query = {
        start_date: '2023-01-01',
        end_date: '2023-12-31'
      };
      
      // 模拟数据库错误
      mockPool.query.mockRejectedValueOnce(new Error('数据库连接错误'));
      
      // 调用控制器方法
      await statsController.getUserStats(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '服务器内部错误'
        })
      );
    });
  });
  
  describe('getExpenseTypeDistribution', () => {
    it('应该成功获取费用类型分布', async () => {
      // 设置查询参数
      mockReq.query = {
        start_date: '2023-01-01',
        end_date: '2023-12-31'
      };
      
      // 模拟数据库查询结果
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            expense_type_id: 1,
            expense_type_name: '餐饮',
            expense_type_icon: 'food',
            expense_type_color: '#FF5722',
            total_amount: 500.00,
            count: 10,
            percentage: 0.5
          },
          {
            expense_type_id: 2,
            expense_type_name: '交通',
            expense_type_icon: 'transport',
            expense_type_color: '#2196F3',
            total_amount: 300.00,
            count: 5,
            percentage: 0.3
          },
          {
            expense_type_id: 3,
            expense_type_name: '购物',
            expense_type_icon: 'shopping',
            expense_type_color: '#4CAF50',
            total_amount: 200.00,
            count: 3,
            percentage: 0.2
          }
        ]
      });
      
      // 调用控制器方法
      await statsController.getExpenseTypeDistribution(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '获取费用类型分布成功',
          data: expect.arrayContaining([
            expect.objectContaining({
              expense_type_id: 1,
              expense_type_name: '餐饮',
              total_amount: 500.00,
              count: 10,
              percentage: 0.5
            })
          ])
        })
      );
      
      // 验证数据库查询被调用
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
    
    it('应该在无数据时返回空数组', async () => {
      // 设置查询参数
      mockReq.query = {
        start_date: '2023-01-01',
        end_date: '2023-12-31'
      };
      
      // 模拟数据库查询结果 - 无数据
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      // 调用控制器方法
      await statsController.getExpenseTypeDistribution(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '获取费用类型分布成功',
          data: []
        })
      );
    });
  });
  
  describe('getDailyExpenseTrend', () => {
    it('应该成功获取每日费用趋势', async () => {
      // 设置查询参数
      mockReq.query = {
        start_date: '2023-01-01',
        end_date: '2023-01-07'
      };
      
      // 模拟数据库查询结果
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            date: '2023-01-01',
            total_amount: 100.00,
            count: 2
          },
          {
            date: '2023-01-02',
            total_amount: 150.50,
            count: 3
          },
          {
            date: '2023-01-03',
            total_amount: 0.00,
            count: 0
          },
          {
            date: '2023-01-04',
            total_amount: 75.25,
            count: 1
          },
          {
            date: '2023-01-05',
            total_amount: 0.00,
            count: 0
          },
          {
            date: '2023-01-06',
            total_amount: 200.00,
            count: 4
          },
          {
            date: '2023-01-07',
            total_amount: 0.00,
            count: 0
          }
        ]
      });
      
      // 调用控制器方法
      await statsController.getDailyExpenseTrend(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '获取每日费用趋势成功',
          data: expect.arrayContaining([
            expect.objectContaining({
              date: '2023-01-01',
              total_amount: 100.00,
              count: 2
            })
          ])
        })
      );
      
      // 验证数据库查询被调用
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
    
    it('应该在日期范围过大时返回400错误', async () => {
      // 设置过大的日期范围（超过365天）
      mockReq.query = {
        start_date: '2022-01-01',
        end_date: '2023-12-31'
      };
      
      // 调用控制器方法
      await statsController.getDailyExpenseTrend(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '日期范围不能超过365天'
        })
      );
      
      // 验证数据库查询未被调用
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });
  
  describe('getMonthlyExpenseTrend', () => {
    it('应该成功获取每月费用趋势', async () => {
      // 设置查询参数
      mockReq.query = {
        start_date: '2023-01-01',
        end_date: '2023-12-31'
      };
      
      // 模拟数据库查询结果
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            month: '2023-01',
            total_amount: 1000.00,
            count: 20
          },
          {
            month: '2023-02',
            total_amount: 850.50,
            count: 15
          },
          {
            month: '2023-03',
            total_amount: 1200.00,
            count: 25
          }
        ]
      });
      
      // 调用控制器方法
      await statsController.getMonthlyExpenseTrend(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '获取每月费用趋势成功',
          data: expect.arrayContaining([
            expect.objectContaining({
              month: '2023-01',
              total_amount: 1000.00,
              count: 20
            })
          ])
        })
      );
      
      // 验证数据库查询被调用
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
    
    it('应该在日期范围过大时返回400错误', async () => {
      // 设置过大的日期范围（超过5年）
      mockReq.query = {
        start_date: '2018-01-01',
        end_date: '2023-12-31'
      };
      
      // 调用控制器方法
      await statsController.getMonthlyExpenseTrend(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '日期范围不能超过5年'
        })
      );
      
      // 验证数据库查询未被调用
      expect(mockPool.query).not.toHaveBeenCalled();
    });
  });
  
  describe('getRoomStats', () => {
    it('应该成功获取寝室统计信息', async () => {
      // 设置参数和查询参数
      mockReq.params = { roomId: '1' };
      mockReq.query = {
        start_date: '2023-01-01',
        end_date: '2023-12-31'
      };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, creator_id: 1 }] }) // 检查用户是否是寝室成员
        .mockResolvedValueOnce({
          rows: [{
            total_amount: 5000.00,
            bills_count: 50,
            expenses_count: 100,
            avg_amount_per_bill: 100.00,
            avg_amount_per_expense: 50.00
          }]
        }) // 获取寝室总体统计
        .mockResolvedValueOnce({
          rows: [
            {
              user_id: 1,
              username: 'user1',
              name: 'User 1',
              total_paid: 1500.00,
              total_owed: 1200.00,
              total_balance: 300.00,
              bills_count: 15,
              expenses_count: 30
            },
            {
              user_id: 2,
              username: 'user2',
              name: 'User 2',
              total_paid: 1200.00,
              total_owed: 1300.00,
              total_balance: -100.00,
              bills_count: 12,
              expenses_count: 25
            }
          ]
        }) // 获取寝室成员统计
      
      // 调用控制器方法
      await statsController.getRoomStats(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '获取寝室统计信息成功',
          data: expect.objectContaining({
            overall_stats: expect.objectContaining({
              total_amount: 5000.00,
              bills_count: 50,
              expenses_count: 100
            }),
            member_stats: expect.arrayContaining([
              expect.objectContaining({
                user_id: 1,
                username: 'user1',
                total_paid: 1500.00,
                total_owed: 1200.00
              })
            ])
          })
        })
      );
      
      // 验证数据库查询被调用
      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });
    
    it('应该在用户不是寝室成员时返回403错误', async () => {
      // 设置参数
      mockReq.params = { roomId: '1' };
      mockReq.query = {
        start_date: '2023-01-01',
        end_date: '2023-12-31'
      };
      
      // 模拟数据库查询结果 - 用户不是寝室成员
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      // 调用控制器方法
      await statsController.getRoomStats(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '您不是该寝室的成员'
        })
      );
    });
  });
  
  describe('getRoomExpenseTypeDistribution', () => {
    it('应该成功获取寝室费用类型分布', async () => {
      // 设置参数和查询参数
      mockReq.params = { roomId: '1' };
      mockReq.query = {
        start_date: '2023-01-01',
        end_date: '2023-12-31'
      };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // 检查用户是否是寝室成员
        .mockResolvedValueOnce({
          rows: [
            {
              expense_type_id: 1,
              expense_type_name: '餐饮',
              expense_type_icon: 'food',
              expense_type_color: '#FF5722',
              total_amount: 2000.00,
              count: 40,
              percentage: 0.4
            },
            {
              expense_type_id: 2,
              expense_type_name: '交通',
              expense_type_icon: 'transport',
              expense_type_color: '#2196F3',
              total_amount: 1500.00,
              count: 30,
              percentage: 0.3
            },
            {
              expense_type_id: 3,
              expense_type_name: '购物',
              expense_type_icon: 'shopping',
              expense_type_color: '#4CAF50',
              total_amount: 1000.00,
              count: 20,
              percentage: 0.2
            },
            {
              expense_type_id: 4,
              expense_type_name: '其他',
              expense_type_icon: 'other',
              expense_type_color: '#9E9E9E',
              total_amount: 500.00,
              count: 10,
              percentage: 0.1
            }
          ]
        }); // 获取寝室费用类型分布
      
      // 调用控制器方法
      await statsController.getRoomExpenseTypeDistribution(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '获取寝室费用类型分布成功',
          data: expect.arrayContaining([
            expect.objectContaining({
              expense_type_id: 1,
              expense_type_name: '餐饮',
              total_amount: 2000.00,
              count: 40,
              percentage: 0.4
            })
          ])
        })
      );
      
      // 验证数据库查询被调用
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('getRoomMonthlyTrend', () => {
    it('应该成功获取寝室每月费用趋势', async () => {
      // 设置参数和查询参数
      mockReq.params = { roomId: '1' };
      mockReq.query = {
        start_date: '2023-01-01',
        end_date: '2023-06-30'
      };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // 检查用户是否是寝室成员
        .mockResolvedValueOnce({
          rows: [
            {
              month: '2023-01',
              total_amount: 800.00,
              count: 16
            },
            {
              month: '2023-02',
              total_amount: 750.50,
              count: 15
            },
            {
              month: '2023-03',
              total_amount: 900.00,
              count: 18
            },
            {
              month: '2023-04',
              total_amount: 650.00,
              count: 13
            },
            {
              month: '2023-05',
              total_amount: 700.00,
              count: 14
            },
            {
              month: '2023-06',
              total_amount: 850.00,
              count: 17
            }
          ]
        }); // 获取寝室每月费用趋势
      
      // 调用控制器方法
      await statsController.getRoomMonthlyTrend(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '获取寝室每月费用趋势成功',
          data: expect.arrayContaining([
            expect.objectContaining({
              month: '2023-01',
              total_amount: 800.00,
              count: 16
            })
          ])
        })
      );
      
      // 验证数据库查询被调用
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });
  });
});