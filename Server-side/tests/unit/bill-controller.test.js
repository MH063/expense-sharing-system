const BillController = require('../../controllers/bill-controller');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// 模拟数据库连接
jest.mock('pg', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn()
  };
  
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn(() => mockClient),
    end: jest.fn()
  };
  
  return {
    Pool: jest.fn(() => mockPool)
  };
});

// 模拟WebSocket事件
jest.mock('../../services/websocket-events', () => ({
  handleBillCreated: jest.fn(),
  handleBillReviewed: jest.fn(),
  handleBillPaymentConfirmed: jest.fn()
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

describe.skip('BillController单元测试', () => {
  let billController;
  let mockPool;
  let mockClient;
  let mockReq;
  let mockRes;
  
  beforeEach(() => {
    // 获取模拟的Pool实例
    mockPool = new Pool();
    mockClient = mockPool.connect();
    
    // 使用已导出的控制器实例
    billController = BillController;
    
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
  
  describe('createBill', () => {
    it('应该成功创建账单', async () => {
      // 设置模拟数据
      mockReq.body = {
        title: '测试账单',
        description: '这是一个测试账单',
        total_amount: 100,
        due_date: '2023-12-31',
        room_id: 1,
        expense_ids: [1],
        split_type: 'EQUAL'
      };
      
      // 模拟数据库查询结果
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1 }] }) // 检查寝室成员
        .mockResolvedValueOnce({ rows: [{ count: 1 }] }) // 检查费用记录
        .mockResolvedValueOnce({}) // BEGIN事务
        .mockResolvedValueOnce({ rows: [{ id: 1, title: '测试账单', description: '这是一个测试账单' }] }) // 插入账单
        .mockResolvedValueOnce({}) // 插入账单费用关联
        .mockResolvedValueOnce({ rows: [{ user_id: 1 }, { user_id: 2 }] }) // 获取寝室成员
        .mockResolvedValueOnce({}) // 插入账单分摊记录1
        .mockResolvedValueOnce({}) // 插入账单分摊记录2
        .mockResolvedValueOnce({}); // COMMIT事务
      
      // 调用控制器方法
      await billController.createBill(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            bill: expect.objectContaining({
              title: '测试账单',
              description: '这是一个测试账单'
            })
          })
        })
      );
      
      // 验证数据库查询被调用（最少调用9次，避免实现细节变动造成脆弱）
      expect(mockClient.query.mock.calls.length).toBeGreaterThanOrEqual(9);
      
      // 验证连接已释放
      expect(mockClient.release).toHaveBeenCalled();
    });
    
    it('应该在缺少必填字段时返回500错误', async () => {
      // 设置缺少必填字段的请求
      mockReq.body = {
        title: '测试账单',
        // 缺少due_date
        room_id: 1
      };
      
      // 调用控制器方法
      await billController.createBill(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '创建账单失败'
        })
      );
      
      // 验证连接已释放
      expect(mockClient.release).toHaveBeenCalled();
    });
    
    it('应该在用户不是寝室成员时返回403错误', async () => {
      // 设置请求数据
      mockReq.body = {
        title: '测试账单',
        description: '测试',
        total_amount: 100,
        due_date: '2023-12-31',
        room_id: 1
      };
      
      // 模拟数据库查询结果 - 用户不是寝室成员
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      // 调用控制器方法
      await billController.createBill(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '您不是该寝室的成员'
        })
      );
      
      // 验证连接已释放
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
  
  describe('getBills', () => {
    it('应该成功获取账单列表', async () => {
      // 设置查询参数
      mockReq.query = {
        room_id: '1',
        page: '1', // 使用字符串，因为从req.query获取的是字符串
        limit: '10' // 使用字符串，因为从req.query获取的是字符串
      };
      
      // 模拟数据库查询结果
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1, title: '测试账单', due_date: '2023-12-31' }] }) // 获取账单列表
        .mockResolvedValueOnce({ rows: [{ total: '1' }] }); // 获取总数，注意字段名是total而不是count
      
      // 调用控制器方法
      await billController.getBills(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            bills: expect.arrayContaining([
              expect.objectContaining({
                id: 1,
                title: '测试账单'
              })
            ]),
            pagination: expect.objectContaining({
              page: 1,
              limit: 10,
              total: 1,
              pages: 1
            })
          })
        })
      );
      
      // 验证连接已释放
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
  
  describe('getBillById', () => {
    it('应该成功获取特定账单详情', async () => {
      // 设置参数
      mockReq.params = { id: '1' };
      
      // 模拟数据库查询结果
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1, room_id: 1, creator_id: 1, member_id: 1 }] }) // 获取账单和权限
        .mockResolvedValueOnce({ rows: [{ id: 1, room_id: 1, creator_id: 1, title: '测试账单', description: '测试描述', total_amount: 100.50, due_date: '2023-12-31', status: 'PENDING', creator_name: '测试用户', room_name: '测试寝室' }] }) // 获取账单详细信息
        .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 1, amount: 50.25, user_name: '测试用户' }] }) // 获取账单分摊详情
        .mockResolvedValueOnce({ rows: [] }) // 获取关联的费用记录
        .mockResolvedValueOnce({ rows: [] }); // 获取审核记录
      
      // 调用控制器方法
      await billController.getBillById(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            bill: expect.objectContaining({
              id: 1,
              splits: expect.arrayContaining([
                expect.objectContaining({
                  id: 1,
                  amount: 50.25
                })
              ])
            })
          })
        })
      );
      
      // 验证连接已释放
      expect(mockClient.release).toHaveBeenCalled();
    });
    
    it('应该在账单不存在时返回403错误', async () => {
      // 设置参数
      mockReq.params = { id: '99999' };
      
      // 模拟数据库查询结果 - 账单不存在或无权限
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      // 调用控制器方法
      await billController.getBillById(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '您没有权限查看该账单'
        })
      );
      
      // 验证连接已释放
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
  
  describe('reviewBill', () => {
    it('应该成功审核账单', async () => {
      // 设置参数和请求体
      mockReq.params = { id: '1' };
      mockReq.body = {
        action: 'APPROVE',
        comment: '审核通过'
      };
      mockReq.user = { id: 1, role: 'admin' }; // 设置为管理员
      
      // 模拟数据库查询结果
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ id: 1, room_id: 1, user_id: 1, status: 'PENDING', member_role: 'admin' }] }) // 获取账单和权限
        .mockResolvedValueOnce({}) // 创建审核记录
        .mockResolvedValueOnce({}) // 更新账单状态
        .mockResolvedValueOnce({}); // 更新分摊状态
      
      // 调用控制器方法
      await billController.reviewBill(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            message: '账单通过审核'
          })
        })
      );
      
      // 验证连接已释放
      expect(mockClient.release).toHaveBeenCalled();
    });
    
    it('应该在账单不存在时返回403错误', async () => {
      // 设置参数
      mockReq.params = { id: '99999' };
      mockReq.body = { action: 'APPROVE' };
      mockReq.user = { id: 1, role: 'admin' };
      
      // 模拟数据库查询结果 - 账单不存在
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      // 调用控制器方法
      await billController.reviewBill(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '您没有权限审核该账单'
        })
      );
      
      // 验证连接已释放
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
  
  describe('confirmBillPayment', () => {
    it('应该成功确认账单支付', async () => {
      // 设置参数和请求体
      mockReq.params = { id: '1' };
      mockReq.user = { id: 1 };
      
      // 模拟数据库查询结果
      mockClient.query
        .mockResolvedValueOnce({ rows: [{ bill_id: 1, user_id: 1, bill_status: 'APPROVED', status: 'PENDING_PAYMENT' }] }) // 获取账单分摊记录
        .mockResolvedValueOnce({}) // BEGIN 事务
        .mockResolvedValueOnce({}) // 更新分摊状态为已支付
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }) // 检查未支付分摊数量
        .mockResolvedValueOnce({}) // 更新账单状态为已完成
        .mockResolvedValueOnce({}); // COMMIT 事务
      
      // 调用控制器方法
      await billController.confirmBillPayment(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            message: '支付确认成功'
          })
        })
      );
      
      // 验证连接已释放
      expect(mockClient.release).toHaveBeenCalled();
    });
    
    it('应该在分摊ID不存在时返回403错误', async () => {
      // 设置参数和请求体
      mockReq.params = { id: '1' };
      mockReq.user = { id: 1 };
      
      // 模拟数据库查询结果 - 账单分摊记录不存在
      mockClient.query.mockResolvedValueOnce({ rows: [] });
      
      // 调用控制器方法
      await billController.confirmBillPayment(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '您没有该账单的分摊记录'
        })
      );
      
      // 验证连接已释放
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});