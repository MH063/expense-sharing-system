const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: '5432',
  user: 'postgres',
  database: 'expense_dev',
  password: '123456789'
});

async function checkTableSchema() {
  const client = await pool.connect();
  try {
    const query = 'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1';
    const result = await client.query(query, ['users']);
    console.log('Users table schema:');
    result.rows.forEach(row => {
      console.log('Column: ' + row.column_name + ', Type: ' + row.data_type);
    });
  } finally {
    client.release();
    await pool.end();
  }
}

checkTableSchema().catch(console.error);