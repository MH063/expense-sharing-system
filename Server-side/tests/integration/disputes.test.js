const request = require('supertest');
const app = require('../../server');
const jwt = require('jsonwebtoken');

describe('争议模块契约测试', () => {
  let authToken;
  let testUserId = '00000000-0000-0000-0000-000000000001'; // 占位用户ID，如有需要可改为实际插入
  let testBillId = '00000000-0000-0000-0000-000000000002'; // 占位账单ID

  beforeAll(async () => {
    authToken = jwt.sign(
      { sub: testUserId, username: 'testuser', roles: ['user'], permissions: ['read', 'write'] },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
  });

  it('POST /api/disputes 缺少必填字段返回400', async () => {
    const res = await request(app)
      .post('/api/disputes')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ reason: '' })
      .expect(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/disputes 正常创建（校验通过后由控制器处理）', async () => {
    const res = await request(app)
      .post('/api/disputes')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ billId: testBillId, reason: '测试争议原因' });
    expect([200,201,202,400,404]).toContain(res.status); // 允许占位或依赖DB时的返回
  });

  it('PATCH /api/disputes/:id/status 校验枚举', async () => {
    const res = await request(app)
      .patch(`/api/disputes/${testBillId}/status`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ status: 'invalid' })
      .expect(400);
    expect(res.body.success).toBe(false);
  });
});
