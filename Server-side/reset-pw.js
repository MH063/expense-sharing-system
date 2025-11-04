const { pool } = require('./config/db');
const bcrypt = require('bcryptjs');

async function resetPassword() {
  try {
    const hashedPassword = await bcrypt.hash('testpassword', 10);
    
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE username = $2 RETURNING id, username',
      [hashedPassword, 'testuser']
    );
    
    if (result.rows.length > 0) {
      console.log('密码重置成功:', result.rows[0]);
    } else {
      console.log('用户不存在');
    }
  } catch (error) {
    console.error('重置密码失败:', error);
  } finally {
    process.exit(0);
  }
}

resetPassword();