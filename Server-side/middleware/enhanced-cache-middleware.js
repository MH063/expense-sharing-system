/**
 * 增强版缓存中间件
 * 使用增强版缓存服务实现更高效的缓存策略
 */

const enhancedCacheService = require('../services/enhanced-cache-service');
const { logger } = require('../config/logger');

/**
 * 生成智能缓存键
 * @param {string} prefix - 缓存键前缀
 * @param {Object} req - 请求对象
 * @returns {string} 缓存键
 */
const generateSmartCacheKey = (prefix, req) => {
  // 包含路径、查询参数和用户ID（如果已认证）
  const path = req.originalUrl || req.url;
  const params = JSON.stringify(req.query);
  const userId = req.user && req.user.id ? req.user.id : 'anonymous';
  
  // 使用哈希避免过长的键名
  const paramsHash = require('crypto')
    .createHash('md5')
    .update(`${path}:${params}`)
    .digest('hex');
  
  return `${prefix}:${userId}:${paramsHash}`;
};

/**
 * 获取缓存中间件（增强版）
 * @param {string} prefix - 缓存键前缀
 * @param {Object} options - 缓存选项
 * @returns {Function} Express中间件函数
 */
const getSmartCache = (prefix, options = {}) => {
  // 默认选项
  const {
    ttl = 1800,           // 默认30分钟
    tags = [],             // 缓存标签
    condition = null,      // 缓存条件函数
    keyGenerator = null,   // 自定义键生成器
    varyOn = [],           // 根据请求头变化的字段
    skipCache = false      // 是否跳过缓存
  } = options;
  
  return async (req, res, next) => {
    try {
      // 检查是否跳过缓存
      if (skipCache || req.method !== 'GET') {
        return next();
      }
      
      // 检查缓存条件
      if (condition && !condition(req)) {
        return next();
      }
      
      // 生成缓存键
      const cacheKey = keyGenerator 
        ? keyGenerator(req, prefix) 
        : generateSmartCacheKey(prefix, req);
      
      // 尝试从缓存获取数据
      const cachedData = await enhancedCacheService.get(cacheKey);
      
      if (cachedData) {
        logger.debug(`智能缓存命中: ${cacheKey}`);
        return res.json({
          success: true,
          data: cachedData,
          cached: true,
          timestamp: Date.now()
        });
      }
      
      // 如果缓存中没有数据，继续处理请求
      logger.debug(`智能缓存未命中: ${cacheKey}`);
      
      // 保存原始的res.json方法
      const originalJson = res.json;
      
      // 重写res.json方法，以便在响应时缓存数据
      res.json = function(data) {
        // 只缓存成功的响应
        if (data && data.success && data.data) {
          // 异步缓存数据，不阻塞响应
          enhancedCacheService.set(cacheKey, data.data, ttl, tags).catch(err => {
            logger.error('智能缓存数据失败:', err);
          });
        }
        
        // 调用原始的json方法
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      logger.error('智能缓存中间件错误:', error);
      next();
    }
  };
};

/**
 * 智能清除缓存中间件
 * @param {string|Array<string>} patterns - 缓存键模式或标签
 * @param {Object} options - 清除选项
 * @returns {Function} Express中间件函数
 */
const smartClearCache = (patterns, options = {}) => {
  const { useTags = true, delay = 0 } = options;
  
  return async (req, res, next) => {
    try {
      // 在请求处理完成后清除缓存
      const originalJson = res.json;
      
      res.json = function(data) {
        // 只在成功的响应后清除缓存
        if (data && data.success) {
          // 延迟清除缓存（可选）
          const clearFunc = async () => {
            try {
              if (Array.isArray(patterns)) {
                // 批量清除
                for (const pattern of patterns) {
                  if (useTags) {
                    await enhancedCacheService.delByTag(pattern);
                  } else {
                    await enhancedCacheService.delPattern(pattern);
                  }
                }
              } else {
                // 单个清除
                if (useTags) {
                  await enhancedCacheService.delByTag(patterns);
                } else {
                  await enhancedCacheService.delPattern(patterns);
                }
              }
            } catch (err) {
              logger.error('智能清除缓存失败:', err);
            }
          };
          
          if (delay > 0) {
            setTimeout(clearFunc, delay);
          } else {
            // 异步清除缓存，不阻塞响应
            clearFunc();
          }
        }
        
        // 调用原始的json方法
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      logger.error('智能清除缓存中间件错误:', error);
      next();
    }
  };
};

/**
 * 条件缓存中间件
 * 根据请求条件决定是否使用缓存
 * @param {Function} condition - 条件函数，接收req参数，返回布尔值
 * @param {string} prefix - 缓存键前缀
 * @param {Object} options - 缓存选项
 * @returns {Function} Express中间件函数
 */
const conditionalCache = (condition, prefix, options = {}) => {
  return getSmartCache(prefix, {
    ...options,
    condition: (req) => condition(req)
  });
};

/**
 * 用户相关的智能缓存中间件
 */
const smartUserCache = {
  // 获取用户信息缓存
  getUser: getSmartCache('user', {
    ttl: 3600, // 1小时
    tags: ['user'],
    // 根据用户ID变化
    varyOn: ['x-user-id']
  }),
  
  // 获取用户房间列表缓存
  getUserRooms: getSmartCache('user:rooms', {
    ttl: 1800, // 30分钟
    tags: ['user', 'room']
  }),
  
  // 清除用户相关缓存
  clearUser: smartClearCache(['user'], { useTags: true }),
  
  // 清除特定用户的缓存
  clearSpecificUser: (userId) => smartClearCache([`user:${userId}`], { useTags: true })
};

/**
 * 账单相关的智能缓存中间件
 */
const smartBillCache = {
  // 获取账单信息缓存
  getBills: getSmartCache('bills', {
    ttl: 1800, // 30分钟
    tags: ['bill'],
    // 根据房间ID和状态变化
    varyOn: ['x-room-id', 'x-bill-status']
  }),
  
  // 获取账单详情缓存
  getBillDetail: getSmartCache('bill:detail', {
    ttl: 1800, // 30分钟
    tags: ['bill']
  }),
  
  // 获取账单统计缓存
  getBillStats: getSmartCache('bill:stats', {
    ttl: 900, // 15分钟
    tags: ['bill', 'stats']
  }),
  
  // 清除账单相关缓存
  clearBills: smartClearCache(['bill'], { useTags: true }),
  
  // 清除特定房间的账单缓存
  clearRoomBills: (roomId) => smartClearCache([`bill:room:${roomId}`], { useTags: true })
};

/**
 * 房间相关的智能缓存中间件
 */
const smartRoomCache = {
  // 获取房间信息缓存
  getRooms: getSmartCache('rooms', {
    ttl: 1800, // 30分钟
    tags: ['room']
  }),
  
  // 获取房间成员缓存
  getRoomMembers: getSmartCache('room:members', {
    ttl: 1800, // 30分钟
    tags: ['room', 'user']
  }),
  
  // 清除房间相关缓存
  clearRooms: smartClearCache(['room'], { useTags: true }),
  
  // 清除特定房间的缓存
  clearSpecificRoom: (roomId) => smartClearCache([`room:${roomId}`], { useTags: true })
};

/**
 * 统计相关的智能缓存中间件
 */
const smartStatsCache = {
  // 获取统计数据缓存
  getStats: getSmartCache('stats', {
    ttl: 900, // 15分钟
    tags: ['stats']
  }),
  
  // 获取用户统计缓存
  getUserStats: getSmartCache('stats:user', {
    ttl: 900, // 15分钟
    tags: ['stats', 'user']
  }),
  
  // 获取房间统计缓存
  getRoomStats: getSmartCache('stats:room', {
    ttl: 900, // 15分钟
    tags: ['stats', 'room']
  }),
  
  // 清除统计相关缓存
  clearStats: smartClearCache(['stats'], { useTags: true })
};

/**
 * 缓存统计中间件
 * 返回缓存统计信息
 */
const cacheStats = (req, res) => {
  try {
    const stats = enhancedCacheService.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('获取缓存统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取缓存统计失败'
    });
  }
};

/**
 * 重置缓存统计中间件
 */
const resetCacheStats = (req, res) => {
  try {
    enhancedCacheService.resetStats();
    res.json({
      success: true,
      message: '缓存统计已重置'
    });
  } catch (error) {
    logger.error('重置缓存统计失败:', error);
    res.status(500).json({
      success: false,
      message: '重置缓存统计失败'
    });
  }
};

module.exports = {
  getSmartCache,
  smartClearCache,
  conditionalCache,
  smartUserCache,
  smartBillCache,
  smartRoomCache,
  smartStatsCache,
  cacheStats,
  resetCacheStats
};