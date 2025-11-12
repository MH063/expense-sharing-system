const { Client } = require('pg');

async function checkUsers() {
  try {
    const client = new Client({
      host: 'localhost',
      user: 'postgres',
      password: '123456789',
      database: 'expense_dev',
      port: 5432
    });
    
    await client.connect();
    
    // 查询用户及其角色信息
    const result = await client.query(`
      SELECT u.id, u.username, r.name as role 
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      LIMIT 10
    `);
    
    console.log('现有用户:');
    result.rows.forEach(row => {
      console.log(`ID: ${row.id}, 用户名: ${row.username}, 角色: ${row.role || '未分配角色'}`);
    });
    
    await client.end();
  } catch (error) {
    console.error('查询用户失败:', error.message);
  }
}

checkUsers();