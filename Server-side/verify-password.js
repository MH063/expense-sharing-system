const bcrypt = require('bcryptjs');
const { pool } = require('./config/db');

async function verifyPassword() {
  try {
    const result = await pool.query('SELECT username, password FROM users WHERE username = $1', ['testuser']);
    if (result.rows.length === 0) {
      console.log('用户不存在');
      process.exit(1);
    }
    
    const user = result.rows[0];
    const password = '123456';
    
    console.log('用户名:', user.username);
    console.log('密码哈希:', user.password);
    
    const isValid = await bcrypt.compare(password, user.password);
    console.log('密码验证结果:', isValid);
    
    process.exit(0);
  } catch (error) {
    console.error('验证失败:', error);
    process.exit(1);
  }
}

verifyPassword();