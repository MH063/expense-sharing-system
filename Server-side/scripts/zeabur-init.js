// Zeabur部署初始化脚本
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
  console.log('开始初始化Zeabur数据库...');
  
  // 使用Zeabur环境变量
  const dbConfig = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'postgres', // 连接到默认数据库创建新数据库
    ssl: { rejectUnauthorized: false }
  };

  try {
    const pool = new Pool(dbConfig);
    
    // 检查数据库是否存在
    const dbExists = await pool.query(`
      SELECT 1 FROM pg_database WHERE datname = '${process.env.DB_NAME}'
    `);
    
    if (dbExists.rows.length === 0) {
      console.log('创建数据库:', process.env.DB_NAME);
      await pool.query(`CREATE DATABASE ${process.env.DB_NAME}`);
    }
    
    await pool.end();
    
    // 连接到新数据库执行初始化脚本
    const targetDbConfig = {
      ...dbConfig,
      database: process.env.DB_NAME
    };
    
    const targetPool = new Pool(targetDbConfig);
    
    // 读取并执行SQL脚本
    const sqlScript = fs.readFileSync(
      path.join(__dirname, 'init-prod-database.sql'), 
      'utf8'
    );
    
    console.log('执行数据库初始化脚本...');
    await targetPool.query(sqlScript);
    
    await targetPool.end();
    console.log('数据库初始化完成!');
    
  } catch (error) {
    console.error('数据库初始化失败:', error);
    process.exit(1);
  }
}

// 如果是直接运行此脚本
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };