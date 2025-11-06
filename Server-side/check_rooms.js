const { Client } = require('pg');

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456789',
  database: process.env.DB_NAME || 'expense_dev'
};

async function checkRooms() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('已连接到数据库');
    
    // 查询房间表
    const result = await client.query('SELECT * FROM rooms LIMIT 5');
    
    if (result.rows.length > 0) {
      console.log('找到房间数据:');
      result.rows.forEach(row => {
        console.log(`ID: ${row.id}, Name: ${row.name || 'N/A'}`);
      });
    } else {
      console.log('未找到房间数据');
      
      // 查询所有表
      const tablesResult = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      
      console.log('数据库中的所有表:');
      tablesResult.rows.forEach(row => {
        console.log(`- ${row.table_name}`);
      });
    }
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await client.end();
  }
}

checkRooms();