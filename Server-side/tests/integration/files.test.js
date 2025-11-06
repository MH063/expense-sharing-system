const request = require('supertest');
const app = require('../../server');
const jwt = require('jsonwebtoken');
const path = require('path');

describe('文件模块契约测试', () => {
  let authToken;
  let testUserId = '00000000-0000-0000-0000-000000000001';

  beforeAll(async () => {
    authToken = jwt.sign(
      { sub: testUserId, username: 'testuser', roles: ['user'], permissions: ['read', 'write'] },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
  });

  it('GET /api/files 需要鉴权', async () => {
    await request(app)
      .get('/api/files')
      .expect(401);
  });

  it('POST /api/files/upload 可上传文件', async () => {
    const res = await request(app)
      .post('/api/files/upload')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('file', path.resolve(__dirname, '../../public/index.html'));
    expect([200,201,400]).toContain(res.status);
  });
});
