/**
 * 统一的测试数据库设置
 * 使用与生产环境一致的模型定义
 */

const path = require('path');
const { Sequelize } = require('sequelize');

// 确保环境变量已加载
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.test') });

// 导入统一的模型定义
const db = require('../../models/unified-models');

// 测试数据库配置
const testConfig = {
  username: process.env.DB_USER || 'test',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'test_expense_system',
  host: process.env.DB_HOST || 'localhost',
  dialect: process.env.DB_DIALECT || 'sqlite',
  storage: process.env.DB_STORAGE || './database.test.sqlite',
  logging: false
};

// 创建测试数据库Sequelize实例
const testSequelize = new Sequelize(
  testConfig.database,
  testConfig.username,
  testConfig.password,
  {
    host: testConfig.host,
    dialect: testConfig.dialect,
    storage: testConfig.storage,
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// 创建测试模型对象
const testModels = {};

// 使用统一模型定义创建测试模型
const { sequelize: mainSequelize, ...modelDefinitions } = require('../../models/unified-models');

// 提取模型定义
const getModelDefinition = (model) => {
  return {
    modelName: model.name,
    attributes: model.rawAttributes,
    options: {
      ...model.options,
      sequelize: testSequelize
    }
  };
};

// 为每个模型创建测试版本
Object.keys(modelDefinitions).forEach(key => {
  if (key !== 'sequelize' && key !== 'Sequelize') {
    const model = modelDefinitions[key];
    const definition = getModelDefinition(model);
    testModels[key] = testSequelize.define(definition.modelName, definition.attributes, definition.options);
  }
});

// 设置模型关联关系
setupAssociations();

// 初始化测试数据库
const initTestDatabase = async () => {
  try {
    // 同步数据库
    await testSequelize.sync({ force: true });
    
    // 插入基础测试数据
    await insertSeedData();
    
    console.log('测试数据库初始化成功');
    return testModels;
  } catch (error) {
    console.error('测试数据库初始化失败:', error);
    throw error;
  }
};

// 插入基础测试数据
const insertSeedData = async () => {
  const { ExpenseType } = testModels;
  
  // 插入费用类型
  await ExpenseType.bulkCreate([
    { name: '餐饮', description: '餐饮相关费用', icon: 'food', color: '#FF6B6B', is_system: true },
    { name: '交通', description: '交通相关费用', icon: 'transport', color: '#4ECDC4', is_system: true },
    { name: '住宿', description: '住宿相关费用', icon: 'hotel', color: '#45B7D1', is_system: true },
    { name: '娱乐', description: '娱乐相关费用', icon: 'entertainment', color: '#96CEB4', is_system: true },
    { name: '购物', description: '购物相关费用', icon: 'shopping', color: '#FFEAA7', is_system: true },
    { name: '其他', description: '其他费用', icon: 'other', color: '#DDA0DD', is_system: true }
  ]);
};

// 清理测试数据库
const clearTestDatabase = async () => {
  try {
    await testSequelize.sync({ force: true });
    await insertSeedData();
    console.log('测试数据库清理完成');
  } catch (error) {
    console.error('测试数据库清理失败:', error);
    throw error;
  }
};

// 关闭测试数据库连接
const closeTestDatabase = async () => {
  try {
    await testSequelize.close();
    console.log('测试数据库连接已关闭');
  } catch (error) {
    console.error('关闭测试数据库连接失败:', error);
  }
};

// 导出测试模型和函数
module.exports = {
  initTestDatabase,
  clearTestDatabase,
  closeTestDatabase,
  models: testModels,
  sequelize: testSequelize
};