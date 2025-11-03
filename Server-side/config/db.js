const { Pool } = require('pg');
const { Sequelize } = require('sequelize');
const path = require('path');

// 根据环境变量加载对应的环境配置文件
const env = process.env.NODE_ENV || 'development';
require('dotenv').config({ path: path.resolve(__dirname, `../.env.${env}`) });

// 检查是否使用SQLite
const isSQLite = process.env.DB_DIALECT === 'sqlite';

if (isSQLite) {
  // SQLite配置
  const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: process.env.DB_STORAGE || './database.sqlite',
    logging: false
  });
  
  // 为SQLite创建一个模拟的查询函数
  async function query(text, params) {
    try {
      const result = await sequelize.query(text, {
        replacements: params,
        type: Sequelize.QueryTypes.RAW
      });
      console.log('执行查询:', { text, rows: Array.isArray(result) ? result[0].length : 0 });
      return Array.isArray(result) ? result[0] : result;
    } catch (error) {
      console.error('查询错误:', { text, error: error.message });
      throw error;
    }
  }
  
  // 模拟连接池对象
  const pool = {
    query: query,
    connect: async () => ({
      query: async (text, params) => await query(text, params),
      release: () => {}
    }),
    end: async () => {}
  };
  
  module.exports = {
    pool,
    query,
    testConnection: async () => {
      try {
        await sequelize.authenticate();
        console.log('SQLite数据库连接成功');
        return true;
      } catch (error) {
        console.error('SQLite数据库连接失败:', error.message);
        return false;
      }
    },
    getConfig: () => ({
      dialect: 'sqlite',
      storage: process.env.DB_STORAGE || './database.sqlite'
    })
  };
} else {
  // PostgreSQL数据库连接配置
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres', // 使用环境变量中的用户
    password: process.env.DB_PASSWORD || '123456789', // 使用环境变量中的密码
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
}