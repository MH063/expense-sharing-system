const { pool } = require('./config/db');

async function checkUser() {
  try {
    const result = await pool.query('SELECT id, username, password FROM users WHERE username = $1', ['testuser']);
    console.log('用户数据:', JSON.stringify(result.rows, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('查询失败:', error);
    process.exit(1);
  }
}

checkUser();