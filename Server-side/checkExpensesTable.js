const db = require('./config/db');

// 检查expenses表结构
async function checkExpensesTable() {
  try {
    const query = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'expenses'
      ORDER BY ordinal_position
    `;
    
    const result = await db.query(query);
    console.log('expenses表结构:');
    console.table(result.rows);
    
    // 检查expenses表是否有split_type列
    const hasSplitType = result.rows.some(row => row.column_name === 'split_type');
    console.log('\nexpenses表是否有split_type列:', hasSplitType);
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    process.exit(0);
  }
}

checkExpensesTable();