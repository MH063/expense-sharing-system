const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

/**
 * 创建离寝记录表和修改现有表结构
 * 用于支持按在寝天数分摊算法
 */
async function setupLeaveRecordsTables() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 读取并执行创建离寝记录表的SQL
    const leaveRecordsSQL = fs.readFileSync(
      path.join(__dirname, 'create_leave_records_table.sql'), 
      'utf8'
    );
    await client.query(leaveRecordsSQL);
    console.log('离寝记录表创建成功');
    
    // 读取并执行修改费用表的SQL
    const alterExpensesSQL = fs.readFileSync(
      path.join(__dirname, 'alter_expenses_table.sql'), 
      'utf8'
    );
    await client.query(alterExpensesSQL);
    console.log('费用表结构修改成功');
    
    // 读取并执行修改费用分摊表的SQL
    const alterExpenseSplitsSQL = fs.readFileSync(
      path.join(__dirname, 'alter_expense_splits_table.sql'), 
      'utf8'
    );
    await client.query(alterExpenseSplitsSQL);
    console.log('费用分摊表结构修改成功');
    
    await client.query('COMMIT');
    console.log('所有表结构更新成功');
    
    return { success: true, message: '表结构更新成功' };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('表结构更新失败:', error);
    return { success: false, message: error.message };
  } finally {
    client.release();
  }
}

// 如果直接运行此脚本，则执行表结构更新
if (require.main === module) {
  setupLeaveRecordsTables()
    .then(result => {
      console.log(result);
      process.exit(0);
    })
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { setupLeaveRecordsTables };