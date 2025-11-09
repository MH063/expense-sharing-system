/**
 * 增强的Token管理模块
 * 支持非对称加密算法（RS256）和增强的密钥管理
 */

const jwt = require('jsonwebtoken');
const { logger } = require('../config/logger');
const { getEnvironmentConfig } = require('../config/environment');
const { getSecrets } = require('../config/enhanced-secrets');
const crypto = require('crypto');

const envConfig = getEnvironmentConfig();

/**
 * 增强的Token配置（支持非对称加密和密钥轮换）
 */
let tokenConfig = {
  // JWT配置
  jwt: {
    accessSecrets: [''],
    refreshSecrets: [''],
    accessTokenExpiry: process.env.JWT_EXPIRES_IN || '1h',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    algorithm: 'RS256', // 默认使用非对称加密算法
    rsaPublicKey: '',
    rsaPrivateKey: ''
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

// 初始化Token配置
async function initializeTokenConfig() {
  try {
    const secrets = await getSecrets();
    tokenConfig.jwt = {
      ...tokenConfig.jwt,
      accessSecrets: secrets.jwt.accessSecrets,
      refreshSecrets: secrets.jwt.refreshSecrets,
      algorithm: secrets.jwt.algorithm || 'RS256',
      rsaPublicKey: secrets.jwt.rsaPublicKey,
      rsaPrivateKey: secrets.jwt.rsaPrivateKey
    };
    
    logger.info('Token配置初始化完成，使用算法:', tokenConfig.jwt.algorithm);
  } catch (error) {
    logger.error('Token配置初始化失败:', error.message);
    // 回退到默认配置
    tokenConfig.jwt.algorithm = 'HS512';
    tokenConfig.jwt.accessSecrets = [process.env.JWT_SECRET || 'change-me-please-change-me-32chars-minimum'];
    tokenConfig.jwt.refreshSecrets = [process.env.JWT_REFRESH_SECRET || 'change-me-please-change-me-32chars-minimum-refresh'];
  }
}

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

// 令牌黑名单（内存存储，生产环境建议使用Redis）
const tokenBlacklist = new Map(); // token -> expiryTime(ms)

/**
 * 增强的Token管理器
 */
class EnhancedTokenManager {
  /**
   * 初始化Token管理器
   */
  static async initialize() {
    await initializeTokenConfig();
  }

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
    
    let signingKey;
    let algorithm = tokenConfig.jwt.algorithm;
    
    // 根据算法选择签名密钥
    if (algorithm === 'RS256') {
      // 使用RSA私钥签名
      signingKey = tokenConfig.jwt.rsaPrivateKey;
      if (!signingKey) {
        logger.error('RSA私钥不存在，回退到HS512算法');
        algorithm = 'HS512';
        signingKey = tokenConfig.jwt.accessSecrets[0];
      }
    } else {
      // 使用对称密钥签名
      signingKey = tokenConfig.jwt.accessSecrets[0];
    }
    
    // 生成密钥ID
    const kid = crypto.createHash('sha256').update(signingKey).digest('hex').slice(0, 16);
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
      signingKey,
      { 
        expiresIn: tokenConfig.jwt.accessTokenExpiry,
        algorithm,
        header: { kid, alg: algorithm }
      }
    );
  }

  /**
   * 生成刷新令牌
   * @param {string} userId - 用户ID
   * @returns {string} 刷新令牌
   */
  static generateRefreshToken(userId) {
    let signingKey;
    let algorithm = tokenConfig.jwt.algorithm;
    
    // 根据算法选择签名密钥
    if (algorithm === 'RS256') {
      // 使用RSA私钥签名
      signingKey = tokenConfig.jwt.rsaPrivateKey;
      if (!signingKey) {
        logger.error('RSA私钥不存在，回退到HS512算法');
        algorithm = 'HS512';
        signingKey = tokenConfig.jwt.refreshSecrets[0];
      }
    } else {
      // 使用对称密钥签名
      signingKey = tokenConfig.jwt.refreshSecrets[0];
    }
    
    // 生成密钥ID
    const kid = crypto.createHash('sha256').update(signingKey).digest('hex').slice(0, 16);
    const jti = crypto.randomUUID();
    
    return jwt.sign(
      { sub: userId, jti },
      signingKey,
      { 
        expiresIn: tokenConfig.jwt.refreshTokenExpiry,
        algorithm,
        header: { kid, alg: algorithm }
      }
    );
  }

  /**
   * 验证访问令牌
   * @param {string} token - 访问令牌
   * @returns {Object|null} 令牌载荷或null
   */
  static verifyAccessToken(token) {
    try {
      // 首先检查令牌是否在黑名单中
      if (EnhancedTokenManager.isTokenRevoked(token)) {
        logger.warn('访问令牌已被撤销');
        return null;
      }
      
      // 首先解码token获取header信息
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded) {
        logger.warn('访问令牌解码失败');
        return null;
      }
      
      const { header } = decoded;
      const algorithm = header.alg;
      
      logger.info('验证访问令牌', { algorithm, header });
      
      // 根据算法选择验证密钥
      if (algorithm === 'RS256') {
        // 使用RSA公钥验证
        const publicKey = tokenConfig.jwt.rsaPublicKey;
        if (!publicKey) {
          logger.error('RSA公钥不存在，无法验证RS256令牌');
          return null;
        }
        
        return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
      } else {
        // 使用对称密钥验证
        const secret = tokenConfig.jwt.accessSecrets[0];
        logger.info('使用对称密钥验证访问令牌', { 
          algorithm, 
          secretLength: secret ? secret.length : 0 
        });
        
        try {
          const result = jwt.verify(token, secret, { algorithms: [algorithm] });
          logger.info('访问令牌验证成功', { 
            sub: result.sub,
            username: result.username
          });
          return result;
        } catch (error) {
          logger.warn('访问令牌验证失败', { 
            error: error.message,
            algorithm,
            secretLength: secret ? secret.length : 0
          });
          return null;
        }
      }
    } catch (error) {
      logger.warn('访问令牌验证异常:', error.message);
      return null;
    }
  }

  /**
   * 验证刷新令牌
   * @param {string} refreshToken - 刷新令牌
   * @returns {Object|null} 令牌载荷或null
   */
  static verifyRefreshToken(refreshToken) {
    try {
      // 首先解码token获取header信息
      const decoded = jwt.decode(refreshToken, { complete: true });
      if (!decoded) {
        logger.warn('刷新令牌解码失败');
        return null;
      }
      
      const { header } = decoded;
      const algorithm = header.alg;
      
      // 根据算法选择验证密钥
      if (algorithm === 'RS256') {
        // 使用RSA公钥验证
        const publicKey = tokenConfig.jwt.rsaPublicKey;
        if (!publicKey) {
          logger.error('RSA公钥不存在，无法验证RS256令牌');
          return null;
        }
        
        const payload = jwt.verify(refreshToken, publicKey, { algorithms: ['RS256'] });
        
        // 检查令牌是否被撤销
        if (payload && payload.jti && isRefreshJtiRevoked(payload.jti)) {
          throw new Error('Refresh token revoked');
        }
        
        return payload;
      } else {
        // 使用对称密钥验证
        try {
          const payload = jwt.verify(refreshToken, tokenConfig.jwt.refreshSecrets[0], { algorithms: [algorithm] });
          
          // 检查令牌是否被撤销
          if (payload && payload.jti && isRefreshJtiRevoked(payload.jti)) {
            throw new Error('Refresh token revoked');
          }
          
          return payload;
        } catch (error) {
          logger.warn('刷新令牌验证失败', { error: error.message });
          return null;
        }
      }
    } catch (error) {
      logger.warn('刷新令牌验证异常:', error.message);
      return null;
    }
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
   * 撤销刷新令牌
   * @param {string} jti - 令牌ID
   * @param {number} ttlMs - 生存时间（毫秒）
   */
  static revokeRefreshToken(jti, ttlMs = 7 * 24 * 60 * 60 * 1000) {
    revokeRefreshJti(jti, ttlMs);
    logger.info(`刷新令牌已撤销: ${jti}`);
  }

  /**
   * 撤销访问令牌
   * @param {string} token - 访问令牌
   * @returns {boolean} 是否成功撤销
   */
  static revokeToken(token) {
    try {
      if (!token) {
        logger.warn('尝试撤销空令牌');
        return false;
      }
      
      // 解码令牌以获取过期时间
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        logger.warn('无法解码令牌或令牌无过期时间');
        return false;
      }
      
      // 将令牌添加到黑名单
      tokenBlacklist.set(token, decoded.exp * 1000); // 转换为毫秒
      
      logger.info('访问令牌已撤销', { jti: decoded.jti, sub: decoded.sub });
      return true;
    } catch (error) {
      logger.error('撤销访问令牌失败', { message: error.message });
      return false;
    }
  }

  /**
   * 检查访问令牌是否被撤销
   * @param {string} token - 访问令牌
   * @returns {boolean} 是否被撤销
   */
  static isTokenRevoked(token) {
    if (!token) return false;
    
    const expiryTime = tokenBlacklist.get(token);
    if (!expiryTime) return false;
    
    // 如果令牌已过期，从黑名单中移除
    if (Date.now() > expiryTime) {
      tokenBlacklist.delete(token);
      return false;
    }
    
    return true;
  }

  /**
   * 获取用户角色
   * @param {string} userId - 用户ID
   * @returns {Promise<string>} 用户角色
   */
  static async getUserRole(userId) {
    try {
      const { pool } = require('../config/database');
      const result = await pool.query(
        `SELECT r.name as role_name 
         FROM users u 
         JOIN user_roles ur ON u.id = ur.user_id 
         JOIN roles r ON ur.role_id = r.id 
         WHERE u.id = $1`,
        [userId]
      );
      
      if (result.rows.length > 0) {
        return result.rows[0].role_name;
      }
      
      return 'user'; // 默认角色
    } catch (error) {
      logger.error('获取用户角色失败:', error.message);
      return 'user'; // 默认角色
    }
  }

  /**
   * 获取用户权限
   * @param {string} userId - 用户ID
   * @returns {Promise<Array<string>>} 用户权限列表
   */
  static async getUserPermissions(userId) {
    try {
      const { pool } = require('../config/database');
      const result = await pool.query(
        `SELECT p.name as permission_name 
         FROM users u 
         JOIN user_roles ur ON u.id = ur.user_id 
         JOIN roles r ON ur.role_id = r.id 
         JOIN role_permissions rp ON r.id = rp.role_id 
         JOIN permissions p ON rp.permission_id = p.id 
         WHERE u.id = $1`,
        [userId]
      );
      
      return result.rows.map(row => row.permission_name);
    } catch (error) {
      logger.error('获取用户权限失败:', error.message);
      return ['read']; // 默认权限
    }
  }

  /**
   * 刷新令牌
   * @param {string} refreshToken - 刷新令牌
   * @returns {Promise<Object|null>} 新的令牌对或null
   */
  static async refreshTokens(refreshToken) {
    try {
      const decoded = this.verifyRefreshToken(refreshToken);
      if (!decoded) {
        return null;
      }

      // 查找用户
      const { pool } = require('../config/database');
      const usersResult = await pool.query(
        'SELECT * FROM users WHERE id = $1',
        [decoded.sub]
      );
      const users = usersResult.rows;

      if (users.length === 0) {
        logger.warn('Token刷新失败：用户不存在', {
          userId: decoded.sub,
          timestamp: new Date().toISOString()
        });
        
        return null;
      }

      const user = users[0];

      // 撤销当前的刷新令牌
      if (decoded.jti) {
        this.revokeRefreshToken(decoded.jti);
      }

      // 获取最新的用户角色和权限
      const userRole = await this.getUserRole(user.id);
      const userPermissions = await this.getUserPermissions(user.id);
      
      // 生成新的令牌对
      const newAccessToken = this.generateAccessToken({
        sub: user.id.toString(),
        username: user.username,
        roles: [userRole],
        permissions: userPermissions
      });
      
      const newRefreshToken = this.generateRefreshToken(user.id.toString());

      logger.info('Token刷新成功', {
        userId: user.id,
        username: user.username,
        userRole,
        timestamp: new Date().toISOString()
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      logger.error('Token刷新失败:', error.message);
      return null;
    }
  }
}

/**
 * JWT认证中间件
 * 验证请求头中的Authorization字段中的JWT token
 */
function authenticateToken(req, res, next) {
  const token = EnhancedTokenManager.extractTokenFromHeaders(req.headers);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: '访问令牌缺失'
    });
  }

  const decoded = EnhancedTokenManager.verifyAccessToken(token);
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

// 初始化Token管理器
initializeTokenConfig().catch(error => {
  logger.error('Token管理器初始化失败:', error.message);
});

module.exports = {
  EnhancedTokenManager,
  authenticateToken,
  tokenConfig
};