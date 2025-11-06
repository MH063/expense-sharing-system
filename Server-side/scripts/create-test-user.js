const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '.env.production' });

// 创建数据库连接
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'expense_prod',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function createTestUser() {
  try {
    console.log('连接数据库...');
    
    // 生成密码哈希
    const password = 'password123';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // 检查用户是否已存在
    const existingUserResult = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      ['testuser']
    );
    
    if (existingUserResult.rows.length > 0) {
      console.log('测试用户已存在，更新密码...');
      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE username = $2',
        [passwordHash, 'testuser']
      );
      console.log('测试用户密码已更新');
    } else {
      console.log('创建测试用户...');
      // 创建测试用户
      const newUserResult = await pool.query(
        `INSERT INTO users (username, email, password_hash, is_active, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
        ['testuser', 'test@example.com', passwordHash, true]
      );
      
      const userId = newUserResult.rows[0].id;
      console.log(`测试用户创建成功，ID: ${userId}`);
      
      // 检查user_roles表是否存在
      const tableExistsResult = await pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'user_roles'
        )`
      );
      
      const tableExists = tableExistsResult.rows[0].exists;
      
      if (tableExists) {
        // 检查roles表是否存在
        const rolesTableExistsResult = await pool.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'roles'
          )`
        );
        
        const rolesTableExists = rolesTableExistsResult.rows[0].exists;
        
        if (rolesTableExists) {
          // 分配用户角色
          await pool.query(
            `INSERT INTO user_roles (user_id, role_id, created_at, updated_at) 
             VALUES ($1, (SELECT id FROM roles WHERE name = 'user'), NOW(), NOW())`,
            [userId]
          );
          console.log('用户角色分配成功');
        } else {
          console.log('roles表不存在，跳过角色分配');
        }
      } else {
        console.log('user_roles表不存在，跳过角色分配');
      }
    }
    
    console.log('测试用户创建/更新完成');
    console.log('用户名: testuser');
    console.log('密码: password123');
    
  } catch (error) {
    console.error('创建测试用户失败:', error);
  } finally {
    await pool.end();
  }
}

createTestUser();