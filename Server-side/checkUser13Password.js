const { pool } = require('./config/db');
const bcrypt = require('bcrypt');

async function checkUser13Password() {
  try {
    // 查询用户user001的密码哈希
    const userResult = await pool.query('SELECT id, username, password_hash FROM users WHERE username = $1', ['user001']);
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log(`用户ID: ${user.id}, 用户名: ${user.username}`);
      console.log(`密码哈希: ${user.password_hash}`);
      
      // 验证密码
      const isMatch = await bcrypt.compare('password123', user.password_hash);
      console.log(`密码'password123'匹配: ${isMatch}`);
      
      // 如果不匹配，更新密码
      if (!isMatch) {
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash('password123', saltRounds);
        await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, user.id]);
        console.log('密码已更新为password123的哈希值');
      }
    } else {
      console.log('未找到用户user001');
    }
  } catch (error) {
    console.error('查询失败:', error.message);
  } finally {
    await pool.end();
  }
}

checkUser13Password();