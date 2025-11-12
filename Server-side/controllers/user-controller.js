const { pool } = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const winston = require('winston');
const { TokenManager } = require('../middleware/tokenManager');
const TokenService = require('../services/token-service');
const crypto = require('crypto');
const { recordFailedLoginAttempt, resetFailedLoginAttempts, isAccountLocked } = require('../middleware/securityEnhancements');
const { recordFailure, recordSuccess } = require('../middleware/bruteForceRedis');
const { recordLoginFailure, recordLoginSuccess } = require('../middleware/bruteForce');
const { newResponseMiddleware } = require('../middleware/newResponseHandler');
const { enhancedAuditLogger, logUserActivity, logSystemEvent, logSecurityEvent } = require('../middleware/enhanced-audit-logger');
const { recordLoginResult } = require('../middleware/enhancedBruteForceProtection');

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
        
        return res.error(400, '用户名、密码和邮箱为必填项');
      }
      
      // 使用业务服务处理注册
      const userBusinessService = require('../services/user-business-service');
      const user = await userBusinessService.register({
        username,
        password,
        email,
        name: displayName
      });
      
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
      
      // 根据错误类型返回相应的错误码
      if (error.message.includes('已被注册')) {
        return res.error(409, error.message);
      } else if (error.message.includes('密码')) {
        return res.error(400, error.message);
      }
      
      res.error(500, '服务器内部错误');
    }
  }


  // 管理员登录
  async adminLogin(req, res) {
    try {
      const { username, password } = req.body;
      
      // 查询管理员用户信息 - 从users表查询具有管理员角色的用户
      const userResult = await pool.query(
        `SELECT u.id, u.username, u.password_hash, r.name as role_name
         FROM users u 
         JOIN user_roles ur ON u.id = ur.user_id 
         JOIN roles r ON ur.role_id = r.id 
         WHERE u.username = $1 AND r.name IN ('sysadmin', 'admin')`,
        [username]
      );
      
      if (userResult.rows.length === 0) {
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
        // 记录Redis暴力破解防护失败
        if (req.ip && username) {
          await recordFailure(req.ip, username);
        }
        return res.error(401, '用户名或密码错误');
      }
      
      // 使用TokenService生成JWT令牌
      const tokens = TokenService.generateTokens(user.id.toString(), user.role_name, ['read', 'write', 'admin'], user.username);
      
      // 更新最后登录时间
      try {
        await pool.query(
          'UPDATE users SET updated_at = NOW() WHERE id = $1',
          [user.id]
        );
      } catch (error) {
        logger.warn('无法更新users表的updated_at字段:', error.message);
      }
      
      logger.info(`管理员登录成功: ${user.username}`);
      
      // 记录Redis暴力破解防护成功
      if (req.ip && username) {
        await recordSuccess(req.ip, username);
      }
      
      res.success(200, '管理员登录成功', {
        user: {
          id: user.id,
          username: user.username,
          role: user.role_name // 使用数据库中的真实中文角色名称
        },
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken
      });
      
    } catch (error) {
      logger.error('管理员登录失败:', error);
      res.error(500, '服务器内部错误');
    }
  }

  // 管理员登录
  async adminLogin(req, res) {
    try {
      const { username, password } = req.body;
      
      // 查询管理员用户信息 - 从users表查询具有管理员角色的用户
      const userResult = await pool.query(
        `SELECT u.id, u.username, u.password_hash, r.name as role_name
         FROM users u 
         JOIN user_roles ur ON u.id = ur.user_id 
         JOIN roles r ON ur.role_id = r.id 
         WHERE u.username = $1 AND r.name IN ('sysadmin', 'admin')`,
        [username]
      );
      
      if (userResult.rows.length === 0) {
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
        // 记录Redis暴力破解防护失败
        if (req.ip && username) {
          await recordFailure(req.ip, username);
        }
        return res.error(401, '用户名或密码错误');
      }
      
      // 生成JWT令牌
      const payload = {
        userId: user.id,
        username: user.username,
        role: user.role_name // 使用数据库中的真实中文角色名称
      };
      
      // 使用TokenManager生成JWT token，与普通用户登录保持一致
      const { TokenManager } = require('../middleware/tokenManager');
      const accessToken = TokenManager.generateAccessToken({
        sub: user.id.toString(),
        username: user.username,
        roles: [user.role_name], // 使用数据库中的真实中文角色名称
        permissions: ['read', 'write', 'admin']
      });
      
      const refreshToken = TokenManager.generateRefreshToken(user.id.toString());
      
      // 更新最后登录时间
      try {
        await pool.query(
          'UPDATE users SET updated_at = NOW() WHERE id = $1',
          [user.id]
        );
      } catch (error) {
        logger.warn('无法更新users表的updated_at字段:', error.message);
      }
      
      logger.info(`管理员登录成功: ${user.username}`);
      
      // 记录Redis暴力破解防护成功
      if (req.ip && username) {
        await recordSuccess(req.ip, username);
      }
      
      res.success(200, '管理员登录成功', {
        user: {
          id: user.id,
          username: user.username,
          role: user.role_name // 使用数据库中的真实中文角色名称
        },
        accessToken,
        refreshToken
      });
      
    } catch (error) {
      logger.error('管理员登录失败:', error);
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
        // 使用增强版防护记录失败
        await recordLoginResult(false)(req, res, () => {});
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
        // 使用增强版防护记录失败
        await recordLoginResult(false)(req, res, () => {});
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
        // 使用增强版防护记录失败
        await recordLoginResult(false)(req, res, () => {});
        return res.error(401, '登录信息不正确');
      }

      // 重置登录失败计数
      await resetFailedLoginAttempts(user.id);

      // 移除密码字段
      const { password_hash: userPassword, ...userWithoutPassword } = user;

      // 使用权限服务获取用户角色和权限
      const permissionService = require('../services/permission-service');
      let userRole = 'user'; // 默认角色
      let userPermissions = ['read', 'write']; // 默认权限
      
      try {
        const roles = await permissionService.getUserRoles(user.id);
        if (roles.length > 0) {
          userRole = roles[0];
        }
        
        userPermissions = await permissionService.getUserPermissions(user.id);
      } catch (error) {
        logger.warn(`获取用户角色和权限失败，使用默认值 [${requestId}]`, {
          requestId,
          userId: user.id,
          username,
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
      // 记录Redis暴力破解防护成功
      if (req.ip && username) {
        await recordSuccess(req.ip, username);
        // 使用增强版防护记录成功
        await recordLoginResult(true)(req, res, () => {});
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

      res.success(200, '用户登录成功', {
        user: userWithoutPassword,
        accessToken,
        refreshToken
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
      // 使用增强版防护记录失败
      await recordLoginResult(false)(req, res, () => {});
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
          
          return res.error(401, '无效的刷新Token');
        }
      } catch (error) {
        logger.warn(`Token刷新失败：刷新Token验证异常 [${requestId}]`, {
          requestId,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        return res.error(401, '无效的刷新Token');
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
        
        return res.error(401, '用户不存在');
      }

      const user = users[0];

      // 使用TokenManager生成新的JWT token
      
      // 从权限服务获取最新的用户角色和权限
      const permissionService = require('../services/permission-service');
      const userRole = (await permissionService.getUserRoles(user.id))[0] || 'user';
      const userPermissions = await permissionService.getUserPermissions(user.id);
      
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

      res.success(200, 'Token刷新成功', {
        token: newAccessToken,
        refreshToken: newRefreshToken
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
        'SELECT id, username, email, display_name as name, avatar_url, is_active as status, created_at, updated_at FROM users WHERE id = $1',
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
      
      res.success(200, '获取用户详情成功', user);
      
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
      
      res.error(500, '服务器内部错误');
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
        
        return res.error(404, '用户不存在');
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
            
            return res.error(409, '邮箱已被其他用户使用');
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
          
          return res.error(500, '检查邮箱唯一性时发生错误');
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
        
        return res.error(400, '没有提供有效的更新字段');
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
      
      res.success(200, '用户信息更新成功', updatedUser);
      
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
      
      res.error(500, '服务器内部错误');
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
        conditions.push(`u.status = $${paramIndex++}`);
        queryParams.push(status);
      }
      
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      // 查询用户列表
      const usersQuery = `
        SELECT u.id, u.username, u.email, u.avatar_url, u.status, u.created_at, u.updated_at, r.name as role,
               COALESCE(up.full_name, up.nickname, u.username) as display_name
        FROM users u
        LEFT JOIN user_profiles up ON u.id = up.user_id
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
        
        return res.error(500, '查询用户列表失败');
      }
      
      // 查询总数
      let totalCount = 0;
      try {
        const countQuery = `
          SELECT COUNT(*) 
          FROM users u
          LEFT JOIN user_profiles up ON u.id = up.user_id
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
      
      res.success(200, '获取用户列表成功', {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
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
      
      res.error(500, '服务器内部错误');
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
      const validRoles = ['system_admin', 'admin', 'room_leader', 'payer', 'user'];
      if (!validRoles.includes(role)) {
        logger.warn(`分配用户角色失败：无效的角色值 [${requestId}]`, {
          requestId,
          userId: id,
          role,
          validRoles,
          operatorId,
          timestamp: new Date().toISOString()
        });
        
        return res.error(400, '无效的角色值');
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
          
          return res.error(404, '用户不存在');
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
        
        return res.error(500, '查询用户信息失败');
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
          
          return res.error(404, '角色不存在');
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
        
        return res.error(500, '查询角色信息失败');
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
        
        return res.error(500, '查询用户现有角色失败');
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
        
        return res.error(500, '分配用户角色失败');
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
      
      res.success(200, '用户角色分配成功', {
        userId: id,
        role: role
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
      
      res.error(500, '服务器内部错误');
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
          
          return res.error(404, '用户不存在');
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
        
        return res.error(500, '查询用户信息失败');
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
          
          return res.error(404, '角色不存在');
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
        
        return res.error(500, '查询角色信息失败');
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
        
        return res.error(500, '查询用户现有角色失败');
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
        
        return res.error(500, '更新用户角色失败');
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
      
      res.success(200, '用户角色更新成功', {
        userId: id,
        role: role
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
      
      res.error(500, '服务器内部错误');
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
          
          return res.error(404, '用户不存在');
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
        
        return res.error(500, '查询用户信息失败');
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
        
        return res.error(500, '查询用户角色失败');
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
      
      res.success(200, '获取用户角色成功', {
        userId: user.id,
        username: user.username,
        role: role
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
      
      res.error(500, '服务器内部错误');
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
          
          return res.error(404, '用户不存在');
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
        
        return res.error(500, '查询用户信息失败');
      }
      
      // 查询用户角色
      let userRole = '用户'; // 默认角色（根据需求文档标准）
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
      
      res.success(200, '获取用户资料成功', user);
      
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
      
      res.error(500, '服务器内部错误');
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
          
          return res.error(404, '用户不存在');
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
        
        return res.error(500, '查询用户信息失败');
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
            
            return res.error(409, '邮箱已被其他用户使用');
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
          
          return res.error(500, '检查邮箱唯一性失败');
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
        
        return res.error(400, '没有提供要更新的字段');
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
        
        return res.error(500, '更新用户资料失败');
      }
      
      const duration = Date.now() - startTime;
      logger.info(`更新用户资料操作完成 [${requestId}]`, {
        requestId,
        userId,
        username: updatedUser.username,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.success(200, '用户资料更新成功', updatedUser);
      
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
      
      res.error(500, '服务器内部错误');
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
        
        return res.error(400, '当前密码和新密码为必填项');
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
        
        return res.error(400, '新密码需包含大小写、数字、特殊字符且至少8位');
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
          
          return res.error(404, '用户不存在');
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
        
        return res.error(500, '查询用户信息失败');
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
        
        return res.error(500, '验证当前密码失败');
      }
      
      if (!isCurrentPasswordValid) {
        logger.warn(`修改用户密码失败：当前密码错误 [${requestId}]`, {
          requestId,
          userId,
          username: user.username,
          timestamp: new Date().toISOString()
        });
        
        return res.error(400, '当前密码错误');
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
        
        return res.error(500, '验证新密码失败');
      }
      
      if (isSamePassword) {
        logger.warn(`修改用户密码失败：新密码与当前密码相同 [${requestId}]`, {
          requestId,
          userId,
          username: user.username,
          timestamp: new Date().toISOString()
        });
        
        return res.error(400, '新密码不能与当前密码相同');
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
        
        return res.error(500, '加密新密码失败');
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
        
        return res.error(500, '更新密码失败');
      }
      
      const duration = Date.now() - startTime;
      logger.info(`修改用户密码操作完成 [${requestId}]`, {
        requestId,
        userId,
        username: user.username,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.success(200, '密码修改成功');
      
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
      
      res.error(500, '服务器内部错误');
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
        
        return res.error(400, '邮箱为必填项');
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
        
        return res.error(500, '查询用户信息失败');
      }
      
      // 无论用户是否存在都返回成功，避免邮箱枚举攻击
      if (!user) {
        logger.info(`忘记密码请求：邮箱 ${email.substring(0, 3)}*** 不存在，但返回成功 [${requestId}]`, {
          requestId,
          email: email.substring(0, 3) + '***',
          timestamp: new Date().toISOString()
        });
        
        return res.success(200, '如果该邮箱已注册，您将收到密码重置邮件');
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
        
        return res.error(500, '生成重置令牌失败');
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
      
      res.success(200, '如果该邮箱已注册，您将收到密码重置邮件');
      
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
      
      res.error(500, '服务器内部错误');
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
        
        return res.error(400, '重置令牌和新密码为必填项');
      }
      
      // 验证新密码强度
      const strongPwd = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
      if (!strongPwd.test(newPassword)) {
        logger.warn(`[Request:${requestId}] 新密码不符合强密码策略`, {
          requestId,
          passwordLength: newPassword ? newPassword.length : 0,
          processingTime: Date.now() - startTime
        });
        
        return res.error(400, '新密码需包含大小写、数字、特殊字符且至少8位');
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
        
        return res.error(400, '重置令牌无效或已过期');
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
        
        return res.error(500, '密码加密失败，请重试');
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
        
        res.success(200, '密码重置成功');
        
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
        
        return res.error(500, '密码重置失败，请重试');
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
      
      res.error(500, '服务器内部错误');
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
      
      res.success(200, '获取用户设置成功', settings);
      
    } catch (error) {
      logger.error('获取用户设置失败:', error);
      res.error(500, '服务器内部错误');
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
        return res.error(400, '设置对象为必填项');
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
        
        res.success(200, '用户设置更新成功', settings);
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      logger.error('更新用户设置失败:', error);
      res.error(500, '服务器内部错误');
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
          
          return res.error(404, '用户不存在');
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
        
        return res.error(500, '查询用户信息失败');
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
          
          return res.error(404, '角色不存在');
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
        
        return res.error(500, '查询角色信息失败');
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
          
          return res.error(404, '用户未拥有该角色');
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
        
        return res.error(500, '查询用户角色关系失败');
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
        
        res.success(200, '用户角色移除成功', {
          userId: id,
          roleId: roleId,
          roleName: role.name
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
        
        res.error(500, '移除用户角色失败');
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
      
      res.error(500, '服务器内部错误');
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
        
        return res.error(500, '查询用户角色失败');
      }
      
      const roles = rolesResult.rows;
      
      logger.info(`[Request:${requestId}] 获取当前用户角色成功`, {
        requestId,
        userId,
        roleCount: roles.length,
        processingTime: Date.now() - startTime
      });
      
      res.success(200, '获取当前用户角色成功', roles);
      
    } catch (error) {
      logger.error(`[Request:${requestId}] 获取当前用户角色处理失败`, {
        requestId,
        userId,
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      });
      
      res.error(500, '服务器内部错误');
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
        
        return res.error(500, '查询用户权限失败');
      }
      
      const permissions = permissionsResult.rows;
      
      logger.info(`[Request:${requestId}] 获取当前用户权限成功`, {
        requestId,
        userId,
        permissionCount: permissions.length,
        processingTime: Date.now() - startTime
      });
      
      res.success(200, '获取当前用户权限成功', permissions);
      
    } catch (error) {
      logger.error(`[Request:${requestId}] 获取当前用户权限处理失败`, {
        requestId,
        userId,
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      });
      
      res.error(500, '服务器内部错误');
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
        
        return res.error(500, '查询用户会话失败');
      }
      
      const sessions = sessionsResult.rows;
      
      logger.info(`[Request:${requestId}] 获取当前用户会话列表成功`, {
        requestId,
        userId,
        sessionCount: sessions.length,
        processingTime: Date.now() - startTime
      });
      
      res.success(200, '获取当前用户会话列表成功', sessions);
      
    } catch (error) {
      logger.error(`[Request:${requestId}] 获取当前用户会话列表处理失败`, {
        requestId,
        userId,
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      });
      
      res.error(500, '服务器内部错误');
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
          
          return res.error(404, '会话不存在或已失效');
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
        
        return res.error(500, '查询用户会话失败');
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
        
        res.success(200, '会话终止成功', {
          sessionId: sessionId
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
        
        res.error(500, '终止用户会话失败');
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
      
      res.error(500, '服务器内部错误');
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
          
          return res.error(404, '用户不存在');
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
        
        return res.error(500, '查询用户信息失败');
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
        
        return res.error(500, '查询用户会话失败');
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
      
      res.success(200, '获取用户会话列表成功', {
        userId: id,
        username: user.username,
        sessions: sessions
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
      
      res.error(500, '服务器内部错误');
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
          
          return res.error(404, '用户不存在');
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
        
        return res.error(500, '查询用户信息失败');
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
          
          return res.error(404, '会话不存在或已失效');
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
        
        return res.error(500, '查询用户会话失败');
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
        
        return res.error(500, '终止用户会话失败');
      }
      
      res.success(200, '会话终止成功', {
        userId: id,
        username: user.username,
        sessionId: sessionId
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
      
      res.error(500, '服务器内部错误');
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
        
        return res.error(500, '查询用户通知渠道失败');
      }
      
      const channels = channelsResult.rows;
      
      logger.info(`[Request:${requestId}] 获取当前用户通知渠道成功`, {
        requestId,
        operatorId,
        userId,
        channelCount: channels.length,
        processingTime: Date.now() - startTime
      });
      
      res.success(200, '获取当前用户通知渠道成功', channels);
      
    } catch (error) {
      logger.error(`[Request:${requestId}] 获取当前用户通知渠道处理失败`, {
        requestId,
        operatorId,
        userId,
        error: error.message,
        stack: error.stack,
        processingTime: Date.now() - startTime
      });
      
      res.error(500, '服务器内部错误');
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
        
        return res.error(400, '渠道名称和类型为必填项');
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
        
        return res.error(400, '无效的渠道类型');
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
          
          return res.error(409, '渠道名称已存在');
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
        
        return res.error(500, '检查通知渠道名称失败');
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
        
        return res.error(500, '创建通知渠道失败');
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
      
      res.success(201, '添加通知渠道成功', channel);
      
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
      
      res.error(500, '服务器内部错误');
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
          
          return res.error(404, '通知渠道不存在');
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
        
        return res.error(500, '查询通知渠道失败');
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
          
          return res.error(400, '无效的渠道类型');
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
            
            return res.error(409, '渠道名称已存在');
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
          
          return res.error(500, '检查通知渠道名称失败');
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
        
        return res.error(400, '没有提供要更新的字段');
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
        
        return res.error(500, '更新通知渠道失败');
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
      
      res.success(200, '更新通知渠道成功', updatedChannel);
      
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
      
      res.error(500, '服务器内部错误');
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
          
          return res.error(404, '通知渠道不存在');
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
        
        return res.error(500, '查询通知渠道失败');
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
        
        return res.error(500, '删除通知渠道失败');
      }
      
      logger.info(`[Request:${requestId}] 删除通知渠道成功`, {
        requestId,
        operatorId,
        userId,
        channelId,
        channelName: channel.name,
        processingTime: Date.now() - startTime
      });
      
      res.success(200, '删除通知渠道成功', {
        channelId: channelId,
        channelName: channel.name
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
      
      res.error(500, '服务器内部错误');
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
          
          return res.error(404, '用户不存在');
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
        
        return res.error(500, '查询用户信息失败');
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
        
        res.success(200, '获取用户通知渠道成功', {
          userId: id,
          username: user.username,
          channels: channels
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
        
        return res.error(500, '查询用户通知渠道失败');
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
      
      res.error(500, '服务器内部错误');
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
        
        return res.error(500, '查询通知渠道失败');
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
          
          return res.error(400, '无效的渠道类型');
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
            
            return res.error(409, '渠道名称已存在');
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
          
          return res.error(500, '检查通知渠道名称是否存在失败');
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
        
        return res.error(400, '没有提供要更新的字段');
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
        
        res.success(200, '更新用户通知渠道成功', {
          userId: id,
          username: user.username,
          channel: updatedChannel
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
        
        return res.error(500, '更新通知渠道失败');
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
      
      res.error(500, '服务器内部错误');
    }
  }

  // 获取用户个人信息
  async getProfile(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      // 从JWT token中获取用户ID
      const userId = req.user.sub;
      
      logger.info(`开始获取用户个人信息 [${requestId}]`, {
        requestId,
        userId,
        timestamp: new Date().toISOString()
      });
      
      // 查询用户基本信息
      const userResult = await pool.query(
        `SELECT u.id, u.username, u.email, u.avatar_url, u.phone, u.status, 
                u.email_verified, u.last_login_at, u.login_count, u.created_at,
                up.full_name, up.nickname, up.gender, up.birth_date, up.location, up.bio,
                us.language, us.timezone, us.currency, us.notification_email, us.notification_push, us.privacy_level
         FROM users u
         LEFT JOIN user_profiles up ON u.id = up.user_id
         LEFT JOIN user_settings us ON u.id = us.user_id
         WHERE u.id = $1`,
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        logger.warn(`获取用户个人信息失败：用户不存在 [${requestId}]`, {
          requestId,
          userId,
          timestamp: new Date().toISOString()
        });
        
        return res.error(404, '用户不存在');
      }
      
      const user = userResult.rows[0];
      
      // 查询用户角色
      const roleResult = await pool.query(
        `SELECT r.name as role 
         FROM user_roles ur 
         JOIN roles r ON ur.role_id = r.id 
         WHERE ur.user_id = $1`,
        [userId]
      );
      
      if (roleResult.rows.length > 0) {
        user.role = roleResult.rows[0].role;
      } else {
        user.role = 'user';
      }
      
      const duration = Date.now() - startTime;
      logger.info(`获取用户个人信息成功 [${requestId}]`, {
        requestId,
        userId,
        username: user.username,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.success(200, '获取用户个人信息成功', user);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`获取用户个人信息失败 [${requestId}]`, {
        requestId,
        error: error.message,
        stack: error.stack,
        userId: req.user ? req.user.sub : 'unknown',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 更新用户个人信息
  async updateProfile(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      // 从JWT token中获取用户ID
      const userId = req.user.sub;
      const { 
        avatar_url, phone, full_name, nickname, gender, birth_date, 
        location, bio, language, timezone, currency, 
        notification_email, notification_push, privacy_level 
      } = req.body;
      
      logger.info(`开始更新用户个人信息 [${requestId}]`, {
        requestId,
        userId,
        timestamp: new Date().toISOString()
      });
      
      // 开始事务
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // 更新用户基本信息
        if (avatar_url !== undefined || phone !== undefined) {
          const updateFields = [];
          const updateValues = [];
          let paramIndex = 1;
          
          if (avatar_url !== undefined) {
            updateFields.push(`avatar_url = $${paramIndex++}`);
            updateValues.push(avatar_url);
          }
          
          if (phone !== undefined) {
            updateFields.push(`phone = $${paramIndex++}`);
            updateValues.push(phone);
          }
          
          updateFields.push(`updated_at = NOW()`);
          updateValues.push(userId);
          
          await client.query(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramIndex}`,
            updateValues
          );
        }
        
        // 更新用户档案信息
        if (full_name !== undefined || nickname !== undefined || gender !== undefined || 
            birth_date !== undefined || location !== undefined || bio !== undefined) {
          
          // 检查用户档案是否存在
          const profileResult = await client.query(
            'SELECT user_id FROM user_profiles WHERE user_id = $1',
            [userId]
          );
          
          if (profileResult.rows.length > 0) {
            // 更新现有档案
            const updateFields = [];
            const updateValues = [];
            let paramIndex = 1;
            
            if (full_name !== undefined) {
              updateFields.push(`full_name = $${paramIndex++}`);
              updateValues.push(full_name);
            }
            
            if (nickname !== undefined) {
              updateFields.push(`nickname = $${paramIndex++}`);
              updateValues.push(nickname);
            }
            
            if (gender !== undefined) {
              updateFields.push(`gender = $${paramIndex++}`);
              updateValues.push(gender);
            }
            
            if (birth_date !== undefined) {
              updateFields.push(`birth_date = $${paramIndex++}`);
              updateValues.push(birth_date);
            }
            
            if (location !== undefined) {
              updateFields.push(`location = $${paramIndex++}`);
              updateValues.push(location);
            }
            
            if (bio !== undefined) {
              updateFields.push(`bio = $${paramIndex++}`);
              updateValues.push(bio);
            }
            
            updateFields.push(`updated_at = NOW()`);
            updateValues.push(userId);
            
            await client.query(
              `UPDATE user_profiles SET ${updateFields.join(', ')} WHERE user_id = $${paramIndex}`,
              updateValues
            );
          } else {
            // 创建新档案
            await client.query(
              `INSERT INTO user_profiles (user_id, full_name, nickname, gender, birth_date, location, bio, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
              [userId, full_name || null, nickname || null, gender || null, 
               birth_date || null, location || null, bio || null]
            );
          }
        }
        
        // 更新用户设置
        if (language !== undefined || timezone !== undefined || currency !== undefined || 
            notification_email !== undefined || notification_push !== undefined || privacy_level !== undefined) {
          
          // 检查用户设置是否存在
          const settingsResult = await client.query(
            'SELECT user_id FROM user_settings WHERE user_id = $1',
            [userId]
          );
          
          if (settingsResult.rows.length > 0) {
            // 更新现有设置
            const updateFields = [];
            const updateValues = [];
            let paramIndex = 1;
            
            if (language !== undefined) {
              updateFields.push(`language = $${paramIndex++}`);
              updateValues.push(language);
            }
            
            if (timezone !== undefined) {
              updateFields.push(`timezone = $${paramIndex++}`);
              updateValues.push(timezone);
            }
            
            if (currency !== undefined) {
              updateFields.push(`currency = $${paramIndex++}`);
              updateValues.push(currency);
            }
            
            if (notification_email !== undefined) {
              updateFields.push(`notification_email = $${paramIndex++}`);
              updateValues.push(notification_email);
            }
            
            if (notification_push !== undefined) {
              updateFields.push(`notification_push = $${paramIndex++}`);
              updateValues.push(notification_push);
            }
            
            if (privacy_level !== undefined) {
              updateFields.push(`privacy_level = $${paramIndex++}`);
              updateValues.push(privacy_level);
            }
            
            updateFields.push(`updated_at = NOW()`);
            updateValues.push(userId);
            
            await client.query(
              `UPDATE user_settings SET ${updateFields.join(', ')} WHERE user_id = $${paramIndex}`,
              updateValues
            );
          } else {
            // 创建新设置
            await client.query(
              `INSERT INTO user_settings (user_id, language, timezone, currency, notification_email, notification_push, privacy_level, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
              [userId, language || null, timezone || null, currency || null, 
               notification_email !== undefined ? notification_email : true,
               notification_push !== undefined ? notification_push : true,
               privacy_level || 'public']
            );
          }
        }
        
        await client.query('COMMIT');
        
        // 获取更新后的用户信息
        const updatedUserResult = await pool.query(
          `SELECT u.id, u.username, u.email, u.avatar_url, u.phone, u.status, 
                  u.email_verified, u.last_login_at, u.login_count, u.created_at,
                  up.full_name, up.nickname, up.gender, up.birth_date, up.location, up.bio,
                  us.language, us.timezone, us.currency, us.notification_email, us.notification_push, us.privacy_level
           FROM users u
           LEFT JOIN user_profiles up ON u.id = up.user_id
           LEFT JOIN user_settings us ON u.id = us.user_id
           WHERE u.id = $1`,
          [userId]
        );
        
        const updatedUser = updatedUserResult.rows[0];
        
        // 查询用户角色
        const roleResult = await pool.query(
          `SELECT r.name as role 
           FROM user_roles ur 
           JOIN roles r ON ur.role_id = r.id 
           WHERE ur.user_id = $1`,
          [userId]
        );
        
        if (roleResult.rows.length > 0) {
          updatedUser.role = roleResult.rows[0].role;
        } else {
          updatedUser.role = 'user';
        }
        
        const duration = Date.now() - startTime;
        logger.info(`更新用户个人信息成功 [${requestId}]`, {
          requestId,
          userId,
          username: updatedUser.username,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        });
        
        res.success(200, '更新用户个人信息成功', updatedUser);
        
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`更新用户个人信息失败 [${requestId}]`, {
        requestId,
        error: error.message,
        stack: error.stack,
        userId: req.user ? req.user.sub : 'unknown',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
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
      
      logger.info(`开始处理修改密码请求 [${requestId}]`, {
        requestId,
        userId,
        timestamp: new Date().toISOString()
      });
      
      // 验证必填字段
      if (!currentPassword || !newPassword) {
        logger.warn(`修改密码失败：缺少必填字段 [${requestId}]`, {
          requestId,
          userId,
          hasCurrentPassword: !!currentPassword,
          hasNewPassword: !!newPassword,
          timestamp: new Date().toISOString()
        });
        
        return res.error(400, '当前密码和新密码为必填项');
      }
      
      // 密码强度：至少8位，包含大小写、数字、特殊字符各一
      const strongPwd = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/;
      if (!strongPwd.test(newPassword)) {
        logger.warn(`修改密码失败：新密码强度不足 [${requestId}]`, {
          requestId,
          userId,
          passwordLength: newPassword.length,
          timestamp: new Date().toISOString()
        });
        
        return res.error(400, '新密码需包含大小写、数字、特殊字符且至少8位');
      }
      
      // 查询用户当前密码
      const userResult = await pool.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        logger.warn(`修改密码失败：用户不存在 [${requestId}]`, {
          requestId,
          userId,
          timestamp: new Date().toISOString()
        });
        
        return res.error(404, '用户不存在');
      }
      
      const user = userResult.rows[0];
      
      // 验证当前密码
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        logger.warn(`修改密码失败：当前密码错误 [${requestId}]`, {
          requestId,
          userId,
          timestamp: new Date().toISOString()
        });
        
        return res.error(401, '当前密码错误');
      }
      
      // 加密新密码
      const saltRounds = 10;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // 更新密码
      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [hashedNewPassword, userId]
      );
      
      const duration = Date.now() - startTime;
      logger.info(`修改密码成功 [${requestId}]`, {
        requestId,
        userId,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.success(200, '修改密码成功');
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`修改密码失败 [${requestId}]`, {
        requestId,
        error: error.message,
        stack: error.stack,
        userId: req.user ? req.user.sub : 'unknown',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 验证重置密码验证码
  async verifyResetCode(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      const { email, code } = req.body;
      
      logger.info(`开始处理验证重置密码验证码请求 [${requestId}]`, {
        requestId,
        email,
        timestamp: new Date().toISOString()
      });
      
      // 验证必填字段
      if (!email || !code) {
        logger.warn(`验证重置密码验证码失败：缺少必填字段 [${requestId}]`, {
          requestId,
          email: email || '未提供',
          hasCode: !!code,
          timestamp: new Date().toISOString()
        });
        
        return res.error(400, '邮箱和验证码为必填项');
      }
      
      // 查询用户
      const userResult = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      
      if (userResult.rows.length === 0) {
        logger.warn(`验证重置密码验证码失败：用户不存在 [${requestId}]`, {
          requestId,
          email,
          timestamp: new Date().toISOString()
        });
        
        return res.error(404, '用户不存在');
      }
      
      const user = userResult.rows[0];
      
      // 查询密码重置令牌
      const tokenResult = await pool.query(
        'SELECT * FROM password_reset_tokens WHERE user_id = $1 AND token = $2 AND expires_at > NOW() AND used_at IS NULL',
        [user.id, code]
      );
      
      if (tokenResult.rows.length === 0) {
        logger.warn(`验证重置密码验证码失败：无效的验证码 [${requestId}]`, {
          requestId,
          userId: user.id,
          email,
          timestamp: new Date().toISOString()
        });
        
        return res.error(401, '验证码无效或已过期');
      }
      
      const duration = Date.now() - startTime;
      logger.info(`验证重置密码验证码成功 [${requestId}]`, {
        requestId,
        userId: user.id,
        email,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.success(200, '验证码验证成功', {
        userId: user.id,
        email: email
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`验证重置密码验证码失败 [${requestId}]`, {
        requestId,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 获取用户会话列表
  async getSessions(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      // 从JWT token中获取用户ID
      const userId = req.user.sub;
      
      logger.info(`开始获取用户会话列表 [${requestId}]`, {
        requestId,
        userId,
        timestamp: new Date().toISOString()
      });
      
      // 查询用户会话
      const sessionsResult = await pool.query(
        `SELECT id, device_name, device_type, ip_address, user_agent, 
                is_active, last_activity_at, created_at, expires_at
         FROM user_sessions
         WHERE user_id = $1
         ORDER BY last_activity_at DESC`,
        [userId]
      );
      
      const sessions = sessionsResult.rows;
      
      const duration = Date.now() - startTime;
      logger.info(`获取用户会话列表成功 [${requestId}]`, {
        requestId,
        userId,
        sessionCount: sessions.length,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.success(200, '获取用户会话列表成功', sessions);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`获取用户会话列表失败 [${requestId}]`, {
        requestId,
        error: error.message,
        stack: error.stack,
        userId: req.user ? req.user.sub : 'unknown',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 删除指定会话
  async deleteSession(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      // 从JWT token中获取用户ID
      const userId = req.user.sub;
      const { sessionId } = req.params;
      
      logger.info(`开始删除用户会话 [${requestId}]`, {
        requestId,
        userId,
        sessionId,
        timestamp: new Date().toISOString()
      });
      
      // 验证会话是否属于当前用户
      const sessionResult = await pool.query(
        'SELECT id FROM user_sessions WHERE id = $1 AND user_id = $2',
        [sessionId, userId]
      );
      
      if (sessionResult.rows.length === 0) {
        logger.warn(`删除用户会话失败：会话不存在或不属于当前用户 [${requestId}]`, {
          requestId,
          userId,
          sessionId,
          timestamp: new Date().toISOString()
        });
        
        return res.error(404, '会话不存在');
      }
      
      // 删除会话
      await pool.query(
        'DELETE FROM user_sessions WHERE id = $1',
        [sessionId]
      );
      
      const duration = Date.now() - startTime;
      logger.info(`删除用户会话成功 [${requestId}]`, {
        requestId,
        userId,
        sessionId,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.success(200, '删除会话成功');
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`删除用户会话失败 [${requestId}]`, {
        requestId,
        error: error.message,
        stack: error.stack,
        userId: req.user ? req.user.sub : 'unknown',
        sessionId: req.params.sessionId,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 删除所有会话
  async deleteAllSessions(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      // 从JWT token中获取用户ID
      const userId = req.user.sub;
      
      logger.info(`开始删除用户所有会话 [${requestId}]`, {
        requestId,
        userId,
        timestamp: new Date().toISOString()
      });
      
      // 删除用户所有会话
      const result = await pool.query(
        'DELETE FROM user_sessions WHERE user_id = $1 RETURNING id',
        [userId]
      );
      
      const deletedCount = result.rows.length;
      
      const duration = Date.now() - startTime;
      logger.info(`删除用户所有会话成功 [${requestId}]`, {
        requestId,
        userId,
        deletedCount,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.success(200, '删除所有会话成功', {
        deletedCount: deletedCount
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`删除用户所有会话失败 [${requestId}]`, {
        requestId,
        error: error.message,
        stack: error.stack,
        userId: req.user ? req.user.sub : 'unknown',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 绑定第三方账号
  async bindThirdParty(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      // 从JWT token中获取用户ID
      const userId = req.user.sub;
      const { provider, providerId, accessToken, refreshToken, email, name } = req.body;
      
      logger.info(`开始绑定第三方账号 [${requestId}]`, {
        requestId,
        userId,
        provider,
        timestamp: new Date().toISOString()
      });
      
      // 验证必填字段
      if (!provider || !providerId) {
        logger.warn(`绑定第三方账号失败：缺少必填字段 [${requestId}]`, {
          requestId,
          userId,
          provider: provider || '未提供',
          hasProviderId: !!providerId,
          timestamp: new Date().toISOString()
        });
        
        return res.error(400, '第三方平台和平台ID为必填项');
      }
      
      // 检查是否已经绑定过该第三方账号
      const existingBindingResult = await pool.query(
        'SELECT id FROM user_third_party_auths WHERE user_id = $1 AND provider = $2',
        [userId, provider]
      );
      
      if (existingBindingResult.rows.length > 0) {
        logger.warn(`绑定第三方账号失败：已绑定过该平台 [${requestId}]`, {
          requestId,
          userId,
          provider,
          timestamp: new Date().toISOString()
        });
        
        return res.error(409, '已绑定过该第三方平台');
      }
      
      // 检查该第三方账号是否已被其他用户绑定
      const otherUserBindingResult = await pool.query(
        'SELECT user_id FROM user_third_party_auths WHERE provider = $1 AND provider_id = $2',
        [provider, providerId]
      );
      
      if (otherUserBindingResult.rows.length > 0) {
        logger.warn(`绑定第三方账号失败：该账号已被其他用户绑定 [${requestId}]`, {
          requestId,
          userId,
          provider,
          providerId,
          timestamp: new Date().toISOString()
        });
        
        return res.error(409, '该第三方账号已被其他用户绑定');
      }
      
      // 创建绑定记录
      await pool.query(
        `INSERT INTO user_third_party_auths 
         (user_id, provider, provider_id, access_token, refresh_token, email, name, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING id, provider, provider_id, email, name, created_at`,
        [userId, provider, providerId, accessToken, refreshToken, email, name]
      );
      
      const duration = Date.now() - startTime;
      logger.info(`绑定第三方账号成功 [${requestId}]`, {
        requestId,
        userId,
        provider,
        providerId,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.success(201, '绑定第三方账号成功');
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`绑定第三方账号失败 [${requestId}]`, {
        requestId,
        error: error.message,
        stack: error.stack,
        userId: req.user ? req.user.sub : 'unknown',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 用户注册
  async register(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      const { username, password, email, displayName } = req.body;

      logger.info('开始处理用户注册请求 [' + requestId + ']', {
        requestId: requestId,
        username: username,
        email: email,
        displayName: displayName || '未提供',
        timestamp: new Date().toISOString()
      });

      // 基于 express-validator 的校验已在路由层，额外后备校验
      if (!username || !password || !email) {
        logger.warn('用户注册失败：缺少必填字段 [' + requestId + ']', {
          requestId: requestId,
          username: username || '未提供',
          email: email || '未提供',
          hasPassword: !!password,
          timestamp: new Date().toISOString()
        });
        
        return res.error(400, '用户名、密码和邮箱为必填项');
      }
      
      // 使用业务服务处理注册
      const userBusinessService = require('../services/user-business-service');
      const user = await userBusinessService.register({
        username: username,
        password: password,
        email: email,
        name: displayName
      });
      
      const duration = Date.now() - startTime;
      logger.info('用户注册成功 [' + requestId + ']', {
        requestId: requestId,
        userId: user.id,
        username: username,
        email: email,
        duration: duration + 'ms',
        timestamp: new Date().toISOString()
      });

      res.success(201, '用户注册成功', user);

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('用户注册失败 [' + requestId + ']', {
        requestId: requestId,
        error: error.message,
        stack: error.stack,
        username: req.body.username,
        email: req.body.email,
        duration: duration + 'ms',
        timestamp: new Date().toISOString()
      });
      
      // 根据错误类型返回相应的错误码
      if (error.message.includes('已被注册')) {
        return res.error(409, error.message);
      } else if (error.message.includes('密码')) {
        return res.error(400, error.message);
      }
      
      res.error(500, '服务器内部错误');
    }
  }

  // 用户登出
  async logout(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      // 从JWT token中获取用户ID
      const userId = req.user.sub;
      const username = req.user.username;
      
      // 从请求头中提取访问令牌
      const accessToken = req.headers.authorization?.split(' ')[1];
      
      // 从请求体中获取刷新令牌（可选）
      const refreshToken = req.body?.refreshToken;
      
      logger.info(`开始处理用户登出请求 [${requestId}]`, {
        requestId,
        userId,
        username,
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        timestamp: new Date().toISOString()
      });
      
      // 使用业务服务处理登出
      const userBusinessService = require('../services/user-business-service');
      await userBusinessService.logout({
        userId: userId,
        username: username,
        accessToken: accessToken,
        refreshToken: refreshToken
      });

      const duration = Date.now() - startTime;
      logger.info(`处理用户登出请求成功 [${requestId}]`, {
        requestId,
        userId,
        username,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });

      res.success(200, '用户登出成功');

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`处理用户登出请求失败 [${requestId}]`, {
        requestId,
        error: error.message,
        stack: error.stack,
        userId: req.user ? req.user.sub : 'unknown',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });

      res.error(500, '服务器内部错误');
    }
  }

  // 解绑第三方账号
  async unbindThirdParty(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      // 从JWT token中获取用户ID
      const userId = req.user.sub;
      const { id } = req.params;
      
      logger.info(`开始解绑第三方账号 [${requestId}]`, {
        requestId,
        userId,
        thirdPartyId: id,
        timestamp: new Date().toISOString()
      });
      
      // 验证第三方账号是否属于当前用户
      const bindingResult = await pool.query(
        'SELECT id, provider FROM user_third_party_auths WHERE id = $1 AND user_id = $2',
        [id, userId]
      );
      
      if (bindingResult.rows.length === 0) {
        logger.warn(`解绑第三方账号失败：账号不存在或不属于当前用户 [${requestId}]`, {
          requestId,
          userId,
          thirdPartyId: id,
          timestamp: new Date().toISOString()
        });
        
        return res.error(404, '第三方账号不存在');
      }
      
      const binding = bindingResult.rows[0];
      
      // 删除绑定记录
      await pool.query(
        'DELETE FROM user_third_party_auths WHERE id = $1',
        [id]
      );
      
      const duration = Date.now() - startTime;
      logger.info(`解绑第三方账号成功 [${requestId}]`, {
        requestId,
        userId,
        thirdPartyId: id,
        provider: binding.provider,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.success(200, '解绑第三方账号成功');
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`解绑第三方账号失败 [${requestId}]`, {
        requestId,
        error: error.message,
        stack: error.stack,
        userId: req.user ? req.user.sub : 'unknown',
        thirdPartyId: req.params.id,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 获取第三方账号列表
  async getThirdPartyAccounts(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      // 从JWT token中获取用户ID
      const userId = req.user.sub;
      
      logger.info(`开始获取第三方账号列表 [${requestId}]`, {
        requestId,
        userId,
        timestamp: new Date().toISOString()
      });
      
      // 查询用户绑定的第三方账号
      const accountsResult = await pool.query(
        `SELECT id, provider, provider_id, email, name, created_at, updated_at
         FROM user_third_party_auths
         WHERE user_id = $1
         ORDER BY created_at DESC`,
        [userId]
      );
      
      const accounts = accountsResult.rows;
      
      const duration = Date.now() - startTime;
      logger.info(`获取第三方账号列表成功 [${requestId}]`, {
        requestId,
        userId,
        accountCount: accounts.length,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.success(200, '获取第三方账号列表成功', accounts);
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`获取第三方账号列表失败 [${requestId}]`, {
        requestId,
        error: error.message,
        stack: error.stack,
        userId: req.user ? req.user.sub : 'unknown',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 管理员登出
  async adminLogout(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      // 从JWT token中获取用户ID
      const userId = req.user.sub;
      const username = req.user.username;
      
      logger.info(`开始处理管理员登出请求 [${requestId}]`, {
        requestId,
        userId,
        username,
        timestamp: new Date().toISOString()
      });
      
      // 验证用户是否为管理员
      const adminResult = await pool.query(
        `SELECT u.id, u.username 
         FROM users u 
         JOIN user_roles ur ON u.id = ur.user_id 
         JOIN roles r ON ur.role_id = r.id 
         WHERE u.id = $1 AND r.name = 'admin'`,
        [userId]
      );
      
      if (adminResult.rows.length === 0) {
        logger.warn(`管理员登出失败：用户不是管理员 [${requestId}]`, {
          requestId,
          userId,
          username,
          timestamp: new Date().toISOString()
        });
        
        return res.error(403, '无权限访问');
      }
      
      // 从请求头中提取访问令牌
      const accessToken = req.headers.authorization?.split(' ')[1];
      
      // 从请求体中获取刷新令牌（可选）
      const refreshToken = req.body?.refreshToken;
      
      // 使用业务服务处理登出
      const userBusinessService = require('../services/user-business-service');
      await userBusinessService.logout({
        userId: userId,
        username: username,
        accessToken: accessToken,
        refreshToken: refreshToken
      });
      
      const duration = Date.now() - startTime;
      logger.info(`管理员登出成功 [${requestId}]`, {
        requestId,
        userId,
        username,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.success(200, '管理员登出成功');
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`管理员登出失败 [${requestId}]`, {
        requestId,
        error: error.message,
        stack: error.stack,
        userId: req.user ? req.user.sub : 'unknown',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 刷新令牌
  async refreshToken(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      const { refreshToken } = req.body;
      
      logger.info(`开始处理刷新令牌请求 [${requestId}]`, {
        requestId,
        hasRefreshToken: !!refreshToken,
        timestamp: new Date().toISOString()
      });
      
      // 验证刷新令牌是否存在
      if (!refreshToken) {
        logger.warn(`刷新令牌失败：缺少刷新令牌 [${requestId}]`, {
          requestId,
          timestamp: new Date().toISOString()
        });
        
        return res.error(400, '刷新令牌为必填项');
      }
      
      // 验证刷新令牌是否有效
      const tokenManager = new TokenManager();
      let decoded;
      
      try {
        decoded = await tokenManager.verifyRefreshToken(refreshToken);
      } catch (error) {
        logger.warn(`刷新令牌失败：令牌无效或已过期 [${requestId}]`, {
          requestId,
          error: error.message,
          timestamp: new Date().toISOString()
        });
        
        return res.error(401, '刷新令牌无效或已过期');
      }
      
      // 验证用户是否为管理员
      const adminResult = await pool.query(
        `SELECT u.id, u.username 
         FROM users u 
         JOIN user_roles ur ON u.id = ur.user_id 
         JOIN roles r ON ur.role_id = r.id 
         WHERE u.id = $1 AND r.name = 'admin'`,
        [decoded.userId]
      );
      
      if (adminResult.rows.length === 0) {
        logger.warn(`刷新令牌失败：用户不是管理员 [${requestId}]`, {
          requestId,
          userId: decoded.userId,
          timestamp: new Date().toISOString()
        });
        
        return res.error(403, '无权限访问');
      }
      
      // 生成新的访问令牌和刷新令牌
      const newAccessToken = await tokenManager.generateAccessToken({
        userId: decoded.userId,
        username: adminResult.rows[0].username,
        role: 'admin'
      });
      
      const newRefreshToken = await tokenManager.generateRefreshToken({
        userId: decoded.userId,
        username: adminResult.rows[0].username,
        role: 'admin'
      });
      
      // 将旧的刷新令牌加入黑名单
      await tokenManager.addToBlacklist(refreshToken);
      
      const duration = Date.now() - startTime;
      logger.info(`刷新令牌成功 [${requestId}]`, {
        requestId,
        userId: decoded.userId,
        username: adminResult.rows[0].username,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.success(200, '刷新令牌成功', {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`刷新令牌失败 [${requestId}]`, {
        requestId,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 获取当前登录管理员信息
  async getCurrentAdminInfo(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      // 从JWT token中获取用户ID
      const userId = req.user.sub;
      
      logger.info(`开始获取当前管理员信息 [${requestId}]`, {
        requestId,
        userId,
        timestamp: new Date().toISOString()
      });
      
      // 验证用户是否为管理员并获取详细信息
      const adminResult = await pool.query(
        `SELECT u.id, u.username, u.email, u.avatar_url, u.created_at, u.updated_at, u.last_login,
         r.name as role_name
         FROM users u 
         JOIN user_roles ur ON u.id = ur.user_id 
         JOIN roles r ON ur.role_id = r.id 
         WHERE u.id = $1 AND r.name IN ('admin', 'system_admin')`,
        [userId]
      );
      
      if (adminResult.rows.length === 0) {
        logger.warn(`获取管理员信息失败：用户不是管理员 [${requestId}]`, {
          requestId,
          userId,
          timestamp: new Date().toISOString()
        });
        
        return res.error(403, '无权限访问');
      }
      
      const admin = adminResult.rows[0];
      
      // 获取管理员权限
      const permissionResult = await pool.query(
        `SELECT p.code, p.name, p.description
         FROM role_permissions rp 
         JOIN permissions p ON rp.permission_id = p.id 
         JOIN roles r ON rp.role_id = r.id 
         WHERE r.name = $1`,
        [admin.role_name]
      );
      
      const permissions = permissionResult.rows;
      
      // 获取管理员操作统计
      const statsResult = await pool.query(
        `SELECT 
           COUNT(CASE WHEN action_type = 'CREATE' THEN 1 END) as create_count,
           COUNT(CASE WHEN action_type = 'UPDATE' THEN 1 END) as update_count,
           COUNT(CASE WHEN action_type = 'DELETE' THEN 1 END) as delete_count,
           COUNT(CASE WHEN action_type = 'VIEW' THEN 1 END) as view_count
         FROM admin_operation_logs 
         WHERE admin_id = $1 AND created_at > NOW() - INTERVAL '30 days'`,
        [userId]
      );
      
      const stats = statsResult.rows[0];
      
      const duration = Date.now() - startTime;
      logger.info(`获取管理员信息成功 [${requestId}]`, {
        requestId,
        userId,
        username: admin.username,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.success(200, '获取管理员信息成功', {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        avatar: admin.avatar_url,
        role: admin.role_name,
        permissions: permissions,
        stats: {
          createCount: parseInt(stats.create_count) || 0,
          updateCount: parseInt(stats.update_count) || 0,
          deleteCount: parseInt(stats.delete_count) || 0,
          viewCount: parseInt(stats.view_count) || 0
        },
        createdAt: admin.created_at,
        updatedAt: admin.updated_at,
        lastLogin: admin.last_login
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`获取管理员信息失败 [${requestId}]`, {
        requestId,
        error: error.message,
        stack: error.stack,
        userId: req.user ? req.user.sub : 'unknown',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 修改管理员密码
  async changeAdminPassword(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      // 从JWT token中获取用户ID
      const userId = req.user.sub;
      const { currentPassword, newPassword, confirmPassword } = req.body;
      
      logger.info(`开始修改管理员密码 [${requestId}]`, {
        requestId,
        userId,
        timestamp: new Date().toISOString()
      });
      
      // 验证输入参数
      if (!currentPassword || !newPassword || !confirmPassword) {
        logger.warn(`修改密码失败：缺少必填字段 [${requestId}]`, {
          requestId,
          userId,
          hasCurrentPassword: !!currentPassword,
          hasNewPassword: !!newPassword,
          hasConfirmPassword: !!confirmPassword,
          timestamp: new Date().toISOString()
        });
        
        return res.error(400, '请提供当前密码、新密码和确认密码');
      }
      
      if (newPassword !== confirmPassword) {
        logger.warn(`修改密码失败：新密码与确认密码不匹配 [${requestId}]`, {
          requestId,
          userId,
          timestamp: new Date().toISOString()
        });
        
        return res.error(400, '新密码与确认密码不匹配');
      }
      
      // 验证密码强度
      if (newPassword.length < 8) {
        return res.error(400, '新密码长度至少为8位');
      }
      
      // 验证用户是否为管理员
      const adminResult = await pool.query(
        `SELECT u.id, u.username, u.password_hash 
         FROM users u 
         JOIN user_roles ur ON u.id = ur.user_id 
         JOIN roles r ON ur.role_id = r.id 
         WHERE u.id = $1 AND r.name IN ('admin', 'system_admin')`,
        [userId]
      );
      
      if (adminResult.rows.length === 0) {
        logger.warn(`修改密码失败：用户不是管理员 [${requestId}]`, {
          requestId,
          userId,
          timestamp: new Date().toISOString()
        });
        
        return res.error(403, '无权限访问');
      }
      
      const admin = adminResult.rows[0];
      
      // 验证当前密码
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, admin.password_hash);
      
      if (!isCurrentPasswordValid) {
        logger.warn(`修改密码失败：当前密码不正确 [${requestId}]`, {
          requestId,
          userId,
          timestamp: new Date().toISOString()
        });
        
        return res.error(400, '当前密码不正确');
      }
      
      // 加密新密码
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // 更新密码
      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [hashedNewPassword, userId]
      );
      
      // 记录操作日志
      await pool.query(
        `INSERT INTO admin_operation_logs (admin_id, action_type, resource_type, description, ip_address, user_agent)
         VALUES ($1, 'UPDATE', 'PASSWORD', $2, $3, $4)`,
        [userId, '修改管理员密码', req.ip, req.get('User-Agent')]
      );
      
      const duration = Date.now() - startTime;
      logger.info(`修改管理员密码成功 [${requestId}]`, {
        requestId,
        userId,
        username: admin.username,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.success(200, '密码修改成功');
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`修改管理员密码失败 [${requestId}]`, {
        requestId,
        error: error.message,
        stack: error.stack,
        userId: req.user ? req.user.sub : 'unknown',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 获取管理员操作日志
  async getAdminOperationLogs(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      // 从JWT token中获取用户ID
      const userId = req.user.sub;
      const { page = 1, limit = 20, startDate, endDate, actionType, resourceType } = req.query;
      
      logger.info(`开始获取管理员操作日志 [${requestId}]`, {
        requestId,
        userId,
        page,
        limit,
        startDate,
        endDate,
        actionType,
        resourceType,
        timestamp: new Date().toISOString()
      });
      
      // 验证用户是否为管理员
      const adminResult = await pool.query(
        `SELECT u.id, u.username 
         FROM users u 
         JOIN user_roles ur ON u.id = ur.user_id 
         JOIN roles r ON ur.role_id = r.id 
         WHERE u.id = $1 AND r.name IN ('admin', 'system_admin')`,
        [userId]
      );
      
      if (adminResult.rows.length === 0) {
        logger.warn(`获取操作日志失败：用户不是管理员 [${requestId}]`, {
          requestId,
          userId,
          timestamp: new Date().toISOString()
        });
        
        return res.error(403, '无权限访问');
      }
      
      // 构建查询条件
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;
      
      if (startDate) {
        whereConditions.push(`created_at >= $${paramIndex}`);
        queryParams.push(startDate);
        paramIndex++;
      }
      
      if (endDate) {
        whereConditions.push(`created_at <= $${paramIndex}`);
        queryParams.push(endDate);
        paramIndex++;
      }
      
      if (actionType) {
        whereConditions.push(`action_type = $${paramIndex}`);
        queryParams.push(actionType);
        paramIndex++;
      }
      
      if (resourceType) {
        whereConditions.push(`resource_type = $${paramIndex}`);
        queryParams.push(resourceType);
        paramIndex++;
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      // 获取总数
      const countQuery = `SELECT COUNT(*) as total FROM admin_operation_logs ${whereClause}`;
      const countResult = await pool.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);
      
      // 计算偏移量
      const offset = (page - 1) * limit;
      
      // 获取分页数据
      const dataQuery = `
        SELECT 
          aol.id,
          aol.admin_id,
          u.username as admin_name,
          aol.action_type,
          aol.resource_type,
          aol.resource_id,
          aol.description,
          aol.ip_address,
          aol.user_agent,
          aol.created_at
        FROM admin_operation_logs aol
        JOIN users u ON aol.admin_id = u.id
        ${whereClause}
        ORDER BY aol.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      const dataResult = await pool.query(dataQuery, queryParams);
      
      const duration = Date.now() - startTime;
      logger.info(`获取管理员操作日志成功 [${requestId}]`, {
        requestId,
        userId,
        total,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.success(200, '获取操作日志成功', {
        logs: dataResult.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`获取管理员操作日志失败 [${requestId}]`, {
        requestId,
        error: error.message,
        stack: error.stack,
        userId: req.user ? req.user.sub : 'unknown',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 获取管理员权限列表
  async getAdminPermissions(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      // 从JWT token中获取用户ID
      const userId = req.user.sub;
      
      logger.info(`开始获取管理员权限列表 [${requestId}]`, {
        requestId,
        userId,
        timestamp: new Date().toISOString()
      });
      
      // 验证用户是否为管理员
      const adminResult = await pool.query(
        `SELECT u.id, u.username 
         FROM users u 
         JOIN user_roles ur ON u.id = ur.user_id 
         JOIN roles r ON ur.role_id = r.id 
         WHERE u.id = $1 AND r.name IN ('admin', 'system_admin')`,
        [userId]
      );
      
      if (adminResult.rows.length === 0) {
        logger.warn(`获取权限列表失败：用户不是管理员 [${requestId}]`, {
          requestId,
          userId,
          timestamp: new Date().toISOString()
        });
        
        return res.error(403, '无权限访问');
      }
      
      // 获取所有权限
      const permissionResult = await pool.query(
        `SELECT p.id, p.code, p.name, p.description, p.category, p.created_at
         FROM permissions p
         ORDER BY p.category, p.name`
      );
      
      // 按类别分组权限
      const permissionsByCategory = {};
      permissionResult.rows.forEach(permission => {
        if (!permissionsByCategory[permission.category]) {
          permissionsByCategory[permission.category] = [];
        }
        permissionsByCategory[permission.category].push({
          id: permission.id,
          code: permission.code,
          name: permission.name,
          description: permission.description,
          createdAt: permission.created_at
        });
      });
      
      const duration = Date.now() - startTime;
      logger.info(`获取管理员权限列表成功 [${requestId}]`, {
        requestId,
        userId,
        totalPermissions: permissionResult.rows.length,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.success(200, '获取权限列表成功', {
        permissions: permissionsByCategory
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`获取管理员权限列表失败 [${requestId}]`, {
        requestId,
        error: error.message,
        stack: error.stack,
        userId: req.user ? req.user.sub : 'unknown',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 获取管理员会话信息
  async getAdminSessions(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      // 从JWT token中获取用户ID
      const userId = req.user.sub;
      
      logger.info(`开始获取管理员会话信息 [${requestId}]`, {
        requestId,
        userId,
        timestamp: new Date().toISOString()
      });
      
      // 验证用户是否为管理员
      const adminResult = await pool.query(
        `SELECT u.id, u.username 
         FROM users u 
         JOIN user_roles ur ON u.id = ur.user_id 
         JOIN roles r ON ur.role_id = r.id 
         WHERE u.id = $1 AND r.name IN ('admin', 'system_admin')`,
        [userId]
      );
      
      if (adminResult.rows.length === 0) {
        logger.warn(`获取会话信息失败：用户不是管理员 [${requestId}]`, {
          requestId,
          userId,
          timestamp: new Date().toISOString()
        });
        
        return res.error(403, '无权限访问');
      }
      
      // 获取管理员会话信息
      const sessionResult = await pool.query(
        `SELECT 
           s.id,
           s.session_token,
           s.ip_address,
           s.user_agent,
           s.is_active,
           s.created_at,
           s.expires_at,
           s.last_activity
         FROM admin_sessions s
         WHERE s.admin_id = $1
         ORDER BY s.created_at DESC`,
        [userId]
      );
      
      // 获取当前会话信息
      const currentToken = req.headers.authorization?.split(' ')[1];
      const currentSession = sessionResult.rows.find(session => session.session_token === currentToken);
      
      const duration = Date.now() - startTime;
      logger.info(`获取管理员会话信息成功 [${requestId}]`, {
        requestId,
        userId,
        totalSessions: sessionResult.rows.length,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.success(200, '获取会话信息成功', {
        sessions: sessionResult.rows.map(session => ({
          id: session.id,
          ipAddress: session.ip_address,
          userAgent: session.user_agent,
          isActive: session.is_active,
          createdAt: session.created_at,
          expiresAt: session.expires_at,
          lastActivity: session.last_activity,
          isCurrent: session.session_token === currentToken
        })),
        currentSession: currentSession ? {
          id: currentSession.id,
          ipAddress: currentSession.ip_address,
          userAgent: currentSession.user_agent,
          createdAt: currentSession.created_at,
          expiresAt: currentSession.expires_at,
          lastActivity: currentSession.last_activity
        } : null
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`获取管理员会话信息失败 [${requestId}]`, {
        requestId,
        error: error.message,
        stack: error.stack,
        userId: req.user ? req.user.sub : 'unknown',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 验证管理员权限
  async verifyAdminPermission(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      // 从JWT token中获取用户ID
      const userId = req.user.sub;
      const { permission } = req.body;
      
      logger.info(`开始验证管理员权限 [${requestId}]`, {
        requestId,
        userId,
        permission,
        timestamp: new Date().toISOString()
      });
      
      // 验证输入参数
      if (!permission) {
        logger.warn(`验证权限失败：缺少权限参数 [${requestId}]`, {
          requestId,
          userId,
          timestamp: new Date().toISOString()
        });
        
        return res.error(400, '权限参数为必填项');
      }
      
      // 验证用户是否为管理员
      const adminResult = await pool.query(
        `SELECT u.id, u.username, r.name as role_name
         FROM users u 
         JOIN user_roles ur ON u.id = ur.user_id 
         JOIN roles r ON ur.role_id = r.id 
         WHERE u.id = $1 AND r.name IN ('admin', 'system_admin')`,
        [userId]
      );
      
      if (adminResult.rows.length === 0) {
        logger.warn(`验证权限失败：用户不是管理员 [${requestId}]`, {
          requestId,
          userId,
          timestamp: new Date().toISOString()
        });
        
        return res.error(403, '无权限访问');
      }
      
      const admin = adminResult.rows[0];
      
      // 检查权限
      const permissionResult = await pool.query(
        `SELECT p.code, p.name
         FROM role_permissions rp 
         JOIN permissions p ON rp.permission_id = p.id 
         JOIN roles r ON rp.role_id = r.id 
         WHERE r.name = $1 AND p.code = $2`,
        [admin.role_name, permission]
      );
      
      const hasPermission = permissionResult.rows.length > 0;
      
      const duration = Date.now() - startTime;
      logger.info(`验证管理员权限完成 [${requestId}]`, {
        requestId,
        userId,
        username: admin.username,
        permission,
        hasPermission,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.success(200, '权限验证完成', {
        hasPermission,
        permission: hasPermission ? permissionResult.rows[0] : null,
        role: admin.role_name
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`验证管理员权限失败 [${requestId}]`, {
        requestId,
        error: error.message,
        stack: error.stack,
        userId: req.user ? req.user.sub : 'unknown',
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 获取用户详情 - 管理员专用
  async getUserById(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      const { id } = req.params;
      const operatorId = req.user?.sub; // 操作人ID
      
      logger.info(`开始获取用户详情 [${requestId}]`, {
        requestId,
        userId: id,
        operatorId,
        timestamp: new Date().toISOString()
      });
      
      // 验证用户是否存在
      let user;
      try {
        const userResult = await pool.query(
          `SELECT u.id, u.username, u.email, u.avatar_url, u.status as is_active, 
                  u.created_at, u.updated_at, u.mfa_enabled, u.last_login,
                  r.name as role,
                  COALESCE(up.full_name, up.nickname, u.username) as display_name
           FROM users u
           LEFT JOIN user_profiles up ON u.id = up.user_id
           LEFT JOIN user_roles ur ON u.id = ur.user_id
           LEFT JOIN roles r ON ur.role_id = r.id
           WHERE u.id = $1`,
          [id]
        );
        
        if (userResult.rows.length === 0) {
          logger.warn(`获取用户详情失败：用户不存在 [${requestId}]`, {
            requestId,
            userId: id,
            operatorId,
            timestamp: new Date().toISOString()
          });
          
          return res.error(404, '用户不存在');
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
        
        return res.error(500, '查询用户信息失败');
      }
      
      // 获取用户权限
      let permissions = [];
      try {
        const permissionResult = await pool.query(
          `SELECT p.id, p.name, p.code, p.description
           FROM role_permissions rp
           JOIN permissions p ON rp.permission_id = p.id
           JOIN user_roles ur ON rp.role_id = ur.role_id
           WHERE ur.user_id = $1`,
          [id]
        );
        
        permissions = permissionResult.rows;
      } catch (permissionError) {
        logger.warn(`获取用户权限时发生错误 [${requestId}]`, {
          requestId,
          userId: id,
          error: permissionError.message,
          timestamp: new Date().toISOString()
        });
      }
      
      const duration = Date.now() - startTime;
      logger.info(`获取用户详情成功 [${requestId}]`, {
        requestId,
        userId: id,
        username: user.username,
        operatorId,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.success(200, '获取用户详情成功', {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          displayName: user.display_name,
          avatarUrl: user.avatar_url,
          isActive: user.status === 'active',
          role: user.role,
          mfaEnabled: user.mfa_enabled,
          lastLogin: user.last_login,
          createdAt: user.created_at,
          updatedAt: user.updated_at
        },
        permissions
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`获取用户详情失败 [${requestId}]`, {
        requestId,
        userId: req.params.id,
        operatorId: req.user?.sub,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 创建用户 - 管理员专用
  async createUser(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      const { username, password, email, displayName, role } = req.body;
      const operatorId = req.user?.sub; // 操作人ID
      
      logger.info(`开始创建用户 [${requestId}]`, {
        requestId,
        username,
        email,
        displayName: displayName || '未提供',
        role: role || 'user',
        operatorId,
        timestamp: new Date().toISOString()
      });
      
      // 检查用户名是否已存在
      const existingUserResult = await pool.query(
        'SELECT id FROM users WHERE username = $1',
        [username]
      );
      const existingUser = existingUserResult.rows;

      if (existingUser.length > 0) {
        logger.warn(`创建用户失败：用户名已存在 [${requestId}]`, {
          requestId,
          username,
          email,
          operatorId,
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
        logger.warn(`创建用户失败：邮箱已存在 [${requestId}]`, {
          requestId,
          username,
          email,
          operatorId,
          timestamp: new Date().toISOString()
        });
        
        return res.error(409, '邮箱已被注册');
      }

      // 加密密码
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // 开始事务
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // 插入用户记录并返回ID
        const result = await client.query(
          `INSERT INTO users (username, password_hash, email, display_name, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id`,
          [username, hashedPassword, email, displayName || username]
        );

        const userId = result.rows[0].id;
        
        // 如果指定了角色，分配角色
        if (role && role !== 'user') {
          // 获取角色ID
          const roleResult = await client.query(
            'SELECT id FROM roles WHERE name = $1',
            [role]
          );
          
          if (roleResult.rows.length > 0) {
            const roleId = roleResult.rows[0].id;
            
            // 分配角色
            await client.query(
              'INSERT INTO user_roles (user_id, role_id, assigned_by) VALUES ($1, $2, $3)',
              [userId, roleId, operatorId]
            );
            
            logger.info(`用户角色分配成功 [${requestId}]`, {
              requestId,
              userId,
              role,
              operatorId,
              timestamp: new Date().toISOString()
            });
          }
        }
        
        await client.query('COMMIT');
        
        // 获取创建的用户记录
        const userRowsResult = await pool.query(
          'SELECT id, username, email, display_name, is_active, created_at FROM users WHERE id = $1',
          [userId]
        );
        const userRows = userRowsResult.rows;
        const user = userRows[0];
        
        const duration = Date.now() - startTime;
        logger.info(`创建用户成功 [${requestId}]`, {
          requestId,
          userId: user.id,
          username,
          email,
          role: role || 'user',
          operatorId,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        });

        res.success(201, '用户创建成功', {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            displayName: user.display_name,
            isActive: user.is_active,
            role: role || 'user',
            createdAt: user.created_at
          }
        });
        
      } catch (transactionError) {
        await client.query('ROLLBACK');
        throw transactionError;
      } finally {
        client.release();
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`创建用户失败 [${requestId}]`, {
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

  // 更新用户信息 - 管理员专用
  async updateUser(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      const { id } = req.params;
      const { username, email, displayName } = req.body;
      const operatorId = req.user?.sub; // 操作人ID
      
      logger.info(`开始更新用户信息 [${requestId}]`, {
        requestId,
        userId: id,
        updates: { username, email, displayName },
        operatorId,
        timestamp: new Date().toISOString()
      });
      
      // 验证用户是否存在
      let user;
      try {
        const userResult = await pool.query(
          'SELECT id, username, email, display_name FROM users WHERE id = $1',
          [id]
        );
        
        if (userResult.rows.length === 0) {
          logger.warn(`更新用户信息失败：用户不存在 [${requestId}]`, {
            requestId,
            userId: id,
            operatorId,
            timestamp: new Date().toISOString()
          });
          
          return res.error(404, '用户不存在');
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
        
        return res.error(500, '查询用户信息失败');
      }
      
      // 检查用户名是否已被其他用户使用
      if (username && username !== user.username) {
        try {
          const existingUserResult = await pool.query(
            'SELECT id FROM users WHERE username = $1 AND id != $2',
            [username, id]
          );
          
          if (existingUserResult.rows.length > 0) {
            logger.warn(`更新用户信息失败：用户名已被使用 [${requestId}]`, {
              requestId,
              userId: id,
              newUsername: username,
              operatorId,
              timestamp: new Date().toISOString()
            });
            
            return res.error(409, '用户名已被使用');
          }
        } catch (usernameError) {
          logger.error(`检查用户名唯一性时发生错误 [${requestId}]`, {
            requestId,
            userId: id,
            newUsername: username,
            error: usernameError.message,
            stack: usernameError.stack,
            timestamp: new Date().toISOString()
          });
          
          return res.error(500, '检查用户名唯一性失败');
        }
      }
      
      // 检查邮箱是否已被其他用户使用
      if (email && email !== user.email) {
        try {
          const existingEmailResult = await pool.query(
            'SELECT id FROM users WHERE email = $1 AND id != $2',
            [email, id]
          );
          
          if (existingEmailResult.rows.length > 0) {
            logger.warn(`更新用户信息失败：邮箱已被使用 [${requestId}]`, {
              requestId,
              userId: id,
              newEmail: email,
              operatorId,
              timestamp: new Date().toISOString()
            });
            
            return res.error(409, '邮箱已被使用');
          }
        } catch (emailError) {
          logger.error(`检查邮箱唯一性时发生错误 [${requestId}]`, {
            requestId,
            userId: id,
            newEmail: email,
            error: emailError.message,
            stack: emailError.stack,
            timestamp: new Date().toISOString()
          });
          
          return res.error(500, '检查邮箱唯一性失败');
        }
      }
      
      // 构建更新查询
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;
      
      if (username !== undefined) {
        updateFields.push(`username = $${paramIndex++}`);
        updateValues.push(username);
      }
      
      if (email !== undefined) {
        updateFields.push(`email = $${paramIndex++}`);
        updateValues.push(email);
      }
      
      if (displayName !== undefined) {
        updateFields.push(`display_name = $${paramIndex++}`);
        updateValues.push(displayName);
      }
      
      // 如果没有要更新的字段
      if (updateFields.length === 0) {
        logger.warn(`更新用户信息失败：没有提供要更新的字段 [${requestId}]`, {
          requestId,
          userId: id,
          operatorId,
          timestamp: new Date().toISOString()
        });
        
        return res.error(400, '没有提供要更新的字段');
      }
      
      // 添加更新时间和用户ID
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(id);
      
      // 执行更新
      try {
        const updateQuery = `
          UPDATE users 
          SET ${updateFields.join(', ')} 
          WHERE id = $${paramIndex}
          RETURNING id, username, email, display_name, is_active, updated_at
        `;
        
        const updateResult = await pool.query(updateQuery, updateValues);
        const updatedUser = updateResult.rows[0];
        
        const duration = Date.now() - startTime;
        logger.info(`更新用户信息成功 [${requestId}]`, {
          requestId,
          userId: id,
          updatedFields: Object.keys({ username, email, displayName }).filter(key => req.body[key] !== undefined),
          operatorId,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        });
        
        res.success(200, '用户信息更新成功', {
          user: {
            id: updatedUser.id,
            username: updatedUser.username,
            email: updatedUser.email,
            displayName: updatedUser.display_name,
            isActive: updatedUser.is_active,
            updatedAt: updatedUser.updated_at
          }
        });
        
      } catch (updateError) {
        logger.error(`更新用户信息时发生错误 [${requestId}]`, {
          requestId,
          userId: id,
          error: updateError.message,
          stack: updateError.stack,
          timestamp: new Date().toISOString()
        });
        
        return res.error(500, '更新用户信息失败');
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`更新用户信息失败 [${requestId}]`, {
        requestId,
        userId: req.params.id,
        operatorId: req.user?.sub,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 更新用户状态 - 管理员专用
  async updateUserStatus(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      const { id } = req.params;
      const { status } = req.body;
      const operatorId = req.user?.sub; // 操作人ID
      
      logger.info(`开始更新用户状态 [${requestId}]`, {
        requestId,
        userId: id,
        status,
        operatorId,
        timestamp: new Date().toISOString()
      });
      
      // 验证用户是否存在
      let user;
      try {
        const userResult = await pool.query(
          'SELECT id, username, is_active FROM users WHERE id = $1',
          [id]
        );
        
        if (userResult.rows.length === 0) {
          logger.warn(`更新用户状态失败：用户不存在 [${requestId}]`, {
            requestId,
            userId: id,
            operatorId,
            timestamp: new Date().toISOString()
          });
          
          return res.error(404, '用户不存在');
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
        
        return res.error(500, '查询用户信息失败');
      }
      
      // 检查状态是否已经是目标状态
      const isActive = status === 'active';
      if (user.is_active === isActive) {
        logger.warn(`更新用户状态失败：状态已经是目标状态 [${requestId}]`, {
          requestId,
          userId: id,
          currentStatus: user.is_active ? 'active' : 'inactive',
          targetStatus: status,
          operatorId,
          timestamp: new Date().toISOString()
        });
        
        return res.error(400, `用户状态已经是${status}`);
      }
      
      // 更新用户状态
      try {
        const updateResult = await pool.query(
          'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, is_active, updated_at',
          [isActive, id]
        );
        
        const updatedUser = updateResult.rows[0];
        
        const duration = Date.now() - startTime;
        logger.info(`更新用户状态成功 [${requestId}]`, {
          requestId,
          userId: id,
          username: updatedUser.username,
          previousStatus: user.is_active ? 'active' : 'inactive',
          newStatus: status,
          operatorId,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        });
        
        res.success(200, '用户状态更新成功', {
          user: {
            id: updatedUser.id,
            username: updatedUser.username,
            isActive: updatedUser.is_active,
            updatedAt: updatedUser.updated_at
          }
        });
        
      } catch (updateError) {
        logger.error(`更新用户状态时发生错误 [${requestId}]`, {
          requestId,
          userId: id,
          error: updateError.message,
          stack: updateError.stack,
          timestamp: new Date().toISOString()
        });
        
        return res.error(500, '更新用户状态失败');
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`更新用户状态失败 [${requestId}]`, {
        requestId,
        userId: req.params.id,
        status: req.body.status,
        operatorId: req.user?.sub,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 重置用户密码 - 管理员专用
  async resetUserPassword(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      const operatorId = req.user?.sub; // 操作人ID
      
      logger.info(`开始重置用户密码 [${requestId}]`, {
        requestId,
        userId: id,
        operatorId,
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
          logger.warn(`重置用户密码失败：用户不存在 [${requestId}]`, {
            requestId,
            userId: id,
            operatorId,
            timestamp: new Date().toISOString()
          });
          
          return res.error(404, '用户不存在');
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
        
        return res.error(500, '查询用户信息失败');
      }
      
      // 加密新密码
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      // 更新密码
      try {
        const updateResult = await pool.query(
          'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2 RETURNING id, username, updated_at',
          [hashedPassword, id]
        );
        
        const updatedUser = updateResult.rows[0];
        
        const duration = Date.now() - startTime;
        logger.info(`重置用户密码成功 [${requestId}]`, {
          requestId,
          userId: id,
          username: updatedUser.username,
          operatorId,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        });
        
        res.success(200, '用户密码重置成功', {
          user: {
            id: updatedUser.id,
            username: updatedUser.username,
            updatedAt: updatedUser.updated_at
          }
        });
        
      } catch (updateError) {
        logger.error(`重置用户密码时发生错误 [${requestId}]`, {
          requestId,
          userId: id,
          error: updateError.message,
          stack: updateError.stack,
          timestamp: new Date().toISOString()
        });
        
        return res.error(500, '重置用户密码失败');
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`重置用户密码失败 [${requestId}]`, {
        requestId,
        userId: req.params.id,
        operatorId: req.user?.sub,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 删除用户 - 管理员专用
  async deleteUser(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      const { id } = req.params;
      const operatorId = req.user?.sub; // 操作人ID
      
      logger.info(`开始删除用户 [${requestId}]`, {
        requestId,
        userId: id,
        operatorId,
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
          logger.warn(`删除用户失败：用户不存在 [${requestId}]`, {
            requestId,
            userId: id,
            operatorId,
            timestamp: new Date().toISOString()
          });
          
          return res.error(404, '用户不存在');
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
        
        return res.error(500, '查询用户信息失败');
      }
      
      // 检查是否有关联数据
      try {
        // 检查账单
        const billResult = await pool.query(
          'SELECT COUNT(*) as count FROM bills WHERE user_id = $1',
          [id]
        );
        
        // 检查支付记录
        const paymentResult = await pool.query(
          'SELECT COUNT(*) as count FROM payments WHERE user_id = $1',
          [id]
        );
        
        // 检查房间关联
        const roomResult = await pool.query(
          'SELECT COUNT(*) as count FROM room_members WHERE user_id = $1',
          [id]
        );
        
        const billCount = parseInt(billResult.rows[0].count);
        const paymentCount = parseInt(paymentResult.rows[0].count);
        const roomCount = parseInt(roomResult.rows[0].count);
        
        if (billCount > 0 || paymentCount > 0 || roomCount > 0) {
          logger.warn(`删除用户失败：用户有关联数据 [${requestId}]`, {
            requestId,
            userId: id,
            username: user.username,
            billCount,
            paymentCount,
            roomCount,
            operatorId,
            timestamp: new Date().toISOString()
          });
          
          return res.error(400, '无法删除用户：用户有关联数据，请先处理关联数据');
        }
      } catch (checkError) {
        logger.error(`检查用户关联数据时发生错误 [${requestId}]`, {
          requestId,
          userId: id,
          error: checkError.message,
          stack: checkError.stack,
          timestamp: new Date().toISOString()
        });
        
        return res.error(500, '检查用户关联数据失败');
      }
      
      // 开始事务删除用户
      const client = await pool.connect();
      
      try {
        await client.query('BEGIN');
        
        // 删除用户角色关联
        await client.query('DELETE FROM user_roles WHERE user_id = $1', [id]);
        
        // 删除用户
        await client.query('DELETE FROM users WHERE id = $1', [id]);
        
        await client.query('COMMIT');
        
        const duration = Date.now() - startTime;
        logger.info(`删除用户成功 [${requestId}]`, {
          requestId,
          userId: id,
          username: user.username,
          operatorId,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        });
        
        res.success(200, '用户删除成功', {
          user: {
            id: user.id,
            username: user.username
          }
        });
        
      } catch (transactionError) {
        await client.query('ROLLBACK');
        throw transactionError;
      } finally {
        client.release();
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`删除用户失败 [${requestId}]`, {
        requestId,
        userId: req.params.id,
        operatorId: req.user?.sub,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 批量更新用户状态 - 管理员专用
  async batchUpdateUserStatus(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      const { userIds, status } = req.body;
      const operatorId = req.user?.sub; // 操作人ID
      
      logger.info(`开始批量更新用户状态 [${requestId}]`, {
        requestId,
        userIds,
        status,
        operatorId,
        timestamp: new Date().toISOString()
      });
      
      // 验证用户是否存在
      try {
        const userResult = await pool.query(
          'SELECT id, username, is_active FROM users WHERE id = ANY($1)',
          [userIds]
        );
        
        if (userResult.rows.length === 0) {
          logger.warn(`批量更新用户状态失败：没有找到用户 [${requestId}]`, {
            requestId,
            userIds,
            operatorId,
            timestamp: new Date().toISOString()
          });
          
          return res.error(404, '没有找到用户');
        }
        
        if (userResult.rows.length !== userIds.length) {
          logger.warn(`批量更新用户状态失败：部分用户不存在 [${requestId}]`, {
            requestId,
            requestedIds: userIds,
            foundIds: userResult.rows.map(u => u.id),
            operatorId,
            timestamp: new Date().toISOString()
          });
          
          return res.error(404, '部分用户不存在');
        }
        
        // 检查是否所有用户状态都需要更新
        const isActive = status === 'active';
        const usersNeedingUpdate = userResult.rows.filter(user => user.is_active !== isActive);
        
        if (usersNeedingUpdate.length === 0) {
          logger.warn(`批量更新用户状态失败：所有用户状态已经是目标状态 [${requestId}]`, {
            requestId,
            userIds,
            status,
            operatorId,
            timestamp: new Date().toISOString()
          });
          
          return res.error(400, `所有用户状态已经是${status}`);
        }
        
        // 更新用户状态
        const updateResult = await pool.query(
          'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = ANY($2) RETURNING id, username, is_active, updated_at',
          [isActive, usersNeedingUpdate.map(user => user.id)]
        );
        
        const updatedUsers = updateResult.rows;
        
        const duration = Date.now() - startTime;
        logger.info(`批量更新用户状态成功 [${requestId}]`, {
          requestId,
          updatedCount: updatedUsers.length,
          status,
          operatorId,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        });
        
        res.success(200, '用户状态批量更新成功', {
          users: updatedUsers.map(user => ({
            id: user.id,
            username: user.username,
            isActive: user.is_active,
            updatedAt: user.updated_at
          })),
          updatedCount: updatedUsers.length
        });
        
      } catch (updateError) {
        logger.error(`批量更新用户状态时发生错误 [${requestId}]`, {
          requestId,
          userIds,
          error: updateError.message,
          stack: updateError.stack,
          timestamp: new Date().toISOString()
        });
        
        return res.error(500, '批量更新用户状态失败');
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`批量更新用户状态失败 [${requestId}]`, {
        requestId,
        userIds: req.body.userIds,
        status: req.body.status,
        operatorId: req.user?.sub,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }

  // 获取用户统计信息 - 管理员专用
  async getUserStatistics(req, res) {
    // 生成请求ID用于日志追踪
    const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    try {
      const operatorId = req.user?.sub; // 操作人ID
      
      logger.info(`开始获取用户统计信息 [${requestId}]`, {
        requestId,
        operatorId,
        timestamp: new Date().toISOString()
      });
      
      let statistics = {};
      
      try {
        // 获取用户总数
        const totalUsersResult = await pool.query('SELECT COUNT(*) as count FROM users');
        statistics.totalUsers = parseInt(totalUsersResult.rows[0].count);
        
        // 获取活跃用户数
        const activeUsersResult = await pool.query('SELECT COUNT(*) as count FROM users WHERE is_active = true');
        statistics.activeUsers = parseInt(activeUsersResult.rows[0].count);
        
        // 获取非活跃用户数
        statistics.inactiveUsers = statistics.totalUsers - statistics.activeUsers;
        
        // 获取各角色用户数
        const roleStatsResult = await pool.query(
          `SELECT r.name as role, COUNT(*) as count
           FROM roles r
           LEFT JOIN user_roles ur ON r.id = ur.role_id
           GROUP BY r.id, r.name
           ORDER BY count DESC`
        );
        statistics.roleDistribution = roleStatsResult.rows;
        
        // 获取最近30天注册用户数
        const recentUsersResult = await pool.query(
          `SELECT COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL '30 days'`
        );
        statistics.recentRegistrations = parseInt(recentUsersResult.rows[0].count);
        
        // 获取最近30天活跃用户数
        const recentActiveUsersResult = await pool.query(
          `SELECT COUNT(*) as count FROM users WHERE last_login >= NOW() - INTERVAL '30 days'`
        );
        statistics.recentActiveUsers = parseInt(recentActiveUsersResult.rows[0].count);
        
        // 获取按月注册用户统计（最近12个月）
        const monthlyRegistrationsResult = await pool.query(
          `SELECT 
             DATE_TRUNC('month', created_at) as month,
             COUNT(*) as count
           FROM users 
           WHERE created_at >= NOW() - INTERVAL '12 months'
           GROUP BY DATE_TRUNC('month', created_at)
           ORDER BY month ASC`
        );
        statistics.monthlyRegistrations = monthlyRegistrationsResult.rows;
        
        const duration = Date.now() - startTime;
        logger.info(`获取用户统计信息成功 [${requestId}]`, {
          requestId,
          operatorId,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString()
        });
        
        res.success(200, '获取用户统计信息成功', statistics);
        
      } catch (statsError) {
        logger.error(`获取用户统计信息时发生错误 [${requestId}]`, {
          requestId,
          error: statsError.message,
          stack: statsError.stack,
          timestamp: new Date().toISOString()
        });
        
        return res.error(500, '获取用户统计信息失败');
      }
      
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error(`获取用户统计信息失败 [${requestId}]`, {
        requestId,
        operatorId: req.user?.sub,
        error: error.message,
        stack: error.stack,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString()
      });
      
      res.error(500, '服务器内部错误');
    }
  }
}

module.exports = new UserController();