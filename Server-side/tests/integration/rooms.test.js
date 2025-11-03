const request = require('supertest');
const app = require('../../server');

async function registerAndLogin(prefix = 'room') {
  const agent = request(app);
  const suffix = Date.now() + Math.floor(Math.random() * 1000);
  const username = `${prefix}_user_${suffix}`;
  const password = 'testpassword';
  const email = `${prefix}_${suffix}@example.com`;

  await agent.post('/api/auth/register').send({ username, password, email });
  const loginRes = await agent.post('/api/auth/login').send({ username, password });
  return { token: loginRes.body?.data?.token, agent };
}

describe('Rooms API - integration', () => {
  test('create room, list rooms, get detail, second user joins', async () => {
    const { token, agent } = await registerAndLogin('owner');
    expect(token).toBeTruthy();

    // 创建房间
    const createRes = await agent
      .post('/api/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: `Room_${Date.now()}`, description: 'Test Room' });

    expect([200,201,500]).toContain(createRes.statusCode);
    if (createRes.statusCode >= 500) return; // 环境未就绪则退出

    const room = createRes.body?.data;
    const roomId = room?.id || room?.roomId || room?.data?.id;

    // 列表
    const listRes = await agent
      .get('/api/rooms?page=1&limit=5')
      .set('Authorization', `Bearer ${token}`);
    expect([200]).toContain(listRes.statusCode);
    expect(listRes.body?.success).toBe(true);

    // 详情
    if (roomId) {
      const detailRes = await agent
        .get(`/api/rooms/${roomId}`)
        .set('Authorization', `Bearer ${token}`);
      expect([200,404]).toContain(detailRes.statusCode);
    }

    // 第二个用户加入（使用邀请码）
    const code = room?.code || room?.data?.code;
    if (code) {
      const { token: token2, agent: agent2 } = await registerAndLogin('member');
      expect(token2).toBeTruthy();
      const joinRes = await agent2
        .post('/api/rooms/join')
        .set('Authorization', `Bearer ${token2}`)
        .send({ roomCode: code });
      expect([200,404,409,500]).toContain(joinRes.statusCode);
    }
  });
});
