/**
 * 监控指标路由
 * 提供系统性能指标和监控数据的API端点
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth-middleware');
const { collectApplicationMetrics } = require('../services/enhanced-metrics');
const { logger } = require('../config/logger');

// 所有监控指标路由都需要身份验证
router.use(authenticateToken);

/**
 * 获取综合监控指标
 * GET /api/metrics
 */
router.get('/', async (req, res) => {
  try {
    // 收集应用性能指标
    const metrics = await collectApplicationMetrics();
    
    // 确保返回的数据结构与前端期望的格式匹配
    const formattedMetrics = {
      api: metrics.api || {},
      cache: metrics.cache || {},
      security: metrics.security || {},
      systemResources: metrics.systemResources || {}
    };
    
    return res.json({
      success: true,
      data: formattedMetrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('获取监控指标失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取监控指标失败',
      error: error.message
    });
  }
});

/**
 * 获取API性能指标
 * GET /api/metrics/api
 */
router.get('/api', async (req, res) => {
  try {
    const { timeRange = '1h' } = req.query;
    
    // 收集API性能指标
    const metrics = await collectApplicationMetrics();
    
    return res.json({
      success: true,
      data: metrics.api || {},
      timeRange,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('获取API性能指标失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取API性能指标失败',
      error: error.message
    });
  }
});

/**
 * 获取缓存指标
 * GET /api/metrics/cache
 */
router.get('/cache', async (req, res) => {
  try {
    // 收集缓存指标
    const metrics = await collectApplicationMetrics();
    
    return res.json({
      success: true,
      data: metrics.cache || {},
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('获取缓存指标失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取缓存指标失败',
      error: error.message
    });
  }
});

/**
 * 获取安全指标
 * GET /api/metrics/security
 */
router.get('/security', async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    
    // 收集安全指标
    const metrics = await collectApplicationMetrics();
    
    return res.json({
      success: true,
      data: metrics.security || {},
      timeRange,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('获取安全指标失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取安全指标失败',
      error: error.message
    });
  }
});

/**
 * 获取系统资源指标
 * GET /api/metrics/system
 */
router.get('/system', async (req, res) => {
  try {
    // 收集系统资源指标
    const metrics = await collectApplicationMetrics();
    
    return res.json({
      success: true,
      data: metrics.systemResources || {},
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('获取系统资源指标失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取系统资源指标失败',
      error: error.message
    });
  }
});

/**
 * 获取历史指标数据
 * GET /api/metrics/history
 */
router.get('/history', async (req, res) => {
  try {
    const { metric, timeRange = '24h', interval = '1h' } = req.query;
    
    if (!metric) {
      return res.status(400).json({
        success: false,
        message: 'metric参数是必需的'
      });
    }
    
    // 这里可以根据metric类型从数据库或缓存中获取历史数据
    // 目前返回空数组，实际项目中应该从时序数据库中查询
    const historyData = [];
    
    return res.json({
      success: true,
      data: {
        metric,
        timeRange,
        interval,
        data: historyData
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('获取历史指标数据失败:', error);
    return res.status(500).json({
      success: false,
      message: '获取历史指标数据失败',
      error: error.message
    });
  }
});

module.exports = router;