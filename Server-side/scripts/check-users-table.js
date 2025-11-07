const { pool } = require('../config/db');

async function checkUsersTable() {
  try {
    // 查询users表结构
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('Users表结构:');
    console.log('列名\t\t\t数据类型\t\t可空');
    console.log('------------------------------------------------');
    result.rows.forEach(row => {
      console.log(`${row.column_name}\t\t\t${row.data_type}\t\t${row.is_nullable}`);
    });
    
    // 查询一条示例数据
    const sampleResult = await pool.query('SELECT * FROM users LIMIT 1');
    console.log('\n示例数据:');
    console.log(sampleResult.rows[0]);
    
  } catch (error) {
    console.error('检查表结构时出错:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsersTable();