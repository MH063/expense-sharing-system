const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function updateSysadminPassword() {
  try {
    const client = new Client({
      host: 'localhost',
      user: 'postgres',
      password: '123456789',
      database: 'expense_dev',
      port: 5432
    });
    
    await client.connect();
    
    // 生成密码哈希
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash('SysAdmin123!@#', saltRounds);
    
    // 更新密码
    const updateResult = await client.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [hashedPassword, 12]
    );
    
    if (updateResult.rowCount > 0) {
      console.log('✅ 用户 sysadmin (ID: 12) 密码已更新为: SysAdmin123!@#');
    } else {
      console.log('❌ 更新失败');
    }
    
    await client.end();
  } catch (error) {
    console.error('更新密码失败:', error.message);
  }
}

updateSysadminPassword();