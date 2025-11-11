/**
 * 统一的中间件和工具集导出文件
 * 提供一站式导入,方便在路由和控制器中使用
 */

// ==================== 错误处理 ====================
const {
  AppError,
  globalErrorHandler,
  notFoundHandler,
  handleDatabaseError,
  handleAuthError,
  handleBusinessError,
  sanitizeRequestResponse
} = require('../middleware/global-error-handler');

// ==================== 响应处理 ====================
const {
  unifiedResponseMiddleware
} = require('../middleware/unified-response-handler');

// ==================== 验证中间件 ====================
const {
  handleValidationErrors,
  userValidationRules,
  loginValidationRules,
  userValidation,
  businessValidation,
  adminValidationRules
} = require('../middleware/validation-middleware');

// ==================== 验证工具 ====================
const {
  commonRules,
  validators,
  quickRules
} = require('../utils/validation-helpers');

// ==================== 日志工具 ====================
const {
  LogLevel,
  LogCategory,
  LogHelper,
  createStructuredLogger
} = require('../utils/log-helpers');

const {
  logger,
  httpLogger,
  dbLogger,
  businessLogger,
  securityLogger
} = require('../config/logger');

// ==================== 错误码 ====================
const ERROR_CODES = require('../constants/error-codes');

/**
 * 快速创建AppError的工厂函数
 */
const createError = {
  // 认证错误
  invalidToken: (details) => new AppError(
    ERROR_CODES.AUTH_INVALID_TOKEN,
    '无效的访问令牌',
    401,
    details
  ),
  
  expiredToken: (details) => new AppError(
    ERROR_CODES.AUTH_EXPIRED_TOKEN,
    '访问令牌已过期',
    401,
    details
  ),
  
  missingToken: (details) => new AppError(
    ERROR_CODES.AUTH_MISSING_TOKEN,
    '缺少访问令牌',
    401,
    details
  ),
  
  insufficientPermissions: (details) => new AppError(
    ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
    '权限不足',
    403,
    details
  ),
  
  userNotFound: (details) => new AppError(
    ERROR_CODES.AUTH_USER_NOT_FOUND,
    '用户不存在',
    404,
    details
  ),
  
  invalidCredentials: (details) => new AppError(
    ERROR_CODES.AUTH_INVALID_CREDENTIALS,
    '用户名或密码错误',
    401,
    details
  ),
  
  // 业务错误
  validationError: (message, details) => new AppError(
    ERROR_CODES.BUSINESS_VALIDATION_ERROR,
    message || '业务验证失败',
    400,
    details
  ),
  
  notFound: (message, details) => new AppError(
    ERROR_CODES.BUSINESS_NOT_FOUND,
    message || '请求的资源不存在',
    404,
    details
  ),
  
  conflict: (message, details) => new AppError(
    ERROR_CODES.BUSINESS_CONFLICT,
    message || '资源状态冲突',
    409,
    details
  ),
  
  forbidden: (message, details) => new AppError(
    ERROR_CODES.BUSINESS_FORBIDDEN,
    message || '禁止访问',
    403,
    details
  ),
  
  // 数据库错误
  databaseError: (message, details) => new AppError(
    ERROR_CODES.DATABASE_ERROR,
    message || '数据库操作失败',
    500,
    details
  ),
  
  duplicate: (message, details) => new AppError(
    ERROR_CODES.DATABASE_DUPLICATE,
    message || '数据已存在',
    409,
    details
  ),
  
  // 系统错误
  internalError: (message, details) => new AppError(
    ERROR_CODES.SYSTEM_INTERNAL_ERROR,
    message || '系统内部错误',
    500,
    details
  ),
  
  serviceUnavailable: (message, details) => new AppError(
    ERROR_CODES.SYSTEM_SERVICE_UNAVAILABLE,
    message || '服务暂时不可用',
    503,
    details
  ),
  
  rateLimitExceeded: (message, details) => new AppError(
    ERROR_CODES.SYSTEM_RATE_LIMIT_EXCEEDED,
    message || '请求过于频繁',
    429,
    details
  )
};

/**
 * 异步处理器包装函数
 * 自动捕获异步函数中的错误并传递给错误处理中间件
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * 条件验证中间件
 * 根据条件决定是否执行验证
 */
const conditionalValidation = (condition, validationRules) => {
  return (req, res, next) => {
    if (condition(req)) {
      // 执行验证
      const middleware = [...validationRules, handleValidationErrors];
      let index = 0;
      
      const runNext = (err) => {
        if (err) return next(err);
        if (index >= middleware.length) return next();
        
        const handler = middleware[index++];
        handler(req, res, runNext);
      };
      
      runNext();
    } else {
      next();
    }
  };
};

/**
 * 组合多个中间件
 */
const compose = (...middlewares) => {
  return (req, res, next) => {
    let index = 0;
    
    const runNext = (err) => {
      if (err) return next(err);
      if (index >= middlewares.length) return next();
      
      const middleware = middlewares[index++];
      middleware(req, res, runNext);
    };
    
    runNext();
  };
};

// ==================== 导出 ====================
module.exports = {
  // 错误处理
  AppError,
  globalErrorHandler,
  notFoundHandler,
  handleDatabaseError,
  handleAuthError,
  handleBusinessError,
  sanitizeRequestResponse,
  createError,
  
  // 响应处理
  unifiedResponseMiddleware,
  
  // 验证
  handleValidationErrors,
  userValidationRules,
  loginValidationRules,
  userValidation,
  businessValidation,
  adminValidationRules,
  commonRules,
  validators,
  quickRules,
  
  // 日志
  LogLevel,
  LogCategory,
  LogHelper,
  createStructuredLogger,
  logger,
  httpLogger,
  dbLogger,
  businessLogger,
  securityLogger,
  
  // 错误码
  ERROR_CODES,
  
  // 工具函数
  asyncHandler,
  conditionalValidation,
  compose
};
