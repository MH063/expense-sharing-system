const request = require('supertest');
const app = require('../../server');
const { Pool } = require('pg');

// 测试数据库连接
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

describe('用户管理API集成测试', () => {
  let authToken;
  let refreshToken;
  let testUserId;
  
  beforeAll(async () => {
    // 创建正确的密码哈希
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // 创建测试用户
    const userResult = await pool.query(
      'INSERT INTO users (username, email, password_hash, name, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      ['testuser', 'test@example.com', hashedPassword, 'Test User', 'user']
    );
    testUserId = userResult.rows[0].id;
    
    // 获取认证令牌
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'password123' // 在实际测试中，这个密码应该被正确验证
      });
    
    // 由于我们使用的是模拟密码，我们需要直接设置token
    const jwt = require('jsonwebtoken');
    authToken = jwt.sign(
      { 
        sub: testUserId.toString(),
        username: 'testuser',
        roles: ['user'],
        permissions: ['read', 'write']
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    refreshToken = jwt.sign(
      { sub: testUserId.toString() },
      process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
      { expiresIn: '7d' }
    );
  });
  
  afterAll(async () => {
    // 清理测试数据
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    await pool.end();
  });
  
  describe('POST /api/auth/register', () => {
    it('应该成功注册新用户', async () => {
      const randomSuffix = Math.floor(Math.random() * 1000000);
      const userData = {
        username: `newuser_${randomSuffix}`,
        password: 'password123',
        email: `newuser_${randomSuffix}@example.com`,
        displayName: 'New User'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('用户注册成功');
      expect(response.body.data.username).toBe(userData.username);
      expect(response.body.data.email).toBe(userData.email);
      
      // 清理测试数据
      await pool.query('DELETE FROM users WHERE username = $1', [userData.username]);
    });
    
    it('应该在缺少必填字段时返回400', async () => {
      const userData = {
        username: 'incompleteuser',
        // 缺少password
        email: 'incomplete@example.com'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('用户名、密码和邮箱为必填项');
    });
    
    it('应该在用户名已存在时返回409', async () => {
      const userData = {
        username: 'testuser', // 已存在的用户名
        password: 'password123',
        email: 'duplicate@example.com'
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('用户名已被注册');
    });
    
    it('应该在邮箱已存在时返回409', async () => {
      const userData = {
        username: 'anotheruser',
        password: 'password123',
        email: 'test@example.com' // 已存在的邮箱
      };
      
      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('邮箱已被注册');
    });
  });
  
  describe('POST /api/auth/login', () => {
    it('应该成功登录并返回token', async () => {
      const loginData = {
        username: 'testuser',
        password: 'password123'
      };
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('登录成功');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.username).toBe('testuser');
    });
    
    it('应该在缺少必填字段时返回400', async () => {
      const loginData = {
        username: 'testuser',
        // 缺少password
      };
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('用户名/邮箱/手机号和密码为必填项');
    });
    
    it('应该在用户不存在时返回401', async () => {
      const loginData = {
        username: 'nonexistentuser',
        password: 'password123'
      };
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('用户名/邮箱/手机号或密码错误');
    });
  });
  
  describe('POST /api/auth/refresh', () => {
    it('应该成功刷新token', async () => {
      const refreshData = {
        refreshToken: refreshToken
      };
      
      const response = await request(app)
        .post('/api/auth/refresh')
        .send(refreshData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Token刷新成功');
      expect(response.body.data.token).toBeDefined();
    });
    
    it('应该在缺少刷新token时返回400', async () => {
      const refreshData = {};
      
      const response = await request(app)
        .post('/api/auth/refresh')
        .send(refreshData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('刷新Token为必填项');
    });
  });
  
  describe('GET /api/users/profile', () => {
    it('应该成功获取用户资料', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testUserId);
      expect(response.body.data.username).toBe('testuser');
      expect(response.body.data.email).toBe('test@example.com');
    });
    
    it('应该在未提供认证令牌时返回401', async () => {
      await request(app)
        .get('/api/users/profile')
        .expect(401);
    });
  });
  
  describe('PUT /api/users/profile', () => {
    it('应该成功更新用户资料', async () => {
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com',
        phone: '1234567890'
      };
      
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('用户资料更新成功');
      
      // 验证更新是否成功
      const verifyResponse = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(verifyResponse.body.data.name).toBe(updateData.name);
      expect(verifyResponse.body.data.email).toBe(updateData.email);
      expect(verifyResponse.body.data.phone).toBe(updateData.phone);
    });
    
    it('应该在未提供认证令牌时返回401', async () => {
      const updateData = {
        name: 'Updated Name'
      };
      
      await request(app)
        .put('/api/users/profile')
        .send(updateData)
        .expect(401);
    });
  });
  
  describe('PUT /api/users/password', () => {
    it('应该成功修改密码', async () => {
      const passwordData = {
        currentPassword: 'password123',
        newPassword: 'newpassword123'
      };
      
      const response = await request(app)
        .put('/api/users/password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('密码修改成功');
    });
    
    it('应该在当前密码错误时返回400', async () => {
      const passwordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword123'
      };
      
      try {
        const response = await request(app)
          .put('/api/users/password')
          .set('Authorization', `Bearer ${authToken}`)
          .send(passwordData);
        
        // 打印响应信息以便调试
        console.log('响应状态码:', response.status);
        console.log('响应体:', JSON.stringify(response.body, null, 2));
        
        // 先检查响应状态码，如果不是400，则跳过后续断言
        if (response.status !== 400) {
          console.log('期望状态码400，但收到:', response.status);
          console.log('错误信息:', response.body.message || '无错误信息');
        }
        
        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toContain('当前密码错误');
      } catch (error) {
        console.error('测试过程中发生错误:', error);
        throw error;
      }
    });
    
    it('应该在未提供认证令牌时返回401', async () => {
      const passwordData = {
        currentPassword: 'password123',
        newPassword: 'newpassword123'
      };
      
      await request(app)
        .put('/api/users/password')
        .send(passwordData)
        .expect(401);
    });
  });
});