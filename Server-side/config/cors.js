/**
 * CORS配置模块
 * 配置跨域资源共享(CORS)，允许所有来源网站的跨域请求
 */

const cors = require('cors');
const { logger } = require('./logger');

// 获取环境配置
const { getEnvironmentConfig } = require('./environment');
const config = getEnvironmentConfig();

/**
 * CORS配置选项
 */
const corsOptions = {
  // 允许所有来源
  origin: function (origin, callback) {
    // 在开发环境中，允许所有来源
    if (config.nodeEnv === 'development' || config.nodeEnv === 'test') {
      return callback(null, true);
    }
    
    // 在生产环境中，如果配置了允许所有来源，则允许所有来源
    if (config.security.enableCorsAll && config.nodeEnv !== 'production') {
      return callback(null, true);
    }
    
    // 否则，检查是否在允许的来源列表中（生产环境应显式白名单）
    const allowedOrigins = [
      process.env.CLIENT_ORIGIN || '',
      process.env.ADMIN_ORIGIN || '',
      'http://localhost:4000',
      'http://localhost:8080'
    ].filter(Boolean);
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
  },
  
  // 允许的HTTP方法
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  
  // 允许的请求头
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'X-File-Name',
    'X-Request-Id'
  ],
  
  // 暴露的响应头
  exposedHeaders: [
    'X-Total-Count',
    'X-Page-Count',
    'X-Current-Page'
  ],
  
  // 允许发送凭据（cookies, HTTP认证）
  credentials: true,
  
  // 预检请求的缓存时间（秒）
  maxAge: 86400, // 24小时
  
  // 是否通过预检请求
  preflightContinue: false,
  
  // 预检请求的状态码
  optionsSuccessStatus: 200
};

/**
 * 自定义CORS中间件
 * 在默认CORS基础上添加额外的处理逻辑
 */
const customCorsMiddleware = (req, res, next) => {
  // 记录跨域请求
  logger.debug('CORS请求', {
    origin: req.get('Origin'),
    method: req.method,
    url: req.url,
    ip: req.ip
  });
  
  // 设置额外的CORS相关头部
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Expose-Headers', 'X-Total-Count, X-Page-Count, X-Current-Page');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, X-File-Name, X-Request-Id');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(200).end();
  }
  
  next();
};

/**
 * 设置CORS中间件
 * 结合默认CORS和自定义CORS中间件
 */
const setupCors = (app) => {
  // 应用默认CORS中间件
  app.use(cors(corsOptions));
  
  // 应用自定义CORS中间件
  app.use(customCorsMiddleware);
  
  logger.info('CORS配置已应用');
};

module.exports = {
  setupCors,
  corsOptions,
  customCorsMiddleware
};