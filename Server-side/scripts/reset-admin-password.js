#!/usr/bin/env node

/**
 * 重置管理员密码脚本
 * 此脚本用于重置数据库中管理员用户的密码
 */

const bcrypt = require('bcryptjs');
const { Client } = require('pg');

// 配置
const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456789',
  database: process.env.DB_NAME || 'expense_prod'
};

// 管理员用户信息
const adminUser = {
  id: '00000000-0000-0000-0000-000000000001',
  username: 'admin',
  newPassword: 'Admin123!' // 新密码，符合强密码要求
};

/**
 * 重置管理员密码
 */
async function resetAdminPassword() {
  const client = new Client(config);
  
  try {
    await client.connect();
    console.log('已连接到数据库');
    
    // 生成新密码的哈希值
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(adminUser.newPassword, saltRounds);
    console.log('已生成新密码哈希');
    
    // 更新管理员用户密码
    const updateQuery = `
      UPDATE admin_users 
      SET password_hash = $1, updated_at = NOW() 
      WHERE id = $2 OR username = $3
    `;
    
    const result = await client.query(updateQuery, [passwordHash, adminUser.id, adminUser.username]);
    
    if (result.rowCount > 0) {
      console.log(`成功更新管理员用户 ${adminUser.username} 的密码`);
      console.log(`新密码: ${adminUser.newPassword}`);
      console.log('请使用此新密码登录管理端');
    } else {
      console.log('未找到管理员用户，将创建新的管理员用户');
      
      // 如果没有找到管理员用户，则创建一个新的
      const insertQuery = `
        INSERT INTO admin_users (id, username, display_name, password_hash, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'active', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          password_hash = EXCLUDED.password_hash,
          updated_at = NOW()
      `;
      
      await client.query(insertQuery, [
        adminUser.id,
        adminUser.username,
        '系统管理员',
        passwordHash
      ]);
      
      console.log(`成功创建管理员用户 ${adminUser.username}`);
      console.log(`新密码: ${adminUser.newPassword}`);
      console.log('请使用此新密码登录管理端');
      
      // 检查是否需要分配角色
      const roleCheckQuery = `
        SELECT 1 FROM admin_user_roles WHERE admin_user_id = $1
      `;
      const roleCheckResult = await client.query(roleCheckQuery, [adminUser.id]);
      
      if (roleCheckResult.rowCount === 0) {
        console.log('为管理员用户分配超级管理员角色...');
        
        // 分配超级管理员角色
        const roleAssignQuery = `
          INSERT INTO admin_user_roles (admin_user_id, role_id)
          VALUES ($1, '00000000-0000-0000-0000-000000000010')
          ON CONFLICT DO NOTHING
        `;
        
        await client.query(roleAssignQuery, [adminUser.id]);
        console.log('已分配超级管理员角色');
      }
    }
    
    console.log('管理员密码重置完成');
  } catch (error) {
    console.error('重置管理员密码失败:', error);
    throw error;
  } finally {
    await client.end();
  }
}

// 如果直接运行此脚本，则执行密码重置操作
if (require.main === module) {
  resetAdminPassword()
    .then(() => {
      console.log('管理员密码重置成功完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('管理员密码重置失败:', error);
      process.exit(1);
    });
}

module.exports = { resetAdminPassword };