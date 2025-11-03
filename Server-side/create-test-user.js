const bcrypt = require('bcryptjs');
const { pool } = require('./config/db');

const createTestUser = async () => {
  try {
    const saltRounds = 10;
    const password = '123456';
    const username = 'testuser';
    const email = 'test@example.com';
    const name = '测试用户';
    
    // 哈希密码
    const hash = await bcrypt.hash(password, saltRounds);
    
    // 插入用户
    const query = 'INSERT INTO users (username, email, name, password) VALUES ($1, $2, $3, $4) RETURNING id';
    const values = [username, email, name, hash];
    
    const result = await pool.query(query, values);
    console.log('测试用户创建成功, ID:', result.rows[0].id);
    console.log('用户名:', username);
    console.log('密码:', password);
    process.exit(0);
  } catch (error) {
    console.error('创建用户失败:', error);
    process.exit(1);
  }
};

createTestUser();