const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const winston = require('winston');
const { TokenManager } = require('../middleware/tokenManager');
const crypto = require('crypto');
const { recordFailedLoginAttempt, resetFailedLoginAttempts, isAccountLocked } = require('../middleware/securityEnhancements');

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
        
        return res.status(400).json({ success: false, message: '用户名、密码和邮箱为必填项' });
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
        
        return res.status(400).json({ success: false, message: '密码需包含大小写、数字、特殊字符且至少8位' });
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
        logger.warn(`用户注册失败：邮箱已存在 [${requestId}]`, {
          requestId,
          username,
          email,
          timestamp: new Date().toISOString()
        });
        
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

      res.status(201).json({
        success: true,
        message: '用户注册成功',
        data: user
      });

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
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 管理员登录
  async adminLogin(req, res) {
    try {
      const { username, password } = req.body;
      
      // 查询管理员用户信息 - 修改为查询admin_users表
      const userResult = await pool.query(
        'SELECT id, username, password_hash FROM admin_users WHERE username = $1',
        [username]
      );
      
      if (userResult.rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误'
        });
      }
      
      const user = userResult.rows[0];
      
      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: '用户名或密码错误'
        });
      }
      
      // 生成JWT令牌
      const payload = {
        userId: user.id,
        username: user.username,
        role: 'admin' // 管理员角色
      };
      
      // 使用TokenManager生成JWT token，与普通用户登录保持一致
      const { TokenManager } = require('../middleware/tokenManager');
      const accessToken = TokenManager.generateAccessToken({
        sub: user.id.toString(),
        username: user.username,
        roles: ['admin'], // 管理员角色
        permissions: ['read', 'write', 'admin']
      });
      
      const refreshToken = TokenManager.generateRefreshToken(user.id.toString());
      
      // 更新最后登录时间 - 如果admin_users表有updated_at字段
      try {
        await pool.query(
          'UPDATE admin_users SET updated_at = NOW() WHERE id = $1',
          [user.id]
        );
      } catch (error) {
        // 如果updated_at字段不存在，忽略错误
        logger.warn('无法更新admin_users表的updated_at字段:', error.message);
      }
      
      logger.info(`管理员登录成功: ${user.username}`);
      
      res.status(200).json({
        success: true,
        message: '管理员登录成功',
        data: {
          user: {
            id: user.id,
            username: user.username,
            role: 'admin'
          },
          accessToken,
          refreshToken
        }
      });
      
    } catch (error) {
      logger.error('管理员登录失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
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
        return res.status(400).json({ success: false, message: '登录信息不完整' });
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
        return res.status(401).json({ success: false, message: '登录信息不正确' });
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
        
        return res.status(423).json({
          success: false,
          message: '账户已被锁定，请稍后再试'
        });
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
          return res.status(401).json({ success: false, message: '需要多因素验证码' });
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
          return res.status(401).json({ success: false, message: '多因素验证码错误' });
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
        return res.status(401).json({ success: false, message: '登录信息不正确' });
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

      // 使用TokenManager生成JWT token
      const { TokenManager } = require('../middleware/tokenManager');
      const accessToken = TokenManager.generateAccessToken({
        sub: user.id.toString(),
        username: user.username,
        roles: [userRole], // 使用查询到的角色
        permissions: userPermissions // 使用查询到的权限
      });
      
      const refreshToken = TokenManager.generateRefreshToken(user.id.toString());

      // 记录登录成功
      if (typeof req._recordLoginSuccess === 'function') req._recordLoginSuccess(username);

      const duration = Date.now() - startTime;
      logger.info(`用户登录成功 [${requestId}]`, {
        requestId,
        userId: user.id,
        username,
        userRole,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });

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
      const duration = Date.now() - startTime;
      logger.error(`用户登录失败 [${requestId}]`, {
        requestId,
        error: error.message,
        stack: error.stack,
        username: req.body.username,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
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
        
        return res.status(400).json({
          success: false,
          message: '刷新Token为必填项'
        });
      }

      // 使用TokenManager验证刷新Token
      const { TokenManager } = require('../middleware/tokenManager');
      let decoded;
      
      try {
        decoded = TokenManager.verifyRefreshToken(refreshToken);
        if (!decoded) {
          logger.warn(`Token刷新失败：无效的刷新Token [${requestId}]`, {
            requestId,
            timestamp: new Date().toISOString()
          });
          
          return res.status(401).json({
            success: false,
            message: '无效的刷新Token'
          });
        }
      } catch (error) {
        logger.warn(`Token刷新失败：刷新Token验证异常 [${requestId}]`, {
          requestId,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
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
        logger.warn(`Token刷新失败：用户不存在 [${requestId}]`, {
          requestId,
          userId: decoded.sub,
          timestamp: new Date().toISOString()
        });
        
        return res.status(401).json({
          success: false,
          message: '用户不存在'
        });
      }

      const user = users[0];

      // 使用TokenManager生成新的JWT token
      
      // 从数据库获取最新的用户角色和权限
      const userRole = await TokenManager.getUserRole(user.id);
      const userPermissions = await TokenManager.getUserPermissions(user.id);
      
      const newAccessToken = TokenManager.generateAccessToken({
        sub: user.id.toString(),
        username: user.username,
        roles: [userRole],
        permissions: userPermissions
      });
      
      const newRefreshToken = TokenManager.generateRefreshToken(user.id.toString());

      const duration = Date.now() - startTime;
      logger.info(`Token刷新成功 [${requestId}]`, {
        requestId,
        userId: user.id,
        username: user.username,
        userRole,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });

      res.status(200).json({
        success: true,
        message: 'Token刷新成功',
        data: {
          token: newAccessToken,
          refreshToken: newRefreshToken
        }
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
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
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
        'SELECT id, username, email, display_name as name, avatar_url, is_active as status, created_at, updated_at FROM users WHERE id = $1',
        [id]
      );
      
      if (userResult.rows.length === 0) {
        logger.warn(`获取用户详情失败：用户不存在 [${requestId}]`, {
          requestId,
          userId: id,
          timestamp: new Date().toISOString()
        });
        
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      const user = userResult.rows[0];
      
      // 查询用户寝室关联信息
      try {
        const roomRelationResult = await pool.query(
          `SELECT urr.room_id, urr.relation_type, urr.join_date, urr.leave_date, urr.is_active,
                  r.name as room_name, r.code as room_code
           FROM user_room_relations urr
           JOIN rooms r ON urr.room_id = r.id
           WHERE urr.user_id = $1 AND urr.is_active = TRUE`,
          [id]
        );
        
        user.rooms = roomRelationResult.rows;
        
        logger.debug(`获取用户寝室关联信息成功 [${requestId}]`, {
          requestId,
          userId: id,
          roomCount: roomRelationResult.rows.length,
          timestamp: new Date().toISOString()
        });
      } catch (roomError) {
        logger.warn(`获取用户寝室关联信息失败 [${requestId}]`, {
          requestId,
          userId: id,
          error: roomError.message,
          timestamp: new Date().toISOString()
        });
        // 即使获取寝室信息失败，也继续返回用户基本信息
        user.rooms = [];
      }
      
      const duration = Date.now() - startTime;
      logger.info(`获取用户详情成功 [${requestId}]`, {
        requestId,
        userId: id,
        username: user.username,
        roomCount: user.rooms.length,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.status(200).json({
        success: true,
        message: '获取用户详情成功',
        data: user
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`获取用户详情失败 [${requestId}]`, {
        requestId,
        userId: req.params.id,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 更新用户信息
  async updateUser(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      const { id } = req.params;
      const { name, email, phone, avatar_url } = req.body;
      
      logger.info(`开始更新用户信息 [${requestId}]`, {
        requestId,
        userId: id,
        updateFields: { name, email, phone, avatar_url },
        timestamp: new Date().toISOString()
      });
      
      // 验证用户是否存在
      const userResult = await pool.query('SELECT id, username FROM users WHERE id = $1', [id]);
      
      if (userResult.rows.length === 0) {
        logger.warn(`更新用户信息失败：用户不存在 [${requestId}]`, {
          requestId,
          userId: id,
          timestamp: new Date().toISOString()
        });
        
        return res.status(404).json({
          success: false,
          message: '用户不存在'
        });
      }
      
      const currentUser = userResult.rows[0];
      
      // 如果更新邮箱，检查邮箱是否已被其他用户使用
      if (email) {
        try {
          const emailCheckResult = await pool.query(
            'SELECT id FROM users WHERE email = $1 AND id != $2',
            [email, id]
          );
          
          if (emailCheckResult.rows.length > 0) {
            logger.warn(`更新用户信息失败：邮箱已被其他用户使用 [${requestId}]`, {
              requestId,
              userId: id,
              username: currentUser.username,
              email,
              timestamp: new Date().toISOString()
            });
            
            return res.status(409).json({
              success: false,
              message: '邮箱已被其他用户使用'
            });
          }
        } catch (emailCheckError) {
          logger.error(`检查邮箱唯一性时发生错误 [${requestId}]`, {
            requestId,
            userId: id,
            username: currentUser.username,
            email,
            error: emailCheckError.message,
            timestamp: new Date().toISOString()
          });
          
          return res.status(500).json({
            success: false,
            message: '检查邮箱唯一性时发生错误'
          });
        }
      }
      
      // 构建更新字段
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;
      
      if (name !== undefined) {
        updateFields.push(`display_name = $${paramIndex++}`);
        updateValues.push(name);
      }
      
      if (email !== undefined) {
        updateFields.push(`email = $${paramIndex++}`);
        updateValues.push(email);
      }
      
      if (avatar_url !== undefined) {
        updateFields.push(`avatar_url = $${paramIndex++}`);
        updateValues.push(avatar_url);
      }
      
      // 如果没有要更新的字段
      if (updateFields.length === 0) {
        logger.warn(`更新用户信息失败：没有提供有效的更新字段 [${requestId}]`, {
          requestId,
          userId: id,
          username: currentUser.username,
          timestamp: new Date().toISOString()
        });
        
        return res.status(400).json({
          success: false,
          message: '没有提供有效的更新字段'
        });
      }
      
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(id);
      
      // 执行更新
      const updateQuery = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, username, email, display_name, avatar_url, is_active, updated_at
      `;
      
      const result = await pool.query(updateQuery, updateValues);
      const updatedUser = result.rows[0];
      
      const duration = Date.now() - startTime;
      logger.info(`用户信息更新成功 [${requestId}]`, {
        requestId,
        userId: id,
        username: updatedUser.username,
        updatedFields: updateFields.slice(0, -1), // 排除 updated_at
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.status(200).json({
        success: true,
        message: '用户信息更新成功',
        data: updatedUser
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`用户信息更新失败 [${requestId}]`, {
        requestId,
        userId: req.params.id,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取用户列表
  async getUsers(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      const { page = 1, limit = 20, role, status } = req.query;
      const offset = (page - 1) * limit;
      
      logger.info(`开始获取用户列表 [${requestId}]`, {
        requestId,
        queryParams: { page, limit, role, status },
        timestamp: new Date().toISOString()
      });
      
      // 构建查询条件
      const conditions = [];
      const queryParams = [];
      let paramIndex = 1;
      
      if (role) {
        conditions.push(`r.name = $${paramIndex++}`);
        queryParams.push(role);
      }
      
      if (status) {
        conditions.push(`u.is_active = $${paramIndex++}`);
        queryParams.push(status === 'active' ? true : false);
      }
      
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      // 查询用户列表
      const usersQuery = `
        SELECT u.id, u.username, u.email, u.display_name, u.avatar_url, u.is_active, u.created_at, u.updated_at, r.name as role
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        ${whereClause}
        ORDER BY u.created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;
      
      queryParams.push(limit, offset);
      
      let usersResult, users;
      try {
        usersResult = await pool.query(usersQuery, queryParams);
        users = usersResult.rows;
        
        logger.debug(`用户列表查询成功 [${requestId}]`, {
          requestId,
          resultCount: users.length,
          timestamp: new Date().toISOString()
        });
      } catch (queryError) {
        logger.error(`用户列表查询失败 [${requestId}]`, {
          requestId,
          error: queryError.message,
          stack: queryError.stack,
          timestamp: new Date().toISOString()
        });
        
        return res.status(500).json({
          success: false,
          message: '查询用户列表失败'
        });
      }
      
      // 查询总数
      let totalCount = 0;
      try {
        const countQuery = `
          SELECT COUNT(*) 
          FROM users u
          LEFT JOIN user_roles ur ON u.id = ur.user_id
          LEFT JOIN roles r ON ur.role_id = r.id
          ${whereClause}
        `;
        const countResult = await pool.query(countQuery, queryParams.slice(0, -2));
        totalCount = parseInt(countResult.rows[0].count);
        
        logger.debug(`用户总数查询成功 [${requestId}]`, {
          requestId,
          totalCount,
          timestamp: new Date().toISOString()
        });
      } catch (countError) {
        logger.error(`用户总数查询失败 [${requestId}]`, {
          requestId,
          error: countError.message,
          stack: countError.stack,
          timestamp: new Date().toISOString()
        });
        
        // 即使总数查询失败，也返回已查询的用户列表
        totalCount = users.length;
      }
      
      const duration = Date.now() - startTime;
      logger.info(`获取用户列表成功 [${requestId}]`, {
        requestId,
        resultCount: users.length,
        totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.status(200).json({
        success: true,
        message: '获取用户列表成功',
        data: {
          users,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount,
            totalPages: Math.ceil(totalCount / limit)
          }
        }
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`获取用户列表失败 [${requestId}]`, {
        requestId,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 分配用户角色
  async assignUserRole(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      const { id } = req.params;
      const { role } = req.body;
      const operatorId = req.user?.sub; // 操作人ID
      
      logger.info(`开始分配用户角色 [${requestId}]`, {
        requestId,
        userId: id,
        role,
        operatorId,
        timestamp: new Date().toISOString()
      });
      
      // 验证角色值
      const validRoles = ['system_admin', 'admin', '寝室长', 'payer', 'user'];
      if (!validRoles.includes(role)) {
        logger.warn(`分配用户角色失败：无效的角色值 [${requestId}]`, {
          requestId,
          userId: id,
          role,
          validRoles,
          operatorId,
          timestamp: new Date().toISOString()
        });
        
        return res.status(400).json({
          success: false,
          message: '无效的角色值'
        });
      }
      
      // 验证用户是否存在
      let user;
      try {
        const userResult = await pool.query('SELECT id, username FROM users WHERE id = $1', [id]);
        
        if (userResult.rows.length === 0) {
          logger.warn(`分配用户角色失败：用户不存在 [${requestId}]`, {
            requestId,
            userId: id,
            operatorId,
            timestamp: new Date().toISOString()
          });
          
          return res.status(404).json({
            success: false,
            message: '用户不存在'
          });
        }
        
        user = userResult.rows[0];
      } catch (userError) {
        logger.error(`查询用户信息时发生错误 [${requestId}]`, {
          requestId,
          userId: id,
          error: userError.message,
          stack: userError.stack,
          timestamp: new Date().toISOString()
        });
        
        return res.status(500).json({
          success: false,
          message: '查询用户信息失败'
        });
      }
      
      // 获取角色ID
      let roleId;
      try {
        const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', [role]);
        
        if (roleResult.rows.length === 0) {
          logger.warn(`分配用户角色失败：角色不存在 [${requestId}]`, {
            requestId,
            userId: id,
            username: user.username,
            role,
            operatorId,
            timestamp: new Date().toISOString()
          });
          
          return res.status(404).json({
            success: false,
            message: '角色不存在'
          });
        }
        
        roleId = roleResult.rows[0].id;
      } catch (roleError) {
        logger.error(`查询角色信息时发生错误 [${requestId}]`, {
          requestId,
          userId: id,
          username: user.username,
          role,
          error: roleError.message,
          stack: roleError.stack,
          timestamp: new Date().toISOString()
        });
        
        return res.status(500).json({
          success: false,
          message: '查询角色信息失败'
        });
      }
      
      // 检查用户是否已有角色
      let existingRole;
      try {
        const existingRoleResult = await pool.query(
          'SELECT role_id FROM user_roles WHERE user_id = $1',
          [id]
        );
        
        existingRole = existingRoleResult.rows;
      } catch (existingRoleError) {
        logger.error(`查询用户现有角色时发生错误 [${requestId}]`, {
          requestId,
          userId: id,
          username: user.username,
          error: existingRoleError.message,
          stack: existingRoleError.stack,
          timestamp: new Date().toISOString()
        });
        
        return res.status(500).json({
          success: false,
          message: '查询用户现有角色失败'
        });
      }
      
      // 分配或更新角色
      try {
        if (existingRole.length > 0) {
          // 更新现有角色
          await pool.query(
            'UPDATE user_roles SET role_id = $1, assigned_at = NOW(), assigned_by = $2 WHERE user_id = $3',
            [roleId, operatorId, id]
          );
          
          logger.info(`用户角色更新成功 [${requestId}]`, {
            requestId,
            userId: id,
            username: user.username,
            newRole: role,
            previousRoleId: existingRole[0].role_id,
            operatorId,
            timestamp: new Date().toISOString()
          });
        } else {
          // 分配新角色
          await pool.query(
            'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3)',
            [id, roleId, operatorId]
          );
          
          logger.info(`用户角色分配成功 [${requestId}]`, {
            requestId,
            userId: id,
            username: user.username,
            newRole: role,
            operatorId,
            timestamp: new Date().toISOString()
          });
        }
      } catch (assignError) {
        logger.error(`分配用户角色时发生错误 [${requestId}]`, {
          requestId,
          userId: id,
          username: user.username,
          role,
          roleId,
          operatorId,
          error: assignError.message,
          stack: assignError.stack,
          timestamp: new Date().toISOString()
        });
        
        return res.status(500).json({
          success: false,
          message: '分配用户角色失败'
        });
      }
      
      const duration = Date.now() - startTime;
      logger.info(`用户角色分配操作完成 [${requestId}]`, {
        requestId,
        userId: id,
        username: user.username,
        role,
        operatorId,
        action: existingRole.length > 0 ? 'update' : 'assign',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.status(200).json({
        success: true,
        message: '用户角色分配成功',
        data: {
          userId: id,
          role: role
        }
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`用户角色分配失败 [${requestId}]`, {
        requestId,
        userId: req.params.id,
        role: req.body.role,
        operatorId: req.user?.sub,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 更新用户角色
  async updateUserRole(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      const { id } = req.params;
      const { role } = req.body;
      const operatorId = req.user?.sub; // 操作人ID
      
      logger.info(`开始更新用户角色 [${requestId}]`, {
        requestId,
        userId: id,
        role,
        operatorId,
        timestamp: new Date().toISOString()
      });
      
      // 验证角色值
      const validRoles = ['system_admin', 'admin', '寝室长', 'payer', 'user'];
      if (!validRoles.includes(role)) {
        logger.warn(`更新用户角色失败：无效的角色值 [${requestId}]`, {
          requestId,
          userId: id,
          role,
          validRoles,
          operatorId,
          timestamp: new Date().toISOString()
        });
        
        return res.status(400).json({
          success: false,
          message: '无效的角色值'
        });
      }
      
      // 验证用户是否存在
      let user;
      try {
        const userResult = await pool.query('SELECT id, username FROM users WHERE id = $1', [id]);
        
        if (userResult.rows.length === 0) {
          logger.warn(`更新用户角色失败：用户不存在 [${requestId}]`, {
            requestId,
            userId: id,
            operatorId,
            timestamp: new Date().toISOString()
          });
          
          return res.status(404).json({
            success: false,
            message: '用户不存在'
          });
        }
        
        user = userResult.rows[0];
      } catch (userError) {
        logger.error(`查询用户信息时发生错误 [${requestId}]`, {
          requestId,
          userId: id,
          error: userError.message,
          stack: userError.stack,
          timestamp: new Date().toISOString()
        });
        
        return res.status(500).json({
          success: false,
          message: '查询用户信息失败'
        });
      }
      
      // 获取角色ID
      let roleId;
      try {
        const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', [role]);
        
        if (roleResult.rows.length === 0) {
          logger.warn(`更新用户角色失败：角色不存在 [${requestId}]`, {
            requestId,
            userId: id,
            username: user.username,
            role,
            operatorId,
            timestamp: new Date().toISOString()
          });
          
          return res.status(404).json({
            success: false,
            message: '角色不存在'
          });
        }
        
        roleId = roleResult.rows[0].id;
      } catch (roleError) {
        logger.error(`查询角色信息时发生错误 [${requestId}]`, {
          requestId,
          userId: id,
          username: user.username,
          role,
          error: roleError.message,
          stack: roleError.stack,
          timestamp: new Date().toISOString()
        });
        
        return res.status(500).json({
          success: false,
          message: '查询角色信息失败'
        });
      }
      
      // 检查用户是否已有角色
      let existingRole;
      try {
        const existingRoleResult = await pool.query(
          'SELECT role_id FROM user_roles WHERE user_id = $1',
          [id]
        );
        
        existingRole = existingRoleResult.rows;
      } catch (existingRoleError) {
        logger.error(`查询用户现有角色时发生错误 [${requestId}]`, {
          requestId,
          userId: id,
          username: user.username,
          error: existingRoleError.message,
          stack: existingRoleError.stack,
          timestamp: new Date().toISOString()
        });
        
        return res.status(500).json({
          success: false,
          message: '查询用户现有角色失败'
        });
      }
      
      // 更新或分配角色
      try {
        if (existingRole.length > 0) {
          // 更新现有角色
          await pool.query(
            'UPDATE user_roles SET role_id = $1, assigned_at = NOW(), assigned_by = $2 WHERE user_id = $3',
            [roleId, operatorId, id]
          );
          
          logger.info(`用户角色更新成功 [${requestId}]`, {
            requestId,
            userId: id,
            username: user.username,
            newRole: role,
            previousRoleId: existingRole[0].role_id,
            operatorId,
            timestamp: new Date().toISOString()
          });
        } else {
          // 分配新角色
          await pool.query(
            'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3)',
            [id, roleId, operatorId]
          );
          
          logger.info(`用户角色分配成功 [${requestId}]`, {
            requestId,
            userId: id,
            username: user.username,
            newRole: role,
            operatorId,
            timestamp: new Date().toISOString()
          });
        }
      } catch (assignError) {
        logger.error(`更新用户角色时发生错误 [${requestId}]`, {
          requestId,
          userId: id,
          username: user.username,
          role,
          roleId,
          operatorId,
          error: assignError.message,
          stack: assignError.stack,
          timestamp: new Date().toISOString()
        });
        
        return res.status(500).json({
          success: false,
          message: '更新用户角色失败'
        });
      }
      
      const duration = Date.now() - startTime;
      logger.info(`用户角色更新操作完成 [${requestId}]`, {
        requestId,
        userId: id,
        username: user.username,
        role,
        operatorId,
        action: existingRole.length > 0 ? 'update' : 'assign',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.status(200).json({
        success: true,
        message: '用户角色更新成功',
        data: {
          userId: id,
          role: role
        }
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`用户角色更新失败 [${requestId}]`, {
        requestId,
        userId: req.params.id,
        role: req.body.role,
        operatorId: req.user?.sub,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取用户角色
  async getUserRole(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      const { id } = req.params;
      const requesterId = req.user?.sub; // 请求人ID
      
      logger.info(`开始获取用户角色 [${requestId}]`, {
        requestId,
        userId: id,
        requesterId,
        timestamp: new Date().toISOString()
      });
      
      // 验证用户是否存在
      let user;
      try {
        const userResult = await pool.query(
          'SELECT id, username FROM users WHERE id = $1',
          [id]
        );
        
        if (userResult.rows.length === 0) {
          logger.warn(`获取用户角色失败：用户不存在 [${requestId}]`, {
            requestId,
            userId: id,
            requesterId,
            timestamp: new Date().toISOString()
          });
          
          return res.status(404).json({
            success: false,
            message: '用户不存在'
          });
        }
        
        user = userResult.rows[0];
      } catch (userError) {
        logger.error(`查询用户信息时发生错误 [${requestId}]`, {
          requestId,
          userId: id,
          error: userError.message,
          stack: userError.stack,
          timestamp: new Date().toISOString()
        });
        
        return res.status(500).json({
          success: false,
          message: '查询用户信息失败'
        });
      }
      
      // 获取用户角色
      let role;
      try {
        const roleResult = await pool.query(
          `SELECT r.name as role 
           FROM user_roles ur 
           JOIN roles r ON ur.role_id = r.id 
           WHERE ur.user_id = $1`,
          [id]
        );
        
        role = roleResult.rows.length > 0 ? roleResult.rows[0].role : null;
        
        logger.info(`用户角色查询成功 [${requestId}]`, {
          requestId,
          userId: id,
          username: user.username,
          role: role || '无角色',
          requesterId,
          timestamp: new Date().toISOString()
        });
      } catch (roleError) {
        logger.error(`查询用户角色时发生错误 [${requestId}]`, {
          requestId,
          userId: id,
          username: user.username,
          error: roleError.message,
          stack: roleError.stack,
          timestamp: new Date().toISOString()
        });
        
        return res.status(500).json({
          success: false,
          message: '查询用户角色失败'
        });
      }
      
      const duration = Date.now() - startTime;
      logger.info(`获取用户角色操作完成 [${requestId}]`, {
        requestId,
        userId: id,
        username: user.username,
        role: role || '无角色',
        requesterId,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.status(200).json({
        success: true,
        message: '获取用户角色成功',
        data: {
          userId: user.id,
          username: user.username,
          role: role
        }
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`获取用户角色失败 [${requestId}]`, {
        requestId,
        userId: req.params.id,
        requesterId: req.user?.sub,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取当前用户资料
  async getProfile(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      // 从JWT token中获取用户ID
      const userId = req.user.sub;
      
      logger.info(`开始获取用户资料 [${requestId}]`, {
        requestId,
        userId,
        timestamp: new Date().toISOString()
      });
      
      // 查询用户信息
      let user;
      try {
        const userResult = await pool.query(
          `SELECT id, username, email, display_name, avatar_url, is_active, created_at, updated_at
           FROM users WHERE id = $1`,
          [userId]
        );
        
        if (userResult.rows.length === 0) {
          logger.warn(`获取用户资料失败：用户不存在 [${requestId}]`, {
            requestId,
            userId,
            timestamp: new Date().toISOString()
          });
          
          return res.status(404).json({
            success: false,
            message: '用户不存在'
          });
        }
        
        user = userResult.rows[0];
        
        logger.info(`用户基本信息查询成功 [${requestId}]`, {
          requestId,
          userId,
          username: user.username,
          timestamp: new Date().toISOString()
        });
      } catch (userError) {
        logger.error(`查询用户基本信息时发生错误 [${requestId}]`, {
          requestId,
          userId,
          error: userError.message,
          stack: userError.stack,
          timestamp: new Date().toISOString()
        });
        
        return res.status(500).json({
          success: false,
          message: '查询用户信息失败'
        });
      }
      
      // 查询用户角色
      let userRole = 'user'; // 默认角色
      try {
        const roleResult = await pool.query(
          `SELECT r.name as role 
           FROM user_roles ur 
           JOIN roles r ON ur.role_id = r.id 
           WHERE ur.user_id = $1`,
          [userId]
        );
        
        if (roleResult.rows.length > 0) {
          userRole = roleResult.rows[0].role;
        }
        
        logger.info(`用户角色查询成功 [${requestId}]`, {
          requestId,
          userId,
          username: user.username,
          role: userRole,
          timestamp: new Date().toISOString()
        });
      } catch (roleError) {
        logger.warn(`获取用户角色失败，使用默认角色 [${requestId}]`, {
          requestId,
          userId,
          username: user.username,
          error: roleError.message,
          defaultRole: userRole,
          timestamp: new Date().toISOString()
        });
      }
      
      // 添加角色信息到用户对象
      user.role = userRole;
      
      const duration = Date.now() - startTime;
      logger.info(`获取用户资料操作完成 [${requestId}]`, {
        requestId,
        userId,
        username: user.username,
        role: userRole,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.status(200).json({
        success: true,
        message: '获取用户资料成功',
        data: user
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`获取用户资料失败 [${requestId}]`, {
        requestId,
        userId: req.user?.sub,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 更新当前用户资料
  async updateProfile(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      // 从JWT token中获取用户ID
      const userId = req.user.sub;
      const { displayName, email, avatar_url } = req.body;
      
      logger.info(`开始更新用户资料 [${requestId}]`, {
        requestId,
        userId,
        updateFields: {
          displayName: displayName !== undefined,
          email: email !== undefined,
          avatar_url: avatar_url !== undefined
        },
        timestamp: new Date().toISOString()
      });
      
      // 验证用户是否存在
      let user;
      try {
        const userResult = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [userId]);
        
        if (userResult.rows.length === 0) {
          logger.warn(`更新用户资料失败：用户不存在 [${requestId}]`, {
            requestId,
            userId,
            timestamp: new Date().toISOString()
          });
          
          return res.status(404).json({
            success: false,
            message: '用户不存在'
          });
        }
        
        user = userResult.rows[0];
      } catch (userError) {
        logger.error(`查询用户信息时发生错误 [${requestId}]`, {
          requestId,
          userId,
          error: userError.message,
          stack: userError.stack,
          timestamp: new Date().toISOString()
        });
        
        return res.status(500).json({
          success: false,
          message: '查询用户信息失败'
        });
      }
      
      // 如果更新邮箱，检查邮箱是否已被其他用户使用
      if (email && email !== user.email) {
        try {
          const emailCheckResult = await pool.query(
            'SELECT id FROM users WHERE email = $1 AND id != $2',
            [email, userId]
          );
          
          if (emailCheckResult.rows.length > 0) {
            logger.warn(`更新用户资料失败：邮箱已被其他用户使用 [${requestId}]`, {
              requestId,
              userId,
              username: user.username,
              newEmail: email,
              timestamp: new Date().toISOString()
            });
            
            return res.status(409).json({
              success: false,
              message: '邮箱已被其他用户使用'
            });
          }
        } catch (emailCheckError) {
          logger.error(`检查邮箱唯一性时发生错误 [${requestId}]`, {
            requestId,
            userId,
            username: user.username,
            newEmail: email,
            error: emailCheckError.message,
            stack: emailCheckError.stack,
            timestamp: new Date().toISOString()
          });
          
          return res.status(500).json({
            success: false,
            message: '检查邮箱唯一性失败'
          });
        }
      }
      
      // 构建更新字段
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;
      
      if (displayName !== undefined) {
        updateFields.push(`display_name = $${paramIndex++}`);
        updateValues.push(displayName);
      }
      
      if (email !== undefined && email !== user.email) {
        updateFields.push(`email = $${paramIndex++}`);
        updateValues.push(email);
      }
      
      if (avatar_url !== undefined) {
        updateFields.push(`avatar_url = $${paramIndex++}`);
        updateValues.push(avatar_url);
      }
      
      if (updateFields.length === 0) {
        logger.warn(`更新用户资料失败：没有提供要更新的字段 [${requestId}]`, {
          requestId,
          userId,
          username: user.username,
          timestamp: new Date().toISOString()
        });
        
        return res.status(400).json({
          success: false,
          message: '没有提供要更新的字段'
        });
      }
      
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(userId);
      
      // 执行更新
      let updatedUser;
      try {
        const updateQuery = `
          UPDATE users 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING id, username, email, display_name, avatar_url, is_active, updated_at
        `;
        
        const result = await pool.query(updateQuery, updateValues);
        updatedUser = result.rows[0];
        
        logger.info(`用户资料更新成功 [${requestId}]`, {
          requestId,
          userId,
          username: updatedUser.username,
          updatedFields: updateFields.slice(0, -1), // 排除 updated_at
          timestamp: new Date().toISOString()
        });
      } catch (updateError) {
        logger.error(`更新用户资料时发生错误 [${requestId}]`, {
          requestId,
          userId,
          username: user.username,
          updateFields,
          error: updateError.message,
          stack: updateError.stack,
          timestamp: new Date().toISOString()
        });
        
        return res.status(500).json({
          success: false,
          message: '更新用户资料失败'
        });
      }
      
      const duration = Date.now() - startTime;
      logger.info(`更新用户资料操作完成 [${requestId}]`, {
        requestId,
        userId,
        username: updatedUser.username,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.status(200).json({
        success: true,
        message: '用户资料更新成功',
        data: updatedUser
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`更新用户资料失败 [${requestId}]`, {
        requestId,
        userId: req.user?.sub,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 修改密码
  async changePassword(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      // 从JWT token中获取用户ID
      const userId = req.user.sub;
      const { currentPassword, newPassword } = req.body;
      
      logger.info(`开始修改用户密码 [${requestId}]`, {
        requestId,
        userId,
        timestamp: new Date().toISOString()
      });
      
      // 验证必填字段
      if (!currentPassword || !newPassword) {
        logger.warn(`修改用户密码失败：缺少必要参数 [${requestId}]`, {
          requestId,
          userId,
          hasCurrentPassword: !!currentPassword,
          hasNewPassword: !!newPassword,
          timestamp: new Date().toISOString()
        });
        
        return res.status(400).json({
          success: false,
          message: '当前密码和新密码为必填项'
        });
      }
      
      // 验证新密码长度
      // 强密码策略（同注册）
      const strongPwd = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
      if (!strongPwd.test(newPassword)) {
        logger.warn(`修改用户密码失败：新密码不符合强密码策略 [${requestId}]`, {
          requestId,
          userId,
          newPasswordLength: newPassword.length,
          timestamp: new Date().toISOString()
        });
        
        return res.status(400).json({ 
          success: false, 
          message: '新密码需包含大小写、数字、特殊字符且至少8位' 
        });
      }
      
      // 查询用户
      let user;
      try {
        const userResult = await pool.query(
          'SELECT id, username, password_hash FROM users WHERE id = $1',
          [userId]
        );
        
        if (userResult.rows.length === 0) {
          logger.warn(`修改用户密码失败：用户不存在 [${requestId}]`, {
            requestId,
            userId,
            timestamp: new Date().toISOString()
          });
          
          return res.status(404).json({
            success: false,
            message: '用户不存在'
          });
        }
        
        user = userResult.rows[0];
      } catch (userError) {
        logger.error(`查询用户信息时发生错误 [${requestId}]`, {
          requestId,
          userId,
          error: userError.message,
          stack: userError.stack,
          timestamp: new Date().toISOString()
        });
        
        return res.status(500).json({
          success: false,
          message: '查询用户信息失败'
        });
      }
      
      // 验证当前密码
      let isCurrentPasswordValid;
      try {
        isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      } catch (compareError) {
        logger.error(`验证当前密码时发生错误 [${requestId}]`, {
          requestId,
          userId,
          username: user.username,
          error: compareError.message,
          stack: compareError.stack,
          timestamp: new Date().toISOString()
        });
        
        return res.status(500).json({
          success: false,
          message: '验证当前密码失败'
        });
      }
      
      if (!isCurrentPasswordValid) {
        logger.warn(`修改用户密码失败：当前密码错误 [${requestId}]`, {
          requestId,
          userId,
          username: user.username,
          timestamp: new Date().toISOString()
        });
        
        return res.status(400).json({
          success: false,
          message: '当前密码错误'
        });
      }
      
      // 检查新密码是否与当前密码相同
      let isSamePassword;
      try {
        isSamePassword = await bcrypt.compare(newPassword, user.password_hash);
      } catch (compareError) {
        logger.error(`比较新密码与当前密码时发生错误 [${requestId}]`, {
          requestId,
          userId,
          username: user.username,
          error: compareError.message,
          stack: compareError.stack,
          timestamp: new Date().toISOString()
        });
        
        return res.status(500).json({
          success: false,
          message: '验证新密码失败'
        });
      }
      
      if (isSamePassword) {
        logger.warn(`修改用户密码失败：新密码与当前密码相同 [${requestId}]`, {
          requestId,
          userId,
          username: user.username,
          timestamp: new Date().toISOString()
        });
        
        return res.status(400).json({
          success: false,
          message: '新密码不能与当前密码相同'
        });
      }
      
      // 加密新密码
      let hashedNewPassword;
      try {
        const saltRounds = 10;
        hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
      } catch (hashError) {
        logger.error(`加密新密码时发生错误 [${requestId}]`, {
          requestId,
          userId,
          username: user.username,
          error: hashError.message,
          stack: hashError.stack,
          timestamp: new Date().toISOString()
        });
        
        return res.status(500).json({
          success: false,
          message: '加密新密码失败'
        });
      }
      
      // 更新密码
      try {
        await pool.query(
          'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
          [hashedNewPassword, userId]
        );
        
        logger.info(`用户密码修改成功 [${requestId}]`, {
          requestId,
          userId,
          username: user.username,
          timestamp: new Date().toISOString()
        });
      } catch (updateError) {
        logger.error(`更新用户密码时发生错误 [${requestId}]`, {
          requestId,
          userId,
          username: user.username,
          error: updateError.message,
          stack: updateError.stack,
          timestamp: new Date().toISOString()
        });
        
        return res.status(500).json({
          success: false,
          message: '更新密码失败'
        });
      }
      
      const duration = Date.now() - startTime;
      logger.info(`修改用户密码操作完成 [${requestId}]`, {
        requestId,
        userId,
        username: user.username,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.status(200).json({
        success: true,
        message: '密码修改成功'
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`修改用户密码失败 [${requestId}]`, {
        requestId,
        userId: req.user?.sub,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 忘记密码
  async forgotPassword(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      const { email } = req.body;
      
      logger.info(`开始处理忘记密码请求 [${requestId}]`, {
        requestId,
        email: email ? email.substring(0, 3) + '***' : 'null',
        timestamp: new Date().toISOString()
      });
      
      // 验证必填字段
      if (!email) {
        logger.warn(`忘记密码请求失败：缺少必要参数 [${requestId}]`, {
          requestId,
          hasEmail: !!email,
          timestamp: new Date().toISOString()
        });
        
        return res.status(400).json({
          success: false,
          message: '邮箱为必填项'
        });
      }
      
      // 查找用户
      let user;
      try {
        const userResult = await pool.query(
          'SELECT id, username, email FROM users WHERE email = $1',
          [email]
        );
        
        user = userResult.rows[0];
      } catch (userError) {
        logger.error(`查询用户信息时发生错误 [${requestId}]`, {
          requestId,
          email: email.substring(0, 3) + '***',
          error: userError.message,
          stack: userError.stack,
          timestamp: new Date().toISOString()
        });
        
        return res.status(500).json({
          success: false,
          message: '查询用户信息失败'
        });
      }
      
      // 无论用户是否存在都返回成功，避免邮箱枚举攻击
      if (!user) {
        logger.info(`忘记密码请求：邮箱 ${email.substring(0, 3)}*** 不存在，但返回成功 [${requestId}]`, {
          requestId,
          email: email.substring(0, 3) + '***',
          timestamp: new Date().toISOString()
        });
        
        return res.status(200).json({
          success: true,
          message: '如果该邮箱已注册，您将收到密码重置邮件'
        });
      }
      
      // 生成重置令牌
      let resetToken;
      try {
        resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 3600000); // 1小时后过期
        
        // 保存重置令牌到数据库
        await pool.query(
          'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
          [user.id, resetToken, expiresAt]
        );
        
        logger.info(`密码重置令牌已生成 [${requestId}]`, {
          requestId,
          userId: user.id,
          username: user.username,
          email: user.email.substring(0, 3) + '***',
          tokenPrefix: resetToken.substring(0, 8) + '...',
          expiresAt: expiresAt.toISOString(),
          timestamp: new Date().toISOString()
        });
      } catch (tokenError) {
        logger.error(`生成密码重置令牌时发生错误 [${requestId}]`, {
          requestId,
          userId: user.id,
          username: user.username,
          email: user.email.substring(0, 3) + '***',
          error: tokenError.message,
          stack: tokenError.stack,
          timestamp: new Date().toISOString()
        });
        
        return res.status(500).json({
          success: false,
          message: '生成重置令牌失败'
        });
      }
      
      // 这里应该发送邮件，暂时只记录日志
      logger.info(`密码重置邮件发送记录 [${requestId}]`, {
        requestId,
        userId: user.id,
        username: user.username,
        email: user.email.substring(0, 3) + '***',
        tokenPrefix: resetToken.substring(0, 8) + '...',
        note: '实际邮件发送功能待实现',
        timestamp: new Date().toISOString()
      });
      
      // 在实际应用中，这里应该调用邮件服务发送重置链接
      // 例如: await emailService.sendPasswordResetEmail(user.email, resetToken);
      
      const duration = Date.now() - startTime;
      logger.info(`忘记密码请求处理完成 [${requestId}]`, {
        requestId,
        email: email.substring(0, 3) + '***',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.status(200).json({
        success: true,
        message: '如果该邮箱已注册，您将收到密码重置邮件'
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`忘记密码请求处理失败 [${requestId}]`, {
        requestId,
        email: req.body?.email ? req.body.email.substring(0, 3) + '***' : 'null',
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 重置密码
  async resetPassword(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.headers['x-request-id'] || `reset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    // 记录请求开始
    logger.info(`[Request:${requestId}] 开始处理密码重置请求`, {
      requestId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    try {
      const { token, newPassword } = req.body;
      
      // 验证必填字段
      if (!token || !newPassword) {
        logger.warn(`[Request:${requestId}] 密码重置请求缺少必要参数`, {
          requestId,
          hasToken: !!token,
          hasNewPassword: !!newPassword,
          processingTime: Date.now() - startTime
        });
        
        return res.status(400).json({
          success: false,
          message: '重置令牌和新密码为必填项'
        });
      }
      
      // 验证新密码强度
      const strongPwd = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
      if (!strongPwd.test(newPassword)) {
        logger.warn(`[Request:${requestId}] 新密码不符合强密码策略`, {
          requestId,
          passwordLength: newPassword ? newPassword.length : 0,
          processingTime: Date.now() - startTime
        });
        
        return res.status(400).json({
          success: false,
          message: '新密码需包含大小写、数字、特殊字符且至少8位'
        });
      }
      
      logger.info(`[Request:${requestId}] 验证密码重置令牌`, {
        requestId,
        token: token.substring(0, 8) + '...' // 只记录令牌前8位，避免泄露完整令牌
      });
      
      // 查找有效的重置令牌
      const tokenResult = await pool.query(
        `SELECT t.user_id, u.username 
         FROM password_reset_tokens t
         JOIN users u ON t.user_id = u.id
         WHERE t.token = $1 AND t.expires_at > NOW() AND t.is_used = false`,
        [token]
      );
      
      if (tokenResult.rows.length === 0) {
        logger.warn(`[Request:${requestId}] 密码重置令牌无效或已过期`, {
          requestId,
          tokenPrefix: token.substring(0, 8) + '...',
          processingTime: Date.now() - startTime
        });
        
        return res.status(400).json({
          success: false,
          message: '重置令牌无效或已过期'
        });
      }
      
      const { user_id, username } = tokenResult.rows[0];
      
      logger.info(`[Request:${requestId}] 密码重置令牌验证成功，开始重置用户密码`, {
        requestId,
        userId: user_id,
        username,
        tokenPrefix: token.substring(0, 8) + '...'
      });
      
      // 加密新密码
      const saltRounds = 10;
      let hashedNewPassword;
      
      try {
        hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
        logger.info(`[Request:${requestId}] 新密码加密成功`, {
          requestId,
          userId: user_id,
          username
        });
      } catch (hashError) {
        logger.error(`[Request:${requestId}] 加密新密码失败`, {
          requestId,
          userId: user_id,
          username,
          error: hashError.message,
          stack: hashError.stack,
          processingTime: Date.now() - startTime
        });
        
        return res.status(500).json({
          success: false,
          message: '密码加密失败，请重试'
        });
      }
      
      // 开始事务
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // 更新用户密码
        await client.query(
          'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
          [hashedNewPassword, user_id]
        );
        
        // 标记令牌为已使用
        await client.query(
          'UPDATE password_reset_tokens SET is_used = true WHERE token = $1',
          [token]
        );
        
        await client.query('COMMIT');
        
        logger.info(`[Request:${requestId}] 密码重置成功`, {
          requestId,
          userId: user_id,
          username,
          processingTime: Date.now() - startTime
        });
        
        res.status(200).json({
          success: true,
          message: '密码重置成功'
        });
        
      } catch (transactionError) {
        await client.query('ROLLBACK');
        
        logger.error(`[Request:${requestId}] 密码重置事务失败`, {
          requestId,
          userId: user_id,
          username,
          error: transactionError.message,
          stack: transactionError.stack,
          processingTime: Date.now() - startTime
        });
        
        return res.status(500).json({
          success: false,
          message: '密码重置失败，请重试'
        });
      } finally {
        client.release();
      }
      
    } catch (error) {
      logger.error(`[Request:${requestId}] 密码重置处理失败`, {
        requestId,
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取用户设置
  async getUserSettings(req, res) {
    try {
      // 从JWT token中获取用户ID
      const userId = req.user.sub;
      
      // 查询用户设置
      const settingsResult = await pool.query(
        'SELECT setting_key, setting_value FROM user_settings WHERE user_id = $1',
        [userId]
      );
      
      // 将设置转换为键值对对象
      const settings = {};
      settingsResult.rows.forEach(row => {
        settings[row.setting_key] = row.setting_value;
      });
      
      logger.info(`获取用户设置成功: 用户ID ${userId}`);
      
      res.status(200).json({
        success: true,
        message: '获取用户设置成功',
        data: settings
      });
      
    } catch (error) {
      logger.error('获取用户设置失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 更新用户设置
  async updateUserSettings(req, res) {
    try {
      // 从JWT token中获取用户ID
      const userId = req.user.sub;
      const { settings } = req.body;
      
      // 验证设置对象
      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({
          success: false,
          message: '设置对象为必填项'
        });
      }
      
      // 开始事务
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // 遍历设置并更新
        for (const [key, value] of Object.entries(settings)) {
          // 使用UPSERT操作更新或插入设置
          await client.query(
            `INSERT INTO user_settings (user_id, setting_key, setting_value)
             VALUES ($1, $2, $3)
             ON CONFLICT (user_id, setting_key)
             DO UPDATE SET setting_value = $3, updated_at = NOW()`,
            [userId, key, value]
          );
        }
        
        await client.query('COMMIT');
        
        logger.info(`用户设置更新成功: 用户ID ${userId}`);
        
        res.status(200).json({
          success: true,
          message: '用户设置更新成功',
          data: settings
        });
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      logger.error('更新用户设置失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 移除用户角色
  async removeUserRole(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.headers['x-request-id'] || `remove_role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    // 获取操作者ID（从JWT token中获取）
    const operatorId = req.user ? req.user.sub : 'unknown';
    
    // 记录请求开始
    logger.info(`[Request:${requestId}] 开始处理移除用户角色请求`, {
      requestId,
      operatorId,
      targetUserId: req.params.id,
      roleId: req.params.roleId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    try {
      const { id, roleId } = req.params;
      
      // 验证用户是否存在
      let userResult;
      try {
        userResult = await pool.query('SELECT id, username FROM users WHERE id = $1', [id]);
        
        if (userResult.rows.length === 0) {
          logger.warn(`[Request:${requestId}] 尝试移除不存在用户的角色`, {
            requestId,
            operatorId,
            targetUserId: id,
            roleId,
            processingTime: Date.now() - startTime
          });
          
          return res.status(404).json({
            success: false,
            message: '用户不存在'
          });
        }
      } catch (queryError) {
        logger.error(`[Request:${requestId}] 查询用户信息失败`, {
          requestId,
          operatorId,
          targetUserId: id,
          roleId,
          error: queryError.message,
          stack: queryError.stack,
          processingTime: Date.now() - startTime
        });
        
        return res.status(500).json({
          success: false,
          message: '查询用户信息失败'
        });
      }
      
      const user = userResult.rows[0];
      
      // 验证角色是否存在
      let roleResult;
      try {
        roleResult = await pool.query('SELECT id, name FROM roles WHERE id = $1', [roleId]);
        
        if (roleResult.rows.length === 0) {
          logger.warn(`[Request:${requestId}] 尝试移除不存在的角色`, {
            requestId,
            operatorId,
            targetUserId: id,
            username: user.username,
            roleId,
            processingTime: Date.now() - startTime
          });
          
          return res.status(404).json({
            success: false,
            message: '角色不存在'
          });
        }
      } catch (queryError) {
        logger.error(`[Request:${requestId}] 查询角色信息失败`, {
          requestId,
          operatorId,
          targetUserId: id,
          username: user.username,
          roleId,
          error: queryError.message,
          stack: queryError.stack,
          processingTime: Date.now() - startTime
        });
        
        return res.status(500).json({
          success: false,
          message: '查询角色信息失败'
        });
      }
      
      const role = roleResult.rows[0];
      
      // 检查用户是否拥有该角色
      let userRoleResult;
      try {
        userRoleResult = await pool.query(
          'SELECT id FROM user_roles WHERE user_id = $1 AND role_id = $2',
          [id, roleId]
        );
        
        if (userRoleResult.rows.length === 0) {
          logger.warn(`[Request:${requestId}] 用户未拥有该角色，无法移除`, {
            requestId,
            operatorId,
            targetUserId: id,
            username: user.username,
            roleId,
            roleName: role.name,
            processingTime: Date.now() - startTime
          });
          
          return res.status(404).json({
            success: false,
            message: '用户未拥有该角色'
          });
        }
      } catch (queryError) {
        logger.error(`[Request:${requestId}] 查询用户角色关系失败`, {
          requestId,
          operatorId,
          targetUserId: id,
          username: user.username,
          roleId,
          roleName: role.name,
          error: queryError.message,
          stack: queryError.stack,
          processingTime: Date.now() - startTime
        });
        
        return res.status(500).json({
          success: false,
          message: '查询用户角色关系失败'
        });
      }
      
      // 移除用户角色
      try {
        await pool.query(
          'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2',
          [id, roleId]
        );
        
        logger.info(`[Request:${requestId}] 用户角色移除成功`, {
          requestId,
          operatorId,
          targetUserId: id,
          username: user.username,
          roleId,
          roleName: role.name,
          processingTime: Date.now() - startTime
        });
        
        res.status(200).json({
          success: true,
          message: '用户角色移除成功',
          data: {
            userId: id,
            roleId: roleId,
            roleName: role.name
          }
        });
      } catch (deleteError) {
        logger.error(`[Request:${requestId}] 移除用户角色失败`, {
          requestId,
          operatorId,
          targetUserId: id,
          username: user.username,
          roleId,
          roleName: role.name,
          error: deleteError.message,
          stack: deleteError.stack,
          processingTime: Date.now() - startTime
        });
        
        res.status(500).json({
          success: false,
          message: '移除用户角色失败'
        });
      }
      
    } catch (error) {
      logger.error(`[Request:${requestId}] 移除用户角色处理失败`, {
        requestId,
        operatorId,
        targetUserId: req.params.id,
        roleId: req.params.roleId,
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取当前用户角色
  async getCurrentUserRoles(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.headers['x-request-id'] || `get_roles_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    // 从JWT token中获取用户ID
    const userId = req.user.sub;
    
    // 记录请求开始
    logger.info(`[Request:${requestId}] 开始获取当前用户角色`, {
      requestId,
      userId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    try {
      // 获取用户角色
      let rolesResult;
      try {
        rolesResult = await pool.query(
          `SELECT r.id, r.name, r.description, r.level, ur.assigned_at
           FROM user_roles ur
           JOIN roles r ON ur.role_id = r.id
           WHERE ur.user_id = $1`,
          [userId]
        );
        
        logger.info(`[Request:${requestId}] 用户角色查询成功`, {
          requestId,
          userId,
          roleCount: rolesResult.rows.length,
          processingTime: Date.now() - startTime
        });
      } catch (queryError) {
        logger.error(`[Request:${requestId}] 查询用户角色失败`, {
          requestId,
          userId,
          error: queryError.message,
          stack: queryError.stack,
          processingTime: Date.now() - startTime
        });
        
        return res.status(500).json({
          success: false,
          message: '查询用户角色失败'
        });
      }
      
      const roles = rolesResult.rows;
      
      logger.info(`[Request:${requestId}] 获取当前用户角色成功`, {
        requestId,
        userId,
        roleCount: roles.length,
        processingTime: Date.now() - startTime
      });
      
      res.status(200).json({
        success: true,
        message: '获取当前用户角色成功',
        data: roles
      });
      
    } catch (error) {
      logger.error(`[Request:${requestId}] 获取当前用户角色处理失败`, {
        requestId,
        userId,
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取当前用户权限
  async getCurrentUserPermissions(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.headers['x-request-id'] || `get_perms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    // 从JWT token中获取用户ID
    const userId = req.user.sub;
    
    // 记录请求开始
    logger.info(`[Request:${requestId}] 开始获取当前用户权限`, {
      requestId,
      userId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    try {
      // 获取用户权限
      let permissionsResult;
      try {
        permissionsResult = await pool.query(
          `SELECT DISTINCT p.id, p.name, p.code, p.description, p.resource, p.action
           FROM user_roles ur
           JOIN role_permissions rp ON ur.role_id = rp.role_id
           JOIN permissions p ON rp.permission_id = p.id
           WHERE ur.user_id = $1`,
          [userId]
        );
        
        logger.info(`[Request:${requestId}] 用户权限查询成功`, {
          requestId,
          userId,
          permissionCount: permissionsResult.rows.length,
          processingTime: Date.now() - startTime
        });
      } catch (queryError) {
        logger.error(`[Request:${requestId}] 查询用户权限失败`, {
          requestId,
          userId,
          error: queryError.message,
          stack: queryError.stack,
          processingTime: Date.now() - startTime
        });
        
        return res.status(500).json({
          success: false,
          message: '查询用户权限失败'
        });
      }
      
      const permissions = permissionsResult.rows;
      
      logger.info(`[Request:${requestId}] 获取当前用户权限成功`, {
        requestId,
        userId,
        permissionCount: permissions.length,
        processingTime: Date.now() - startTime
      });
      
      res.status(200).json({
        success: true,
        message: '获取当前用户权限成功',
        data: permissions
      });
      
    } catch (error) {
      logger.error(`[Request:${requestId}] 获取当前用户权限处理失败`, {
        requestId,
        userId,
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取当前用户会话列表
  async getCurrentUserSessions(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.headers['x-request-id'] || `get_sessions_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    // 从JWT token中获取用户ID
    const userId = req.user.sub;
    
    // 记录请求开始
    logger.info(`[Request:${requestId}] 开始获取当前用户会话列表`, {
      requestId,
      userId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    try {
      // 获取用户会话
      let sessionsResult;
      try {
        sessionsResult = await pool.query(
          `SELECT id, session_token, ip_address, user_agent, is_active, created_at, last_accessed_at, expires_at
           FROM user_sessions
           WHERE user_id = $1
           ORDER BY last_accessed_at DESC`,
          [userId]
        );
        
        logger.info(`[Request:${requestId}] 用户会话查询成功`, {
          requestId,
          userId,
          sessionCount: sessionsResult.rows.length,
          processingTime: Date.now() - startTime
        });
      } catch (queryError) {
        logger.error(`[Request:${requestId}] 查询用户会话失败`, {
          requestId,
          userId,
          error: queryError.message,
          stack: queryError.stack,
          processingTime: Date.now() - startTime
        });
        
        return res.status(500).json({
          success: false,
          message: '查询用户会话失败'
        });
      }
      
      const sessions = sessionsResult.rows;
      
      logger.info(`[Request:${requestId}] 获取当前用户会话列表成功`, {
        requestId,
        userId,
        sessionCount: sessions.length,
        processingTime: Date.now() - startTime
      });
      
      res.status(200).json({
        success: true,
        message: '获取当前用户会话列表成功',
        data: sessions
      });
      
    } catch (error) {
      logger.error(`[Request:${requestId}] 获取当前用户会话列表处理失败`, {
        requestId,
        userId,
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 终止当前用户会话
  async terminateCurrentUserSession(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.headers['x-request-id'] || `terminate_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    // 从JWT token中获取用户ID
    const userId = req.user.sub;
    const { sessionId } = req.params;
    
    // 记录请求开始
    logger.info(`[Request:${requestId}] 开始终止当前用户会话`, {
      requestId,
      userId,
      sessionId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    try {
      // 验证会话是否存在且属于当前用户
      let sessionResult;
      try {
        sessionResult = await pool.query(
          'SELECT id FROM user_sessions WHERE id = $1 AND user_id = $2 AND is_active = TRUE',
          [sessionId, userId]
        );
        
        if (sessionResult.rows.length === 0) {
          logger.warn(`[Request:${requestId}] 尝试终止不存在或不属于当前用户的会话`, {
            requestId,
            userId,
            sessionId,
            processingTime: Date.now() - startTime
          });
          
          return res.status(404).json({
            success: false,
            message: '会话不存在或已失效'
          });
        }
      } catch (queryError) {
        logger.error(`[Request:${requestId}] 查询用户会话失败`, {
          requestId,
          userId,
          sessionId,
          error: queryError.message,
          stack: queryError.stack,
          processingTime: Date.now() - startTime
        });
        
        return res.status(500).json({
          success: false,
          message: '查询用户会话失败'
        });
      }
      
      // 终止会话
      try {
        await pool.query(
          'UPDATE user_sessions SET is_active = FALSE WHERE id = $1',
          [sessionId]
        );
        
        logger.info(`[Request:${requestId}] 当前用户会话终止成功`, {
          requestId,
          userId,
          sessionId,
          processingTime: Date.now() - startTime
        });
        
        res.status(200).json({
          success: true,
          message: '会话终止成功',
          data: {
            sessionId: sessionId
          }
        });
      } catch (updateError) {
        logger.error(`[Request:${requestId}] 终止用户会话失败`, {
          requestId,
          userId,
          sessionId,
          error: updateError.message,
          stack: updateError.stack,
          processingTime: Date.now() - startTime
        });
        
        res.status(500).json({
          success: false,
          message: '终止用户会话失败'
        });
      }
      
    } catch (error) {
      logger.error(`[Request:${requestId}] 终止当前用户会话处理失败`, {
        requestId,
        userId,
        sessionId,
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取用户会话列表
  async getUserSessions(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.headers['x-request-id'] || `get_user_sessions_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    // 获取操作者ID（从JWT token中获取）
    const operatorId = req.user ? req.user.sub : 'unknown';
    const { id } = req.params;
    
    // 记录请求开始
    logger.info(`[Request:${requestId}] 开始获取用户会话列表`, {
      requestId,
      operatorId,
      targetUserId: id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    try {
      // 验证用户是否存在
      let userResult;
      try {
        userResult = await pool.query('SELECT id, username FROM users WHERE id = $1', [id]);
        
        if (userResult.rows.length === 0) {
          logger.warn(`[Request:${requestId}] 尝试获取不存在用户的会话列表`, {
            requestId,
            operatorId,
            targetUserId: id,
            processingTime: Date.now() - startTime
          });
          
          return res.status(404).json({
            success: false,
            message: '用户不存在'
          });
        }
      } catch (queryError) {
        logger.error(`[Request:${requestId}] 查询用户信息失败`, {
          requestId,
          operatorId,
          targetUserId: id,
          error: queryError.message,
          stack: queryError.stack,
          processingTime: Date.now() - startTime
        });
        
        return res.status(500).json({
          success: false,
          message: '查询用户信息失败'
        });
      }
      
      const user = userResult.rows[0];
      
      // 获取用户会话
      let sessionsResult;
      try {
        sessionsResult = await pool.query(
          `SELECT id, session_token, ip_address, user_agent, is_active, created_at, last_accessed_at, expires_at
           FROM user_sessions
           WHERE user_id = $1
           ORDER BY last_accessed_at DESC`,
          [id]
        );
        
        logger.info(`[Request:${requestId}] 用户会话查询成功`, {
          requestId,
          operatorId,
          targetUserId: id,
          username: user.username,
          sessionCount: sessionsResult.rows.length,
          processingTime: Date.now() - startTime
        });
      } catch (queryError) {
        logger.error(`[Request:${requestId}] 查询用户会话失败`, {
          requestId,
          operatorId,
          targetUserId: id,
          username: user.username,
          error: queryError.message,
          stack: queryError.stack,
          processingTime: Date.now() - startTime
        });
        
        return res.status(500).json({
          success: false,
          message: '查询用户会话失败'
        });
      }
      
      const sessions = sessionsResult.rows;
      
      logger.info(`[Request:${requestId}] 获取用户会话列表成功`, {
        requestId,
        operatorId,
        targetUserId: id,
        username: user.username,
        sessionCount: sessions.length,
        processingTime: Date.now() - startTime
      });
      
      res.status(200).json({
        success: true,
        message: '获取用户会话列表成功',
        data: {
          userId: id,
          username: user.username,
          sessions: sessions
        }
      });
      
    } catch (error) {
      logger.error(`[Request:${requestId}] 获取用户会话列表处理失败`, {
        requestId,
        operatorId,
        targetUserId: id,
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 终止用户会话
  async terminateUserSession(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.headers['x-request-id'] || `terminate_user_session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    // 获取操作者ID（从JWT token中获取）
    const operatorId = req.user ? req.user.sub : 'unknown';
    const { id, sessionId } = req.params;
    
    // 记录请求开始
    logger.info(`[Request:${requestId}] 开始终止用户会话`, {
      requestId,
      operatorId,
      targetUserId: id,
      sessionId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    try {
      // 验证用户是否存在
      let userResult;
      try {
        userResult = await pool.query('SELECT id, username FROM users WHERE id = $1', [id]);
        
        if (userResult.rows.length === 0) {
          logger.warn(`[Request:${requestId}] 尝试终止不存在用户的会话`, {
            requestId,
            operatorId,
            targetUserId: id,
            sessionId,
            processingTime: Date.now() - startTime
          });
          
          return res.status(404).json({
            success: false,
            message: '用户不存在'
          });
        }
      } catch (queryError) {
        logger.error(`[Request:${requestId}] 查询用户信息失败`, {
          requestId,
          operatorId,
          targetUserId: id,
          sessionId,
          error: queryError.message,
          stack: queryError.stack,
          processingTime: Date.now() - startTime
        });
        
        return res.status(500).json({
          success: false,
          message: '查询用户信息失败'
        });
      }
      
      const user = userResult.rows[0];
      
      // 验证会话是否存在且属于该用户
      let sessionResult;
      try {
        sessionResult = await pool.query(
          'SELECT id FROM user_sessions WHERE id = $1 AND user_id = $2 AND is_active = TRUE',
          [sessionId, id]
        );
        
        if (sessionResult.rows.length === 0) {
          logger.warn(`[Request:${requestId}] 尝试终止不存在或不属于该用户的会话`, {
            requestId,
            operatorId,
            targetUserId: id,
            sessionId,
            username: user.username,
            processingTime: Date.now() - startTime
          });
          
          return res.status(404).json({
            success: false,
            message: '会话不存在或已失效'
          });
        }
      } catch (queryError) {
        logger.error(`[Request:${requestId}] 查询用户会话失败`, {
          requestId,
          operatorId,
          targetUserId: id,
          sessionId,
          username: user.username,
          error: queryError.message,
          stack: queryError.stack,
          processingTime: Date.now() - startTime
        });
        
        return res.status(500).json({
          success: false,
          message: '查询用户会话失败'
        });
      }
      
      // 终止会话
      try {
        await pool.query(
          'UPDATE user_sessions SET is_active = FALSE WHERE id = $1',
          [sessionId]
        );
        
        logger.info(`[Request:${requestId}] 用户会话终止成功`, {
          requestId,
          operatorId,
          targetUserId: id,
          sessionId,
          username: user.username,
          processingTime: Date.now() - startTime
        });
      } catch (updateError) {
        logger.error(`[Request:${requestId}] 终止用户会话失败`, {
          requestId,
          operatorId,
          targetUserId: id,
          sessionId,
          username: user.username,
          error: updateError.message,
          stack: updateError.stack,
          processingTime: Date.now() - startTime
        });
        
        return res.status(500).json({
          success: false,
          message: '终止用户会话失败'
        });
      }
      
      res.status(200).json({
        success: true,
        message: '会话终止成功',
        data: {
          userId: id,
          username: user.username,
          sessionId: sessionId
        }
      });
      
    } catch (error) {
      logger.error(`[Request:${requestId}] 终止用户会话处理失败`, {
        requestId,
        operatorId,
        targetUserId: id,
        sessionId,
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取当前用户通知渠道
  async getCurrentUserNotificationChannels(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.headers['x-request-id'] || `get_notification_channels_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    // 获取操作者ID（从JWT token中获取）
    const operatorId = req.user ? req.user.sub : 'unknown';
    const userId = operatorId; // 当前用户获取自己的通知渠道
    
    // 记录请求开始
    logger.info(`[Request:${requestId}] 开始获取当前用户通知渠道`, {
      requestId,
      operatorId,
      userId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    try {
      // 获取用户通知渠道
      let channelsResult;
      try {
        channelsResult = await pool.query(
          `SELECT nc.id, nc.name, nc.type, nc.description, nc.is_active, nc.created_at, nc.updated_at
           FROM notification_channels nc
           WHERE nc.user_id = $1
           ORDER BY nc.created_at DESC`,
          [userId]
        );
        
        logger.info(`[Request:${requestId}] 用户通知渠道查询成功`, {
          requestId,
          operatorId,
          userId,
          channelCount: channelsResult.rows.length,
          processingTime: Date.now() - startTime
        });
      } catch (queryError) {
        logger.error(`[Request:${requestId}] 查询用户通知渠道失败`, {
          requestId,
          operatorId,
          userId,
          error: queryError.message,
          stack: queryError.stack,
          processingTime: Date.now() - startTime
        });
        
        return res.status(500).json({
          success: false,
          message: '查询用户通知渠道失败'
        });
      }
      
      const channels = channelsResult.rows;
      
      logger.info(`[Request:${requestId}] 获取当前用户通知渠道成功`, {
        requestId,
        operatorId,
        userId,
        channelCount: channels.length,
        processingTime: Date.now() - startTime
      });
      
      res.status(200).json({
        success: true,
        message: '获取当前用户通知渠道成功',
        data: channels
      });
      
    } catch (error) {
      logger.error(`[Request:${requestId}] 获取当前用户通知渠道处理失败`, {
        requestId,
        operatorId,
        userId,
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 添加通知渠道
  async addNotificationChannel(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.headers['x-request-id'] || `add_notification_channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    // 获取操作者ID（从JWT token中获取）
    const operatorId = req.user ? req.user.sub : 'unknown';
    const userId = operatorId; // 当前用户添加自己的通知渠道
    const { name, type, description } = req.body;
    
    // 记录请求开始
    logger.info(`[Request:${requestId}] 开始添加通知渠道`, {
      requestId,
      operatorId,
      userId,
      name,
      type,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    try {
      // 验证必填字段
      if (!name || !type) {
        logger.warn(`[Request:${requestId}] 添加通知渠道缺少必要参数`, {
          requestId,
          operatorId,
          userId,
          name,
          type,
          processingTime: Date.now() - startTime
        });
        
        return res.status(400).json({
          success: false,
          message: '渠道名称和类型为必填项'
        });
      }
      
      // 验证渠道类型
      const validTypes = ['email', 'sms', 'push', 'webhook'];
      if (!validTypes.includes(type)) {
        logger.warn(`[Request:${requestId}] 添加通知渠道使用了无效的渠道类型`, {
          requestId,
          operatorId,
          userId,
          name,
          type,
          validTypes,
          processingTime: Date.now() - startTime
        });
        
        return res.status(400).json({
          success: false,
          message: '无效的渠道类型'
        });
      }
      
      // 检查渠道名称是否已存在
      let existingChannelResult;
      try {
        existingChannelResult = await pool.query(
          'SELECT id FROM notification_channels WHERE user_id = $1 AND name = $2',
          [userId, name]
        );
        
        if (existingChannelResult.rows.length > 0) {
          logger.warn(`[Request:${requestId}] 尝试添加已存在的通知渠道名称`, {
            requestId,
            operatorId,
            userId,
            name,
            type,
            existingChannelId: existingChannelResult.rows[0].id,
            processingTime: Date.now() - startTime
          });
          
          return res.status(409).json({
            success: false,
            message: '渠道名称已存在'
          });
        }
      } catch (queryError) {
        logger.error(`[Request:${requestId}] 检查通知渠道名称是否存在失败`, {
          requestId,
          operatorId,
          userId,
          name,
          type,
          error: queryError.message,
          stack: queryError.stack,
          processingTime: Date.now() - startTime
        });
        
        return res.status(500).json({
          success: false,
          message: '检查通知渠道名称失败'
        });
      }
      
      // 创建通知渠道
      let result;
      try {
        result = await pool.query(
          `INSERT INTO notification_channels (user_id, name, type, description, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())
           RETURNING id, name, type, description, is_active, created_at, updated_at`,
          [userId, name, type, description || '']
        );
        
        logger.info(`[Request:${requestId}] 通知渠道创建成功`, {
          requestId,
          operatorId,
          userId,
          name,
          type,
          channelId: result.rows[0].id,
          processingTime: Date.now() - startTime
        });
      } catch (insertError) {
        logger.error(`[Request:${requestId}] 创建通知渠道失败`, {
          requestId,
          operatorId,
          userId,
          name,
          type,
          error: insertError.message,
          stack: insertError.stack,
          processingTime: Date.now() - startTime
        });
        
        return res.status(500).json({
          success: false,
          message: '创建通知渠道失败'
        });
      }
      
      const channel = result.rows[0];
      
      logger.info(`[Request:${requestId}] 添加通知渠道成功`, {
        requestId,
        operatorId,
        userId,
        name,
        type,
        channelId: channel.id,
        processingTime: Date.now() - startTime
      });
      
      res.status(201).json({
        success: true,
        message: '添加通知渠道成功',
        data: channel
      });
      
    } catch (error) {
      logger.error(`[Request:${requestId}] 添加通知渠道处理失败`, {
        requestId,
        operatorId,
        userId,
        name,
        type,
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 更新通知渠道
  async updateNotificationChannel(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.headers['x-request-id'] || `update_notification_channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    // 获取操作者ID（从JWT token中获取）
    const operatorId = req.user ? req.user.sub : 'unknown';
    const userId = operatorId; // 当前用户更新自己的通知渠道
    const { channelId } = req.params;
    const { name, type, description, is_active } = req.body;
    
    // 记录请求开始
    logger.info(`[Request:${requestId}] 开始更新通知渠道`, {
      requestId,
      operatorId,
      userId,
      channelId,
      name,
      type,
      is_active,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    try {
      // 验证渠道是否存在且属于当前用户
      let channelResult;
      try {
        channelResult = await pool.query(
          'SELECT id, name, type FROM notification_channels WHERE id = $1 AND user_id = $2',
          [channelId, userId]
        );
        
        if (channelResult.rows.length === 0) {
          logger.warn(`[Request:${requestId}] 尝试更新不存在或不属于当前用户的通知渠道`, {
            requestId,
            operatorId,
            userId,
            channelId,
            processingTime: Date.now() - startTime
          });
          
          return res.status(404).json({
            success: false,
            message: '通知渠道不存在'
          });
        }
      } catch (queryError) {
        logger.error(`[Request:${requestId}] 查询通知渠道失败`, {
          requestId,
          operatorId,
          userId,
          channelId,
          error: queryError.message,
          stack: queryError.stack,
          processingTime: Date.now() - startTime
        });
        
        return res.status(500).json({
          success: false,
          message: '查询通知渠道失败'
        });
      }
      
      const originalChannel = channelResult.rows[0];
      
      // 验证渠道类型（如果提供）
      if (type) {
        const validTypes = ['email', 'sms', 'push', 'webhook'];
        if (!validTypes.includes(type)) {
          logger.warn(`[Request:${requestId}] 更新通知渠道使用了无效的渠道类型`, {
            requestId,
            operatorId,
            userId,
            channelId,
            originalName: originalChannel.name,
            originalType: originalChannel.type,
            newType: type,
            validTypes,
            processingTime: Date.now() - startTime
          });
          
          return res.status(400).json({
            success: false,
            message: '无效的渠道类型'
          });
        }
      }
      
      // 检查渠道名称是否已存在（如果提供新名称）
      if (name && name !== originalChannel.name) {
        let existingChannelResult;
        try {
          existingChannelResult = await pool.query(
            'SELECT id FROM notification_channels WHERE user_id = $1 AND name = $2 AND id != $3',
            [userId, name, channelId]
          );
          
          if (existingChannelResult.rows.length > 0) {
            logger.warn(`[Request:${requestId}] 尝试将通知渠道名称更新为已存在的名称`, {
              requestId,
              operatorId,
              userId,
              channelId,
              originalName: originalChannel.name,
              newName: name,
              existingChannelId: existingChannelResult.rows[0].id,
              processingTime: Date.now() - startTime
            });
            
            return res.status(409).json({
              success: false,
              message: '渠道名称已存在'
            });
          }
        } catch (queryError) {
          logger.error(`[Request:${requestId}] 检查通知渠道名称是否存在失败`, {
            requestId,
            operatorId,
            userId,
            channelId,
            originalName: originalChannel.name,
            newName: name,
            error: queryError.message,
            stack: queryError.stack,
            processingTime: Date.now() - startTime
          });
          
          return res.status(500).json({
            success: false,
            message: '检查通知渠道名称失败'
          });
        }
      }
      
      // 构建更新字段
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;
      
      if (name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(name);
      }
      
      if (type !== undefined) {
        updateFields.push(`type = $${paramIndex++}`);
        updateValues.push(type);
      }
      
      if (description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(description);
      }
      
      if (is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        updateValues.push(is_active);
      }
      
      if (updateFields.length === 0) {
        logger.warn(`[Request:${requestId}] 更新通知渠道未提供任何更新字段`, {
          requestId,
          operatorId,
          userId,
          channelId,
          processingTime: Date.now() - startTime
        });
        
        return res.status(400).json({
          success: false,
          message: '没有提供要更新的字段'
        });
      }
      
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(channelId);
      
      // 执行更新
      let result;
      try {
        const updateQuery = `
          UPDATE notification_channels 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING id, name, type, description, is_active, created_at, updated_at
        `;
        
        result = await pool.query(updateQuery, updateValues);
        
        logger.info(`[Request:${requestId}] 通知渠道更新成功`, {
          requestId,
          operatorId,
          userId,
          channelId,
          originalName: originalChannel.name,
          updatedFields: updateFields.slice(0, -1), // 排除 updated_at 字段
          processingTime: Date.now() - startTime
        });
      } catch (updateError) {
        logger.error(`[Request:${requestId}] 更新通知渠道失败`, {
          requestId,
          operatorId,
          userId,
          channelId,
          originalName: originalChannel.name,
          updatedFields: updateFields.slice(0, -1),
          error: updateError.message,
          stack: updateError.stack,
          processingTime: Date.now() - startTime
        });
        
        return res.status(500).json({
          success: false,
          message: '更新通知渠道失败'
        });
      }
      
      const updatedChannel = result.rows[0];
      
      logger.info(`[Request:${requestId}] 更新通知渠道成功`, {
        requestId,
        operatorId,
        userId,
        channelId,
        originalName: originalChannel.name,
        newName: updatedChannel.name,
        processingTime: Date.now() - startTime
      });
      
      res.status(200).json({
        success: true,
        message: '更新通知渠道成功',
        data: updatedChannel
      });
      
    } catch (error) {
      logger.error(`[Request:${requestId}] 更新通知渠道处理失败`, {
        requestId,
        operatorId,
        userId,
        channelId,
        name,
        type,
        is_active,
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 删除通知渠道
  async deleteNotificationChannel(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.headers['x-request-id'] || `delete_notification_channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    // 获取操作者ID（从JWT token中获取）
    const operatorId = req.user ? req.user.sub : 'unknown';
    const userId = operatorId; // 当前用户删除自己的通知渠道
    const { channelId } = req.params;
    
    // 记录请求开始
    logger.info(`[Request:${requestId}] 开始删除通知渠道`, {
      requestId,
      operatorId,
      userId,
      channelId,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    try {
      // 验证渠道是否存在且属于当前用户
      let channelResult;
      try {
        channelResult = await pool.query(
          'SELECT id, name FROM notification_channels WHERE id = $1 AND user_id = $2',
          [channelId, userId]
        );
        
        if (channelResult.rows.length === 0) {
          logger.warn(`[Request:${requestId}] 尝试删除不存在或不属于当前用户的通知渠道`, {
            requestId,
            operatorId,
            userId,
            channelId,
            processingTime: Date.now() - startTime
          });
          
          return res.status(404).json({
            success: false,
            message: '通知渠道不存在'
          });
        }
      } catch (queryError) {
        logger.error(`[Request:${requestId}] 查询通知渠道失败`, {
          requestId,
          operatorId,
          userId,
          channelId,
          error: queryError.message,
          stack: queryError.stack,
          processingTime: Date.now() - startTime
        });
        
        return res.status(500).json({
          success: false,
          message: '查询通知渠道失败'
        });
      }
      
      const channel = channelResult.rows[0];
      
      // 删除通知渠道
      try {
        await pool.query(
          'DELETE FROM notification_channels WHERE id = $1 AND user_id = $2',
          [channelId, userId]
        );
        
        logger.info(`[Request:${requestId}] 通知渠道删除成功`, {
          requestId,
          operatorId,
          userId,
          channelId,
          channelName: channel.name,
          processingTime: Date.now() - startTime
        });
      } catch (deleteError) {
        logger.error(`[Request:${requestId}] 删除通知渠道失败`, {
          requestId,
          operatorId,
          userId,
          channelId,
          channelName: channel.name,
          error: deleteError.message,
          stack: deleteError.stack,
          processingTime: Date.now() - startTime
        });
        
        return res.status(500).json({
          success: false,
          message: '删除通知渠道失败'
        });
      }
      
      logger.info(`[Request:${requestId}] 删除通知渠道成功`, {
        requestId,
        operatorId,
        userId,
        channelId,
        channelName: channel.name,
        processingTime: Date.now() - startTime
      });
      
      res.status(200).json({
        success: true,
        message: '删除通知渠道成功',
        data: {
          channelId: channelId,
          channelName: channel.name
        }
      });
      
    } catch (error) {
      logger.error(`[Request:${requestId}] 删除通知渠道处理失败`, {
        requestId,
        operatorId,
        userId,
        channelId,
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 获取用户通知渠道
  async getUserNotificationChannels(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.headers['x-request-id'] || `get_user_notification_channels_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    // 获取操作者ID（从JWT token中获取）
    const operatorId = req.user ? req.user.sub : 'unknown';
    const { id } = req.params;
    
    // 记录请求开始
    logger.info(`[Request:${requestId}] 开始获取用户通知渠道`, {
      requestId,
      operatorId,
      targetUserId: id,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    try {
      // 验证用户是否存在
      let userResult;
      try {
        userResult = await pool.query('SELECT id, username FROM users WHERE id = $1', [id]);
        
        if (userResult.rows.length === 0) {
          logger.warn(`[Request:${requestId}] 尝试获取不存在用户的通知渠道`, {
            requestId,
            operatorId,
            targetUserId: id,
            processingTime: Date.now() - startTime
          });
          
          return res.status(404).json({
            success: false,
            message: '用户不存在'
          });
        }
      } catch (queryError) {
        logger.error(`[Request:${requestId}] 查询用户信息失败`, {
          requestId,
          operatorId,
          targetUserId: id,
          error: queryError.message,
          stack: queryError.stack,
          processingTime: Date.now() - startTime
        });
        
        return res.status(500).json({
          success: false,
          message: '查询用户信息失败'
        });
      }
      
      const user = userResult.rows[0];
      
      // 获取用户通知渠道
      let channelsResult;
      try {
        channelsResult = await pool.query(
          `SELECT id, name, type, description, is_active, created_at, updated_at
           FROM notification_channels
           WHERE user_id = $1
           ORDER BY created_at DESC`,
          [id]
        );
        
        const channels = channelsResult.rows;
        
        logger.info(`[Request:${requestId}] 用户通知渠道查询成功`, {
          requestId,
          operatorId,
          targetUserId: id,
          username: user.username,
          channelCount: channels.length,
          processingTime: Date.now() - startTime
        });
        
        logger.info(`[Request:${requestId}] 获取用户通知渠道成功`, {
          requestId,
          operatorId,
          targetUserId: id,
          username: user.username,
          channelCount: channels.length,
          processingTime: Date.now() - startTime
        });
        
        res.status(200).json({
          success: true,
          message: '获取用户通知渠道成功',
          data: {
            userId: id,
            username: user.username,
            channels: channels
          }
        });
        
      } catch (queryError) {
        logger.error(`[Request:${requestId}] 查询用户通知渠道失败`, {
          requestId,
          operatorId,
          targetUserId: id,
          username: user.username,
          error: queryError.message,
          stack: queryError.stack,
          processingTime: Date.now() - startTime
        });
        
        return res.status(500).json({
          success: false,
          message: '查询用户通知渠道失败'
        });
      }
      
    } catch (error) {
      logger.error(`[Request:${requestId}] 获取用户通知渠道处理失败`, {
        requestId,
        operatorId,
        targetUserId: id,
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }

  // 更新用户通知渠道
  async updateUserNotificationChannel(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.headers['x-request-id'] || `update_user_notification_channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    // 获取操作者ID（从JWT token中获取）
    const operatorId = req.user ? req.user.sub : 'unknown';
    const { id, channelId } = req.params;
    const { name, type, description, is_active } = req.body;
    
    // 记录请求开始
    logger.info(`[Request:${requestId}] 开始更新用户通知渠道`, {
      requestId,
      operatorId,
      targetUserId: id,
      channelId,
      updateFields: { name, type, description, is_active },
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    try {
      // 验证用户是否存在
      let userResult;
      try {
        userResult = await pool.query('SELECT id, username FROM users WHERE id = $1', [id]);
        
        if (userResult.rows.length === 0) {
          logger.warn(`[Request:${requestId}] 尝试更新不存在用户的通知渠道`, {
            requestId,
            operatorId,
            targetUserId: id,
            channelId,
            processingTime: Date.now() - startTime
          });
          
          return res.status(404).json({
            success: false,
            message: '用户不存在'
          });
        }
      } catch (queryError) {
        logger.error(`[Request:${requestId}] 查询用户信息失败`, {
          requestId,
          operatorId,
          targetUserId: id,
          channelId,
          error: queryError.message,
          stack: queryError.stack,
          processingTime: Date.now() - startTime
        });
        
        return res.status(500).json({
          success: false,
          message: '查询用户信息失败'
        });
      }
      
      const user = userResult.rows[0];
      
      // 验证渠道是否存在且属于该用户
      let channelResult;
      try {
        channelResult = await pool.query(
          'SELECT id, name FROM notification_channels WHERE id = $1 AND user_id = $2',
          [channelId, id]
        );
        
        if (channelResult.rows.length === 0) {
          logger.warn(`[Request:${requestId}] 尝试更新不存在或不属于该用户的通知渠道`, {
            requestId,
            operatorId,
            targetUserId: id,
            channelId,
            processingTime: Date.now() - startTime
          });
          
          return res.status(404).json({
            success: false,
            message: '通知渠道不存在'
          });
        }
      } catch (queryError) {
        logger.error(`[Request:${requestId}] 查询通知渠道失败`, {
          requestId,
          operatorId,
          targetUserId: id,
          channelId,
          error: queryError.message,
          stack: queryError.stack,
          processingTime: Date.now() - startTime
        });
        
        return res.status(500).json({
          success: false,
          message: '查询通知渠道失败'
        });
      }
      
      const channel = channelResult.rows[0];
      
      // 验证渠道类型（如果提供）
      if (type) {
        const validTypes = ['email', 'sms', 'push', 'webhook'];
        if (!validTypes.includes(type)) {
          logger.warn(`[Request:${requestId}] 更新通知渠道使用了无效的渠道类型`, {
            requestId,
            operatorId,
            targetUserId: id,
            channelId,
            invalidType: type,
            validTypes,
            processingTime: Date.now() - startTime
          });
          
          return res.status(400).json({
            success: false,
            message: '无效的渠道类型'
          });
        }
      }
      
      // 检查渠道名称是否已存在（如果提供新名称）
      if (name) {
        try {
          const existingChannelResult = await pool.query(
            'SELECT id FROM notification_channels WHERE user_id = $1 AND name = $2 AND id != $3',
            [id, name, channelId]
          );
          
          if (existingChannelResult.rows.length > 0) {
            logger.warn(`[Request:${requestId}] 尝试将通知渠道名称更新为已存在的名称`, {
              requestId,
              operatorId,
              targetUserId: id,
              channelId,
              newName: name,
              processingTime: Date.now() - startTime
            });
            
            return res.status(409).json({
              success: false,
              message: '渠道名称已存在'
            });
          }
        } catch (queryError) {
          logger.error(`[Request:${requestId}] 检查通知渠道名称是否存在失败`, {
            requestId,
            operatorId,
            targetUserId: id,
            channelId,
            newName: name,
            error: queryError.message,
            stack: queryError.stack,
            processingTime: Date.now() - startTime
          });
          
          return res.status(500).json({
            success: false,
            message: '检查通知渠道名称是否存在失败'
          });
        }
      }
      
      // 构建更新字段
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;
      
      if (name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        updateValues.push(name);
      }
      
      if (type !== undefined) {
        updateFields.push(`type = $${paramIndex++}`);
        updateValues.push(type);
      }
      
      if (description !== undefined) {
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(description);
      }
      
      if (is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        updateValues.push(is_active);
      }
      
      if (updateFields.length === 0) {
        logger.warn(`[Request:${requestId}] 更新通知渠道未提供任何更新字段`, {
          requestId,
          operatorId,
          targetUserId: id,
          channelId,
          processingTime: Date.now() - startTime
        });
        
        return res.status(400).json({
          success: false,
          message: '没有提供要更新的字段'
        });
      }
      
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(channelId);
      
      // 执行更新
      try {
        const updateQuery = `
          UPDATE notification_channels 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING id, name, type, description, is_active, created_at, updated_at
        `;
        
        const result = await pool.query(updateQuery, updateValues);
        const updatedChannel = result.rows[0];
        
        logger.info(`[Request:${requestId}] 通知渠道更新成功`, {
          requestId,
          operatorId,
          targetUserId: id,
          channelId,
          channelName: updatedChannel.name,
          updateFields: updateFields.slice(0, -1), // 排除 updated_at
          processingTime: Date.now() - startTime
        });
        
        logger.info(`[Request:${requestId}] 更新用户通知渠道成功`, {
          requestId,
          operatorId,
          targetUserId: id,
          username: user.username,
          channelId,
          channelName: updatedChannel.name,
          processingTime: Date.now() - startTime
        });
        
        res.status(200).json({
          success: true,
          message: '更新用户通知渠道成功',
          data: {
            userId: id,
            username: user.username,
            channel: updatedChannel
          }
        });
        
      } catch (updateError) {
        logger.error(`[Request:${requestId}] 更新通知渠道失败`, {
          requestId,
          operatorId,
          targetUserId: id,
          channelId,
          channelName: channel.name,
          updateFields: updateFields.slice(0, -1), // 排除 updated_at
          error: updateError.message,
          stack: updateError.stack,
          processingTime: Date.now() - startTime
        });
        
        return res.status(500).json({
          success: false,
          message: '更新通知渠道失败'
        });
      }
      
    } catch (error) {
      logger.error(`[Request:${requestId}] 更新用户通知渠道处理失败`, {
        requestId,
        operatorId,
        targetUserId: id,
        channelId,
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      });
      
      res.status(500).json({
        success: false,
        message: '服务器内部错误'
      });
    }
  }
}

module.exports = new UserController();