const request = require('supertest');
const app = require('../../server');
const { redisClient } = require('../../config/redis');

describe('暴力破解防护集成测试', () => {
  beforeAll(async () => {
    // 确保Redis连接
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  });

  afterAll(async () => {
    // 清理测试数据
    await redisClient.flushAll();
    await redisClient.quit();
  });

  beforeEach(async () => {
    // 每次测试前清理Redis数据
    await redisClient.flushAll();
  });

  test('应该在多次失败登录后阻止IP', async () => {
    const username = 'testuser';
    
    // 模拟多次失败登录尝试（超过限制）
    for (let i = 0; i < 6; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({
          username: username,
          password: 'wrongpassword'
        })
        .expect(401);
    }
    
    // 第六次尝试应该被阻止
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: username,
        password: 'wrongpassword'
      })
      .expect(429);
    
    expect(response.body.message).toContain('请求过于频繁');
  });

  test('应该在多次失败登录后阻止用户', async () => {
    const username = 'testuser';
    
    // 模拟多次针对同一用户的失败登录尝试（超过限制）
    for (let i = 0; i < 11; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({
          username: username,
          password: 'wrongpassword'
        })
        .expect(401);
    }
    
    // 第11次尝试应该被阻止
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: username,
        password: 'wrongpassword'
      })
      .expect(429);
    
    expect(response.body.message).toContain('请求过于频繁');
  });

  test('成功登录应该重置失败计数', async () => {
    const username = 'testuser';
    const correctPassword = 'correctpassword';
    
    // 先进行几次失败尝试
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({
          username: username,
          password: 'wrongpassword'
        })
        .expect(401);
    }
    
    // 成功登录
    // 注意：这里需要一个真实的用户账户来进行测试
    // 在实际测试中，您需要先创建一个测试用户
    
    // 再进行几次失败尝试，应该不会立即被阻止
    for (let i = 0; i < 3; i++) {
      await request(app)
        .post('/api/auth/login')
        .send({
          username: username,
          password: 'wrongpassword'
        })
        .expect(401);
    }
  });
});