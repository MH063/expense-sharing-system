/**
 * 增强的应用入口文件
 * 展示如何使用增强的安全功能
 */

const express = require('express');
const { logger, secureLoggerMiddleware } = require('./config/secure-logger');
const { initializeEncryption } = require('./config/data-encryption');
const { initializeVault } = require('./config/vault');
const { dbService } = require('./config/enhanced-database');
const EnhancedTokenManager = require('./middleware/enhanced-tokenManager');
const { authenticateToken, authorizeRoles } = require('./middleware/enhanced-auth-middleware');
const EnhancedUserController = require('./controllers/enhanced-user-controller');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 使用安全日志中间件
app.use(secureLoggerMiddleware);

// 初始化安全组件
async function initializeSecurityComponents() {
  try {
    // 1. 初始化加密模块
    const encryptionInitialized = await initializeEncryption();
    if (!encryptionInitialized) {
      throw new Error('加密模块初始化失败');
    }

    // 2. 初始化Vault服务（如果可用）
    try {
      await initializeVault();
      logger.info('Vault服务初始化成功');
    } catch (error) {
      logger.warn('Vault服务初始化失败，将使用本地密钥管理:', error.message);
    }

    // 3. 初始化数据库服务
    await dbService.initialize();
    logger.info('数据库服务初始化成功');

    logger.info('所有安全组件初始化完成');
    return true;
  } catch (error) {
    logger.error('安全组件初始化失败:', error.message);
    return false;
  }
}

// 健康检查端点
app.get('/health', async (req, res) => {
  try {
    // 检查数据库连接
    const dbStatus = await dbService.query('SELECT NOW()');
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: dbStatus.rows[0].now,
      encryption: 'enabled',
      authentication: 'RS256'
    });
  } catch (error) {
    logger.error('健康检查失败:', error.message);
    res.status(500).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});

// 用户注册端点（使用加密存储）
app.post('/api/users/register', async (req, res) => {
  try {
    const result = await EnhancedUserController.register(req, res);
    return result;
  } catch (error) {
    logger.error('用户注册失败:', error.message);
    res.status(500).json({ success: false, message: '注册失败' });
  }
});

// 管理员登录端点（使用增强的Token管理）
app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const result = await EnhancedUserController.adminLogin(req, res);
    return result;
  } catch (error) {
    logger.error('管理员登录失败:', error.message);
    res.status(500).json({ success: false, message: '登录失败' });
  }
});

// 用户登录端点（使用增强的Token管理）
app.post('/api/auth/login', async (req, res) => {
  try {
    const result = await EnhancedUserController.login(req, res);
    return result;
  } catch (error) {
    logger.error('用户登录失败:', error.message);
    res.status(500).json({ success: false, message: '登录失败' });
  }
});

// 刷新Token端点（使用增强的Token管理）
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const result = await EnhancedUserController.refreshToken(req, res);
    return result;
  } catch (error) {
    logger.error('Token刷新失败:', error.message);
    res.status(500).json({ success: false, message: 'Token刷新失败' });
  }
});

// 获取用户详情端点（需要认证）
app.get('/api/users/profile', authenticateToken, async (req, res) => {
  try {
    const result = await EnhancedUserController.getUserDetails(req, res);
    return result;
  } catch (error) {
    logger.error('获取用户详情失败:', error.message);
    res.status(500).json({ success: false, message: '获取用户详情失败' });
  }
});

// 用户登出端点（需要认证）
app.post('/api/auth/logout', authenticateToken, async (req, res) => {
  try {
    const result = await EnhancedUserController.logout(req, res);
    return result;
  } catch (error) {
    logger.error('用户登出失败:', error.message);
    res.status(500).json({ success: false, message: '登出失败' });
  }
});

// 管理员专用端点（需要管理员角色）
app.get('/api/admin/dashboard', authenticateToken, authorizeRoles(['admin']), (req, res) => {
  res.json({
    success: true,
    message: '欢迎访问管理员仪表板',
    data: {
      user: req.user,
      timestamp: new Date().toISOString()
    }
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  logger.error('未处理的错误:', err.message, { stack: err.stack });
  res.status(500).json({
    success: false,
    message: '服务器内部错误'
  });
});

// 404处理中间件
app.use((req, res) => {
  logger.warn(`未找到的路由: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: '未找到请求的资源'
  });
});

// 启动服务器
async function startServer() {
  try {
    // 初始化安全组件
    const securityInitialized = await initializeSecurityComponents();
    if (!securityInitialized) {
      throw new Error('安全组件初始化失败');
    }

    // 启动服务器
    app.listen(PORT, () => {
      logger.info(`服务器已启动，端口: ${PORT}`);
      logger.info(`健康检查端点: http://localhost:${PORT}/health`);
      logger.info('安全功能已启用:');
      logger.info('- JWT签名算法: RS256 (非对称加密)');
      logger.info('- 密钥管理: 集中化管理 (Vault/本地)');
      logger.info('- 自动密钥轮换: 已启用');
      logger.info('- 数据加密: AES-256-GCM');
      logger.info('- 日志脱敏: 已启用');
    });
  } catch (error) {
    logger.error('服务器启动失败:', error.message);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGINT', async () => {
  logger.info('收到SIGINT信号，开始优雅关闭...');
  
  try {
    await dbService.close();
    logger.info('数据库连接已关闭');
    
    process.exit(0);
  } catch (error) {
    logger.error('优雅关闭失败:', error.message);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  logger.info('收到SIGTERM信号，开始优雅关闭...');
  
  try {
    await dbService.close();
    logger.info('数据库连接已关闭');
    
    process.exit(0);
  } catch (error) {
    logger.error('优雅关闭失败:', error.message);
    process.exit(1);
  }
});

// 启动应用
startServer().catch(error => {
  logger.error('应用启动失败:', error.message);
  process.exit(1);
});

module.exports = app;