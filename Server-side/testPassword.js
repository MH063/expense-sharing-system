const bcrypt = require('bcrypt');
const { pool } = require('./config/db');

async function testPassword() {
  try {
    const result = await pool.query('SELECT id, username, password_hash FROM users WHERE username = \'user001\'');
    const user = result.rows[0];
    
    console.log('用户信息:', {
      id: user.id,
      username: user.username
    });
    
    // 测试密码
    const testPasswords = ['12345678', 'password', 'user001', 'admin'];
    
    for (const password of testPasswords) {
      const isMatch = await bcrypt.compare(password, user.password_hash);
      console.log(`密码 "${password}" 匹配结果:`, isMatch);
    }
    
    pool.end();
  } catch (error) {
    console.error('测试失败:', error);
    pool.end();
  }
}

testPassword();