const request = require('supertest');
const app = require('../../server');
const { Pool } = require('pg');

// 测试数据库连接
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

describe('账单管理API测试', () => {
  let authToken;
  let testUserId;
  let testRoomId;
  let testBillId;
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
    
    // 创建测试费用
    const expenseResult = await pool.query(
      'INSERT INTO expenses (title, amount, category, description, date, room_id, paid_by, split_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      ['测试费用', 100.50, 'food', '这是一个测试费用', '2023-01-01', testRoomId, testUserId, 'equal']
    );
    testExpenseId = expenseResult.rows[0].id;
    
    // 创建费用分摊记录
    await pool.query(
      'INSERT INTO expense_splits (expense_id, user_id, amount, is_paid) VALUES ($1, $2, $3, $4)',
      [testExpenseId, testUserId, 100.50, false]
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
    await pool.query('DELETE FROM bill_splits WHERE bill_id IN (SELECT id FROM bills WHERE room_id = $1)', [testRoomId]);
    await pool.query('DELETE FROM bills WHERE room_id = $1', [testRoomId]);
    await pool.query('DELETE FROM expense_splits WHERE expense_id IN (SELECT id FROM expenses WHERE room_id = $1)', [testRoomId]);
    await pool.query('DELETE FROM expenses WHERE room_id = $1', [testRoomId]);
    await pool.query('DELETE FROM room_members WHERE room_id = $1', [testRoomId]);
    await pool.query('DELETE FROM rooms WHERE id = $1', [testRoomId]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUserId]);
    await pool.end();
  });
  
  describe('POST /api/bills', () => {
    it('应该成功创建账单', async () => {
      const billData = {
        title: '测试账单',
        description: '这是一个测试账单',
        due_date: '2023-12-31',
        room_id: testRoomId,
        items: [
          { expense_id: testExpenseId, amount: 100.50 }
        ],
        split_type: 'equal'
      };
      
      const response = await request(app)
        .post('/api/bills')
        .set('Authorization', `Bearer ${authToken}`)
        .send(billData)
        .expect(201);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(billData.title);
      expect(response.body.data.room_id).toBe(testRoomId);
      
      testBillId = response.body.data.id;
    });
    
    it('应该在未提供认证令牌时返回401', async () => {
      const billData = {
        title: '测试账单',
        due_date: '2023-12-31',
        room_id: testRoomId
      };
      
      await request(app)
        .post('/api/bills')
        .send(billData)
        .expect(401);
    });
    
    it('应该在缺少必填字段时返回400', async () => {
      const billData = {
        title: '测试账单',
        // 缺少due_date
        room_id: testRoomId
      };
      
      const response = await request(app)
        .post('/api/bills')
        .set('Authorization', `Bearer ${authToken}`)
        .send(billData)
        .expect(400);
      
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('缺少必填字段');
    });
  });
  
  describe('GET /api/bills', () => {
    it('应该成功获取账单列表', async () => {
      const response = await request(app)
        .get('/api/bills')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });
    
    it('应该支持按寝室筛选账单', async () => {
      const response = await request(app)
        .get(`/api/bills?room_id=${testRoomId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      response.body.data.forEach(bill => {
        expect(bill.room_id).toBe(testRoomId);
      });
    });
  });
  
  describe('GET /api/bills/:id', () => {
    it('应该成功获取特定账单详情', async () => {
      const response = await request(app)
        .get(`/api/bills/${testBillId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(testBillId);
      expect(response.body.data.title).toBe('测试账单');
    });
    
    it('应该在账单不存在时返回404', async () => {
      const nonExistentId = 99999;
      await request(app)
        .get(`/api/bills/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
  
  describe('PUT /api/bills/:id', () => {
    it('应该成功更新账单', async () => {
      const updateData = {
        title: '更新后的测试账单',
        description: '这是一个更新后的测试账单',
        due_date: '2023-12-25'
      };
      
      const response = await request(app)
        .put(`/api/bills/${testBillId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.title).toBe(updateData.title);
      expect(response.body.data.description).toBe(updateData.description);
      expect(response.body.data.due_date).toBe(updateData.due_date);
    });
    
    it('应该在账单不存在时返回404', async () => {
      const nonExistentId = 99999;
      const updateData = {
        title: '更新后的测试账单'
      };
      
      await request(app)
        .put(`/api/bills/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(404);
    });
  });
  
  describe('POST /api/bills/:id/review', () => {
    it('应该成功审核账单', async () => {
      const reviewData = {
        status: 'approved',
        review_comment: '审核通过'
      };
      
      const response = await request(app)
        .post(`/api/bills/${testBillId}/review`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe(reviewData.status);
      expect(response.body.data.review_comment).toBe(reviewData.review_comment);
    });
    
    it('应该在账单不存在时返回404', async () => {
      const nonExistentId = 99999;
      const reviewData = {
        status: 'approved'
      };
      
      await request(app)
        .post(`/api/bills/${nonExistentId}/review`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(reviewData)
        .expect(404);
    });
  });
  
  describe('POST /api/bills/:id/confirm-payment', () => {
    it('应该成功确认账单支付', async () => {
      // 首先获取账单分摊信息
      const billResponse = await request(app)
        .get(`/api/bills/${testBillId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      const splitId = billResponse.body.data.splits[0].id;
      
      const response = await request(app)
        .post(`/api/bills/${testBillId}/confirm-payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ split_id: splitId })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('确认成功');
    });
    
    it('应该在分摊ID不存在时返回400', async () => {
      const nonExistentSplitId = 99999;
      
      const response = await request(app)
        .post(`/api/bills/${testBillId}/confirm-payment`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ split_id: nonExistentSplitId })
        .expect(400);
      
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /api/bills/user-stats', () => {
    it('应该成功获取用户账单统计', async () => {
      const response = await request(app)
        .get('/api/bills/user-stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('total_bills');
      expect(response.body.data).toHaveProperty('total_amount');
      expect(response.body.data).toHaveProperty('paid_amount');
      expect(response.body.data).toHaveProperty('unpaid_amount');
    });
  });
  
  describe('DELETE /api/bills/:id', () => {
    it('应该成功删除账单', async () => {
      await request(app)
        .delete(`/api/bills/${testBillId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      
      // 验证账单已被删除
      await request(app)
        .get(`/api/bills/${testBillId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
    
    it('应该在账单不存在时返回404', async () => {
      const nonExistentId = 99999;
      
      await request(app)
        .delete(`/api/bills/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});