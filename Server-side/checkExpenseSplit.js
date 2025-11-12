const { pool } = require('./config/db');

async function checkExpenseSplit() {
  try {
    // 查询费用记录6的详情
    const expenseResult = await pool.query(
      'SELECT * FROM expenses WHERE id = 6'
    );
    
    console.log('费用记录6的详情:');
    console.log(expenseResult.rows[0]);

    // 查询费用记录6的分摊记录
    const splitResult = await pool.query(
      'SELECT * FROM expense_splits WHERE expense_id = 6'
    );
    
    console.log('\n费用记录6的分摊记录:');
    splitResult.rows.forEach(row => {
      console.log(row);
    });

    // 查询寝室6的所有成员
    const roomMembersResult = await pool.query(
      'SELECT rm.*, u.username, u.name FROM room_members rm JOIN users u ON rm.user_id = u.id WHERE rm.room_id = 6'
    );
    
    console.log('\n寝室6的所有成员:');
    roomMembersResult.rows.forEach(row => {
      console.log(row);
    });
  } catch (error) {
    console.error('查询失败:', error.message);
  } finally {
    await pool.end();
  }
}

checkExpenseSplit();