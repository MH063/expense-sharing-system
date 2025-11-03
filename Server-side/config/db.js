const { Pool } = require('pg');

// 根据环境变量加载对应的环境配置文件
const env = process.env.NODE_ENV || 'development';
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, `../.env.${env}`) });

// PostgreSQL数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: 'postgres', // 强制使用postgres用户
  password: '123456789', // 强制使用这个密码
  database: process.env.DB_NAME || 'test_expense_system',
  max: 20, // 最大连接数
  idleTimeoutMillis: 30000, // 连接空闲超时时间
  connectionTimeoutMillis: 2000, // 连接超时时间
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// 创建PostgreSQL连接池
const pool = new Pool(dbConfig);

// 测试数据库连接
async function testConnection() {
  try {
    // 调试：检查环境变量是否加载
    console.log('数据库配置检查:', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD ? '***' : '未设置'
    });
    
    const client = await pool.connect();
    const result = await client.query('SELECT version()');
    console.log(`PostgreSQL数据库连接成功 (${process.env.NODE_ENV || 'development'} 环境):`, process.env.DB_NAME);
    console.log(`PostgreSQL版本:`, result.rows[0].version);
    client.release();
    return true;
  } catch (error) {
    console.error(`PostgreSQL数据库连接失败 (${process.env.NODE_ENV || 'development'} 环境):`, error.message);
    return false;
  }
}

// 查询函数封装
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('执行查询:', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error('查询错误:', { text, error: error.message });
    throw error;
  }
}

module.exports = {
  pool,
  query,
  testConnection,
  getConfig: () => dbConfig,
};