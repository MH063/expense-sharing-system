/**
 * 支付流程优化控制器单元测试 - 使用真实数据库
 */

const { initTestDatabase, clearTestDatabase, closeTestDatabase, models } = require('../setup/test-database');
const paymentOptimizationController = require('../../controllers/payment-optimization-controller');
const { v4: uuidv4 } = require('uuid');

describe('支付流程优化控制器测试 - 真实数据库', () => {
  let testUser, testRoom, testBill;

  beforeAll(async () => {
    // 初始化测试数据库
    await initTestDatabase();
  });

  afterAll(async () => {
    // 关闭数据库连接
    await closeTestDatabase();
  });

  beforeEach(async () => {
    // 清理测试数据
    await clearTestDatabase();

    // 创建测试用户
    testUser = await models.User.create({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
      name: '测试用户'
    });

    // 创建测试房间
    testRoom = await models.Room.create({
      name: '测试房间',
      description: '用于测试的房间',
      creatorId: testUser.id
    });

    // 将用户添加到房间
    await models.RoomMember.create({
      roomId: testRoom.id,
      userId: testUser.id,
      role: 'admin'
    });

    // 创建测试账单
    testBill = await models.Bill.create({
      title: '测试账单',
      description: '用于测试的账单',
      amount: 100.50,
      roomId: testRoom.id,
      createdBy: testUser.id,
      status: 'pending',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7天后
    });
  });

  describe('createOfflinePayment', () => {
    it('应该成功创建离线支付', async () => {
      // 准备模拟请求和响应对象
      const mockReq = {
        user: { id: testUser.id },
        body: {
          billId: testBill.id,
          userId: testUser.id,
          amount: 100.50,
          paymentMethod: 'cash',
          description: '现金支付',
          deviceId: 'device123'
        }
      };

      let status, json;
      const mockRes = {
        status: (code) => {
          status = code;
          return mockRes;
        },
        json: (data) => {
          json = data;
        }
      };

      // 调用函数
      await paymentOptimizationController.createOfflinePayment(mockReq, mockRes);

      // 验证结果
      expect(status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.billId).toBe(testBill.id);
      expect(json.data.userId).toBe(testUser.id);
      expect(json.data.amount).toBe(100.50);
      expect(json.data.paymentMethod).toBe('cash');
      expect(json.data.status).toBe('offline_pending');
      expect(json.message).toBe('离线支付记录创建成功');

      // 验证数据库中的记录
      const dbPayment = await models.Payment.findByPk(json.data.id);
      expect(dbPayment).toBeTruthy();
      expect(dbPayment.billId).toBe(testBill.id);
      expect(dbPayment.userId).toBe(testUser.id);
      expect(dbPayment.amount).toBe(100.50);
      expect(dbPayment.paymentMethod).toBe('cash');
      expect(dbPayment.status).toBe('offline_pending');
      expect(dbPayment.isOffline).toBe(true);
      expect(dbPayment.syncStatus).toBe('pending');
    });

    it('应该在缺少必要参数时返回错误', async () => {
      // 准备不完整的测试数据
      const mockReq = {
        user: { id: testUser.id },
        body: {
          billId: testBill.id,
          // 缺少 userId
          amount: 100.50,
          paymentMethod: 'cash'
        }
      };

      let status, json;
      const mockRes = {
        status: (code) => {
          status = code;
          return mockRes;
        },
        json: (data) => {
          json = data;
        }
      };

      // 调用函数
      await paymentOptimizationController.createOfflinePayment(mockReq, mockRes);

      // 验证结果
      expect(status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain('缺少必要参数');
    });

    it('应该在账单不存在时返回错误', async () => {
      // 准备测试数据
      const mockReq = {
        user: { id: testUser.id },
        body: {
          billId: uuidv4(), // 不存在的账单ID
          userId: testUser.id,
          amount: 100.50,
          paymentMethod: 'cash',
          deviceId: 'device123'
        }
      };

      let status, json;
      const mockRes = {
        status: (code) => {
          status = code;
          return mockRes;
        },
        json: (data) => {
          json = data;
        }
      };

      // 调用函数
      await paymentOptimizationController.createOfflinePayment(mockReq, mockRes);

      // 验证结果
      expect(status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toContain('账单不存在');
    });
  });

  describe('syncOfflinePayment', () => {
    it('应该成功同步离线支付', async () => {
      // 先创建一个离线支付记录
      const offlinePayment = await models.Payment.create({
        billId: testBill.id,
        userId: testUser.id,
        amount: 100.50,
        paymentMethod: 'cash',
        status: 'offline_pending',
        isOffline: true,
        syncStatus: 'pending',
        deviceId: 'device123'
      });

      // 准备模拟请求和响应对象
      const mockReq = {
        user: { id: testUser.id },
        params: { paymentId: offlinePayment.id },
        body: {
          transactionId: 'txn_123',
          receipt: 'receipt_data'
        }
      };

      let status, json;
      const mockRes = {
        status: (code) => {
          status = code;
          return mockRes;
        },
        json: (data) => {
          json = data;
        }
      };

      // 调用函数
      await paymentOptimizationController.syncOfflinePayment(mockReq, mockRes);

      // 验证结果
      expect(status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.status).toBe('completed');
      expect(json.data.transactionId).toBe('txn_123');
      expect(json.data.receipt).toBe('receipt_data');
      expect(json.data.isOffline).toBe(false);
      expect(json.data.syncStatus).toBe('completed');
      expect(json.message).toBe('离线支付记录同步成功');

      // 验证数据库中的记录
      const dbPayment = await models.Payment.findByPk(offlinePayment.id);
      expect(dbPayment.status).toBe('completed');
      expect(dbPayment.transactionId).toBe('txn_123');
      expect(dbPayment.receipt).toBe('receipt_data');
      expect(dbPayment.isOffline).toBe(false);
      expect(dbPayment.syncStatus).toBe('completed');
      expect(dbPayment.syncedAt).toBeTruthy();
    });

    it('应该在ID无效时返回错误', async () => {
      // 准备无效的ID
      const mockReq = {
        user: { id: testUser.id },
        params: { paymentId: null },
        body: {}
      };

      let status, json;
      const mockRes = {
        status: (code) => {
          status = code;
          return mockRes;
        },
        json: (data) => {
          json = data;
        }
      };

      // 调用函数
      await paymentOptimizationController.syncOfflinePayment(mockReq, mockRes);

      // 验证结果
      expect(status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.message).toBe('缺少支付记录ID');
    });

    it('应该在支付记录不存在时返回错误', async () => {
      // 准备不存在的ID
      const mockReq = {
        user: { id: testUser.id },
        params: { paymentId: uuidv4() },
        body: {}
      };

      let status, json;
      const mockRes = {
        status: (code) => {
          status = code;
          return mockRes;
        },
        json: (data) => {
          json = data;
        }
      };

      // 调用函数
      await paymentOptimizationController.syncOfflinePayment(mockReq, mockRes);

      // 验证结果
      expect(status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.message).toBe('支付记录不存在');
    });
  });

  describe('getUserOfflinePayments', () => {
    it('应该成功获取用户离线支付记录', async () => {
      // 创建多个离线支付记录
      await models.Payment.create({
        billId: testBill.id,
        userId: testUser.id,
        amount: 100.50,
        paymentMethod: 'cash',
        status: 'offline_pending',
        isOffline: true,
        syncStatus: 'pending',
        deviceId: 'device123'
      });

      await models.Payment.create({
        billId: testBill.id,
        userId: testUser.id,
        amount: 200.00,
        paymentMethod: 'alipay',
        status: 'offline_pending',
        isOffline: true,
        syncStatus: 'pending',
        deviceId: 'device123'
      });

      // 准备模拟请求和响应对象
      const mockReq = {
        user: { id: testUser.id },
        query: {
          status: 'offline_pending',
          page: 1,
          pageSize: 10
        }
      };

      let status, json;
      const mockRes = {
        status: (code) => {
          status = code;
          return mockRes;
        },
        json: (data) => {
          json = data;
        }
      };

      // 调用函数
      await paymentOptimizationController.getUserOfflinePayments(mockReq, mockRes);

      // 验证结果
      expect(status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data).toBeDefined();
      expect(json.data.items).toHaveLength(2);
      expect(json.data.total).toBe(2);
      expect(json.data.page).toBe(1);
      expect(json.data.pageSize).toBe(10);
      expect(json.data.totalPages).toBe(1);
      expect(json.message).toBe('获取用户离线支付记录成功');

      // 验证每条记录
      json.data.items.forEach(item => {
        expect(item.userId).toBe(testUser.id);
        expect(item.isOffline).toBe(true);
        expect(item.status).toBe('offline_pending');
        expect(item.bill).toBeDefined();
        expect(item.bill.id).toBe(testBill.id);
      });
    });

    it('应该正确处理分页', async () => {
      // 创建多个离线支付记录
      for (let i = 0; i < 5; i++) {
        await models.Payment.create({
          billId: testBill.id,
          userId: testUser.id,
          amount: 100.00 + i,
          paymentMethod: 'cash',
          status: 'offline_pending',
          isOffline: true,
          syncStatus: 'pending',
          deviceId: 'device123'
        });
      }

      // 准备模拟请求和响应对象 - 第一页
      const mockReq = {
        user: { id: testUser.id },
        query: {
          page: 1,
          pageSize: 2
        }
      };

      let status, json;
      const mockRes = {
        status: (code) => {
          status = code;
          return mockRes;
        },
        json: (data) => {
          json = data;
        }
      };

      // 调用函数
      await paymentOptimizationController.getUserOfflinePayments(mockReq, mockRes);

      // 验证第一页结果
      expect(status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.items).toHaveLength(2);
      expect(json.data.total).toBe(5);
      expect(json.data.page).toBe(1);
      expect(json.data.pageSize).toBe(2);
      expect(json.data.totalPages).toBe(3);
    });

    it('应该根据状态筛选支付记录', async () => {
      // 创建不同状态的离线支付记录
      const offlinePayment1 = await models.Payment.create({
        billId: testBill.id,
        userId: testUser.id,
        amount: 100.50,
        paymentMethod: 'cash',
        status: 'offline_pending',
        isOffline: true,
        syncStatus: 'pending',
        deviceId: 'device123'
      });

      const offlinePayment2 = await models.Payment.create({
        billId: testBill.id,
        userId: testUser.id,
        amount: 200.00,
        paymentMethod: 'alipay',
        status: 'completed',
        isOffline: false,
        syncStatus: 'completed',
        deviceId: 'device123'
      });

      // 准备模拟请求和响应对象 - 只查询待同步的记录
      const mockReq = {
        user: { id: testUser.id },
        query: {
          status: 'offline_pending',
          page: 1,
          pageSize: 10
        }
      };

      let status, json;
      const mockRes = {
        status: (code) => {
          status = code;
          return mockRes;
        },
        json: (data) => {
          json = data;
        }
      };

      // 调用函数
      await paymentOptimizationController.getUserOfflinePayments(mockReq, mockRes);

      // 验证结果
      expect(status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.items).toHaveLength(1);
      expect(json.data.items[0].id).toBe(offlinePayment1.id);
      expect(json.data.items[0].status).toBe('offline_pending');
    });
  });
});