const { Pool } = require('pg');
require('dotenv').config({ path: '.env.development' });

// 创建数据库连接池
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'test_expense_system',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456789',
});

async function checkAndFixUserRole() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 检查用户WSP是否存在
    const userResult = await client.query(
      'SELECT id, username FROM users WHERE username = $1',
      ['WSP']
    );
    
    if (userResult.rows.length === 0) {
      console.log('用户WSP不存在');
      return;
    }
    
    const user = userResult.rows[0];
    console.log('找到用户:', user);
    
    // 检查admin角色是否存在
    const roleResult = await client.query(
      'SELECT id, name FROM roles WHERE name = $1',
      ['admin']
    );
    
    if (roleResult.rows.length === 0) {
      console.log('admin角色不存在，正在创建...');
      
      // 创建admin角色
      const newRoleResult = await client.query(
        'INSERT INTO roles (name, description) VALUES ($1, $2) RETURNING id',
        ['admin', '系统管理员']
      );
      
      const adminRoleId = newRoleResult.rows[0].id;
      console.log('admin角色创建成功，ID:', adminRoleId);
      
      // 为用户分配admin角色
      await client.query(
        'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
        [user.id, adminRoleId]
      );
      
      console.log('已为用户WSP分配admin角色');
    } else {
      const adminRole = roleResult.rows[0];
      console.log('找到admin角色:', adminRole);
      
      // 检查用户是否已有admin角色
      const userRoleResult = await client.query(
        'SELECT * FROM user_roles WHERE user_id = $1 AND role_id = $2',
        [user.id, adminRole.id]
      );
      
      if (userRoleResult.rows.length === 0) {
        console.log('用户WSP没有admin角色，正在分配...');
        
        // 为用户分配admin角色
        await client.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
          [user.id, adminRole.id]
        );
        
        console.log('已为用户WSP分配admin角色');
      } else {
        console.log('用户WSP已有admin角色');
      }
    }
    
    await client.query('COMMIT');
    
    // 验证结果
    const verifyResult = await client.query(
      `SELECT u.username, r.name as role 
       FROM users u 
       JOIN user_roles ur ON u.id = ur.user_id 
       JOIN roles r ON ur.role_id = r.id 
       WHERE u.username = 'WSP'`
    );
    
    console.log('验证结果:', verifyResult.rows);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('操作失败:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkAndFixUserRole();