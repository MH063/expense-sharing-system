const { pool } = require('./config/db');
const bcrypt = require('bcryptjs');

async function checkPassword() {
  try {
    const result = await pool.query('SELECT id, username, password_hash FROM users WHERE username = $1', ['WSP']);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('User:', user.username);
      console.log('Password hash:', user.password_hash);
      
      // 验证密码
      const isValid = await bcrypt.compare('123456', user.password_hash);
      console.log('Is password "123456" valid?', isValid);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkPassword();