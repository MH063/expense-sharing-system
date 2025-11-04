/**
 * API速率限制中间件
 * 实现API速率限制功能，生产环境同一接口1分钟内最多10次请求，开发测试环境不限制
 */

const rateLimit = require('express-rate-limit');
const { logger } = require('../config/logger');

// 获取环境配置
const { getEnvironmentConfig } = require('../config/environment');
const config = getEnvironmentConfig();

/**
 * 创建速率限制中间件
 * @param {Object} options - 配置选项
 * @param {number} options.windowMs - 时间窗口（毫秒）
 * @param {number} options.max - 最大请求数
 * @param {string} options.message - 超出限制时的错误消息
 * @param {boolean} options.skipSuccessfulRequests - 是否跳过成功的请求
 * @returns {Function} 速率限制中间件
 */
function createRateLimiter(options = {}) {
  const defaultOptions = {
    windowMs: 60 * 1000, // 1分钟
    max: config.api.rateLimit, // 默认最大请求数
    message: {
      success: false,
      error: '请求过于频繁，请稍后再试',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true, // 返回速率限制信息在 `RateLimit-*` headers
    legacyHeaders: false, // 禁用 `X-RateLimit-*` headers
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    handler: (req, res) => {
      logger.warn(`API速率限制触发: IP ${req.ip} 访问 ${req.method} ${req.path}`);
      res.status(429).json(options.message || {
        success: false,
        error: '请求过于频繁，请稍后再试',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }
  };

  // 在开发和测试环境中，如果配置了不启用速率限制，则创建一个通过所有请求的中间件
  if (!config.security.enableRateLimiting) {
    return (req, res, next) => next();
  }

  // 合并配置选项
  const limiterOptions = { ...defaultOptions, ...options };

  return rateLimit(limiterOptions);
}

// 默认速率限制器（每分钟10次请求）
const defaultRateLimiter = createRateLimiter();

// 严格速率限制器（每分钟5次请求）
const strictRateLimiter = createRateLimiter({
  max: 5,
  message: {
    success: false,
    error: '此接口请求过于频繁，请稍后再试',
    code: 'STRICT_RATE_LIMIT_EXCEEDED'
  }
});

// 宽松速率限制器（每分钟20次请求）
const looseRateLimiter = createRateLimiter({
  max: 20
});

// 登录接口专用速率限制器（每分钟5次请求）
const loginRateLimiter = createRateLimiter({
  max: 5,
  message: {
    success: false,
    error: '登录尝试过于频繁，请稍后再试',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED'
  },
  skipSuccessfulRequests: true // 成功的登录不计入限制
});

// 开发环境登录速率限制器（每分钟100次请求，用于安全测试）
const devLoginRateLimiter = config.security.enableRateLimiting ? 
  (config.env === 'production' ? loginRateLimiter : createRateLimiter({
    max: 100,
    message: {
      success: false,
      error: '登录尝试过于频繁，请稍后再试',
      code: 'LOGIN_RATE_LIMIT_EXCEEDED'
    },
    skipSuccessfulRequests: true
  })) : 
  (req, res, next) => next();

// 注册接口专用速率限制器（每分钟3次请求）
const registerRateLimiter = createRateLimiter({
  max: 3,
  message: {
    success: false,
    error: '注册尝试过于频繁，请稍后再试',
    code: 'REGISTER_RATE_LIMIT_EXCEEDED'
  }
});

module.exports = {
  createRateLimiter,
  defaultRateLimiter,
  strictRateLimiter,
  looseRateLimiter,
  loginRateLimiter,
  devLoginRateLimiter,
  registerRateLimiter
};