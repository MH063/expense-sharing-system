/**
 * 支付流程优化集成测试
 */

const request = require('supertest');
const app = require('../../server');
const { sequelize } = require('../../config/database');
const { User, Room, Bill, Payment, OfflinePayment, PaymentReminder } = require('../../models');

describe('支付流程优化集成测试', () => {
  let testUser, testRoom, testBill, authToken;

  beforeAll(async () => {
    // 确保数据库连接
    await sequelize.authenticate();
  });

  afterAll(async () => {
    // 关闭数据库连接
    await sequelize.close();
  });

  beforeEach(async () => {
    // 创建测试数据
    testRoom = await Room.create({
      name: '测试房间',
      description: '用于测试的房间'
    });

    testUser = await User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      room_id: testRoom.id
    });

    testBill = await Bill.create({
      title: '测试账单',
      description: '用于测试的账单',
      amount: 100.50,
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后到期
      room_id: testRoom.id,
      created_by: testUser.id
    });

    // 生成认证令牌
    authToken = `Bearer ${generateTestToken(testUser.id)}`;
  });

  afterEach(async () => {
    // 清理测试数据
    await PaymentReminder.destroy({ where: {} });
    await OfflinePayment.destroy({ where: {} });
    await Payment.destroy({ where: {} });
    await Bill.destroy({ where: {} });
    await User.destroy({ where: {} });
    await Room.destroy({ where: {} });
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
      const payment = await Payment.create({
        bill_id: testBill.id,
        user_id: testUser.id,
        amount: 100.50,
        status: 'completed',
        payment_method: 'alipay'
      });

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
      expect(detailResponse.body.data.id).toBe(payment.id);

      // 4. 获取用户支付统计
      const statsResponse = await request(app)
        .get('/api/payment-optimization/payments/stats/user')
        .set('Authorization', authToken)
        .expect(200);

      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.data.totalPayments).toBe(1);
      expect(statsResponse.body.data.totalAmount).toBe(100.50);

      // 5. 获取房间支付统计
      const roomStatsResponse = await request(app)
        .get(`/api/payment-optimization/payments/stats/room/${testRoom.id}`)
        .set('Authorization', authToken)
        .expect(200);

      expect(roomStatsResponse.body.success).toBe(true);
      expect(roomStatsResponse.body.data.totalPayments).toBe(1);
      expect(roomStatsResponse.body.data.totalAmount).toBe(100.50);
    });
  });

  describe('定时任务管理', () => {
    it('应该完成定时任务管理流程', async () => {
      // 1. 获取任务状态
      const statusResponse = await request(app)
        .get('/api/payment-optimization/tasks/status')
        .set('Authorization', authToken)
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.data.tasks).toHaveProperty('paymentReminderCheck');
      expect(statusResponse.body.data.tasks).toHaveProperty('offlinePaymentSync');
      expect(statusResponse.body.data.tasks).toHaveProperty('cleanupExpiredReminders');
      expect(statusResponse.body.data.tasks).toHaveProperty('generatePaymentStats');

      // 2. 触发支付提醒检查任务
      const reminderTriggerResponse = await request(app)
        .post('/api/payment-optimization/tasks/paymentReminderCheck/trigger')
        .set('Authorization', authToken)
        .expect(200);

      expect(reminderTriggerResponse.body.success).toBe(true);

      // 3. 触发离线支付同步任务
      const syncTriggerResponse = await request(app)
        .post('/api/payment-optimization/tasks/offlinePaymentSync/trigger')
        .set('Authorization', authToken)
        .expect(200);

      expect(syncTriggerResponse.body.success).toBe(true);

      // 4. 触发清理过期提醒任务
      const cleanupTriggerResponse = await request(app)
        .post('/api/payment-optimization/tasks/cleanupExpiredReminders/trigger')
        .set('Authorization', authToken)
        .expect(200);

      expect(cleanupTriggerResponse.body.success).toBe(true);

      // 5. 触发生成支付统计任务
      const statsTriggerResponse = await request(app)
        .post('/api/payment-optimization/tasks/generatePaymentStats/trigger')
        .set('Authorization', authToken)
        .expect(200);

      expect(statsTriggerResponse.body.success).toBe(true);
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的认证', async () => {
      const response = await request(app)
        .get('/api/payment-optimization/payments')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('应该处理无效的支付ID', async () => {
      const response = await request(app)
        .get('/api/payment-optimization/payments/999')
        .set('Authorization', authToken)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('不存在');
    });

    it('应该处理无效的任务名称', async () => {
      const response = await request(app)
        .post('/api/payment-optimization/tasks/nonExistentTask/trigger')
        .set('Authorization', authToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('不存在');
    });

    it('应该处理缺少必要参数的请求', async () => {
      const response = await request(app)
        .post('/api/payment-optimization/offline-payments')
        .set('Authorization', authToken)
        .send({
          billId: testBill.id
          // 缺少其他必要参数
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});

/**
 * 生成测试用的JWT令牌
 * @param {number} userId - 用户ID
 * @returns {string} JWT令牌
 */
function generateTestToken(userId) {
  const jwt = require('jsonwebtoken');
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'test_secret',
    { expiresIn: '1h' }
  );
}