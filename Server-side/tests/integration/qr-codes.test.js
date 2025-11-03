const request = require('supertest');
const path = require('path');
const fs = require('fs');
const app = require('../../server');

async function registerAndLogin(agent) {
  const suffix = Date.now();
  const username = `qr_user_${suffix}`;
  const password = 'testpassword';
  const email = `qr_${suffix}@example.com`;

  await agent.post('/api/auth/register').send({ username, password, email });
  const loginRes = await agent.post('/api/auth/login').send({ username, password });
  return loginRes.body.data.token;
}

describe('QR Codes API', () => {
  let token;

  beforeAll(async () => {
    token = await registerAndLogin(request(app));
  });

  test('should upload and list qr codes', async () => {
    const imgPath = path.join(__dirname, '../fixtures/qr.png');
    if (!fs.existsSync(imgPath)) {
      // 如果没有测试图片，跳过测试
      return;
    }

    const uploadRes = await request(app)
      .post('/api/qr-codes/upload')
      .set('Authorization', `Bearer ${token}`)
      .field('qr_type', 'wechat')
      .attach('qr_image', imgPath);

    expect([200,201]).toContain(uploadRes.statusCode);

    const listRes = await request(app)
      .get('/api/qr-codes')
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.statusCode).toBe(200);
    expect(listRes.body.success).toBe(true);
    expect(Array.isArray(listRes.body.data.qr_codes)).toBe(true);
  });
});
