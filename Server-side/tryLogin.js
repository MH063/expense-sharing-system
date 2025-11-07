const { pool } = require('./config/db');
const bcrypt = require('bcryptjs');

async function tryLogin() {
  try {
    const result = await pool.query('SELECT id, username, password_hash FROM users WHERE username = $1', ['WSP']);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('User:', user.username);
      
      // 尝试常见密码
      const commonPasswords = ['123456', 'password', 'admin', 'WSP', '123', '12345678'];
      for (const pwd of commonPasswords) {
        const isValid = await bcrypt.compare(pwd, user.password_hash);
        if (isValid) {
          console.log(`Found valid password: ${pwd}`);
          return pwd;
        }
      }
      
      console.log('No common password matched');
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

tryLogin();