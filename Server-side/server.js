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
const { standardResponseMiddleware } = require('./middleware/responseHandler');
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



// 404错误处理中间件（必须在所有路由之后）
app.use(notFoundHandler);

// 全局错误处理中间件（必须在所有其他中间件和路由之后）
app.use(errorHandler);

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
    
    // 总是返回美观的HTML页面，不再根据Accept头判断
    const statusColor = dbConnected ? '#28a745' : '#dc3545';
    const statusText = dbConnected ? '正常' : '异常';
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
            /* 实时更新状态指示器 */
            .live-indicator {
                display: inline-flex;
                align-items: center;
                font-size: 0.8rem;
                color: #28a745;
                margin-left: 10px;
            }
            .live-dot {
                width: 8px;
                height: 8px;
                background-color: #28a745;
                border-radius: 50%;
                margin-right: 5px;
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
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
                <h1 class="header-title">
                    ❤️ 系统健康状态监控
                    <span class="live-indicator">
                        <span class="live-dot"></span>
                        实时监控中
                    </span>
                </h1>
                
                <div style="text-align: center; margin-bottom: 20px;">
                    <a href="/" class="btn btn-primary">🏠 返回首页</a>
                </div>
                
                <div class="row">
                    <div class="col-md-4 mb-4">
                        <div class="card h-100">
                            <div class="card-body text-center">
                                <div class="status-icon" style="color: ${statusColor}">
                                    🗄️
                                </div>
                                <h5 class="card-title">数据库连接</h5>
                                <p class="card-text">
                                    <span class="badge" style="background-color: ${statusColor}">${dbStatus}</span>
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
                                <p><strong>服务器时间:</strong> <span id="server-time">${new Date().toLocaleString('zh-CN')}</span></p>
                                <p><strong>系统版本:</strong> 宿舍费用分摊记账系统 v1.0.0</p>
                                <p><strong>操作系统:</strong> <span id="operating-system">${os.type()} ${os.arch()} ${os.release()}</span></p>
                                <p><strong>运行时间:</strong> <span id="uptime">${Math.floor(process.uptime())}秒</span></p>
                                  <p><strong>内存使用:</strong> <span id="memory-usage">${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB / ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB</span></p>
                                  <p><strong>CPU使用:</strong> <span id="cpu-usage">用户: ${Math.round(process.cpuUsage().user / 1000)}ms 系统: ${Math.round(process.cpuUsage().system / 1000)}ms</span></p>
                            </div>
                            <div class="col-sm-6">
                                <p><strong>Node.js版本:</strong> ${process.version}</p>
                                <p><strong>平台架构:</strong> ${process.arch}</p>
                                <p><strong>运行环境:</strong> ${config.nodeEnv.toUpperCase()}</p>
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
            // 实时更新服务器时间
            function updateServerTime() {
                const serverTimeElement = document.getElementById('server-time');
                if (serverTimeElement) {
                    // 总是使用本地时间更新，确保每秒都在变化
                    serverTimeElement.textContent = new Date().toLocaleString('zh-CN');
                    serverTimeElement.setAttribute('data-api-updated', 'false'); // 重置标记，允许下次API更新
                }
            }
            
            // 获取健康状态数据并更新页面
            async function fetchHealthData() {
                try {
                    console.log('正在获取健康数据...');
                    const response = await fetch('/api/health');
                    console.log('API响应状态:', response.status);
                    const data = await response.json();
                    
                    console.log('健康数据获取结果:', data);
                    console.log('数据成功状态:', data.success);
                    console.log('系统信息:', data.data.system);
                    
                    if (data.success) {
                        // 更新数据库状态
                        const dbBadgeElements = document.querySelectorAll('.card-body .badge');
                        if (dbBadgeElements[0]) {
                            dbBadgeElements[0].textContent = data.data.database.status === 'connected' ? '已连接' : '未连接';
                            dbBadgeElements[0].style.backgroundColor = data.data.database.status === 'connected' ? '#28a745' : '#dc3545';
                        }
                        
                        // 更新WebSocket状态
                        if (dbBadgeElements[1]) {
                            dbBadgeElements[1].textContent = data.data.websocket.status === 'active' ? '活动' : '未活动';
                            dbBadgeElements[1].style.backgroundColor = data.data.websocket.status === 'active' ? '#28a745' : '#ffc107';
                        }
                        
                        // 更新WebSocket连接数
                        const wsConnectionElement = document.querySelector('.col-md-4:nth-child(2) .card-text small');
                        if (wsConnectionElement) {
                            wsConnectionElement.textContent = '当前连接数: ' + data.data.websocket.connections;
                        }
                        
                        // 更新时间戳
                        const timestampElement = document.querySelector('.timestamp');
                        if (timestampElement) {
                            timestampElement.textContent = '最后更新: ' + data.data.timestamp;
                        }
                        
                        // 更新系统信息
                        if (data.data.system) {
                            console.log('更新系统信息:', data.data.system);
                            
                            // 更新服务器时间（使用API数据）
                            const serverTimeElement = document.getElementById('server-time');
                            if (serverTimeElement && data.data.system.serverTime) {
                                console.log('更新服务器时间:', data.data.system.serverTime);
                                serverTimeElement.textContent = data.data.system.serverTime;
                                serverTimeElement.setAttribute('data-api-updated', 'true');
                            }
                            
                            // 更新操作系统信息
                            const osElement = document.getElementById('operating-system');
                            if (osElement && data.data.system.os) {
                                console.log('更新操作系统信息:', data.data.system.os);
                                osElement.textContent = data.data.system.os;
                                console.log('操作系统信息已更新:', osElement.textContent);
                            } else {
                                console.error('无法找到操作系统元素或数据为空');
                            }
                            
                            // 更新运行时间
                            const uptimeElement = document.getElementById('uptime');
                            if (uptimeElement && data.data.system.uptime !== undefined) {
                                const uptimeSeconds = data.data.system.uptime || 0;
                                const hours = Math.floor(uptimeSeconds / 3600);
                                const minutes = Math.floor((uptimeSeconds % 3600) / 60);
                                const seconds = Math.floor(uptimeSeconds % 60);
                                const uptimeText = hours + '小时 ' + minutes + '分钟 ' + seconds + '秒';
                                console.log('更新运行时间:', uptimeText);
                                uptimeElement.textContent = uptimeText;
                                console.log('运行时间已更新:', uptimeElement.textContent);
                            } else {
                                console.error('无法找到运行时间元素或数据为空');
                            }
                            
                            // 更新内存使用情况
                            const memoryUsageElement = document.getElementById('memory-usage');
                            if (memoryUsageElement && data.data.system.memoryUsage) {
                                const memoryUsage = data.data.system.memoryUsage;
                                const usedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
                                const totalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
                                const memoryText = usedMB + 'MB / ' + totalMB + 'MB';
                                console.log('更新内存使用情况:', memoryText);
                                memoryUsageElement.textContent = memoryText;
                                console.log('内存使用情况已更新:', memoryUsageElement.textContent);
                            } else {
                                console.error('无法找到内存使用元素或数据为空');
                            }
                            
                            // 更新CPU使用情况
                            const cpuUsageElement = document.getElementById('cpu-usage');
                            if (cpuUsageElement && data.data.system.cpuUsage) {
                                const cpuUsage = data.data.system.cpuUsage;
                                const userMS = Math.round(cpuUsage.user / 1000);
                                const systemMS = Math.round(cpuUsage.system / 1000);
                                const cpuText = '用户: ' + userMS + 'ms 系统: ' + systemMS + 'ms';
                                console.log('更新CPU使用情况:', cpuText);
                                cpuUsageElement.textContent = cpuText;
                                console.log('CPU使用情况已更新:', cpuUsageElement.textContent);
                            } else {
                                console.error('无法找到CPU使用元素或数据为空');
                            }
                        } else {
                            console.error('系统信息数据为空');
                        }
                    } else {
                        console.error('健康数据获取失败，服务器返回错误:', data);
                    }
                } catch (error) {
                    console.error('获取健康数据失败:', error);
                }
            }
            
            // 每1秒更新一次服务器时间
            setInterval(updateServerTime, 1000);
            
            // 每5秒获取一次健康状态数据
            setInterval(fetchHealthData, 5000);
            
            // 页面加载完成后立即获取一次数据
            document.addEventListener('DOMContentLoaded', function() {
                console.log('页面加载完成，开始获取健康数据');
                fetchHealthData();
                // 立即开始更新时间
                updateServerTime();
            });
            
            // 立即执行一次（防止DOMContentLoaded事件未触发）
            console.log('脚本加载完成，立即获取健康数据');
            fetchHealthData(); // 直接调用，不使用setTimeout
            updateServerTime(); // 立即更新时间
            
            // 添加额外的备用调用
            setTimeout(fetchHealthData, 500);
            setTimeout(fetchHealthData, 1000);
        </script>
    </body>
    </html>
    `;
    
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Content-Security-Policy-Report-Only');
    const csp = "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; connect-src 'self' ws: wss:; font-src 'self' data: https://fonts.gstatic.com; worker-src 'self' blob:";
    res.setHeader('Content-Security-Policy', csp);
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
                
                <p>系统可能正在启动或遇到临时问题。页面将自动更新状态。</p>
                
                <div class="mt-4">
                    <small class="text-muted">错误时间: ${new Date().toLocaleString('zh-CN')}</small>
                </div>
            </div>
        </div>
        
        <script>
            // 页面加载后10秒尝试自动获取健康状态
            setTimeout(function() {
                fetch('/api/health')
                    .then(response => {
                        if (response.ok) {
                            location.reload();
                        }
                    })
                    .catch(() => {
                        // 忽略错误，继续等待
                    });
            }, 10000);
        </script>
    </body>
    </html>
    `;
    
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Content-Security-Policy-Report-Only');
    const csp = "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; connect-src 'self' ws: wss:; font-src 'self' data: https://fonts.gstatic.com; worker-src 'self' blob:";
    res.setHeader('Content-Security-Policy', csp);
    res.status(500).header('Content-Type', 'text/html').send(errorHtml);
  }
});

// 管理员页面
app.get('/admin', async (req, res) => {
  try {
    // 获取数据库状态 - 使用动态导入和错误处理
    let dbConnected = false;
    try {
      const { testConnection } = require('./config/db');
      dbConnected = await testConnection();
    } catch (error) {
      console.log('数据库连接检查失败:', error.message);
      dbConnected = false;
    }
    
    // 获取WebSocket状态 - 使用动态导入和错误处理
    let wsStats = {
      totalConnections: 0,
      activeConnections: 0,
      roomsCount: 0
    };
    try {
      const websocketManager = require('./services/websocketManager');
      if (websocketManager && typeof websocketManager.getStats === 'function') {
        wsStats = websocketManager.getStats();
      }
    } catch (error) {
      console.log('WebSocket状态检查失败:', error.message);
    }
    
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
        <title>管理员控制台 - 宿舍费用分摊记账系统</title>
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
            /* 管理员容器样式 */
            .admin-container {
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
                margin-right: 10px;
                margin-bottom: 10px;
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
            .btn-success {
                color: #fff;
                background-color: #198754;
                border-color: #198754;
            }
            .btn-success:hover {
                color: #fff;
                background-color: #157347;
                border-color: #146c43;
            }
            .btn-warning {
                color: #000;
                background-color: #ffc107;
                border-color: #ffc107;
            }
            .btn-warning:hover {
                color: #000;
                background-color: #ffca2c;
                border-color: #ffc720;
            }
            .btn-danger {
                color: #fff;
                background-color: #dc3545;
                border-color: #dc3545;
            }
            .btn-danger:hover {
                color: #fff;
                background-color: #bb2d3b;
                border-color: #b02a37;
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
            /* 实时更新状态指示器 */
            .live-indicator {
                display: inline-flex;
                align-items: center;
                font-size: 0.8rem;
                color: #28a745;
                margin-left: 10px;
            }
            .live-dot {
                width: 8px;
                height: 8px;
                background-color: #28a745;
                border-radius: 50%;
                margin-right: 5px;
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
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
            /* 导航菜单样式 */
            .nav-menu {
                background-color: #f8f9fa;
                border-radius: 8px;
                padding: 15px;
                margin-bottom: 20px;
            }
            .nav-title {
                font-weight: 600;
                margin-bottom: 10px;
                color: #495057;
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
                .admin-container {
                    margin: 20px auto;
                    padding: 20px;
                }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="admin-container">
                <h1 class="header-title">
                    🛠️ 管理员控制台
                    <span class="live-indicator">
                        <span class="live-dot"></span>
                        系统运行中
                    </span>
                </h1>
                
                <div style="text-align: center; margin-bottom: 20px;">
                    <a href="/" class="btn btn-primary">🏠 返回首页</a>
                    <a href="/health" class="btn btn-outline-secondary">📊 健康检查</a>
                </div>
                
                <div class="nav-menu">
                    <div class="nav-title">🔧 管理功能</div>
                    <div>
                        <a href="#" class="btn btn-primary" onclick="showUserManagement()">👥 用户管理</a>
                        <a href="#" class="btn btn-success" onclick="showSystemConfig()">⚙️ 系统配置</a>
                        <a href="#" class="btn btn-warning" onclick="showDataBackup()">💾 数据备份</a>
                        <a href="#" class="btn btn-danger" onclick="showSystemLogs()">📝 系统日志</a>
                    </div>
                </div>
                
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
                                <p><strong>服务器时间:</strong> <span id="server-time">${new Date().toLocaleString('zh-CN')}</span></p>
                                <p><strong>系统版本:</strong> 宿舍费用分摊记账系统 v1.0.0</p>
                                <p><strong>操作系统:</strong> <span id="operating-system">${os.type()} ${os.arch()} ${os.release()}</span></p>
                                <p><strong>运行时间:</strong> <span id="uptime">${Math.floor(process.uptime())}秒</span></p>
                                  <p><strong>内存使用:</strong> <span id="memory-usage">${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB / ${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB</span></p>
                                  <p><strong>CPU使用:</strong> <span id="cpu-usage">用户: ${Math.round(process.cpuUsage().user / 1000)}ms 系统: ${Math.round(process.cpuUsage().system / 1000)}ms</span></p>
                            </div>
                            <div class="col-sm-6">
                                <p><strong>Node.js版本:</strong> ${process.version}</p>
                                <p><strong>平台架构:</strong> ${process.arch}</p>
                                <p><strong>运行环境:</strong> ${config.nodeEnv.toUpperCase()}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="card mt-4" id="management-panel" style="display: none;">
                    <div class="card-header">
                        <span id="panel-title">管理面板</span>
                    </div>
                    <div class="card-body">
                        <div id="panel-content">
                            <!-- 动态内容将在这里显示 -->
                        </div>
                    </div>
                </div>
                
                <div class="footer">
                    <p class="timestamp">最后更新: ${new Date().toISOString()}</p>
                    <p>© 2024 宿舍费用分摊记账系统 - 管理员控制台</p>
                </div>
            </div>
        </div>
        
        <script>
            // 实时更新服务器时间
            function updateServerTime() {
                const serverTimeElement = document.getElementById('server-time');
                if (serverTimeElement) {
                    serverTimeElement.textContent = new Date().toLocaleString('zh-CN');
                    serverTimeElement.setAttribute('data-api-updated', 'false');
                }
            }
            
            // 获取健康状态数据并更新页面
            async function fetchHealthData() {
                try {
                    const response = await fetch('/api/health');
                    const data = await response.json();
                    
                    if (data.success) {
                        // 更新数据库状态
                        const dbBadgeElements = document.querySelectorAll('.card-body .badge');
                        if (dbBadgeElements[0]) {
                            dbBadgeElements[0].textContent = data.data.database.status === 'connected' ? '已连接' : '未连接';
                            dbBadgeElements[0].style.backgroundColor = data.data.database.status === 'connected' ? '#28a745' : '#dc3545';
                        }
                        
                        // 更新WebSocket状态
                        if (dbBadgeElements[1]) {
                            dbBadgeElements[1].textContent = data.data.websocket.status === 'active' ? '活动' : '未活动';
                            dbBadgeElements[1].style.backgroundColor = data.data.websocket.status === 'active' ? '#28a745' : '#ffc107';
                        }
                        
                        // 更新WebSocket连接数
                        const wsConnectionElement = document.querySelector('.col-md-4:nth-child(2) .card-text small');
                        if (wsConnectionElement) {
                            wsConnectionElement.textContent = '当前连接数: ' + data.data.websocket.connections;
                        }
                        
                        // 更新时间戳
                        const timestampElement = document.querySelector('.timestamp');
                        if (timestampElement) {
                            timestampElement.textContent = '最后更新: ' + data.data.timestamp;
                        }
                        
                        // 更新系统信息
                        if (data.data.system) {
                            // 更新服务器时间
                            const serverTimeElement = document.getElementById('server-time');
                            if (serverTimeElement && data.data.system.serverTime) {
                                serverTimeElement.textContent = data.data.system.serverTime;
                                serverTimeElement.setAttribute('data-api-updated', 'true');
                            }
                            
                            // 更新操作系统信息
                            const osElement = document.getElementById('operating-system');
                            if (osElement && data.data.system.os) {
                                osElement.textContent = data.data.system.os;
                            }
                            
                            // 更新运行时间
                            const uptimeElement = document.getElementById('uptime');
                            if (uptimeElement && data.data.system.uptime !== undefined) {
                                const uptimeSeconds = data.data.system.uptime || 0;
                                const hours = Math.floor(uptimeSeconds / 3600);
                                const minutes = Math.floor((uptimeSeconds % 3600) / 60);
                                const seconds = Math.floor(uptimeSeconds % 60);
                                const uptimeText = hours + '小时 ' + minutes + '分钟 ' + seconds + '秒';
                                uptimeElement.textContent = uptimeText;
                            }
                            
                            // 更新内存使用情况
                            const memoryUsageElement = document.getElementById('memory-usage');
                            if (memoryUsageElement && data.data.system.memoryUsage) {
                                const memoryUsage = data.data.system.memoryUsage;
                                const usedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
                                const totalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
                                const memoryText = usedMB + 'MB / ' + totalMB + 'MB';
                                memoryUsageElement.textContent = memoryText;
                            }
                            
                            // 更新CPU使用情况
                            const cpuUsageElement = document.getElementById('cpu-usage');
                            if (cpuUsageElement && data.data.system.cpuUsage) {
                                const cpuUsage = data.data.system.cpuUsage;
                                const userMS = Math.round(cpuUsage.user / 1000);
                                const systemMS = Math.round(cpuUsage.system / 1000);
                                const cpuText = '用户: ' + userMS + 'ms 系统: ' + systemMS + 'ms';
                                cpuUsageElement.textContent = cpuText;
                            }
                        }
                    }
                } catch (error) {
                    console.error('获取健康数据失败:', error);
                }
            }
            
            // 显示用户管理面板
            function showUserManagement() {
                const panel = document.getElementById('management-panel');
                const title = document.getElementById('panel-title');
                const content = document.getElementById('panel-content');
                
                title.textContent = '👥 用户管理';
                content.innerHTML = \`
                    <p>用户管理功能正在开发中...</p>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">用户统计</div>
                                <div class="card-body">
                                    <p><strong>总用户数:</strong> <span id="total-users">加载中...</span></p>
                                    <p><strong>活跃用户:</strong> <span id="active-users">加载中...</span></p>
                                    <p><strong>今日注册:</strong> <span id="today-users">加载中...</span></p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">快速操作</div>
                                <div class="card-body">
                                    <button class="btn btn-primary" onclick="refreshUserStats()">刷新统计</button>
                                    <button class="btn btn-warning">批量操作</button>
                                    <button class="btn btn-danger">用户封禁</button>
                                </div>
                            </div>
                        </div>
                    </div>
                \`;
                
                panel.style.display = 'block';
                refreshUserStats();
            }
            
            // 显示系统配置面板
            function showSystemConfig() {
                const panel = document.getElementById('management-panel');
                const title = document.getElementById('panel-title');
                const content = document.getElementById('panel-content');
                
                title.textContent = '⚙️ 系统配置';
                content.innerHTML = \`
                    <p>系统配置功能正在开发中...</p>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">基本配置</div>
                                <div class="card-body">
                                    <div class="mb-3">
                                        <label for="system-name" class="form-label">系统名称</label>
                                        <input type="text" class="form-control" id="system-name" value="宿舍费用分摊记账系统">
                                    </div>
                                    <div class="mb-3">
                                        <label for="max-users" class="form-label">最大用户数</label>
                                        <input type="number" class="form-control" id="max-users" value="100">
                                    </div>
                                    <button class="btn btn-primary">保存配置</button>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">高级配置</div>
                                <div class="card-body">
                                    <div class="mb-3">
                                        <label for="log-level" class="form-label">日志级别</label>
                                        <select class="form-control" id="log-level">
                                            <option value="error">错误</option>
                                            <option value="warn" selected>警告</option>
                                            <option value="info">信息</option>
                                            <option value="debug">调试</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label for="backup-frequency" class="form-label">备份频率</label>
                                        <select class="form-control" id="backup-frequency">
                                            <option value="daily">每日</option>
                                            <option value="weekly" selected>每周</option>
                                            <option value="monthly">每月</option>
                                        </select>
                                    </div>
                                    <button class="btn btn-primary">保存配置</button>
                                </div>
                            </div>
                        </div>
                    </div>
                \`;
                
                panel.style.display = 'block';
            }
            
            // 显示数据备份面板
            function showDataBackup() {
                const panel = document.getElementById('management-panel');
                const title = document.getElementById('panel-title');
                const content = document.getElementById('panel-content');
                
                title.textContent = '💾 数据备份';
                content.innerHTML = \`
                    <p>数据备份功能正在开发中...</p>
                    <div class="row">
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">备份状态</div>
                                <div class="card-body">
                                    <p><strong>上次备份:</strong> <span id="last-backup">2024-01-01 00:00:00</span></p>
                                    <p><strong>备份大小:</strong> <span id="backup-size">125 MB</span></p>
                                    <p><strong>备份文件数:</strong> <span id="backup-count">15</span></p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">备份操作</div>
                                <div class="card-body">
                                    <button class="btn btn-success">立即备份</button>
                                    <button class="btn btn-primary">计划备份</button>
                                    <button class="btn btn-warning">恢复备份</button>
                                    <button class="btn btn-danger">清理旧备份</button>
                                </div>
                            </div>
                        </div>
                    </div>
                \`;
                
                panel.style.display = 'block';
            }
            
            // 显示系统日志面板
            function showSystemLogs() {
                const panel = document.getElementById('management-panel');
                const title = document.getElementById('panel-title');
                const content = document.getElementById('panel-content');
                
                title.textContent = '📝 系统日志';
                content.innerHTML = \`
                    <p>系统日志功能正在开发中...</p>
                    <div class="row">
                        <div class="col-md-12">
                            <div class="card">
                                <div class="card-header">日志查看器</div>
                                <div class="card-body">
                                    <div class="mb-3">
                                        <label for="log-level-filter" class="form-label">日志级别</label>
                                        <select class="form-control" id="log-level-filter">
                                            <option value="all">全部</option>
                                            <option value="error">错误</option>
                                            <option value="warn">警告</option>
                                            <option value="info">信息</option>
                                            <option value="debug">调试</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <button class="btn btn-primary" onclick="refreshLogs()">刷新日志</button>
                                        <button class="btn btn-warning">清空日志</button>
                                        <button class="btn btn-success">下载日志</button>
                                    </div>
                                    <div class="log-container" style="height: 300px; overflow-y: auto; background-color: #f8f9fa; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 12px;">
                                        <div id="log-content">正在加载日志...</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                \`;
                
                panel.style.display = 'block';
                refreshLogs();
            }
            
            // 刷新用户统计
            function refreshUserStats() {
                // 模拟数据，实际应用中应该从API获取
                document.getElementById('total-users').textContent = Math.floor(Math.random() * 100) + 50;
                document.getElementById('active-users').textContent = Math.floor(Math.random() * 50) + 10;
                document.getElementById('today-users').textContent = Math.floor(Math.random() * 10) + 1;
            }
            
            // 刷新日志
            function refreshLogs() {
                const logContent = document.getElementById('log-content');
                if (logContent) {
                    // 模拟日志数据，实际应用中应该从API获取
                    const logs = [
                        '[2024-01-01 12:00:00] [INFO] 服务器启动成功',
                        '[2024-01-01 12:01:00] [INFO] 数据库连接已建立',
                        '[2024-01-01 12:02:00] [INFO] WebSocket服务已启动',
                        '[2024-01-01 12:03:00] [WARN] 检测到异常登录尝试',
                        '[2024-01-01 12:04:00] [INFO] 用户登录: user123',
                        '[2024-01-01 12:05:00] [ERROR] 数据库查询失败: 连接超时',
                        '[2024-01-01 12:06:00] [INFO] 数据库连接已恢复',
                        '[2024-01-01 12:07:00] [INFO] 定时任务执行完成'
                    ];
                    
                    logContent.innerHTML = logs.join('<br>');
                }
            }
            
            // 每1秒更新一次服务器时间
            setInterval(updateServerTime, 1000);
            
            // 每5秒获取一次健康状态数据
            setInterval(fetchHealthData, 5000);
            
            // 页面加载完成后立即获取一次数据
            document.addEventListener('DOMContentLoaded', function() {
                fetchHealthData();
                updateServerTime();
            });
            
            // 立即执行一次（防止DOMContentLoaded事件未触发）
            fetchHealthData();
            updateServerTime();
        </script>
    </body>
    </html>
    `;
    
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Content-Security-Policy-Report-Only');
    const csp = "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; connect-src 'self' ws: wss:; font-src 'self' data: https://fonts.gstatic.com; worker-src 'self' blob:";
    res.setHeader('Content-Security-Policy', csp);
    res.status(200).header('Content-Type', 'text/html').send(html);
  } catch (error) {
    logger.error('Admin page failed:', error);
    
    // 返回美观的错误页面
    const errorHtml = `
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>管理员页面错误 - 宿舍费用分摊记账系统</title>
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
    </head>
    <body>
        <div class="container">
            <div class="error-container">
                <div class="error-icon">
                    ⚠️
                </div>
                <h1 class="error-title">管理员页面加载失败</h1>
                <p class="lead">在加载管理员页面时遇到了问题</p>
                
                <div class="error-message">
                    <strong>错误信息:</strong> ${error.message}
                </div>
                
                <p>系统可能正在启动或遇到临时问题。页面将自动更新状态。</p>
                
                <div class="mt-4">
                    <a href="/" class="btn btn-primary">返回首页</a>
                    <a href="/health" class="btn btn-primary">健康检查</a>
                </div>
                
                <div class="mt-4">
                    <small class="text-muted">错误时间: ${new Date().toLocaleString('zh-CN')}</small>
                </div>
            </div>
        </div>
        
        <script>
            // 页面加载后10秒尝试自动重新加载
            setTimeout(function() {
                location.reload();
            }, 10000);
        </script>
    </body>
    </html>
    `;
    
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Content-Security-Policy-Report-Only');
    const csp = "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; connect-src 'self' ws: wss:; font-src 'self' data: https://fonts.gstatic.com; worker-src 'self' blob:";
    res.setHeader('Content-Security-Policy', csp);
    res.status(500).header('Content-Type', 'text/html').send(errorHtml);
  }
});

// 健康检查API端点 - 提供JSON格式的健康状态数据
app.get('/api/health', async (req, res) => {
  try {
    // 获取数据库状态 - 使用更快的检查方式
    let dbConnected = false;
    let dbConfig = { name: '未配置', host: '未配置', port: '未配置' };
    
    try {
      const { testConnection } = require('./config/db');
      dbConnected = await testConnection();
      dbConfig = {
        name: config.db.name,
        host: config.db.host,
        port: config.db.port
      };
    } catch (error) {
      console.log('数据库连接检查失败:', error.message);
    }
    
    // 获取WebSocket状态
    let wsStats = {
      totalConnections: 0,
      activeConnections: 0,
      roomsCount: 0
    };
    
    try {
      const wsManager = require('./config/websocket');
      if (wsManager) {
        wsStats = wsManager.getStats();
      }
    } catch (error) {
      console.log('WebSocket状态检查失败:', error.message);
    }
    
    // 获取系统信息 - 添加更精确的时间戳
    const now = new Date();
    const systemInfo = {
      serverTime: now.toLocaleString('zh-CN'),
      serverTimestamp: now.getTime(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };
    
    // 获取操作系统信息
    let osInfo = 'Unknown System';
    if (process.platform === 'win32') {
      osInfo = process.arch === 'x64' ? 'Windows 64-bit' : 'Windows 32-bit';
    } else if (process.platform === 'darwin') {
      osInfo = 'macOS';
    } else if (process.platform === 'linux') {
      osInfo = 'Linux';
    }
    
    // 返回健康状态数据 - 添加更精确的时间戳
    res.json({
      success: true,
      data: {
        database: {
          status: dbConnected ? 'connected' : 'disconnected',
          name: dbConfig.name,
          host: dbConfig.host,
          port: dbConfig.port,
          lastChecked: now.toISOString()
        },
        websocket: {
          status: wsStats.totalConnections > 0 ? 'active' : 'inactive',
          connections: wsStats.totalConnections,
          activeConnections: wsStats.activeConnections,
          roomsCount: wsStats.roomsCount,
          lastUpdated: now.toISOString()
        },
        environment: {
          mode: config.nodeEnv,
          port: config.port
        },
        system: {
          ...systemInfo,
          os: osInfo
        },
        timestamp: now.toISOString(),
        precision: '1-second'
      }
    });
  } catch (error) {
    logger.error('Health API check failed:', error);
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('Content-Security-Policy-Report-Only');
    const csp = "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; connect-src 'self' ws: wss:; font-src 'self' data: https://fonts.gstatic.com; worker-src 'self' blob:";
    res.setHeader('Content-Security-Policy', csp);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 404处理中间件
app.use(notFoundHandler);

// 全局错误处理中间件
app.use(errorHandler);

// 主页路由
app.get('/', (req, res) => {
  // 返回HTML页面而不是JSON数据
  res.send(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>寝室费用分摊记账系统</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .links {
            display: flex;
            gap: 20px;
            margin-top: 30px;
            flex-wrap: wrap;
        }
        .link-button {
            padding: 12px 24px;
            background: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 4px;
            transition: background 0.3s;
            display: inline-block;
        }
        .link-button:hover {
            background: #0056b3;
        }
        .status {
            padding: 15px;
            background: #e9ecef;
            border-radius: 4px;
            margin: 20px 0;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .status-indicator {
            display: inline-block;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 10px;
        }
        .status-ok {
            background-color: #28a745;
        }
        .status-error {
            background-color: #dc3545;
        }
        .status-checking {
            background-color: #ffc107;
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }
        .system-info {
            margin-top: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 4px;
            display: none;
        }
        .info-row {
            display: flex;
            margin-bottom: 8px;
        }
        .info-label {
            font-weight: bold;
            width: 150px;
        }
        .info-value {
            flex: 1;
        }
        .refresh-btn {
            background: #6c757d;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        .refresh-btn:hover {
            background: #5a6268;
        }
        .live-indicator {
            display: inline-flex;
            align-items: center;
            font-size: 0.8rem;
            color: #28a745;
            margin-left: 10px;
        }
        .live-dot {
            width: 8px;
            height: 8px;
            background-color: #28a745;
            border-radius: 50%;
            margin-right: 5px;
            animation: pulse 2s infinite;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>寝室费用分摊记账系统
            <span class="live-indicator">
                <span class="live-dot"></span>
                系统运行中
            </span>
        </h1>
        <p>欢迎使用寝室费用分摊记账系统！</p>
        
        <div class="status">
            <div>
                <strong>系统状态:</strong> 
                <span id="status-indicator" class="status-indicator status-checking"></span>
                <span id="status">正在检查服务状态...</span>
            </div>
            <button class="refresh-btn" onclick="checkSystemStatus()">刷新状态</button>
        </div>
        
        <div class="system-info" id="system-info">
            <h3>系统详细信息</h3>
            <div class="info-row">
                <div class="info-label">环境:</div>
                <div class="info-value" id="env-info">-</div>
            </div>
            <div class="info-row">
                <div class="info-label">数据库:</div>
                <div class="info-value" id="db-info">-</div>
            </div>
            <div class="info-row">
                <div class="info-label">服务器时间:</div>
                <div class="info-value" id="time-info">-</div>
            </div>
            <div class="info-row">
                <div class="info-label">运行时间:</div>
                <div class="info-value" id="uptime-info">-</div>
            </div>
            <div class="info-row">
                <div class="info-label">WebSocket:</div>
                <div class="info-value" id="ws-info">-</div>
            </div>
        </div>
        
        <div class="links">
            <a href="/client" class="link-button">用户端应用</a>
            <a href="/admin" class="link-button">管理后台</a>
            <a href="/health" class="link-button">API健康检查</a>
        </div>
    </div>

    <script>
        // 检查系统状态
        function checkSystemStatus() {
            const statusElement = document.getElementById('status');
            const statusIndicator = document.getElementById('status-indicator');
            const systemInfo = document.getElementById('system-info');
            
            // 重置状态
            statusElement.textContent = '正在检查服务状态...';
            statusIndicator.className = 'status-indicator status-checking';
            
            // 调用正确的API端点
            fetch('/api/health')
                .then(response => {
                    if (!response.ok) {
                        throw new Error('HTTP ' + response.status);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        // 更新状态显示
                        statusElement.textContent = '服务正常运行';
                        statusIndicator.className = 'status-indicator status-ok';
                        
                        // 显示系统详细信息
                        systemInfo.style.display = 'block';
                        
                        // 更新系统信息
                        document.getElementById('env-info').textContent = 
                            data.data.environment.mode + ' (端口: ' + data.data.environment.port + ')';
                        
                        document.getElementById('db-info').textContent = 
                            data.data.database.status === 'connected' ? 
                            '已连接 (' + data.data.database.name + '@' + data.data.database.host + ':' + data.data.database.port + ')' : 
                            '未连接';
                        
                        document.getElementById('time-info').textContent = 
                            data.data.system.serverTime;
                        
                        // 格式化运行时间
                        const uptime = data.data.system.uptime || 0;
                        const hours = Math.floor(uptime / 3600);
                        const minutes = Math.floor((uptime % 3600) / 60);
                        const seconds = Math.floor(uptime % 60);
                        document.getElementById('uptime-info').textContent = 
                            hours + '小时 ' + minutes + '分钟 ' + seconds + '秒';
                        
                        document.getElementById('ws-info').textContent = 
                            data.data.websocket.status === 'active' ? 
                            '活动 (' + data.data.websocket.connections + ' 个连接)' : 
                            '未活动';
                    } else {
                        throw new Error(data.error || '未知错误');
                    }
                })
                .catch(error => {
                    console.error('检查系统状态失败:', error);
                    statusElement.textContent = '后端服务不可用: ' + error.message;
                    statusIndicator.className = 'status-indicator status-error';
                    systemInfo.style.display = 'none';
                });
        }
        
        // 页面加载完成后立即检查状态
        document.addEventListener('DOMContentLoaded', checkSystemStatus);
        
        // 每30秒自动刷新一次状态
        setInterval(checkSystemStatus, 30000);
    </script>
</body>
</html>`);
});

// 测试数据库连接
async function startServer() {
  try {
    console.log('进入startServer函数...');
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