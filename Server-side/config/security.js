const helmet = require('helmet');
const { logger } = require('../config/logger');

/**
 * 配置Helmet安全头部
 * 根据环境变量和应用程序需求定制安全策略
 */
const securityConfig = {
  // 隐藏服务器信息
  hidePoweredBy: true,
  
  // 内容安全策略
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "ws:", "wss:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      manifestSrc: ["'self'"],
      workerSrc: ["'self'"]
    }
  },
  
  // 跨域嵌入保护
  crossOriginEmbedderPolicy: false, // 禁用以避免与某些前端框架冲突
  
  // 跨域资源策略
  crossOriginResourcePolicy: { policy: "cross-origin" },
  
  // DNS预取控制 (已在customSecurityHeaders中设置，这里移除以避免重复)
  // dnsPrefetchControl: { allow: false },
  
  // 期望CT
  expectCt: {
    maxAge: 86400,
    enforce: true
  },
  
  // 功能策略 (已在customSecurityHeaders中设置，这里移除以避免重复)
  // permittedCrossDomainPolicies: false,
  
  // HSTS (HTTP严格传输安全)
  hsts: {
    maxAge: 31536000, // 1年
    includeSubDomains: true,
    preload: true
  },
  
  // IE兼容性 (已在customSecurityHeaders中设置，这里移除以避免重复)
  // ieNoOpen: true,
  
  // MIME类型嗅探
  noSniff: true,
  
  // 来源策略
  originAgentCluster: true,
  
  // 引用策略
  referrerPolicy: { policy: "no-referrer" },
  
  // X-Content-Type-Options (已在customSecurityHeaders中设置，这里移除以避免重复)
  // xContentTypeOptions: true,
  
  // X-DNS-Prefetch-Control
  xDnsPrefetchControl: false,
  
  // X-Download-Options
  xDownloadOptions: false, // 仅适用于IE
  
  // X-Frame-Options
  xFrameOptions: { action: 'deny' },
  
  // X-Permitted-Cross-Domain-Policies
  xPermittedCrossDomainPolicies: false,
  
  // X-XSS-Protection
  xXssProtection: false // 现代浏览器不需要，CSP已提供更好的保护
};

/**
 * 自定义安全头部中间件
 * 在Helmet基础上添加额外的安全头部
 */
const customSecurityHeaders = (req, res, next) => {
  // 记录安全相关请求
  logger.debug('安全头部应用', {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // 添加自定义安全头部
  // 移除X-Powered-By头部以隐藏技术栈信息
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // 明确移除可能泄露服务器信息的头部
  res.removeHeader('Server');
  res.removeHeader('X-Powered-By');
  
  // 在生产环境中添加额外的安全头部
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  next();
};

/**
 * 安全头部配置中间件
 * 结合Helmet和自定义安全头部
 */
const setupSecurityHeaders = (app) => {
  // 应用Helmet安全头部
  app.use(helmet(securityConfig));
  
  // 应用自定义安全头部
  app.use(customSecurityHeaders);
  
  logger.info('安全头部配置已应用');
};

module.exports = {
  setupSecurityHeaders,
  securityConfig,
  customSecurityHeaders
};