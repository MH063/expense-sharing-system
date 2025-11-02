const request = require('supertest');
const app = require('../../server');
const { Pool } = require('pg');

// 测试数据
let testUser;
let testExpenseType;
let authToken;

// 测试前设置
beforeAll(async () => {
  // 创建测试用户
  const userResponse = await request(app)
    .post('/api/auth/register')
    .send({
      username: 'expensetypeuser',
      email: 'expensetype@example.com',
      password: 'password123',
      name: 'Expense Type Test User'
    });
  
  testUser = userResponse.body.data;
  
  // 登录获取令牌
  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({
      username: 'expensetypeuser',
      password: 'password123'
    });
  
  authToken = loginResponse.body.data.token;
});

// 测试后清理
afterAll(async () => {
  // 清理测试数据
  const pool = new Pool();
  
  // 删除测试用户创建的费用类型
  await pool.query('DELETE FROM expense_types WHERE created_by = $1', [testUser.id]);
  
  // 删除测试用户
  await pool.query('DELETE FROM users WHERE id = $1', [testUser.id]);
  
  await pool.end();
});

describe('费用类型管理API集成测试', () => {
  describe('POST /api/expense-types', () => {
    it('应该成功创建费用类型', async () => {
      const response = await request(app)
        .post('/api/expense-types')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '测试费用类型',
          description: '这是一个测试费用类型',
          icon: 'test',
          color: '#9C27B0'
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('费用类型创建成功');
      expect(response.body.data.name).toBe('测试费用类型');
      expect(response.body.data.description).toBe('这是一个测试费用类型');
      expect(response.body.data.icon).toBe('test');
      expect(response.body.data.color).toBe('#9C27B0');
      expect(response.body.data.is_default).toBe(false);
      expect(response.body.data.created_by).toBe(testUser.id);
      
      // 保存测试费用类型数据
      testExpenseType = response.body.data;
    });
    
    it('应该在未认证时返回401错误', async () => {
      const response = await request(app)
        .post('/api/expense-types')
        .send({
          name: '未认证费用类型',
          description: '这是一个未认证的测试费用类型'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
    
    it('应该在缺少必填字段时返回400错误', async () => {
      const response = await request(app)
        .post('/api/expense-types')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: '缺少名称的费用类型'
          // 缺少name字段
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('费用类型名称为必填项');
    });
    
    it('应该在费用类型名称已存在时返回409错误', async () => {
      const response = await request(app)
        .post('/api/expense-types')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '测试费用类型', // 与已创建的费用类型同名
          description: '重复名称的费用类型'
        });
      
      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('费用类型名称已存在');
    });
  });
  
  describe('GET /api/expense-types', () => {
    it('应该成功获取费用类型列表', async () => {
      const response = await request(app)
        .get('/api/expense-types')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('获取费用类型列表成功');
      expect(response.body.data.expenseTypes).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
      
      // 验证分页信息
      expect(response.body.data.pagination.page).toBeDefined();
      expect(response.body.data.pagination.limit).toBeDefined();
      expect(response.body.data.pagination.total).toBeDefined();
      expect(response.body.data.pagination.totalPages).toBeDefined();
      
      // 验证创建的费用类型在列表中
      const createdType = response.body.data.expenseTypes.find(
        type => type.id === testExpenseType.id
      );
      expect(createdType).toBeDefined();
      expect(createdType.name).toBe('测试费用类型');
    });
    
    it('应该支持分页查询', async () => {
      const response = await request(app)
        .get('/api/expense-types?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data.pagination.page).toBe(1);
      expect(response.body.data.pagination.limit).toBe(5);
    });
    
    it('应该支持按名称筛选', async () => {
      const response = await request(app)
        .get('/api/expense-types?name=测试')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // 验证筛选结果包含创建的费用类型
      const filteredTypes = response.body.data.expenseTypes.filter(
        type => type.name.includes('测试')
      );
      expect(filteredTypes.length).toBeGreaterThan(0);
    });
    
    it('应该支持按创建者筛选', async () => {
      const response = await request(app)
        .get(`/api/expense-types?created_by=${testUser.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // 验证筛选结果只包含当前用户创建的费用类型
      response.body.data.expenseTypes.forEach(type => {
        expect(type.created_by).toBe(testUser.id);
      });
    });
  });
  
  describe('GET /api/expense-types/default', () => {
    it('应该成功获取默认费用类型列表', async () => {
      const response = await request(app)
        .get('/api/expense-types/default')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('获取默认费用类型列表成功');
      expect(response.body.data).toBeInstanceOf(Array);
      
      // 验证返回的都是默认费用类型
      response.body.data.forEach(type => {
        expect(type.is_default).toBe(true);
        expect(type.created_by).toBeNull();
      });
    });
  });
  
  describe('GET /api/expense-types/:id', () => {
    it('应该成功获取费用类型详情', async () => {
      const response = await request(app)
        .get(`/api/expense-types/${testExpenseType.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('获取费用类型详情成功');
      expect(response.body.data.id).toBe(testExpenseType.id);
      expect(response.body.data.name).toBe(testExpenseType.name);
      expect(response.body.data.description).toBe(testExpenseType.description);
      expect(response.body.data.icon).toBe(testExpenseType.icon);
      expect(response.body.data.color).toBe(testExpenseType.color);
    });
    
    it('应该在费用类型不存在时返回404错误', async () => {
      const response = await request(app)
        .get('/api/expense-types/99999')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('费用类型不存在');
    });
  });
  
  describe('PUT /api/expense-types/:id', () => {
    it('应该成功更新费用类型信息', async () => {
      const response = await request(app)
        .put(`/api/expense-types/${testExpenseType.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '更新后的费用类型',
          description: '更新后的描述',
          icon: 'updated',
          color: '#FF9800'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('费用类型信息更新成功');
      expect(response.body.data.name).toBe('更新后的费用类型');
      expect(response.body.data.description).toBe('更新后的描述');
      expect(response.body.data.icon).toBe('updated');
      expect(response.body.data.color).toBe('#FF9800');
    });
    
    it('应该在费用类型不存在时返回404错误', async () => {
      const response = await request(app)
        .put('/api/expense-types/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '不存在的费用类型'
        });
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('费用类型不存在');
    });
    
    it('应该在费用类型名称已存在时返回409错误', async () => {
      // 先创建另一个费用类型
      const anotherTypeResponse = await request(app)
        .post('/api/expense-types')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '另一个费用类型',
          description: '这是另一个测试费用类型'
        });
      
      const anotherTypeId = anotherTypeResponse.body.data.id;
      
      // 尝试将第一个费用类型更新为与第二个相同的名称
      const response = await request(app)
        .put(`/api/expense-types/${testExpenseType.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '另一个费用类型'
        });
      
      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('费用类型名称已存在');
      
      // 清理
      await request(app)
        .delete(`/api/expense-types/${anotherTypeId}`)
        .set('Authorization', `Bearer ${authToken}`);
    });
  });
  
  describe('DELETE /api/expense-types/:id', () => {
    let deletableExpenseType;
    
    // 创建一个可删除的费用类型
    beforeAll(async () => {
      const response = await request(app)
        .post('/api/expense-types')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '可删除的费用类型',
          description: '这是一个用于测试删除的费用类型'
        });
      
      deletableExpenseType = response.body.data;
    });
    
    it('应该成功删除费用类型', async () => {
      const response = await request(app)
        .delete(`/api/expense-types/${deletableExpenseType.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('费用类型删除成功');
      
      // 验证费用类型已被删除
      const getResponse = await request(app)
        .get(`/api/expense-types/${deletableExpenseType.id}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(getResponse.status).toBe(404);
      expect(getResponse.body.success).toBe(false);
    });
    
    it('应该在费用类型不存在时返回404错误', async () => {
      const response = await request(app)
        .delete('/api/expense-types/99999')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('费用类型不存在');
    });
    
    it('应该在尝试删除系统默认费用类型时返回403错误', async () => {
      // 先获取一个默认费用类型
      const defaultTypesResponse = await request(app)
        .get('/api/expense-types/default')
        .set('Authorization', `Bearer ${authToken}`);
      
      if (defaultTypesResponse.body.data.length > 0) {
        const defaultTypeId = defaultTypesResponse.body.data[0].id;
        
        // 尝试删除默认费用类型
        const response = await request(app)
          .delete(`/api/expense-types/${defaultTypeId}`)
          .set('Authorization', `Bearer ${authToken}`);
        
        expect(response.status).toBe(403);
        expect(response.body.success).toBe(false);
        expect(response.body.message).toBe('不能删除系统默认费用类型');
      }
    });
  });
  
  describe('权限测试', () => {
    let anotherUser;
    let anotherUserToken;
    let anotherUserExpenseType;
    
    // 创建另一个测试用户
    beforeAll(async () => {
      const userResponse = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'anotherexpensetypeuser',
          email: 'anotherexpensetype@example.com',
          password: 'password123',
          name: 'Another Expense Type User'
        });
      
      anotherUser = userResponse.body.data;
      
      // 登录获取令牌
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'anotherexpensetypeuser',
          password: 'password123'
        });
      
      anotherUserToken = loginResponse.body.data.token;
      
      // 创建另一个用户的费用类型
      const typeResponse = await request(app)
        .post('/api/expense-types')
        .set('Authorization', `Bearer ${anotherUserToken}`)
        .send({
          name: '另一个用户的费用类型',
          description: '这是另一个用户的费用类型'
        });
      
      anotherUserExpenseType = typeResponse.body.data;
    });
    
    // 清理另一个测试用户
    afterAll(async () => {
      const pool = new Pool();
      await pool.query('DELETE FROM expense_types WHERE created_by = $1', [anotherUser.id]);
      await pool.query('DELETE FROM users WHERE id = $1', [anotherUser.id]);
      await pool.end();
    });
    
    it('应该在非创建者尝试更新费用类型时返回403错误', async () => {
      const response = await request(app)
        .put(`/api/expense-types/${anotherUserExpenseType.id}`)
        .set('Authorization', `Bearer ${authToken}`) // 使用第一个用户的令牌
        .send({
          name: '尝试更新的费用类型'
        });
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('只有费用类型创建者可以修改费用类型信息');
    });
    
    it('应该在非创建者尝试删除费用类型时返回403错误', async () => {
      const response = await request(app)
        .delete(`/api/expense-types/${anotherUserExpenseType.id}`)
        .set('Authorization', `Bearer ${authToken}`) // 使用第一个用户的令牌
        .send();
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('只有费用类型创建者可以删除费用类型');
    });
  });
});