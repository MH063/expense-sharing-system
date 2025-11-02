const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const winston = require('winston');
const http = require('http');

// 加载环境变量配置文件
const path = require('path');
const env = process.env.NODE_ENV || 'development';
require('dotenv').config({ path: path.resolve(__dirname, `.env.${env}`) });

// 导入数据库配置
const { pool, testConnection } = require('./config/db');

// 导入WebSocket管理器
const websocketManager = require('./config/websocket');

// 导入路由
const userRoutes = require('./routes/user-routes');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 4000;

// 创建HTTP服务器
const server = http.createServer(app);

// 中间件
app.use(helmet()); // 安全头部
app.use(cors()); // 跨域支持
app.use(express.json()); // JSON解析
app.use(express.urlencoded({ extended: true })); // URL编码解析

// 创建日志记录器
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// 健康检查端点
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    const wsStats = websocketManager.getStats();
    
    res.status(200).json({
      status: 'OK',
      environment: env,
      database: dbConnected ? 'Connected' : 'Disconnected',
      websocket: wsStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json({
      status: 'ERROR',
      environment: env,
      error: error.message
    });
  }
});

// API路由
app.use('/api/users', userRoutes);

// 主页路由
app.get('/', (req, res) => {
  res.json({
    message: '欢迎使用寝室费用分摊记账系统',
    environment: env,
    database: process.env.DB_NAME
  });
});

// 测试数据库连接
async function startServer() {
  try {
    // 测试数据库连接
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      logger.error('无法连接到数据库，服务器启动失败');
      process.exit(1);
    }
    
    // 启动服务器
    server.listen(PORT, () => {
      logger.info(`服务器在 ${env} 环境中启动，监听端口 ${PORT}`);
      logger.info(`使用数据库: ${process.env.DB_NAME}`);
      
      // 初始化WebSocket
      websocketManager.init(server);
    });
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer();

// 优雅关闭
process.on('SIGINT', async () => {
  logger.info('正在关闭服务器...');
  await pool.end();
  process.exit(0);
});