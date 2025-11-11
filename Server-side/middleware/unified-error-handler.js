/**
 * 统一错误处理中间件
 * 整合现有错误处理逻辑，提供统一的错误处理机制
 */

const { logger } = require('../config/logger');

/**
 * 全局错误处理中间件
 * 捕获所有未处理的错误，记录日志并返回适当的响应
 */
function errorHandler(err, req, res, next) {
  // 生成请求ID用于日志追踪
  const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // 记录错误日志
  logger.error(`[${requestId}] 全局错误处理:`, {
    requestId,
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user ? req.user.id : '未认证',
    timestamp: new Date().toISOString()
  });

  // 默认错误响应
  let statusCode = 500;
  let message = '服务器内部错误';
  let errorDetails = null;

  // 根据错误类型设置不同的响应
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = '请求参数验证失败';
    errorDetails = err.details;
  } else if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = '未授权访问';
  } else if (err.name === 'ForbiddenError') {
    statusCode = 403;
    message = '权限不足';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = '资源未找到';
  } else if (err.name === 'ConflictError') {
    statusCode = 409;
    message = '资源冲突';
  } else if (err.name === 'TooManyRequestsError') {
    statusCode = 429;
    message = '请求过于频繁';
  } else if (err.code === '23505') { // PostgreSQL 唯一约束违反
    statusCode = 409;
    message = '数据已存在，违反唯一性约束';
  } else if (err.code === '23503') { // PostgreSQL 外键约束违反
    statusCode = 400;
    message = '引用的数据不存在';
  } else if (err.code === '23502') { // PostgreSQL 非空约束违反
    statusCode = 400;
    message = '必填字段不能为空';
  } else if (err.code === '23514') { // PostgreSQL 检查约束违反
    statusCode = 400;
    message = '数据不符合约束条件';
  }

  // 开发环境下返回详细错误信息
  if (process.env.NODE_ENV === 'development') {
    errorDetails = {
      message: err.message,
      stack: err.stack,
      ...errorDetails
    };
  }

  // 使用统一的响应格式
  return res.status(statusCode).json({
    success: false,
    message: message,
    error: errorDetails,
    requestId: requestId,
    timestamp: new Date().toISOString()
  });
}

/**
 * 404 错误处理中间件
 * 处理未找到的路由
 */
function notFoundHandler(req, res) {
  // 生成请求ID用于日志追踪
  const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  logger.warn(`[${requestId}] 未找到的路由:`, {
    requestId,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // 检查是否是静态资源请求
  const isStaticResource = req.url.includes('/assets/') || 
                          req.url.includes('/static/') || 
                          req.url.endsWith('.js') || 
                          req.url.endsWith('.css') || 
                          req.url.endsWith('.png') || 
                          req.url.endsWith('.jpg') || 
                          req.url.endsWith('.gif') || 
                          req.url.endsWith('.ico') || 
                          req.url.endsWith('.svg');

  if (isStaticResource) {
    // 对于静态资源请求，返回空内容而不是JSON，避免浏览器控制台错误
    return res.status(404).send('');
  } else {
    // 使用统一的响应格式
    return res.status(404).json({
      success: false,
      message: '请求的资源不存在',
      requestId: requestId,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * 异步错误捕获包装器
 * 用于包装异步路由处理函数，自动捕获Promise rejection
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 创建自定义错误类
 */
class AppError extends Error {
  constructor(message, statusCode, name = null) {
    super(message);
    this.statusCode = statusCode;
    this.name = name || this.constructor.name;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, 'ValidationError');
    this.details = details;
  }
}

class UnauthorizedError extends AppError {
  constructor(message = '未授权访问') {
    super(message, 401, 'UnauthorizedError');
  }
}

class ForbiddenError extends AppError {
  constructor(message = '权限不足') {
    super(message, 403, 'ForbiddenError');
  }
}

class NotFoundError extends AppError {
  constructor(message = '资源未找到') {
    super(message, 404, 'NotFoundError');
  }
}

class ConflictError extends AppError {
  constructor(message = '资源冲突') {
    super(message, 409, 'ConflictError');
  }
}

class TooManyRequestsError extends AppError {
  constructor(message = '请求过于频繁') {
    super(message, 429, 'TooManyRequestsError');
  }
}

class DatabaseError extends AppError {
  constructor(message = '数据库操作失败', originalError = null) {
    super(message, 500, 'DatabaseError');
    this.originalError = originalError;
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
  DatabaseError
};