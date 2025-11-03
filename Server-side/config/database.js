/**
 * 数据库配置
 * 配置数据库连接和相关设置
 */

const { Sequelize } = require('sequelize');
const path = require('path');

// 根据环境变量选择数据库配置
const env = process.env.NODE_ENV || 'development';

// 所有环境配置
const config = {
  development: {
    dialect: 'sqlite',
    storage: path.join(__dirname, '../database.sqlite'),
    logging: console.log,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  test: {
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'room_expense_test_db',
    username: process.env.DB_USER || 'expense_user',
    password: process.env.DB_PASSWORD || 'your_password',
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
    dialect: 'postgres',
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

// 创建Sequelize实例
const sequelize = new Sequelize({
  dialect: config[env].dialect,
  host: config[env].host,
  port: config[env].port,
  database: config[env].database,
  username: config[env].username,
  password: config[env].password,
  storage: config[env].storage,
  logging: config[env].logging,
  pool: config[env].pool,
  define: {
    freezeTableName: true
  }
});

module.exports = sequelize;