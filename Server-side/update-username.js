const { pool } = require('./config/db');

async function updateAdminUsername() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // 检查是否已存在用户名为"WSP"的用户
    const checkWspQuery = 'SELECT id FROM users WHERE username = $1';
    const checkWspResult = await client.query(checkWspQuery, ['WSP']);
    
    if (checkWspResult.rows.length > 0) {
      console.log('用户名 WSP 已存在，无法修改');
      await client.query('ROLLBACK');
      return;
    }
    
    // 查找MH用户
    const checkMhQuery = 'SELECT id FROM users WHERE username = $1';
    const checkMhResult = await client.query(checkMhQuery, ['MH']);
    
    if (checkMhResult.rows.length === 0) {
      console.log('未找到用户 MH');
      await client.query('ROLLBACK');
      return;
    }
    
    const userId = checkMhResult.rows[0].id;
    
    // 更新用户名
    const updateUsernameQuery = 'UPDATE users SET username = $1, updated_at = NOW() WHERE id = $2';
    await client.query(updateUsernameQuery, ['WSP', userId]);
    
    await client.query('COMMIT');
    console.log('用户名已成功从 MH 修改为 WSP');
    
    // 验证修改结果
    const verifyQuery = `
      SELECT u.id, u.username, u.email, u.is_active, r.name as role_name
      FROM users u 
      LEFT JOIN user_roles ur ON u.id = ur.user_id 
      LEFT JOIN roles r ON ur.role_id = r.id 
      WHERE u.id = $1
    `;
    const verifyResult = await pool.query(verifyQuery, [userId]);
    
    if (verifyResult.rows.length > 0) {
      console.log('\n更新后的用户信息:');
      console.log('ID:', verifyResult.rows[0].id);
      console.log('用户名:', verifyResult.rows[0].username);
      console.log('邮箱:', verifyResult.rows[0].email);
      console.log('状态:', verifyResult.rows[0].is_active ? '激活' : '未激活');
      console.log('角色:', verifyResult.rows[0].role_name || '未分配角色');
    }
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('修改用户名失败:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

updateAdminUsername();