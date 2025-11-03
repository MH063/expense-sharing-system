const pool = require('./config/database');
const bcrypt = require('bcrypt');

async function checkPassword() {
  try {
    const password = 'password123';
    const hash = bcrypt.hashSync(password, 10);
    console.log('Generated hash:', hash);
    
    const result = await pool.query('SELECT password FROM users WHERE username = $1', ['testuser2']);
    
    if (result.rows.length > 0) {
      console.log('Stored hash:', result.rows[0].password);
      console.log('Password matches:', bcrypt.compareSync(password, result.rows[0].password));
    } else {
      console.log('User not found');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkPassword();