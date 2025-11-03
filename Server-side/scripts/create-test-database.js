/**
 * 创建测试数据库
 * 此脚本用于在PostgreSQL中创建测试数据库
 */

const { Client } = require('pg');

async function createTestDatabase() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456789',
    database: 'postgres' // 连接到默认数据库
  });

  try {
    await client.connect();
    console.log('已连接到PostgreSQL服务器');

    // 检查测试数据库是否已存在
    const checkDbQuery = `SELECT 1 FROM pg_database WHERE datname = '${process.env.DB_NAME || 'test_expense_system'}'`;
    const result = await client.query(checkDbQuery);

    if (result.rows.length === 0) {
      // 创建测试数据库
      const createDbQuery = `CREATE DATABASE ${process.env.DB_NAME || 'test_expense_system'}`;
      await client.query(createDbQuery);
      console.log(`测试数据库 ${process.env.DB_NAME || 'test_expense_system'} 创建成功`);
    } else {
      console.log(`测试数据库 ${process.env.DB_NAME || 'test_expense_system'} 已存在`);
    }
  } catch (error) {
    console.error('创建测试数据库失败:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// 如果直接运行此脚本，则执行创建数据库操作
if (require.main === module) {
  createTestDatabase()
    .then(() => {
      console.log('测试数据库初始化完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('测试数据库初始化失败:', error);
      process.exit(1);
    });
}

module.exports = { createTestDatabase };