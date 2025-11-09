// 简易零成本暴力破解防护（内存计数），生产多实例下建议接入集中式存储
const { logger } = require('../config/logger');
const { getEnvironmentConfig } = require('../config/environment');

// 获取环境配置
const config = getEnvironmentConfig();

const attemptsByIp = new Map();
const attemptsByUser = new Map();

// 根据环境配置设置限制
const WINDOW_MS = 15 * 60 * 1000; // 15分钟
const IP_MAX_ATTEMPTS = config.nodeEnv === 'development' ? 20 : 50; // 开发环境放宽限制
const USER_MAX_ATTEMPTS = config.nodeEnv === 'development' ? 5 : 10; // 开发环境放宽限制
const BLOCK_DURATION_MS = config.nodeEnv === 'development' ? 60 * 1000 : 15 * 60 * 1000; // 开发环境缩短封禁时间

function getBucket(map, key) {
  const now = Date.now();
  let bucket = map.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS, blockedUntil: 0 };
    map.set(key, bucket);
  }
  return bucket;
}

function recordFailure(ip, username) {
  const ipBucket = getBucket(attemptsByIp, ip);
  ipBucket.count += 1;
  if (ipBucket.count > IP_MAX_ATTEMPTS) {
    ipBucket.blockedUntil = Date.now() + BLOCK_DURATION_MS;
  }

  if (username) {
    const userBucket = getBucket(attemptsByUser, username);
    userBucket.count += 1;
    if (userBucket.count > USER_MAX_ATTEMPTS) {
      userBucket.blockedUntil = Date.now() + BLOCK_DURATION_MS;
    }
  }
}

function recordSuccess(username) {
  if (username && attemptsByUser.has(username)) {
    attemptsByUser.delete(username);
  }
}

function isBlocked(ip, username) {
  const now = Date.now();
  const ipBucket = attemptsByIp.get(ip);
  if (ipBucket && ipBucket.blockedUntil > now) return { blocked: true, reason: 'IP' };
  const userBucket = username ? attemptsByUser.get(username) : null;
  if (userBucket && userBucket.blockedUntil > now) return { blocked: true, reason: 'USER' };
  return { blocked: false };
}

function loginBruteProtector(req, res, next) {
  const ip = req.ip;
  const username = (req.body && req.body.username) ? String(req.body.username) : undefined;
  const status = isBlocked(ip, username);
  if (status.blocked) {
    logger.warn('登录被防暴力机制阻止', { ip, username, reason: status.reason });
    return res.tooManyRequests('尝试次数过多，请稍后再试');
  }
  // 挂载帮助函数，供控制器在失败/成功时调用
  req._recordLoginFailure = () => recordFailure(ip, username);
  req._recordLoginSuccess = () => recordSuccess(username);
  return next();
}

module.exports = { loginBruteProtector };
