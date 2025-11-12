const { pool } = require('./config/db');

async function checkRoles() {
  try {
    const rolesResult = await pool.query('SELECT * FROM roles');
    console.log('现有角色:');
    rolesResult.rows.forEach(role => {
      console.log(`ID: ${role.id}, 名称: ${role.name}, 描述: ${role.description}`);
    });

    console.log('\n用户角色关联:');
    const userRolesResult = await pool.query(`
      SELECT u.id, u.username, r.name as role_name 
      FROM users u 
      JOIN user_roles ur ON u.id = ur.user_id 
      JOIN roles r ON ur.role_id = r.id
    `);
    
    userRolesResult.rows.forEach(userRole => {
      console.log(`用户ID: ${userRole.id}, 用户名: ${userRole.username}, 角色: ${userRole.role_name}`);
    });

    await pool.end();
  } catch (error) {
    console.error('检查角色失败:', error);
  }
}

checkRoles();