const { logger } = require('../config/logger');

/**
 * 日志脱敏中间件
 * 对日志中的敏感信息进行过滤和替换
 */

// 敏感字段模式定义
const SENSITIVE_PATTERNS = [
  { pattern: /password["']?\s*[:=]\s*["']?([^"'\s,}]*)/gi, replacement: 'password=***' },
  { pattern: /token["']?\s*[:=]\s*["']?([^"'\s,}]*)/gi, replacement: 'token=***' },
  { pattern: /secret["']?\s*[:=]\s*["']?([^"'\s,}]*)/gi, replacement: 'secret=***' },
  { pattern: /key["']?\s*[:=]\s*["']?([^"'\s,}]*)/gi, replacement: 'key=***' },
  { pattern: /authorization["']?\s*[:=]\s*["']?([^"'\s,}]*)/gi, replacement: 'authorization=***' },
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '***@***.***' }, // 邮箱
  { pattern: /\d{11}/g, replacement: '***' }, // 手机号
  { pattern: /\d{16,19}/g, replacement: '**** **** **** ****' }, // 银行卡号
  { pattern: /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g, replacement: '**** **** **** ****' } // 信用卡号
];

/**
 * 脱敏处理函数
 * @param {string} message - 日志消息
 * @returns {string} 脱敏后的消息
 */
function sanitizeMessage(message) {
  if (typeof message !== 'string') {
    return message;
  }

  let sanitizedMessage = message;
  
  // 应用所有脱敏模式
  for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
    sanitizedMessage = sanitizedMessage.replace(pattern, replacement);
  }
  
  return sanitizedMessage;
}

/**
 * 创建脱敏日志记录器
 * @param {Object} originalLogger - 原始日志记录器
 * @returns {Object} 脱敏日志记录器
 */
function createSanitizedLogger(originalLogger) {
  const sanitizedLogger = {};
  
  // 复制原始日志记录器的所有方法
  for (const method in originalLogger) {
    if (typeof originalLogger[method] === 'function') {
      sanitizedLogger[method] = function(...args) {
        // 对所有参数进行脱敏处理
        const sanitizedArgs = args.map(arg => {
          if (typeof arg === 'string') {
            return sanitizeMessage(arg);
          } else if (typeof arg === 'object' && arg !== null) {
            try {
              const jsonString = JSON.stringify(arg);
              const sanitizedJson = sanitizeMessage(jsonString);
              return JSON.parse(sanitizedJson);
            } catch (error) {
              // 如果无法序列化，返回原始对象
              return arg;
            }
          }
          return arg;
        });
        
        // 调用原始日志记录器方法
        return originalLogger[method].apply(originalLogger, sanitizedArgs);
      };
    }
  }
  
  return sanitizedLogger;
}

/**
 * Express中间件，用于脱敏请求和响应数据
 */
function sanitizeRequestResponse(req, res, next) {
  // 保存原始的req和res方法
  const originalReqJson = req.json;
  const originalResJson = res.json;
  
  // 脱敏请求体
  if (req.body) {
    try {
      const bodyString = JSON.stringify(req.body);
      const sanitizedBodyString = sanitizeMessage(bodyString);
      req.body = JSON.parse(sanitizedBodyString);
    } catch (error) {
      logger.warn('请求体脱敏失败:', error);
    }
  }
  
  // 脱敏查询参数
  if (req.query) {
    try {
      const queryString = JSON.stringify(req.query);
      const sanitizedQueryString = sanitizeMessage(queryString);
      req.query = JSON.parse(sanitizedQueryString);
    } catch (error) {
      logger.warn('查询参数脱敏失败:', error);
    }
  }
  
  next();
}

module.exports = {
  sanitizeMessage,
  createSanitizedLogger,
  sanitizeRequestResponse
};