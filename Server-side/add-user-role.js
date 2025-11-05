const { pool } = require('./config/db');

async function addUserRole() {
  try {
    const userId = '5534ca6d-c787-41a8-bfd4-a98af0fe14eb';
    
    // 获取user角色的ID
    const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', ['user']);
    
    if (roleResult.rows.length === 0) {
      console.error('未找到user角色');
      return;
    }
    
    const roleId = roleResult.rows[0].id;
    
    // 检查用户是否已有角色
    const existingRoleResult = await pool.query('SELECT user_id FROM user_roles WHERE user_id = $1', [userId]);
    
    if (existingRoleResult.rows.length > 0) {
      // 更新现有角色
      await pool.query(
        'UPDATE user_roles SET role_id = $1, assigned_at = NOW() WHERE user_id = $2',
        [roleId, userId]
      );
      console.log('更新用户角色成功');
    } else {
      // 插入新角色
      await pool.query(
        'INSERT INTO user_roles (user_id, role_id, assigned_at, assigned_by) VALUES ($1, $2, NOW(), $1)',
        [userId, roleId]
      );
      console.log('添加用户角色成功');
    }
    
    // 验证角色是否添加成功
    const verifyResult = await pool.query(
      'SELECT u.username, r.name as role_name FROM users u JOIN user_roles ur ON u.id = ur.user_id JOIN roles r ON ur.role_id = r.id WHERE u.id = $1',
      [userId]
    );
    
    console.log('用户角色信息:', verifyResult.rows);
    
  } catch (error) {
    console.error('添加用户角色失败:', error);
  } finally {
    await pool.end();
  }
}

addUserRole();