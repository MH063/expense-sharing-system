const { pool } = require('./config/db');

async function verifyAdminUser() {
  try {
    console.log('验证管理员用户...');
    
    // 查询用户信息
    const userQuery = `
      SELECT u.id, u.username, u.email, u.is_active, u.created_at,
             r.name as role_name
      FROM users u 
      LEFT JOIN user_roles ur ON u.id = ur.user_id 
      LEFT JOIN roles r ON ur.role_id = r.id 
      WHERE u.username = 'MH'
    `;
    
    const result = await pool.query(userQuery);
    
    if (result.rows.length === 0) {
      console.log('未找到用户 MH');
      return;
    }
    
    console.log('用户信息:');
    console.log('ID:', result.rows[0].id);
    console.log('用户名:', result.rows[0].username);
    console.log('邮箱:', result.rows[0].email);
    console.log('状态:', result.rows[0].is_active ? '激活' : '未激活');
    console.log('创建时间:', result.rows[0].created_at);
    console.log('角色:', result.rows[0].role_name || '未分配角色');
    
    // 查询所有角色
    const rolesQuery = 'SELECT id, name FROM roles ORDER BY name';
    const rolesResult = await pool.query(rolesQuery);
    console.log('\n系统中的所有角色:');
    rolesResult.rows.forEach(row => {
      console.log(`- ${row.name} (ID: ${row.id})`);
    });
    
  } catch (error) {
    console.error('验证失败:', error.message);
  } finally {
    await pool.end();
  }
}

verifyAdminUser();