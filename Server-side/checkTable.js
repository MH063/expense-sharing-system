const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'expense_dev'
});

async function checkTableStructure() {
  try {
    // 检查expense_splits表结构
    const splitsResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'expense_splits'
      ORDER BY ordinal_position
    `);
    
    console.log('expense_splits表结构:');
    splitsResult.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type}`);
    });
    
    // 检查expenses表结构
    const expensesResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'expenses'
      ORDER BY ordinal_position
    `);
    
    console.log('\nexpenses表结构:');
    expensesResult.rows.forEach(row => {
      console.log(`- ${row.column_name}: ${row.data_type}`);
    });
    
    await pool.end();
  } catch (error) {
    console.error('查询表结构失败:', error.message);
  }
}

checkTableStructure();