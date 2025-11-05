const bcrypt = require('bcryptjs');
const { pool } = require('./config/db');

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    const query = 'INSERT INTO users (username, password_hash, email, display_name, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id';
    const values = ['admin', hashedPassword, 'admin@example.com', '系统管理员', true];
    const result = await pool.query(query, values);
    console.log('管理员用户创建成功，ID:', result.rows[0].id);
  } catch (error) {
    console.error('创建管理员用户失败:', error.message);
  } finally {
    await pool.end();
  }
}

createAdmin();