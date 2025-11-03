// 加载测试环境变量
require('dotenv').config({ path: '.env.test' });

const request = require('supertest');
const app = require('../../server');

// 测试数据
let testUser;
let testBill;
let testRoom;
let authToken;

// 测试前设置
beforeAll(async () => {
  console.log('开始执行离线支付集成测试的beforeAll钩子...');
  
  try {
    // 创建测试用户
    console.log('正在创建测试用户...');
    const userResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: `offlinepaymenttest${Date.now()}`,
        email: `offlinepayment${Date.now()}@example.com`,
        password: 'password123',
        name: 'Offline Payment Test User'
      });
    
    console.log('用户创建响应状态:', userResponse.status);
    
    if (userResponse.status !== 201) {
      throw new Error(`用户创建失败，状态码: ${userResponse.status}`);
    }
    
    testUser = userResponse.body.data;
    console.log('测试用户创建成功，ID:', testUser.id);
    
    // 登录获取认证令牌
    console.log('正在登录测试用户...');
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: testUser.username,
        password: 'password123'
      });
    
    console.log('登录响应状态:', loginResponse.status);
    
    if (loginResponse.status !== 200) {
      throw new Error(`用户登录失败，状态码: ${loginResponse.status}`);
    }
    
    authToken = loginResponse.body.data.token;
    console.log('用户登录成功，获取到认证令牌');
    
    // 创建测试房间
    console.log('正在创建测试房间...');
    const roomResponse = await request(app)
      .post('/api/rooms')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '离线支付测试房间',
        description: '用于离线支付功能测试的房间'
      });
    
    console.log('房间创建响应状态:', roomResponse.status);
    
    if (roomResponse.status !== 201) {
      throw new Error(`房间创建失败，状态码: ${roomResponse.status}`);
    }
    
    testRoom = roomResponse.body.data;
    console.log('测试房间创建成功，ID:', testRoom.id);
    
    // 创建测试账单
    console.log('正在创建测试账单...');
    const billResponse = await request(app)
      .post('/api/bills')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: '离线支付测试账单',
        amount: 100.50,
        description: '用于离线支付功能测试的账单',
        roomId: testRoom.id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7天后
        type: 'expense'
      });
    
    console.log('账单创建响应状态:', billResponse.status);
    
    if (billResponse.status !== 201) {
      throw new Error(`账单创建失败，状态码: ${billResponse.status}`);
    }
    
    testBill = billResponse.body.data;
    console.log('测试账单创建成功，ID:', testBill.id);
    
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
    console.log('开始清理测试数据...');
    
    // 删除测试支付记录
    if (testBill && testBill.id) {
      await pool.query('DELETE FROM payments WHERE bill_id = $1', [testBill.id]);
    }
    
    // 删除测试账单
    if (testBill && testBill.id) {
      await pool.query('DELETE FROM bills WHERE id = $1', [testBill.id]);
    }
    
    // 删除测试房间
    if (testRoom && testRoom.id) {
      await pool.query('DELETE FROM rooms WHERE id = $1', [testRoom.id]);
    }
    
    // 删除测试用户
    if (testUser && testUser.id) {
      await pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
    }
    
    console.log('测试数据清理完成');
  } catch (error) {
    console.error('清理测试数据时发生错误:', error);
  } finally {
    await pool.end();
  }
});

describe('离线支付功能集成测试', () => {
  describe('创建离线支付记录', () => {
    it('应该成功创建离线支付记录', async () => {
      console.log('测试创建离线支付记录...');
      
      const paymentData = {
        billId: testBill.id,
        amount: 100.50,
        paymentMethod: 'cash',
        note: '离线支付测试',
        deviceId: 'test-device-123',
        location: '测试位置'
      };
      
      const response = await request(app)
        .post('/api/payments/offline')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData);
      
      console.log('创建离线支付响应状态:', response.status);
      console.log('创建离线支付响应:', response.body);
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.billId).toBe(testBill.id);
      expect(response.body.data.amount).toBe(100.50);
      expect(response.body.data.paymentMethod).toBe('cash');
      expect(response.body.data.isOffline).toBe(true);
      expect(response.body.data.syncStatus).toBe('pending');
    });
    
    it('应该在缺少必要参数时返回错误', async () => {
      console.log('测试缺少必要参数的情况...');
      
      const paymentData = {
        // 缺少billId
        amount: 100.50,
        paymentMethod: 'cash',
        note: '离线支付测试',
        deviceId: 'test-device-123'
      };
      
      const response = await request(app)
        .post('/api/payments/offline')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData);
      
      console.log('缺少参数响应状态:', response.status);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('缺少必要参数');
    });
    
    it('应该在账单不存在时返回错误', async () => {
      console.log('测试账单不存在的情况...');
      
      const paymentData = {
        billId: 'non-existent-bill-id',
        amount: 100.50,
        paymentMethod: 'cash',
        note: '离线支付测试',
        deviceId: 'test-device-123'
      };
      
      const response = await request(app)
        .post('/api/payments/offline')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData);
      
      console.log('账单不存在响应状态:', response.status);
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('账单不存在');
    });
  });
  
  describe('获取用户离线支付记录', () => {
    let offlinePaymentId;
    
    beforeAll(async () => {
      // 创建一个离线支付记录用于测试
      const paymentData = {
        billId: testBill.id,
        amount: 50.00,
        paymentMethod: 'alipay',
        note: '获取记录测试',
        deviceId: 'test-device-456'
      };
      
      const response = await request(app)
        .post('/api/payments/offline')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData);
      
      offlinePaymentId = response.body.data.id;
    });
    
    it('应该成功获取用户离线支付记录', async () => {
      console.log('测试获取用户离线支付记录...');
      
      const response = await request(app)
        .get('/api/payments/offline')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          page: 1,
          pageSize: 10
        });
      
      console.log('获取离线支付记录响应状态:', response.status);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.items).toBeDefined();
      expect(Array.isArray(response.body.data.items)).toBe(true);
      expect(response.body.data.items.length).toBeGreaterThan(0);
      
      // 验证返回的记录包含账单信息
      const payment = response.body.data.items.find(p => p.id === offlinePaymentId);
      expect(payment).toBeDefined();
      expect(payment.bill).toBeDefined();
      expect(payment.bill.id).toBe(testBill.id);
    });
    
    it('应该支持按状态筛选离线支付记录', async () => {
      console.log('测试按状态筛选离线支付记录...');
      
      const response = await request(app)
        .get('/api/payments/offline')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          status: 'offline_pending',
          page: 1,
          pageSize: 10
        });
      
      console.log('按状态筛选响应状态:', response.status);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.items).toBeDefined();
      
      // 验证所有返回的记录都符合筛选条件
      response.body.data.items.forEach(payment => {
        expect(payment.status).toBe('offline_pending');
      });
    });
  });
  
  describe('获取待同步的离线支付记录', () => {
    it('应该成功获取待同步的离线支付记录', async () => {
      console.log('测试获取待同步的离线支付记录...');
      
      const response = await request(app)
        .get('/api/payments/offline/pending-sync')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          page: 1,
          pageSize: 10
        });
      
      console.log('获取待同步记录响应状态:', response.status);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.items).toBeDefined();
      expect(Array.isArray(response.body.data.items)).toBe(true);
      
      // 验证所有返回的记录都是待同步状态
      response.body.data.items.forEach(payment => {
        expect(payment.isOffline).toBe(true);
        expect(payment.syncStatus).toBe('pending');
      });
    });
  });
  
  describe('标记支付同步失败', () => {
    let offlinePaymentId;
    
    beforeAll(async () => {
      // 创建一个离线支付记录用于测试
      const paymentData = {
        billId: testBill.id,
        amount: 75.00,
        paymentMethod: 'wechat',
        note: '同步失败测试',
        deviceId: 'test-device-789'
      };
      
      const response = await request(app)
        .post('/api/payments/offline')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData);
      
      offlinePaymentId = response.body.data.id;
    });
    
    it('应该成功标记支付同步失败', async () => {
      console.log('测试标记支付同步失败...');
      
      const response = await request(app)
        .patch(`/api/payments/${offlinePaymentId}/sync-failed`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          failureReason: '网络连接超时'
        });
      
      console.log('标记同步失败响应状态:', response.status);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.syncStatus).toBe('failed');
      expect(response.body.data.syncFailureReason).toBe('网络连接超时');
    });
    
    it('应该在支付记录不存在时返回错误', async () => {
      console.log('测试支付记录不存在的情况...');
      
      const response = await request(app)
        .patch('/api/payments/non-existent-payment/sync-failed')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          failureReason: '测试错误'
        });
      
      console.log('支付记录不存在响应状态:', response.status);
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('支付记录不存在');
    });
  });
  
  describe('重试同步失败的支付记录', () => {
    let failedPaymentId;
    
    beforeAll(async () => {
      // 创建一个离线支付记录并标记为同步失败
      const paymentData = {
        billId: testBill.id,
        amount: 25.00,
        paymentMethod: 'bank_transfer',
        note: '重试同步测试',
        deviceId: 'test-device-999'
      };
      
      const createResponse = await request(app)
        .post('/api/payments/offline')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData);
      
      const paymentId = createResponse.body.data.id;
      
      // 标记为同步失败
      await request(app)
        .patch(`/api/payments/${paymentId}/sync-failed`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          failureReason: '服务器错误'
        });
      
      failedPaymentId = paymentId;
    });
    
    it('应该成功重试同步失败的支付记录', async () => {
      console.log('测试重试同步失败的支付记录...');
      
      const response = await request(app)
        .post(`/api/payments/${failedPaymentId}/retry-sync`)
        .set('Authorization', `Bearer ${authToken}`);
      
      console.log('重试同步响应状态:', response.status);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.syncStatus).toBe('pending');
      expect(response.body.data.syncFailureReason).toBeNull();
    });
    
    it('应该在支付记录不存在时返回错误', async () => {
      console.log('测试支付记录不存在的情况...');
      
      const response = await request(app)
        .post('/api/payments/non-existent-payment/retry-sync')
        .set('Authorization', `Bearer ${authToken}`);
      
      console.log('支付记录不存在响应状态:', response.status);
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('支付记录不存在');
    });
    
    it('应该在支付记录状态不正确时返回错误', async () => {
      console.log('测试支付记录状态不正确的情况...');
      
      // 创建一个正常的离线支付记录（状态为pending）
      const paymentData = {
        billId: testBill.id,
        amount: 15.00,
        paymentMethod: 'cash',
        note: '状态测试',
        deviceId: 'test-device-111'
      };
      
      const createResponse = await request(app)
        .post('/api/payments/offline')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData);
      
      const paymentId = createResponse.body.data.id;
      
      // 尝试重试同步一个状态为pending的支付记录
      const response = await request(app)
        .post(`/api/payments/${paymentId}/retry-sync`)
        .set('Authorization', `Bearer ${authToken}`);
      
      console.log('状态不正确响应状态:', response.status);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('只能重试同步失败状态的支付记录');
    });
  });
  
  describe('同步离线支付记录', () => {
    let offlinePaymentId;
    
    beforeAll(async () => {
      // 创建一个离线支付记录用于测试
      const paymentData = {
        billId: testBill.id,
        amount: 35.00,
        paymentMethod: 'cash',
        note: '同步测试',
        deviceId: 'test-device-222'
      };
      
      const response = await request(app)
        .post('/api/payments/offline')
        .set('Authorization', `Bearer ${authToken}`)
        .send(paymentData);
      
      offlinePaymentId = response.body.data.id;
    });
    
    it('应该成功同步离线支付记录', async () => {
      console.log('测试同步离线支付记录...');
      
      const syncData = {
        transactionId: 'txn_' + Date.now(),
        receipt: '支付收据信息'
      };
      
      const response = await request(app)
        .post(`/api/payments/${offlinePaymentId}/sync`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(syncData);
      
      console.log('同步离线支付响应状态:', response.status);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.transactionId).toBe(syncData.transactionId);
      expect(response.body.data.isOffline).toBe(false);
      expect(response.body.data.syncStatus).toBe('completed');
      expect(response.body.data.syncedAt).toBeDefined();
    });
    
    it('应该在支付记录不存在时返回错误', async () => {
      console.log('测试支付记录不存在的情况...');
      
      const syncData = {
        transactionId: 'txn_' + Date.now(),
        receipt: '测试收据'
      };
      
      const response = await request(app)
        .post('/api/payments/non-existent-payment/sync')
        .set('Authorization', `Bearer ${authToken}`)
        .send(syncData);
      
      console.log('支付记录不存在响应状态:', response.status);
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('支付记录不存在');
    });
  });
});