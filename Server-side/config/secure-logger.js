/**
 * 增强的日志脱敏模块
 * 防止敏感信息在日志中泄露
 */

const { logger } = require('./logger');
const crypto = require('crypto');

/**
 * 敏感字段配置
 */
const SENSITIVE_FIELDS = [
  // 用户相关敏感字段
  'password', 'password_hash', 'password_confirmation', 'old_password', 'new_password',
  'token', 'access_token', 'refresh_token', 'jwt', 'authorization',
  'secret', 'api_key', 'api_secret', 'private_key', 'public_key',
  'ssn', 'social_security_number', 'tax_id', 'national_id',
  'credit_card', 'card_number', 'cvv', 'expiry',
  'bank_account', 'routing_number', 'iban', 'swift',
  'email', 'phone', 'mobile', 'address',
  // 数据库相关敏感字段
  'connection_string', 'database_url', 'db_password',
  // 系统相关敏感字段
  'private_key', 'secret_key', 'encryption_key'
];

/**
 * 敏感信息正则表达式
 */
const SENSITIVE_PATTERNS = [
  // JWT Token
  /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/gi,
  // Bearer Token
  /Bearer\s+[a-zA-Z0-9\-._~+\/]+=*/gi,
  // API Key (通常以特定前缀开头)
  /(?:api[_-]?key|apikey|secret[_-]?key|secretkey)\s*[:=]\s*['\"]?[a-zA-Z0-9\-._~+\/]+=*['\"]?/gi,
  // 密码字段
  /password\s*[:=]\s*['\"]?[^\s'"]{8,}['\"]?/gi,
  // 邮箱地址
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // 手机号码
  /(?:\+?86)?1[3-9]\d{9}/g,
  // 身份证号
  /\b\d{17}[\dXx]\b/g,
  // 银行卡号
  /\b\d{16,19}\b/g,
  // IP地址 (可选，根据需求决定是否脱敏)
  /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
];

/**
 * 脱敏配置
 */
const MASK_CONFIG = {
  // 默认脱敏长度
  defaultMaskLength: 4,
  
  // 各类字段的脱敏配置
  password: {
    type: 'full', // 完全脱敏
    mask: '******'
  },
  token: {
    type: 'partial', // 部分脱敏
    keepStart: 8,
    keepEnd: 4,
    maskChar: '*'
  },
  email: {
    type: 'email', // 邮箱特殊脱敏
    maskChar: '*'
  },
  phone: {
    type: 'phone', // 手机号特殊脱敏
    keepStart: 3,
    keepEnd: 4,
    maskChar: '*'
  },
  default: {
    type: 'partial', // 默认部分脱敏
    keepStart: 2,
    keepEnd: 2,
    maskChar: '*'
  }
};

/**
 * 脱敏工具类
 */
class DataMasker {
  /**
   * 对字符串进行脱敏
   * @param {string} str - 需要脱敏的字符串
   * @param {string} fieldType - 字段类型
   * @returns {string} 脱敏后的字符串
   */
  static maskString(str, fieldType = 'default') {
    if (!str || typeof str !== 'string') {
      return str;
    }

    const config = MASK_CONFIG[fieldType] || MASK_CONFIG.default;
    
    switch (config.type) {
      case 'full':
        return config.mask || '******';
        
      case 'partial':
        if (str.length <= (config.keepStart + config.keepEnd)) {
          return config.maskChar.repeat(str.length);
        }
        
        const start = str.substring(0, config.keepStart);
        const end = str.substring(str.length - config.keepEnd);
        const middle = config.maskChar.repeat(str.length - config.keepStart - config.keepEnd);
        
        return `${start}${middle}${end}`;
        
      case 'email':
        const [username, domain] = str.split('@');
        if (!domain) return str;
        
        const maskedUsername = username.length > 2
          ? `${username.substring(0, 2)}${config.maskChar.repeat(username.length - 2)}`
          : config.maskChar.repeat(username.length);
          
        return `${maskedUsername}@${domain}`;
        
      case 'phone':
        if (str.length <= (config.keepStart + config.keepEnd)) {
          return config.maskChar.repeat(str.length);
        }
        
        const phoneStart = str.substring(0, config.keepStart);
        const phoneEnd = str.substring(str.length - config.keepEnd);
        const phoneMiddle = config.maskChar.repeat(str.length - config.keepStart - config.keepEnd);
        
        return `${phoneStart}${phoneMiddle}${phoneEnd}`;
        
      default:
        return str;
    }
  }

  /**
   * 对对象进行脱敏
   * @param {Object} obj - 需要脱敏的对象
   * @returns {Object} 脱敏后的对象
   */
  static maskObject(obj) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const result = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const lowerKey = key.toLowerCase();
        
        // 检查是否为敏感字段
        const isSensitive = SENSITIVE_FIELDS.some(field => 
          lowerKey.includes(field.toLowerCase())
        );
        
        if (isSensitive) {
          // 根据字段类型选择脱敏方式
          let fieldType = 'default';
          if (lowerKey.includes('password')) {
            fieldType = 'password';
          } else if (lowerKey.includes('token') || lowerKey.includes('jwt')) {
            fieldType = 'token';
          } else if (lowerKey.includes('email')) {
            fieldType = 'email';
          } else if (lowerKey.includes('phone') || lowerKey.includes('mobile')) {
            fieldType = 'phone';
          }
          
          result[key] = this.maskString(obj[key], fieldType);
        } else if (typeof obj[key] === 'object') {
          // 递归处理嵌套对象
          result[key] = this.maskObject(obj[key]);
        } else {
          result[key] = obj[key];
        }
      }
    }

    return result;
  }

  /**
   * 对文本进行脱敏（基于正则表达式）
   * @param {string} text - 需要脱敏的文本
   * @returns {string} 脱敏后的文本
   */
  static maskText(text) {
    if (!text || typeof text !== 'string') {
      return text;
    }

    let maskedText = text;

    // 应用所有敏感模式
    for (const pattern of SENSITIVE_PATTERNS) {
      maskedText = maskedText.replace(pattern, (match) => {
        // 根据匹配内容的类型和长度选择脱敏方式
        if (match.startsWith('Bearer ')) {
          // Bearer Token
          const token = match.substring(7);
          return `Bearer ${this.maskString(token, 'token')}`;
        } else if (match.includes('@')) {
          // 邮箱
          return this.maskString(match, 'email');
        } else if (/^\d{11}$/.test(match)) {
          // 手机号
          return this.maskString(match, 'phone');
        } else if (/^\d{17}[\dXx]$/.test(match)) {
          // 身份证号
          return this.maskString(match, 'default');
        } else if (/^\d{16,19}$/.test(match)) {
          // 银行卡号
          return this.maskString(match, 'default');
        } else if (match.includes('password') || match.includes('secret')) {
          // 密码或密钥
          return this.maskString(match, 'password');
        } else {
          // 默认部分脱敏
          return this.maskString(match, 'token');
        }
      });
    }

    return maskedText;
  }
}

/**
 * 增强的日志记录器
 * 自动对敏感信息进行脱敏
 */
class SecureLogger {
  /**
   * 记录信息日志
   * @param {string} message - 日志消息
   * @param {Object} meta - 日志元数据
   */
  static info(message, meta = {}) {
    const maskedMeta = DataMasker.maskObject(meta);
    const maskedMessage = DataMasker.maskText(message);
    
    logger.info(maskedMessage, maskedMeta);
  }

  /**
   * 记录警告日志
   * @param {string} message - 日志消息
   * @param {Object} meta - 日志元数据
   */
  static warn(message, meta = {}) {
    const maskedMeta = DataMasker.maskObject(meta);
    const maskedMessage = DataMasker.maskText(message);
    
    logger.warn(maskedMessage, maskedMeta);
  }

  /**
   * 记录错误日志
   * @param {string} message - 日志消息
   * @param {Object} meta - 日志元数据
   */
  static error(message, meta = {}) {
    const maskedMeta = DataMasker.maskObject(meta);
    const maskedMessage = DataMasker.maskText(message);
    
    logger.error(maskedMessage, maskedMeta);
  }

  /**
   * 记录调试日志
   * @param {string} message - 日志消息
   * @param {Object} meta - 日志元数据
   */
  static debug(message, meta = {}) {
    const maskedMeta = DataMasker.maskObject(meta);
    const maskedMessage = DataMasker.maskText(message);
    
    logger.debug(maskedMessage, maskedMeta);
  }

  /**
   * 记录HTTP请求日志
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   * @param {number} responseTime - 响应时间（毫秒）
   */
  static logHttpRequest(req, res, responseTime) {
    const maskedHeaders = DataMasker.maskObject(req.headers);
    const maskedQuery = DataMasker.maskObject(req.query);
    const maskedBody = DataMasker.maskObject(req.body);
    
    // 脱敏URL中的查询参数
    const maskedUrl = DataMasker.maskText(req.originalUrl || req.url);
    
    const logData = {
      method: req.method,
      url: maskedUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      userAgent: maskedHeaders['user-agent'],
      ip: req.ip || req.connection.remoteAddress,
      headers: maskedHeaders,
      query: maskedQuery,
      // 只在开发环境记录请求体
      ...(process.env.NODE_ENV !== 'production' && { body: maskedBody })
    };
    
    if (res.statusCode >= 400) {
      this.warn('HTTP请求错误', logData);
    } else {
      this.info('HTTP请求', logData);
    }
  }

  /**
   * 记录数据库操作日志
   * @param {string} operation - 操作类型
   * @param {string} table - 表名
   * @param {Object} data - 数据
   * @param {Object} options - 选项
   */
  static logDatabaseOperation(operation, table, data = {}, options = {}) {
    const maskedData = DataMasker.maskObject(data);
    const maskedOptions = DataMasker.maskObject(options);
    
    this.info('数据库操作', {
      operation,
      table,
      data: maskedData,
      options: maskedOptions,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录安全事件日志
   * @param {string} event - 事件类型
   * @param {Object} details - 事件详情
   */
  static logSecurityEvent(event, details = {}) {
    const maskedDetails = DataMasker.maskObject(details);
    
    this.warn('安全事件', {
      event,
      details: maskedDetails,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * 记录用户活动日志
   * @param {string} userId - 用户ID
   * @param {string} action - 用户操作
   * @param {Object} details - 操作详情
   */
  static logUserActivity(userId, action, details = {}) {
    const maskedDetails = DataMasker.maskObject(details);
    
    this.info('用户活动', {
      userId,
      action,
      details: maskedDetails,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Express中间件：自动记录HTTP请求日志
 */
function secureHttpLogger(req, res, next) {
  const startTime = Date.now();
  
  // 监听响应结束事件
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    SecureLogger.logHttpRequest(req, res, responseTime);
  });
  
  next();
}

module.exports = {
  DataMasker,
  SecureLogger,
  secureHttpLogger,
  SENSITIVE_FIELDS,
  SENSITIVE_PATTERNS,
  MASK_CONFIG
};