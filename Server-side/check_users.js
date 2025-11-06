const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: '5432',
  user: 'postgres',
  database: 'expense_dev',
  password: '123456789'
});

async function checkUsers() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT id, username, email, password_hash FROM users LIMIT 5');
    console.log('Users in database:');
    result.rows.forEach(row => {
      console.log('ID: ' + row.id + ', Username: ' + row.username + ', Email: ' + row.email + ', Password hash: ' + row.password_hash);
    });
  } finally {
    client.release();
    await pool.end();
  }
}

checkUsers().catch(console.error);