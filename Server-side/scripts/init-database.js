#!/usr/bin/env node

/**
 * 统一数据库初始化脚本
 * 根据环境变量创建相应环境的数据库
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// 获取命令行参数
const args = process.argv.slice(2);
const env = args[0] || process.env.NODE_ENV || 'development';

// 定义环境配置
const envConfigs = {
  development: {
    dbName: 'expense_dev',
    sqlFile: 'create-database-dev.sql',
    envFile: '.env.development'
  },
  test: {
    dbName: 'expense_test',
    sqlFile: 'create-database-test.sql',
    envFile: '.env.test'
  },
  production: {
    dbName: 'expense_prod',
    sqlFile: 'create-database-prod.sql',
    envFile: '.env.production'
  }
};

// 检查环境是否有效
if (!envConfigs[env]) {
  console.error(`错误: 不支持的环境 '${env}'`);
  console.log('支持的环境: development, test, production');
  process.exit(1);
}

const config = envConfigs[env];
const dbSqlPath = path.join(__dirname, '..', 'db', config.sqlFile);

console.log(`初始化 ${env} 环境数据库...`);
console.log(`数据库名称: ${config.dbName}`);
console.log(`SQL脚本: ${dbSqlPath}`);

// 检查SQL文件是否存在
if (!fs.existsSync(dbSqlPath)) {
  console.error(`错误: SQL文件不存在 ${dbSqlPath}`);
  process.exit(1);
}

try {
  // 执行数据库创建脚本
  console.log('执行数据库创建脚本...');
  execSync(`psql -U postgres -f "${dbSqlPath}"`, { stdio: 'inherit' });
  
  console.log('数据库创建完成!');
  
  // 提示下一步操作
  console.log('\n下一步操作:');
  console.log(`1. 请确保 .env 和 ${config.envFile} 文件已正确配置数据库连接信息`);
  console.log(`2. 运行 npm run schema:${env} 命令初始化数据库表结构`);
  
} catch (error) {
  console.error('数据库初始化失败:', error.message);
  process.exit(1);
}