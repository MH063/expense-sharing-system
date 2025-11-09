const { pool } = require('../config/db');
const { logger } = require('../config/logger');
const { totpVerify } = require('../utils/totp');
const { recordFailure, recordSuccess, isBlocked } = require('./bruteForceRedis');

/**
 * 安全增强中间件
 * 实现登录失败计数和账户锁定机制，以及敏感操作的二次身份验证
 */

// 登录失败尝试限制配置
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30分钟

/**
 * 记录登录失败尝试
 * @param {string} userId - 用户ID
 */
async function recordFailedLoginAttempt(userId) {
  try {
    // 更新用户表中的登录失败计数和锁定时间
    await pool.query(
      `UPDATE users 
       SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
           locked_until = CASE 
             WHEN COALESCE(failed_login_attempts, 0) + 1 >= $2 
             THEN NOW() + INTERVAL '${LOCKOUT_DURATION} milliseconds' 
             ELSE locked_until 
           END,
           updated_at = NOW()
       WHERE id = $1`,
      [userId, MAX_LOGIN_ATTEMPTS]
    );
  } catch (error) {
    logger.error('记录登录失败尝试失败:', error);
  }
}

/**
 * 重置登录失败计数
 * @param {string} userId - 用户ID
 */
async function resetFailedLoginAttempts(userId) {
  try {
    await pool.query(
      `UPDATE users 
       SET failed_login_attempts = 0, 
           locked_until = NULL, 
           updated_at = NOW() 
       WHERE id = $1`,
      [userId]
    );
  } catch (error) {
    logger.error('重置登录失败计数失败:', error);
  }
}

/**
 * 检查账户是否被锁定
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} 锁定状态和剩余时间
 */
async function isAccountLocked(userId) {
  try {
    const result = await pool.query(
      `SELECT locked_until, failed_login_attempts 
       FROM users 
       WHERE id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return { locked: false };
    }
    
    const user = result.rows[0];
    const now = new Date();
    
    // 检查账户是否被锁定
    if (user.locked_until && new Date(user.locked_until) > now) {
      const lockoutTime = new Date(user.locked_until);
      const remainingTime = lockoutTime.getTime() - now.getTime();
      return { 
        locked: true, 
        remainingTime,
        failedAttempts: user.failed_login_attempts
      };
    }
    
    return { locked: false, failedAttempts: user.failed_login_attempts };
  } catch (error) {
    logger.error('检查账户锁定状态失败:', error);
    return { locked: false };
  }
}

/**
 * 账户锁定检查中间件
 * 在登录前检查账户是否被锁定
 */
async function accountLockCheck(req, res, next) {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: '用户名为必填项'
      });
    }
    
    // 查找用户
    const userResult = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $1',
      [username]
    );
    
    if (userResult.rows.length === 0) {
      // 用户不存在，但仍需防止用户名枚举攻击
      return res.status(401).json({
        success: false,
        message: '用户名或密码错误'
      });
    }
    
    const userId = userResult.rows[0].id;
    
    // 检查账户是否被锁定
    const lockStatus = await isAccountLocked(userId);
    
    if (lockStatus.locked) {
      logger.warn(`账户被锁定，用户ID: ${userId}`);
      return res.status(423).json({
        success: false,
        message: '账户已被锁定，请稍后再试',
        remainingTime: lockStatus.remainingTime
      });
    }
    
    // 将用户ID添加到请求对象中，供后续使用
    req.userId = userId;
    next();
  } catch (error) {
    logger.error('账户锁定检查失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
}

/**
 * 敏感操作二次身份验证中间件
 * 验证用户的TOTP代码
 */
async function sensitiveOperationMFA(req, res, next) {
  try {
    // 确保用户已通过认证
    if (!req.user || !req.user.sub) {
      return res.status(401).json({
        success: false,
        message: '用户未认证'
      });
    }
    
    const userId = req.user.sub;
    const mfaCode = req.body.mfa_code || req.headers['x-mfa-code'];
    
    if (!mfaCode) {
      return res.status(400).json({
        success: false,
        message: '需要提供二次验证代码'
      });
    }
    
    // 获取用户的MFA设置
    const userResult = await pool.query(
      'SELECT mfa_secret, mfa_enabled FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    const user = userResult.rows[0];
    
    // 检查MFA是否已启用
    if (!user.mfa_enabled) {
      return res.status(400).json({
        success: false,
        message: '用户未启用二次验证'
      });
    }
    
    // 验证TOTP代码
    const isValid = totpVerify(String(mfaCode), user.mfa_secret, { window: 1 });
    
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: '二次验证代码无效'
      });
    }
    
    next();
  } catch (error) {
    logger.error('敏感操作二次身份验证失败:', error);
    return res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
}

/**
 * 更新数据库表结构，添加账户锁定相关字段
 */
async function updateDatabaseSchema() {
  try {
    // 添加登录失败计数和锁定时间字段
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0,
      ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ
    `);
    
    logger.info('数据库表结构更新成功');
  } catch (error) {
    logger.error('更新数据库表结构失败:', error);
  }
}

// 在模块加载时更新数据库结构
updateDatabaseSchema().catch(console.error);

module.exports = {
  recordFailedLoginAttempt,
  resetFailedLoginAttempts,
  isAccountLocked,
  accountLockCheck,
  sensitiveOperationMFA
};