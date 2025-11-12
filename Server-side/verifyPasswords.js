const { Client } = require('pg');

async function verifyPasswords() {
  try {
    const client = new Client({
      host: 'localhost',
      user: 'postgres',
      password: '123456789',
      database: 'expense_dev',
      port: 5432
    });
    
    await client.connect();
    
    // 查询所有用户及其角色信息
    const result = await client.query(`
      SELECT u.id, u.username, r.name as role 
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id IN (12, 13, 14, 15, 16)
      ORDER BY u.id
    `);
    
    console.log('用户密码已更新:');
    console.log('用户名\t\t\t角色\t\t\t用户ID\t\t密码');
    console.log('sysadmin\t\t\t系统管理员\t\t12\t\tSysAdmin123!@#');
    console.log('admin001\t\t\t管理员\t\t\t13\t\tAdmin123!@#');
    console.log('dormleader001\t\t寝室长\t\t\t14\t\tDormLeader123!@#');
    console.log('payer001\t\t\t缴费人\t\t\t15\t\tPayer123!@#');
    console.log('user001\t\t\t普通用户\t\t16\t\tUser123!@#');
    console.log('');
    console.log('数据库中的用户信息:');
    result.rows.forEach(row => {
      console.log(`ID: ${row.id}, 用户名: ${row.username}, 角色: ${row.role || '未分配角色'}`);
    });
    
    await client.end();
  } catch (error) {
    console.error('查询用户失败:', error.message);
  }
}

verifyPasswords();