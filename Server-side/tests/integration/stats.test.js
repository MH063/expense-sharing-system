const request = require('supertest');
const app = require('../../server');
const { Pool } = require('pg');

// 测试数据
let testUser;
let testRoom;
let testExpenseTypes;
let testBills = [];
let testExpenses = [];
let authToken;

describe('统计控制器集成测试', () => {
  // 设置测试环境
  beforeAll(async () => {
    // 创建数据库连接用于测试数据清理
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/expense_sharing_test'
    });
    
    // 清理测试数据
    await pool.query('DELETE FROM expenses WHERE bill_id IN (SELECT id FROM bills WHERE created_by = $1)', [1]);
    await pool.query('DELETE FROM bill_participants WHERE bill_id IN (SELECT id FROM bills WHERE created_by = $1)', [1]);
    await pool.query('DELETE FROM bills WHERE created_by = $1', [1]);
    await pool.query('DELETE FROM room_members WHERE user_id = $1', [1]);
    await pool.query('DELETE FROM rooms WHERE creator_id = $1', [1]);
    await pool.query('DELETE FROM expense_types WHERE created_by = $1', [1]);
    await pool.query('DELETE FROM users WHERE id = $1', [1]);
    
    // 创建测试用户
    const userResult = await pool.query(`
      INSERT INTO users (username, email, password_hash, name, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING id, username, email, name
    `, ['testuser_stats', 'test_stats@example.com', 'hashed_password', 'Test User Stats']);
    
    testUser = userResult.rows[0];
    
    // 创建测试寝室
    const roomResult = await pool.query(`
      INSERT INTO rooms (name, creator_id, invite_code, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING id, name, creator_id, invite_code
    `, ['Test Room Stats', testUser.id, 'STATS123']);
    
    testRoom = roomResult.rows[0];
    
    // 将用户加入寝室
    await pool.query(`
      INSERT INTO room_members (room_id, user_id, role, joined_at)
      VALUES ($1, $2, $3, NOW())
    `, [testRoom.id, testUser.id, 'owner']);
    
    // 创建测试费用类型
    const expenseTypeResults = await pool.query(`
      INSERT INTO expense_types (name, icon, color, created_by, is_default, created_at, updated_at)
      VALUES 
        ('餐饮', 'food', '#FF5722', $1, true, NOW(), NOW()),
        ('交通', 'transport', '#2196F3', $1, true, NOW(), NOW()),
        ('购物', 'shopping', '#4CAF50', $1, true, NOW(), NOW()),
        ('娱乐', 'entertainment', '#9C27B0', $1, false, NOW(), NOW())
      RETURNING id, name, icon, color, created_by, is_default
    `, [testUser.id]);
    
    testExpenseTypes = expenseTypeResults.rows;
    
    // 创建测试账单和费用
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    
    // 创建不同时间的账单和费用，用于测试统计功能
    const billData = [
      { date: now, amount: 100, description: '本月餐饮', type_id: testExpenseTypes[0].id },
      { date: now, amount: 50, description: '本月交通', type_id: testExpenseTypes[1].id },
      { date: lastMonth, amount: 200, description: '上月购物', type_id: testExpenseTypes[2].id },
      { date: lastMonth, amount: 80, description: '上月餐饮', type_id: testExpenseTypes[0].id },
      { date: twoMonthsAgo, amount: 150, description: '两月前娱乐', type_id: testExpenseTypes[3].id },
      { date: twoMonthsAgo, amount: 120, description: '两月前餐饮', type_id: testExpenseTypes[0].id }
    ];
    
    for (const bill of billData) {
      // 创建账单
      const billResult = await pool.query(`
        INSERT INTO bills (description, amount, room_id, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id, description, amount, room_id, created_by, created_at
      `, [bill.description, bill.amount, testRoom.id, testUser.id, bill.date]);
      
      const newBill = billResult.rows[0];
      testBills.push(newBill);
      
      // 创建账单参与者
      await pool.query(`
        INSERT INTO bill_participants (bill_id, user_id, amount, paid_at)
        VALUES ($1, $2, $3, $4)
      `, [newBill.id, testUser.id, bill.amount, bill.date]);
      
      // 创建费用
      const expenseResult = await pool.query(`
        INSERT INTO expenses (bill_id, user_id, amount, expense_type_id, description, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING id, bill_id, user_id, amount, expense_type_id, description, created_at
      `, [newBill.id, testUser.id, bill.amount, bill.type_id, bill.description, bill.date]);
      
      testExpenses.push(expenseResult.rows[0]);
    }
    
    // 关闭数据库连接
    await pool.end();
    
    // 获取认证令牌
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser_stats',
        password: 'password123'
      });
    
    authToken = loginResponse.body.data.token;
  });
  
  // 清理测试环境
  afterAll(async () => {
    // 创建数据库连接用于测试数据清理
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/expense_sharing_test'
    });
    
    // 清理测试数据
    await pool.query('DELETE FROM expenses WHERE bill_id IN (SELECT id FROM bills WHERE created_by = $1)', [testUser.id]);
    await pool.query('DELETE FROM bill_participants WHERE bill_id IN (SELECT id FROM bills WHERE created_by = $1)', [testUser.id]);
    await pool.query('DELETE FROM bills WHERE created_by = $1', [testUser.id]);
    await pool.query('DELETE FROM room_members WHERE user_id = $1', [testUser.id]);
    await pool.query('DELETE FROM rooms WHERE creator_id = $1', [testUser.id]);
    await pool.query('DELETE FROM expense_types WHERE created_by = $1', [testUser.id]);
    await pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
    
    // 关闭数据库连接
    await pool.end();
  });
  
  describe('GET /api/stats/user', () => {
    it('应该成功获取用户统计信息', async () => {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const response = await request(app)
        .get('/api/stats/user')
        .query({
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        })
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('获取用户统计信息成功');
      expect(response.body.data).toHaveProperty('payment_stats');
      expect(response.body.data).toHaveProperty('sharing_stats');
      expect(response.body.data).toHaveProperty('bill_stats');
      
      // 验证支付统计
      expect(response.body.data.payment_stats).toHaveProperty('total_paid');
      expect(response.body.data.payment_stats).toHaveProperty('total_owed');
      expect(response.body.data.payment_stats).toHaveProperty('total_balance');
      
      // 验证分摊统计
      expect(response.body.data.sharing_stats).toHaveProperty('total_shared');
      expect(response.body.data.sharing_stats).toHaveProperty('total_personal');
      
      // 验证账单统计
      expect(response.body.data.bill_stats).toHaveProperty('total_amount');
      expect(response.body.data.bill_stats).toHaveProperty('avg_amount');
    });
    
    it('应该在未认证时返回401错误', async () => {
      const response = await request(app)
        .get('/api/stats/user')
        .query({
          start_date: '2023-01-01',
          end_date: '2023-12-31'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
    
    it('应该在缺少日期参数时返回400错误', async () => {
      const response = await request(app)
        .get('/api/stats/user')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /api/stats/expense-types', () => {
    it('应该成功获取费用类型分布', async () => {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const response = await request(app)
        .get('/api/stats/expense-types')
        .query({
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        })
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('获取费用类型分布成功');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // 验证费用类型分布数据结构
      if (response.body.data.length > 0) {
        const expenseType = response.body.data[0];
        expect(expenseType).toHaveProperty('expense_type_id');
        expect(expenseType).toHaveProperty('expense_type_name');
        expect(expenseType).toHaveProperty('total_amount');
        expect(expenseType).toHaveProperty('count');
        expect(expenseType).toHaveProperty('percentage');
      }
    });
    
    it('应该在未认证时返回401错误', async () => {
      const response = await request(app)
        .get('/api/stats/expense-types')
        .query({
          start_date: '2023-01-01',
          end_date: '2023-12-31'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /api/stats/daily-trend', () => {
    it('应该成功获取每日费用趋势', async () => {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const response = await request(app)
        .get('/api/stats/daily-trend')
        .query({
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        })
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('获取每日费用趋势成功');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // 验证每日费用趋势数据结构
      if (response.body.data.length > 0) {
        const dailyTrend = response.body.data[0];
        expect(dailyTrend).toHaveProperty('date');
        expect(dailyTrend).toHaveProperty('total_amount');
        expect(dailyTrend).toHaveProperty('count');
      }
    });
    
    it('应该在日期范围过大时返回400错误', async () => {
      const response = await request(app)
        .get('/api/stats/daily-trend')
        .query({
          start_date: '2022-01-01',
          end_date: '2023-12-31'
        })
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('日期范围不能超过365天');
    });
  });
  
  describe('GET /api/stats/monthly-trend', () => {
    it('应该成功获取每月费用趋势', async () => {
      const now = new Date();
      const startDate = new Date(now.getFullYear() - 1, 0, 1);
      const endDate = new Date(now.getFullYear(), 11, 31);
      
      const response = await request(app)
        .get('/api/stats/monthly-trend')
        .query({
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        })
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('获取每月费用趋势成功');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // 验证每月费用趋势数据结构
      if (response.body.data.length > 0) {
        const monthlyTrend = response.body.data[0];
        expect(monthlyTrend).toHaveProperty('month');
        expect(monthlyTrend).toHaveProperty('total_amount');
        expect(monthlyTrend).toHaveProperty('count');
      }
    });
    
    it('应该在日期范围过大时返回400错误', async () => {
      const response = await request(app)
        .get('/api/stats/monthly-trend')
        .query({
          start_date: '2018-01-01',
          end_date: '2023-12-31'
        })
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('日期范围不能超过5年');
    });
  });
  
  describe('GET /api/stats/room/:roomId', () => {
    it('应该成功获取寝室统计信息', async () => {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const response = await request(app)
        .get(`/api/stats/room/${testRoom.id}`)
        .query({
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        })
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('获取寝室统计信息成功');
      expect(response.body.data).toHaveProperty('overall_stats');
      expect(response.body.data).toHaveProperty('member_stats');
      
      // 验证总体统计数据结构
      expect(response.body.data.overall_stats).toHaveProperty('total_amount');
      expect(response.body.data.overall_stats).toHaveProperty('bills_count');
      expect(response.body.data.overall_stats).toHaveProperty('expenses_count');
      
      // 验证成员统计数据结构
      expect(Array.isArray(response.body.data.member_stats)).toBe(true);
      if (response.body.data.member_stats.length > 0) {
        const memberStat = response.body.data.member_stats[0];
        expect(memberStat).toHaveProperty('user_id');
        expect(memberStat).toHaveProperty('username');
        expect(memberStat).toHaveProperty('total_paid');
        expect(memberStat).toHaveProperty('total_owed');
        expect(memberStat).toHaveProperty('total_balance');
      }
    });
    
    it('应该在用户不是寝室成员时返回403错误', async () => {
      // 创建另一个用户和寝室
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/expense_sharing_test'
      });
      
      const userResult = await pool.query(`
        INSERT INTO users (username, email, password_hash, name, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id, username, email, name
      `, ['otheruser', 'other@example.com', 'hashed_password', 'Other User']);
      
      const otherUser = userResult.rows[0];
      
      const roomResult = await pool.query(`
        INSERT INTO rooms (name, creator_id, invite_code, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING id, name, creator_id, invite_code
      `, ['Other Room', otherUser.id, 'OTHER123']);
      
      const otherRoom = roomResult.rows[0];
      
      await pool.query(`
        INSERT INTO room_members (room_id, user_id, role, joined_at)
        VALUES ($1, $2, $3, NOW())
      `, [otherRoom.id, otherUser.id, 'owner']);
      
      await pool.end();
      
      // 获取另一个用户的认证令牌
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'otheruser',
          password: 'password123'
        });
      
      const otherAuthToken = loginResponse.body.data.token;
      
      // 尝试访问不属于自己的寝室统计
      const response = await request(app)
        .get(`/api/stats/room/${otherRoom.id}`)
        .query({
          start_date: '2023-01-01',
          end_date: '2023-12-31'
        })
        .set('Authorization', `Bearer ${otherAuthToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('您不是该寝室的成员');
      
      // 清理测试数据
      const cleanupPool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/expense_sharing_test'
      });
      
      await cleanupPool.query('DELETE FROM room_members WHERE user_id = $1', [otherUser.id]);
      await cleanupPool.query('DELETE FROM rooms WHERE creator_id = $1', [otherUser.id]);
      await cleanupPool.query('DELETE FROM users WHERE id = $1', [otherUser.id]);
      
      await cleanupPool.end();
    });
  });
  
  describe('GET /api/stats/room/:roomId/expense-types', () => {
    it('应该成功获取寝室费用类型分布', async () => {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      const response = await request(app)
        .get(`/api/stats/room/${testRoom.id}/expense-types`)
        .query({
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        })
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('获取寝室费用类型分布成功');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // 验证费用类型分布数据结构
      if (response.body.data.length > 0) {
        const expenseType = response.body.data[0];
        expect(expenseType).toHaveProperty('expense_type_id');
        expect(expenseType).toHaveProperty('expense_type_name');
        expect(expenseType).toHaveProperty('total_amount');
        expect(expenseType).toHaveProperty('count');
        expect(expenseType).toHaveProperty('percentage');
      }
    });
  });
  
  describe('GET /api/stats/room/:roomId/monthly-trend', () => {
    it('应该成功获取寝室每月费用趋势', async () => {
      const now = new Date();
      const startDate = new Date(now.getFullYear() - 1, 0, 1);
      const endDate = new Date(now.getFullYear(), 11, 31);
      
      const response = await request(app)
        .get(`/api/stats/room/${testRoom.id}/monthly-trend`)
        .query({
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0]
        })
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('获取寝室每月费用趋势成功');
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // 验证每月费用趋势数据结构
      if (response.body.data.length > 0) {
        const monthlyTrend = response.body.data[0];
        expect(monthlyTrend).toHaveProperty('month');
        expect(monthlyTrend).toHaveProperty('total_amount');
        expect(monthlyTrend).toHaveProperty('count');
      }
    });
  });
});