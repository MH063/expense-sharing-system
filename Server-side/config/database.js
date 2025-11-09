/**
 * 数据库Sequelize配置
 * 为ORM模型提供Sequelize实例
 */

const { Sequelize } = require('sequelize');
const path = require('path');

// 确保环境变量已加载
const env = process.env.NODE_ENV || 'development';
require('dotenv').config({ path: path.resolve(__dirname, `../.env.${env}`) });

// 创建Sequelize实例
const sequelize = new Sequelize(
  process.env.DB_NAME || 'expense_dev',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'postgres',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

module.exports = sequelize;
