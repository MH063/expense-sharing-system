const bcrypt = require('bcryptjs');
const { pool } = require('./config/db');

const resetPassword = async () => {
  try {
    const saltRounds = 10;
    const password = '123456';
    const username = 'testuser2';
    
    // 哈希密码
    const hash = await bcrypt.hash(password, saltRounds);
    
    // 更新用户密码
    const query = 'UPDATE users SET password = $1 WHERE username = $2 RETURNING id';
    const values = [hash, username];
    
    const result = await pool.query(query, values);
    if (result.rows.length > 0) {
      console.log('密码重置成功, 用户ID:', result.rows[0].id);
      console.log('用户名:', username);
      console.log('新密码:', password);
    } else {
      console.log('用户不存在:', username);
    }
    process.exit(0);
  } catch (error) {
    console.error('重置密码失败:', error);
    process.exit(1);
  }
};

resetPassword();