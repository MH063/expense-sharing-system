/**
 * 数据库配置
 * 配置数据库连接和相关设置
 */

const { Sequelize } = require('sequelize');
const path = require('path');
const { getDatabasePassword } = require('../utils/password-input');

// 根据环境变量选择数据库配置
const env = process.env.NODE_ENV || 'development';

// 确保环境变量已加载
const envPath = path.resolve(__dirname, '../.env.development');
console.log('尝试加载环境变量文件:', envPath);
require('dotenv').config({ path: envPath });

// 再次确保环境变量已加载
const envPath2 = path.resolve(__dirname, `../.env.${env}`);
console.log('尝试加载环境变量文件:', envPath2);
require('dotenv').config({ path: envPath2 });

// 所有环境配置
const config = {
  development: {
    dialect: process.env.DB_DIALECT || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'test_expense_system',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456789',
    storage: process.env.DB_STORAGE || undefined,
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      freezeTableName: true
    }
  },
  test: {
    dialect: process.env.DB_DIALECT || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'expense_test',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456789',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      freezeTableName: true
    }
  },
  production: {
    dialect: process.env.DB_DIALECT || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'room_expense_db',
    username: process.env.DB_USER || 'expense_user',
    password: process.env.DB_PASSWORD || 'your_password',
    logging: false,
    pool: {
      max: 20,
      min: 5,
      acquire: 30000,
      idle: 10000
    },
    define: {
      freezeTableName: true
    }
  }
};

// 创建Sequelize实例 - 使用异步函数获取密码
async function createSequelizeInstance() {
  // 获取数据库密码
  const dbPassword = await getDatabasePassword();
  
  // 添加调试信息
  console.log('当前环境:', env);
  console.log('环境变量:', {
    DB_DIALECT: process.env.DB_DIALECT,
    DB_STORAGE: process.env.DB_STORAGE,
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: dbPassword ? '已设置' : '未设置'
  });

  // 确保配置存在
  const dbConfig = config[env] || config.development;
  
  // 创建Sequelize实例
  const sequelize = new Sequelize({
    dialect: dbConfig.dialect,
    host: dbConfig.host,
    port: dbConfig.port,
    database: dbConfig.database,
    username: dbConfig.username,
    password: dbPassword, // 使用从安全输入获取的密码
    storage: dbConfig.storage,
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    define: {
      freezeTableName: true
    },
    dialectOptions: {
      // 添加SSL选项
      ssl: process.env.DB_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true'
      } : false
    }
  });
  
  return sequelize;
}

// 导出异步函数和同步实例（向后兼容）
const sequelize = createSequelizeInstance();
module.exports = sequelize;
module.exports.createSequelizeInstance = createSequelizeInstance;