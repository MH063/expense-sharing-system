/**
 * 缓存管理API路由
 * 提供缓存管理和监控功能
 */

const express = require('express');
const enhancedCacheService = require('../services/enhanced-cache-service');
const CacheWarmupService = require('../services/cache-warmup-service');
const { authenticateToken, checkRole } = require('../middleware/auth-middleware');

const router = express.Router();

// 创建缓存预热服务实例
const cacheWarmupService = new CacheWarmupService();

/**
 * 获取缓存统计信息
 * GET /api/cache/stats
 */
router.get('/stats', authenticateToken, checkRole(['admin', 'system_admin']), async (req, res) => {
  try {
    const stats = enhancedCacheService.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取缓存统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取缓存统计失败',
      error: error.message
    });
  }
});

/**
 * 获取缓存命中率
 * GET /api/cache/hit-rate
 */
router.get('/hit-rate', authenticateToken, checkRole(['admin']), async (req, res) => {
  try {
    const hitRate = enhancedCacheService.getHitRate();
    
    res.json({
      success: true,
      data: {
        hitRate,
        hits: enhancedCacheService.getStats().hits,
        misses: enhancedCacheService.getStats().misses
      }
    });
  } catch (error) {
    console.error('获取缓存命中率失败:', error);
    res.status(500).json({
      success: false,
      message: '获取缓存命中率失败',
      error: error.message
    });
  }
});

/**
 * 获取热点数据
 * GET /api/cache/hot-keys
 */
router.get('/hot-keys', authenticateToken, checkRole(['admin']), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const hotKeys = enhancedCacheService.getHotKeys(limit);
    
    res.json({
      success: true,
      data: hotKeys
    });
  } catch (error) {
    console.error('获取热点数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取热点数据失败',
      error: error.message
    });
  }
});

/**
 * 清除指定缓存
 * DELETE /api/cache/key/:key
 */
router.delete('/key/:key', authenticateToken, checkRole(['admin']), async (req, res) => {
  try {
    const { key } = req.params;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        message: '请提供缓存键'
      });
    }
    
    const result = await enhancedCacheService.del(key);
    
    res.json({
      success: true,
      data: {
        key,
        deleted: result
      }
    });
  } catch (error) {
    console.error('清除缓存失败:', error);
    res.status(500).json({
      success: false,
      message: '清除缓存失败',
      error: error.message
    });
  }
});

/**
 * 按标签清除缓存
 * DELETE /api/cache/tag/:tag
 */
router.delete('/tag/:tag', authenticateToken, checkRole(['admin']), async (req, res) => {
  try {
    const { tag } = req.params;
    
    if (!tag) {
      return res.status(400).json({
        success: false,
        message: '请提供缓存标签'
      });
    }
    
    const result = await enhancedCacheService.delByTag(tag);
    
    res.json({
      success: true,
      data: {
        tag,
        deletedCount: result
      }
    });
  } catch (error) {
    console.error('按标签清除缓存失败:', error);
    res.status(500).json({
      success: false,
      message: '按标签清除缓存失败',
      error: error.message
    });
  }
});

/**
 * 按模式清除缓存
 * DELETE /api/cache/pattern/:pattern
 */
router.delete('/pattern/:pattern', authenticateToken, checkRole(['admin']), async (req, res) => {
  try {
    const { pattern } = req.params;
    
    if (!pattern) {
      return res.status(400).json({
        success: false,
        message: '请提供缓存模式'
      });
    }
    
    const result = await enhancedCacheService.delPattern(pattern);
    
    res.json({
      success: true,
      data: {
        pattern,
        deletedCount: result
      }
    });
  } catch (error) {
    console.error('按模式清除缓存失败:', error);
    res.status(500).json({
      success: false,
      message: '按模式清除缓存失败',
      error: error.message
    });
  }
});

/**
 * 清除所有缓存
 * DELETE /api/cache/all
 */
router.delete('/all', authenticateToken, checkRole(['admin']), async (req, res) => {
  try {
    const result = await enhancedCacheService.flushAll();
    
    res.json({
      success: true,
      data: {
        message: '所有缓存已清除',
        result
      }
    });
  } catch (error) {
    console.error('清除所有缓存失败:', error);
    res.status(500).json({
      success: false,
      message: '清除所有缓存失败',
      error: error.message
    });
  }
});

/**
 * 设置缓存
 * POST /api/cache/key
 */
router.post('/key', authenticateToken, checkRole(['admin']), async (req, res) => {
  try {
    const { key, value, ttl, tags } = req.body;
    
    if (!key || value === undefined) {
      return res.status(400).json({
        success: false,
        message: '请提供缓存键和值'
      });
    }
    
    const result = await enhancedCacheService.set(key, value, ttl, tags);
    
    res.json({
      success: true,
      data: {
        key,
        set: result
      }
    });
  } catch (error) {
    console.error('设置缓存失败:', error);
    res.status(500).json({
      success: false,
      message: '设置缓存失败',
      error: error.message
    });
  }
});

/**
 * 获取缓存值
 * GET /api/cache/key/:key
 */
router.get('/key/:key', authenticateToken, checkRole(['admin']), async (req, res) => {
  try {
    const { key } = req.params;
    
    if (!key) {
      return res.status(400).json({
        success: false,
        message: '请提供缓存键'
      });
    }
    
    const value = await enhancedCacheService.get(key);
    const exists = await enhancedCacheService.exists(key);
    const ttl = await enhancedCacheService.ttl(key);
    
    res.json({
      success: true,
      data: {
        key,
        exists,
        value,
        ttl
      }
    });
  } catch (error) {
    console.error('获取缓存值失败:', error);
    res.status(500).json({
      success: false,
      message: '获取缓存值失败',
      error: error.message
    });
  }
});

/**
 * 执行缓存预热
 * POST /api/cache/warmup
 */
router.post('/warmup', authenticateToken, checkRole(['admin']), async (req, res) => {
  try {
    const result = await cacheWarmupService.warmupCache();
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('缓存预热失败:', error);
    res.status(500).json({
      success: false,
      message: '缓存预热失败',
      error: error.message
    });
  }
});

/**
 * 获取缓存预热状态
 * GET /api/cache/warmup/status
 */
router.get('/warmup/status', authenticateToken, checkRole(['admin']), async (req, res) => {
  try {
    const status = cacheWarmupService.getWarmupStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('获取缓存预热状态失败:', error);
    res.status(500).json({
      success: false,
      message: '获取缓存预热状态失败',
      error: error.message
    });
  }
});

/**
 * 重置缓存统计
 * POST /api/cache/stats/reset
 */
router.post('/stats/reset', authenticateToken, checkRole(['admin']), async (req, res) => {
  try {
    enhancedCacheService.resetStats();
    
    res.json({
      success: true,
      message: '缓存统计已重置'
    });
  } catch (error) {
    console.error('重置缓存统计失败:', error);
    res.status(500).json({
      success: false,
      message: '重置缓存统计失败',
      error: error.message
    });
  }
});

/**
 * 获取缓存键列表
 * GET /api/cache/keys
 */
router.get('/keys', authenticateToken, checkRole(['admin']), async (req, res) => {
  try {
    const pattern = req.query.pattern || '*';
    const limit = parseInt(req.query.limit) || 100;
    
    // 使用Redis的SCAN命令获取键列表
    const redisClient = require('../config/redis').getRedisClient();
    const keys = [];
    
    let cursor = '0';
    do {
      const reply = await redisClient.scan(cursor, 'MATCH', pattern, 'COUNT', limit);
      cursor = reply[0];
      const batchKeys = reply[1];
      
      for (const key of batchKeys) {
        // 获取键的TTL
        const ttl = await redisClient.ttl(key);
        keys.push({
          key,
          ttl: ttl === -1 ? '永不过期' : `${ttl}秒`
        });
        
        if (keys.length >= limit) {
          break;
        }
      }
    } while (cursor !== '0' && keys.length < limit);
    
    res.json({
      success: true,
      data: {
        keys,
        count: keys.length,
        pattern
      }
    });
  } catch (error) {
    console.error('获取缓存键列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取缓存键列表失败',
      error: error.message
    });
  }
});

module.exports = router;