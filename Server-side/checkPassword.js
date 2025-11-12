const { pool } = require('./config/db');
const bcrypt = require('bcrypt');

async function checkPassword() {
  try {
    // 获取sysadmin用户的密码哈希
    const userResult = await pool.query(
      'SELECT username, password_hash FROM users WHERE username = $1',
      ['sysadmin']
    );
    
    if (userResult.rows.length === 0) {
      console.log('用户sysadmin不存在');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`用户: ${user.username}`);
    console.log(`密码哈希: ${user.password_hash.substring(0, 20)}...`);
    
    // 验证密码
    const testPassword = 'password123';
    const isValid = await bcrypt.compare(testPassword, user.password_hash);
    console.log(`密码"${testPassword}"验证结果: ${isValid ? '正确' : '错误'}`);
    
    // 生成新的密码哈希
    const newHash = await bcrypt.hash(testPassword, 10);
    console.log(`新的密码哈希: ${newHash}`);
    
    // 更新密码
    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2',
      [newHash, 'sysadmin']
    );
    console.log('密码已更新');
    
    await pool.end();
  } catch (error) {
    console.error('检查密码失败:', error);
  }
}

checkPassword();