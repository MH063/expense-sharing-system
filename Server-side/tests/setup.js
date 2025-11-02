// Jest测试环境设置文件

// 加载测试环境变量
require('dotenv').config({ path: '.env.test' });

// 设置测试超时时间
jest.setTimeout(10000);

// 全局测试工具
global.testUtils = {
  // 创建测试用户
  createTestUser: async (userData = {}) => {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false
    });
    
    const defaultUser = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      role: 'user'
    };
    
    const user = { ...defaultUser, ...userData };
    
    try {
      const result = await pool.query(
        'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
        [user.username, user.email, user.password, user.role]
      );
      
      await pool.end();
      return result.rows[0];
    } catch (error) {
      await pool.end();
      throw error;
    }
  },
  
  // 创建测试寝室
  createTestRoom: async (roomData = {}) => {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false
    });
    
    const defaultRoom = {
      name: 'Test Room',
      description: 'A test room for testing',
      creator_id: 1
    };
    
    const room = { ...defaultRoom, ...roomData };
    
    try {
      const result = await pool.query(
        'INSERT INTO rooms (name, description, creator_id) VALUES ($1, $2, $3) RETURNING *',
        [room.name, room.description, room.creator_id]
      );
      
      await pool.end();
      return result.rows[0];
    } catch (error) {
      await pool.end();
      throw error;
    }
  },
  
  // 清理测试数据
  cleanupTestData: async () => {
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: false
    });
    
    try {
      // 清理所有表数据（按依赖关系顺序）
      await pool.query('DELETE FROM expense_splits');
      await pool.query('DELETE FROM expenses');
      await pool.query('DELETE FROM bills');
      await pool.query('DELETE FROM room_members');
      await pool.query('DELETE FROM rooms');
      await pool.query('DELETE FROM users');
      
      await pool.end();
    } catch (error) {
      await pool.end();
      throw error;
    }
  },
  
  // 生成JWT令牌
  generateTestToken: (userId, role = 'user') => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { id: userId, role: role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  },
  
  // 模拟请求对象
  mockRequest: (overrides = {}) => {
    return {
      body: {},
      params: {},
      query: {},
      user: { id: 1, role: 'user' },
      headers: {},
      ...overrides
    };
  },
  
  // 模拟响应对象
  mockResponse: () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
  }
};

// 在所有测试之前运行
beforeAll(async () => {
  // 初始化测试数据库
  console.log('Setting up test environment...');
});

// 在所有测试之后运行
afterAll(async () => {
  // 清理测试环境
  console.log('Cleaning up test environment...');
});

// 在每个测试之前运行
beforeEach(async () => {
  // 可以在这里重置模拟或设置测试状态
});

// 在每个测试之后运行
afterEach(async () => {
  // 可以在这里清理测试状态
});