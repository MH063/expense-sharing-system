const { pool } = require('./config/db');
const bcrypt = require('bcryptjs');

async function resetPassword() {
  try {
    const newPassword = '123456';
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE username = $2 RETURNING id, username',
      [hashedPassword, 'WSP']
    );
    
    console.log('Password reset successfully for user:', result.rows[0]);
    console.log('New password is: 123456');
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

resetPassword();