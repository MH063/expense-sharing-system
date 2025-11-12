const { Client } = require('pg');

async function checkTableStructure() {
  try {
    const client = new Client({
      host: 'localhost',
      user: 'postgres',
      password: '123456789',
      database: 'expense_dev',
      port: 5432
    });
    
    await client.connect();
    
    // 查询用户表结构
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    console.log('用户表结构:');
    result.rows.forEach(row => {
      console.log(`字段名: ${row.column_name}, 类型: ${row.data_type}`);
    });
    
    await client.end();
  } catch (error) {
    console.error('查询表结构失败:', error.message);
  }
}

checkTableStructure();