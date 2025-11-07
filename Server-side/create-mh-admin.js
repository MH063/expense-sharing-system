const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { pool } = require('./config/db');

async function createAdminUser() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 检查是否已存在该用户名
    const checkUserQuery = 'SELECT id FROM users WHERE username = $1';
    const checkUserResult = await client.query(checkUserQuery, ['MH']);
    
    if (checkUserResult.rows.length > 0) {
      console.log('用户 MH 已存在，将更新密码和角色');
      const userId = checkUserResult.rows[0].id;
      
      // 更新密码
      const hashedPassword = await bcrypt.hash('Wsp123456', 10);
      const updatePasswordQuery = 'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2';
      await client.query(updatePasswordQuery, [hashedPassword, userId]);
      
      // 检查是否已有管理员角色
      const checkRoleQuery = 'SELECT role_id FROM user_roles WHERE user_id = $1 AND role_id = $2';
      const checkRoleResult = await client.query(checkRoleQuery, [userId, '10000000-0000-0000-0000-000000000002']);
      
      if (checkRoleResult.rows.length === 0) {
        // 分配管理员角色
        const assignRoleQuery = 'INSERT INTO user_roles (user_id, role_id, assigned_at) VALUES ($1, $2, NOW())';
        await client.query(assignRoleQuery, [userId, '10000000-0000-0000-0000-000000000002']);
        console.log('已为用户 MH 分配管理员角色');
      } else {
        console.log('用户 MH 已具有管理员角色');
      }
      
      await client.query('COMMIT');
      console.log('用户 MH 更新成功');
    } else {
      // 创建新用户
      const userId = uuidv4();
      const hashedPassword = await bcrypt.hash('Wsp123456', 10);
      
      const createUserQuery = `
        INSERT INTO users (id, username, password_hash, email, display_name, is_active, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) 
        RETURNING id
      `;
      const createUserValues = [userId, 'MH', hashedPassword, 'mh@example.com', 'MH管理员', true];
      const createUserResult = await client.query(createUserQuery, createUserValues);
      
      // 分配管理员角色
      const assignRoleQuery = 'INSERT INTO user_roles (user_id, role_id, assigned_at) VALUES ($1, $2, NOW())';
      await client.query(assignRoleQuery, [createUserResult.rows[0].id, '10000000-0000-0000-0000-000000000002']);
      
      await client.query('COMMIT');
      console.log('管理员用户 MH 创建成功，ID:', createUserResult.rows[0].id);
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('创建管理员用户失败:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

createAdminUser();