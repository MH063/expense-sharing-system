/**
 * 统一响应处理中间件
 * 整合现有响应处理中间件的优点，提供统一的API响应格式
 */

const { logger } = require('../config/logger');
const { getHttpStatus } = require('../constants/error-codes');

/**
 * 统一响应格式中间件
 * 为响应对象添加 success、error、payload 等辅助方法
 */
const standardResponseMiddleware = (req, res, next) => {
  // 生成请求ID用于日志追踪
  const requestId = req.id || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;

  /**
   * 成功响应方法
   * @param {number} statusCode - HTTP状态码，默认200
   * @param {string} message - 响应消息
   * @param {Object} data - 响应数据
   */
  res.success = function(statusCode = 200, message = '操作成功', data = null) {
    // 处理参数顺序，支持 res.success(data, message) 的调用方式
    if (typeof statusCode === 'object') {
      data = statusCode;
      message = '操作成功';
      statusCode = 200;
    } else if (typeof message === 'object') {
      data = message;
      message = '操作成功';
    }

    const response = {
      success: true,
      message: message,
      requestId: requestId,
      timestamp: new Date().toISOString()
    };
    
    if (data !== null) {
      response.data = data;
    }
    
    // 记录响应日志（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`[${requestId}] API成功响应`, {
        requestId,
        url: req.url,
        method: req.method,
        statusCode: statusCode,
        response: response
      });
    }
    
    return res.status(statusCode).json(response);
  };
  
  /**
   * 错误响应方法
   * @param {number|string} statusCodeOrCode - HTTP状态码或错误代码
   * @param {string} message - 错误消息
   * @param {Object} error - 错误详情
   */
  res.error = function(statusCodeOrCode = 400, message = '操作失败', error = null) {
    let statusCode = statusCodeOrCode;
    let errorCode = null;
    
    // 处理参数顺序，支持 res.error(errorCode, message, error) 的调用方式
    if (typeof statusCodeOrCode === 'string') {
      errorCode = statusCodeOrCode;
      statusCode = getHttpStatus(errorCode);
    }
    
    // 处理参数顺序，支持 res.error(message, error) 的调用方式
    if (typeof message === 'object' && error === null) {
      error = message;
      message = '操作失败';
    }

    const response = {
      success: false,
      message: message,
      requestId: requestId,
      timestamp: new Date().toISOString()
    };
    
    if (error) {
      response.error = error;
    }
    
    if (errorCode) {
      if (!response.error) {
        response.error = {};
      }
      response.error.code = errorCode;
    }
    
    // 记录错误日志
    logger.error(`[${requestId}] API错误响应`, {
      requestId,
      url: req.url,
      method: req.method,
      statusCode: statusCode,
      message: message,
      error: error,
      errorCode: errorCode
    });
    
    return res.status(statusCode).json(response);
  };
  
  /**
   * 载荷响应方法（仅返回数据，无消息）
   * @param {Object} data - 响应数据
   * @param {number} statusCode - HTTP状态码，默认200
   */
  res.payload = function(data, statusCode = 200) {
    const response = {
      success: true,
      data: data,
      requestId: requestId,
      timestamp: new Date().toISOString()
    };
    
    // 记录响应日志（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`[${requestId}] API载荷响应`, {
        requestId,
        url: req.url,
        method: req.method,
        statusCode: statusCode,
        response: response
      });
    }
    
    return res.status(statusCode).json(response);
  };
  
  /**
   * 分页响应方法
   * @param {Array} items - 数据项数组
   * @param {Object} pagination - 分页信息
   * @param {string} message - 响应消息
   * @param {number} statusCode - HTTP状态码，默认200
   */
  res.paginate = function(items, pagination, message = '获取数据成功', statusCode = 200) {
    const response = {
      success: true,
      message: message,
      data: {
        items: items,
        pagination: pagination
      },
      requestId: requestId,
      timestamp: new Date().toISOString()
    };
    
    // 设置分页相关头部
    if (pagination && pagination.total) {
      res.setHeader('X-Total-Count', pagination.total);
    }
    if (pagination && pagination.page) {
      res.setHeader('X-Current-Page', pagination.page);
    }
    if (pagination && pagination.pageSize) {
      res.setHeader('X-Page-Size', pagination.pageSize);
    }
    if (pagination && pagination.totalPages) {
      res.setHeader('X-Total-Pages', pagination.totalPages);
    }
    
    // 记录响应日志（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`[${requestId}] API分页响应`, {
        requestId,
        url: req.url,
        method: req.method,
        statusCode: statusCode,
        response: response
      });
    }
    
    return res.status(statusCode).json(response);
  };
  
  /**
   * 客户端错误响应方法
   * @param {string} message - 错误消息
   * @param {Object} error - 错误详情
   * @param {number} statusCode - HTTP状态码，默认400
   */
  res.clientError = function(message = '客户端请求错误', error = null, statusCode = 400) {
    const response = {
      success: false,
      message: message,
      requestId: requestId,
      timestamp: new Date().toISOString()
    };
    
    if (error) {
      response.error = error;
    }
    
    // 记录错误日志
    logger.error(`[${requestId}] API客户端错误`, {
      requestId,
      url: req.url,
      method: req.method,
      statusCode: statusCode,
      message: message,
      error: error
    });
    
    return res.status(statusCode).json(response);
  };
  
  /**
   * 冲突错误响应方法
   * @param {string} message - 错误消息
   * @param {Object} error - 错误详情
   * @param {number} statusCode - HTTP状态码，默认409
   */
  res.conflict = function(message = '资源冲突', error = null, statusCode = 409) {
    const response = {
      success: false,
      message: message,
      requestId: requestId,
      timestamp: new Date().toISOString()
    };
    
    if (error) {
      response.error = error;
    }
    
    // 记录错误日志
    logger.error(`[${requestId}] API冲突错误`, {
      requestId,
      url: req.url,
      method: req.method,
      statusCode: statusCode,
      message: message,
      error: error
    });
    
    return res.status(statusCode).json(response);
  };
  
  /**
   * 未授权错误响应方法
   * @param {string} message - 错误消息
   * @param {Object} error - 错误详情
   * @param {number} statusCode - HTTP状态码，默认401
   */
  res.unauthorized = function(message = '未授权访问', error = null, statusCode = 401) {
    const response = {
      success: false,
      message: message,
      requestId: requestId,
      timestamp: new Date().toISOString()
    };
    
    if (error) {
      response.error = error;
    }
    
    // 记录错误日志
    logger.error(`[${requestId}] API未授权错误`, {
      requestId,
      url: req.url,
      method: req.method,
      statusCode: statusCode,
      message: message,
      error: error
    });
    
    return res.status(statusCode).json(response);
  };
  
  /**
   * 禁止访问错误响应方法
   * @param {string} message - 错误消息
   * @param {Object} error - 错误详情
   * @param {number} statusCode - HTTP状态码，默认403
   */
  res.forbidden = function(message = '权限不足', error = null, statusCode = 403) {
    const response = {
      success: false,
      message: message,
      requestId: requestId,
      timestamp: new Date().toISOString()
    };
    
    if (error) {
      response.error = error;
    }
    
    // 记录错误日志
    logger.error(`[${requestId}] API禁止访问错误`, {
      requestId,
      url: req.url,
      method: req.method,
      statusCode: statusCode,
      message: message,
      error: error
    });
    
    return res.status(statusCode).json(response);
  };
  
  /**
   * 资源未找到错误响应方法
   * @param {string} message - 错误消息
   * @param {Object} error - 错误详情
   * @param {number} statusCode - HTTP状态码，默认404
   */
  res.notFound = function(message = '资源未找到', error = null, statusCode = 404) {
    const response = {
      success: false,
      message: message,
      requestId: requestId,
      timestamp: new Date().toISOString()
    };
    
    if (error) {
      response.error = error;
    }
    
    // 记录错误日志
    logger.error(`[${requestId}] API资源未找到错误`, {
      requestId,
      url: req.url,
      method: req.method,
      statusCode: statusCode,
      message: message,
      error: error
    });
    
    return res.status(statusCode).json(response);
  };

  /**
   * 验证错误响应方法
   * @param {string} message - 错误消息
   * @param {Object} details - 验证错误详情
   * @param {number} statusCode - HTTP状态码，默认400
   */
  res.validationError = function(message = '请求参数验证失败', details = null, statusCode = 400) {
    const response = {
      success: false,
      message: message,
      requestId: requestId,
      timestamp: new Date().toISOString()
    };
    
    if (details) {
      response.error = {
        code: 'VALIDATION_FAILED',
        details: details
      };
    }
    
    // 记录错误日志
    logger.error(`[${requestId}] API验证错误`, {
      requestId,
      url: req.url,
      method: req.method,
      statusCode: statusCode,
      message: message,
      details: details
    });
    
    return res.status(statusCode).json(response);
  };
  
  next();
};

module.exports = {
  standardResponseMiddleware
};