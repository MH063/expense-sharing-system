const { logger } = require('../config/logger');
const { isBlocked, recordFailure, recordSuccess, getFailureCount } = require('./bruteForceRedis');

/**
 * 增强版暴力破解防护中间件
 * 实现多维度的防护机制
 */

// 配置参数
const CONFIG = {
  // IP最大尝试次数
  ipMaxAttempts: parseInt(process.env.BRUTE_FORCE_IP_MAX_ATTEMPTS) || 50,
  // 用户最大尝试次数
  userMaxAttempts: parseInt(process.env.BRUTE_FORCE_USER_MAX_ATTEMPTS) || 10,
  // 封禁时长（毫秒）
  blockDurationMs: parseInt(process.env.BRUTE_FORCE_BLOCK_DURATION_MS) || 15 * 60 * 1000,
  // 异常行为检测阈值
  suspiciousThreshold: 5, // 短时间内失败次数阈值
  // 异常行为时间窗口（毫秒）
  suspiciousWindowMs: 60 * 1000, // 1分钟
  // 地理位置检测（需要第三方服务）
  enableGeoDetection: process.env.ENABLE_GEO_DETECTION === 'true'
};

// 内存存储异常行为数据（生产环境中应使用Redis）
const suspiciousActivity = new Map();

/**
 * 记录登录尝试
 * @param {string} ip - IP地址
 * @param {string} username - 用户名
 * @param {boolean} success - 是否成功
 */
async function recordLoginAttempt(ip, username, success) {
  try {
    if (success) {
      await recordSuccess(ip, username);
      // 清除异常行为记录
      clearSuspiciousActivity(ip, username);
    } else {
      await recordFailure(ip, username);
      // 记录异常行为
      recordSuspiciousActivity(ip, username);
    }
  } catch (error) {
    logger.error('记录登录尝试失败:', error);
  }
}

/**
 * 记录异常行为
 * @param {string} ip - IP地址
 * @param {string} username - 用户名
 */
function recordSuspiciousActivity(ip, username) {
  const key = `${ip}:${username}`;
  const now = Date.now();
  
  if (!suspiciousActivity.has(key)) {
    suspiciousActivity.set(key, []);
  }
  
  const activities = suspiciousActivity.get(key);
  activities.push(now);
  
  // 只保留时间窗口内的活动记录
  const windowStart = now - CONFIG.suspiciousWindowMs;
  const filteredActivities = activities.filter(time => time > windowStart);
  suspiciousActivity.set(key, filteredActivities);
}

/**
 * 清除异常行为记录
 * @param {string} ip - IP地址
 * @param {string} username - 用户名
 */
function clearSuspiciousActivity(ip, username) {
  const key = `${ip}:${username}`;
  suspiciousActivity.delete(key);
}

/**
 * 检查是否为异常行为
 * @param {string} ip - IP地址
 * @param {string} username - 用户名
 * @returns {boolean} 是否为异常行为
 */
function isSuspiciousActivity(ip, username) {
  const key = `${ip}:${username}`;
  if (!suspiciousActivity.has(key)) {
    return false;
  }
  
  const activities = suspiciousActivity.get(key);
  return activities.length >= CONFIG.suspiciousThreshold;
}

/**
 * 检查地理位置异常（简化实现，实际应集成第三方服务）
 * @param {string} ip - IP地址
 * @param {string} username - 用户名
 * @returns {boolean} 是否地理位置异常
 */
async function checkGeoAnomaly(ip, username) {
  // 简化实现：检查是否频繁更换地理位置
  // 实际应用中应集成IP地理位置服务
  return false;
}

/**
 * 增强版暴力破解防护中间件
 */
async function enhancedBruteForceProtection(req, res, next) {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: '用户名为必填项'
      });
    }
    
    // 检查是否已被封禁
    const isBlockedResult = await isBlocked(ip, username);
    if (isBlockedResult.blocked) {
      logger.warn('检测到被封禁的IP或用户尝试登录', { ip, username });
      return res.status(429).json({
        success: false,
        message: '请求过于频繁，请稍后再试',
        remainingTime: isBlockedResult.remainingTime
      });
    }
    
    // 检查异常行为
    if (isSuspiciousActivity(ip, username)) {
      logger.warn('检测到异常登录行为', { ip, username });
      // 可以选择性地临时封禁或增加验证码
      // 这里我们只记录日志
    }
    
    // 检查地理位置异常（如果启用）
    if (CONFIG.enableGeoDetection) {
      const isGeoAnomaly = await checkGeoAnomaly(ip, username);
      if (isGeoAnomaly) {
        logger.warn('检测到地理位置异常', { ip, username });
        // 可以选择性地临时封禁或增加验证码
      }
    }
    
    // 添加检查完成标记
    req.bruteForceChecked = true;
    next();
  } catch (error) {
    logger.error('暴力破解防护检查失败:', error);
    // 出错时继续处理请求，避免影响正常业务
    next();
  }
}

/**
 * 记录登录结果中间件
 * @param {boolean} success - 登录是否成功
 */
function recordLoginResult(success) {
  return async (req, res, next) => {
    try {
      if (req.bruteForceChecked) {
        const ip = req.ip || req.connection.remoteAddress;
        const { username } = req.body;
        
        if (username) {
          await recordLoginAttempt(ip, username, success);
        }
      }
    } catch (error) {
      logger.error('记录登录结果失败:', error);
    }
    
    next();
  };
}

module.exports = {
  enhancedBruteForceProtection,
  recordLoginResult
};