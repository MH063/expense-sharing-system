/**
 * 缓存管理路由
 * 处理缓存相关的API请求
 */

const express = require('express');
const router = express.Router();
const cacheController = require('../controllers/cache-management-controller');
const { authenticateToken } = require('../middleware/auth-middleware');
const { checkRole } = require('../middleware/permission-middleware');
const { roleAwareRateLimiter } = require('../middleware/rateLimiter');

/**
 * @route GET /api/cache/stats
 * @desc 获取缓存统计信息
 * @access 需要认证，仅管理员可访问
 */
router.get(
  '/stats',
  authenticateToken,
  checkRole(['admin']),
  roleAwareRateLimiter(100, 60), // 限制请求频率：每分钟最多100次
  cacheController.getCacheStats
);

/**
 * @route GET /api/cache/keys
 * @desc 获取所有缓存键
 * @access 需要认证，仅管理员可访问
 */
router.get(
  '/keys',
  authenticateToken,
  checkRole(['admin']),
  roleAwareRateLimiter(50, 60), // 限制请求频率：每分钟最多50次
  cacheController.getAllCacheKeys
);

/**
 * @route GET /api/cache/key/:key
 * @desc 获取指定键的缓存值
 * @access 需要认证，仅管理员可访问
 */
router.get(
  '/key/:key',
  authenticateToken,
  checkRole(['admin']),
  roleAwareRateLimiter(100, 60), // 限制请求频率：每分钟最多100次
  cacheController.getCacheValue
);

/**
 * @route POST /api/cache/key
 * @desc 设置缓存值
 * @access 需要认证，仅管理员可访问
 */
router.post(
  '/key',
  authenticateToken,
  checkRole(['admin']),
  roleAwareRateLimiter(50, 60), // 限制请求频率：每分钟最多50次
  cacheController.setCacheValue
);

/**
 * @route DELETE /api/cache/key/:key
 * @desc 删除指定键的缓存
 * @access 需要认证，仅管理员可访问
 */
router.delete(
  '/key/:key',
  authenticateToken,
  checkRole(['admin']),
  roleAwareRateLimiter(50, 60), // 限制请求频率：每分钟最多50次
  cacheController.deleteCacheKey
);

/**
 * @route POST /api/cache/clear
 * @desc 清空缓存
 * @access 需要认证，仅管理员可访问
 */
router.post(
  '/clear',
  authenticateToken,
  checkRole(['admin']),
  roleAwareRateLimiter(10, 60), // 限制请求频率：每分钟最多10次
  cacheController.clearCache
);

/**
 * @route POST /api/cache/clear-pattern
 * @desc 根据模式清空缓存
 * @access 需要认证，仅管理员可访问
 */
router.post(
  '/clear-pattern',
  authenticateToken,
  checkRole(['admin']),
  roleAwareRateLimiter(20, 60), // 限制请求频率：每分钟最多20次
  cacheController.clearCacheByPattern
);

/**
 * @route GET /api/cache/memory
 * @desc 获取内存使用情况
 * @access 需要认证，仅管理员可访问
 */
router.get(
  '/memory',
  authenticateToken,
  checkRole(['admin']),
  roleAwareRateLimiter(50, 60), // 限制请求频率：每分钟最多50次
  cacheController.getMemoryUsage
);

/**
 * @route POST /api/cache/warmup
 * @desc 预热缓存
 * @access 需要认证，仅管理员可访问
 */
router.post(
  '/warmup',
  authenticateToken,
  checkRole(['admin']),
  roleAwareRateLimiter(5, 60), // 限制请求频率：每分钟最多5次
  cacheController.warmupCache
);

/**
 * @route GET /api/cache/config
 * @desc 获取缓存配置
 * @access 需要认证，仅管理员可访问
 */
router.get(
  '/config',
  authenticateToken,
  checkRole(['admin']),
  roleAwareRateLimiter(50, 60), // 限制请求频率：每分钟最多50次
  cacheController.getCacheConfig
);

/**
 * @route PUT /api/cache/config
 * @desc 更新缓存配置
 * @access 需要认证，仅管理员可访问
 */
router.put(
  '/config',
  authenticateToken,
  checkRole(['admin']),
  roleAwareRateLimiter(10, 60), // 限制请求频率：每分钟最多10次
  cacheController.updateCacheConfig
);

/**
 * @route GET /api/cache/info
 * @desc 获取缓存服务器信息
 * @access 需要认证，仅管理员可访问
 */
router.get(
  '/info',
  authenticateToken,
  checkRole(['admin']),
  roleAwareRateLimiter(50, 60), // 限制请求频率：每分钟最多50次
  cacheController.getCacheInfo
);

/**
 * @route POST /api/cache/backup
 * @desc 备份缓存数据
 * @access 需要认证，仅管理员可访问
 */
router.post(
  '/backup',
  authenticateToken,
  checkRole(['admin']),
  roleAwareRateLimiter(5, 60), // 限制请求频率：每分钟最多5次
  cacheController.backupCache
);

/**
 * @route POST /api/cache/restore
 * @desc 恢复缓存数据
 * @access 需要认证，仅管理员可访问
 */
router.post(
  '/restore',
  authenticateToken,
  checkRole(['admin']),
  roleAwareRateLimiter(5, 60), // 限制请求频率：每分钟最多5次
  cacheController.restoreCache
);

/**
 * @route GET /api/cache/slow-logs
 * @desc 获取慢查询日志
 * @access 需要认证，仅管理员可访问
 */
router.get(
  '/slow-logs',
  authenticateToken,
  checkRole(['admin']),
  roleAwareRateLimiter(20, 60), // 限制请求频率：每分钟最多20次
  cacheController.getSlowLogs
);

/**
 * @route DELETE /api/cache/slow-logs
 * @desc 清空慢查询日志
 * @access 需要认证，仅管理员可访问
 */
router.delete(
  '/slow-logs',
  authenticateToken,
  checkRole(['admin']),
  roleAwareRateLimiter(5, 60), // 限制请求频率：每分钟最多5次
  cacheController.clearSlowLogs
);

/**
 * @route GET /api/cache/health
 * @desc 检查缓存健康状态
 * @access 需要认证，仅管理员可访问
 */
router.get(
  '/health',
  authenticateToken,
  checkRole(['admin']),
  roleAwareRateLimiter(100, 60), // 限制请求频率：每分钟最多100次
  cacheController.checkCacheHealth
);

module.exports = router;