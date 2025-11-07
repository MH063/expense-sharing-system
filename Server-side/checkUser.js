const { pool } = require('./config/db');

async function checkUser() {
  try {
    const result = await pool.query('SELECT id, username, display_name FROM users WHERE username = $1', ['WSP']);
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkUser();