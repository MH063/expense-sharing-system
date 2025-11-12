const { pool } = require('./config/db');
const bcrypt = require('bcrypt');

async function updateAllPasswords() {
  try {
    // 获取所有用户
    const usersResult = await pool.query('SELECT id, username FROM users');
    const users = usersResult.rows;
    
    console.log('开始更新所有用户密码...');
    
    for (const user of users) {
      // 生成新的密码哈希
      const newPassword = 'password123';
      const newHash = await bcrypt.hash(newPassword, 10);
      
      // 更新密码
      await pool.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [newHash, user.id]
      );
      
      console.log(`已更新用户 ${user.username} 的密码`);
    }
    
    console.log('所有用户密码更新完成');
    
    await pool.end();
  } catch (error) {
    console.error('更新密码失败:', error);
  }
}

updateAllPasswords();