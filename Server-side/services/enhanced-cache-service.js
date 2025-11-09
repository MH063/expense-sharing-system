/**
 * 增强版缓存服务
 * 提供高级缓存策略，提高缓存命中率
 */

const { getRedisClient } = require('../config/redis');
const { DEFAULT_TTL, CACHE_TAGS, HOT_DATA_CONFIG, STATS_CONFIG, getTaggedCacheKey } = require('../config/cache-config');
const { logger } = require('../config/logger');
const crypto = require('crypto');

/**
 * 增强版缓存服务类
 */
class EnhancedCacheService {
  constructor() {
    // 使用配置文件中的默认TTL
    this.defaultTTLs = DEFAULT_TTL;
    
    // 缓存键前缀
    this.keyPrefix = 'expense_system:';
    
    // 缓存标签映射，用于批量清除相关缓存
    this.tagMap = new Map();
    
    // 热点数据缓存（访问频率高的数据）
    this.hotDataCache = new Map();
    
    // 使用配置文件中的热点数据配置
    this.hotDataConfig = HOT_DATA_CONFIG;
    
    // 缓存预热配置
    this.preloadConfig = {
      enabled: true,
      interval: 300000, // 5分钟检查一次
      maxRetries: 3
    };
    
    // 缓存统计
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
    
    // 启动缓存预热
    if (this.preloadConfig.enabled) {
      this.startPreloadInterval();
    }
  }

  /**
   * 获取完整的缓存键
   * @param {string} key - 原始键名
   * @returns {string} 完整的缓存键
   */
  getFullKey(key) {
    return `${this.keyPrefix}${key}`;
  }

  /**
   * 生成缓存键的哈希值（用于长键名）
   * @param {string} key - 原始键名
   * @returns {string} 哈希后的键名
   */
  hashKey(key) {
    return crypto.createHash('md5').update(key).digest('hex');
  }

  /**
   * 设置缓存（增强版）
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 过期时间（秒）
   * @param {Array<string>} tags - 缓存标签
   * @returns {Promise<boolean>} 操作是否成功
   */
  async set(key, value, ttl, tags = []) {
    try {
      const client = getRedisClient();
      const fullKey = this.getFullKey(key);
      const serializedValue = JSON.stringify(value);
      
      // 设置缓存
      if (ttl > 0) {
        await client.setEx(fullKey, ttl, serializedValue);
      } else {
        await client.set(fullKey, serializedValue);
      }
      
      // 处理标签
      if (tags.length > 0) {
        for (const tag of tags) {
          // 将键添加到标签集合中
          await client.sAdd(`${this.keyPrefix}tag:${tag}`, fullKey);
          
          // 记录标签映射
          if (!this.tagMap.has(tag)) {
            this.tagMap.set(tag, new Set());
          }
          this.tagMap.get(tag).add(fullKey);
        }
      }
      
      // 更新统计
      this.stats.sets++;
      
      logger.debug(`缓存设置成功: ${key}, TTL: ${ttl}秒, 标签: ${tags.join(',')}`);
      return true;
    } catch (error) {
      this.stats.errors++;
      logger.error(`设置缓存失败: ${key}`, error);
      return false;
    }
  }

  /**
   * 获取缓存（增强版）
   * @param {string} key - 缓存键
   * @returns {Promise<any|null>} 缓存值
   */
  async get(key) {
    try {
      // 先检查热点数据缓存
      if (this.hotDataCache.has(key)) {
        const hotData = this.hotDataCache.get(key);
        if (hotData.expiry > Date.now()) {
          this.stats.hits++;
          logger.debug(`热点数据命中: ${key}`);
          return hotData.value;
        } else {
          // 过期则删除
          this.hotDataCache.delete(key);
        }
      }
      
      const client = getRedisClient();
      const fullKey = this.getFullKey(key);
      const value = await client.get(fullKey);
      
      if (value === null) {
        this.stats.misses++;
        logger.debug(`缓存未命中: ${key}`);
        return null;
      }
      
      // 解析数据
      const parsedValue = JSON.parse(value);
      
      // 如果是高频访问数据，加入热点缓存
      if (this.shouldCacheAsHot(key) && this.hotDataConfig.ENABLED) {
        // 检查热点缓存大小限制
        if (this.hotDataCache.size >= this.hotDataConfig.MAX_SIZE) {
          // 删除最旧的条目
          const oldestKey = this.hotDataCache.keys().next().value;
          this.hotDataCache.delete(oldestKey);
        }
        
        this.hotDataCache.set(key, {
          value: parsedValue,
          expiry: Date.now() + (this.hotDataConfig.TTL * 1000) // 使用配置中的TTL
        });
      }
      
      this.stats.hits++;
      logger.debug(`缓存命中: ${key}`);
      return parsedValue;
    } catch (error) {
      this.stats.errors++;
      logger.error(`获取缓存失败: ${key}`, error);
      return null;
    }
  }

  /**
   * 判断是否应该作为热点数据缓存
   * @param {string} key - 缓存键
   * @returns {boolean} 是否应该缓存为热点数据
   */
  shouldCacheAsHot(key) {
    // 用户信息、房间信息等高频访问数据
    const hotPatterns = [
      /^user:username:/,
      /^user:email:/,
      /^user:rooms:/,
      /^room:users:/,
      /^bill:detail:/
    ];
    
    return hotPatterns.some(pattern => pattern.test(key));
  }

  /**
   * 删除缓存（增强版）
   * @param {string} key - 缓存键
   * @returns {Promise<boolean>} 操作是否成功
   */
  async del(key) {
    try {
      const client = getRedisClient();
      const fullKey = this.getFullKey(key);
      const result = await client.del(fullKey);
      
      // 从热点缓存中删除
      this.hotDataCache.delete(key);
      
      // 从标签映射中删除
      for (const [tag, keys] of this.tagMap.entries()) {
        if (keys.has(fullKey)) {
          keys.delete(fullKey);
          // 从Redis标签集合中删除
          await client.sRem(`${this.keyPrefix}tag:${tag}`, fullKey);
        }
      }
      
      if (result > 0) {
        this.stats.deletes++;
        logger.debug(`缓存删除成功: ${key}`);
        return true;
      } else {
        logger.debug(`缓存不存在，无需删除: ${key}`);
        return false;
      }
    } catch (error) {
      this.stats.errors++;
      logger.error(`删除缓存失败: ${key}`, error);
      return false;
    }
  }

  /**
   * 通过标签删除缓存
   * @param {string} tag - 缓存标签
   * @returns {Promise<number>} 删除的键数量
   */
  async delByTag(tag) {
    try {
      const client = getRedisClient();
      const tagKey = `${this.keyPrefix}tag:${tag}`;
      const keys = await client.sMembers(tagKey);
      
      if (keys.length === 0) {
        logger.debug(`标签下没有缓存键: ${tag}`);
        return 0;
      }
      
      // 删除所有相关键
      const result = await client.del(keys);
      
      // 删除标签集合
      await client.del(tagKey);
      
      // 清除内存中的标签映射
      this.tagMap.delete(tag);
      
      // 从热点缓存中删除相关键
      for (const fullKey of keys) {
        const key = fullKey.replace(this.keyPrefix, '');
        this.hotDataCache.delete(key);
      }
      
      this.stats.deletes += result;
      logger.debug(`通过标签删除缓存成功: ${tag}, 删除数量: ${result}`);
      return result;
    } catch (error) {
      this.stats.errors++;
      logger.error(`通过标签删除缓存失败: ${tag}`, error);
      return 0;
    }
  }

  /**
   * 获取或设置缓存（增强版）
   * @param {string} key - 缓存键
   * @param {Function} callback - 获取数据的回调函数
   * @param {number} ttl - 过期时间（秒）
   * @param {Array<string>} tags - 缓存标签
   * @returns {Promise<any>} 缓存值或回调函数返回值
   */
  async getOrSet(key, callback, ttl, tags = []) {
    try {
      // 尝试从缓存获取
      let value = await this.get(key);
      
      // 如果缓存不存在，则执行回调函数
      if (value === null) {
        logger.debug(`缓存未命中，执行回调获取数据: ${key}`);
        value = await callback();
        
        // 如果回调函数返回了有效值，则设置缓存
        if (value !== undefined && value !== null) {
          await this.set(key, value, ttl, tags);
        }
      }
      
      return value;
    } catch (error) {
      this.stats.errors++;
      logger.error(`获取或设置缓存失败: ${key}`, error);
      // 如果缓存操作失败，直接执行回调函数
      return await callback();
    }
  }

  /**
   * 批量获取缓存
   * @param {Array<string>} keys - 缓存键数组
   * @returns {Promise<Map<string, any>>} 键值对映射
   */
  async mget(keys) {
    try {
      const client = getRedisClient();
      const fullKeys = keys.map(key => this.getFullKey(key));
      const values = await client.mGet(fullKeys);
      
      const result = new Map();
      
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = values[i];
        
        if (value !== null) {
          try {
            result.set(key, JSON.parse(value));
            this.stats.hits++;
          } catch (parseError) {
            logger.error(`解析缓存值失败: ${key}`, parseError);
            this.stats.errors++;
          }
        } else {
          this.stats.misses++;
        }
      }
      
      return result;
    } catch (error) {
      this.stats.errors++;
      logger.error(`批量获取缓存失败`, error);
      return new Map();
    }
  }

  /**
   * 批量设置缓存
   * @param {Array<Object>} items - 缓存项数组，每项包含key, value, ttl, tags
   * @returns {Promise<number>} 成功设置的数量
   */
  async mset(items) {
    let successCount = 0;
    
    for (const item of items) {
      const { key, value, ttl, tags } = item;
      const result = await this.set(key, value, ttl, tags);
      if (result) {
        successCount++;
      }
    }
    
    return successCount;
  }

  /**
   * 缓存预热
   * 预加载热点数据到缓存
   */
  async preloadHotData() {
    try {
      logger.info('开始缓存预热...');
      
      // 这里可以根据业务需求预加载热点数据
      // 例如：加载活跃用户的房间信息、最近账单等
      
      logger.info('缓存预热完成');
    } catch (error) {
      logger.error('缓存预热失败', error);
    }
  }

  /**
   * 启动缓存预设定时器
   */
  startPreloadInterval() {
    setInterval(async () => {
      await this.preloadHotData();
    }, this.preloadConfig.interval);
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;
    
    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      hotDataSize: this.hotDataCache.size,
      tagCount: this.tagMap.size
    };
  }

  /**
   * 重置缓存统计
   */
  resetStats() {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0
    };
  }

  /**
   * 根据数据类型获取默认TTL
   * @param {string} type - 数据类型
   * @returns {number} TTL（秒）
   */
  getDefaultTTL(type) {
    return this.defaultTTLs[type] || this.defaultTTLs.default;
  }
}

// 创建单例实例
const enhancedCacheService = new EnhancedCacheService();

module.exports = enhancedCacheService;