module.exports = {
  testEnvironment: 'node',
  // 确保在测试文件加载前就把 .env.test 注入 process.env
  setupFiles: ['<rootDir>/tests/setup/load-env.js'],
  // 然后在测试生命周期中做真实数据库的初始化/清理
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.js'],
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  verbose: true,
  maxWorkers: 1, // 串行，避免连接池竞争
  testTimeout: 30000,
};