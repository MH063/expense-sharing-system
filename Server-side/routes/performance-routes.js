/**
 * 性能监控和统计路由
 * 提供API性能指标和统计数据
 */

const express = require('express');
const router = express.Router();
const performanceMonitorMiddleware = require('../middleware/performance-monitor-middleware');
const smartCacheMiddleware = require('../middleware/smart-cache-middleware');
const { authenticateToken, isAdmin } = require('../middleware/auth-middleware');
const { logger } = require('../config/logger');

// 获取API性能统计
router.get('/api-stats', authenticateToken, async (req, res) => {
  try {
    const { path } = req.query;
    const { duration = 60 } = req.query; // 默认统计60分钟
    
    // 验证参数
    if (isNaN(parseInt(duration)) || parseInt(duration) <= 0 || parseInt(duration) > 1440) {
      return res.status(400).json({
        success: false,
        message: 'duration参数必须是1-1440之间的整数（分钟）'
      });
    }
    
    // 如果指定了路径，获取特定API的统计
    if (path) {
      const stats = await performanceMonitorMiddleware.getApiStats(`/${path}`, parseInt(duration));
      
      if (!stats) {
        return res.status(404).json({
          success: false,
          message: '未找到指定API的统计数据'
        });
      }
      
      return res.json({
        success: true,
        data: stats
      });
    }
    
    // 否则返回所有API的概览统计
    // 这里可以扩展为获取所有API的统计列表
    return res.json({
      success: true,
      message: '请指定API路径获取详细统计信息'
    });
  } catch (error) {
    logger.error('获取API性能统计路由错误', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 获取慢查询列表（需要管理员权限）
router.get('/slow-queries', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    // 验证参数
    if (isNaN(parseInt(limit)) || parseInt(limit) <= 0 || parseInt(limit) > 200) {
      return res.status(400).json({
        success: false,
        message: 'limit参数必须是1-200之间的整数'
      });
    }
    
    // 获取慢查询列表
    const slowQueries = await performanceMonitorMiddleware.getSlowQueries(parseInt(limit));
    
    res.json({
      success: true,
      data: slowQueries
    });
  } catch (error) {
    logger.error('获取慢查询列表路由错误', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 获取API热度排行（需要管理员权限）
router.get('/api-heatmap', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { duration = 24, limit = 20 } = req.query;
    
    // 验证参数
    if (isNaN(parseInt(duration)) || parseInt(duration) <= 0 || parseInt(duration) > 168) {
      return res.status(400).json({
        success: false,
        message: 'duration参数必须是1-168之间的整数（小时）'
      });
    }
    
    if (isNaN(parseInt(limit)) || parseInt(limit) <= 0 || parseInt(limit) > 100) {
      return res.status(400).json({
        success: false,
        message: 'limit参数必须是1-100之间的整数'
      });
    }
    
    // 获取API热度排行
    const apiHeatmap = await performanceMonitorMiddleware.getApiHeatmap(
      parseInt(duration),
      parseInt(limit)
    );
    
    res.json({
      success: true,
      data: apiHeatmap
    });
  } catch (error) {
    logger.error('获取API热度排行路由错误', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 获取缓存统计信息（需要管理员权限）
router.get('/cache', authenticateToken, isAdmin, async (req, res) => {
  try {
    // 获取缓存统计
    const cacheStats = smartCacheMiddleware.getCacheStats();
    
    res.json({
      success: true,
      data: cacheStats
    });
  } catch (error) {
    logger.error('获取缓存统计路由错误', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 清除缓存（需要管理员权限）
router.delete('/cache', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { tag } = req.query;
    
    let clearedCount = 0;
    
    if (tag) {
      // 清除特定标签的缓存
      clearedCount = await smartCacheMiddleware.clearCacheByTag(tag);
    } else {
      // 这里可以扩展为清除所有缓存
      return res.status(400).json({
        success: false,
        message: '请指定要清除的缓存标签'
      });
    }
    
    res.json({
      success: true,
      message: `成功清除${clearedCount}个缓存项`,
      data: {
        clearedCount,
        tag
      }
    });
  } catch (error) {
    logger.error('清除缓存路由错误', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

// 获取系统性能概览（需要管理员权限）
router.get('/overview', authenticateToken, isAdmin, async (req, res) => {
  try {
    // 获取缓存统计
    const cacheStats = smartCacheMiddleware.getCacheStats();
    
    // 获取慢查询列表（最近10条）
    const slowQueries = await performanceMonitorMiddleware.getSlowQueries(10);
    
    // 获取API热度排行（最近24小时，前10名）
    const apiHeatmap = await performanceMonitorMiddleware.getApiHeatmap(24, 10);
    
    // 获取系统资源使用情况
    const systemStats = {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      nodeVersion: process.version,
      platform: process.platform
    };
    
    res.json({
      success: true,
      data: {
        cache: cacheStats,
        slowQueries,
        apiHeatmap,
        system: systemStats
      }
    });
  } catch (error) {
    logger.error('获取系统性能概览路由错误', error);
    res.status(500).json({
      success: false,
      message: '服务器内部错误'
    });
  }
});

module.exports = router;