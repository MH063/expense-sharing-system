const { Pool } = require('pg');
const path = require('path');
const { logger } = require('../config/logger');

// 根据环境变量加载对应的环境配置文件
const env = process.env.NODE_ENV || 'development';
require('dotenv').config({ path: path.resolve(__dirname, `../.env.${env}`) });

// PostgreSQL数据库连接配置（仅从环境变量读取，避免默认弱口令）
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD, // 不提供默认值，未设置时由连接抛错或外层校验
  database: process.env.DB_NAME || 'test_expense_system',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' } : false
};

// 创建PostgreSQL连接池
const pool = new Pool(dbConfig);

// 测试数据库连接
async function testConnection() {
  try {
    // 仅在debug级别输出非敏感配置
    logger.debug('数据库配置检查', {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      database: process.env.DB_NAME,
      passwordConfigured: Boolean(process.env.DB_PASSWORD)
    });

    const client = await pool.connect();
    const result = await client.query('SELECT version()');
    logger.info(`PostgreSQL数据库连接成功 (${process.env.NODE_ENV || 'development'} 环境)`, { db: process.env.DB_NAME });
    logger.debug('PostgreSQL版本', { version: result.rows[0].version });
    client.release();
    return true;
  } catch (error) {
    logger.error(`PostgreSQL数据库连接失败 (${process.env.NODE_ENV || 'development'} 环境)`, { error: error.message });
    return false;
  }
}

// 查询函数封装
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    const slowMs = Number(process.env.DB_SLOW_QUERY_MS || 500);
    const level = duration >= slowMs ? 'warn' : 'debug';
    logger[level]('执行查询完成', { durationMs: duration, rowCount: result.rowCount });
    return result;
  } catch (error) {
    logger.error('查询错误', { error: error.message });
    throw error;
  }
}

async function ensureMfaColumns() {
  try {
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret TEXT');
    await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE');
    logger.info('MFA 列检查/创建完成');
  } catch (e) {
    logger.error('MFA 列创建失败', { error: e.message });
    throw e;
  }
}

module.exports = {
  pool,
  query,
  testConnection,
  ensureMfaColumns,
  getConfig: () => dbConfig
};