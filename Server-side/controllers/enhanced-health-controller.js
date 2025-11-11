const os = require('os');
const { logger } = require('../config/logger');
const { pool, testConnection } = require('../config/db');
const { isRedisConnected, getRedisClient } = require('../config/redis');
const wsManager = require('../config/websocket');
const { collectSystemMetrics } = require('../services/enhanced-metrics');

/**
 * 增强健康检查控制器
 * 提供详细的系统状态信息和健康检查功能
 */

class EnhancedHealthController {
  /**
   * 基础健康检查
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async basicHealthCheck(req, res) {
    try {
      // 检查数据库连接
      let dbConnected = false;
      let dbStatus = '未配置';
      
      try {
        dbConnected = await testConnection();
        dbStatus = dbConnected ? '已连接' : '连接失败';
      } catch (dbError) {
        logger.warn('数据库连接检查失败:', dbError.message);
        dbStatus = '未配置';
      }
      
      // 检查WebSocket状态
      let wsStats = { totalConnections: 0 };
      let wsStatus = '未配置';
      
      try {
        wsStats = wsManager.getStats();
        wsStatus = wsStats.totalConnections >= 0 ? '正常' : '异常';
      } catch (wsError) {
        logger.warn('WebSocket状态检查失败:', wsError.message);
        wsStatus = '未配置';
      }
      
      // 检查Redis状态
      let redisStatus = '未配置';
      let redisConnected = false;
      
      try {
        redisConnected = isRedisConnected();
        redisStatus = redisConnected ? '已连接' : '未连接';
      } catch (redisError) {
        logger.warn('Redis连接检查失败:', redisError.message);
        redisStatus = '未配置';
      }
      
      // 返回基础健康状态
      return res.json({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          status: dbConnected && redisConnected ? 'healthy' : 'degraded',
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
      logger.error('基础健康检查失败:', error);
      return res.status(500).json({
        success: false,
        message: '健康检查失败',
        error: error.message
      });
    }
  }
  
  /**
   * 详细系统状态检查
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async detailedSystemStatus(req, res) {
    try {
      // 获取系统信息
      const systemInfo = {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime(),
        loadAverage: os.loadavg(),
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        cpus: os.cpus().length,
        cpuModel: os.cpus()[0]?.model || 'Unknown'
      };
      
      // 获取内存使用情况
      const memoryUsage = process.memoryUsage();
      const osMemory = {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        usagePercent: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
      };
      
      // 检查数据库详细信息
      let dbInfo = {
        status: 'unknown',
        connectionCount: 0,
        maxConnections: 0,
        version: 'unknown'
      };
      
      try {
        const dbClient = await pool.connect();
        try {
          // 获取数据库版本
          const versionResult = await dbClient.query('SELECT version()');
          const connectionResult = await dbClient.query('SELECT count(*) as count FROM pg_stat_activity');
          const maxConnectionsResult = await dbClient.query('SHOW max_connections');
          
          dbInfo = {
            status: 'connected',
            version: versionResult.rows[0].version,
            connectionCount: parseInt(connectionResult.rows[0].count),
            maxConnections: parseInt(maxConnectionsResult.rows[0].max_connections)
          };
        } finally {
          dbClient.release();
        }
      } catch (dbError) {
        logger.warn('数据库详细信息获取失败:', dbError.message);
        dbInfo.status = 'disconnected';
      }
      
      // 检查Redis详细信息
      let redisInfo = {
        status: 'unknown',
        version: 'unknown',
        connectedClients: 0,
        usedMemory: 0,
        uptime: 0
      };
      
      try {
        if (isRedisConnected()) {
          const redisClient = getRedisClient();
          const infoResult = await redisClient.info();
          
          // 解析Redis信息
          const infoLines = infoResult.split('\n');
          const infoMap = {};
          infoLines.forEach(line => {
            if (line.includes(':')) {
              const [key, value] = line.split(':');
              infoMap[key.trim()] = value.trim();
            }
          });
          
          redisInfo = {
            status: 'connected',
            version: infoMap.redis_version || 'unknown',
            connectedClients: parseInt(infoMap.connected_clients) || 0,
            usedMemory: parseInt(infoMap.used_memory) || 0,
            uptime: parseInt(infoMap.uptime_in_seconds) || 0
          };
        } else {
          redisInfo.status = 'disconnected';
        }
      } catch (redisError) {
        logger.warn('Redis详细信息获取失败:', redisError.message);
        redisInfo.status = 'error';
      }
      
      // 获取WebSocket详细信息
      const wsStats = wsManager.getStats();
      
      // 获取磁盘使用情况
      let diskInfo = {
        total: 0,
        used: 0,
        free: 0,
        usagePercent: 0
      };
      
      try {
        // 在Windows上使用fs模块获取磁盘信息
        const fs = require('fs');
        const rootPath = process.platform === 'win32' ? 'C:' : '/';
        const diskStats = fs.statSync(rootPath);
        // 注意：Node.js在Windows上无法直接获取磁盘总大小，这里只是一个示例
        diskInfo = {
          total: 0,
          used: 0,
          free: 0,
          usagePercent: 0
        };
      } catch (diskError) {
        logger.warn('磁盘信息获取失败:', diskError.message);
      }
      
      // 返回详细系统状态
      return res.json({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          system: systemInfo,
          memory: {
            process: memoryUsage,
            os: osMemory
          },
          cpu: {
            usage: process.cpuUsage(),
            loadAverage: os.loadavg()
          },
          database: dbInfo,
          redis: redisInfo,
          websocket: wsStats,
          disk: diskInfo,
          process: {
            pid: process.pid,
            uptime: process.uptime(),
            versions: process.versions,
            config: process.config
          }
        }
      });
    } catch (error) {
      logger.error('详细系统状态检查失败:', error);
      return res.status(500).json({
        success: false,
        message: '详细系统状态检查失败',
        error: error.message
      });
    }
  }
  
  /**
   * 服务依赖健康检查
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async serviceDependenciesCheck(req, res) {
    try {
      const dependencies = {};
      
      // 检查数据库
      try {
        const dbConnected = await testConnection();
        dependencies.database = {
          status: dbConnected ? 'healthy' : 'unhealthy',
          responseTime: 'N/A'
        };
      } catch (error) {
        dependencies.database = {
          status: 'unhealthy',
          error: error.message
        };
      }
      
      // 检查Redis
      try {
        const redisConnected = isRedisConnected();
        dependencies.redis = {
          status: redisConnected ? 'healthy' : 'unhealthy',
          responseTime: 'N/A'
        };
      } catch (error) {
        dependencies.redis = {
          status: 'unhealthy',
          error: error.message
        };
      }
      
      // 检查WebSocket
      try {
        const wsStats = wsManager.getStats();
        dependencies.websocket = {
          status: wsStats.totalConnections >= 0 ? 'healthy' : 'unhealthy',
          connections: wsStats.totalConnections
        };
      } catch (error) {
        dependencies.websocket = {
          status: 'unhealthy',
          error: error.message
        };
      }
      
      // 计算整体状态
      const allHealthy = Object.values(dependencies).every(dep => dep.status === 'healthy');
      
      return res.json({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          overallStatus: allHealthy ? 'healthy' : 'degraded',
          dependencies
        }
      });
    } catch (error) {
      logger.error('服务依赖健康检查失败:', error);
      return res.status(500).json({
        success: false,
        message: '服务依赖健康检查失败',
        error: error.message
      });
    }
  }
  
  /**
   * 性能指标检查
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async performanceMetricsCheck(req, res) {
    try {
      // 收集系统指标
      const metrics = await collectSystemMetrics();
      
      // 获取Node.js进程指标
      const processMetrics = {
        memory: process.memoryUsage(),
        cpu: process.cpuUsage(),
        uptime: process.uptime()
      };
      
      // 获取操作系统指标
      const osMetrics = {
        loadAverage: os.loadavg(),
        freeMemory: os.freemem(),
        totalMemory: os.totalmem(),
        uptime: os.uptime()
      };
      
      return res.json({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          process: processMetrics,
          os: osMetrics,
          system: metrics
        }
      });
    } catch (error) {
      logger.error('性能指标检查失败:', error);
      return res.status(500).json({
        success: false,
        message: '性能指标检查失败',
        error: error.message
      });
    }
  }
  
  /**
   * 健康检查页面
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async healthCheckPage(req, res) {
    try {
      // 获取健康检查数据
      const healthData = {
        timestamp: new Date().toISOString(),
        status: 'unknown'
      };
      
      // 尝试获取基础健康检查数据
      try {
        const dbConnected = await testConnection();
        const redisConnected = isRedisConnected();
        healthData.status = dbConnected && redisConnected ? 'healthy' : 'degraded';
      } catch (error) {
        healthData.status = 'unhealthy';
      }
      
      // 返回HTML页面
      const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>系统健康检查</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            padding: 30px;
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 30px;
        }
        .status-card {
            background-color: #f8f9fa;
            border-radius: 6px;
            padding: 20px;
            margin-bottom: 20px;
            border-left: 4px solid #007bff;
        }
        .status-card.healthy {
            border-left-color: #28a745;
        }
        .status-card.degraded {
            border-left-color: #ffc107;
        }
        .status-card.unhealthy {
            border-left-color: #dc3545;
        }
        .status-item {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
        }
        .status-item:last-child {
            border-bottom: none;
        }
        .status-label {
            font-weight: 500;
        }
        .status-value {
            font-weight: 600;
        }
        .status-value.healthy {
            color: #28a745;
        }
        .status-value.degraded {
            color: #ffc107;
        }
        .status-value.unhealthy {
            color: #dc3545;
        }
        .refresh-btn {
            display: block;
            margin: 20px auto;
            padding: 12px 24px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        }
        .refresh-btn:hover {
            background-color: #0056b3;
        }
        .last-updated {
            text-align: center;
            color: #666;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>系统健康检查</h1>
        <div class="status-card ${healthData.status}">
            <div class="status-item">
                <span class="status-label">系统状态:</span>
                <span class="status-value ${healthData.status}">${healthData.status === 'healthy' ? '健康' : healthData.status === 'degraded' ? '降级' : '不健康'}</span>
            </div>
            <div class="status-item">
                <span class="status-label">检查时间:</span>
                <span class="status-value">${new Date().toLocaleString('zh-CN')}</span>
            </div>
        </div>
        <button class="refresh-btn" onclick="location.reload()">刷新状态</button>
        <div class="last-updated">最后更新: ${new Date().toLocaleString('zh-CN')}</div>
    </div>
</body>
</html>
      `;
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(html);
    } catch (error) {
      logger.error('健康检查页面生成失败:', error);
      return res.status(500).send('健康检查页面生成失败');
    }
  }
}

module.exports = new EnhancedHealthController();