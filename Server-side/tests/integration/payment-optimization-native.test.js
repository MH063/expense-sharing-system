/**
 * 支付流程优化集成测试（原生SQL版本）
 */

const request = require('supertest');
const app = require('../../server');
const { pool } = require('../../config/db');

describe('支付流程优化集成测试', () => {
  let testUser, testRoom, testBill, authToken;

  beforeAll(async () => {
    // 确保数据库连接
    await pool.query('SELECT NOW()');
  });

  afterAll(async () => {
    // 关闭数据库连接
    await pool.end();
  });

  beforeEach(async () => {
    // 创建测试数据
    const roomResult = await pool.query(
      'INSERT INTO rooms (id, name, description, creator_id) VALUES (gen_random_uuid(), $1, $2, gen_random_uuid()) RETURNING *',
      ['测试房间', '用于测试的房间']
    );
    testRoom = roomResult.rows[0];

    const userResult = await pool.query(
      'INSERT INTO users (id, username, email, password) VALUES (gen_random_uuid(), $1, $2, $3) RETURNING *',
      ['testuser', 'test@example.com', 'password123']
    );
    testUser = userResult.rows[0];

    // 将用户添加到房间
    await pool.query(
      'INSERT INTO room_members (id, user_id, room_id, relation_type) VALUES (gen_random_uuid(), $1, $2, $3)',
      [testUser.id, testRoom.id, 'member']
    );

    const billResult = await pool.query(
      'INSERT INTO bills (id, title, description, total_amount, due_date, room_id, creator_id) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6) RETURNING *',
      [
        '测试账单',
        '用于测试的账单',
        100.50,
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后到期
        testRoom.id,
        testUser.id
      ]
    );
    testBill = billResult.rows[0];

    // 生成认证令牌
    authToken = `Bearer ${generateTestToken(testUser.id)}`;
  });

  afterEach(async () => {
    // 清理测试数据
    await pool.query('DELETE FROM payments WHERE bill_id IN (SELECT id FROM bills WHERE title LIKE \'测试%\')');
    await pool.query('DELETE FROM offline_payments WHERE bill_id IN (SELECT id FROM bills WHERE title LIKE \'测试%\')');
    await pool.query('DELETE FROM payment_reminders WHERE bill_id IN (SELECT id FROM bills WHERE title LIKE \'测试%\')');
    await pool.query('DELETE FROM bills WHERE title LIKE \'测试%\'');
    await pool.query('DELETE FROM room_members WHERE user_id IN (SELECT id FROM users WHERE username LIKE \'test%\')');
    await pool.query('DELETE FROM users WHERE username LIKE \'test%\'');
    await pool.query('DELETE FROM rooms WHERE name LIKE \'测试%\'');
  });

  describe('离线支付流程', () => {
    it('应该完成完整的离线支付流程', async () => {
      // 1. 创建离线支付记录
      const offlinePaymentData = {
        billId: testBill.id,
        userId: testUser.id,
        amount: 100.50,
        paymentMethod: 'cash',
        paymentTime: new Date().toISOString(),
        notes: '现金支付测试'
      };

      const createResponse = await request(app)
        .post('/api/payment-optimization/offline-payments')
        .set('Authorization', authToken)
        .send(offlinePaymentData)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.billId).toBe(testBill.id);
      expect(createResponse.body.data.status).toBe('pending');

      const offlinePaymentId = createResponse.body.data.id;

      // 2. 获取用户离线支付记录
      const getUserResponse = await request(app)
        .get('/api/payment-optimization/offline-payments/user')
        .set('Authorization', authToken)
        .expect(200);

      expect(getUserResponse.body.success).toBe(true);
      expect(getUserResponse.body.data.payments).toHaveLength(1);
      expect(getUserResponse.body.data.payments[0].id).toBe(offlinePaymentId);

      // 3. 获取待同步的离线支付记录
      const getPendingResponse = await request(app)
        .get('/api/payment-optimization/offline-payments/pending')
        .set('Authorization', authToken)
        .expect(200);

      expect(getPendingResponse.body.success).toBe(true);
      expect(getPendingResponse.body.data.payments).toHaveLength(1);
      expect(getPendingResponse.body.data.payments[0].id).toBe(offlinePaymentId);

      // 4. 同步离线支付记录
      const syncResponse = await request(app)
        .put(`/api/payment-optimization/offline-payments/${offlinePaymentId}/sync`)
        .set('Authorization', authToken)
        .expect(200);

      expect(syncResponse.body.success).toBe(true);
      expect(syncResponse.body.data.status).toBe('completed');

      // 5. 验证支付记录已创建
      const paymentRecordsResponse = await request(app)
        .get('/api/payment-optimization/payments')
        .set('Authorization', authToken)
        .expect(200);

      expect(paymentRecordsResponse.body.success).toBe(true);
      expect(paymentRecordsResponse.body.data.payments).toHaveLength(1);
      expect(paymentRecordsResponse.body.data.payments[0].billId).toBe(testBill.id);
      expect(paymentRecordsResponse.body.data.payments[0].status).toBe('completed');
    });
  });

  describe('支付提醒流程', () => {
    it('应该完成完整的支付提醒流程', async () => {
      // 1. 创建支付提醒
      const reminderData = {
        billId: testBill.id,
        userId: testUser.id,
        reminderTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 明天
        reminderType: 'email',
        message: '请及时支付账单'
      };

      const createResponse = await request(app)
        .post('/api/payment-optimization/payment-reminders')
        .set('Authorization', authToken)
        .send(reminderData)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.billId).toBe(testBill.id);
      expect(createResponse.body.data.status).toBe('pending');

      const reminderId = createResponse.body.data.id;

      // 2. 获取用户支付提醒列表
      const getUserResponse = await request(app)
        .get('/api/payment-optimization/payment-reminders/user')
        .set('Authorization', authToken)
        .expect(200);

      expect(getUserResponse.body.success).toBe(true);
      expect(getUserResponse.body.data.reminders).toHaveLength(1);
      expect(getUserResponse.body.data.reminders[0].id).toBe(reminderId);

      // 3. 触发支付提醒检查任务
      const triggerResponse = await request(app)
        .post('/api/payment-optimization/tasks/paymentReminderCheck/trigger')
        .set('Authorization', authToken)
        .expect(200);

      expect(triggerResponse.body.success).toBe(true);
      expect(triggerResponse.body.data.message).toContain('触发成功');

      // 4. 获取任务状态
      const statusResponse = await request(app)
        .get('/api/payment-optimization/tasks/status')
        .set('Authorization', authToken)
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.data.tasks).toHaveProperty('paymentReminderCheck');
    });
  });

  describe('支付记录查询流程', () => {
    it('应该完成支付记录查询流程', async () => {
      // 1. 创建支付记录
      const paymentResult = await pool.query(
        'INSERT INTO payments (id, bill_id, user_id, amount, status, payment_method) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5) RETURNING *',
        [testBill.id, testUser.id, 100.50, 'completed', 'alipay']
      );
      const payment = paymentResult.rows[0];

      // 2. 获取支付记录列表
      const listResponse = await request(app)
        .get('/api/payment-optimization/payments')
        .set('Authorization', authToken)
        .expect(200);

      expect(listResponse.body.success).toBe(true);
      expect(listResponse.body.data.payments).toHaveLength(1);
      expect(listResponse.body.data.payments[0].id).toBe(payment.id);

      // 3. 获取支付记录详情
      const detailResponse = await request(app)
        .get(`/api/payment-optimization/payments/${payment.id}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(detailResponse.body.success).toBe(true);
      expect(detailResponse.body.data.payment.id).toBe(payment.id);
      expect(detailResponse.body.data.payment.billId).toBe(testBill.id);
      expect(detailResponse.body.data.payment.status).toBe('completed');
    });
  });
});

// 生成测试JWT令牌的辅助函数
function generateTestToken(userId) {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { userId: userId },
    process.env.JWT_SECRET || 'test_secret_key_for_jwt_token_generation',
    { expiresIn: '1h' }
  );
}