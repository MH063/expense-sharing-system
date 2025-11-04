/**
 * Token处理中间件
 * 特殊处理，防止token过长导致AI对话中断影响效果
 */

const { logger } = require('./logger');

/**
 * Token长度限制配置
 */
const tokenConfig = {
  // 最大token长度（字符数）
  maxTokenLength: 8000,
  
  // 最大请求体大小（字节）
  maxRequestBodySize: 10 * 1024 * 1024, // 10MB
  
  // 需要检查token长度的路径
  protectedPaths: [
    '/api/ai/chat',
    '/api/ai/analyze',
    '/api/ai/generate',
    '/api/ai/process'
  ],
  
  // 需要检查token长度的HTTP方法
  protectedMethods: ['POST', 'PUT', 'PATCH']
};

/**
 * 检查请求体大小
 */
const checkRequestBodySize = (req, res, next) => {
  const contentLength = req.get('Content-Length');
  
  if (contentLength && parseInt(contentLength) > tokenConfig.maxRequestBodySize) {
    logger.warn('请求体过大', {
      url: req.url,
      method: req.method,
      contentLength: contentLength,
      ip: req.ip
    });
    
    return res.status(413).json({
      success: false,
      error: '请求体过大',
      code: 'REQUEST_ENTITY_TOO_LARGE'
    });
  }
  
  next();
};

/**
 * 检查token长度
 */
const checkTokenLength = (req, res, next) => {
  // 检查是否是需要保护的路径
  const isProtectedPath = tokenConfig.protectedPaths.some(path => 
    req.path.startsWith(path)
  );
  
  // 检查是否是需要保护的HTTP方法
  const isProtectedMethod = tokenConfig.protectedMethods.includes(req.method);
  
  // 如果不是需要保护的路径或方法，则跳过检查
  if (!isProtectedPath || !isProtectedMethod) {
    return next();
  }
  
  // 检查请求体中的token长度
  try {
    const requestBody = req.body;
    
    // 检查各种可能的token字段
    const tokenFields = [
      'token',
      'prompt',
      'message',
      'text',
      'content',
      'query',
      'input',
      'data'
    ];
    
    let hasLongToken = false;
    let longTokenField = '';
    let tokenLength = 0;
    
    for (const field of tokenFields) {
      if (requestBody && requestBody[field] && typeof requestBody[field] === 'string') {
        const fieldLength = requestBody[field].length;
        if (fieldLength > tokenConfig.maxTokenLength) {
          hasLongToken = true;
          longTokenField = field;
          tokenLength = fieldLength;
          break;
        }
      }
    }
    
    // 如果发现过长的token，则截断它
    if (hasLongToken) {
      logger.warn('检测到过长的token，进行截断', {
        url: req.url,
        method: req.method,
        field: longTokenField,
        originalLength: tokenLength,
        truncatedLength: tokenConfig.maxTokenLength,
        ip: req.ip
      });
      
      // 截断过长的token
      requestBody[longTokenField] = requestBody[longTokenField].substring(0, tokenConfig.maxTokenLength);
      
      // 添加截断标记
      requestBody._tokenTruncated = true;
      requestBody._originalTokenLength = tokenLength;
      requestBody._truncatedTokenLength = tokenConfig.maxTokenLength;
    }
    
    next();
  } catch (error) {
    logger.error('检查token长度时发生错误', {
      url: req.url,
      method: req.method,
      error: error.message,
      ip: req.ip
    });
    
    // 发生错误时，继续处理请求
    next();
  }
};

/**
 * Token处理中间件
 * 结合请求体大小检查和token长度检查
 */
const tokenHandlerMiddleware = [
  checkRequestBodySize,
  checkTokenLength
];

/**
 * AI接口专用token处理中间件
 * 专门用于AI相关接口的token处理
 */
const aiTokenHandlerMiddleware = (req, res, next) => {
  // 检查是否是AI相关接口
  const isAiPath = req.path.startsWith('/api/ai/');
  
  if (!isAiPath) {
    return next();
  }
  
  // 对AI接口进行更严格的token检查
  try {
    const requestBody = req.body;
    
    // 检查prompt字段
    if (requestBody && requestBody.prompt && typeof requestBody.prompt === 'string') {
      const promptLength = requestBody.prompt.length;
      
      if (promptLength > tokenConfig.maxTokenLength) {
        logger.warn('AI接口prompt过长，进行截断', {
          url: req.url,
          method: req.method,
          originalLength: promptLength,
          truncatedLength: tokenConfig.maxTokenLength,
          ip: req.ip
        });
        
        // 截断prompt
        requestBody.prompt = requestBody.prompt.substring(0, tokenConfig.maxTokenLength);
        
        // 添加截断标记
        requestBody._promptTruncated = true;
        requestBody._originalPromptLength = promptLength;
        requestBody._truncatedPromptLength = tokenConfig.maxTokenLength;
      }
    }
    
    next();
  } catch (error) {
    logger.error('AI接口token处理时发生错误', {
      url: req.url,
      method: req.method,
      error: error.message,
      ip: req.ip
    });
    
    // 发生错误时，继续处理请求
    next();
  }
};

module.exports = {
  tokenHandlerMiddleware,
  aiTokenHandlerMiddleware,
  checkRequestBodySize,
  checkTokenLength,
  tokenConfig
};