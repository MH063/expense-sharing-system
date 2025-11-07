const { pool } = require('./config/db');

async function checkBillsTableSchema() {
  try {
    // 检查bills表结构
    const billsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bills'
      ORDER BY ordinal_position
    `);
    
    console.log('bills表结构:');
    console.log(JSON.stringify(billsResult.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkBillsTableSchema();