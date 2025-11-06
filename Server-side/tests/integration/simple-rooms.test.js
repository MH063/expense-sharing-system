// 加载测试环境变量
require('dotenv').config({ path: '.env.test' });

const request = require('supertest');
const app = require('../../server');
const { Pool } = require('pg');

// 测试变量
let testUser;
let authToken;
let testRoom;
let testRoomCode;

// 测试工具函数
const createTestUser = async (userData) => {
  console.log('创建测试用户:', userData.username);
  
  // 先尝试清理可能存在的测试用户
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  console.log('DATABASE_URL:', process.env.DATABASE_URL);
  
  try {
    // 先查询用户ID
    const userResult = await pool.query('SELECT id FROM users WHERE username = $1 OR email = $2', [userData.username, userData.email]);
    
    if (userResult.rows.length > 0) {
      const userId = userResult.rows[0].id;
      console.log('找到已存在的用户ID:', userId);
      
      // 先删除相关的room_members记录
      await pool.query('DELETE FROM room_members WHERE user_id = $1', [userId]);
      console.log('清理room_members记录');
      
      // 再删除相关的rooms记录
      await pool.query('DELETE FROM rooms WHERE creator_id = $1', [userId]);
      console.log('清理rooms记录');
      
      // 最后删除用户
      const deleteResult = await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      console.log('清理已存在的测试用户，删除行数:', deleteResult.rowCount);
    }
  } catch (error) {
    console.error('清理测试用户失败:', error);
  } finally {
    await pool.end();
  }
  
  const response = await request(app)
    .post('/api/users/register')
    .send(userData);
  
  console.log('用户注册响应状态码:', response.status);
  console.log('用户注册响应内容:', response.body);
  
  if (response.status !== 201) {
    console.error('用户创建失败:', response.body);
    throw new Error(`用户创建失败: ${response.body.message}`);
  }
  
  console.log('用户创建成功:', response.body.data);
  return response.body.data;
};

const loginUser = async (credentials) => {
  console.log('用户登录:', credentials.username);
  const response = await request(app)
    .post('/api/users/login')
    .send(credentials);
  
  if (response.status !== 200) {
    console.error('用户登录失败:', response.body);
    throw new Error(`用户登录失败: ${response.body.message}`);
  }
  
  console.log('用户登录成功');
  return response.body.data.token;
};

const createTestRoom = async (roomData, token) => {
  console.log('创建测试寝室:', roomData.name);
  const response = await request(app)
    .post('/api/rooms')
    .set('Authorization', `Bearer ${token}`)
    .send(roomData);
  
  if (response.status !== 201) {
    console.error('寝室创建失败:', response.body);
    throw new Error(`寝室创建失败: ${response.body.message}`);
  }
  
  console.log('寝室创建成功:', response.body.data);
  return response.body.data;
};

describe('寝室API集成测试 - 简化版', () => {
  beforeAll(async () => {
    console.log('开始执行beforeAll钩子...');
    
    try {
      // 创建测试用户
      console.log('步骤1: 创建测试用户');
      testUser = await createTestUser({
        username: 'simpletest',
        password: 'password123',
        email: 'simpletest@example.com'
      });
      
      // 登录获取token
      console.log('步骤2: 用户登录');
      authToken = await loginUser({
        username: 'simpletest',
        password: 'password123'
      });
      
      // 创建测试寝室
      console.log('步骤3: 创建测试寝室');
      testRoom = await createTestRoom({
        name: '简化测试寝室',
        description: '用于简化测试的寝室',
        max_members: 4
      }, authToken);
      
      // 获取寝室邀请码
      console.log('步骤4: 获取寝室邀请码');
      const roomResponse = await request(app)
        .get(`/api/rooms/${testRoom.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      if (roomResponse.status === 200) {
        testRoomCode = roomResponse.body.data.code;
        console.log('寝室邀请码获取成功:', testRoomCode);
      } else {
        throw new Error('获取寝室邀请码失败');
      }
      
      console.log('beforeAll钩子执行完成');
    } catch (error) {
      console.error('beforeAll钩子执行出错:', error);
      throw error;
    }
  });
  
  afterAll(async () => {
    console.log('开始执行afterAll钩子...');
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    try {
      // 清理测试数据
      if (testUser && testUser.id) {
        console.log('清理测试用户数据');
        await pool.query('DELETE FROM room_members WHERE user_id = $1', [testUser.id]);
        await pool.query('DELETE FROM rooms WHERE creator_id = $1', [testUser.id]);
        await pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
      }
    } catch (error) {
      console.error('清理测试数据失败:', error);
    } finally {
      await pool.end();
      console.log('afterAll钩子执行完成');
    }
  });
  
  describe('变量初始化测试', () => {
    it('应该正确初始化所有测试变量', () => {
      console.log('验证变量初始化情况...');
      console.log('testUser:', testUser ? '已定义' : '未定义');
      console.log('authToken:', authToken ? '已定义' : '未定义');
      console.log('testRoom:', testRoom ? '已定义' : '未定义');
      console.log('testRoomCode:', testRoomCode ? '已定义' : '未定义');
      
      expect(testUser).toBeDefined();
      expect(testUser.id).toBeDefined();
      expect(authToken).toBeDefined();
      expect(testRoom).toBeDefined();
      expect(testRoom.id).toBeDefined();
      expect(testRoomCode).toBeDefined();
    });
  });
  
  describe('GET /api/rooms', () => {
    it('应该成功获取用户寝室列表', async () => {
      const response = await request(app)
        .get('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('获取寝室列表成功');
      expect(response.body.data.rooms).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
    });
  });
  
  describe('GET /api/rooms/:id', () => {
    it('应该成功获取寝室详情', async () => {
      const response = await request(app)
        .get(`/api/rooms/${testRoom.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('获取寝室详情成功');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testRoom.id);
      expect(response.body.data.name).toBe('简化测试寝室');
    });
  });
});