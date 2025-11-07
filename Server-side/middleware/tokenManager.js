/**
 * 统一Token管理模块
 * 整合JWT认证、Token验证、Token长度限制等功能
 */

const jwt = require('jsonwebtoken');
const { logger } = require('../config/logger');
const { getEnvironmentConfig } = require('../config/environment');
const crypto = require('crypto');

const envConfig = getEnvironmentConfig();

/**
 * Token配置（支持密钥轮换与更强算法）
 */
const tokenConfig = {
  // JWT配置
  jwt: {
    accessSecrets: envConfig.jwtKeys.accessSecrets.length ? envConfig.jwtKeys.accessSecrets : [(process.env.JWT_SECRET || 'change-me-please-change-me-32chars-minimum')],
    refreshSecrets: envConfig.jwtKeys.refreshSecrets.length ? envConfig.jwtKeys.refreshSecrets : [(process.env.JWT_REFRESH_SECRET || 'change-me-please-change-me-32chars-minimum-refresh')],
    accessTokenExpiry: process.env.JWT_EXPIRES_IN || '1h',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    algorithm: envConfig.jwtKeys.algorithm || 'HS512'
  },
  
  // Token长度限制配置
  lengthLimits: {
    // 最大token长度（字符数）
    maxTokenLength: 8000,
    
    // 最大请求体大小（字节）
    maxRequestBodySize: 10 * 1024 * 1024, // 10MB
    
    // 需要检查token长度的路径
    protectedPaths: [
      '/api/ai/chat',
      '/api/ai/analyze',
      '/api/ai/generate',
      '/api/ai/process'
    ],
    
    // 需要检查token长度的HTTP方法
    protectedMethods: ['POST', 'PUT', 'PATCH']
  }
};

/**
 * Token工具类
 */
// 简易刷新令牌撤销表（内存），生产多副本建议集中式存储
const revokedRefreshJti = new Map(); // jti -> expiresAt(ms)
function revokeRefreshJti(jti, ttlMs) {
  revokedRefreshJti.set(jti, Date.now() + ttlMs);
}
function isRefreshJtiRevoked(jti) {
  const exp = revokedRefreshJti.get(jti);
  if (!exp) return false;
  if (Date.now() > exp) { revokedRefreshJti.delete(jti); return false; }
  return true;
}

class TokenManager {
  /**
   * 生成访问令牌
   * @param {Object} payload - 令牌载荷
   * @param {string} payload.sub - 用户ID
   * @param {string} payload.username - 用户名
   * @param {Array} payload.roles - 用户角色
   * @param {Array} payload.permissions - 用户权限
   * @returns {string} 访问令牌
   */
  static generateAccessToken(payload) {
    const { sub, username, roles = ['user'], permissions = ['read', 'write'] } = payload;
    const currentSecret = tokenConfig.jwt.accessSecrets[0];
    const kid = crypto.createHash('sha256').update(currentSecret).digest('hex').slice(0, 16);
    const jti = crypto.randomUUID();
    
    // 确保roles和permissions是数组
    const userRoles = Array.isArray(roles) ? roles : [roles];
    const userPermissions = Array.isArray(permissions) ? permissions : [permissions];
    
    return jwt.sign(
      { 
        sub,
        username,
        roles: userRoles,
        permissions: userPermissions,
        jti
      },
      currentSecret,
      { 
        expiresIn: tokenConfig.jwt.accessTokenExpiry,
        algorithm: tokenConfig.jwt.algorithm,
        header: { kid }
      }
    );
  }

  /**
   * 生成刷新令牌
   * @param {string} userId - 用户ID
   * @returns {string} 刷新令牌
   */
  static generateRefreshToken(userId) {
    const currentSecret = tokenConfig.jwt.refreshSecrets[0];
    const kid = crypto.createHash('sha256').update(currentSecret).digest('hex').slice(0, 16);
    const jti = crypto.randomUUID();
    return jwt.sign(
      { sub: userId, jti },
      currentSecret,
      { 
        expiresIn: tokenConfig.jwt.refreshTokenExpiry,
        algorithm: tokenConfig.jwt.algorithm,
        header: { kid }
      }
    );
  }

  /**
   * 验证访问令牌
   * @param {string} token - 访问令牌
   * @returns {Object|null} 令牌载荷或null
   */
  static verifyAccessToken(token) {
    const errors = [];
    for (const secret of tokenConfig.jwt.accessSecrets) {
      try {
        return jwt.verify(token, secret, { algorithms: [tokenConfig.jwt.algorithm] });
      } catch (error) {
        errors.push(error.message);
      }
    }
    logger.warn('访问令牌验证失败', { errors });
    return null;
  }

  /**
   * 验证刷新令牌
   * @param {string} refreshToken - 刷新令牌
   * @returns {Object|null} 令牌载荷或null
   */
  static verifyRefreshToken(refreshToken) {
    const errors = [];
    for (const secret of tokenConfig.jwt.refreshSecrets) {
      try {
        const decoded = jwt.verify(refreshToken, secret, { algorithms: [tokenConfig.jwt.algorithm] });
        if (decoded && decoded.jti && isRefreshJtiRevoked(decoded.jti)) {
          throw new Error('Refresh token revoked');
        }
        return decoded;
      } catch (error) {
        errors.push(error.message);
      }
    }
    logger.warn('刷新令牌验证失败', { errors });
    return null;
  }

  /**
   * 从请求头中提取令牌
   * @param {Object} headers - 请求头
   * @returns {string|null} 令牌或null
   */
  static extractTokenFromHeaders(headers) {
    const authHeader = headers['authorization'];
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
    
    return parts[1];
  }

  /**
   * 检查请求体大小
   * @param {Object} req - 请求对象
   * @returns {Object} 检查结果 { valid: boolean, error?: string }
   */
  static checkRequestBodySize(req) {
    const contentLength = req.get('Content-Length');
    
    if (contentLength && parseInt(contentLength) > tokenConfig.lengthLimits.maxRequestBodySize) {
      logger.warn('请求体过大', {
        url: req.url,
        method: req.method,
        contentLength: contentLength,
        ip: req.ip
      });
      
      return {
        valid: false,
        error: '请求体过大',
        code: 'REQUEST_ENTITY_TOO_LARGE'
      };
    }
    
    return { valid: true };
  }

  /**
   * 检查并截断过长的token
   * @param {Object} req - 请求对象
   * @returns {Object} 处理结果 { truncated: boolean, field?: string }
   */
  static checkAndTruncateTokens(req) {
    // 检查是否是需要保护的路径
    const isProtectedPath = tokenConfig.lengthLimits.protectedPaths.some(path => 
      req.path.startsWith(path)
    );
    
    // 检查是否是需要保护的HTTP方法
    const isProtectedMethod = tokenConfig.lengthLimits.protectedMethods.includes(req.method);
    
    // 如果不是需要保护的路径或方法，则跳过检查
    if (!isProtectedPath || !isProtectedMethod) {
      return { truncated: false };
    }
    
    // 检查请求体中的token长度
    try {
      const requestBody = req.body;
      if (!requestBody) return { truncated: false };
      
      // 检查各种可能的token字段
      const tokenFields = [
        'token',
        'prompt',
        'message',
        'text',
        'content',
        'query',
        'input',
        'data'
      ];
      
      for (const field of tokenFields) {
        if (requestBody[field] && typeof requestBody[field] === 'string') {
          const fieldLength = requestBody[field].length;
          if (fieldLength > tokenConfig.lengthLimits.maxTokenLength) {
            logger.warn('检测到过长的token，进行截断', {
              url: req.url,
              method: req.method,
              field: field,
              originalLength: fieldLength,
              truncatedLength: tokenConfig.lengthLimits.maxTokenLength,
              ip: req.ip
            });
            
            // 截断过长的token
            requestBody[field] = requestBody[field].substring(0, tokenConfig.lengthLimits.maxTokenLength);
            
            // 添加截断标记
            requestBody._tokenTruncated = true;
            requestBody._originalTokenLength = fieldLength;
            requestBody._truncatedTokenLength = tokenConfig.lengthLimits.maxTokenLength;
            
            return { 
              truncated: true, 
              field: field,
              originalLength: fieldLength,
              truncatedLength: tokenConfig.lengthLimits.maxTokenLength
            };
          }
        }
      }
      
      return { truncated: false };
    } catch (error) {
      logger.error('检查token长度时发生错误', {
        url: req.url,
        method: req.method,
        error: error.message,
        ip: req.ip
      });
      
      return { truncated: false };
    }
  }

  /**
   * 检查AI接口的prompt长度
   * @param {Object} req - 请求对象
   * @returns {Object} 处理结果 { truncated: boolean, originalLength?: number, truncatedLength?: number }
   */
  static checkAiPromptLength(req) {
    // 检查是否是AI相关接口
    const isAiPath = req.path.startsWith('/api/ai/');
    if (!isAiPath) return { truncated: false };
    
    try {
      const requestBody = req.body;
      if (!requestBody || !requestBody.prompt || typeof requestBody.prompt !== 'string') {
        return { truncated: false };
      }
      
      const promptLength = requestBody.prompt.length;
      
      if (promptLength > tokenConfig.lengthLimits.maxTokenLength) {
        logger.warn('AI接口prompt过长，进行截断', {
          url: req.url,
          method: req.method,
          originalLength: promptLength,
          truncatedLength: tokenConfig.lengthLimits.maxTokenLength,
          ip: req.ip
        });
        
        // 截断prompt
        requestBody.prompt = requestBody.prompt.substring(0, tokenConfig.lengthLimits.maxTokenLength);
        
        // 添加截断标记
        requestBody._promptTruncated = true;
        requestBody._originalPromptLength = promptLength;
        requestBody._truncatedPromptLength = tokenConfig.lengthLimits.maxTokenLength;
        
        return { 
          truncated: true,
          originalLength: promptLength,
          truncatedLength: tokenConfig.lengthLimits.maxTokenLength
        };
      }
      
      return { truncated: false };
    } catch (error) {
      logger.error('AI接口token处理时发生错误', {
        url: req.url,
        method: req.method,
        error: error.message,
        ip: req.ip
      });
      
      return { truncated: false };
    }
  }

  /**
   * 从数据库获取用户权限
   * @param {string} userId - 用户ID
   * @returns {Promise<Array>} 用户权限列表
   */
  static async getUserPermissions(userId) {
    try {
      const { pool } = require('../config/db');
      
      // 查询用户角色
      const roleResult = await pool.query(
        `SELECT r.name as role 
         FROM user_roles ur 
         JOIN roles r ON ur.role_id = r.id 
         WHERE ur.user_id = $1`,
        [userId]
      );
      
      if (roleResult.rows.length === 0) {
        // 如果用户没有角色，返回默认权限
        return ['read', 'write'];
      }
      
      const userRole = roleResult.rows[0].role;
      
      // 根据角色获取权限
      const permissionResult = await pool.query(
        `SELECT p.code as permission 
         FROM role_permissions rp 
         JOIN permissions p ON rp.permission_id = p.id 
         JOIN roles r ON rp.role_id = r.id 
         WHERE r.name = $1`,
        [userRole]
      );
      
      if (permissionResult.rows.length === 0) {
        // 如果角色没有权限，返回默认权限
        return ['read', 'write'];
      }
      
      return permissionResult.rows.map(row => row.permission);
    } catch (error) {
      logger.error('获取用户权限失败:', error);
      // 出错时返回默认权限
      return ['read', 'write'];
    }
  }

  /**
   * 从数据库获取用户角色
   * @param {string} userId - 用户ID
   * @returns {Promise<string>} 用户角色
   */
  static async getUserRole(userId) {
    try {
      const { pool } = require('../config/db');
      
      // 查询用户角色
      const roleResult = await pool.query(
        `SELECT r.name as role 
         FROM user_roles ur 
         JOIN roles r ON ur.role_id = r.id 
         WHERE ur.user_id = $1`,
        [userId]
      );
      
      if (roleResult.rows.length === 0) {
        // 如果用户没有角色，返回默认角色
        return 'user';
      }
      
      return roleResult.rows[0].role;
    } catch (error) {
      logger.error('获取用户角色失败:', error);
      // 出错时返回默认角色
      return 'user';
    }
  }

  /**
   * 生成带有数据库角色和权限的访问令牌
   * @param {string} userId - 用户ID
   * @param {string} username - 用户名
   * @returns {Promise<string>} 访问令牌
   */
  static async generateAccessTokenWithDbPermissions(userId, username) {
    const [role, permissions] = await Promise.all([
      this.getUserRole(userId),
      this.getUserPermissions(userId)
    ]);
    
    return this.generateAccessToken({
      sub: userId,
      username,
      roles: [role],
      permissions
    });
  }
}

/**
 * JWT认证中间件
 * 验证请求头中的Authorization字段中的JWT token
 */
function authenticateToken(req, res, next) {
  const token = TokenManager.extractTokenFromHeaders(req.headers);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '访问令牌缺失'
    });
  }

  const decoded = TokenManager.verifyAccessToken(token);
  if (!decoded) {
    // 对于无效token，返回401而不是403，因为token无效等同于未认证
    return res.status(401).json({
      success: false,
      message: '访问令牌无效或已过期'
    });
  }

  req.user = decoded;
  next();
}

/**
 * 角色权限检查中间件
 * @param {Array} allowedRoles - 允许访问的角色列表
 */
function checkRole(allowedRoles) {
  return (req, res, next) => {
    // 这里应该从数据库获取用户角色，暂时从token中获取
    const userRole = req.user.roles && req.user.roles[0]; // 简化处理，实际应该从数据库获取

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    next();
  };
}

/**
 * 权限检查中间件
 * @param {Array} requiredPermissions - 需要的权限列表
 */
function checkPermission(requiredPermissions) {
  return (req, res, next) => {
    // 这里应该从数据库获取用户权限，暂时从token中获取
    const userPermissions = req.user.permissions || []; // 简化处理，实际应该从数据库获取

    // 检查用户是否拥有所有需要的权限
    const hasAllPermissions = requiredPermissions.every(permission => 
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }

    next();
  };
}

/**
 * 请求体大小检查中间件
 */
function checkRequestBodySize(req, res, next) {
  const result = TokenManager.checkRequestBodySize(req);
  
  if (!result.valid) {
    return res.status(413).json({
      success: false,
      error: result.error,
      code: result.code
    });
  }
  
  next();
}

/**
 * Token长度检查中间件
 */
function checkTokenLength(req, res, next) {
  TokenManager.checkAndTruncateTokens(req);
  next();
}

/**
 * AI接口专用token处理中间件
 */
function aiTokenHandler(req, res, next) {
  TokenManager.checkAiPromptLength(req);
  next();
}

module.exports = {
  TokenManager,
  tokenConfig,
  authenticateToken,
  checkRole,
  checkPermission,
  checkRequestBodySize,
  checkTokenLength,
  aiTokenHandler
};