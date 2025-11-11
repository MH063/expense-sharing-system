const winston = require('winston');
const path = require('path');
const { sanitizeMessage } = require('../middleware/logSanitizer');

// 确保日志目录存在
const fs = require('fs');
const logDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 自定义日志格式
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    // 对消息进行脱敏处理
    let logMessage = sanitizeMessage(message);
    
    let log = `${timestamp} [${level.toUpperCase()}]: ${logMessage}`;
    
    // 如果有堆栈信息，添加到日志中（也需要脱敏）
    if (stack) {
      const sanitizedStack = sanitizeMessage(stack);
      log += `\n${sanitizedStack}`;
    }
    
    // 如果有元数据，添加到日志中（也需要脱敏）
    if (Object.keys(meta).length > 0) {
      try {
        const metaString = JSON.stringify(meta, null, 2);
        const sanitizedMeta = sanitizeMessage(metaString);
        log += `\n${sanitizedMeta}`;
      } catch (error) {
        log += `\n[无法序列化元数据: ${error.message}]`;
      }
    }
    
    return log;
  })
);

// 创建日志记录器
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  transports: [
    // 错误日志文件 - 使用UTF-8编码
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      options: { flags: 'w', encoding: 'utf8' },
      // 确保写入UTF-8编码
      eol: '\n'
    }),
    // 组合日志文件 - 使用UTF-8编码
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      options: { flags: 'w', encoding: 'utf8' },
      // 确保写入UTF-8编码
      eol: '\n'
    }),
    // 访问日志文件 - 使用UTF-8编码
    new winston.transports.File({
      filename: path.join(logDir, 'access.log'),
      level: 'http',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      options: { flags: 'w', encoding: 'utf8' },
      // 确保写入UTF-8编码
      eol: '\n'
    }),
    // 用户控制器日志文件 - 使用UTF-8编码
    new winston.transports.File({
      filename: path.join(logDir, 'user-controller.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      options: { flags: 'w', encoding: 'utf8' },
      // 确保写入UTF-8编码
      eol: '\n'
    })
  ],
  // 异常处理 - 使用UTF-8编码
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'exceptions.log'),
      options: { flags: 'w', encoding: 'utf8' },
      // 确保写入UTF-8编码
      eol: '\n'
    })
  ],
  // 拒绝处理 - 使用UTF-8编码
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logDir, 'rejections.log'),
      options: { flags: 'w', encoding: 'utf8' },
      // 确保写入UTF-8编码
      eol: '\n'
    })
  ]
});

// 非生产环境下，同时输出到控制台
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// 创建HTTP请求日志中间件
const httpLogger = (req, res, next) => {
  const start = Date.now();
  
  // 记录请求开始
  logger.http('请求开始', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user ? req.user.id : '未认证'
  });
  
  // 监听响应结束
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.http('请求完成', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      user: req.user ? req.user.id : '未认证'
    });
  });
  
  next();
};

// 创建数据库操作日志中间件
const dbLogger = (operation, table, details = {}) => {
  logger.info('数据库操作', {
    operation,
    table,
    ...details
  });
};

// 创建业务操作日志中间件
const businessLogger = (action, details = {}) => {
  logger.info('业务操作', {
    action,
    ...details
  });
};

// 创建安全相关日志中间件
const securityLogger = (event, details = {}) => {
  logger.warn('安全事件', {
    event,
    ...details
  });
};

module.exports = {
  logger,
  httpLogger,
  dbLogger,
  businessLogger,
  securityLogger
};