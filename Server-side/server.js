console.log('===== 开始加载server.js =====');

// 设置控制台编码为UTF-8
process.stdout.setEncoding('utf8');
process.stderr.setEncoding('utf8');

// 处理命令行参数
const args = process.argv.slice(2);
const logLevelIndex = args.findIndex(arg => arg === '--log-level');
if (logLevelIndex !== -1 && args[logLevelIndex + 1]) {
  // 设置日志级别环境变量，优先级高于配置文件
  process.env.LOG_LEVEL = args[logLevelIndex + 1];
  console.log(`从命令行参数设置日志级别: ${process.env.LOG_LEVEL}`);
}

// 添加全局错误处理器，以便捕获模块加载阶段的错误
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  console.error('错误堆栈:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const os = require('os');

// 导入环境配置
console.log('即将加载环境配置...');

// 先加载基础环境变量
require('dotenv').config();

const { initializeEnvironment } = require('./config/environment');
console.log('环境配置模块加载完成');

let config;
try {
  config = initializeEnvironment();
  console.log('环境配置初始化完成:', config.nodeEnv);
} catch (error) {
  console.error('❌ 环境配置初始化失败:', error.message);
  console.log('⚠️  尝试使用默认配置继续启动...');
  
  // 使用默认配置
  config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT) || 4000,
    db: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      name: process.env.DB_NAME || 'expense_system'
    }
  };
}

// 导入日志配置
// 统一日志输出到 winston
const { logger, httpLogger } = require('./config/logger');
(function bindConsoleToLogger() {
  try {
    const original = { ...console };
    console.log = (...args) => logger.info(args.map(String).join(' '));
    console.info = (...args) => logger.info(args.map(String).join(' '));
    console.warn = (...args) => logger.warn(args.map(String).join(' '));
    console.error = (...args) => logger.error(args.map(String).join(' '));
    console.debug = (...args) => logger.debug(args.map(String).join(' '));
    // 保留原始引用以便必要时恢复
    global.__originalConsole = original;
  } catch (_) {}
})();
logger.info('日志配置加载完成');

// 导入安全配置
console.log('即将加载安全配置...');
const { setupSecurityHeaders } = require('./config/security');
console.log('安全配置加载完成');

// 导入指标中间件
console.log('即将加载指标中间件...');
const { metricsMiddleware } = require('./middleware/metrics');
console.log('指标中间件加载完成');

// 导入增强的审计日志中间件
console.log('即将加载增强的审计日志中间件...');
const { enhancedAuditLogger, logSystemEvent } = require('./middleware/enhanced-audit-logger');
console.log('增强的审计日志中间件加载完成');

// 导入安全增强中间件
console.log('即将加载安全增强中间件...');
// const { verifyRequestSignature, ipWhitelist } = require('./middleware/securityEnhancements');
console.log('安全增强中间件加载完成');

// 导入CORS配置
console.log('即将加载CORS配置...');
const { setupCors } = require('./config/cors');
console.log('CORS配置加载完成');

// 导入统一响应处理中间件
console.log('即将加载统一响应处理中间件...');
const { standardResponseMiddleware } = require('./middleware/standard-response-handler');
console.log('统一响应处理中间件加载完成');

// 导入token管理中间件
console.log('即将加载token管理中间件...');
const { TokenManager, authenticateToken, checkRole, checkPermission, checkRequestBodySize, checkTokenLength, aiTokenHandler } = require('./middleware/tokenManager');
console.log('token管理中间件加载完成');

// 导入输入验证中间件
console.log('即将加载输入验证中间件...');
const { completeInputValidation, basicValidation, safeJsonParser, sanitizeInput, preventSQLInjection, preventXSS } = require('./middleware/input-validator');
console.log('输入验证中间件加载完成');

// 导入速率限制中间件
console.log('即将加载高级速率限制中间件...');
const { defaultRateLimiter, strictRateLimiter, looseRateLimiter, loginRateLimiter, roleAwareRateLimiter } = require('./middleware/rateLimiter');
const ipLimiter = defaultRateLimiter;
const userLimiter = looseRateLimiter;
const apiLimiter = strictRateLimiter;
console.log('高级速率限制中间件加载完成');

const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');

// 导入数据库配置
console.log('即将加载数据库配置...');
const { pool, testConnection, ensureMfaColumns } = require('./config/db');
const enhancedDatabaseManager = require('./config/enhanced-database');

// 初始化增强版数据库管理器
const dbConfig = require('./config/db').getConfig();
enhancedDatabaseManager.initialize(dbConfig);

console.log('数据库配置加载完成');

// 导入WebSocket管理器
console.log('即将加载WebSocket管理器...');
const wsManager = require('./config/websocket');
console.log('WebSocket管理器加载完成');

// 导入定时任务服务
console.log('即将加载定时任务服务...');
const scheduler = require('./utils/scheduler');
console.log('定时任务服务加载完成');

// 导入Redis配置
console.log('即将加载Redis配置...');
const { initRedis, isRedisConnected } = require('./config/redis');
console.log('Redis配置加载完成');

// 导入缓存预热服务
console.log('即将加载缓存预热服务...');
const CacheWarmupService = require('./services/cache-warmup-service');
console.log('缓存预热服务加载完成');

// 导入路由
const authRoutes = require('./routes/auth-routes');
const adminAuthRoutes = require('./routes/admin-auth-routes');
const adminUserRoutes = require('./routes/admin-user-routes');
const adminBillRoutes = require('./routes/admin-bill-routes');
const userRoutes = require('./routes/user-routes');
const roomRoutes = require('./routes/room-routes');
const expenseRoutes = require('./routes/expense-routes');
const adminLeaveRecordRoutes = require('./routes/admin-leave-record-routes');
// 管理员费用审核路由
const adminExpenseRoutes = require('./routes/admin-expense-routes');
// 管理员支付管理路由
const adminPaymentRoutes = require('./routes/admin-payment-routes');
// 管理员通知管理路由
const adminNotificationRoutes = require('./routes/admin-notification-routes');
// 管理员邀请码管理路由
const adminInviteRoutes = require('./routes/admin-invite-routes');
// 管理员数据分析路由
const adminAnalyticsRoutes = require('./routes/admin-analytics-routes');
const expenseTypeRoutes = require('./routes/expense-type-routes');
const billRoutes = require('./routes/bill-routes');
const statsRoutes = require('./routes/stats-routes');
const qrCodeRoutes = require('./routes/qr-code-routes');
const paymentRoutes = require('./routes/payment-routes');
const inviteCodeRoutes = require('./routes/invite-code-routes');
const specialPaymentRoutes = require('./routes/special-payment-routes');
const specialPaymentRuleRoutes = require('./routes/special-payment-rule-routes');
const roomPaymentRuleRoutes = require('./routes/room-payment-rule-routes');
const activityRoutes = require('./routes/activity-routes');
const permissionRoutes = require('./routes/permission-routes');
const paymentTransferRoutes = require('./routes/payment-transfer-routes');
const paymentOptimizationRoutes = require('./routes/payment-optimization-routes');
const notificationRoutes = require('./routes/notification-routes');
const notificationSettingsRoutes = require('./routes/notification-settings-routes');
const mfaRoutes = require('./routes/mfa-routes');
const userPreferencesRoutes = require('./routes/user-preferences-routes');
const abnormalExpenseRoutes = require('./routes/abnormal-expense-routes');
const disputeRoutes = require('./routes/dispute-routes');
const reviewRoutes = require('./routes/review-routes');
const systemConfigRoutes = require('./routes/system-config-routes');
const fileRoutes = require('./routes/file-routes');
const websocketManagementRoutes = require('./routes/websocket-management-routes');
const roleRoutes = require('./routes/role-routes');
const monitoringRoutes = require('./routes/monitoring-routes');
const metricsRoutes = require('./routes/metrics-routes');

// 新增的管理端路由
const adminSystemConfigRoutes = require('./routes/admin-system-config-routes');
const adminRolePermissionRoutes = require('./routes/admin-role-permission-routes');
const adminMonitoringRoutes = require('./routes/admin-monitoring-routes');
const adminBatchJobRoutes = require('./routes/admin-batch-job-routes');
const adminDisputeRoutes = require('./routes/admin-dispute-routes');
const adminDormRoutes = require('./routes/admin-dorm-routes');
const adminDocsRoutes = require('./routes/admin-docs-routes');
const adminReviewRoutes = require('./routes/admin-review-routes');
const adminActivityRoutes = require('./routes/admin-activity-routes');
const adminSpecialPaymentRuleRoutes = require('./routes/admin-special-payment-rule-routes');

// 导入数据导出路由
const dataExportRoutes = require('./routes/data-export-routes');

// 导入缓存管理路由
const cacheManagementRoutes = require('./routes/cache-management-routes');

// 导入用户资料和设置路由
const userProfileRoutes = require('./routes/user-profile-routes');
const leaveRecordRoutes = require('./routes/leave-record-routes');
const stayDaysRoutes = require('./routes/stay-days-routes');
const cacheRoutes = require('./routes/cache-routes');
const bruteForceMonitorRoutes = require('./routes/brute-force-monitor');
const otherRoutes = require('./routes/other-routes');
const docsRoutes = require('./routes/docs-routes');
const adminSessionRoutes = require('./routes/adminSession-routes');
const adminPermissionHistoryRoutes = require('./routes/adminPermissionHistory-routes');
const adminOperationRestrictionRoutes = require('./routes/adminOperationRestriction-routes');
const adminOperationStatisticsRoutes = require('./routes/adminOperationStatistics-routes');
const systemPerformanceRoutes = require('./routes/performance-routes');
// 导入第三方账号管理路由
const thirdPartyAccountRoutes = require('./routes/third-party-account-routes');

// 导入密码重置路由
const passwordResetRoutes = require('./routes/password-reset-routes');

// 导入健康检查路由
const healthRoutes = require('./routes/health-routes');

// 导入系统维护路由
const systemMaintenanceRoutes = require('./routes/system-maintenance-routes');

// 导入告警路由
const alertRoutes = require('./routes/alert-routes');

// 导入增强健康检查路由
const enhancedHealthRoutes = require('./routes/enhanced-health-routes');

// 导入增强的审计日志路由
console.log('即将加载增强的审计日志路由...');
const enhancedAuditRoutes = require('./routes/enhanced-audit-routes');
console.log('增强的审计日志路由加载完成');

// 导入错误处理中间件
const { globalErrorHandler, notFoundHandler, sanitizeRequestResponse } = require('./middleware/global-error-handler');

// 创建Express应用
const app = express();

// 应用日志脱敏中间件（在所有其他中间件之前）
app.use(sanitizeRequestResponse);

const PORT = config.port;

// 安全与代理设置
app.set('trust proxy', 1);
app.disable('x-powered-by');

// 创建HTTP服务器
const server = http.createServer(app);
// 设置服务器超时防滥用
server.headersTimeout = 65 * 1000; // 65s 防止慢头攻击
server.requestTimeout = 60 * 1000; // 60s 请求超时

// 移除服务器信息头部
server.on('request', (req, res) => {
  try {
    res.removeHeader('Server');
  } catch (e) {
    // 忽略无法移除头部的错误
  }
});

// 中间件
// 提前放置 Body Parser，确保后续中间件能读取 body
app.use(express.json({ limit: `${config.upload.maxFileSize}mb` }));
app.use(express.urlencoded({ extended: true, limit: `${config.upload.maxFileSize}mb` }));

// CORS 必须在速率限制之前
setupCors(app);

// 指标采集在早期挂载
app.use(metricsMiddleware);

// 导入性能监控中间件
const performanceMonitorMiddleware = require('./middleware/performance-monitor-middleware');

// 导入智能缓存中间件
const smartCacheMiddleware = require('./middleware/smart-cache-middleware');

// 导入批量操作路由
const batchOperationRoutes = require('./routes/batch-operation-routes');

// 导入性能监控路由
const performanceRoutes = require('./routes/performance-routes');

// 请求签名与 IP 白名单（如启用）
// app.use(verifyRequestSignature);
// app.use(ipWhitelist);

// 安全中间件
setupSecurityHeaders(app);

// 全局输入安全验证中间件（必须在路由之前应用）
app.use(safeJsonParser);        // 安全的JSON解析
app.use(sanitizeInput);         // 输入清理和标准化
app.use(preventSQLInjection);   // SQL注入防护
app.use(preventXSS);           // XSS攻击防护

// 统一响应处理中间件
app.use(standardResponseMiddleware);

// Token 相关中间件（长度/大小校验应早于限流）
app.use(checkRequestBodySize);
app.use(checkTokenLength);

// 速率限制中间件（可按需在全局或路由粒度启用）
if (config.security.enableRateLimiting) {
  app.use(defaultRateLimiter);
}

// AI 接口专用 token 处理
app.use('/api/ai', aiTokenHandler);

// HTTP请求日志中间件
app.use(httpLogger);

// 增强的审计日志中间件（暂时禁用，避免阻塞API请求）
// app.use((req, res, next) => {
//   // 跳过健康检查端点，避免审计日志阻塞
//   if (req.path === '/health' || req.path === '/health-page') {
//     return next();
//   }
//   return enhancedAuditLogger(req, res, next);
// });

// 根路径处理 - 必须在静态文件中间件之前
app.get('/', (req, res) => {
  try {
    logger.info('处理根路径请求', { ip: req.ip, userAgent: req.get('User-Agent') });
    // 直接返回public目录下的index.html文件
    const indexPath = path.join(__dirname, 'public', 'index.html');
    logger.info('检查首页文件路径:', indexPath);
    if (fs.existsSync(indexPath)) {
      logger.info('首页文件存在，正在发送文件');
      res.sendFile(indexPath);
    } else {
      logger.error('首页文件不存在');
      res.status(404).json({
        success: false,
        message: '首页文件不存在'
      });
    }
  } catch (error) {
    logger.error('根路径处理失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 静态文件服务 - 用于部署前端应用与上传文件
app.use(express.static('public'));
// 暴露 /uploads 目录供收据访问（确保与 multer 配置一致）
try {
  const uploadsDir = path.join(__dirname, 'uploads');
  if (fs.existsSync(uploadsDir)) {
    app.use('/uploads', express.static(uploadsDir));
  } else {
    logger.warn(`未找到 uploads 目录: ${uploadsDir}，如需上传请创建该目录`);
  }
} catch (e) {
  logger.error(`挂载 uploads 目录失败: ${e.message}`);
}

// API路由
// 在现有路由之后添加新路由
app.use('/api/batch-operations', batchOperationRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/system', systemConfigRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/ws', websocketManagementRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin', adminUserRoutes);
app.use('/api/admin/bills', adminBillRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/expense-types', expenseTypeRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/qr-codes', qrCodeRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/invite-codes', inviteCodeRoutes);
app.use('/api/special-payments', specialPaymentRoutes);
app.use('/api/special-payment-rules', specialPaymentRuleRoutes);
app.use('/api/room-payment-rules', roomPaymentRuleRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/payment-transfers', paymentTransferRoutes);
app.use('/api/payment-optimization', paymentOptimizationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/notification-settings', notificationSettingsRoutes);
app.use('/api/mfa', mfaRoutes);
app.use('/api/user-preferences', userPreferencesRoutes);
app.use('/api/abnormal-expenses', abnormalExpenseRoutes);
app.use('/api/leave-records', leaveRecordRoutes);
app.use('/api/stay-days', stayDaysRoutes);
app.use('/api/cache', cacheRoutes);
app.use('/api/brute-force-monitor', bruteForceMonitorRoutes);
app.use('/api/admin/leave-records', adminLeaveRecordRoutes);
app.use('/api/admin/expenses', adminExpenseRoutes);
app.use('/api/admin/payments', adminPaymentRoutes);
app.use('/api/admin/notifications', adminNotificationRoutes);
app.use('/api/admin/invites', adminInviteRoutes);
app.use('/api/admin/analytics', adminAnalyticsRoutes);
app.use('/api/other', otherRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api/admin/sessions', adminSessionRoutes);
app.use('/api/admin/permission-history', adminPermissionHistoryRoutes);
app.use('/api/admin/operation-restriction', adminOperationRestrictionRoutes);
app.use('/api/admin/operation-statistics', adminOperationStatisticsRoutes);
app.use('/api/admin/system-performance', systemPerformanceRoutes);
app.use('/api/system-maintenance', systemMaintenanceRoutes);

// 新增的管理端路由
app.use('/api/admin/system', adminSystemConfigRoutes);
app.use('/api/admin', adminRolePermissionRoutes);
app.use('/api/admin/monitoring', adminMonitoringRoutes);
app.use('/api/admin', adminBatchJobRoutes);
app.use('/api/admin/disputes', adminDisputeRoutes);
app.use('/api/admin/dorms', adminDormRoutes);
app.use('/api/admin/docs', adminDocsRoutes);
app.use('/api/admin/reviews', adminReviewRoutes);
app.use('/api/admin/activities', adminActivityRoutes);
app.use('/api/admin', adminSpecialPaymentRuleRoutes);

// 数据导出路由
app.use('/api/data-export', dataExportRoutes);

// 缓存管理路由
app.use('/api/cache-management', cacheManagementRoutes);

// 用户资料和设置路由
app.use('/api/user-profile', userProfileRoutes);

// 第三方账号管理路由
app.use('/api/third-party-accounts', thirdPartyAccountRoutes);

// 密码重置路由
app.use('/api/password-reset', passwordResetRoutes);

// 增强的审计日志路由
app.use('/api/enhanced-audit', enhancedAuditRoutes);
app.use('/api/monitoring', monitoringRoutes);

// 增强健康检查路由
app.use('/api', enhancedHealthRoutes);

// 监控指标路由
app.use('/api/metrics', metricsRoutes);

// 健康检查路由
app.use('/api/health', healthRoutes);

// 告警路由
app.use('/api/alerts', alertRoutes);

// 前端应用路由（使用绝对路径，兼容空格路径；目录不存在则跳过挂载并记录日志）
const clientDistPath = path.resolve(__dirname, '..', 'Client application', 'dist');
const adminDistPath = path.resolve(__dirname, '..', 'Admin panel', 'dist');

try {
  if (fs.existsSync(clientDistPath)) {
    app.use('/client', express.static(clientDistPath));
    logger.info(`挂载 /client 静态目录: ${clientDistPath}`);
  } else {
    logger.warn(`未找到 client 构建目录: ${clientDistPath}，/client 未挂载`);
  }
} catch (e) {
  logger.error(`检查 client 静态目录失败: ${e.message}`);
}

try {
  if (fs.existsSync(adminDistPath)) {
    app.use('/admin', express.static(adminDistPath));
    logger.info(`挂载 /admin 静态目录: ${adminDistPath}`);
  } else {
    logger.warn(`未找到 admin 构建目录: ${adminDistPath}，/admin 未挂载`);
  }
} catch (e) {
  logger.error(`检查 admin 静态目录失败: ${e.message}`);
}



// 健康检查端点
app.get('/health', async (req, res) => {
  try {
    // 检查数据库配置是否已加载
    let dbConnected = false;
    let dbStatus = '未配置';
    
    try {
      // 尝试从config/db导入testConnection函数
      const { testConnection } = require('./config/db');
      dbConnected = await testConnection();
      dbStatus = dbConnected ? '已连接' : '连接失败';
    } catch (dbError) {
      console.log('数据库配置未加载或连接失败:', dbError.message);
      dbStatus = '未配置';
    }
    
    // 获取WebSocket状态
    let wsStats = { totalConnections: 0 };
    let wsStatus = '未配置';
    
    try {
      // 尝试获取WebSocket管理器
      const websocketManager = require('./config/websocket');
      wsStats = websocketManager.getStats();
      wsStatus = wsStats.totalConnections >= 0 ? '正常' : '异常';
    } catch (wsError) {
      console.log('WebSocket管理器未加载:', wsError.message);
      wsStatus = '未配置';
    }
    
    // 获取Redis状态
    let redisStatus = '未配置';
    let redisConnected = false;
    
    try {
      // 尝试检查Redis连接
      const { isRedisConnected } = require('./config/redis');
      redisConnected = isRedisConnected();
      redisStatus = redisConnected ? '已连接' : '未连接';
    } catch (redisError) {
      console.log('Redis连接检查失败:', redisError.message);
      redisStatus = '未配置';
    }
    
    // 返回JSON格式的健康状态数据
    return res.json({
      success: true,
      data: {
        timestamp: new Date().toISOString(),
        database: {
          status: dbConnected ? 'connected' : 'disconnected',
          message: dbStatus
        },
        websocket: {
          status: wsStats.totalConnections >= 0 ? 'active' : 'inactive',
          connections: wsStats.totalConnections,
          message: wsStatus
        },
        redis: {
          status: redisConnected ? 'connected' : 'disconnected',
          message: redisStatus
        },
        system: {
          uptime: process.uptime(),
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage(),
          serverTime: new Date().toLocaleString('zh-CN'),
          os: `${os.type()} ${os.arch()} ${os.release()}`
        }
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    return res.status(500).json({
      success: false,
      message: '健康检查失败',
      error: error.message
    });
  }
});

// 健康检查页面端点
app.get('/health-page', async (req, res) => {
  try {
    return res.redirect('/health');
  } catch (error) {
    logger.error('Health page redirect failed:', error);
    return res.status(500).send('健康检查页面重定向失败');
  }
});

// 404错误处理中间件（必须在所有路由之后）
app.use(notFoundHandler);

// 全局错误处理中间件（必须在所有其他中间件和路由之后）
app.use(globalErrorHandler);

// 测试数据库连接
async function startServer() {
  try {
    console.log('进入startServer函数...');
    
    // 初始化Redis连接
    console.log('开始初始化Redis连接...');
    try {
      await initRedis();
      console.log('Redis连接初始化成功');
    } catch (error) {
      console.error('Redis连接初始化失败:', error.message);
      // 在开发环境中继续启动，生产环境中退出
      if (config.nodeEnv !== 'development') {
        throw error;
      }
    }
    
    console.log('开始测试数据库连接...');
    // 测试数据库连接
    const dbConnected = await testConnection();
    console.log('数据库连接结果:', dbConnected);
    
    if (!dbConnected) {
      if (config.nodeEnv === 'development') {
        logger.warn('开发环境下数据库未连接，继续启动以便进行接口与安全验证');
      } else {
        logger.error('无法连接到数据库，服务器启动失败');
        process.exit(1);
      }
    }
    
    // 如果数据库连接成功，更新数据库表结构
    if (dbConnected) {
      try {
        console.log('正在更新数据库表结构...');
        const { updateDatabaseSchema } = require('./middleware/securityEnhancements');
        await updateDatabaseSchema();
        console.log('数据库表结构更新完成');
      } catch (error) {
        console.error('数据库表结构更新失败:', error);
        // 在开发环境中继续启动，生产环境中退出
        if (config.nodeEnv !== 'development') {
          throw error;
        }
      }
    }
    
    console.log('准备启动HTTP服务器...');
    // 确保数据库MFA列
    try {
      console.log('正在检查/创建MFA列...');
      await ensureMfaColumns();
      console.log('MFA列检查/创建完成');
    } catch (error) {
      console.error('MFA列检查/创建失败:', error);
      // 在开发环境中继续启动，生产环境中退出
      if (config.nodeEnv !== 'development') {
        throw error;
      }
    }

    // 启动服务器
    console.log('即将调用server.listen...');
    server.listen(PORT, () => {
      logger.info(`服务器在 ${config.nodeEnv} 环境中启动，监听端口 ${PORT}`);
      logger.info(`使用数据库: ${config.db.name}`);
      
      // 初始化WebSocket
      console.log('初始化WebSocket...');
      wsManager.init(server);
      
      // 启动定时任务
      console.log('启动定时任务...');
      try {
        scheduler.startAllTasks();
        console.log('定时任务启动完成');
      } catch (error) {
        console.error('定时任务启动失败:', error);
        // 在生产环境中，如果定时任务启动失败，记录错误但继续运行
        if (config.nodeEnv !== 'production') {
          throw error;
        }
      }
      
      // 初始化缓存预热服务
      console.log('初始化缓存预热服务...');
      try {
        const cacheWarmupService = new CacheWarmupService();
        // 在服务器启动后延迟执行缓存预热，避免影响启动速度
        setTimeout(async () => {
          try {
            console.log('开始执行缓存预热...');
            await cacheWarmupService.warmupCache();
            console.log('缓存预热完成');
          } catch (error) {
            console.error('缓存预热失败:', error);
          }
        }, 30000); // 30秒后开始预热
        console.log('缓存预热服务初始化完成');
      } catch (error) {
        console.error('缓存预热服务初始化失败:', error);
      }
    });
    console.log('server.listen调用完成');
  } catch (error) {
    console.error('服务器启动失败:', error);
    console.error('错误堆栈:', error.stack);
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 添加未捕获异常处理器
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  console.error('错误堆栈:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

// 启动服务器（非测试环境）
console.log('检查环境配置:', config.nodeEnv);
console.log('config.nodeEnv !== \'test\':', config.nodeEnv !== 'test');
if (config.nodeEnv !== 'test') {
  console.log('准备启动服务器...');
  console.log('即将调用startServer函数...');
  try {
    startServer().then(() => {
      console.log('startServer函数执行完成');
    }).catch(error => {
      console.error('启动服务器时捕获到未处理的错误:', error);
      console.error('错误堆栈:', error.stack);
      process.exit(1);
    });
  } catch (error) {
    console.error('调用startServer函数时发生同步错误:', error);
    console.error('错误堆栈:', error.stack);
    process.exit(1);
  }
} else {
  console.log('测试环境，不启动服务器');
}

// 导出app对象供测试使用
module.exports = app;

// 优雅关闭
process.on('SIGINT', async () => {
  logger.info('正在关闭服务器...');
  
  // 停止定时任务
  scheduler.stopAllTasks();
  
  // 关闭数据库连接池
  await pool.end();
  await enhancedDatabaseManager.close();
  
  console.log('数据库连接已关闭');
  process.exit(0);
});