const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../../server');
const { pool } = require('../../config/db');

describe('UserController API测试', () => {
  let authToken;
  let testUserId;

  beforeAll(async () => {
    // 清理可能存在的测试用户
    await pool.query('DELETE FROM users WHERE username = $1', ['testuser']);
    
    // 创建测试用户
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    const userResult = await pool.query(
      `INSERT INTO users (username, password_hash, email, name, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
      ['testuser', hashedPassword, 'test@example.com', 'Test User']
    );
    testUserId = userResult.rows[0].id;

    // 登录获取token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'testpassword'
      });

    authToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    // 清理测试数据
    await pool.query('DELETE FROM users WHERE username = $1', ['testuser']);
    await pool.end();
  });

  describe('POST /api/users/register', () => {
    it('应该成功注册新用户', async () => {
      const timestamp = Date.now();
      const response = await request(app)
        .post('/api/users/register')
        .send({
          username: 'newuser_' + timestamp,
          password: 'password123',
          email: 'newuser_' + timestamp + '@example.com',
          displayName: 'New User'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('用户注册成功');
      expect(response.body.data).toHaveProperty('username');
      expect(response.body.data).toHaveProperty('email');

      // 清理测试数据
      await pool.query('DELETE FROM users WHERE username = $1', ['newuser_' + timestamp]);
    });

    it('应该在缺少必填字段时返回400错误', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          username: 'incompleteuser',
          // 缺少password
          email: 'incomplete@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('用户名、密码和邮箱为必填项');
    });

    it('应该在用户名已存在时返回409错误', async () => {
      const response = await request(app)
        .post('/api/users/register')
        .send({
          username: 'testuser', // 已存在的用户名
          password: 'password123',
          email: 'another@example.com'
        });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('用户名已被注册');
    });
  });

  describe('POST /api/auth/login', () => {
    it('应该成功登录并返回token', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'testpassword'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('登录成功');
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      expect(response.body.data.user.username).toBe('testuser');
    });

    it('应该在密码错误时返回401错误', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('用户名/邮箱/手机号或密码错误');
    });
  });

  describe('GET /api/users/profile', () => {
    it('应该成功获取用户资料', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.username).toBe('testuser');
    });

    it('应该在未授权时返回401错误', async () => {
      const response = await request(app)
        .get('/api/users/profile');

      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/users/profile', () => {
    it('应该成功更新用户资料', async () => {
      const response = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Name',
          email: 'updated@example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('用户资料更新成功');
      expect(response.body.data.name).toBe('Updated Name');
      expect(response.body.data.email).toBe('updated@example.com');
    });

    it('没有token时应该无法更新用户资料', async () => {
      const updateData = {
        name: '更新后的用户名'
      };

      const response = await request(app)
        .put('/api/users/profile')
        .send(updateData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('应该成功刷新token', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'testpassword'
        });

      const refreshToken = loginResponse.body.data.refreshToken;

      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: refreshToken
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
    });
  });
});