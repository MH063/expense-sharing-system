/**
 * 基于Redis的暴力破解防护中间件
 * 使用集中式存储实现更可靠的防护机制
 */

const { logger } = require('../config/logger');
const { getEnvironmentConfig } = require('../config/environment');
const { getBruteForceConfig } = require('../config/brute-force-config');
const redisConfig = require('../config/redis');

// 添加详细的日志记录函数
function logBruteForceEvent(event, details) {
  logger.info(`[BRUTE_FORCE_PROTECTION] ${event}`, details);
}

// 获取环境配置
const envConfig = getEnvironmentConfig();
const bruteForceConfig = getBruteForceConfig();

// 使用详细配置
const WINDOW_MS = bruteForceConfig.windowMs;
const IP_MAX_ATTEMPTS = bruteForceConfig.ip.maxAttempts;
const USER_MAX_ATTEMPTS = bruteForceConfig.user.maxAttempts;
const BLOCK_DURATION_MS = bruteForceConfig.block.durationMs;

/**
 * 生成Redis键名
 * @param {string} type - 键类型(ip/user)
 * @param {string} identifier - 标识符
 * @returns {string} Redis键名
 */
function generateKey(type, identifier) {
  return `brute_force:${type}:${identifier}`;
}

/**
 * 记录失败尝试
 * @param {string} ip - IP地址
 * @param {string} username - 用户名
 */
async function recordFailure(ip, username) {
  try {
    const redisClient = redisConfig.getRedisClient();
    const pipeline = redisClient.multi();
    const now = Date.now();
    
    // 记录IP失败次数
    const ipKey = generateKey('ip', ip);
    pipeline.incr(ipKey);
    pipeline.expire(ipKey, Math.ceil(WINDOW_MS / 1000));
    
    // 检查是否需要封禁IP
    const ipCount = await redisClient.get(ipKey);
    if (parseInt(ipCount) > IP_MAX_ATTEMPTS) {
      const blockKey = generateKey('blocked:ip', ip);
      pipeline.setex(blockKey, Math.ceil(BLOCK_DURATION_MS / 1000), '1');
    }
    
    let userKey = null;
    let userCount = null;
    
    // 如果提供了用户名，也记录用户名失败次数
    if (username) {
      userKey = generateKey('user', username);
      pipeline.incr(userKey);
      pipeline.expire(userKey, Math.ceil(WINDOW_MS / 1000));
      
      // 检查是否需要封禁用户名
      userCount = await redisClient.get(userKey);
      if (parseInt(userCount) > USER_MAX_ATTEMPTS) {
        const blockKey = generateKey('blocked:user', username);
        pipeline.setex(blockKey, Math.ceil(BLOCK_DURATION_MS / 1000), '1');
      }
    }
    
    await pipeline.exec();
    
    // 记录详细日志
    logBruteForceEvent('FAILURE_RECORDED', {
      ip,
      username,
      ipCount: parseInt(ipCount) || 0,
      userCount: username && userCount ? (parseInt(userCount) || 0) : 0,
      timestamp: new Date().toISOString()
    });
    
    // 如果启用了监控，记录指标
    if (bruteForceConfig.monitoring.enabled) {
      const shouldLog = Math.random() < bruteForceConfig.monitoring.samplingRate;
      if (shouldLog) {
        logBruteForceEvent('MONITORING_METRIC', {
          type: 'failure',
          ip,
          username,
          ipCount: parseInt(ipCount) || 0,
          userCount: username && userCount ? (parseInt(userCount) || 0) : 0,
          windowMs: WINDOW_MS,
          timestamp: new Date().toISOString()
        });
      }
    }
  } catch (error) {
    logger.error('记录失败尝试时出错', { error: error.message, ip, username });
  }
}

/**
 * 记录成功登录
 * @param {string} username - 用户名
 */
async function recordSuccess(username) {
  try {
    if (username) {
      const redisClient = redisConfig.getRedisClient();
      const pipeline = redisClient.multi();
      
      // 清除用户的失败记录
      const userKey = generateKey('user', username);
      const blockKey = generateKey('blocked:user', username);
      
      pipeline.del(userKey);
      pipeline.del(blockKey);
      
      await pipeline.exec();
      
      // 记录详细日志
      logBruteForceEvent('SUCCESS_RECORDED', {
        username,
        timestamp: new Date().toISOString()
      });
      
      // 如果启用了监控，记录指标
      if (bruteForceConfig.monitoring.enabled) {
        const shouldLog = Math.random() < bruteForceConfig.monitoring.samplingRate;
        if (shouldLog || bruteForceConfig.monitoring.logAllAttempts) {
          logBruteForceEvent('MONITORING_METRIC', {
            type: 'success',
            username,
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  } catch (error) {
    logger.error('记录成功登录时出错', { error: error.message, username });
  }
}

/**
 * 检查IP是否在白名单中
 * @param {string} ip - IP地址
 * @returns {boolean} 是否在白名单中
 */
function isIpWhitelisted(ip) {
  return bruteForceConfig.whitelist.ips.includes(ip);
}

/**
 * 检查用户是否在白名单中
 * @param {string} username - 用户名
 * @returns {boolean} 是否在白名单中
 */
function isUserWhitelisted(username) {
  return bruteForceConfig.whitelist.users.includes(username);
}

/**
 * 检查是否被封禁
 * @param {string} ip - IP地址
 * @param {string} username - 用户名
 * @returns {Object} 封禁状态
 */
async function isBlocked(ip, username) {
  try {
    // 检查白名单
    if (isIpWhitelisted(ip)) {
      return { blocked: false };
    }
    
    if (username && isUserWhitelisted(username)) {
      return { blocked: false };
    }
    
    const redisClient = redisConfig.getRedisClient();
    
    // 检查IP是否被封禁
    const ipBlockKey = generateKey('blocked:ip', ip);
    const ipBlocked = await redisClient.exists(ipBlockKey);
    if (ipBlocked) {
      logBruteForceEvent('IP_BLOCKED', {
        ip,
        timestamp: new Date().toISOString()
      });
      return { blocked: true, reason: 'IP' };
    }
    
    // 检查用户名是否被封禁
    if (username) {
      const userBlockKey = generateKey('blocked:user', username);
      const userBlocked = await redisClient.exists(userBlockKey);
      if (userBlocked) {
        logBruteForceEvent('USER_BLOCKED', {
          username,
          timestamp: new Date().toISOString()
        });
        return { blocked: true, reason: 'USER' };
      }
    }
    
    return { blocked: false };
  } catch (error) {
    logger.error('检查封禁状态时出错', { error: error.message, ip, username });
    // 出错时允许登录，避免影响正常用户
    return { blocked: false };
  }
}

/**
 * 暴力破解防护中间件
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一步函数
 */
async function loginBruteProtectorRedis(req, res, next) {
  try {
    const ip = req.ip;
    const username = (req.body && req.body.username) ? String(req.body.username) : undefined;
    
    // 记录请求信息
    logBruteForceEvent('LOGIN_ATTEMPT', {
      ip,
      username,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString()
    });
    
    const status = await isBlocked(ip, username);
    if (status.blocked) {
      logger.warn('登录被防暴力机制阻止', { ip, username, reason: status.reason });
      logBruteForceEvent('LOGIN_BLOCKED', {
        ip,
        username,
        reason: status.reason,
        timestamp: new Date().toISOString()
      });
      return res.tooManyRequests('尝试次数过多，请稍后再试');
    }
    
    // 挂载帮助函数，供控制器在失败/成功时调用
    req._recordLoginFailure = () => recordFailure(ip, username);
    req._recordLoginSuccess = () => recordSuccess(username);
    
    return next();
  } catch (error) {
    logger.error('暴力破解防护中间件出错', { error: error.message });
    // 出错时继续处理请求，避免影响正常登录流程
    return next();
  }
}

module.exports = { 
  loginBruteProtectorRedis,
  recordFailure,
  recordSuccess,
  isBlocked,
  isIpWhitelisted,
  isUserWhitelisted
};