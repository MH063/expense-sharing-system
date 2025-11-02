const request = require('supertest');
const app = require('../../server');
const { Pool } = require('pg');

// 测试数据库连接
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

describe('费用管理API测试', () => {
  let authToken;
  let testUserId;
  let testRoomId;
  let testExpenseId;
  
  beforeAll(async () => {
    // 创建测试用户
    const userResult = await pool.query(
      'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
      ['testuser', 'test@example.com', 'password123', 'user']
    );
    testUserId = userResult.rows[0].id;
    
    // 创建测试寝室
    const roomResult = await pool.query(
      'INSERT INTO rooms (name, description, creator_id) VALUES ($1, $2, $3) RETURNING *',
      ['Test Room', 'A test room for testing', testUserId]
    );
    testRoomId = roomResult.rows[0].id;
    
    // 添加用户到寝室
    await pool.query(
      'INSERT INTO room_members (room_id, user_id, role) VALUES ($1, $2, $3)',
      [testRoomId, testUserId, 'member']
    );
    
    // 获取认证令牌
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'password123'
      });
    
    authToken = loginResponse.body.data.token;
  });
  
  afterAll(async () => {
    // 清理测试数据
    await pool.query('DELETE FROM expense_splits WHERE expense_id IN (SELECT id FROM expenses WHERE room_id = $1)', [testRoomId]);
    await pool.query('DELETE FROM expenses WHERE room_id = $1', [testRoomId]);
    await pool.query('DELETE FROM room_members WHERE room_id = $1', [testRoomId]);
    await pool.query('DELETE FROM rooms WHERE id = $1', [testRoomId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    await pool.end();
  });
  
  describe('POST /api/expenses', () => {
    it('应该成功创建费用记录', async () => {
      const expenseData = {
        title: '测试费用',
        amount: 100.50,
        category: 'food',
        description: '这是一个测试费用',
        date: '2023-01-01',
        room_id: testRoomId,
        split_type: 'equal',
        paid_by: testUserId
      };
      
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(expenseData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(expenseData.title);
      expect(response.body.data.amount).toBe(expenseData.amount);
      expect(response.body.data.room_id).toBe(testRoomId);
      
      testExpenseId = response.body.data.id;
    });
    
    it('应该在未提供认证令牌时返回401', async () => {
      const expenseData = {
        title: '测试费用',
        amount: 100.50,
        category: 'food',
        room_id: testRoomId
      };
      
      await request(app)
        .post('/api/expenses')
        .send(expenseData)
        .expect(401);
    });
    
    it('应该在缺少必填字段时返回400', async () => {
      const expenseData = {
        title: '测试费用',
        // 缺少amount
        category: 'food',
        room_id: testRoomId
      };
      
      const response = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(expenseData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('amount');
    });
  });
  
  describe('GET /api/expenses', () => {
    it('应该成功获取费用列表', async () => {
      const response = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
    
    it('应该支持按寝室筛选费用', async () => {
      const response = await request(app)
        .get(`/api/expenses?room_id=${testRoomId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      response.body.data.forEach(expense => {
        expect(expense.room_id).toBe(testRoomId);
      });
    });
  });
  
  describe('GET /api/expenses/:id', () => {
    it('应该成功获取特定费用详情', async () => {
      const response = await request(app)
        .get(`/api/expenses/${testExpenseId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testExpenseId);
      expect(response.body.data.title).toBe('测试费用');
    });
    
    it('应该在费用不存在时返回404', async () => {
      const nonExistentId = 99999;
      await request(app)
        .get(`/api/expenses/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
  
  describe('PUT /api/expenses/:id', () => {
    it('应该成功更新费用记录', async () => {
      const updateData = {
        title: '更新后的测试费用',
        amount: 150.75,
        description: '这是一个更新后的测试费用'
      };
      
      const response = await request(app)
        .put(`/api/expenses/${testExpenseId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.amount).toBe(updateData.amount);
      expect(response.body.data.description).toBe(updateData.description);
    });
    
    it('应该在费用不存在时返回404', async () => {
      const nonExistentId = 99999;
      const updateData = {
        title: '更新后的测试费用'
      };
      
      await request(app)
        .put(`/api/expenses/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);
    });
  });
  
  describe('POST /api/expenses/:id/confirm-split', () => {
    it('应该成功确认分摊支付', async () => {
      // 首先获取费用分摊信息
      const expenseResponse = await request(app)
        .get(`/api/expenses/${testExpenseId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      const splitId = expenseResponse.body.data.splits[0].id;
      
      const response = await request(app)
        .post(`/api/expenses/${testExpenseId}/confirm-split`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ split_id: splitId })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('确认成功');
    });
    
    it('应该在分摊ID不存在时返回400', async () => {
      const nonExistentSplitId = 99999;
      
      const response = await request(app)
        .post(`/api/expenses/${testExpenseId}/confirm-split`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ split_id: nonExistentSplitId })
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('DELETE /api/expenses/:id', () => {
    it('应该成功删除费用记录', async () => {
      await request(app)
        .delete(`/api/expenses/${testExpenseId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      // 验证费用已被删除
      await request(app)
        .get(`/api/expenses/${testExpenseId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
    
    it('应该在费用不存在时返回404', async () => {
      const nonExistentId = 99999;
      
      await request(app)
        .delete(`/api/expenses/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});