/**
 * Jest测试环境设置
 * 在所有测试开始前初始化测试环境
 */

// 加载测试环境变量
require('dotenv').config({ path: '.env.test' });

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_for_jwt_token_generation';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_key_for_jwt_token_generation';

// 全局测试设置
beforeAll(async () => {
  // 初始化测试数据库
  const { initTestDatabase } = require('./test-database');
  await initTestDatabase();
});

// 每个测试文件执行前清理数据库
beforeEach(async () => {
  const { clearTestDatabase } = require('./test-database');
  await clearTestDatabase();
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