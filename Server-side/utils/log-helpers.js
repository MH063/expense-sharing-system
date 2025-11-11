/**
 * 日志辅助工具
 * 提供便捷的日志记录方法和格式化功能
 */

const { logger } = require('../config/logger');

/**
 * 日志级别枚举
 */
const LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  HTTP: 'http',
  DEBUG: 'debug'
};

/**
 * 日志分类枚举
 */
const LogCategory = {
  AUTH: 'auth',
  DATABASE: 'database',
  API: 'api',
  BUSINESS: 'business',
  SECURITY: 'security',
  SYSTEM: 'system',
  PERFORMANCE: 'performance'
};

/**
 * 日志辅助类
 */
class LogHelper {
  /**
   * 记录认证相关日志
   * @param {string} action - 操作名称
   * @param {Object} details - 详细信息
   * @param {string} level - 日志级别
   */
  static auth(action, details = {}, level = LogLevel.INFO) {
    logger[level](`[认证] ${action}`, {
      category: LogCategory.AUTH,
      action,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录数据库操作日志
   * @param {string} operation - 操作类型
   * @param {string} table - 表名
   * @param {Object} details - 详细信息
   * @param {string} level - 日志级别
   */
  static database(operation, table, details = {}, level = LogLevel.INFO) {
    logger[level](`[数据库] ${operation} - ${table}`, {
      category: LogCategory.DATABASE,
      operation,
      table,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录API请求日志
   * @param {string} method - HTTP方法
   * @param {string} path - 请求路径
   * @param {Object} details - 详细信息
   * @param {string} level - 日志级别
   */
  static api(method, path, details = {}, level = LogLevel.INFO) {
    logger[level](`[API] ${method} ${path}`, {
      category: LogCategory.API,
      method,
      path,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录业务操作日志
   * @param {string} action - 业务操作
   * @param {Object} details - 详细信息
   * @param {string} level - 日志级别
   */
  static business(action, details = {}, level = LogLevel.INFO) {
    logger[level](`[业务] ${action}`, {
      category: LogCategory.BUSINESS,
      action,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录安全事件日志
   * @param {string} event - 安全事件
   * @param {Object} details - 详细信息
   * @param {string} level - 日志级别（默认warn）
   */
  static security(event, details = {}, level = LogLevel.WARN) {
    logger[level](`[安全] ${event}`, {
      category: LogCategory.SECURITY,
      event,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录系统事件日志
   * @param {string} event - 系统事件
   * @param {Object} details - 详细信息
   * @param {string} level - 日志级别
   */
  static system(event, details = {}, level = LogLevel.INFO) {
    logger[level](`[系统] ${event}`, {
      category: LogCategory.SYSTEM,
      event,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录性能监控日志
   * @param {string} operation - 操作名称
   * @param {number} duration - 持续时间（毫秒）
   * @param {Object} details - 详细信息
   */
  static performance(operation, duration, details = {}) {
    const level = duration > 1000 ? LogLevel.WARN : LogLevel.DEBUG;
    logger[level](`[性能] ${operation} - ${duration}ms`, {
      category: LogCategory.PERFORMANCE,
      operation,
      duration,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录错误日志
   * @param {string} context - 错误上下文
   * @param {Error} error - 错误对象
   * @param {Object} details - 详细信息
   */
  static error(context, error, details = {}) {
    logger.error(`[错误] ${context}`, {
      context,
      error: error.message,
      stack: error.stack,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 创建操作日志记录器
   * @param {string} requestId - 请求ID
   * @returns {Object} 日志记录器对象
   */
  static createOperationLogger(requestId) {
    return {
      start: (operation) => {
        const startTime = Date.now();
        logger.info(`[${requestId}] 开始: ${operation}`);
        
        return {
          success: (details = {}) => {
            const duration = Date.now() - startTime;
            logger.info(`[${requestId}] 成功: ${operation}`, {
              requestId,
              operation,
              duration: `${duration}ms`,
              ...details
            });
          },
          
          error: (error, details = {}) => {
            const duration = Date.now() - startTime;
            logger.error(`[${requestId}] 失败: ${operation}`, {
              requestId,
              operation,
              error: error.message,
              stack: error.stack,
              duration: `${duration}ms`,
              ...details
            });
          }
        };
      }
    };
  }

  /**
   * 创建性能计时器
   * @param {string} label - 计时标签
   * @returns {Function} 停止计时函数
   */
  static startTimer(label) {
    const startTime = Date.now();
    
    return (details = {}) => {
      const duration = Date.now() - startTime;
      this.performance(label, duration, details);
      return duration;
    };
  }

  /**
   * 格式化错误信息
   * @param {Error} error - 错误对象
   * @returns {Object} 格式化后的错误信息
   */
  static formatError(error) {
    return {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 记录用户操作日志
   * @param {string} userId - 用户ID
   * @param {string} username - 用户名
   * @param {string} action - 操作名称
   * @param {Object} details - 详细信息
   */
  static userAction(userId, username, action, details = {}) {
    logger.info(`[用户操作] ${username} - ${action}`, {
      userId,
      username,
      action,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录请求日志
   * @param {Object} req - 请求对象
   * @param {Object} details - 详细信息
   */
  static request(req, details = {}) {
    logger.http(`请求: ${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user ? req.user.sub : '未认证',
      requestId: req.requestId,
      ...details,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录响应日志
   * @param {Object} req - 请求对象
   * @param {number} statusCode - 状态码
   * @param {number} duration - 持续时间
   * @param {Object} details - 详细信息
   */
  static response(req, statusCode, duration, details = {}) {
    const level = statusCode >= 400 ? LogLevel.WARN : LogLevel.HTTP;
    logger[level](`响应: ${req.method} ${req.path} - ${statusCode}`, {
      method: req.method,
      path: req.path,
      statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user ? req.user.sub : '未认证',
      requestId: req.requestId,
      ...details,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * 创建结构化日志中间件
 */
function createStructuredLogger(options = {}) {
  const {
    includeRequestBody = false,
    includeResponseBody = false,
    excludePaths = ['/health', '/health-page']
  } = options;

  return (req, res, next) => {
    // 跳过指定路径
    if (excludePaths.includes(req.path)) {
      return next();
    }

    const requestId = req.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    req.requestId = requestId;
    
    const startTime = Date.now();
    
    // 记录请求
    const requestLog = {
      requestId,
      method: req.method,
      path: req.path,
      query: req.query,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user ? req.user.sub : '未认证'
    };
    
    if (includeRequestBody && req.body) {
      requestLog.body = req.body;
    }
    
    logger.http(`[${requestId}] 请求开始`, requestLog);
    
    // 监听响应完成
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const level = res.statusCode >= 400 ? LogLevel.WARN : LogLevel.HTTP;
      
      const responseLog = {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
        userId: req.user ? req.user.sub : '未认证'
      };
      
      logger[level](`[${requestId}] 请求完成`, responseLog);
    });
    
    next();
  };
}

module.exports = {
  LogLevel,
  LogCategory,
  LogHelper,
  createStructuredLogger
};
