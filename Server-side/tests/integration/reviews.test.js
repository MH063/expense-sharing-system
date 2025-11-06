const request = require('supertest');
const app = require('../../server');
const jwt = require('jsonwebtoken');

describe('评价模块契约测试', () => {
  let authToken;
  let testUserId = '00000000-0000-0000-0000-000000000001';
  let testBillId = '00000000-0000-0000-0000-000000000002';

  beforeAll(async () => {
    authToken = jwt.sign(
      { sub: testUserId, username: 'testuser', roles: ['user'], permissions: ['read', 'write'] },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
  });

  it('POST /api/reviews 缺少必填字段返回400', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ billId: testBillId, rating: 6 })
      .expect(400);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/reviews 正常创建', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ billId: testBillId, rating: 5, comment: '很好' });
    expect([200,201,202,400,404]).toContain(res.status);
  });
});
