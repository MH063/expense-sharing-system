/**
 * 确保所有环境的数据库表都已创建的脚本
 * 使用方法: node ensure-all-tables.js [env]
 * env参数: dev, test, prod, all (默认: all)
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 环境配置
const environments = {
  dev: {
    database: 'expense_dev',
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    password: process.env.DB_PASSWORD || '123456789'
  },
  test: {
    database: 'expense_test',
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    password: process.env.DB_PASSWORD || '123456789'
  },
  prod: {
    database: 'expense_prod',
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    password: process.env.DB_PASSWORD || '123456789'
  }
};

/**
 * 检查数据库是否存在，如果不存在则创建
 * @param {Object} config - 数据库配置
 * @param {string} dbName - 数据库名称
 */
async function ensureDatabase(config, dbName) {
  // 先连接到postgres默认数据库来创建目标数据库
  const defaultConfig = { ...config, database: 'postgres' };
  const defaultPool = new Pool(defaultConfig);
  
  try {
    console.log(`检查数据库 ${dbName} 是否存在...`);
    const result = await defaultPool.query(
      `SELECT 1 FROM pg_database WHERE datname = '${dbName}'`
    );
    
    if (result.rows.length === 0) {
      console.log(`数据库 ${dbName} 不存在，正在创建...`);
      await defaultPool.query(`CREATE DATABASE ${dbName} WITH ENCODING 'UTF8'`);
      console.log(`数据库 ${dbName} 创建成功`);
    } else {
      console.log(`数据库 ${dbName} 已存在`);
    }
  } catch (error) {
    console.error(`处理数据库 ${dbName} 时出错:`, error.message);
    throw error;
  } finally {
    await defaultPool.end();
  }
}

/**
 * 执行SQL脚本
 * @param {Object} config - 数据库配置
 * @param {string} sqlPath - SQL脚本路径
 */
async function executeSqlScript(config, sqlPath) {
  const { exec } = require('child_process');
  const { promisify } = require('util');
  const execAsync = promisify(exec);
  
  try {
    console.log(`正在执行SQL脚本: ${sqlPath}`);
    
    // 构建psql命令
    const psqlCmd = `psql -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database} -f "${sqlPath}"`;
    
    // 设置环境变量
    const env = {
      ...process.env,
      PGPASSWORD: config.password
    };
    
    // 执行命令
    const { stdout, stderr } = await execAsync(psqlCmd, { env });
    
    if (stderr && !stderr.includes('NOTICE') && !stderr.includes('INFO')) {
      console.warn(`警告: ${stderr}`);
    }
    
    console.log(`SQL脚本执行成功: ${sqlPath}`);
  } catch (error) {
    console.error(`执行SQL脚本 ${sqlPath} 时出错:`, error.message);
    throw error;
  }
}

/**
 * 确保单个环境的数据库表都已创建
 * @param {string} env - 环境名称 (dev, test, prod)
 */
async function ensureEnvironmentTables(env) {
  const config = environments[env];
  if (!config) {
    throw new Error(`未知的环境: ${env}`);
  }
  
  console.log(`\n===== 开始处理 ${env} 环境 =====`);
  
  try {
    // 确保数据库存在
    await ensureDatabase(config, config.database);
    
    // 执行初始化脚本
    const sqlPath = path.join(__dirname, 'db', 'init_postgres_v18.sql');
    await executeSqlScript(config, sqlPath);
    
    console.log(`===== ${env} 环境处理完成 =====`);
  } catch (error) {
    console.error(`处理 ${env} 环境时出错:`, error.message);
    throw error;
  }
}

/**
 * 主函数
 */
async function main() {
  const targetEnv = process.argv[2] || 'all';
  
  try {
    if (targetEnv === 'all') {
      console.log('开始处理所有环境...');
      for (const env of Object.keys(environments)) {
        await ensureEnvironmentTables(env);
      }
      console.log('\n所有环境处理完成！');
    } else {
      await ensureEnvironmentTables(targetEnv);
      console.log(`\n${targetEnv} 环境处理完成！`);
    }
  } catch (error) {
    console.error('\n处理过程中出错:', error.message);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  ensureEnvironmentTables,
  ensureDatabase,
  executeSqlScript
};