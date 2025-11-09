console.log('===== 开始加载server.js =====');

// 设置控制台编码为UTF-8
process.stdout.setEncoding('utf8');
process.stderr.setEncoding('utf8');

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

// 导入速率限制中间件
console.log('即将加载速率限制中间件...');
const { defaultRateLimiter } = require('./middleware/rateLimiter');
console.log('速率限制中间件加载完成');

// 导入指标中间件
console.log('即将加载指标中间件...');
const { metricsMiddleware } = require('./middleware/metrics');
console.log('指标中间件加载完成');

// 导入安全增强中间件
console.log('即将加载安全增强中间件...');
// const { verifyRequestSignature, ipWhitelist } = require('./middleware/securityEnhancements');
console.log('安全增强中间件加载完成');

// 导入CORS配置
console.log('即将加载CORS配置...');
const { setupCors } = require('./config/cors');
console.log('CORS配置加载完成');

// 导入响应处理中间件
console.log('即将加载响应处理中间件...');
const { newResponseMiddleware } = require('./middleware/newResponseHandler');
console.log('响应处理中间件加载完成');

// 导入token管理中间件
console.log('即将加载token管理中间件...');
const { TokenManager, authenticateToken, checkRole, checkPermission, checkRequestBodySize, checkTokenLength, aiTokenHandler } = require('./middleware/tokenManager');
console.log('token管理中间件加载完成');

const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');

// 导入数据库配置
console.log('即将加载数据库配置...');
const { pool, testConnection, ensureMfaColumns } = require('./config/db');
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
const cacheTestRoutes = require('./routes/cache-test-routes');
console.log('Redis配置加载完成');

// 导入路由
const authRoutes = require('./routes/auth-routes');
const adminAuthRoutes = require('./routes/admin-auth-routes');
const userRoutes = require('./routes/user-routes');
const roomRoutes = require('./routes/room-routes');
const expenseRoutes = require('./routes/expense-routes');
const expenseTypeRoutes = require('./routes/expense-type-routes');
const billRoutes = require('./routes/bill-routes');
const statsRoutes = require('./routes/stats-routes');
const qrCodeRoutes = require('./routes/qr-code-routes');
const paymentRoutes = require('./routes/payment-routes');
const inviteCodeRoutes = require('./routes/invite-code-routes');
const specialPaymentRoutes = require('./routes/special-payment-routes');
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
const leaveRecordRoutes = require('./routes/leave-record-routes');
const stayDaysRoutes = require('./routes/stay-days-routes');

// 导入错误处理中间件
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');

// 创建Express应用
const app = express();
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

// 请求签名与 IP 白名单（如启用）
// app.use(verifyRequestSignature);
// app.use(ipWhitelist);

// 安全中间件
setupSecurityHeaders(app);

// 响应处理中间件
app.use(newResponseMiddleware);

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
app.use('/api/disputes', disputeRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/system', systemConfigRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/ws', websocketManagementRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
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
app.use('/api/payment-transfers', paymentTransferRoutes);
app.use('/api/payment-optimization', paymentOptimizationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/notification-settings', notificationSettingsRoutes);
app.use('/api/mfa', mfaRoutes);
app.use('/api/user-preferences', userPreferencesRoutes);
app.use('/api/abnormal-expenses', abnormalExpenseRoutes);
app.use('/api/leave-records', leaveRecordRoutes);
app.use('/api/stay-days', stayDaysRoutes);
app.use('/api/cache-test', cacheTestRoutes);

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
app.use(errorHandler);

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
  
  await pool.end();
  console.log('数据库连接已关闭');
  process.exit(0);
});