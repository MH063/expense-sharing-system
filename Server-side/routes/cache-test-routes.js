/**
 * 缓存测试路由
 * 用于测试Redis缓存功能
 */

const express = require('express');
const router = express.Router();
const { logger } = require('../config/logger');
const { isRedisConnected } = require('../config/redis');

// 测试Redis连接状态
router.get('/status', (req, res) => {
  try {
    const redisConnected = isRedisConnected();
    res.json({
      success: true,
      data: {
        redisConnected,
        message: redisConnected ? 'Redis已连接' : 'Redis未连接'
      }
    });
  } catch (error) {
    logger.error('获取Redis状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取Redis状态失败'
    });
  }
});

// 测试缓存读写
router.post('/test', async (req, res) => {
  try {
    const { key, value, ttl = 60 } = req.body;
    
    if (!key || !value) {
      return res.status(400).json({
        success: false,
        message: '缺少必要参数: key, value'
      });
    }
    
    // 这里可以添加实际的Redis缓存测试逻辑
    // 由于当前Redis可能未配置，我们只返回模拟结果
    
    res.json({
      success: true,
      data: {
        key,
        value,
        ttl,
        message: '缓存测试成功（模拟）'
      }
    });
  } catch (error) {
    logger.error('缓存测试失败:', error);
    res.status(500).json({
      success: false,
      message: '缓存测试失败'
    });
  }
});

module.exports = router;