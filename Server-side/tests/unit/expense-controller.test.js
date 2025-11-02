const ExpenseController = require('../../controllers/expense-controller');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// 模拟数据库连接
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn()
  };
  
  return {
    Pool: jest.fn(() => mockPool)
  };
});

// 模拟WebSocket事件
jest.mock('../../services/websocket-events', () => ({
  handleExpenseCreated: jest.fn(),
  handleExpenseUpdated: jest.fn()
}));

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

describe('ExpenseController单元测试', () => {
  let expenseController;
  let mockPool;
  let mockReq;
  let mockRes;
  
  beforeEach(() => {
    // 获取模拟的Pool实例
    mockPool = new Pool();
    
    // 使用已导出的控制器实例
    expenseController = ExpenseController;
    
    // 创建模拟请求和响应对象
    mockReq = {
      body: {},
      params: {},
      query: {},
      user: { id: 1, role: 'user' }
    };
    
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('createExpense', () => {
    it('应该成功创建费用记录', async () => {
      // 设置模拟数据
      mockReq.body = {
        title: '测试费用',
        amount: 100.50,
        category: 'food',
        description: '这是一个测试费用',
        date: '2023-01-01',
        room_id: 1,
        split_type: 'equal',
        paid_by: 1
      };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1 }] }) // 检查寝室成员
        .mockResolvedValueOnce({ rows: [] }) // 检查费用类型
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // 插入费用
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 2 }] }) // 获取寝室成员
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // 插入分摊记录
      
      // 调用控制器方法
      await expenseController.createExpense(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            title: '测试费用',
            amount: 100.50
          })
        })
      );
      
      // 验证数据库查询被调用
      expect(mockPool.query).toHaveBeenCalledTimes(5);
    });
    
    it('应该在缺少必填字段时返回400错误', async () => {
      // 设置缺少必填字段的请求
      mockReq.body = {
        title: '测试费用',
        // 缺少amount
        category: 'food',
        room_id: 1
      };
      
      // 调用控制器方法
      await expenseController.createExpense(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('缺少必填字段')
        })
      );
    });
    
    it('应该在用户不是寝室成员时返回403错误', async () => {
      // 设置请求数据
      mockReq.body = {
        title: '测试费用',
        amount: 100.50,
        category: 'food',
        room_id: 1,
        paid_by: 1
      };
      
      // 模拟数据库查询结果 - 用户不是寝室成员
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      // 调用控制器方法
      await expenseController.createExpense(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('不是寝室成员')
        })
      );
    });
    
    it('应该在数据库错误时返回500错误', async () => {
      // 设置请求数据
      mockReq.body = {
        title: '测试费用',
        amount: 100.50,
        category: 'food',
        room_id: 1,
        paid_by: 1
      };
      
      // 模拟数据库错误
      mockPool.query.mockRejectedValueOnce(new Error('数据库连接错误'));
      
      // 调用控制器方法
      await expenseController.createExpense(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '服务器错误'
        })
      );
    });
  });
  
  describe('getExpenses', () => {
    it('应该成功获取费用列表', async () => {
      // 设置查询参数
      mockReq.query = {
        room_id: '1',
        page: '1',
        limit: '10'
      };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1 }] }) // 检查寝室成员
        .mockResolvedValueOnce({ rows: [{ id: 1, title: '测试费用', amount: 100.50 }] }) // 获取费用列表
        .mockResolvedValueOnce({ rows: [{ count: 1 }] }); // 获取总数
      
      // 调用控制器方法
      await expenseController.getExpenses(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              id: 1,
              title: '测试费用',
              amount: 100.50
            })
          ]),
          pagination: expect.objectContaining({
            page: 1,
            limit: 10,
            total: 1,
            totalPages: 1
          })
        })
      );
    });
    
    it('应该在用户不是寝室成员时返回403错误', async () => {
      // 设置查询参数
      mockReq.query = {
        room_id: '1'
      };
      
      // 模拟数据库查询结果 - 用户不是寝室成员
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      // 调用控制器方法
      await expenseController.getExpenses(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('不是寝室成员')
        })
      );
    });
  });
  
  describe('getExpenseById', () => {
    it('应该成功获取特定费用详情', async () => {
      // 设置参数
      mockReq.params = { id: '1' };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, room_id: 1, user_id: 1 }] }) // 获取费用
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1 }] }) // 检查寝室成员
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, amount: 50.25 }] }); // 获取分摊详情
      
      // 调用控制器方法
      await expenseController.getExpenseById(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 1,
            splits: expect.arrayContaining([
              expect.objectContaining({
                id: 1,
                amount: 50.25
              })
            ])
          })
        })
      );
    });
    
    it('应该在费用不存在时返回404错误', async () => {
      // 设置参数
      mockReq.params = { id: '99999' };
      
      // 模拟数据库查询结果 - 费用不存在
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      // 调用控制器方法
      await expenseController.getExpenseById(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '费用不存在'
        })
      );
    });
  });
  
  describe('updateExpense', () => {
    it('应该成功更新费用记录', async () => {
      // 设置参数和请求体
      mockReq.params = { id: '1' };
      mockReq.body = {
        title: '更新后的测试费用',
        amount: 150.75,
        description: '这是一个更新后的测试费用'
      };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, room_id: 1, user_id: 1 }] }) // 获取费用
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1 }] }) // 检查寝室成员
        .mockResolvedValueOnce({ rows: [{ id: 1, title: '更新后的测试费用', amount: 150.75 }] }); // 更新费用
      
      // 调用控制器方法
      await expenseController.updateExpense(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 1,
            title: '更新后的测试费用',
            amount: 150.75
          })
        })
      );
    });
    
    it('应该在费用不存在时返回404错误', async () => {
      // 设置参数
      mockReq.params = { id: '99999' };
      mockReq.body = { title: '更新后的测试费用' };
      
      // 模拟数据库查询结果 - 费用不存在
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      // 调用控制器方法
      await expenseController.updateExpense(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '费用不存在'
        })
      );
    });
  });
  
  describe('deleteExpense', () => {
    it('应该成功删除费用记录', async () => {
      // 设置参数
      mockReq.params = { id: '1' };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, room_id: 1, user_id: 1 }] }) // 获取费用
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1 }] }) // 检查寝室成员
        .mockResolvedValueOnce({ rows: [] }); // 删除分摊记录
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // 删除费用
      
      // 调用控制器方法
      await expenseController.deleteExpense(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '费用删除成功'
        })
      );
    });
    
    it('应该在费用不存在时返回404错误', async () => {
      // 设置参数
      mockReq.params = { id: '99999' };
      
      // 模拟数据库查询结果 - 费用不存在
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      // 调用控制器方法
      await expenseController.deleteExpense(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '费用不存在'
        })
      );
    });
  });
  
  describe('confirmSplitPayment', () => {
    it('应该成功确认分摊支付', async () => {
      // 设置参数和请求体
      mockReq.params = { id: '1' };
      mockReq.body = { split_id: '1' };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, room_id: 1, user_id: 1 }] }) // 获取费用
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1 }] }) // 检查寝室成员
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, is_paid: false }] }) // 获取分摊记录
        .mockResolvedValueOnce({ rows: [{ id: 1, is_paid: true }] }); // 更新分摊记录
      
      // 调用控制器方法
      await expenseController.confirmSplitPayment(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('确认成功')
        })
      );
    });
    
    it('应该在分摊ID不存在时返回400错误', async () => {
      // 设置参数和请求体
      mockReq.params = { id: '1' };
      mockReq.body = { split_id: '99999' };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, room_id: 1, user_id: 1 }] }) // 获取费用
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1 }] }) // 检查寝室成员
        .mockResolvedValueOnce({ rows: [] }); // 分摊记录不存在
      
      // 调用控制器方法
      await expenseController.confirmSplitPayment(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '分摊记录不存在'
        })
      );
    });
  });
});