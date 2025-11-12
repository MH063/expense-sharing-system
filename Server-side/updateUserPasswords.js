const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function updatePasswords() {
  try {
    const client = new Client({
      host: 'localhost',
      user: 'postgres',
      password: '123456789',
      database: 'expense_dev',
      port: 5432
    });
    
    await client.connect();
    
    // 用户密码映射
    const userPasswords = [
      { id: 12, username: 'sysadmin', password: 'SysAdmin123!@#' },
      { id: 13, username: 'admin001', password: 'Admin123!@#' },
      { id: 14, username: 'dormleader001', password: 'DormLeader123!@#' },
      { id: 15, username: 'payer001', password: 'Payer123!@#' },
      { id: 16, username: 'user001', password: 'User123!@#' }
    ];
    
    console.log('开始更新用户密码...');
    
    for (const user of userPasswords) {
      // 生成密码哈希
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(user.password, saltRounds);
      
      // 更新密码
      const updateResult = await client.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [hashedPassword, user.id]
      );
      
      if (updateResult.rowCount > 0) {
        console.log(`✅ 用户 ${user.username} (ID: ${user.id}) 密码已更新为: ${user.password}`);
      } else {
        console.log(`❌ 未找到用户 ${user.username} (ID: ${user.id})`);
      }
    }
    
    console.log('密码更新完成！');
    
    await client.end();
  } catch (error) {
    console.error('更新密码失败:', error.message);
  }
}

updatePasswords();