const db = require('./config/db');

// 查询expense_splits表的结构
async function checkExpenseSplitsTable() {
  try {
    const query = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'expense_splits'
      ORDER BY ordinal_position
    `;
    
    const result = await db.query(query);
    console.log('expense_splits表结构:');
    console.table(result.rows);
    
    // 查看表中的数据示例
    const dataQuery = 'SELECT * FROM expense_splits LIMIT 5';
    const dataResult = await db.query(dataQuery);
    console.log('\nexpense_splits表中的数据示例:');
    console.table(dataResult.rows);
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    process.exit(0);
  }
}

checkExpenseSplitsTable();