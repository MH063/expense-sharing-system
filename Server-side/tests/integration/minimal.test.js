// 加载测试环境变量
require('dotenv').config({ path: '.env.test' });

const request = require('supertest');
const app = require('../../server');

// 测试数据
let testUser;

// 测试前设置
beforeAll(async () => {
  console.log('开始执行beforeAll钩子...');
  
  try {
    // 创建测试用户
    console.log('正在创建测试用户...');
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'minimaltestuser',
        email: 'minimaltest@example.com',
        password: 'password123',
        name: 'Minimal Test User'
      });
    
    console.log('用户创建响应状态:', userResponse.status);
    console.log('用户创建响应:', userResponse.body);
    
    if (userResponse.status !== 201) {
      console.error('用户创建失败，状态码:', userResponse.status);
      return;
    }
    
    testUser = userResponse.body.data;
    console.log('testUser:', testUser);
    
    if (!testUser) {
      console.error('testUser未定义，用户创建可能失败');
      return;
    }
    
    console.log('beforeAll钩子执行完成');
  } catch (error) {
    console.error('beforeAll钩子中发生错误:', error);
    throw error;
  }
});

// 测试后清理
afterAll(async () => {
  // 清理测试数据
  const { Pool } = require('pg');
  const pool = new Pool();
  
  try {
    // 删除测试用户
    if (testUser && testUser.id) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
    }
  } catch (error) {
    console.error('清理测试数据时发生错误:', error);
  } finally {
    await pool.end();
  }
});

describe('最小测试', () => {
  describe('变量初始化测试', () => {
    it('应该正确初始化testUser变量', async () => {
      console.log('测试变量状态:');
      console.log('testUser:', testUser);
      
      expect(testUser).toBeDefined();
      expect(testUser.id).toBeDefined();
    });
  });
});