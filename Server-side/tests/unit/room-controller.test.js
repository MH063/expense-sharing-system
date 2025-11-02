const RoomController = require('../../controllers/room-controller');
const { Pool } = require('pg');

// 模拟数据库连接
jest.mock('pg', () => {
  const mockPool = {
    query: jest.fn(),
    connect: jest.fn()
  };
  
  // 模拟客户端
  const mockClient = {
    query: jest.fn(),
    release: jest.fn()
  };
  
  mockPool.connect.mockResolvedValue(mockClient);
  
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

describe('RoomController单元测试', () => {
  let roomController;
  let mockPool;
  let mockClient;
  let mockReq;
  let mockRes;
  
  beforeEach(() => {
    // 获取模拟的Pool实例
    mockPool = new Pool();
    mockClient = mockPool.connect();
    
    // 使用已导出的控制器实例
    roomController = RoomController;
    
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
  
  describe('createRoom', () => {
    it('应该成功创建寝室', async () => {
      // 设置模拟数据
      mockReq.body = {
        name: '测试寝室',
        description: '这是一个测试寝室',
        max_members: 6
      };
      
      // 模拟数据库查询结果
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1, name: '测试寝室' }] }) // 插入寝室
        .mockResolvedValueOnce({}) // 插入用户寝室关系
        .mockResolvedValueOnce({}) // 更新用户角色
        .mockResolvedValueOnce({}); // COMMIT
      
      // 模拟获取完整寝室信息的查询
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          name: '测试寝室',
          description: '这是一个测试寝室',
          code: 'ABC123',
          max_members: 6,
          status: 'active',
          created_at: new Date(),
          creator_username: 'testuser',
          creator_name: 'Test User'
        }]
      });
      
      // 调用控制器方法
      await roomController.createRoom(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '寝室创建成功',
          data: expect.objectContaining({
            id: 1,
            name: '测试寝室',
            description: '这是一个测试寝室'
          })
        })
      );
      
      // 验证事务被正确使用
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
    });
    
    it('应该在缺少必填字段时返回400错误', async () => {
      // 设置缺少必填字段的请求
      mockReq.body = {
        description: '这是一个测试寝室',
        // 缺少name
      };
      
      // 调用控制器方法
      await roomController.createRoom(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '寝室名称为必填项'
        })
      );
      
      // 验证数据库连接未被调用
      expect(mockPool.connect).not.toHaveBeenCalled();
    });
    
    it('应该在数据库错误时回滚事务并返回500错误', async () => {
      // 设置请求数据
      mockReq.body = {
        name: '测试寝室',
        description: '这是一个测试寝室'
      };
      
      // 模拟数据库错误
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('数据库连接错误')); // 插入寝室失败
      
      // 模拟ROLLBACK
      mockClient.query.mockResolvedValueOnce({});
      
      // 调用控制器方法
      await roomController.createRoom(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '服务器内部错误'
        })
      );
      
      // 验证事务被回滚
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
  
  describe('getRooms', () => {
    it('应该成功获取寝室列表', async () => {
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
              name: '测试寝室1',
              description: '测试寝室1描述',
              code: 'ABC123',
              max_members: 6,
              status: 'active',
              created_at: new Date(),
              creator_username: 'creator1',
              creator_name: '创建者1',
              current_members: 3
            },
            {
              id: 2,
              name: '测试寝室2',
              description: '测试寝室2描述',
              code: 'DEF456',
              max_members: 6,
              status: 'active',
              created_at: new Date(),
              creator_username: 'creator2',
              creator_name: '创建者2',
              current_members: 4
            }
          ]
        }) // 获取寝室列表
        .mockResolvedValueOnce({ rows: [{ count: 2 }] }); // 获取总数
      
      // 调用控制器方法
      await roomController.getRooms(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '获取寝室列表成功',
          data: expect.objectContaining({
            rooms: expect.arrayContaining([
              expect.objectContaining({
                id: 1,
                name: '测试寝室1'
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
    
    it('应该支持按状态筛选寝室', async () => {
      // 设置查询参数
      mockReq.query = {
        page: '1',
        limit: '10',
        status: 'active'
      };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // 获取寝室列表
        .mockResolvedValueOnce({ rows: [{ count: 0 }] }); // 获取总数
      
      // 调用控制器方法
      await roomController.getRooms(mockReq, mockRes);
      
      // 验证数据库查询被调用
      expect(mockPool.query).toHaveBeenCalledTimes(2);
      
      // 验证查询包含状态筛选
      expect(mockPool.query.mock.calls[0][0]).toContain('r.status = $1');
    });
  });
  
  describe('getRoomById', () => {
    it('应该成功获取寝室详情', async () => {
      // 设置参数
      mockReq.params = { id: '1' };
      
      // 模拟数据库查询结果
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          name: '测试寝室',
          description: '这是一个测试寝室',
          code: 'ABC123',
          max_members: 6,
          status: 'active',
          created_at: new Date(),
          updated_at: new Date(),
          creator_username: 'testuser',
          creator_name: 'Test User'
        }]
      });
      
      // 调用控制器方法
      await roomController.getRoomById(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '获取寝室详情成功',
          data: expect.objectContaining({
            id: 1,
            name: '测试寝室'
          })
        })
      );
    });
    
    it('应该在寝室不存在时返回404错误', async () => {
      // 设置参数
      mockReq.params = { id: '999' };
      
      // 模拟数据库查询结果 - 寝室不存在
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      // 调用控制器方法
      await roomController.getRoomById(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '寝室不存在'
        })
      );
    });
  });
  
  describe('updateRoom', () => {
    it('应该成功更新寝室信息', async () => {
      // 设置参数和更新数据
      mockReq.params = { id: '1' };
      mockReq.body = {
        name: '更新后的寝室',
        description: '更新后的描述',
        max_members: 8
      };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, creator_id: 1 }] }) // 获取寝室信息
        .mockResolvedValueOnce({ rows: [{ id: 1, name: '更新后的寝室' }] }); // 更新寝室信息
      
      // 调用控制器方法
      await roomController.updateRoom(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '寝室信息更新成功',
          data: expect.objectContaining({
            id: 1,
            name: '更新后的寝室'
          })
        })
      );
    });
    
    it('应该在寝室不存在时返回404错误', async () => {
      // 设置参数
      mockReq.params = { id: '999' };
      mockReq.body = { name: '更新后的寝室' };
      
      // 模拟数据库查询结果 - 寝室不存在
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      // 调用控制器方法
      await roomController.updateRoom(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '寝室不存在'
        })
      );
    });
    
    it('应该在用户不是寝室创建者时返回403错误', async () => {
      // 设置参数
      mockReq.params = { id: '1' };
      mockReq.body = { name: '更新后的寝室' };
      mockReq.user = { sub: '2' }; // 不同的用户ID
      
      // 模拟数据库查询结果 - 寝室存在但创建者不是当前用户
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, creator_id: 1 }] });
      
      // 调用控制器方法
      await roomController.updateRoom(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '只有寝室创建者可以修改寝室信息'
        })
      );
    });
  });
  
  describe('joinRoom', () => {
    it('应该成功通过邀请码加入寝室', async () => {
      // 设置请求数据
      mockReq.body = { code: 'ABC123' };
      mockReq.user = { sub: '2' };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, name: '测试寝室', max_members: 6, status: 'active' }] }) // 获取寝室信息
        .mockResolvedValueOnce({ rows: [] }) // 检查用户是否已加入寝室
        .mockResolvedValueOnce({ rows: [{ count: 3 }] }) // 获取当前成员数
        .mockResolvedValueOnce({}); // 加入寝室
      
      // 调用控制器方法
      await roomController.joinRoom(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '成功加入寝室'
        })
      );
    });
    
    it('应该在邀请码无效时返回404错误', async () => {
      // 设置请求数据
      mockReq.body = { code: 'INVALID' };
      
      // 模拟数据库查询结果 - 邀请码无效
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      // 调用控制器方法
      await roomController.joinRoom(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '邀请码无效或寝室不存在'
        })
      );
    });
    
    it('应该在用户已加入寝室时返回409错误', async () => {
      // 设置请求数据
      mockReq.body = { code: 'ABC123' };
      mockReq.user = { sub: '2' };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, name: '测试寝室' }] }) // 获取寝室信息
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // 用户已加入寝室
      
      // 调用控制器方法
      await roomController.joinRoom(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '您已经是该寝室的成员'
        })
      );
    });
    
    it('应该在寝室成员已满时返回409错误', async () => {
      // 设置请求数据
      mockReq.body = { code: 'ABC123' };
      mockReq.user = { sub: '2' };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, name: '测试寝室', max_members: 4, status: 'active' }] }) // 获取寝室信息
        .mockResolvedValueOnce({ rows: [] }) // 检查用户是否已加入寝室
        .mockResolvedValueOnce({ rows: [{ count: 4 }] }); // 当前成员数已达上限
      
      // 调用控制器方法
      await roomController.joinRoom(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '寝室成员已满'
        })
      );
    });
  });
  
  describe('leaveRoom', () => {
    it('应该成功退出寝室', async () => {
      // 设置参数
      mockReq.params = { id: '1' };
      mockReq.user = { sub: '2' };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, creator_id: 1 }] }) // 获取寝室信息
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // 检查用户是否是寝室成员
        .mockResolvedValueOnce({}); // 退出寝室
      
      // 调用控制器方法
      await roomController.leaveRoom(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '成功退出寝室'
        })
      );
    });
    
    it('应该在寝室不存在时返回404错误', async () => {
      // 设置参数
      mockReq.params = { id: '999' };
      
      // 模拟数据库查询结果 - 寝室不存在
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      // 调用控制器方法
      await roomController.leaveRoom(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '寝室不存在'
        })
      );
    });
    
    it('应该在用户不是寝室成员时返回400错误', async () => {
      // 设置参数
      mockReq.params = { id: '1' };
      mockReq.user = { sub: '2' };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, creator_id: 1 }] }) // 获取寝室信息
        .mockResolvedValueOnce({ rows: [] }); // 用户不是寝室成员
      
      // 调用控制器方法
      await roomController.leaveRoom(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '您不是该寝室的成员'
        })
      );
    });
    
    it('应该在用户是寝室创建者时返回400错误', async () => {
      // 设置参数
      mockReq.params = { id: '1' };
      mockReq.user = { sub: '1' }; // 创建者ID
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, creator_id: 1 }] }) // 获取寝室信息
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // 用户是寝室成员
      
      // 调用控制器方法
      await roomController.leaveRoom(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '寝室创建者不能退出寝室，请先转让寝室或删除寝室'
        })
      );
    });
  });
  
  describe('getRoomMembers', () => {
    it('应该成功获取寝室成员列表', async () => {
      // 设置参数
      mockReq.params = { id: '1' };
      mockReq.user = { sub: '1' };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, creator_id: 1 }] }) // 获取寝室信息
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // 检查用户是否是寝室成员
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              username: 'user1',
              name: '用户1',
              email: 'user1@example.com',
              role: 'owner',
              join_date: '2023-01-01'
            },
            {
              id: 2,
              username: 'user2',
              name: '用户2',
              email: 'user2@example.com',
              role: 'member',
              join_date: '2023-01-02'
            }
          ]
        }); // 获取寝室成员列表
      
      // 调用控制器方法
      await roomController.getRoomMembers(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '获取寝室成员列表成功',
          data: expect.arrayContaining([
            expect.objectContaining({
              id: 1,
              username: 'user1',
              role: 'owner'
            })
          ])
        })
      );
    });
    
    it('应该在用户不是寝室成员时返回403错误', async () => {
      // 设置参数
      mockReq.params = { id: '1' };
      mockReq.user = { sub: '2' };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, creator_id: 1 }] }) // 获取寝室信息
        .mockResolvedValueOnce({ rows: [] }); // 用户不是寝室成员
      
      // 调用控制器方法
      await roomController.getRoomMembers(mockReq, mockRes);
      
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
  
  describe('removeMember', () => {
    it('应该成功移除寝室成员', async () => {
      // 设置参数
      mockReq.params = { id: '1', userId: '2' };
      mockReq.user = { sub: '1' }; // 创建者
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, creator_id: 1 }] }) // 获取寝室信息
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }) // 检查要移除的用户是否是寝室成员
        .mockResolvedValueOnce({}); // 移除成员
      
      // 调用控制器方法
      await roomController.removeMember(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '成员移除成功'
        })
      );
    });
    
    it('应该在用户不是寝室创建者时返回403错误', async () => {
      // 设置参数
      mockReq.params = { id: '1', userId: '2' };
      mockReq.user = { sub: '3' }; // 既不是创建者也不是要移除的用户
      
      // 模拟数据库查询结果
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, creator_id: 1 }] });
      
      // 调用控制器方法
      await roomController.removeMember(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '只有寝室创建者可以移除成员'
        })
      );
    });
    
    it('应该在尝试移除创建者时返回400错误', async () => {
      // 设置参数
      mockReq.params = { id: '1', userId: '1' }; // 尝试移除创建者
      mockReq.user = { sub: '1' }; // 创建者
      
      // 模拟数据库查询结果
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1, creator_id: 1 }] });
      
      // 调用控制器方法
      await roomController.removeMember(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '不能移除寝室创建者'
        })
      );
    });
  });
});