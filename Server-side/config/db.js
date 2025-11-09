const { Pool } = require('pg');
const path = require('path');
const { logger } = require('../config/logger');
const fs = require('fs');

// 根据环境变量加载对应的环境配置文件
const env = process.env.NODE_ENV || 'development';

// 确保环境变量加载顺序正确，优先级从高到低：
// 1. .env (本地环境变量，包含真实密码)
// 2. .env.{env} (环境特定配置)
// 3. 系统环境变量

// 首先加载开发环境默认配置
const devEnvPath = path.resolve(__dirname, '../.env.development');
if (fs.existsSync(devEnvPath)) {
  console.log('加载开发环境默认配置:', devEnvPath);
  require('dotenv').config({ path: devEnvPath, override: false });
}

// 然后加载环境特定的配置文件
const envSpecificPath = path.resolve(__dirname, `../.env.${env}`);
if (fs.existsSync(envSpecificPath)) {
  console.log('加载环境特定配置文件:', envSpecificPath);
  // 使用override: false，确保已存在的变量不被覆盖
  require('dotenv').config({ path: envSpecificPath, override: false });
}

// 最后加载本地环境变量文件（具有最高优先级）
const localEnvPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(localEnvPath)) {
  console.log('加载本地环境变量文件:', localEnvPath);
  // 使用override: true，确保本地配置覆盖所有其他配置
  require('dotenv').config({ path: localEnvPath, override: true });
}

// 检查密码是否为占位符，如果是则警告
if (process.env.DB_PASSWORD === 'development_password_placeholder') {
  console.warn('警告: 使用了开发环境占位符密码，请在.env文件中设置真实密码');
}

// PostgreSQL数据库连接配置（仅从环境变量读取，避免默认弱口令）
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD, // 不提供默认值，未设置时由连接抛错或外层校验
  database: process.env.DB_NAME || 'expense_dev',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // 增加到10秒
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true' } : false
};

console.log('数据库配置已加载:', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user,
  database: dbConfig.database,
  passwordSet: !!dbConfig.password
});

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
    logger.error(`PostgreSQL数据库连接失败 (${process.env.NODE_ENV || 'development'} 环境)`, { 
      error: error.message,
      code: error.code,
      detail: error.detail
    });
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