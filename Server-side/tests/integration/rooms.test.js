// 加载测试环境变量
require('dotenv').config({ path: '.env.test' });

const request = require('supertest');
const app = require('../../server');
const { Pool } = require('pg');

// 测试数据
let testUser;
let testRoom;
let testRoomCode;
let authToken;
let secondUser;
let secondUserToken;
let thirdUser;
let thirdUserToken;
let fourthUser;
let fourthUserToken;

// 测试前设置
beforeAll(async () => {
  console.log('开始执行beforeAll钩子...');
  try {
    // 创建测试用户
    console.log('正在创建测试用户...');
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'roomtestuser',
        email: 'roomtest@example.com',
        password: 'password123',
        name: 'Room Test User'
      });
    
    console.log('用户创建响应状态:', userResponse.status);
    console.log('用户创建响应:', userResponse.body);
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
        username: 'roomtestuser',
        password: 'password123'
      });
    
    console.log('登录响应状态:', loginResponse.status);
    console.log('登录响应:', loginResponse.body);
    authToken = loginResponse.body.data.token;
    console.log('authToken:', authToken);
    
    // 创建测试寝室
    console.log('正在创建测试寝室...');
    const roomResponse = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '测试寝室',
        description: '这是一个测试寝室',
        max_members: 6
      });
    
    console.log('寝室创建响应状态:', roomResponse.status);
    console.log('寝室创建响应:', roomResponse.body);
    testRoom = roomResponse.body.data;
    testRoomCode = roomResponse.body.data.code;
    console.log('testRoom:', testRoom);
    console.log('testRoomCode:', testRoomCode);
    
    if (!testRoom) {
      console.error('testRoom未定义，寝室创建可能失败');
      return;
    }
    
    // 创建第二个测试用户
    console.log('正在创建第二个测试用户...');
    const secondUserResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'roomtestuser2',
        email: 'roomtest2@example.com',
        password: 'password123',
        name: 'Room Test User 2'
      });
    
    console.log('第二个用户创建响应状态:', secondUserResponse.status);
    console.log('第二个用户创建响应:', secondUserResponse.body);
    secondUser = secondUserResponse.body.data;
    console.log('secondUser:', secondUser);
    
    // 登录获取令牌
    console.log('正在为第二个用户登录获取令牌...');
    const secondLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'roomtestuser2',
        password: 'password123'
      });
    
    console.log('第二个用户登录响应状态:', secondLoginResponse.status);
    console.log('第二个用户登录响应:', secondLoginResponse.body);
    secondUserToken = secondLoginResponse.body.data.token;
    console.log('secondUserToken:', secondUserToken);
    
    // 创建第三个测试用户
    console.log('正在创建第三个测试用户...');
    const thirdUserResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'roomtestuser3',
        email: 'roomtest3@example.com',
        password: 'password123',
        name: 'Room Test User 3'
      });
    
    console.log('第三个用户创建响应状态:', thirdUserResponse.status);
    console.log('第三个用户创建响应:', thirdUserResponse.body);
    thirdUser = thirdUserResponse.body.data;
    console.log('thirdUser:', thirdUser);
    
    // 登录获取令牌
    console.log('正在为第三个用户登录获取令牌...');
    const thirdLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'roomtestuser3',
        password: 'password123'
      });
    
    console.log('第三个用户登录响应状态:', thirdLoginResponse.status);
    console.log('第三个用户登录响应:', thirdLoginResponse.body);
    thirdUserToken = thirdLoginResponse.body.data.token;
    console.log('thirdUserToken:', thirdUserToken);
    
    // 加入寝室
    console.log('正在让第三个用户加入寝室...');
    const thirdJoinResponse = await request(app)
      .post('/api/rooms/join')
      .set('Authorization', `Bearer ${thirdUserToken}`)
      .send({
        code: testRoomCode
      });
    
    console.log('第三个用户加入寝室响应状态:', thirdJoinResponse.status);
    console.log('第三个用户加入寝室响应:', thirdJoinResponse.body);
    
    // 创建第四个测试用户
    console.log('正在创建第四个测试用户...');
    const fourthUserResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'roomtestuser4',
        email: 'roomtest4@example.com',
        password: 'password123',
        name: 'Room Test User 4'
      });
    
    console.log('第四个用户创建响应状态:', fourthUserResponse.status);
    console.log('第四个用户创建响应:', fourthUserResponse.body);
    fourthUser = fourthUserResponse.body.data;
    console.log('fourthUser:', fourthUser);
    
    // 登录获取令牌
    console.log('正在为第四个用户登录获取令牌...');
    const fourthLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'roomtestuser4',
        password: 'password123'
      });
    
    console.log('第四个用户登录响应状态:', fourthLoginResponse.status);
    console.log('第四个用户登录响应:', fourthLoginResponse.body);
    fourthUserToken = fourthLoginResponse.body.data.token;
    console.log('fourthUserToken:', fourthUserToken);
    
    // 加入寝室
    console.log('正在让第四个用户加入寝室...');
    const fourthJoinResponse = await request(app)
      .post('/api/rooms/join')
      .set('Authorization', `Bearer ${fourthUserToken}`)
      .send({
        code: testRoomCode
      });
    
    console.log('第四个用户加入寝室响应状态:', fourthJoinResponse.status);
    console.log('第四个用户加入寝室响应:', fourthJoinResponse.body);
    
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
    if (secondUser && secondUser.id) {
      await pool.query('DELETE FROM user_rooms WHERE user_id = $1', [secondUser.id]);
    }
    if (thirdUser && thirdUser.id) {
      await pool.query('DELETE FROM user_rooms WHERE user_id = $1', [thirdUser.id]);
    }
    if (fourthUser && fourthUser.id) {
      await pool.query('DELETE FROM user_rooms WHERE user_id = $1', [fourthUser.id]);
    }
    
    // 删除测试寝室
    if (testRoom && testRoom.id) {
      await pool.query('DELETE FROM rooms WHERE id = $1', [testRoom.id]);
    }
    
    // 删除测试用户
    if (testUser && testUser.id) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
    }
    if (secondUser && secondUser.id) {
      await pool.query('DELETE FROM users WHERE id = $1', [secondUser.id]);
    }
    if (thirdUser && thirdUser.id) {
      await pool.query('DELETE FROM users WHERE id = $1', [thirdUser.id]);
    }
    if (fourthUser && fourthUser.id) {
      await pool.query('DELETE FROM users WHERE id = $1', [fourthUser.id]);
    }
  } catch (error) {
    console.error('清理测试数据时发生错误:', error);
  } finally {
    await pool.end();
  }
});

describe('寝室管理API集成测试', () => {
  describe('变量初始化测试', () => {
    it('应该正确初始化所有测试变量', async () => {
      console.log('测试变量状态:');
      console.log('testUser:', testUser);
      console.log('testRoom:', testRoom);
      console.log('secondUser:', secondUser);
      console.log('thirdUser:', thirdUser);
      console.log('fourthUser:', fourthUser);
      
      expect(testUser).toBeDefined();
      expect(testUser.id).toBeDefined();
      expect(testRoom).toBeDefined();
      expect(testRoom.id).toBeDefined();
      expect(secondUser).toBeDefined();
      expect(secondUser.id).toBeDefined();
      expect(thirdUser).toBeDefined();
      expect(thirdUser.id).toBeDefined();
      expect(fourthUser).toBeDefined();
      expect(fourthUser.id).toBeDefined();
    });
  });
  
  describe('POST /api/rooms', () => {
    it('应该成功创建寝室', async () => {
      // 测试寝室已经在全局beforeAll中创建
      expect(testRoom).toBeDefined();
      expect(testRoom.name).toBe('测试寝室');
      expect(testRoom.description).toBe('这是一个测试寝室');
      expect(testRoom.code).toBeDefined();
    });
    
    it('应该在未认证时返回401错误', async () => {
      const response = await request(app)
        .post('/api/rooms')
        .send({
          name: '未认证寝室',
          description: '这是一个未认证的测试寝室'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
    
    it('应该在缺少必填字段时返回400错误', async () => {
      const response = await request(app)
        .post('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: '缺少名称的寝室'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('寝室名称为必填项');
    });
  });
  
  describe('GET /api/rooms', () => {
    it('应该成功获取寝室列表', async () => {
      const response = await request(app)
        .get('/api/rooms')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('获取寝室列表成功');
      expect(response.body.data.rooms).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
      
      // 验证分页信息
      expect(response.body.data.pagination.page).toBeDefined();
      expect(response.body.data.pagination.limit).toBeDefined();
      expect(response.body.data.pagination.total).toBeDefined();
      expect(response.body.data.pagination.totalPages).toBeDefined();
    });
    
    it('应该支持分页查询', async () => {
      const response = await request(app)
        .get('/api/rooms?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });
    
    it('应该支持按状态筛选', async () => {
      const response = await request(app)
        .get('/api/rooms?status=active')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
  
  describe('GET /api/rooms/:id', () => {
    it('应该成功获取寝室详情', async () => {
      // 确保testRoom已定义
      if (!testRoom || !testRoom.id) {
        throw new Error('测试变量未定义');
      }
      
      const response = await request(app)
        .get(`/api/rooms/${testRoom.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('获取寝室详情成功');
      expect(response.body.data.id).toBe(testRoom.id);
      expect(response.body.data.name).toBe(testRoom.name);
    });
    
    it('应该在寝室不存在时返回404错误', async () => {
      const response = await request(app)
        .get('/api/rooms/99999')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('寝室不存在');
    });
  });
  
  describe('PUT /api/rooms/:id', () => {
    it('应该成功更新寝室信息', async () => {
      // 确保testRoom已定义
      if (!testRoom || !testRoom.id) {
        throw new Error('测试变量未定义');
      }
      
      const response = await request(app)
        .put(`/api/rooms/${testRoom.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '更新后的寝室',
          description: '更新后的描述',
          max_members: 8
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('寝室信息更新成功');
      expect(response.body.data.name).toBe('更新后的寝室');
      expect(response.body.data.description).toBe('更新后的描述');
      expect(response.body.data.max_members).toBe(8);
    });
    
    it('应该在寝室不存在时返回404错误', async () => {
      const response = await request(app)
        .put('/api/rooms/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '不存在的寝室'
        });
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('寝室不存在');
    });
  });
  
  describe('POST /api/rooms/join', () => {
    it('应该成功通过邀请码加入寝室', async () => {
      // 确保testRoomCode已定义
      if (!testRoomCode) {
        throw new Error('测试变量未定义');
      }
      
      const response = await request(app)
        .post('/api/rooms/join')
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({
          code: testRoomCode
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('成功加入寝室');
    });
    
    it('应该在邀请码无效时返回404错误', async () => {
      const response = await request(app)
        .post('/api/rooms/join')
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({
          code: 'INVALID_CODE'
        });
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('邀请码无效或寝室不存在');
    });
    
    it('应该在用户已加入寝室时返回409错误', async () => {
      // 确保testRoomCode已定义
      if (!testRoomCode) {
        throw new Error('测试变量未定义');
      }
      
      const response = await request(app)
        .post('/api/rooms/join')
        .set('Authorization', `Bearer ${secondUserToken}`)
        .send({
          code: testRoomCode
        });
      
      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('您已经是该寝室的成员');
    });
  });
  
  describe('GET /api/rooms/:id/members', () => {
    it('应该成功获取寝室成员列表', async () => {
      // 确保testRoom和testUser已定义
      if (!testRoom || !testRoom.id || !testUser || !testUser.id) {
        throw new Error('测试变量未定义');
      }
      
      const response = await request(app)
        .get(`/api/rooms/${testRoom.id}/members`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('获取寝室成员列表成功');
      expect(response.body.data).toBeInstanceOf(Array);
      
      // 验证至少有创建者
      expect(response.body.data.length).toBeGreaterThanOrEqual(1);
      
      // 验证成员结构
      const creator = response.body.data.find(member => member.role === 'owner');
      expect(creator).toBeDefined();
      expect(creator.id).toBe(testUser.id);
      expect(creator.username).toBe('roomtestuser');
    });
  });
  
  describe('DELETE /api/rooms/:id/leave', () => {
    it('应该成功退出寝室', async () => {
      // 确保testRoom和thirdUser已定义
      if (!testRoom || !testRoom.id || !thirdUser || !thirdUserToken) {
        throw new Error('测试变量未定义');
      }
      
      const response = await request(app)
        .delete(`/api/rooms/${testRoom.id}/leave`)
        .set('Authorization', `Bearer ${thirdUserToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('成功退出寝室');
    });
    
    it('应该在用户不是寝室成员时返回400错误', async () => {
      // 确保testRoom和thirdUser已定义
      if (!testRoom || !testRoom.id || !thirdUser || !thirdUserToken) {
        throw new Error('测试变量未定义');
      }
      
      const response = await request(app)
        .delete(`/api/rooms/${testRoom.id}/leave`)
        .set('Authorization', `Bearer ${thirdUserToken}`);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('您不是该寝室的成员');
    });
    
    it('应该在创建者尝试退出时返回400错误', async () => {
      // 确保testRoom和authToken已定义
      if (!testRoom || !testRoom.id || !authToken) {
        throw new Error('测试变量未定义');
      }
      
      const response = await request(app)
        .delete(`/api/rooms/${testRoom.id}/leave`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('寝室创建者不能退出寝室，请先转让寝室或删除寝室');
    });
  });
  
  describe('DELETE /api/rooms/:id/members/:userId', () => {
    it('应该成功移除寝室成员', async () => {
      // 确保testRoom、testUser和fourthUser已定义
      if (!testRoom || !testRoom.id || !testUser || !testUser.id || !fourthUser || !fourthUser.id) {
        throw new Error('测试变量未定义');
      }
      
      const response = await request(app)
        .delete(`/api/rooms/${testRoom.id}/members/${fourthUser.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('成员移除成功');
    });
    
    it('应该在非创建者尝试移除成员时返回403错误', async () => {
      // 确保testRoom和fourthUser已定义
      if (!testRoom || !testRoom.id || !fourthUser || !fourthUser.id) {
        throw new Error('测试变量未定义');
      }
      
      // 重新加入寝室
      await request(app)
        .post('/api/rooms/join')
        .set('Authorization', `Bearer ${fourthUserToken}`)
        .send({
          code: testRoomCode
        });
      
      // 尝试用非创建者身份移除成员
      const response = await request(app)
        .delete(`/api/rooms/${testRoom.id}/members/${fourthUser.id}`)
        .set('Authorization', `Bearer ${fourthUserToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('只有寝室创建者可以移除成员');
    });
    
    it('应该在尝试移除创建者时返回400错误', async () => {
      // 确保testRoom和testUser已定义
      if (!testRoom || !testRoom.id || !testUser || !testUser.id) {
        throw new Error('测试变量未定义');
      }
      
      const response = await request(app)
        .delete(`/api/rooms/${testRoom.id}/members/${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('不能移除寝室创建者');
    });
  });
});