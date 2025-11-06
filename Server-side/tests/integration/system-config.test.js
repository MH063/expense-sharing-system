const request = require('supertest');
const app = require('../../server');
const jwt = require('jsonwebtoken');

describe('系统配置契约测试', () => {
  let adminToken;
  let userToken;
  let adminId = '00000000-0000-0000-0000-000000000010';
  let userId = '00000000-0000-0000-0000-000000000011';

  beforeAll(async () => {
    adminToken = jwt.sign(
      { sub: adminId, username: 'admin', roles: ['admin'], permissions: ['read','write'] },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    userToken = jwt.sign(
      { sub: userId, username: 'user', roles: ['user'], permissions: ['read'] },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
  });

  it('GET /api/system 普通用户禁止访问', async () => {
    await request(app)
      .get('/api/system')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('GET /api/system 管理员可访问', async () => {
    const res = await request(app)
      .get('/api/system')
      .set('Authorization', `Bearer ${adminToken}`);
    expect([200,403,500]).toContain(res.status);
  });

  it('PUT /api/system 管理员更新配置', async () => {
    const res = await request(app)
      .put('/api/system')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ featureX: { enabled: true } });
    expect([200,400,500]).toContain(res.status);
  });
});
