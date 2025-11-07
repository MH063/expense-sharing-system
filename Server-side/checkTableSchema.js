const { pool } = require('./config/db');

async function checkTableSchema() {
  try {
    // 检查expense_splits表结构
    const expenseSplitsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'expense_splits'
      ORDER BY ordinal_position
    `);
    
    console.log('expense_splits表结构:');
    console.log(JSON.stringify(expenseSplitsResult.rows, null, 2));
    
    // 检查bill_splits表结构
    const billSplitsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bill_splits'
      ORDER BY ordinal_position
    `);
    
    console.log('\nbill_splits表结构:');
    console.log(JSON.stringify(billSplitsResult.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkTableSchema();