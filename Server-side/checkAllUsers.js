const { pool } = require('./config/db');

async function checkAllUsers() {
  try {
    const result = await pool.query('SELECT id, username, password_hash FROM users');
    
    console.log('所有用户:');
    for (const user of result.rows) {
      console.log(`ID: ${user.id}, 用户名: ${user.username}, 密码哈希: ${user.password_hash}`);
    }
    
    pool.end();
  } catch (error) {
    console.error('查询失败:', error);
    pool.end();
  }
}

checkAllUsers();