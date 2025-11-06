const request = require('supertest');
const app = require('../../server');
const { pool } = require('../../config/database');
const { generateTestToken } = require('../setup/test-database');

describe('Payment Transfer Controller', () => {
  let testUser, testRoom, testBill, authToken;
  let transferId;

  beforeAll(async () => {
    // 创建测试用户
    const userResult = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      ['testuser_transfer', 'transfer@test.com', 'hashedpassword']
    );
    testUser = userResult.rows[0];
    authToken = generateTestToken(testUser.id);

    // 创建测试房间
    const roomResult = await pool.query(
      'INSERT INTO rooms (name, creator_id) VALUES ($1, $2) RETURNING id',
      ['Test Room for Transfer', testUser.id]
    );
    testRoom = roomResult.rows[0];

    // 将用户添加到房间
    await pool.query(
      'INSERT INTO room_members (user_id, room_id) VALUES ($1, $2)',
      [testUser.id, testRoom.id]
    );

    // 创建测试账单
    const billResult = await pool.query(
      'INSERT INTO bills (title, amount, room_id, creator_id, due_date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      ['Test Bill for Transfer', 100.00, testRoom.id, testUser.id, new Date()]
    );
    testBill = billResult.rows[0];
  });

  afterAll(async () => {
    // 清理测试数据
    await pool.query('DELETE FROM payment_transfers WHERE bill_id = $1', [testBill.id]);
    await pool.query('DELETE FROM bills WHERE id = $1', [testBill.id]);
    await pool.query('DELETE FROM room_members WHERE room_id = $1', [testRoom.id]);
    await pool.query('DELETE FROM rooms WHERE id = $1', [testRoom.id]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
    await pool.end();
  });

  describe('GET /api/payment-transfers', () => {
    it('应该返回支付转移记录列表', async () => {
      const response = await request(app)
        .get('/api/payment-transfers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('transfers');
      expect(Array.isArray(response.body.data.transfers)).toBe(true);
    });

    it('应该支持按账单ID筛选转移记录', async () => {
      const response = await request(app)
        .get(`/api/payment-transfers?billId=${testBill.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('transfers');
    });

    it('应该拒绝无效的账单ID', async () => {
      const response = await request(app)
        .get('/api/payment-transfers?billId=invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('账单ID必须是有效的UUID');
    });

    it('应该拒绝未认证的请求', async () => {
      await request(app)
        .get('/api/payment-transfers')
        .expect(401);
    });
  });

  describe('POST /api/payment-transfers', () => {
    it('应该成功创建支付转移记录', async () => {
      const transferData = {
        billId: testBill.id,
        transferType: 'self_pay',
        amount: 50.00,
        fromUserId: testUser.id,
        toUserId: testUser.id,
        note: 'Test transfer'
      };

      const response = await request(app)
        .post('/api/payment-transfers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('transfer');
      expect(response.body.data.transfer.billId).toBe(testBill.id);
      expect(response.body.data.transfer.amount).toBe(50.00);
      
      transferId = response.body.data.transfer.id;
    });

    it('应该拒绝无效的转移类型', async () => {
      const transferData = {
        billId: testBill.id,
        transferType: 'invalid_type',
        amount: 50.00,
        fromUserId: testUser.id,
        toUserId: testUser.id
      };

      const response = await request(app)
        .post('/api/payment-transfers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('转移类型无效');
    });

    it('应该拒绝无效的金额', async () => {
      const transferData = {
        billId: testBill.id,
        transferType: 'self_pay',
        amount: -10.00,
        fromUserId: testUser.id,
        toUserId: testUser.id
      };

      const response = await request(app)
        .post('/api/payment-transfers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('金额必须是大于0的数字');
    });

    it('应该拒绝缺少必要字段的请求', async () => {
      const transferData = {
        transferType: 'self_pay',
        amount: 50.00
      };

      const response = await request(app)
        .post('/api/payment-transfers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/payment-transfers/:id', () => {
    it('应该返回指定ID的支付转移记录详情', async () => {
      const response = await request(app)
        .get(`/api/payment-transfers/${transferId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('transfer');
      expect(response.body.data.transfer.id).toBe(transferId);
    });

    it('应该拒绝无效的转移记录ID', async () => {
      const response = await request(app)
        .get('/api/payment-transfers/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('转移记录ID必须是有效的UUID');
    });

    it('应该返回404当转移记录不存在时', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .get(`/api/payment-transfers/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('转移记录不存在');
    });
  });

  describe('POST /api/payment-transfers/:id/confirm', () => {
    it('应该成功确认支付转移记录', async () => {
      const response = await request(app)
        .post(`/api/payment-transfers/${transferId}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transfer.status).toBe('completed');
    });

    it('应该拒绝确认已完成的转移记录', async () => {
      const response = await request(app)
        .post(`/api/payment-transfers/${transferId}/confirm`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('只能确认待处理的转移记录');
    });
  });

  describe('POST /api/payment-transfers/:id/cancel', () => {
    it('应该成功取消支付转移记录', async () => {
      // 创建一个新的转移记录用于取消测试
      const transferData = {
        billId: testBill.id,
        transferType: 'self_pay',
        amount: 25.00,
        fromUserId: testUser.id,
        toUserId: testUser.id
      };

      const createResponse = await request(app)
        .post('/api/payment-transfers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(transferData)
        .expect(201);

      const newTransferId = createResponse.body.data.transfer.id;

      const response = await request(app)
        .post(`/api/payment-transfers/${newTransferId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transfer.status).toBe('cancelled');
    });

    it('应该拒绝取消已完成的转移记录', async () => {
      const response = await request(app)
        .post(`/api/payment-transfers/${transferId}/cancel`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('只能取消待处理的转移记录');
    });
  });
});