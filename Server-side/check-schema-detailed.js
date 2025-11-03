const pool = require('./config/database');

async function checkSchema() {
  try {
    // 检查rooms表结构
    console.log('=== rooms表结构 ===');
    const roomsSchema = await pool.query("PRAGMA table_info(rooms)");
    console.log('原始结果:', JSON.stringify(roomsSchema, null, 2));

    // 检查expense_types表结构
    console.log('\n=== expense_types表结构 ===');
    const expenseTypesSchema = await pool.query("PRAGMA table_info(expense_types)");
    console.log('原始结果:', JSON.stringify(expenseTypesSchema, null, 2));

  } catch (error) {
    console.error('检查表结构失败:', error);
  }
}

checkSchema();