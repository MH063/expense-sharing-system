const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const winston = require('winston');

// 创建日志记录器
const logger = winston.createLogger({
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

// 用户控制器
class UserController {
  constructor() {
    this.logger = logger;
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
      const existingUserResult = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );
      const existingUser = existingUserResult.rows;

      if (existingUser.length > 0) {
        return res.status(409).json({
          success: false,
          message: '用户名已被注册'
        });
      }

      // 检查邮箱是否已存在
      const existingEmailResult = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      const existingEmail = existingEmailResult.rows;

      if (existingEmail.length > 0) {
        return res.status(409).json({
          success: false,
          message: '邮箱已被注册'
        });
      }

      // 加密密码
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // 插入用户记录并返回ID
      const result = await pool.query(
        `INSERT INTO users (username, password_hash, email, name, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
        [username, hashedPassword, email, displayName || username]
      );

      const userId = result.rows[0].id;

      // 获取创建的用户记录
      const userRowsResult = await pool.query(
        'SELECT id, username, email, name, created_at FROM users WHERE id = $1',
        [userId]
      );
      const userRows = userRowsResult.rows;

      const user = userRows[0];

      logger.info(`用户注册成功: ${username}`);

      res.status(201).json({
        success: true,
        message: '用户注册成功',
        data: user
      });

    } catch (error) {
      logger.error('用户注册失败:', error);
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
          message: '用户名/邮箱/手机号和密码为必填项'
        });
      }

      // 查找用户 - 支持用户名、邮箱或手机号登录
      const usersResult = await pool.query(
        'SELECT * FROM users WHERE username = $1 OR email = $1 OR phone = $1',
        [username]
      );
      const users = usersResult.rows;

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: '用户名/邮箱/手机号或密码错误'
        });
      }

      const user = users[0];

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: '用户名/邮箱/手机号或密码错误'
        });
      }

      // 移除密码哈希字段
      const { password_hash, ...userWithoutPassword } = user;

      // 生成JWT token
      const jwt = require('jsonwebtoken');
      const accessToken = jwt.sign(
        { 
          sub: user.id.toString(),
          username: user.username,
          roles: ['user'],
          permissions: ['read', 'write']
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1h' }
      );

      const refreshToken = jwt.sign(
        { sub: user.id.toString() },
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
        { expiresIn: '7d' }
      );

      logger.info(`用户登录成功: ${username}`);

      res.status(200).json({
        success: true,
        message: '登录成功',
        data: {
          token: accessToken,
          refreshToken: refreshToken,
          user: userWithoutPassword
        }
      });

    } catch (error) {
      logger.error('用户登录失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 刷新Token
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: '刷新Token为必填项'
        });
      }

      // 验证刷新Token
      const jwt = require('jsonwebtoken');
      let decoded;
      
      try {
        decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key');
      } catch (error) {
        return res.status(401).json({
          success: false,
          message: '无效的刷新Token'
        });
      }

      // 查找用户
      const usersResult = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [decoded.sub]
      );
      const users = usersResult.rows;

      if (users.length === 0) {
        return res.status(401).json({
          success: false,
          message: '用户不存在'
        });
      }

      const user = users[0];

      // 生成新的JWT token
      const newAccessToken = jwt.sign(
        { 
          sub: user.id.toString(),
          username: user.username,
          roles: ['user'],
          permissions: ['read', 'write']
        },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '1h' }
      );

      const newRefreshToken = jwt.sign(
        { sub: user.id.toString() },
        process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
        { expiresIn: '7d' }
      );

      logger.info(`Token刷新成功: ${user.username}`);

      res.status(200).json({
        success: true,
        message: 'Token刷新成功',
        data: {
          accessToken: newAccessToken,
          refreshToken: newRefreshToken
        }
      });

    } catch (error) {
      logger.error('Token刷新失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}

module.exports = new UserController();