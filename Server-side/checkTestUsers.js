const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// 数据库配置
const pool = new Pool({
  host: 'localhost',
  user: 'postgres',
  password: '123456789',
  database: 'expense_dev',
  port: 5432
});

// 测试用户数据
const testUsers = [
  { username: 'sysadmin', password: 'password123', role: '系统管理员' },
  { username: 'admin001', password: 'password123', role: '管理员' },
  { username: 'dormleader001', password: 'password123', role: '寝室长' },
  { username: 'user001', password: 'password123', role: '普通用户' },
  { username: 'payer001', password: 'password123', role: '缴费人' }
];

async function checkTestUsers() {
  console.log('开始检查测试用户...');
  
  try {
    for (const user of testUsers) {
      // 获取用户信息
      const userResult = await pool.query(
        'SELECT u.id, u.username, u.password_hash, r.name as role_name FROM users u LEFT JOIN user_roles ur ON u.id = ur.user_id LEFT JOIN roles r ON ur.role_id = r.id WHERE u.username = $1',
        [user.username]
      );
      
      if (userResult.rows.length === 0) {
        console.log(`用户 ${user.username} 不存在`);
        continue;
      }
      
      const userData = userResult.rows[0];
      console.log(`用户: ${userData.username}, 角色: ${userData.role_name || '未分配'}`);
      
      // 验证密码
      const isPasswordValid = await bcrypt.compare(user.password, userData.password_hash);
      console.log(`密码验证: ${isPasswordValid ? '正确' : '错误'}`);
      
      console.log('---');
    }
  } catch (error) {
    console.error('检查测试用户失败:', error);
  } finally {
    await pool.end();
  }
}

// 执行检查
checkTestUsers();