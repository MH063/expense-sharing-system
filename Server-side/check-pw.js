const { pool } = require('./config/db');
const bcrypt = require('bcryptjs');

async function checkPassword() {
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', ['testuser']);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('用户信息:', { id: user.id, username: user.username, email: user.email });
      
      const isMatch = await bcrypt.compare('testpassword', user.password);
      console.log('密码验证结果:', isMatch ? '正确' : '错误');
    } else {
      console.log('用户不存在');
    }
  } catch (error) {
    console.error('检查密码失败:', error);
  } finally {
    process.exit(0);
  }
}

checkPassword();