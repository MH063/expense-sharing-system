// 加载测试环境变量
require('dotenv').config({ path: '.env.test' });

const request = require('supertest');
const app = require('../../server');

// 测试数据
let testUser;
let testRoom;
let testRoomCode;
let authToken;

// 测试前设置
beforeAll(async () => {
  console.log('开始执行beforeAll钩子...');
  
  try {
    // 创建测试用户
    console.log('正在创建测试用户...');
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'simpletestuser',
        email: 'simpletest@example.com',
        password: 'password123',
        name: 'Simple Test User'
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
    
    // 登录获取令牌
    console.log('正在登录获取令牌...');
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'simpletestuser',
        password: 'password123'
      });
    
    console.log('登录响应状态:', loginResponse.status);
    console.log('登录响应:', loginResponse.body);
    
    if (loginResponse.status !== 200) {
      console.error('登录失败，状态码:', loginResponse.status);
      return;
    }
    
    authToken = loginResponse.body.data.token;
    console.log('authToken:', authToken);
    
    // 创建测试寝室
    console.log('正在创建测试寝室...');
    const roomResponse = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '简单测试寝室',
        description: '这是一个简单的测试寝室',
        max_members: 6
      });
    
    console.log('寝室创建响应状态:', roomResponse.status);
    console.log('寝室创建响应:', roomResponse.body);
    
    if (roomResponse.status !== 201) {
      console.error('寝室创建失败，状态码:', roomResponse.status);
      return;
    }
    
    testRoom = roomResponse.body.data;
    testRoomCode = roomResponse.body.data.code;
    console.log('testRoom:', testRoom);
    console.log('testRoomCode:', testRoomCode);
    
    if (!testRoom) {
      console.error('testRoom未定义，寝室创建可能失败');
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
    // 删除测试用户创建的寝室
    if (testUser && testUser.id) {
      await pool.query('DELETE FROM user_rooms WHERE user_id = $1', [testUser.id]);
    }
    
    // 删除测试寝室
    if (testRoom && testRoom.id) {
      await pool.query('DELETE FROM rooms WHERE id = $1', [testRoom.id]);
    }
    
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

describe('简单API集成测试', () => {
  describe('变量初始化测试', () => {
    it('应该正确初始化所有测试变量', async () => {
      console.log('测试变量状态:');
      console.log('testUser:', testUser);
      console.log('testRoom:', testRoom);
      console.log('testRoomCode:', testRoomCode);
      console.log('authToken:', authToken);
      
      expect(testUser).toBeDefined();
      expect(testUser.id).toBeDefined();
      expect(testRoom).toBeDefined();
      expect(testRoom.id).toBeDefined();
      expect(testRoomCode).toBeDefined();
      expect(authToken).toBeDefined();
    });
  });
  
  describe('GET /api/rooms/:id', () => {
    it('应该成功获取寝室详情', async () => {
      if (!testRoom || !testRoom.id) {
        console.log('testRoom未定义，跳过测试');
        return;
      }
      
      const response = await request(app)
        .get(`/api/rooms/${testRoom.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      console.log('获取寝室详情响应状态:', response.status);
      console.log('获取寝室详情响应:', response.body);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('获取寝室详情成功');
      expect(response.body.data.id).toBe(testRoom.id);
      expect(response.body.data.name).toBe(testRoom.name);
    });
  });
});