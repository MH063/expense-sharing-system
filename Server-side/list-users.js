const { pool } = require('./config/db');

const listUsers = async () => {
  try {
    const result = await pool.query('SELECT id, username, email, name, role FROM users LIMIT 10');
    console.log('用户列表:');
    result.rows.forEach(user => {
      console.log(`ID: ${user.id}, 用户名: ${user.username}, 邮箱: ${user.email}, 姓名: ${user.name}, 角色: ${user.role}`);
    });
    process.exit(0);
  } catch (error) {
    console.error('查询用户失败:', error);
    process.exit(1);
  }
};

listUsers();