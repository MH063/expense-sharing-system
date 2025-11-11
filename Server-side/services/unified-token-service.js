/**
 * 统一JWT令牌管理服务
 * 整合TokenService和TokenManager,提供统一的令牌管理接口
 * 支持密钥轮换、令牌黑名单、自动刷新等功能
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { logger } = require('../config/logger');
const { getSecrets } = require('../config/secrets');
const { pool } = require('../config/db');

const secrets = getSecrets();

/**
 * 统一Token配置
 */
const config = {
  // JWT配置
  accessToken: {
    secrets: secrets.jwt.accessSecrets.length ? secrets.jwt.accessSecrets : [process.env.JWT_SECRET || 'change-me-please-change-me-32chars-minimum'],
    expiry: process.env.JWT_ACCESS_TOKEN_EXPIRY || '15m',
    algorithm: secrets.jwt.algorithm || 'HS512'
  },
  refreshToken: {
    secrets: secrets.jwt.refreshSecrets.length ? secrets.jwt.refreshSecrets : [process.env.JWT_REFRESH_SECRET || 'change-me-please-change-me-32chars-minimum-refresh'],
    expiry: process.env.JWT_REFRESH_TOKEN_EXPIRY || '7d',
    algorithm: secrets.jwt.algorithm || 'HS512'
  },
  // 令牌黑名单清理间隔(毫秒)
  blacklistCleanupInterval: 3600000 // 1小时
};

/**
 * 令牌黑名单存储(内存,生产环境建议使用Redis)
 */
class TokenBlacklist {
  constructor() {
    this.blacklist = new Map(); // token -> expiryTime
    this.startCleanupTimer();
  }

  /**
   * 将令牌加入黑名单
   */
  add(token, expiryTime) {
    this.blacklist.set(token, expiryTime);
    logger.debug('令牌已加入黑名单', { 
      token: token.substring(0, 20) + '...',
      expiryTime: new Date(expiryTime).toISOString()
    });
  }

  /**
   * 检查令牌是否在黑名单中
   */
  has(token) {
    const expiryTime = this.blacklist.get(token);
    if (!expiryTime) return false;
    
    // 如果已过期,自动清理
    if (Date.now() > expiryTime) {
      this.blacklist.delete(token);
      return false;
    }
    
    return true;
  }

  /**
   * 清理过期的黑名单令牌
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [token, expiryTime] of this.blacklist.entries()) {
      if (now > expiryTime) {
        this.blacklist.delete(token);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.info('清理过期黑名单令牌', { cleanedCount });
    }
    
    return cleanedCount;
  }

  /**
   * 启动自动清理定时器
   */
  startCleanupTimer() {
    setInterval(() => {
      this.cleanup();
    }, config.blacklistCleanupInterval);
  }

  /**
   * 获取黑名单大小
   */
  size() {
    return this.blacklist.size;
  }
}

const blacklist = new TokenBlacklist();

/**
 * 统一令牌管理服务
 */
class UnifiedTokenService {
  /**
   * 生成访问令牌和刷新令牌对
   * @param {Object} payload - 令牌载荷
   * @returns {Object} { accessToken, refreshToken }
   */
  static async generateTokenPair(payload) {
    try {
      const { userId, username, roles, permissions } = payload;
      
      // 从数据库获取用户的最新角色和权限
      const userRolesAndPermissions = await this.getUserRolesAndPermissions(userId);
      
      const accessToken = this.generateAccessToken({
        sub: userId,
        username,
        roles: userRolesAndPermissions.roles,
        permissions: userRolesAndPermissions.permissions,
        tokenType: 'access'
      });
      
      const refreshToken = this.generateRefreshToken({
        sub: userId,
        tokenType: 'refresh'
      });
      
      // 记录令牌生成日志
      logger.info('生成令牌对成功', {
        userId,
        username,
        roles: userRolesAndPermissions.roles,
        permissionsCount: userRolesAndPermissions.permissions.length
      });
      
      return {
        accessToken,
        refreshToken,
        expiresIn: this.getExpirySeconds(config.accessToken.expiry)
      };
    } catch (error) {
      logger.error('生成令牌对失败', {
        error: error.message,
        stack: error.stack
      });
      throw new Error('令牌生成失败');
    }
  }

  /**
   * 生成访问令牌
   * @param {Object} payload - 令牌载荷
   * @returns {string} 访问令牌
   */
  static generateAccessToken(payload) {
    const { sub, username, roles, permissions, tokenType } = payload;
    const currentSecret = config.accessToken.secrets[0];
    const kid = crypto.createHash('sha256').update(currentSecret).digest('hex').slice(0, 16);
    const jti = crypto.randomUUID();
    const iat = Math.floor(Date.now() / 1000);
    
    return jwt.sign(
      {
        sub,
        username,
        roles: Array.isArray(roles) ? roles : [roles],
        permissions: Array.isArray(permissions) ? permissions : [permissions],
        jti,
        iat,
        tokenType
      },
      currentSecret,
      {
        expiresIn: config.accessToken.expiry,
        algorithm: config.accessToken.algorithm,
        header: { kid }
      }
    );
  }

  /**
   * 生成刷新令牌
   * @param {Object} payload - 令牌载荷
   * @returns {string} 刷新令牌
   */
  static generateRefreshToken(payload) {
    const { sub, tokenType } = payload;
    const currentSecret = config.refreshToken.secrets[0];
    const kid = crypto.createHash('sha256').update(currentSecret).digest('hex').slice(0, 16);
    const jti = crypto.randomUUID();
    const iat = Math.floor(Date.now() / 1000);
    
    return jwt.sign(
      {
        sub,
        jti,
        iat,
        tokenType
      },
      currentSecret,
      {
        expiresIn: config.refreshToken.expiry,
        algorithm: config.refreshToken.algorithm,
        header: { kid }
      }
    );
  }

  /**
   * 验证访问令牌
   * @param {string} token - 访问令牌
   * @returns {Object|null} 令牌载荷或null
   */
  static async verifyAccessToken(token) {
    try {
      // 检查黑名单
      if (blacklist.has(token)) {
        logger.warn('令牌在黑名单中', { token: token.substring(0, 20) + '...' });
        return null;
      }
      
      // 尝试使用所有密钥验证(支持密钥轮换)
      for (const secret of config.accessToken.secrets) {
        try {
          const decoded = jwt.verify(token, secret, {
            algorithms: [config.accessToken.algorithm]
          });
          
          // 验证令牌类型
          if (decoded.tokenType !== 'access') {
            logger.warn('令牌类型不匹配', { expectedType: 'access', actualType: decoded.tokenType });
            return null;
          }
          
          return decoded;
        } catch (error) {
          // 继续尝试下一个密钥
          continue;
        }
      }
      
      logger.warn('访问令牌验证失败');
      return null;
    } catch (error) {
      logger.error('验证访问令牌时发生错误', {
        error: error.message,
        stack: error.stack
      });
      return null;
    }
  }

  /**
   * 验证刷新令牌
   * @param {string} token - 刷新令牌
   * @returns {Object|null} 令牌载荷或null
   */
  static async verifyRefreshToken(token) {
    try {
      // 检查黑名单
      if (blacklist.has(token)) {
        logger.warn('刷新令牌在黑名单中', { token: token.substring(0, 20) + '...' });
        return null;
      }
      
      // 尝试使用所有密钥验证(支持密钥轮换)
      for (const secret of config.refreshToken.secrets) {
        try {
          const decoded = jwt.verify(token, secret, {
            algorithms: [config.refreshToken.algorithm]
          });
          
          // 验证令牌类型
          if (decoded.tokenType !== 'refresh') {
            logger.warn('令牌类型不匹配', { expectedType: 'refresh', actualType: decoded.tokenType });
            return null;
          }
          
          return decoded;
        } catch (error) {
          // 继续尝试下一个密钥
          continue;
        }
      }
      
      logger.warn('刷新令牌验证失败');
      return null;
    } catch (error) {
      logger.error('验证刷新令牌时发生错误', {
        error: error.message,
        stack: error.stack
      });
      return null;
    }
  }

  /**
   * 刷新令牌
   * @param {string} refreshToken - 刷新令牌
   * @returns {Object|null} 新的令牌对或null
   */
  static async refreshTokens(refreshToken) {
    try {
      // 验证刷新令牌
      const decoded = await this.verifyRefreshToken(refreshToken);
      if (!decoded) {
        return null;
      }
      
      const userId = decoded.sub;
      
      // 获取用户信息
      const userResult = await pool.query(
        'SELECT id, username, is_active FROM users WHERE id = $1',
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        logger.warn('用户不存在', { userId });
        return null;
      }
      
      const user = userResult.rows[0];
      
      // 检查用户是否被禁用
      if (!user.is_active) {
        logger.warn('用户已被禁用', { userId, username: user.username });
        return null;
      }
      
      // 将旧的刷新令牌加入黑名单
      this.revokeToken(refreshToken);
      
      // 生成新的令牌对
      const newTokens = await this.generateTokenPair({
        userId: user.id,
        username: user.username
      });
      
      logger.info('令牌刷新成功', { userId, username: user.username });
      
      return newTokens;
    } catch (error) {
      logger.error('刷新令牌失败', {
        error: error.message,
        stack: error.stack
      });
      return null;
    }
  }

  /**
   * 撤销令牌(加入黑名单)
   * @param {string} token - 令牌
   * @returns {boolean} 是否成功
   */
  static revokeToken(token) {
    try {
      // 解码令牌获取过期时间
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        logger.warn('无法解码令牌', { token: token.substring(0, 20) + '...' });
        return false;
      }
      
      const expiryTime = decoded.exp * 1000;
      
      // 如果已过期,无需加入黑名单
      if (Date.now() > expiryTime) {
        return true;
      }
      
      // 加入黑名单
      blacklist.add(token, expiryTime);
      
      logger.info('令牌已撤销', {
        token: token.substring(0, 20) + '...',
        expiryTime: new Date(expiryTime).toISOString()
      });
      
      return true;
    } catch (error) {
      logger.error('撤销令牌失败', {
        error: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  /**
   * 从数据库获取用户的角色和权限
   * @param {string} userId - 用户ID
   * @returns {Object} { roles, permissions }
   */
  static async getUserRolesAndPermissions(userId) {
    try {
      // 获取用户角色
      const rolesResult = await pool.query(
        `SELECT DISTINCT r.name 
         FROM roles r 
         JOIN user_roles ur ON r.id = ur.role_id 
         WHERE ur.user_id = $1`,
        [userId]
      );
      
      const roles = rolesResult.rows.map(row => row.name);
      
      // 获取用户权限
      const permissionsResult = await pool.query(
        `SELECT DISTINCT p.code 
         FROM permissions p 
         JOIN role_permissions rp ON p.id = rp.permission_id 
         JOIN user_roles ur ON rp.role_id = ur.role_id 
         WHERE ur.user_id = $1`,
        [userId]
      );
      
      const permissions = permissionsResult.rows.map(row => row.code);
      
      return { roles, permissions };
    } catch (error) {
      logger.error('获取用户角色和权限失败', {
        userId,
        error: error.message
      });
      // 返回默认值
      return {
        roles: ['user'],
        permissions: ['read']
      };
    }
  }

  /**
   * 将过期时间字符串转换为秒数
   * @param {string} expiry - 过期时间(如'15m', '7d')
   * @returns {number} 秒数
   */
  static getExpirySeconds(expiry) {
    const units = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400
    };
    
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      return 900; // 默认15分钟
    }
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    return value * units[unit];
  }

  /**
   * 从请求头提取令牌
   * @param {Object} headers - 请求头
   * @returns {string|null} 令牌或null
   */
  static extractTokenFromHeaders(headers) {
    const authHeader = headers['authorization'] || headers['Authorization'];
    if (!authHeader) return null;
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
    
    return parts[1];
  }

  /**
   * 获取黑名单统计信息
   * @returns {Object} 黑名单统计
   */
  static getBlacklistStats() {
    return {
      size: blacklist.size(),
      lastCleanup: new Date().toISOString()
    };
  }
}

module.exports = UnifiedTokenService;
