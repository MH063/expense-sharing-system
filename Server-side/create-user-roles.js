const { pool } = require('./config/db');
const fs = require('fs');
const path = require('path');

async function createUserRolesTables() {
  try {
    console.log('开始创建用户角色相关表...');
    
    // 读取SQL脚本
    const sqlPath = path.join(__dirname, 'db', 'user_roles.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // 执行SQL
    await pool.query(sql);
    
    console.log('用户角色相关表创建成功！');
    
    // 验证表是否创建成功
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('user_roles', 'roles')
    `);
    
    console.log('已创建的表:', result.rows.map(row => row.table_name));
    
    // 检查角色数据
    const rolesResult = await pool.query('SELECT name FROM roles WHERE is_system = TRUE');
    console.log('系统角色:', rolesResult.rows.map(row => row.name));
    
  } catch (error) {
    console.error('创建用户角色表失败:', error);
  } finally {
    await pool.end();
  }
}

createUserRolesTables();