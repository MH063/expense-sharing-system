const { pool } = require('./config/db');

async function checkUsersTable() {
  try {
    // 查询users表结构
    const usersSchemaResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('users表结构:');
    usersSchemaResult.rows.forEach(row => {
      console.log(`${row.column_name}: ${row.data_type}`);
    });

    // 查询用户dormleader001的信息
    const userResult = await pool.query('SELECT * FROM users WHERE username = $1', ['dormleader001']);
    
    if (userResult.rows.length > 0) {
      console.log('\n用户dormleader001的信息:');
      console.log(userResult.rows[0]);
    } else {
      console.log('\n未找到用户dormleader001');
    }
  } catch (error) {
    console.error('查询失败:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsersTable();