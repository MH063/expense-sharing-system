const bcrypt = require('bcryptjs');
const { Client } = require('pg');

// 配置
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456789',
  database: process.env.DB_NAME || 'expense_dev'
};

// 管理员用户信息
const adminUser = {
  username: 'admin',
  email: process.env.ADMIN_EMAIL || 'admin@example.com',
  password: 'Admin123!'
};

async function createAdmin() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('已连接到数据库');
    
    // 生成密码哈希
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(adminUser.password, saltRounds);
    console.log('已生成密码哈希');
    
    // 检查管理员是否存在
    const checkQuery = 'SELECT id FROM users WHERE username = $1';
    const checkResult = await client.query(checkQuery, [adminUser.username]);
    
    if (checkResult.rows.length > 0) {
      // 更新现有管理员密码
      const updateQuery = 'UPDATE users SET password_hash = $1 WHERE username = $2';
      await client.query(updateQuery, [passwordHash, adminUser.username]);
      console.log('管理员密码已更新');
    } else {
      // 创建新管理员
      const insertQuery = 'INSERT INTO users (username, email, password_hash, status) VALUES ($1, $2, $3, $4) RETURNING id';
      const insertResult = await client.query(insertQuery, [adminUser.username, adminUser.email, passwordHash, 'active']);
      const userId = insertResult.rows[0].id;
      
      // 添加到管理员表
      const adminInsertQuery = 'INSERT INTO admins (user_id, username, email, password_hash, status) VALUES ($1, $2, $3, $4, $5)';
      await client.query(adminInsertQuery, [userId, adminUser.username, adminUser.email, passwordHash, 'active']);
      
      console.log('管理员账户已创建');
    }
    
    console.log('管理员用户名:', adminUser.username);
    console.log('管理员密码:', adminUser.password);
  } catch (error) {
    console.error('创建管理员失败:', error);
  } finally {
    await client.end();
  }
}

createAdmin();