/**
 * API速度限制中间件（支持角色动态阈值与白名单跳过）
 */

const rateLimit = require('express-rate-limit');
const { logger } = require('../config/logger');
const { getEnvironmentConfig } = require('../config/environment');
const config = getEnvironmentConfig();

function isRateLimitingEnabled() {
  return !!config.security.enableRateLimiting;
}

function createRateLimiter(options = {}) {
  const defaultOptions = {
    windowMs: 60 * 1000,
    max: config.api.rateLimit,
    message: {
      success: false,
      error: '请求过于频繁，请稍后再试',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    skip: (req) => {
      // 白名单：支持按用户ID和角色跳过限流
      try {
        const whitelist = config.security.rateLimitWhitelist || [];
        const userId = req.user?.sub;
        const roles = req.user?.roles || [];
        if (userId && whitelist.includes(userId)) return true;
        const roleWhitelist = config.security.rateLimitRoleWhitelist || [];
        if (Array.isArray(roles) && roles.some(r => roleWhitelist.includes(r))) return true;
      } catch (_) {}
      return false;
    },
    handler: (req, res) => {
      logger.warn(`API速度限制触发: IP ${req.ip} 访问 ${req.method} ${req.path}`);
      res.status(429).json(options.message || {
        success: false,
        error: '请求过于频繁，请稍后再试',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }
  };

  if (!isRateLimitingEnabled()) {
    return (req, res, next) => next();
  }

  const limiterOptions = { ...defaultOptions, ...options };
  return rateLimit(limiterOptions);
}

// 预设限流器
const defaultRateLimiter = createRateLimiter();
const strictRateLimiter = createRateLimiter({
  max: 5,
  message: {
    success: false,
    error: '此接口请求过于频繁，请稍后再试',
    code: 'STRICT_RATE_LIMIT_EXCEEDED'
  }
});
const looseRateLimiter = createRateLimiter({ max: 20 });
const loginRateLimiter = createRateLimiter({
  max: 5,
  message: {
    success: false,
    error: '登录尝试过于频繁，请稍后再试',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED'
  },
  skipSuccessfulRequests: true
});
const devLoginRateLimiter = isRateLimitingEnabled() ?
  (config.env === 'production' ? loginRateLimiter : createRateLimiter({
    max: 100,
    message: {
      success: false,
      error: '登录尝试过于频繁，请稍后再试',
      code: 'LOGIN_RATE_LIMIT_EXCEEDED'
    },
    skipSuccessfulRequests: true
  })) : (req, res, next) => next();
const registerRateLimiter = createRateLimiter({
  max: 3,
  message: {
    success: false,
    error: '注册尝试过于频繁，请稍后再试',
    code: 'REGISTER_RATE_LIMIT_EXCEEDED'
  }
});

/**
 * 角色感知的限流器工厂
 * @param {'strict'|'loose'|'custom'} preset
 * @param {Object} customOptions
 */
function roleAwareRateLimiter(preset = 'strict', customOptions = {}) {
  const roleConfig = config.security.rateLimitByRole || {};
  return (req, res, next) => {
    if (!isRateLimitingEnabled()) return next();
    const roles = req.user?.roles || [];
    // 选取最大角色阈值（更宽松的阈值）
    let maxPerMinute = preset === 'strict' ? 5 : preset === 'loose' ? 20 : (config.api.rateLimit || 10);
    for (const role of roles) {
      const roleLimits = roleConfig[role];
      if (roleLimits) {
        const candidate = preset === 'strict' ? roleLimits.strict ?? maxPerMinute
                        : preset === 'loose' ? roleLimits.loose ?? maxPerMinute
                        : roleLimits.default ?? maxPerMinute;
        if (Number.isFinite(candidate)) {
          maxPerMinute = Math.max(maxPerMinute, candidate);
        }
      }
    }
    const limiter = createRateLimiter({ ...customOptions, max: maxPerMinute });
    return limiter(req, res, next);
  };
}

module.exports = {
  createRateLimiter,
  defaultRateLimiter,
  strictRateLimiter,
  looseRateLimiter,
  loginRateLimiter,
  devLoginRateLimiter,
  registerRateLimiter,
  roleAwareRateLimiter
};