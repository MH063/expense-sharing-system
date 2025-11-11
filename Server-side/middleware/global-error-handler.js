const { logger } = require('../config/logger');
const ERROR_CODES = require('../constants/error-codes');

/**
 * 全局异常处理中间件
 * 统一处理应用中的所有异常
 */

// 错误类型映射
const ERROR_TYPE_MAP = {
  // 数据库相关错误
  '23505': { code: ERROR_CODES.DATABASE_DUPLICATE, status: 409, message: '数据已存在' },
  '23503': { code: ERROR_CODES.DATABASE_FOREIGN_KEY, status: 400, message: '外键约束违反' },
  '23502': { code: ERROR_CODES.DATABASE_NOT_NULL, status: 400, message: '字段不能为空' },
  '23514': { code: ERROR_CODES.DATABASE_CHECK_VIOLATION, status: 400, message: '数据检查约束违反' },
  
  // 认证相关错误
  'AUTH_INVALID_TOKEN': { code: ERROR_CODES.AUTH_INVALID_TOKEN, status: 401, message: '无效的访问令牌' },
  'AUTH_EXPIRED_TOKEN': { code: ERROR_CODES.AUTH_EXPIRED_TOKEN, status: 401, message: '访问令牌已过期' },
  'AUTH_MISSING_TOKEN': { code: ERROR_CODES.AUTH_MISSING_TOKEN, status: 401, message: '缺少访问令牌' },
  'AUTH_INSUFFICIENT_PERMISSIONS': { code: ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS, status: 403, message: '权限不足' },
  'AUTH_USER_NOT_FOUND': { code: ERROR_CODES.AUTH_USER_NOT_FOUND, status: 404, message: '用户不存在' },
  
  // 业务相关错误
  'BUSINESS_VALIDATION_ERROR': { code: ERROR_CODES.BUSINESS_VALIDATION_ERROR, status: 400, message: '业务验证失败' },
  'BUSINESS_NOT_FOUND': { code: ERROR_CODES.BUSINESS_NOT_FOUND, status: 404, message: '请求的资源不存在' },
  'BUSINESS_CONFLICT': { code: ERROR_CODES.BUSINESS_CONFLICT, status: 409, message: '资源状态冲突' },
  
  // 系统相关错误
  'SYSTEM_INTERNAL_ERROR': { code: ERROR_CODES.SYSTEM_INTERNAL_ERROR, status: 500, message: '系统内部错误' },
  'SYSTEM_SERVICE_UNAVAILABLE': { code: ERROR_CODES.SYSTEM_SERVICE_UNAVAILABLE, status: 503, message: '服务暂时不可用' },
  'SYSTEM_RATE_LIMIT_EXCEEDED': { code: ERROR_CODES.SYSTEM_RATE_LIMIT_EXCEEDED, status: 429, message: '请求过于频繁' }
};

/**
 * 自定义应用错误类
 */
class AppError extends Error {
  constructor(code, message, status = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
    this.timestamp = new Date().toISOString();
    
    // 保持堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }
}

/**
 * 数据库错误处理
 * @param {Object} error - 数据库错误对象
 * @returns {AppError} 应用错误对象
 */
function handleDatabaseError(error) {
  const dbError = ERROR_TYPE_MAP[error.code];
  if (dbError) {
    return new AppError(dbError.code, dbError.message, dbError.status, {
      originalError: error.message,
      table: error.table,
      column: error.column,
      constraint: error.constraint
    });
  }
  
  // 默认数据库错误
  return new AppError(
    ERROR_CODES.DATABASE_ERROR,
    '数据库操作失败',
    500,
    { originalError: error.message }
  );
}

/**
 * 认证错误处理
 * @param {Object} error - 认证错误对象
 * @returns {AppError} 应用错误对象
 */
function handleAuthError(error) {
  // 如果已经是AppError，直接返回
  if (error instanceof AppError) {
    return error;
  }
  
  // 根据错误消息匹配错误类型
  if (error.message.includes('令牌已过期')) {
    return new AppError(
      ERROR_CODES.AUTH_EXPIRED_TOKEN,
      '访问令牌已过期',
      401
    );
  }
  
  if (error.message.includes('令牌无效')) {
    return new AppError(
      ERROR_CODES.AUTH_INVALID_TOKEN,
      '无效的访问令牌',
      401
    );
  }
  
  if (error.message.includes('权限不足')) {
    return new AppError(
      ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
      '权限不足',
      403
    );
  }
  
  // 默认认证错误
  return new AppError(
    ERROR_CODES.AUTH_ERROR,
    error.message || '认证失败',
    401
  );
}

/**
 * 业务错误处理
 * @param {Object} error - 业务错误对象
 * @returns {AppError} 应用错误对象
 */
function handleBusinessError(error) {
  // 如果已经是AppError，直接返回
  if (error instanceof AppError) {
    return error;
  }
  
  // 根据错误消息匹配错误类型
  if (error.message.includes('不存在')) {
    return new AppError(
      ERROR_CODES.BUSINESS_NOT_FOUND,
      error.message,
      404
    );
  }
  
  if (error.message.includes('已存在') || error.message.includes('重复')) {
    return new AppError(
      ERROR_CODES.BUSINESS_CONFLICT,
      error.message,
      409
    );
  }
  
  if (error.message.includes('验证') || error.message.includes('参数')) {
    return new AppError(
      ERROR_CODES.BUSINESS_VALIDATION_ERROR,
      error.message,
      400
    );
  }
  
  // 默认业务错误
  return new AppError(
    ERROR_CODES.BUSINESS_ERROR,
    error.message || '业务操作失败',
    400
  );
}

/**
 * 全局错误处理中间件
 * @param {Object} error - 错误对象
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一步函数
 */
function globalErrorHandler(error, req, res, next) {
  // 生成请求ID用于追踪
  const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // 记录错误日志
  logger.error('全局错误处理', {
    requestId,
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user ? req.user.id : '未认证'
  });
  
  // 处理不同类型的错误
  let appError;
  
  // 数据库错误
  if (error.code && error.code.startsWith('23')) {
    appError = handleDatabaseError(error);
  }
  // 认证错误
  else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || 
           error.message.includes('令牌') || error.message.includes('认证') || 
           error.message.includes('权限')) {
    appError = handleAuthError(error);
  }
  // 业务错误
  else if (error instanceof AppError) {
    appError = error;
  }
  // 其他错误
  else {
    appError = handleBusinessError(error);
  }
  
  // 发送错误响应
  res.status(appError.status).json({
    success: false,
    code: appError.code,
    message: appError.message,
    details: appError.details,
    timestamp: appError.timestamp,
    requestId
  });
}

/**
 * 404错误处理中间件
 * @param {Object} req - 请求对象
 * @param {Object} res - 响应对象
 * @param {Function} next - 下一步函数
 */
function notFoundHandler(req, res, next) {
  const error = new AppError(
    ERROR_CODES.ROUTE_NOT_FOUND,
    `无法找到路由: ${req.originalUrl}`,
    404
  );
  
  next(error);
}

/**
 * 请求日志脱敏中间件
 * 在所有其他中间件之前执行，对敏感信息进行脱敏
 */
function sanitizeRequestResponse(req, res, next) {
  // 暂存原始send和json方法
  const originalSend = res.send;
  const originalJson = res.json;
  
  // 重写send方法
  res.send = function(data) {
    res.send = originalSend;
    return res.send(data);
  };
  
  // 重写json方法
  res.json = function(data) {
    res.json = originalJson;
    return res.json(data);
  };
  
  next();
}

module.exports = {
  AppError,
  globalErrorHandler,
  notFoundHandler,
  handleDatabaseError,
  handleAuthError,
  handleBusinessError,
  sanitizeRequestResponse
};