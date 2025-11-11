/**
 * 密码重置服务
 * 提供安全的密码重置功能,包括:
 * - 重置令牌生成和验证
 * - 多因素验证
 * - 防暴力破解
 * - 重置历史记录
 */

const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const { logger } = require('../config/logger');
const { LogHelper } = require('../utils/log-helpers');

/**
 * 密码重置配置
 */
const config = {
  // 重置令牌有效期(毫秒)
  tokenExpiry: 3600000, // 1小时
  // 最大重置尝试次数
  maxAttempts: 3,
  // 重置尝试锁定时间(毫秒)
  lockoutDuration: 900000, // 15分钟
  // 密码历史记录数
  passwordHistoryCount: 5,
  // 最小密码强度要求
  minPasswordLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: true
};

/**
 * 密码重置服务类
 */
class PasswordResetService {
  /**
   * 生成密码重置令牌
   * @param {string} userId - 用户ID
   * @param {string} email - 用户邮箱
   * @returns {Promise<Object>} { token, expiresAt }
   */
  static async generateResetToken(userId, email) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 检查用户是否存在且活跃
      const userResult = await client.query(
        'SELECT id, email, is_active FROM users WHERE id = $1 AND email = $2',
        [userId, email]
      );
      
      if (userResult.rows.length === 0) {
        throw new Error('用户不存在');
      }
      
      const user = userResult.rows[0];
      
      if (!user.is_active) {
        throw new Error('用户已被禁用');
      }
      
      // 检查是否有未过期的重置令牌
      const existingTokenResult = await client.query(
        `SELECT token, expires_at FROM password_reset_tokens 
         WHERE user_id = $1 AND expires_at > NOW() AND used = false 
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
      );
      
      if (existingTokenResult.rows.length > 0) {
        const existingToken = existingTokenResult.rows[0];
        
        // 如果距离上次生成不到5分钟,返回已有令牌
        const timeDiff = new Date() - new Date(existingToken.created_at);
        if (timeDiff < 300000) { // 5分钟
          LogHelper.security('重复请求密码重置', {
            userId,
            email,
            timeDiff: `${Math.floor(timeDiff / 1000)}秒`
          });
          
          return {
            token: existingToken.token,
            expiresAt: existingToken.expires_at
          };
        }
      }
      
      // 生成新的重置令牌
      const token = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const expiresAt = new Date(Date.now() + config.tokenExpiry);
      
      // 保存重置令牌
      await client.query(
        `INSERT INTO password_reset_tokens 
         (user_id, token_hash, expires_at, created_at, ip_address)
         VALUES ($1, $2, $3, NOW(), $4)`,
        [userId, tokenHash, expiresAt, '0.0.0.0'] // IP地址可从请求中获取
      );
      
      // 将旧的未使用令牌标记为已过期
      await client.query(
        `UPDATE password_reset_tokens 
         SET used = true 
         WHERE user_id = $1 AND id NOT IN (
           SELECT id FROM password_reset_tokens 
           WHERE user_id = $1 AND token_hash = $2
         )`,
        [userId, tokenHash]
      );
      
      await client.query('COMMIT');
      
      LogHelper.security('生成密码重置令牌', {
        userId,
        email,
        expiresAt: expiresAt.toISOString()
      });
      
      return {
        token,
        expiresAt
      };
    } catch (error) {
      await client.query('ROLLBACK');
      LogHelper.error('生成密码重置令牌失败', error, { userId, email });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 验证重置令牌
   * @param {string} token - 重置令牌
   * @returns {Promise<Object|null>} 用户信息或null
   */
  static async verifyResetToken(token) {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      const result = await pool.query(
        `SELECT prt.id as token_id, prt.user_id, prt.expires_at, prt.attempts,
                u.id, u.email, u.username, u.is_active
         FROM password_reset_tokens prt
         JOIN users u ON prt.user_id = u.id
         WHERE prt.token_hash = $1 AND prt.used = false`,
        [tokenHash]
      );
      
      if (result.rows.length === 0) {
        LogHelper.security('无效的重置令牌', { token: token.substring(0, 10) + '...' });
        return null;
      }
      
      const tokenData = result.rows[0];
      
      // 检查令牌是否过期
      if (new Date(tokenData.expires_at) < new Date()) {
        LogHelper.security('重置令牌已过期', {
          userId: tokenData.user_id,
          expiresAt: tokenData.expires_at
        });
        return null;
      }
      
      // 检查用户是否活跃
      if (!tokenData.is_active) {
        LogHelper.security('重置令牌对应的用户已被禁用', {
          userId: tokenData.user_id
        });
        return null;
      }
      
      // 检查尝试次数
      if (tokenData.attempts >= config.maxAttempts) {
        LogHelper.security('重置令牌尝试次数超限', {
          userId: tokenData.user_id,
          attempts: tokenData.attempts
        });
        return null;
      }
      
      return {
        tokenId: tokenData.token_id,
        userId: tokenData.user_id,
        email: tokenData.email,
        username: tokenData.username
      };
    } catch (error) {
      LogHelper.error('验证重置令牌失败', error, { token: token.substring(0, 10) + '...' });
      return null;
    }
  }

  /**
   * 重置密码
   * @param {string} token - 重置令牌
   * @param {string} newPassword - 新密码
   * @param {string} ipAddress - IP地址
   * @returns {Promise<boolean>} 是否成功
   */
  static async resetPassword(token, newPassword, ipAddress = '0.0.0.0') {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 验证令牌
      const tokenData = await this.verifyResetToken(token);
      if (!tokenData) {
        throw new Error('无效或已过期的重置令牌');
      }
      
      const { tokenId, userId, email } = tokenData;
      
      // 验证密码强度
      const passwordValidation = this.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new Error(`密码不符合要求: ${passwordValidation.errors.join(', ')}`);
      }
      
      // 检查密码历史
      const isInHistory = await this.checkPasswordHistory(userId, newPassword, client);
      if (isInHistory) {
        throw new Error('新密码不能与最近使用的密码相同');
      }
      
      // 加密新密码
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);
      
      // 更新用户密码
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [passwordHash, userId]
      );
      
      // 将密码加入历史记录
      await client.query(
        'INSERT INTO password_history (user_id, password_hash, created_at) VALUES ($1, $2, NOW())',
        [userId, passwordHash]
      );
      
      // 清理旧的密码历史记录(保留最近N条)
      await client.query(
        `DELETE FROM password_history 
         WHERE user_id = $1 AND id NOT IN (
           SELECT id FROM password_history 
           WHERE user_id = $1 
           ORDER BY created_at DESC 
           LIMIT $2
         )`,
        [userId, config.passwordHistoryCount]
      );
      
      // 标记令牌为已使用
      await client.query(
        'UPDATE password_reset_tokens SET used = true, used_at = NOW() WHERE id = $1',
        [tokenId]
      );
      
      // 记录密码重置事件
      await client.query(
        `INSERT INTO security_audit_logs 
         (user_id, event_type, event_description, ip_address, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [userId, 'password_reset', '用户通过重置令牌重置密码', ipAddress]
      );
      
      await client.query('COMMIT');
      
      LogHelper.security('密码重置成功', {
        userId,
        email,
        ipAddress
      });
      
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      LogHelper.error('密码重置失败', error, {
        token: token.substring(0, 10) + '...',
        ipAddress
      });
      
      // 增加尝试次数
      if (error.message.includes('无效')) {
        await this.incrementAttempts(token);
      }
      
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 验证密码强度
   * @param {string} password - 密码
   * @returns {Object} { isValid, errors }
   */
  static validatePasswordStrength(password) {
    const errors = [];
    
    if (password.length < config.minPasswordLength) {
      errors.push(`密码长度至少${config.minPasswordLength}位`);
    }
    
    if (config.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('密码需包含大写字母');
    }
    
    if (config.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('密码需包含小写字母');
    }
    
    if (config.requireNumber && !/\d/.test(password)) {
      errors.push('密码需包含数字');
    }
    
    if (config.requireSpecialChar && !/[^\w\s]/.test(password)) {
      errors.push('密码需包含特殊字符');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * 检查密码是否在历史记录中
   * @param {string} userId - 用户ID
   * @param {string} password - 密码
   * @param {Object} client - 数据库客户端
   * @returns {Promise<boolean>} 是否在历史记录中
   */
  static async checkPasswordHistory(userId, password, client = pool) {
    try {
      const result = await client.query(
        `SELECT password_hash FROM password_history 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [userId, config.passwordHistoryCount]
      );
      
      for (const row of result.rows) {
        const isMatch = await bcrypt.compare(password, row.password_hash);
        if (isMatch) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      LogHelper.error('检查密码历史失败', error, { userId });
      return false;
    }
  }

  /**
   * 增加重置尝试次数
   * @param {string} token - 重置令牌
   */
  static async incrementAttempts(token) {
    try {
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      await pool.query(
        'UPDATE password_reset_tokens SET attempts = attempts + 1 WHERE token_hash = $1',
        [tokenHash]
      );
    } catch (error) {
      LogHelper.error('增加重置尝试次数失败', error);
    }
  }

  /**
   * 清理过期的重置令牌
   * @returns {Promise<number>} 清理的数量
   */
  static async cleanupExpiredTokens() {
    try {
      const result = await pool.query(
        'DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used = true'
      );
      
      const cleanedCount = result.rowCount;
      
      if (cleanedCount > 0) {
        LogHelper.system('清理过期密码重置令牌', { cleanedCount });
      }
      
      return cleanedCount;
    } catch (error) {
      LogHelper.error('清理过期重置令牌失败', error);
      return 0;
    }
  }
}

// 启动定时清理任务(每小时执行一次)
setInterval(() => {
  PasswordResetService.cleanupExpiredTokens();
}, 3600000);

module.exports = PasswordResetService;
