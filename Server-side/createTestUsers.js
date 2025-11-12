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
  { username: 'sysadmin', password: 'password123', email: 'sysadmin@example.com', role: '系统管理员' },
  { username: 'admin001', password: 'password123', email: 'admin001@example.com', role: '管理员' },
  { username: 'dormleader001', password: 'password123', email: 'dormleader001@example.com', role: '寝室长' },
  { username: 'user001', password: 'password123', email: 'user001@example.com', role: '普通用户' },
  { username: 'payer001', password: 'password123', email: 'payer001@example.com', role: '缴费人' }
];

async function createTestUsers() {
  console.log('开始创建测试用户...');
  
  try {
    // 获取角色ID
    const rolesResult = await pool.query('SELECT id, name FROM roles');
    const roles = {};
    rolesResult.rows.forEach(row => {
      roles[row.name] = row.id;
    });
    
    console.log('找到的角色:', roles);
    
    // 创建用户
    for (const user of testUsers) {
      // 检查用户是否已存在
      const existingUserResult = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [user.username]
      );
      
      if (existingUserResult.rows.length > 0) {
        console.log(`用户 ${user.username} 已存在，跳过创建`);
        continue;
      }
      
      // 生成密码哈希
      const passwordHash = await bcrypt.hash(user.password, 10);
      
      // 创建用户
      const userResult = await pool.query(
        'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
        [user.username, user.email, passwordHash]
      );
      
      const userId = userResult.rows[0].id;
      console.log(`创建用户 ${user.username} 成功，ID: ${userId}`);
      
      // 分配角色
      if (roles[user.role]) {
        await pool.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
          [userId, roles[user.role]]
        );
        console.log(`为用户 ${user.username} 分配角色 ${user.role} 成功`);
      } else {
        console.warn(`角色 ${user.role} 不存在，无法为用户 ${user.username} 分配角色`);
      }
    }
    
    console.log('测试用户创建完成');
  } catch (error) {
    console.error('创建测试用户失败:', error);
  } finally {
    await pool.end();
  }
}

// 执行创建
createTestUsers();