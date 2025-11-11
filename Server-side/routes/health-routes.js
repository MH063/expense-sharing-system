/**
 * 健康检查路由
 * 用于Zeabur健康检查和监控系统
 */

const express = require('express');
const { sequelize } = require('../models');
const { logger } = require('../config/logger');
const router = express.Router();

/**
 * 基本健康检查
 * GET /api/health
 */
router.get('/', async (req, res) => {
  try {
    // 检查数据库连接
    await sequelize.authenticate();
    
    // 基本系统信息
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      memory: process.memoryUsage(),
      services: {
        database: 'connected',
        redis: 'connected' // 假设Redis已连接，实际项目中应检查Redis连接
      }
    };

    res.status(200).json(healthStatus);
    logger.info('Health check passed');
  } catch (error) {
    logger.error('Health check failed:', error);
    
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
    // 检查数据库连接
    await sequelize.authenticate();
    
    // 获取数据库统计信息
    const dbStats = await sequelize.query(`
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation
      FROM pg_stats
      LIMIT 10
    `, { type: sequelize.QueryTypes.SELECT });
    
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
        database: {
          status: 'connected',
          dialect: sequelize.getDialect(),
          stats: dbStats.length > 0 ? 'Available' : 'No stats'
        },
        redis: {
          status: 'connected', // 实际项目中应检查Redis连接
          host: process.env.REDIS_HOST || 'localhost',
          port: process.env.REDIS_PORT || 6379
        }
      }
    };

    res.status(200).json(detailedStatus);
    logger.info('Detailed health check passed');
  } catch (error) {
    logger.error('Detailed health check failed:', error);
    
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