/**
 * 统一Token服务模块
 * 实现JWT令牌的生成、验证、刷新和黑名单管理功能
 */

const jwt = require('jsonwebtoken');
const { logger } = require('../config/logger');
const { getEnvironmentConfig } = require('../config/environment');
const { getSecrets } = require('../config/secrets');
const crypto = require('crypto');

const envConfig = getEnvironmentConfig();
const secrets = getSecrets();

/**
 * Token配置
 */
const tokenConfig = {
  // JWT配置 - 按照要求设置过期时间
  jwt: {
    accessSecrets: secrets.jwt.accessSecrets.length ? secrets.jwt.accessSecrets : [(process.env.JWT_SECRET || 'change-me-please-change-me-32chars-minimum')],
    refreshSecrets: secrets.jwt.refreshSecrets.length ? secrets.jwt.refreshSecrets : [(process.env.JWT_REFRESH_SECRET || 'change-me-please-change-me-32chars-minimum-refresh')],
    // 按要求设置过期时间：accessToken为15分钟，refreshToken为7天
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
    algorithm: secrets.jwt.algorithm || 'HS512'
  }
};

// 令牌黑名单存储（生产环境建议使用Redis等外部存储）
const tokenBlacklist = new Map(); // token -> expiryTime

class TokenService {
  /**
   * 生成新的访问令牌和刷新令牌
   * @param {string} userId - 用户ID
   * @param {string} userRole - 用户角色
   * @param {Array} permissions - 用户权限
   * @param {string} username - 用户名
   * @returns {Object} 包含accessToken和refreshToken的对象
   */
  static generateTokens(userId, userRole, permissions = ['read', 'write'], username = '') {
    try {
      logger.info('生成新的令牌对', { userId, userRole, username });
      
      // 生成访问令牌
      const accessToken = this.generateAccessToken({
        sub: userId,
        username,
        roles: [userRole],
        permissions
      });
      
      // 生成刷新令牌
      const refreshToken = this.generateRefreshToken(userId);
      
      logger.info('令牌对生成成功', { userId, username });
      
      return {
        accessToken,
        refreshToken
      };
    } catch (error) {
      logger.error('生成令牌对失败', { 
        userId, 
        userRole, 
        username, 
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
    const { sub, username, roles = ['user'], permissions = ['read', 'write'] } = payload;
    const currentSecret = tokenConfig.jwt.accessSecrets[0];
    const kid = crypto.createHash('sha256').update(currentSecret).digest('hex').slice(0, 16);
    const jti = crypto.randomUUID();
    
    // 确保roles和permissions是数组
    const userRoles = Array.isArray(roles) ? roles : [roles];
    const userPermissions = Array.isArray(permissions) ? permissions : [permissions];
    
    const token = jwt.sign(
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
    
    logger.debug('访问令牌生成成功', { userId: sub, username, jti });
    return token;
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
    
    const token = jwt.sign(
      { sub: userId, jti },
      currentSecret,
      { 
        expiresIn: tokenConfig.jwt.refreshTokenExpiry,
        algorithm: tokenConfig.jwt.algorithm,
        header: { kid }
      }
    );
    
    logger.debug('刷新令牌生成成功', { userId, jti });
    return token;
  }

  /**
   * 验证访问令牌有效性
   * @param {string} token - 访问令牌
   * @returns {Object|null} 令牌载荷或null
   */
  static verifyAccessToken(token) {
    try {
      // 检查令牌是否在黑名单中
      if (this.isTokenBlacklisted(token)) {
        logger.warn('访问令牌在黑名单中', { token: token.substring(0, 20) + '...' });
        return null;
      }
      
      const errors = [];
      for (const secret of tokenConfig.jwt.accessSecrets) {
        try {
          const decoded = jwt.verify(token, secret, { algorithms: [tokenConfig.jwt.algorithm] });
          logger.debug('访问令牌验证成功', { userId: decoded.sub, jti: decoded.jti });
          return decoded;
        } catch (error) {
          errors.push(error.message);
        }
      }
      
      logger.warn('访问令牌验证失败', { errors });
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
   * 验证刷新令牌有效性
   * @param {string} refreshToken - 刷新令牌
   * @returns {Object|null} 令牌载荷或null
   */
  static verifyRefreshToken(refreshToken) {
    try {
      const errors = [];
      for (const secret of tokenConfig.jwt.refreshSecrets) {
        try {
          const decoded = jwt.verify(refreshToken, secret, { algorithms: [tokenConfig.jwt.algorithm] });
          
          // 检查刷新令牌是否在黑名单中
          if (decoded && decoded.jti && this.isTokenBlacklisted(refreshToken)) {
            logger.warn('刷新令牌在黑名单中', { jti: decoded.jti });
            throw new Error('Refresh token revoked');
          }
          
          logger.debug('刷新令牌验证成功', { userId: decoded.sub, jti: decoded.jti });
          return decoded;
        } catch (error) {
          errors.push(error.message);
        }
      }
      
      logger.warn('刷新令牌验证失败', { errors });
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
   * 使用刷新令牌获取新的令牌对
   * @param {string} refreshToken - 刷新令牌
   * @returns {Object|null} 新的令牌对或null
   */
  static refreshTokens(refreshToken) {
    try {
      logger.info('开始刷新令牌');
      
      // 验证刷新令牌
      const decoded = this.verifyRefreshToken(refreshToken);
      if (!decoded) {
        logger.warn('刷新令牌验证失败');
        return null;
      }
      
      const userId = decoded.sub;
      logger.info('刷新令牌验证成功', { userId });
      
      // 获取用户信息（这里简化处理，实际应该从数据库获取）
      // 在实际应用中，应该查询数据库获取用户的角色和权限
      const userRole = 'user'; // 默认角色
      const permissions = ['read', 'write']; // 默认权限
      const username = ''; // 用户名
      
      // 生成新的令牌对
      const newTokens = this.generateTokens(userId, userRole, permissions, username);
      
      // 将旧的刷新令牌加入黑名单
      this.revokeToken(refreshToken);
      
      logger.info('令牌刷新成功', { userId });
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
   * 将令牌加入黑名单
   * @param {string} token - 令牌
   * @returns {boolean} 是否成功加入黑名单
   */
  static revokeToken(token) {
    try {
      // 解码令牌以获取过期时间
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        logger.warn('无法解码令牌或令牌无过期时间');
        return false;
      }
      
      // 计算剩余有效期（毫秒）
      const expiryTime = decoded.exp * 1000;
      const currentTime = Date.now();
      const ttl = expiryTime - currentTime;
      
      // 如果令牌已过期，则无需加入黑名单
      if (ttl <= 0) {
        logger.debug('令牌已过期，无需加入黑名单');
        return true;
      }
      
      // 将令牌加入黑名单
      tokenBlacklist.set(token, expiryTime);
      logger.info('令牌已加入黑名单', { 
        token: token.substring(0, 20) + '...',
        expiryTime: new Date(expiryTime).toISOString(),
        ttl: `${Math.floor(ttl / 1000)}秒`
      });
      
      // 设置定时器在令牌过期后自动清理
      setTimeout(() => {
        tokenBlacklist.delete(token);
        logger.debug('令牌从黑名单中自动清理', { token: token.substring(0, 20) + '...' });
      }, ttl);
      
      return true;
    } catch (error) {
      logger.error('将令牌加入黑名单时发生错误', { 
        error: error.message,
        stack: error.stack 
      });
      return false;
    }
  }

  /**
   * 检查令牌是否在黑名单中
   * @param {string} token - 令牌
   * @returns {boolean} 是否在黑名单中
   */
  static isTokenBlacklisted(token) {
    try {
      const expiryTime = tokenBlacklist.get(token);
      if (!expiryTime) {
        return false;
      }
      
      // 检查令牌是否已过期
      if (Date.now() > expiryTime) {
        // 从黑名单中移除已过期的令牌
        tokenBlacklist.delete(token);
        logger.debug('已过期令牌从黑名单中清理', { token: token.substring(0, 20) + '...' });
        return false;
      }
      
      return true;
    } catch (error) {
      logger.error('检查令牌黑名单时发生错误', { 
        error: error.message,
        stack: error.stack 
      });
      return false;
    }
  }

  /**
   * 清理过期的黑名单令牌
   * @returns {number} 清理的令牌数量
   */
  static cleanupExpiredTokens() {
    try {
      const currentTime = Date.now();
      let cleanedCount = 0;
      
      for (const [token, expiryTime] of tokenBlacklist.entries()) {
        if (currentTime > expiryTime) {
          tokenBlacklist.delete(token);
          cleanedCount++;
        }
      }
      
      if (cleanedCount > 0) {
        logger.info('清理过期黑名单令牌完成', { cleanedCount });
      }
      
      return cleanedCount;
    } catch (error) {
      logger.error('清理过期黑名单令牌时发生错误', { 
        error: error.message,
        stack: error.stack 
      });
      return 0;
    }
  }

  /**
   * 获取令牌剩余有效期（秒）
   * @param {string} token - 令牌
   * @returns {number|null} 剩余有效期（秒）或null
   */
  static getTokenTTL(token) {
    try {
      const decoded = jwt.decode(token);
      if (!decoded || !decoded.exp) {
        return null;
      }
      
      const currentTime = Math.floor(Date.now() / 1000);
      const ttl = decoded.exp - currentTime;
      
      return ttl > 0 ? ttl : 0;
    } catch (error) {
      logger.error('获取令牌TTL时发生错误', { 
        error: error.message,
        stack: error.stack 
      });
      return null;
    }
  }

  /**
   * 检查访问令牌是否即将过期（剩余时间少于5分钟）
   * @param {string} token - 访问令牌
   * @returns {boolean} 是否即将过期
   */
  static isTokenExpiringSoon(token) {
    try {
      const ttl = this.getTokenTTL(token);
      if (ttl === null) {
        return true; // 无法获取TTL，认为已过期
      }
      
      // 5分钟 = 300秒
      return ttl < 300;
    } catch (error) {
      logger.error('检查令牌是否即将过期时发生错误', { 
        error: error.message,
        stack: error.stack 
      });
      return true; // 出错时认为需要刷新
    }
  }
}

// 定期清理过期令牌（每小时执行一次）
setInterval(() => {
  TokenService.cleanupExpiredTokens();
}, 60 * 60 * 1000); // 1小时

module.exports = TokenService;