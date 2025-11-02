const ExpenseTypeController = require('../../controllers/expense-type-controller');
const { Pool } = require('pg');

// 模拟数据库连接
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn()
  };
  
  return {
    Pool: jest.fn(() => mockPool)
  };
});

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

describe('ExpenseTypeController单元测试', () => {
  let expenseTypeController;
  let mockPool;
  let mockReq;
  let mockRes;
  
  beforeEach(() => {
    // 获取模拟的Pool实例
    mockPool = new Pool();
    
    // 使用已导出的控制器实例
    expenseTypeController = ExpenseTypeController;
    
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
  
  describe('createExpenseType', () => {
    it('应该成功创建费用类型', async () => {
      // 设置模拟数据
      mockReq.body = {
        name: '餐饮',
        description: '日常餐饮费用',
        icon: 'food',
        color: '#FF5722'
      };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // 检查名称是否已存在
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: '餐饮',
            description: '日常餐饮费用',
            icon: 'food',
            color: '#FF5722',
            is_default: false,
            created_by: 1,
            created_at: new Date(),
            updated_at: new Date()
          }]
        }); // 插入费用类型
      
      // 调用控制器方法
      await expenseTypeController.createExpenseType(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '费用类型创建成功',
          data: expect.objectContaining({
            id: 1,
            name: '餐饮',
            description: '日常餐饮费用',
            icon: 'food',
            color: '#FF5722'
          })
        })
      );
    });
    
    it('应该在缺少必填字段时返回400错误', async () => {
      // 设置缺少必填字段的请求
      mockReq.body = {
        description: '日常餐饮费用',
        // 缺少name
      };
      
      // 调用控制器方法
      await expenseTypeController.createExpenseType(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '费用类型名称为必填项'
        })
      );
    });
    
    it('应该在费用类型名称已存在时返回409错误', async () => {
      // 设置请求数据
      mockReq.body = {
        name: '餐饮',
        description: '日常餐饮费用'
      };
      
      // 模拟数据库查询结果 - 名称已存在
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, name: '餐饮' }]
      });
      
      // 调用控制器方法
      await expenseTypeController.createExpenseType(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '费用类型名称已存在'
        })
      );
    });
    
    it('应该在数据库错误时返回500错误', async () => {
      // 设置请求数据
      mockReq.body = {
        name: '餐饮',
        description: '日常餐饮费用'
      };
      
      // 模拟数据库错误
      mockPool.query.mockRejectedValueOnce(new Error('数据库连接错误'));
      
      // 调用控制器方法
      await expenseTypeController.createExpenseType(mockReq, mockRes);
      
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
  
  describe('getExpenseTypes', () => {
    it('应该成功获取费用类型列表', async () => {
      // 设置查询参数
      mockReq.query = {
        page: '1',
        limit: '10'
      };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              name: '餐饮',
              description: '日常餐饮费用',
              icon: 'food',
              color: '#FF5722',
              is_default: false,
              created_by: 1,
              created_at: new Date(),
              updated_at: new Date(),
              creator_username: 'testuser',
              creator_name: 'Test User'
            },
            {
              id: 2,
              name: '交通',
              description: '交通出行费用',
              icon: 'transport',
              color: '#2196F3',
              is_default: true,
              created_by: null,
              created_at: new Date(),
              updated_at: new Date(),
              creator_username: null,
              creator_name: '系统默认'
            }
          ]
        }) // 获取费用类型列表
        .mockResolvedValueOnce({ rows: [{ count: 2 }] }); // 获取总数
      
      // 调用控制器方法
      await expenseTypeController.getExpenseTypes(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '获取费用类型列表成功',
          data: expect.objectContaining({
            expenseTypes: expect.arrayContaining([
              expect.objectContaining({
                id: 1,
                name: '餐饮'
              })
            ]),
            pagination: expect.objectContaining({
              page: 1,
              limit: 10,
              total: 2,
              totalPages: 1
            })
          })
        })
      );
      
      // 验证数据库查询被调用
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });
    
    it('应该支持按名称筛选费用类型', async () => {
      // 设置查询参数
      mockReq.query = {
        page: '1',
        limit: '10',
        name: '餐'
      };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // 获取费用类型列表
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }); // 获取总数
      
      // 调用控制器方法
      await expenseTypeController.getExpenseTypes(mockReq, mockRes);
      
      // 验证数据库查询被调用
      expect(mockPool.query).toHaveBeenCalledTimes(2);
      
      // 验证查询包含名称筛选
      expect(mockPool.query.mock.calls[0][0]).toContain('AND et.name ILIKE');
    });
    
    it('应该支持按创建者筛选费用类型', async () => {
      // 设置查询参数
      mockReq.query = {
        page: '1',
        limit: '10',
        created_by: '1'
      };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // 获取费用类型列表
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }); // 获取总数
      
      // 调用控制器方法
      await expenseTypeController.getExpenseTypes(mockReq, mockRes);
      
      // 验证数据库查询被调用
      expect(mockPool.query).toHaveBeenCalledTimes(2);
      
      // 验证查询包含创建者筛选
      expect(mockPool.query.mock.calls[0][0]).toContain('AND et.created_by = $');
    });
  });
  
  describe('getExpenseTypeById', () => {
    it('应该成功获取费用类型详情', async () => {
      // 设置参数
      mockReq.params = { id: '1' };
      
      // 模拟数据库查询结果
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          name: '餐饮',
          description: '日常餐饮费用',
          icon: 'food',
          color: '#FF5722',
          is_default: false,
          created_by: 1,
          created_at: new Date(),
          updated_at: new Date(),
          creator_username: 'testuser',
          creator_name: 'Test User'
        }]
      });
      
      // 调用控制器方法
      await expenseTypeController.getExpenseTypeById(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '获取费用类型详情成功',
          data: expect.objectContaining({
            id: 1,
            name: '餐饮'
          })
        })
      );
    });
    
    it('应该在费用类型不存在时返回404错误', async () => {
      // 设置参数
      mockReq.params = { id: '999' };
      
      // 模拟数据库查询结果 - 费用类型不存在
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      // 调用控制器方法
      await expenseTypeController.getExpenseTypeById(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '费用类型不存在'
        })
      );
    });
  });
  
  describe('updateExpenseType', () => {
    it('应该成功更新费用类型信息', async () => {
      // 设置参数和更新数据
      mockReq.params = { id: '1' };
      mockReq.body = {
        name: '更新后的餐饮',
        description: '更新后的描述',
        icon: 'restaurant',
        color: '#E91E63'
      };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, name: '餐饮', is_default: false, created_by: 1 }] }) // 获取费用类型信息
        .mockResolvedValueOnce({ rows: [] }) // 检查新名称是否与其他费用类型冲突
        .mockResolvedValueOnce({
          rows: [{
            id: 1,
            name: '更新后的餐饮',
            description: '更新后的描述',
            icon: 'restaurant',
            color: '#E91E63',
            is_default: false,
            created_by: 1,
            updated_at: new Date()
          }]
        }); // 更新费用类型信息
      
      // 调用控制器方法
      await expenseTypeController.updateExpenseType(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '费用类型信息更新成功',
          data: expect.objectContaining({
            id: 1,
            name: '更新后的餐饮'
          })
        })
      );
    });
    
    it('应该在费用类型不存在时返回404错误', async () => {
      // 设置参数
      mockReq.params = { id: '999' };
      mockReq.body = { name: '更新后的餐饮' };
      
      // 模拟数据库查询结果 - 费用类型不存在
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      // 调用控制器方法
      await expenseTypeController.updateExpenseType(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '费用类型不存在'
        })
      );
    });
    
    it('应该在尝试修改系统默认费用类型时返回403错误', async () => {
      // 设置参数
      mockReq.params = { id: '1' };
      mockReq.body = { name: '更新后的餐饮' };
      
      // 模拟数据库查询结果 - 系统默认费用类型
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, name: '餐饮', is_default: true, created_by: null }]
      });
      
      // 调用控制器方法
      await expenseTypeController.updateExpenseType(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '不能修改系统默认费用类型'
        })
      );
    });
    
    it('应该在用户不是创建者时返回403错误', async () => {
      // 设置参数
      mockReq.params = { id: '1' };
      mockReq.body = { name: '更新后的餐饮' };
      mockReq.user = { sub: '2' }; // 不同的用户ID
      
      // 模拟数据库查询结果 - 费用类型存在但创建者不是当前用户
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, name: '餐饮', is_default: false, created_by: 1 }]
      });
      
      // 调用控制器方法
      await expenseTypeController.updateExpenseType(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '只有费用类型创建者可以修改费用类型信息'
        })
      );
    });
  });
  
  describe('deleteExpenseType', () => {
    it('应该成功删除费用类型', async () => {
      // 设置参数
      mockReq.params = { id: '1' };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, name: '餐饮', is_default: false, created_by: 1 }] }) // 获取费用类型信息
        .mockResolvedValueOnce({ rows: [] }) // 检查是否有账单使用此费用类型
        .mockResolvedValueOnce({}); // 删除费用类型
      
      // 调用控制器方法
      await expenseTypeController.deleteExpenseType(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '费用类型删除成功'
        })
      );
    });
    
    it('应该在费用类型不存在时返回404错误', async () => {
      // 设置参数
      mockReq.params = { id: '999' };
      
      // 模拟数据库查询结果 - 费用类型不存在
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      // 调用控制器方法
      await expenseTypeController.deleteExpenseType(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '费用类型不存在'
        })
      );
    });
    
    it('应该在尝试删除系统默认费用类型时返回403错误', async () => {
      // 设置参数
      mockReq.params = { id: '1' };
      
      // 模拟数据库查询结果 - 系统默认费用类型
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, name: '餐饮', is_default: true, created_by: null }]
      });
      
      // 调用控制器方法
      await expenseTypeController.deleteExpenseType(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '不能删除系统默认费用类型'
        })
      );
    });
    
    it('应该在用户不是创建者时返回403错误', async () => {
      // 设置参数
      mockReq.params = { id: '1' };
      mockReq.user = { sub: '2' }; // 不同的用户ID
      
      // 模拟数据库查询结果 - 费用类型存在但创建者不是当前用户
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, name: '餐饮', is_default: false, created_by: 1 }]
      });
      
      // 调用控制器方法
      await expenseTypeController.deleteExpenseType(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '只有费用类型创建者可以删除费用类型'
        })
      );
    });
    
    it('应该在费用类型被使用时返回409错误', async () => {
      // 设置参数
      mockReq.params = { id: '1' };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, name: '餐饮', is_default: false, created_by: 1 }] }) // 获取费用类型信息
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // 有账单使用此费用类型
      
      // 调用控制器方法
      await expenseTypeController.deleteExpenseType(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '该费用类型正在被使用，不能删除'
        })
      );
    });
  });
  
  describe('getDefaultExpenseTypes', () => {
    it('应该成功获取默认费用类型列表', async () => {
      // 模拟数据库查询结果
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: '餐饮',
            description: '日常餐饮费用',
            icon: 'food',
            color: '#FF5722'
          },
          {
            id: 2,
            name: '交通',
            description: '交通出行费用',
            icon: 'transport',
            color: '#2196F3'
          }
        ]
      });
      
      // 调用控制器方法
      await expenseTypeController.getDefaultExpenseTypes(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '获取默认费用类型列表成功',
          data: expect.arrayContaining([
            expect.objectContaining({
              id: 1,
              name: '餐饮'
            })
          ])
        })
      );
      
      // 验证数据库查询被调用
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      expect(mockPool.query.mock.calls[0][0]).toContain('is_default = true');
    });
  });
});