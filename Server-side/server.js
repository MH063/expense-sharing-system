console.log('===== 开始加载server.js =====');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// 导入环境配置
console.log('即将加载环境配置...');
const { initializeEnvironment } = require('./config/environment');
console.log('环境配置模块加载完成');
const config = initializeEnvironment();
console.log('环境配置初始化完成:', config.nodeEnv);

// 导入日志配置
console.log('即将加载日志配置...');
const { logger, httpLogger } = require('./config/logger');
console.log('日志配置加载完成');

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
const { verifyRequestSignature, ipWhitelist } = require('./middleware/securityEnhancements');
console.log('安全增强中间件加载完成');

// 导入CORS配置
console.log('即将加载CORS配置...');
const { setupCors } = require('./config/cors');
console.log('CORS配置加载完成');

// 导入响应处理中间件
console.log('即将加载响应处理中间件...');
const { standardResponseMiddleware } = require('./middleware/responseHandler');
console.log('响应处理中间件加载完成');

// 导入统一token管理中间件
console.log('即将加载token管理中间件...');
const { 
  authenticateToken, 
  checkRole, 
  checkPermission,
  checkRequestBodySize,
  checkTokenLength,
  aiTokenHandler
} = require('./middleware/tokenManager');
console.log('token管理中间件加载完成');

const path = require('path');
const fs = require('fs');
const http = require('http');

// 导入数据库配置
console.log('即将加载数据库配置...');
const { pool, testConnection, ensureMfaColumns } = require('./config/db');
console.log('数据库配置加载完成');

// 导入WebSocket管理器
console.log('即将加载WebSocket管理器...');
const websocketManager = require('./config/websocket');
console.log('WebSocket管理器加载完成');

// 导入定时任务服务
console.log('即将加载定时任务服务...');
const scheduler = require('./utils/scheduler');
console.log('定时任务服务加载完成');

// 导入路由
const authRoutes = require('./routes/auth-routes');
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
const mfaRoutes = require('./routes/mfa-routes');

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
app.use(verifyRequestSignature);
app.use(ipWhitelist);

// 安全中间件
setupSecurityHeaders(app);

// 响应处理中间件
app.use(standardResponseMiddleware);

// Token 相关中间件（长度/大小校验应早于限流）
app.use(checkRequestBodySize);
app.use(checkTokenLength);

// 速率限制中间件（可按需在全局或路由粒度启用）
app.use(defaultRateLimiter);

// AI 接口专用 token 处理
app.use('/api/ai', aiTokenHandler);

// HTTP请求日志中间件
app.use(httpLogger);

// 静态文件服务 - 用于部署前端应用
app.use(express.static('public'));

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
    const dbConnected = await testConnection();
    const wsStats = websocketManager.getStats();
    
    // 总是返回美观的HTML页面，不再根据Accept头判断
    const statusColor = dbConnected ? '#28a745' : '#dc3545';
    const statusText = dbConnected ? '正常' : '异常';
    const wsStatus = wsStats.totalConnections >= 0 ? '正常' : '异常';
    const wsStatusColor = wsStats.totalConnections >= 0 ? '#28a745' : '#dc3545';
    const envColor = config.nodeEnv === 'production' ? '#28a745' : '#ffc107';
    
    const html = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>系统健康状态 - 宿舍费用分摊记账系统</title>
        <style>
            /* 基础样式 */
            * {
                box-sizing: border-box;
            }
            body {
                margin: 0;
                padding: 0;
                background-color: #f8f9fa;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                color: #212529;
                line-height: 1.6;
            }
            .container {
                width: 100%;
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 15px;
            }
            /* 健康检查容器样式 */
            .health-container {
                max-width: 900px;
                margin: 50px auto;
                padding: 30px;
                background-color: #fff;
                border-radius: 10px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                position: relative;
            }
            /* 卡片样式 */
            .card {
                border: 1px solid rgba(0, 0, 0, 0.125);
                border-radius: 0.375rem;
                margin-bottom: 1.5rem;
                background-color: #fff;
                transition: transform 0.3s;
            }
            .card:hover {
                transform: translateY(-5px);
            }
            .card-header {
                padding: 0.75rem 1.25rem;
                margin-bottom: 0;
                background-color: rgba(0, 0, 0, 0.03);
                border-bottom: 1px solid rgba(0, 0, 0, 0.125);
                border-top-left-radius: calc(0.375rem - 1px);
                border-top-right-radius: calc(0.375rem - 1px);
                font-weight: 500;
            }
            .card-body {
                padding: 1.25rem;
                flex: 1 1 auto;
            }
            .card-title {
                margin-bottom: 0.75rem;
                font-size: 1.25rem;
                font-weight: 500;
            }
            .card-text {
                margin-top: 0;
                margin-bottom: 1rem;
            }
            /* 网格系统 */
            .row {
                display: flex;
                flex-wrap: wrap;
                margin-right: -15px;
                margin-left: -15px;
            }
            .col-md-4 {
                flex: 0 0 33.333333%;
                max-width: 33.333333%;
                padding-right: 15px;
                padding-left: 15px;
                margin-bottom: 1.5rem;
            }
            .col-sm-6 {
                flex: 0 0 50%;
                max-width: 50%;
                padding-right: 15px;
                padding-left: 15px;
            }
            /* 标题样式 */
            .header-title {
                color: #495057;
                margin-bottom: 30px;
                text-align: center;
                font-size: 2rem;
                font-weight: 300;
            }
            /* 状态图标 */
            .status-icon {
                font-size: 3rem;
                margin-bottom: 15px;
                text-align: center;
            }
            /* 徽章样式 */
            .badge {
                display: inline-block;
                padding: 0.35em 0.65em;
                font-size: 0.75em;
                font-weight: 700;
                line-height: 1;
                color: #fff;
                text-align: center;
                white-space: nowrap;
                vertical-align: baseline;
                border-radius: 0.375rem;
            }
            /* 按钮样式 */
            .btn {
                display: inline-block;
                font-weight: 400;
                line-height: 1.5;
                color: #212529;
                text-align: center;
                text-decoration: none;
                vertical-align: middle;
                cursor: pointer;
                user-select: none;
                background-color: transparent;
                border: 1px solid transparent;
                padding: 0.375rem 0.75rem;
                font-size: 1rem;
                border-radius: 0.375rem;
                transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
            }
            .btn-outline-secondary {
                color: #6c757d;
                border-color: #6c757d;
            }
            .btn-outline-secondary:hover {
                color: #fff;
                background-color: #6c757d;
                border-color: #6c757d;
            }
            .btn-primary {
                color: #fff;
                background-color: #0d6efd;
                border-color: #0d6efd;
            }
            .btn-primary:hover {
                color: #fff;
                background-color: #0b5ed7;
                border-color: #0a58ca;
            }
            /* 刷新按钮 */
            .refresh-btn {
                position: absolute;
                top: 20px;
                right: 20px;
            }
            /* 页脚样式 */
            .footer {
                text-align: center;
                margin-top: 30px;
                color: #6c757d;
                font-size: 0.9rem;
            }
            .timestamp {
                font-size: 0.8rem;
                color: #6c757d;
            }
            /* 小文本样式 */
            .text-muted {
                color: #6c757d !important;
            }
            .text-primary {
                color: #0d6efd !important;
            }
            .small {
                font-size: 0.875em;
            }
            /* 错误页面样式 */
            .error-container {
                max-width: 800px;
                margin: 100px auto;
                padding: 30px;
                background-color: #fff;
                border-radius: 10px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                text-align: center;
            }
            .error-icon {
                font-size: 5rem;
                color: #dc3545;
                margin-bottom: 20px;
            }
            .error-title {
                color: #dc3545;
                margin-bottom: 20px;
            }
            .error-message {
                background-color: #f8d7da;
                border-left: 4px solid #dc3545;
                padding: 15px;
                margin: 20px 0;
                text-align: left;
                border-radius: 0 5px 5px 0;
            }
            .refresh-btn {
                margin-top: 20px;
            }
            /* 响应式设计 */
            @media (max-width: 768px) {
                .col-md-4 {
                    flex: 0 0 100%;
                    max-width: 100%;
                }
                .col-sm-6 {
                    flex: 0 0 100%;
                    max-width: 100%;
                }
                .health-container {
                    margin: 20px auto;
                    padding: 20px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="health-container">
                <button class="btn btn-outline-secondary refresh-btn" onclick="location.reload()">
                    ↻ 刷新
                </button>
                
                <h1 class="header-title">
                    ❤️ 系统健康状态监控
                </h1>
                
                <div class="row">
                    <div class="col-md-4 mb-4">
                        <div class="card h-100">
                            <div class="card-body text-center">
                                <div class="status-icon" style="color: ${statusColor}">
                                    🗄️
                                </div>
                                <h5 class="card-title">数据库连接</h5>
                                <p class="card-text">
                                    <span class="badge" style="background-color: ${statusColor}">${statusText}</span>
                                </p>
                                <p class="card-text">
                                    <small class="text-muted">${config.db.name} @ ${config.db.host}:${config.db.port}</small>
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4 mb-4">
                        <div class="card h-100">
                            <div class="card-body text-center">
                                <div class="status-icon" style="color: ${wsStatusColor}">
                                    📶
                                </div>
                                <h5 class="card-title">WebSocket服务</h5>
                                <p class="card-text">
                                    <span class="badge" style="background-color: ${wsStatusColor}">${wsStatus}</span>
                                </p>
                                <p class="card-text">
                                    <small class="text-muted">当前连接数: ${wsStats.totalConnections}</small>
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-4 mb-4">
                        <div class="card h-100">
                            <div class="card-body text-center">
                                <div class="status-icon" style="color: ${envColor}">
                                    ⚙️
                                </div>
                                <h5 class="card-title">运行环境</h5>
                                <p class="card-text">
                                    <span class="badge" style="background-color: ${envColor}">${config.nodeEnv.toUpperCase()}</span>
                                </p>
                                <p class="card-text">
                                    <small class="text-muted">端口: ${config.port}</small>
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card mt-4">
                    <div class="card-header">
                        ℹ️ 系统信息
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-sm-6">
                                <p><strong>服务器时间:</strong> ${new Date().toLocaleString('zh-CN')}</p>
                                <p><strong>系统版本:</strong> 宿舍费用分摊记账系统 v1.0.0</p>
                            </div>
                            <div class="col-sm-6">
                                <p><strong>Node.js版本:</strong> ${process.version}</p>
                                <p><strong>平台:</strong> ${process.platform}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="footer">
                    <p class="timestamp">最后更新: ${new Date().toISOString()}</p>
                    <p>© 2024 宿舍费用分摊记账系统 - 健康监控页面</p>
                </div>
            </div>
        </div>
        
        <script>
            // 每30秒自动刷新一次页面
            setTimeout(function() {
                location.reload();
            }, 30000);
        </script>
    </body>
    </html>
    `;
    
    res.status(200).header('Content-Type', 'text/html').send(html);
  } catch (error) {
    logger.error('Health check failed:', error);
    
    // 总是返回美观的错误页面
    const errorHtml = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>系统状态异常 - 宿舍费用分摊记账系统</title>
        <style>
            /* 基础样式 */
            * {
                box-sizing: border-box;
            }
            body {
                margin: 0;
                padding: 0;
                background-color: #f8f9fa;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                color: #212529;
                line-height: 1.6;
            }
            .container {
                width: 100%;
                max-width: 1200px;
                margin: 0 auto;
                padding: 0 15px;
            }
            .error-container {
                max-width: 800px;
                margin: 100px auto;
                padding: 30px;
                background-color: #fff;
                border-radius: 10px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                text-align: center;
            }
            .error-icon {
                font-size: 5rem;
                color: #dc3545;
                margin-bottom: 20px;
            }
            .error-title {
                color: #dc3545;
                margin-bottom: 20px;
            }
            .error-message {
                background-color: #f8d7da;
                border-left: 4px solid #dc3545;
                padding: 15px;
                margin: 20px 0;
                text-align: left;
                border-radius: 0 5px 5px 0;
            }
            .refresh-btn {
                margin-top: 20px;
            }
            /* 按钮样式 */
            .btn {
                display: inline-block;
                font-weight: 400;
                line-height: 1.5;
                color: #212529;
                text-align: center;
                text-decoration: none;
                vertical-align: middle;
                cursor: pointer;
                user-select: none;
                background-color: transparent;
                border: 1px solid transparent;
                padding: 0.375rem 0.75rem;
                font-size: 1rem;
                border-radius: 0.375rem;
                transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
            }
            .btn-primary {
                color: #fff;
                background-color: #0d6efd;
                border-color: #0d6efd;
            }
            .btn-primary:hover {
                color: #fff;
                background-color: #0b5ed7;
                border-color: #0a58ca;
            }
            .text-muted {
                color: #6c757d !important;
            }
            .small {
                font-size: 0.875em;
            }
            .lead {
                font-size: 1.25rem;
                font-weight: 300;
            }
            .mt-4 {
                margin-top: 1.5rem;
            }
        </style>
        <style>
            body {
                background-color: #f8f9fa;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            .error-container {
                max-width: 800px;
                margin: 100px auto;
                padding: 30px;
                background-color: #fff;
                border-radius: 10px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                text-align: center;
            }
            .error-icon {
                font-size: 5rem;
                color: #dc3545;
                margin-bottom: 20px;
            }
            .error-title {
                color: #dc3545;
                margin-bottom: 20px;
            }
            .error-message {
                background-color: #f8d7da;
                border-left: 4px solid #dc3545;
                padding: 15px;
                margin: 20px 0;
                text-align: left;
                border-radius: 0 5px 5px 0;
            }
            .refresh-btn {
                margin-top: 20px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="error-container">
                <div class="error-icon">
                    ⚠️
                </div>
                <h1 class="error-title">系统状态检测异常</h1>
                <p class="lead">在检查系统健康状态时遇到了问题</p>
                
                <div class="error-message">
                    <strong>错误信息:</strong> ${error.message}
                </div>
                
                <p>系统可能正在启动或遇到临时问题。请稍后再试。</p>
                
                <button class="btn btn-primary refresh-btn" onclick="location.reload()">
                    ↻ 重新检查
                </button>
                
                <div class="mt-4">
                    <small class="text-muted">错误时间: ${new Date().toLocaleString('zh-CN')}</small>
                </div>
            </div>
        </div>
        
        <script>
            // 每30秒自动刷新一次页面
            setTimeout(function() {
                location.reload();
            }, 30000);
        </script>
    </body>
    </html>
    `;
    
    res.status(500).header('Content-Type', 'text/html').send(errorHtml);
  }
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
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
app.use('/api/mfa', mfaRoutes);

// 404处理中间件
app.use(notFoundHandler);

// 全局错误处理中间件
app.use(errorHandler);

// 主页路由
app.get('/', (req, res) => {
  res.json({
    message: '欢迎使用宿舍费用分摊记账系统',
    environment: config.nodeEnv,
    database: config.db.name
  });
});

// 测试数据库连接
async function startServer() {
  try {
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
    server.listen(PORT, () => {
      logger.info(`服务器在 ${config.nodeEnv} 环境中启动，监听端口 ${PORT}`);
      logger.info(`使用数据库: ${config.db.name}`);
      
      // 初始化WebSocket
      console.log('初始化WebSocket...');
      websocketManager.init(server);
      
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
  } catch (error) {
    console.error('服务器启动失败:', error);
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 添加未捕获异常处理器
process.on('uncaughtException', (error) => {
  console.error('未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
  process.exit(1);
});

// 启动服务器（非测试环境）
console.log('检查环境配置:', config.nodeEnv);
console.log('config.nodeEnv !== \'test\':', config.nodeEnv !== 'test');
if (config.nodeEnv !== 'test') {
  console.log('准备启动服务器...');
  console.log('即将调用startServer函数...');
  startServer().then(() => {
    console.log('startServer函数执行完成');
  }).catch(error => {
    console.error('启动服务器时捕获到未处理的错误:', error);
    process.exit(1);
  });
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
  process.exit(0);
});