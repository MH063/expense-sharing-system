const bcrypt = require('bcryptjs');
const { pool } = require('./config/db');

async function createAdminUser() {
  try {
    // 检查是否已存在管理员用户
    const checkQuery = 'SELECT id FROM admin_users WHERE username = $1';
    const checkResult = await pool.query(checkQuery, ['admin']);
    
    if (checkResult.rows.length > 0) {
      console.log('管理员用户已存在，跳过创建');
      return;
    }
    
    // 创建管理员用户
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    const query = 'INSERT INTO admin_users (username, password_hash, email, display_name, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id';
    const values = ['admin', hashedPassword, 'admin@example.com', '系统管理员', 'active'];
    const result = await pool.query(query, values);
    console.log('管理员用户创建成功，ID:', result.rows[0].id);
  } catch (error) {
    console.error('创建管理员用户失败:', error.message);
  } finally {
    await pool.end();
  }
}

createAdminUser();