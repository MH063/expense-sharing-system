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
      max: 20,      // 增加最大连接数，支持更多并发请求
      min: 2,       // 保持最小连接数，避免频繁建立连接
      acquire: 60000, // 增加获取连接的超时时间到60秒
      idle: 30000,   // 增加空闲连接超时时间为30秒
      evict: 5000,   // 添加连接回收检查间隔
      handleDisconnects: true // 自动处理连接断开
    }
  }
);

module.exports = sequelize;
