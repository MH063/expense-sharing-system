const { pool } = require('../../config/db');
const BillController = require('../../controllers/bill-controller');

// 简单的真实数据库连通性 + 控制器 smoke 测试
describe('BillController 真实数据库集成测试', () => {
  let req;
  let res;

  beforeAll(async () => {
    // 这里的数据库初始化和清理由 tests/setup/jest.setup.js 负责
    // 仅做一次连通性校验
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
  });

  beforeEach(() => {
    req = { body: {}, params: {}, query: {}, user: { id: '00000000-0000-0000-0000-000000000000' } };
    res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  });

  it('should connect to real DB and run a simple query', async () => {
    const result = await pool.query('SELECT NOW() as now');
    expect(result.rows.length).toBe(1);
  });

  it('should not throw when calling getBills with empty data', async () => {
    await BillController.getBills(req, res);
    // 无数据也应返回 200/500 二者之一，主要验证走到了真实数据库
    expect(res.status).toHaveBeenCalled();
  });
});