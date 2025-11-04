/**
 * 响应状态码中间件
 * 确保后台接口返回的请求成功状态码必须是200
 */

const { logger } = require('../config/logger');

/**
 * 标准化响应格式中间件
 * 确保所有API响应都遵循统一的格式
 */
const standardResponseMiddleware = (req, res, next) => {
  // 保存原始的res.json方法
  const originalJson = res.json;
  
  // 重写res.json方法
  res.json = function(data) {
    // 如果响应已经发送，则不处理
    if (res.headersSent) {
      return originalJson.call(this, data);
    }
    
    // 如果状态码不是200且响应是成功的，则将状态码设置为200
    if (res.statusCode >= 200 && res.statusCode < 300 && res.statusCode !== 200) {
      logger.debug(`将状态码从 ${res.statusCode} 更改为 200`, {
        url: req.url,
        method: req.method
      });
      res.status(200);
    }
    
    // 确保响应数据格式正确
    let responseData = data;
    
    // 如果响应数据不是标准格式，则包装成标准格式
    if (data && typeof data === 'object' && !data.hasOwnProperty('success')) {
      responseData = {
        success: true,
        data: data
      };
    }
    
    // 记录响应数据（仅在开发环境）
    if (process.env.NODE_ENV === 'development') {
      logger.debug('API响应', {
        url: req.url,
        method: req.method,
        statusCode: res.statusCode,
        responseData: responseData
      });
    }
    
    // 调用原始的json方法
    return originalJson.call(this, responseData);
  };
  
  next();
};

/**
 * 成功响应辅助函数
 * @param {Object} res - Express响应对象
 * @param {Object} data - 响应数据
 * @param {string} message - 响应消息
 */
const sendSuccess = (res, data = null, message = '操作成功') => {
  const response = {
    success: true,
    message: message
  };
  
  if (data !== null) {
    response.data = data;
  }
  
  // 确保状态码为200
  res.status(200).json(response);
};

/**
 * 错误响应辅助函数
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 * @param {number} statusCode - HTTP状态码
 * @param {Object} error - 错误详情
 */
const sendError = (res, message = '操作失败', statusCode = 400, error = null) => {
  const response = {
    success: false,
    message: message
  };
  
  if (error) {
    response.error = error;
  }
  
  // 记录错误
  logger.error('API错误响应', {
    message: message,
    statusCode: statusCode,
    error: error
  });
  
  res.status(statusCode).json(response);
};

/**
 * 分页响应辅助函数
 * @param {Object} res - Express响应对象
 * @param {Array} data - 数据数组
 * @param {number} total - 总记录数
 * @param {number} page - 当前页码
 * @param {number} limit - 每页记录数
 * @param {string} message - 响应消息
 */
const sendPaginatedResponse = (res, data, total, page, limit, message = '获取数据成功') => {
  const totalPages = Math.ceil(total / limit);
  
  const response = {
    success: true,
    message: message,
    data: data,
    pagination: {
      total: total,
      page: page,
      limit: limit,
      totalPages: totalPages
    }
  };
  
  // 设置分页相关头部
  res.setHeader('X-Total-Count', total);
  res.setHeader('X-Page-Count', totalPages);
  res.setHeader('X-Current-Page', page);
  
  // 确保状态码为200
  res.status(200).json(response);
};

module.exports = {
  standardResponseMiddleware,
  sendSuccess,
  sendError,
  sendPaginatedResponse
};