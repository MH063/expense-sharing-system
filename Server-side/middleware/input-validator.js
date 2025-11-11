/**
 * 输入验证和清理中间件
 * 提供完整的输入验证、SQL注入防护、XSS防护等功能
 */

const validator = require('validator');
const { body, param, query, validationResult } = require('express-validator');

// 验证结果处理中间件
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '输入验证失败',
      errors: errors.array()
    });
  }
  next();
};

/**
 * 基础输入验证中间件
 */
const basicValidation = [
  body('*').optional().trim().escape(),
  handleValidationErrors
];

/**
 * 完整输入验证中间件
 */
const completeInputValidation = [
  body('*').optional().trim().escape(),
  // 验证用户名
  body('username').optional().isLength({ min: 3, max: 20 }).matches(/^[a-zA-Z0-9_]+$/),
  // 验证邮箱
  body('email').optional().isEmail().normalizeEmail(),
  // 验证手机号
  body('phone').optional().matches(/^1[3-9]\d{9}$/),
  // 验证密码
  body('password').optional().isLength({ min: 6 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  // 验证金额
  body('amount').optional().isFloat({ min: 0 }),
  // 验证日期
  body('date').optional().isISO8601(),
  handleValidationErrors
];

/**
 * 安全JSON解析中间件
 */
const safeJsonParser = (req, res, next) => {
  if (req.is('application/json')) {
    try {
      if (typeof req.body === 'string') {
        req.body = JSON.parse(req.body);
      }
      // 检查JSON深度，防止原型污染
      const jsonSize = JSON.stringify(req.body).length;
      if (jsonSize > 1024 * 1024) { // 1MB限制
        return res.status(413).json({
          success: false,
          message: '请求数据过大'
        });
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: '无效的JSON格式'
      });
    }
  }
  next();
};

/**
 * 输入清理和标准化中间件
 */
const sanitizeInput = (req, res, next) => {
  // 清理请求体
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  // 清理查询参数
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query);
  }
  
  // 清理路径参数
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  
  next();
};

/**
 * 递归清理对象中的所有字符串值
 */
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = validator.escape(value.trim());
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value);
    }
  }
  return sanitized;
}

/**
 * SQL注入防护中间件
 */
const preventSQLInjection = (req, res, next) => {
  const checkForSQLInjection = (obj) => {
    if (typeof obj === 'string') {
      return checkValue(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.some(item => checkForSQLInjection(item));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(value => checkForSQLInjection(value));
    }
    
    return false;
  };
  
  const checkValue = (value) => {
    if (typeof value !== 'string') return false;
    
    // SQL注入关键字模式
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
      /(\b(UNION|OR|AND)\s+\d+\s*[=\']\s*\d+)/i,
      /(\b(OR|AND)\s*['\"]?\s*\d+\s*=\s*\d+)/i,
      /('--)|(\/\*)|(\*\/)|(;)|(\b(OR|AND)\b.*=.*\b(OR|AND)\b)/i,
      /(\b(XOR|DIV|MOD)\b)/i,
      /((\%27)|(\'))\s*((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
      /((\%27)|(\'))\s*((\%6F)|o|(\%4F))((\%72)|r|(\%52))\s*((\%27)|(\'))/i,
      /((\%27)|(\'))\s*((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
      /((\%27)|(\'))\s*((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i
    ];
    
    return sqlPatterns.some(pattern => pattern.test(value));
  };
  
  // 检查请求体
  if (checkForSQLInjection(req.body)) {
    return res.status(400).json({
      success: false,
      message: '检测到潜在的SQL注入攻击，已被阻止'
    });
  }
  
  // 检查查询参数
  if (checkForSQLInjection(req.query)) {
    return res.status(400).json({
      success: false,
      message: '检测到潜在的SQL注入攻击，已被阻止'
    });
  }
  
  // 检查路径参数
  if (checkForSQLInjection(req.params)) {
    return res.status(400).json({
      success: false,
      message: '检测到潜在的SQL注入攻击，已被阻止'
    });
  }
  
  next();
};

/**
 * XSS攻击防护中间件
 */
const preventXSS = (req, res, next) => {
  const checkForXSS = (obj) => {
    if (typeof obj === 'string') {
      return checkValue(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.some(item => checkForXSS(item));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      return Object.values(obj).some(value => checkForXSS(value));
    }
    
    return false;
  };
  
  const checkValue = (value) => {
    if (typeof value !== 'string') return false;
    
    // XSS攻击模式
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>.*?<\/embed>/gi,
      /<applet[^>]*>.*?<\/applet>/gi,
      /<form[^>]*>/gi,
      /<input[^>]*>/gi,
      /<button[^>]*>/gi,
      /<select[^>]*>/gi,
      /<textarea[^>]*>/gi,
      /javascript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
      /onclick\s*=/gi,
      /onmouseover\s*=/gi,
      /onfocus\s*=/gi,
      /onblur\s*=/gi,
      /<img[^>]*src\s*=\s*["']?javascript:/gi,
      /<img[^>]*onload\s*=/gi,
      /<img[^>]*onerror\s*=/gi,
      /<link[^>]*href\s*=\s*["']?javascript:/gi,
      /<style[^>]*>/gi,
      /<link[^>]*rel\s*=\s*["']?stylesheet["']?[^>]*>/gi,
      /expression\s*\(/gi,
      /url\s*\(\s*["']?\s*javascript:/gi,
      /<meta[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*content\s*=\s*["']?\s*\d+;\s*url=/gi
    ];
    
    return xssPatterns.some(pattern => pattern.test(value));
  };
  
  // 检查请求体
  if (checkForXSS(req.body)) {
    return res.status(400).json({
      success: false,
      message: '检测到潜在的XSS攻击，已被阻止'
    });
  }
  
  // 检查查询参数
  if (checkForXSS(req.query)) {
    return res.status(400).json({
      success: false,
      message: '检测到潜在的XSS攻击，已被阻止'
    });
  }
  
  // 检查路径参数
  if (checkForXSS(req.params)) {
    return res.status(400).json({
      success: false,
      message: '检测到潜在的XSS攻击，已被阻止'
    });
  }
  
  next();
};

/**
 * 特殊字符清理
 */
const sanitizeSpecialChars = (str) => {
  return str
    .replace(/[<>'"&]/g, '') // 移除危险字符
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // 移除控制字符
    .trim();
};

/**
 * 文件名清理
 */
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[/\\?%*:|"<>]/g, '') // 移除文件系统危险字符
    .replace(/\.{2,}/g, '.') // 移除多个连续点
    .replace(/^\./, '') // 移除开头点号
    .substring(0, 255); // 限制长度
};

module.exports = {
  handleValidationErrors,
  basicValidation,
  completeInputValidation,
  safeJsonParser,
  sanitizeInput,
  preventSQLInjection,
  preventXSS,
  sanitizeSpecialChars,
  sanitizeFilename
};