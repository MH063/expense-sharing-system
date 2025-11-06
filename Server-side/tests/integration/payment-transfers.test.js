const request = require('supertest');
const app = require('../../server');
const { pool } = require('../../config/database');
const { generateTestToken } = require('../setup/test-database');

describe('Payment Transfer API Integration Tests', () => {
  let testUser1, testUser2, testRoom, testBill, authToken1, authToken2;
  let transferId1, transferId2;

  beforeAll(async () => {
    // 创建测试用户1
    const user1Result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      ['testuser_transfer1', 'transfer1@test.com', 'hashedpassword']
    );
    testUser1 = user1Result.rows[0];
    authToken1 = generateTestToken(testUser1.id);

    // 创建测试用户2
    const user2Result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
      ['testuser_transfer2', 'transfer2@test.com', 'hashedpassword']
    );
    testUser2 = user2Result.rows[0];
    authToken2 = generateTestToken(testUser2.id);

    // 创建测试房间
    const roomResult = await pool.query(
      'INSERT INTO rooms (name, creator_id) VALUES ($1, $2) RETURNING id',
      ['Test Room for Transfer Integration', testUser1.id]
    );
    testRoom = roomResult.rows[0];

    // 将两个用户都添加到房间
    await pool.query(
      'INSERT INTO room_members (user_id, room_id) VALUES ($1, $2)',
      [testUser1.id, testRoom.id]
    );
    await pool.query(
      'INSERT INTO room_members (user_id, room_id) VALUES ($1, $2)',
      [testUser2.id, testRoom.id]
    );

    // 创建测试账单
    const billResult = await pool.query(
      'INSERT INTO bills (title, amount, room_id, creator_id, due_date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      ['Test Bill for Transfer Integration', 200.00, testRoom.id, testUser1.id, new Date()]
    );
    testBill = billResult.rows[0];
  });

  afterAll(async () => {
    // 清理测试数据
    await pool.query('DELETE FROM payment_transfers WHERE bill_id = $1', [testBill.id]);
    await pool.query('DELETE FROM bills WHERE id = $1', [testBill.id]);
    await pool.query('DELETE FROM room_members WHERE room_id = $1', [testRoom.id]);
    await pool.query('DELETE FROM rooms WHERE id = $1', [testRoom.id]);
    await pool.query('DELETE FROM users WHERE id IN ($1, $2)', [testUser1.id, testUser2.id]);
    await pool.end();
  });

  describe('完整的支付转移流程', () => {
    it('应该支持用户间完整的支付转移流程', async () => {
      // 1. 用户1创建一个自付转移记录
      const selfPayData = {
        billId: testBill.id,
        transferType: 'self_pay',
        amount: 100.00,
        fromUserId: testUser1.id,
        toUserId: testUser1.id,
        note: '自付测试'
      };

      const createResponse1 = await request(app)
        .post('/api/payment-transfers')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(selfPayData)
        .expect(201);

      expect(createResponse1.body.success).toBe(true);
      transferId1 = createResponse1.body.data.transfer.id;
      expect(createResponse1.body.data.transfer.status).toBe('pending');

      // 2. 用户1确认自付转移记录
      const confirmResponse1 = await request(app)
        .post(`/api/payment-transfers/${transferId1}/confirm`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(confirmResponse1.body.success).toBe(true);
      expect(confirmResponse1.body.data.transfer.status).toBe('completed');

      // 3. 用户1创建一个多人支付转移记录
      const multiplePayData = {
        billId: testBill.id,
        transferType: 'multiple_payers',
        amount: 50.00,
        fromUserId: testUser1.id,
        toUserId: testUser2.id,
        note: '多人支付测试'
      };

      const createResponse2 = await request(app)
        .post('/api/payment-transfers')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(multiplePayData)
        .expect(201);

      expect(createResponse2.body.success).toBe(true);
      transferId2 = createResponse2.body.data.transfer.id;
      expect(createResponse2.body.data.transfer.status).toBe('pending');

      // 4. 用户2确认多人支付转移记录
      const confirmResponse2 = await request(app)
        .post(`/api/payment-transfers/${transferId2}/confirm`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(200);

      expect(confirmResponse2.body.success).toBe(true);
      expect(confirmResponse2.body.data.transfer.status).toBe('completed');

      // 5. 验证账单的支付转移记录
      const billTransfersResponse = await request(app)
        .get(`/api/payment-transfers?billId=${testBill.id}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(billTransfersResponse.body.success).toBe(true);
      expect(billTransfersResponse.body.data.transfers.length).toBe(2);
      expect(billTransfersResponse.body.data.transfers.some(t => t.id === transferId1)).toBe(true);
      expect(billTransfersResponse.body.data.transfers.some(t => t.id === transferId2)).toBe(true);
    });

    it('应该支持创建和取消支付转移记录', async () => {
      // 1. 创建一个支付转移记录
      const transferData = {
        billId: testBill.id,
        transferType: 'payer_transfer',
        amount: 30.00,
        fromUserId: testUser1.id,
        toUserId: testUser2.id,
        note: '取消测试'
      };

      const createResponse = await request(app)
        .post('/api/payment-transfers')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(transferData)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      const transferId = createResponse.body.data.transfer.id;

      // 2. 取消支付转移记录
      const cancelResponse = await request(app)
        .post(`/api/payment-transfers/${transferId}/cancel`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(cancelResponse.body.success).toBe(true);
      expect(cancelResponse.body.data.transfer.status).toBe('cancelled');

      // 3. 验证转移记录已取消
      const detailResponse = await request(app)
        .get(`/api/payment-transfers/${transferId}`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(detailResponse.body.success).toBe(true);
      expect(detailResponse.body.data.transfer.status).toBe('cancelled');
    });
  });

  describe('权限验证', () => {
    it('应该拒绝用户访问不属于自己的转移记录', async () => {
      // 用户1创建一个转移记录
      const transferData = {
        billId: testBill.id,
        transferType: 'self_pay',
        amount: 10.00,
        fromUserId: testUser1.id,
        toUserId: testUser1.id
      };

      const createResponse = await request(app)
        .post('/api/payment-transfers')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(transferData)
        .expect(201);

      const transferId = createResponse.body.data.transfer.id;

      // 用户2尝试访问用户1的转移记录（应该被拒绝，除非有权限逻辑允许）
      // 注意：这里取决于业务逻辑，如果用户2是房间成员，可能可以访问
      // 这里假设只有创建者或相关用户可以访问
      const response = await request(app)
        .get(`/api/payment-transfers/${transferId}`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403); // 可能是403或200，取决于业务逻辑

      expect(response.body.success).toBe(false);
    });

    it('应该拒绝用户确认不属于自己的转移记录', async () => {
      // 用户1创建一个转移记录
      const transferData = {
        billId: testBill.id,
        transferType: 'self_pay',
        amount: 15.00,
        fromUserId: testUser1.id,
        toUserId: testUser1.id
      };

      const createResponse = await request(app)
        .post('/api/payment-transfers')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(transferData)
        .expect(201);

      const transferId = createResponse.body.data.transfer.id;

      // 用户2尝试确认用户1的转移记录（应该被拒绝）
      const response = await request(app)
        .post(`/api/payment-transfers/${transferId}/confirm`)
        .set('Authorization', `Bearer ${authToken2}`)
        .expect(403); // 可能是403或400，取决于业务逻辑

      expect(response.body.success).toBe(false);
    });
  });

  describe('数据验证', () => {
    it('应该验证所有必需字段', async () => {
      const response = await request(app)
        .post('/api/payment-transfers')
        .set('Authorization', `Bearer ${authToken1}`)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('应该验证字段格式', async () => {
      const invalidData = {
        billId: 'not-a-uuid',
        transferType: 'invalid-type',
        amount: 'not-a-number',
        fromUserId: 'not-a-uuid',
        toUserId: 'not-a-uuid'
      };

      const response = await request(app)
        .post('/api/payment-transfers')
        .set('Authorization', `Bearer ${authToken1}`)
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('应该验证查询参数格式', async () => {
      const response = await request(app)
        .get('/api/payment-transfers?billId=invalid-uuid&page=not-a-number')
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });
});