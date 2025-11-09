/**
 * 增强的用户控制器
 * 支持非对称加密算法（RS256）和增强的密钥管理
 */

const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const winston = require('winston');
const { EnhancedTokenManager } = require('../middleware/enhanced-tokenManager');
const crypto = require('crypto');
const { recordFailedLoginAttempt, resetFailedLoginAttempts, isAccountLocked } = require('../middleware/securityEnhancements');
const { recordFailure, recordSuccess } = require('../middleware/bruteForceRedis');
const { newResponseMiddleware } = require('../middleware/newResponseHandler');
const { logUserActivity, logSystemEvent, logSecurityEvent } = require('../middleware/enhanced-audit-logger');

// 创建日志记录器
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/enhanced-user-controller.log' })
  ]
});

// 增强的用户控制器
class EnhancedUserController {
  constructor() {
    this.logger = logger;
  }

  // 用户注册
  async register(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      const { username, password, email, displayName } = req.body;

      logger.info(`开始处理用户注册请求 [${requestId}]`, {
        requestId,
        username,
        email,
        displayName: displayName || '未提供',
        timestamp: new Date().toISOString()
      });

      // 基于 express-validator 的校验已在路由层，额外后备校验
      if (!username || !password || !email) {
        logger.warn(`用户注册失败：缺少必填字段 [${requestId}]`, {
          requestId,
          username: username || '未提供',
          email: email || '未提供',
          hasPassword: !!password,
          timestamp: new Date().toISOString()
        });
        
        return res.error(400, '用户名、密码和邮箱为必填项');
      }
      
      // 密码强度：至少8位，包含大小写、数字、特殊字符各一
      const strongPwd = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
      if (!strongPwd.test(password)) {
        logger.warn(`用户注册失败：密码强度不足 [${requestId}]`, {
          requestId,
          username,
          email,
          passwordLength: password.length,
          timestamp: new Date().toISOString()
        });
        
        return res.error(400, '密码需包含大小写、数字、特殊字符且至少8位');
      }

      // 检查用户名是否已存在
      const existingUserResult = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );
      const existingUser = existingUserResult.rows;

      if (existingUser.length > 0) {
        logger.warn(`用户注册失败：用户名已存在 [${requestId}]`, {
          requestId,
          username,
          email,
          timestamp: new Date().toISOString()
        });
        
        return res.error(409, '用户名已被注册');
      }

      // 检查邮箱是否已存在
      const existingEmailResult = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      const existingEmail = existingEmailResult.rows;

      if (existingEmail.length > 0) {
        logger.warn(`用户注册失败：邮箱已存在 [${requestId}]`, {
          requestId,
          username,
          email,
          timestamp: new Date().toISOString()
        });
        
        return res.error(409, '邮箱已被注册');
      }

      // 加密密码
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // 插入用户记录并返回ID
      const result = await pool.query(
        `INSERT INTO users (username, password_hash, email, display_name, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
        [username, hashedPassword, email, displayName || username]
      );

      const userId = result.rows[0].id;

      // 获取创建的用户记录
      const userRowsResult = await pool.query(
        'SELECT id, username, email, display_name, created_at FROM users WHERE id = $1',
        [userId]
      );
      const userRows = userRowsResult.rows;

      const user = userRows[0];
      
      const duration = Date.now() - startTime;
      logger.info(`用户注册成功 [${requestId}]`, {
        requestId,
        userId: user.id,
        username,
        email,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });

      res.success(201, '用户注册成功', user);

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`用户注册失败 [${requestId}]`, {
        requestId,
        error: error.message,
        stack: error.stack,
        username: req.body.username,
        email: req.body.email,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 管理员登录
  async adminLogin(req, res) {
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      const { username, password } = req.body;
      
      logger.info(`开始处理管理员登录请求 [${requestId}]`, {
        requestId,
        username: username || '未提供',
        hasPassword: !!password,
        timestamp: new Date().toISOString()
      });
      
      // 查询管理员用户信息 - 从users表查询具有管理员角色的用户
      const userResult = await pool.query(
        `SELECT u.id, u.username, u.password_hash 
         FROM users u 
         JOIN user_roles ur ON u.id = ur.user_id 
         JOIN roles r ON ur.role_id = r.id 
         WHERE u.username = $1 AND r.name = '系统管理员'`,
        [username]
      );
      
      if (userResult.rows.length === 0) {
        logger.warn(`管理员登录失败：用户不存在或非管理员 [${requestId}]`, {
          requestId,
          username,
          timestamp: new Date().toISOString()
        });
        
        // 记录Redis暴力破解防护失败
        if (req.ip && username) {
          await recordFailure(req.ip, username);
        }
        return res.error(401, '用户名或密码错误');
      }
      
      const user = userResult.rows[0];
      
      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        logger.warn(`管理员登录失败：密码错误 [${requestId}]`, {
          requestId,
          userId: user.id,
          username,
          timestamp: new Date().toISOString()
        });
        
        // 记录Redis暴力破解防护失败
        if (req.ip && username) {
          await recordFailure(req.ip, username);
        }
        return res.error(401, '用户名或密码错误');
      }
      
      // 使用EnhancedTokenManager生成JWT token
      const accessToken = EnhancedTokenManager.generateAccessToken({
        sub: user.id.toString(),
        username: user.username,
        roles: ['admin'], // 管理员角色
        permissions: ['read', 'write', 'admin']
      });
      
      const refreshToken = EnhancedTokenManager.generateRefreshToken(user.id.toString());
      
      // 更新最后登录时间
      try {
        await pool.query(
          'UPDATE users SET updated_at = NOW() WHERE id = $1',
          [user.id]
        );
      } catch (error) {
        logger.warn('无法更新users表的updated_at字段:', error.message);
      }
      
      const duration = Date.now() - startTime;
      logger.info(`管理员登录成功 [${requestId}]`, {
        requestId,
        userId: user.id,
        username,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      // 记录Redis暴力破解防护成功
      if (req.ip && username) {
        await recordSuccess(req.ip, username);
      }
      
      res.success(200, '管理员登录成功', {
        user: {
          id: user.id,
          username: user.username,
          role: 'admin'
        },
        accessToken,
        refreshToken
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`管理员登录失败 [${requestId}]`, {
        requestId,
        error: error.message,
        stack: error.stack,
        username: req.body.username,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 用户登录
  login = async (req, res) => {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      const { username, password } = req.body;

      logger.info(`开始处理用户登录请求 [${requestId}]`, {
        requestId,
        username: username || '未提供',
        hasPassword: !!password,
        timestamp: new Date().toISOString()
      });

      if (!username || !password) {
        logger.warn(`用户登录失败：缺少必填字段 [${requestId}]`, {
          requestId,
          username: username || '未提供',
          hasPassword: !!password,
          timestamp: new Date().toISOString()
        });
        
        if (typeof req._recordLoginFailure === 'function') req._recordLoginFailure();
        // 记录Redis暴力破解防护失败
        if (req.ip && req.body.username) {
          await recordFailure(req.ip, req.body.username);
        }
        return res.error(400, '登录信息不完整');
      }

      // 查找用户 - 支持用户名或邮箱登录，不依赖user_roles表
      const usersResult = await pool.query(
        'SELECT * FROM users WHERE username = $1 OR email = $1',
        [username]
      );
      const users = usersResult.rows;

      if (users.length === 0) {
        logger.warn(`用户登录失败：用户不存在 [${requestId}]`, {
          requestId,
          username,
          timestamp: new Date().toISOString()
        });
        
        if (typeof req._recordLoginFailure === 'function') req._recordLoginFailure();
        return res.error(401, '登录信息不正确');
      }

      const user = users[0];

      // 检查账户是否被锁定
      const lockStatus = await isAccountLocked(user.id);
      if (lockStatus.locked) {
        logger.warn(`用户登录失败：账户被锁定 [${requestId}]`, {
          requestId,
          userId: user.id,
          username,
          lockReason: lockStatus.reason || '未知原因',
          lockTime: lockStatus.lockTime,
          timestamp: new Date().toISOString()
        });
        
        return res.error(423, '账户已被锁定，请稍后再试');
      }

      // 若启用 MFA，需要校验一次 TOTP
      if (user.mfa_enabled) {
        const mfaCode = req.body && req.body.mfa_code;
        if (!mfaCode) {
          logger.warn(`用户登录失败：需要多因素验证码 [${requestId}]`, {
            requestId,
            userId: user.id,
            username,
            timestamp: new Date().toISOString()
          });
          
          if (typeof req._recordLoginFailure === 'function') req._recordLoginFailure();
          // 记录登录失败尝试
          await recordFailedLoginAttempt(user.id);
          return res.error(401, '需要多因素验证码');
        }
        const { totpVerify } = require('../utils/totp');
        const ok = totpVerify(String(mfaCode), user.mfa_secret, { window: 1 });
        if (!ok) {
          logger.warn(`用户登录失败：多因素验证码错误 [${requestId}]`, {
            requestId,
            userId: user.id,
            username,
            timestamp: new Date().toISOString()
          });
          
          if (typeof req._recordLoginFailure === 'function') req._recordLoginFailure();
          // 记录登录失败尝试
          await recordFailedLoginAttempt(user.id);
          return res.error(401, '多因素验证码错误');
        }
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        logger.warn(`用户登录失败：密码错误 [${requestId}]`, {
          requestId,
          userId: user.id,
          username,
          timestamp: new Date().toISOString()
        });
        
        if (typeof req._recordLoginFailure === 'function') req._recordLoginFailure();
        // 记录登录失败尝试
        await recordFailedLoginAttempt(user.id);
        return res.error(401, '登录信息不正确');
      }

      // 重置登录失败计数
      await resetFailedLoginAttempts(user.id);

      // 移除密码字段
      const { password_hash: userPassword, ...userWithoutPassword } = user;

      // 查询用户角色
      let userRole = 'user'; // 默认角色
      try {
        const roleResult = await pool.query(
          `SELECT r.name as role 
           FROM user_roles ur 
           JOIN roles r ON ur.role_id = r.id 
           WHERE ur.user_id = $1`,
          [user.id]
        );
        
        if (roleResult.rows.length > 0) {
          userRole = roleResult.rows[0].role;
        }
      } catch (error) {
        logger.warn(`获取用户角色失败，使用默认角色 [${requestId}]`, {
          requestId,
          userId: user.id,
          username,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }

      // 查询用户权限
      let userPermissions = ['read', 'write']; // 默认权限
      try {
        const permissionResult = await pool.query(
          `SELECT p.code as permission 
           FROM role_permissions rp 
           JOIN permissions p ON rp.permission_id = p.id 
           JOIN roles r ON rp.role_id = r.id 
           WHERE r.name = $1`,
          [userRole]
        );
        
        if (permissionResult.rows.length > 0) {
          userPermissions = permissionResult.rows.map(row => row.permission);
        }
      } catch (error) {
        logger.warn(`获取用户权限失败，使用默认权限 [${requestId}]`, {
          requestId,
          userId: user.id,
          username,
          userRole,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }

      // 添加角色信息到用户对象
      userWithoutPassword.role = userRole;

      // 使用EnhancedTokenManager生成JWT token
      const accessToken = EnhancedTokenManager.generateAccessToken({
        sub: user.id.toString(),
        username: user.username,
        roles: [userRole], // 使用查询到的角色
        permissions: userPermissions // 使用查询到的权限
      });
      
      const refreshToken = EnhancedTokenManager.generateRefreshToken(user.id.toString());

      // 记录登录成功
      if (typeof req._recordLoginSuccess === 'function') req._recordLoginSuccess(username);
      // 记录Redis暴力破解防护成功
      if (req.ip && username) {
        await recordSuccess(req.ip, username);
      }

      const duration = Date.now() - startTime;
      logger.info(`用户登录成功 [${requestId}]`, {
        requestId,
        userId: user.id,
        username,
        userRole,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });

      res.success(200, '登录成功', {
        token: accessToken,
        refreshToken: refreshToken,
        user: userWithoutPassword
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`用户登录失败 [${requestId}]`, {
        requestId,
        error: error.message,
        stack: error.stack,
        username: req.body.username,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 刷新Token
  async refreshToken(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      const { refreshToken } = req.body;

      logger.info(`开始处理Token刷新请求 [${requestId}]`, {
        requestId,
        hasRefreshToken: !!refreshToken,
        timestamp: new Date().toISOString()
      });

      if (!refreshToken) {
        logger.warn(`Token刷新失败：缺少刷新Token [${requestId}]`, {
          requestId,
          timestamp: new Date().toISOString()
        });
        
        return res.error(400, '刷新Token为必填项');
      }

      // 使用EnhancedTokenManager刷新Token
      const tokenPair = await EnhancedTokenManager.refreshTokens(refreshToken);
      
      if (!tokenPair) {
        logger.warn(`Token刷新失败：无效的刷新Token [${requestId}]`, {
          requestId,
          timestamp: new Date().toISOString()
        });
        
        return res.error(401, '无效的刷新Token');
      }

      const duration = Date.now() - startTime;
      logger.info(`Token刷新成功 [${requestId}]`, {
        requestId,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });

      res.success(200, 'Token刷新成功', {
        token: tokenPair.accessToken,
        refreshToken: tokenPair.refreshToken
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`Token刷新失败 [${requestId}]`, {
        requestId,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 获取用户详情
  async getUserById(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      const { id } = req.params;
      
      logger.info(`开始获取用户详情 [${requestId}]`, {
        requestId,
        userId: id,
        timestamp: new Date().toISOString()
      });
      
      // 查询用户信息
      const userResult = await pool.query(
        `SELECT id, username, email, display_name, created_at, updated_at 
         FROM users WHERE id = $1`,
        [id]
      );
      
      if (userResult.rows.length === 0) {
        logger.warn(`获取用户详情失败：用户不存在 [${requestId}]`, {
          requestId,
          userId: id,
          timestamp: new Date().toISOString()
        });
        
        return res.error(404, '用户不存在');
      }
      
      const user = userResult.rows[0];
      
      // 查询用户角色
      let userRole = 'user'; // 默认角色
      try {
        const roleResult = await pool.query(
          `SELECT r.name as role 
           FROM user_roles ur 
           JOIN roles r ON ur.role_id = r.id 
           WHERE ur.user_id = $1`,
          [id]
        );
        
        if (roleResult.rows.length > 0) {
          userRole = roleResult.rows[0].role;
        }
      } catch (error) {
        logger.warn(`获取用户角色失败，使用默认角色 [${requestId}]`, {
          requestId,
          userId: id,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      // 添加角色信息到用户对象
      user.role = userRole;
      
      const duration = Date.now() - startTime;
      logger.info(`获取用户详情成功 [${requestId}]`, {
        requestId,
        userId: id,
        userRole,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.success(200, '获取用户详情成功', user);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`获取用户详情失败 [${requestId}]`, {
        requestId,
        error: error.message,
        stack: error.stack,
        userId: req.params.id,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 用户登出
  async logout(req, res) {
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      const { refreshToken } = req.body;
      
      logger.info(`开始处理用户登出请求 [${requestId}]`, {
        requestId,
        userId: req.user ? req.user.sub : '未知',
        hasRefreshToken: !!refreshToken,
        timestamp: new Date().toISOString()
      });
      
      // 如果提供了刷新令牌，则撤销它
      if (refreshToken) {
        try {
          const decoded = EnhancedTokenManager.verifyRefreshToken(refreshToken);
          if (decoded && decoded.jti) {
            EnhancedTokenManager.revokeRefreshToken(decoded.jti);
          }
        } catch (error) {
          logger.warn(`撤销刷新令牌失败 [${requestId}]`, {
            requestId,
            error: error.message,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      const duration = Date.now() - startTime;
      logger.info(`用户登出成功 [${requestId}]`, {
        requestId,
        userId: req.user ? req.user.sub : '未知',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.success(200, '登出成功');
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`用户登出失败 [${requestId}]`, {
        requestId,
        error: error.message,
        stack: error.stack,
        userId: req.user ? req.user.sub : '未知',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }
}

// 创建并导出控制器实例
const enhancedUserController = new EnhancedUserController();

module.exports = {
  EnhancedUserController,
  register: enhancedUserController.register.bind(enhancedUserController),
  adminLogin: enhancedUserController.adminLogin.bind(enhancedUserController),
  login: enhancedUserController.login,
  refreshToken: enhancedUserController.refreshToken.bind(enhancedUserController),
  getUserById: enhancedUserController.getUserById.bind(enhancedUserController),
  logout: enhancedUserController.logout.bind(enhancedUserController)
};