/**
 * 新响应格式中间件
 * 提供统一的响应格式，支持 res.success 和 res.error 风格
 */

const { logger } = require('../config/logger');

/**
 * 新响应格式中间件
 * 为响应对象添加 success、error、payload 等辅助方法
 */
const newResponseMiddleware = (req, res, next) => {
  /**
   * 成功响应方法
   * @param {number} statusCode - HTTP状态码，默认200
   * @param {string} message - 响应消息
   * @param {Object} data - 响应数据
   */
  res.success = function(statusCode = 200, message = '操作成功', data = null) {
    const response = {
      success: true,
      message: message
    };
    
    if (data !== null) {
      response.data = data;
    }
    
    // 记录响应日志（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      logger.debug('API成功响应', {
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
   * @param {number} statusCode - HTTP状态码，默认400
   * @param {string} message - 错误消息
   * @param {Object} error - 错误详情
   */
  res.error = function(statusCode = 400, message = '操作失败', error = null) {
    const response = {
      success: false,
      message: message
    };
    
    if (error) {
      response.error = error;
    }
    
    // 记录错误日志
    logger.error('API错误响应', {
      url: req.url,
      method: req.method,
      statusCode: statusCode,
      message: message,
      error: error
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
      data: data
    };
    
    // 记录响应日志（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      logger.debug('API载荷响应', {
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
      }
    };
    
    // 设置分页相关头部
    if (pagination.total) {
      res.setHeader('X-Total-Count', pagination.total);
    }
    if (pagination.page) {
      res.setHeader('X-Current-Page', pagination.page);
    }
    if (pagination.pageSize) {
      res.setHeader('X-Page-Size', pagination.pageSize);
    }
    if (pagination.totalPages) {
      res.setHeader('X-Total-Pages', pagination.totalPages);
    }
    
    // 记录响应日志（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      logger.debug('API分页响应', {
        url: req.url,
        method: req.method,
        statusCode: statusCode,
        response: response
      });
    }
    
    return res.status(statusCode).json(response);
  };
  
  next();
};

module.exports = {
  newResponseMiddleware
};