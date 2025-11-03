/**
 * Jest测试环境设置
 * 在所有测试开始前初始化测试环境
 */

// 加载测试环境变量
require('dotenv').config({ path: '.env.test' });

// 规范环境变量类型，避免 pg 要求字符串导致的报错
if (process.env.DB_PASSWORD !== undefined) process.env.DB_PASSWORD = String(process.env.DB_PASSWORD);
if (process.env.DB_PORT !== undefined) process.env.DB_PORT = String(process.env.DB_PORT);

// 将 DB_* 同步到 PG* 变量，兼容测试中直接 new Pool()
process.env.PGHOST = process.env.PGHOST || process.env.DB_HOST;
process.env.PGPORT = String(process.env.PGPORT || process.env.DB_PORT || '5432');
process.env.PGUSER = process.env.PGUSER || process.env.DB_USER;
process.env.PGPASSWORD = String(process.env.PGPASSWORD || process.env.DB_PASSWORD || '');
process.env.PGDATABASE = process.env.PGDATABASE || process.env.DB_NAME;

// 预加载 Sequelize 模型并注入到全局，避免测试文件顶部解构 models 为空
const td = require('./test-database');
if (td && td.models) {
  global.models = td.models;
}

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_for_jwt_token_generation';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_key_for_jwt_token_generation';

// 兼容 supertest/superagent 中文路径：自动对包含非 ASCII 的 URL 进行 encodeURI
try {
  const superagent = require('superagent');
  const Request = superagent.Request;
  const origRequest = Request.prototype.request;
  Request.prototype.request = function() {
    if (this.url && /[^\x00-\x7F]/.test(this.url)) {
      this.url = encodeURI(this.url);
    }
    return origRequest.apply(this, arguments);
  };
} catch (e) {
  // 忽略：若 superagent 结构不同则不影响其它测试
}

// 全局测试设置
beforeAll(async () => {
  // 初始化测试数据库
  const { initTestDatabase } = require('./test-database');
  await initTestDatabase();
});

// 可选：每个测试文件前清理数据库（默认关闭，以兼容依赖前置数据的集成测试）
beforeEach(async () => {
  if (process.env.CLEAR_DB_EACH_TEST === 'true') {
    const { clearTestDatabase } = require('./test-database');
    await clearTestDatabase();
  }
});

// 所有测试完成后关闭数据库连接
afterAll(async () => {
  const { closeTestDatabase } = require('./test-database');
  await closeTestDatabase();
});

// 模拟控制台方法，减少测试输出噪音
global.console = {
  ...console,
  // 保留 error 和 warn
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
};