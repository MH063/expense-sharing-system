/**
 * 智能缓存中间件
 * 根据请求类型和数据特性自动应用缓存策略
 */

const enhancedCacheService = require('../services/enhanced-cache-service');
const { DEFAULT_TTL, CACHE_TAGS, getTaggedCacheKey } = require('../config/cache-config');
const { logger } = require('../config/logger');

/**
 * 智能缓存中间件类
 */
class SmartCacheMiddleware {
  constructor() {
    // 请求模式与缓存配置的映射
    this.requestPatterns = {
      // 用户相关请求
      'user:profile': {
        ttl: DEFAULT_TTL.USER_INFO,
        tags: [CACHE_TAGS.USER],
        keyGenerator: (req) => `user:profile:${req.user.id}`,
        condition: (req) => req.user && req.user.id
      },
      'user:rooms': {
        ttl: DEFAULT_TTL.ROOM_LIST,
        tags: [CACHE_TAGS.USER, CACHE_TAGS.ROOM],
        keyGenerator: (req) => `user:rooms:${req.user.id}`,
        condition: (req) => req.user && req.user.id
      },
      
      // 账单相关请求
      'bill:list': {
        ttl: DEFAULT_TTL.BILL_LIST,
        tags: [CACHE_TAGS.BILL],
        keyGenerator: (req) => {
          const { roomId, page = 1, limit = 10, status } = req.query;
          let key = `bill:list:room:${roomId}:page:${page}:limit:${limit}`;
          if (status) key += `:status:${status}`;
          return key;
        },
        condition: (req) => req.query.roomId
      },
      'bill:detail': {
        ttl: DEFAULT_TTL.BILL_DETAIL,
        tags: [CACHE_TAGS.BILL],
        keyGenerator: (req) => `bill:detail:${req.params.id}`,
        condition: (req) => req.params.id
      },
      
      // 统计相关请求
      'stats:user': {
        ttl: DEFAULT_TTL.STATS,
        tags: [CACHE_TAGS.STATS, CACHE_TAGS.USER],
        keyGenerator: (req) => `stats:user:${req.user.id}`,
        condition: (req) => req.user && req.user.id
      },
      'stats:room': {
        ttl: DEFAULT_TTL.STATS,
        tags: [CACHE_TAGS.STATS, CACHE_TAGS.ROOM],
        keyGenerator: (req) => `stats:room:${req.query.roomId}`,
        condition: (req) => req.query.roomId
      },
      
      // 房间相关请求
      'room:detail': {
        ttl: DEFAULT_TTL.ROOM_INFO,
        tags: [CACHE_TAGS.ROOM],
        keyGenerator: (req) => `room:detail:${req.params.id}`,
        condition: (req) => req.params.id
      },
      'room:members': {
        ttl: DEFAULT_TTL.USER_LIST,
        tags: [CACHE_TAGS.ROOM, CACHE_TAGS.USER],
        keyGenerator: (req) => `room:members:${req.params.id}`,
        condition: (req) => req.params.id
      }
    };
    
    // 缓存排除规则（不缓存的请求）
    this.excludePatterns = [
      /\/auth\//,           // 认证相关
      /\/admin\//,          // 管理员操作
      /\/bill\/create/,     // 创建账单
      /\/bill\/update/,     // 更新账单
      /\/bill\/delete/,     // 删除账单
      /\/user\/update/,     // 更新用户信息
      /\/room\/create/,     // 创建房间
      /\/room\/update/,     // 更新房间
      /\/room\/delete/      // 删除房间
    ];
  }

  /**
   * 检查请求是否应该被缓存
   * @param {Object} req - Express请求对象
   * @returns {boolean} 是否应该缓存
   */
  shouldCache(req) {
    // 检查排除规则
    for (const pattern of this.excludePatterns) {
      if (pattern.test(req.path)) {
        return false;
      }
    }
    
    // 只缓存GET请求
    if (req.method !== 'GET') {
      return false;
    }
    
    return true;
  }

  /**
   * 根据请求路径匹配缓存配置
   * @param {Object} req - Express请求对象
   * @returns {Object|null} 缓存配置或null
   */
  matchPattern(req) {
    const path = req.path;
    
    // 尝试精确匹配
    if (this.requestPatterns[path]) {
      return this.requestPatterns[path];
    }
    
    // 尝试模糊匹配
    for (const [pattern, config] of Object.entries(this.requestPatterns)) {
      const patternParts = pattern.split(':');
      const pathParts = path.split('/');
      
      if (patternParts.length === 2 && pathParts.length >= 2) {
        const [resource, action] = patternParts;
        
        if (pathParts.includes(resource)) {
          // 检查是否匹配特定操作
          if (action === 'detail' && pathParts[pathParts.length - 1] && !isNaN(pathParts[pathParts.length - 1])) {
            return config;
          } else if (action === 'list' && path.includes(resource)) {
            return config;
          } else if (pathParts.includes(action)) {
            return config;
          }
        }
      }
    }
    
    return null;
  }

  /**
   * 生成缓存键
   * @param {Object} req - Express请求对象
   * @param {Object} config - 缓存配置
   * @returns {string} 缓存键
   */
  generateCacheKey(req, config) {
    if (config.keyGenerator) {
      return config.keyGenerator(req);
    }
    
    // 默认键生成策略
    const keyParts = [
      req.method.toLowerCase(),
      req.path.replace(/\//g, ':'),
      JSON.stringify(req.query)
    ];
    
    return keyParts.join(':');
  }

  /**
   * 智能缓存中间件
   * @param {Object} options - 选项
   * @returns {Function} Express中间件函数
   */
  middleware(options = {}) {
    return async (req, res, next) => {
      // 检查是否应该缓存
      if (!this.shouldCache(req)) {
        return next();
      }
      
      // 匹配缓存配置
      const config = this.matchPattern(req);
      if (!config) {
        return next();
      }
      
      // 检查条件
      if (config.condition && !config.condition(req)) {
        return next();
      }
      
      // 生成缓存键
      const cacheKey = this.generateCacheKey(req, config);
      
      try {
        // 尝试从缓存获取数据
        const cachedData = await enhancedCacheService.get(cacheKey);
        
        if (cachedData) {
          logger.debug(`缓存命中: ${cacheKey}`);
          return res.json(cachedData);
        }
        
        // 缓存未命中，继续处理请求
        logger.debug(`缓存未命中: ${cacheKey}`);
        
        // 拦截响应
        const originalJson = res.json;
        res.json = function(data) {
          // 只缓存成功响应
          if (res.statusCode >= 200 && res.statusCode < 300) {
            enhancedCacheService.set(cacheKey, data, config.ttl, config.tags)
              .catch(error => logger.error(`设置缓存失败: ${cacheKey}`, error));
          }
          
          return originalJson.call(this, data);
        };
        
        next();
      } catch (error) {
        logger.error(`缓存中间件错误: ${cacheKey}`, error);
        next();
      }
    };
  }

  /**
   * 清除特定标签的缓存
   * @param {string} tag - 缓存标签
   * @returns {Promise<number>} 清除的缓存数量
   */
  async clearCacheByTag(tag) {
    return await enhancedCacheService.delByTag(tag);
  }

  /**
   * 清除用户相关缓存
   * @param {number} userId - 用户ID
   * @returns {Promise<number>} 清除的缓存数量
   */
  async clearUserCache(userId) {
    const keys = [
      `user:profile:${userId}`,
      `user:rooms:${userId}`,
      `stats:user:${userId}`
    ];
    
    let count = 0;
    for (const key of keys) {
      const result = await enhancedCacheService.del(key);
      if (result) count++;
    }
    
    return count;
  }

  /**
   * 清除房间相关缓存
   * @param {number} roomId - 房间ID
   * @returns {Promise<number>} 清除的缓存数量
   */
  async clearRoomCache(roomId) {
    const keys = [
      `room:detail:${roomId}`,
      `room:members:${roomId}`,
      `stats:room:${roomId}`
    ];
    
    let count = 0;
    for (const key of keys) {
      const result = await enhancedCacheService.del(key);
      if (result) count++;
    }
    
    // 清除账单列表缓存（包含该房间的账单）
    await this.clearCacheByTag(CACHE_TAGS.BILL);
    
    return count;
  }

  /**
   * 清除账单相关缓存
   * @param {number} billId - 账单ID
   * @param {number} roomId - 房间ID
   * @returns {Promise<number>} 清除的缓存数量
   */
  async clearBillCache(billId, roomId) {
    const keys = [
      `bill:detail:${billId}`
    ];
    
    let count = 0;
    for (const key of keys) {
      const result = await enhancedCacheService.del(key);
      if (result) count++;
    }
    
    // 清除账单列表缓存
    await this.clearCacheByTag(CACHE_TAGS.BILL);
    
    // 清除房间统计缓存
    if (roomId) {
      await this.clearRoomCache(roomId);
    }
    
    return count;
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 缓存统计
   */
  getCacheStats() {
    return enhancedCacheService.getStats();
  }
}

// 创建单例实例
const smartCacheMiddleware = new SmartCacheMiddleware();

module.exports = smartCacheMiddleware;