const UserController = require('../../controllers/user-controller');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 解构赋值获取控制器实例
const { register, login, refreshToken, getProfile, updateProfile, changePassword, getUsers, assignUserRole } = UserController;

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

// 模拟bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn()
}));

// 模拟jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn()
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

describe('UserController单元测试', () => {
  let userController;
  let mockPool;
  let mockReq;
  let mockRes;
  
  beforeEach(() => {
    // 获取模拟的Pool实例
    mockPool = new Pool();
    
    // 使用已导出的控制器实例
    userController = UserController;
    
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
  
  describe('register', () => {
    it('应该成功注册新用户', async () => {
      // 设置模拟数据
      mockReq.body = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com',
        displayName: 'Test User'
      };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // 用户名不存在
        .mockResolvedValueOnce({ rows: [] }) // 邮箱不存在
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // 插入用户成功
        .mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser', email: 'test@example.com', name: 'Test User' }] }); // 获取用户信息
      
      // 模拟密码加密
      bcrypt.hash.mockResolvedValue('hashedPassword');
      
      // 调用控制器方法
      await register(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '用户注册成功',
          data: expect.objectContaining({
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            name: 'Test User'
          })
        })
      );
      
      // 验证数据库查询被调用
      expect(mockPool.query).toHaveBeenCalledTimes(4);
      
      // 验证密码加密被调用
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    });
    
    it('应该在缺少必填字段时返回400错误', async () => {
      // 设置缺少必填字段的请求
      mockReq.body = {
        username: 'testuser',
        // 缺少password
        email: 'test@example.com'
      };
      
      // 调用控制器方法
      await userController.register(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '用户名、密码和邮箱为必填项'
        })
      );
      
      // 验证数据库查询未被调用
      expect(mockPool.query).not.toHaveBeenCalled();
    });
    
    it('应该在用户名已存在时返回409错误', async () => {
      // 设置请求数据
      mockReq.body = {
        username: 'existinguser',
        password: 'password123',
        email: 'test@example.com'
      };
      
      // 模拟数据库查询结果 - 用户名已存在
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
      
      // 调用控制器方法
      await userController.register(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '用户名已被注册'
        })
      );
      
      // 验证数据库查询只被调用一次
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });
    
    it('应该在邮箱已存在时返回409错误', async () => {
      // 设置请求数据
      mockReq.body = {
        username: 'testuser',
        password: 'password123',
        email: 'existing@example.com'
      };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // 用户名不存在
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // 邮箱已存在
      
      // 调用控制器方法
      await userController.register(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '邮箱已被注册'
        })
      );
      
      // 验证数据库查询被调用两次
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });
    
    it('应该在数据库错误时返回500错误', async () => {
      // 设置请求数据
      mockReq.body = {
        username: 'testuser',
        password: 'password123',
        email: 'test@example.com'
      };
      
      // 模拟数据库错误
      mockPool.query.mockRejectedValueOnce(new Error('数据库连接错误'));
      
      // 调用控制器方法
      await userController.register(mockReq, mockRes);
      
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
  
  describe('login', () => {
    it('应该成功登录并返回token', async () => {
      // 设置请求数据
      mockReq.body = {
        username: 'testuser',
        password: 'password123'
      };
      
      // 模拟数据库查询结果 - 用户存在
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          password_hash: 'hashedPassword',
          name: 'Test User'
        }]
      });
      
      // 模拟密码验证成功
      bcrypt.compare.mockResolvedValue(true);
      
      // 模拟JWT生成
      jwt.sign
        .mockReturnValueOnce('accessToken')
        .mockReturnValueOnce('refreshToken');
      
      // 调用控制器方法
      await userController.login(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '登录成功',
          data: expect.objectContaining({
            token: 'accessToken',
            refreshToken: 'refreshToken',
            user: expect.objectContaining({
              id: 1,
              username: 'testuser',
              email: 'test@example.com',
              name: 'Test User'
            })
          })
        })
      );
      
      // 验证密码验证被调用
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
      
      // 验证JWT生成被调用
      expect(jwt.sign).toHaveBeenCalledTimes(2);
    });
    
    it('应该在缺少必填字段时返回400错误', async () => {
      // 设置缺少必填字段的请求
      mockReq.body = {
        username: 'testuser',
        // 缺少password
      };
      
      // 调用控制器方法
      await userController.login(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '用户名/邮箱/手机号和密码为必填项'
        })
      );
      
      // 验证数据库查询未被调用
      expect(mockPool.query).not.toHaveBeenCalled();
    });
    
    it('应该在用户不存在时返回401错误', async () => {
      // 设置请求数据
      mockReq.body = {
        username: 'nonexistentuser',
        password: 'password123'
      };
      
      // 模拟数据库查询结果 - 用户不存在
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      // 调用控制器方法
      await userController.login(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '用户名/邮箱/手机号或密码错误'
        })
      );
      
      // 验证数据库查询被调用
      expect(mockPool.query).toHaveBeenCalledTimes(1);
      
      // 验证密码验证未被调用
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
    
    it('应该在密码错误时返回401错误', async () => {
      // 设置请求数据
      mockReq.body = {
        username: 'testuser',
        password: 'wrongpassword'
      };
      
      // 模拟数据库查询结果 - 用户存在
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'testuser',
          password_hash: 'hashedPassword'
        }]
      });
      
      // 模拟密码验证失败
      bcrypt.compare.mockResolvedValue(false);
      
      // 调用控制器方法
      await userController.login(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '用户名/邮箱/手机号或密码错误'
        })
      );
      
      // 验证密码验证被调用
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpassword', 'hashedPassword');
      
      // 验证JWT生成未被调用
      expect(jwt.sign).not.toHaveBeenCalled();
    });
    
    it('应该在数据库错误时返回500错误', async () => {
      // 设置请求数据
      mockReq.body = {
        username: 'testuser',
        password: 'password123'
      };
      
      // 模拟数据库错误
      mockPool.query.mockRejectedValueOnce(new Error('数据库连接错误'));
      
      // 调用控制器方法
      await userController.login(mockReq, mockRes);
      
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
  
  describe('refreshToken', () => {
    it('应该成功刷新token', async () => {
      // 设置请求数据
      mockReq.body = {
        refreshToken: 'validRefreshToken'
      };
      
      // 模拟JWT验证
      jwt.verify.mockReturnValue({ sub: '1', exp: Math.floor(Date.now() / 1000) + 3600 });
      jwt.sign.mockReturnValue('newAccessToken');
      
      // 模拟数据库查询结果
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user'
        }]
      });
      
      // 调用控制器方法
      await userController.refreshToken(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Token刷新成功',
          data: expect.objectContaining({
            token: 'newAccessToken'
          })
        })
      );
      
      // 验证JWT验证被调用
      expect(jwt.verify).toHaveBeenCalledWith('validRefreshToken', process.env.JWT_REFRESH_SECRET);
      
      // 验证JWT签名被调用
      expect(jwt.sign).toHaveBeenCalledWith(
        { sub: '1', username: 'testuser', roles: ['user'], permissions: ['read', 'write'] },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      // 验证刷新Token签名被调用
      expect(jwt.sign).toHaveBeenCalledWith(
        { sub: '1' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );
    });
    
    it('应该在缺少刷新token时返回400错误', async () => {
      // 设置缺少刷新token的请求
      mockReq.body = {};
      
      // 调用控制器方法
      await userController.refreshToken(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '刷新Token为必填项'
        })
      );
    });
  });
  
  describe('getProfile', () => {
    it('应该成功获取用户资料', async () => {
      // 设置用户ID
      mockReq.user = { sub: '1' };
      
      // 模拟数据库查询结果
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@example.com',
          name: 'Test User',
          role: 'user',
          status: 'active',
          phone: null,
          avatar_url: null,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z'
        }]
      });
      
      // 调用控制器方法
      await userController.getProfile(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            name: 'Test User',
            role: 'user'
          })
        })
      );
    });
    
    it('应该在用户不存在时返回404错误', async () => {
      // 设置用户ID
      mockReq.user = { sub: '999' };
      
      // 模拟数据库查询结果 - 用户不存在
      mockPool.query.mockResolvedValueOnce({ rows: [] });
      
      // 调用控制器方法
      await userController.getProfile(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '用户不存在'
        })
      );
    });
  });
  
  describe('updateProfile', () => {
    it('应该成功更新用户资料', async () => {
      // 设置用户ID和更新数据
      mockReq.user = { sub: '1' };
      mockReq.body = {
        name: 'Updated Name',
        email: 'updated@example.com',
        phone: '1234567890'
      };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1, username: 'testuser', email: 'test@example.com' }] }) // 用户存在
        .mockResolvedValueOnce({ rows: [] }) // 邮箱未被其他用户使用
        .mockResolvedValueOnce({ // 更新成功，返回更新后的用户信息
          rows: [{
            id: 1,
            username: 'testuser',
            email: 'updated@example.com',
            name: 'Updated Name',
            phone: '1234567890',
            role: 'user',
            status: 'active',
            avatar_url: null,
            updated_at: new Date().toISOString()
          }]
        });
      
      // 调用控制器方法
      await userController.updateProfile(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '用户资料更新成功',
          data: expect.objectContaining({
            id: 1,
            username: 'testuser',
            email: 'updated@example.com',
            name: 'Updated Name',
            phone: '1234567890'
          })
        })
      );
      
      // 验证数据库查询被调用
      expect(mockPool.query).toHaveBeenCalledTimes(3);
    });
    
    it('应该在邮箱已被其他用户使用时返回409错误', async () => {
      // 设置用户ID和更新数据
      mockReq.user = { sub: '1' };
      mockReq.body = {
        email: 'existing@example.com'
      };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // 用户存在
        .mockResolvedValueOnce({ rows: [{ id: 2 }] }); // 邮箱已被其他用户使用
      
      // 调用控制器方法
      await userController.updateProfile(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '邮箱已被其他用户使用'
        })
      );
    });
  });
  
  describe('changePassword', () => {
    it('应该成功修改密码', async () => {
      // 设置用户ID和密码数据
      mockReq.user = { sub: '1' };
      mockReq.body = {
        currentPassword: 'currentPassword',
        newPassword: 'newPassword'
      };
      
      // 模拟数据库查询结果
      mockPool.query
        .mockResolvedValueOnce({
          rows: [{ id: 1, password_hash: 'hashedCurrentPassword' }]
        }) // 获取用户当前密码
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // 更新密码成功
      
      // 模拟密码验证
      bcrypt.compare.mockResolvedValue(true);
      
      // 模拟密码加密
      bcrypt.hash.mockResolvedValue('hashedNewPassword');
      
      // 调用控制器方法
      await userController.changePassword(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: '密码修改成功'
        })
      );
      
      // 验证密码验证被调用
      expect(bcrypt.compare).toHaveBeenCalledWith('currentPassword', 'hashedCurrentPassword');
      
      // 验证密码加密被调用
      expect(bcrypt.hash).toHaveBeenCalledWith('newPassword', 10);
    });
    
    it('应该在当前密码错误时返回400错误', async () => {
      // 设置用户ID和密码数据
      mockReq.user = { sub: '1' };
      mockReq.body = {
        currentPassword: 'wrongPassword',
        newPassword: 'newPassword'
      };
      
      // 模拟数据库查询结果
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, password_hash: 'hashedCurrentPassword' }]
      });
      
      // 模拟密码验证失败
      bcrypt.compare.mockResolvedValue(false);
      
      // 调用控制器方法
      await userController.changePassword(mockReq, mockRes);
      
      // 验证响应
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: '当前密码错误'
        })
      );
      
      // 验证密码验证被调用
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongPassword', 'hashedCurrentPassword');
      
      // 验证密码加密未被调用
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });
  });
});