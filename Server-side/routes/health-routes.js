/**
 * 健康检查路由
 * 用于Zeabur健康检查和监控系统
 */

const express = require('express');
const path = require('path');
const router = express.Router();

/**
 * 基本健康检查
 * GET /api/health
 */
router.get('/', async (req, res) => {
  try {
    // 简化健康检查，避免循环导入
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      memory: {
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`
      },
      services: {
        server: 'running',
        database: process.env.DB_HOST ? 'configured' : 'not configured'
      }
    };

    res.status(200).json(healthStatus);
  } catch (error) {
    const errorStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      environment: process.env.NODE_ENV || 'development'
    };
    
    res.status(503).json(errorStatus);
  }
});

/**
 * 详细健康检查
 * GET /api/health/detailed
 */
router.get('/detailed', async (req, res) => {
  try {
    // 检查数据库连接状态
    let dbStatus = 'unknown';
    try {
      // 直接创建临时连接检查数据库
      const { Sequelize } = require('sequelize');
      const tempSequelize = new Sequelize(
        process.env.DB_NAME || 'expense_dev',
        process.env.DB_USER || 'postgres',
        process.env.DB_PASSWORD || 'postgres',
        {
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 5432,
          dialect: 'postgres',
          logging: false
        }
      );
      
      await tempSequelize.authenticate();
      dbStatus = 'connected';
      await tempSequelize.close();
    } catch (dbError) {
      dbStatus = `error: ${dbError.message}`;
    }
    
    // 详细系统信息
    const detailedStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      memory: {
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
        external: `${Math.round(process.memoryUsage().external / 1024 / 1024)} MB`
      },
      cpu: {
        usage: process.cpuUsage()
      },
      services: {
        server: 'running',
        database: {
          status: dbStatus,
          host: process.env.DB_HOST || 'localhost',
          port: process.env.DB_PORT || 5432,
          database: process.env.DB_NAME || 'expense_dev',
          user: process.env.DB_USER || 'postgres'
        }
      },
      process: {
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };

    res.status(200).json(detailedStatus);
  } catch (error) {
    const errorStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      environment: process.env.NODE_ENV || 'development'
    };
    
    res.status(503).json(errorStatus);
  }
});

module.exports = router;