const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const winston = require('winston');

// 用户控制器
class UserController {
  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/user-controller.log' })
      ]
    });
  }

  // 用户注册
  async register(req, res) {
    try {
      const { username, password, email, displayName } = req.body;

      // 验证必填字段
      if (!username || !password || !email) {
        return res.status(400).json({
          success: false,
          message: '用户名、密码和邮箱为必填项'
        });
      }

      // 检查用户名是否已存在
      const [existingUser] = await pool.query(
        'SELECT id FROM users WHERE username = ?',
        [username]
      );

      if (existingUser.length > 0) {
        return res.status(409).json({
          success: false,
          message: '用户名已被注册'
        });
      }

      // 检查邮箱是否已存在
      const [existingEmail] = await pool.query(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingEmail.length > 0) {
        return res.status(409).json({
          success: false,
          message: '邮箱已被注册'
        });
      }

      // 加密密码
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // 插入用户记录
      const [result] = await pool.query(
        `INSERT INTO users (username, password_hash, email, display_name, created_at, updated_at) 
         VALUES (?, ?, ?, ?, NOW(), NOW())`,
        [username, hashedPassword, email, displayName || username]
      );

      const userId = result.insertId;

      // 获取创建的用户记录
      const [userRows] = await pool.query(
        'SELECT id, username, email, display_name, created_at FROM users WHERE id = ?',
        [userId]
      );

      const user = userRows[0];

      this.logger.info(`用户注册成功: ${username}`);

      res.status(201).json({
        success: true,
        message: '用户注册成功',
        data: user
      });

    } catch (error) {
      this.logger.error('用户注册失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 用户登录
  async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: '用户名和密码为必填项'
        });
      }

      // 查找用户
      const [users] = await pool.query(
        'SELECT * FROM users WHERE username = ?',
        [username]
      );

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误'
        });
      }

      const user = users[0];

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误'
        });
      }

      // 移除密码哈希字段
      const { password_hash, ...userWithoutPassword } = user;

      this.logger.info(`用户登录成功: ${username}`);

      res.status(200).json({
        success: true,
        message: '登录成功',
        data: userWithoutPassword
      });

    } catch (error) {
      this.logger.error('用户登录失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}

module.exports = new UserController();