const redis = require('redis');
const { logger } = require('../config/logger');
const { isRedisConnected } = require('../config/redis');

/**
 * 多级缓存服务
 * 实现本地缓存 + Redis分布式缓存的多级缓存机制
 */

class MultiLevelCacheService {
  constructor() {
    this.localCache = new Map();
    this.localCacheTTL = new Map();
    this.redisClient = null;
    this.defaultTTL = 1800; // 默认30分钟
    this.maxLocalCacheSize = 1000; // 本地缓存最大条目数
  }

  /**
   * 初始化Redis客户端
   */
  async initializeRedis() {
    try {
      // 这里应该使用已有的Redis配置
      // 为简化实现，我们假设Redis客户端已经在其他地方初始化
      this.redisClient = global.redisClient || null;
      
      if (this.redisClient) {
        logger.info('多级缓存服务Redis客户端初始化成功');
      } else {
        logger.warn('多级缓存服务Redis客户端未初始化');
      }
    } catch (error) {
      logger.error('多级缓存服务Redis客户端初始化失败:', error);
    }
  }

  /**
   * 生成缓存键
   * @param {string} prefix - 键前缀
   * @param {string} key - 键名
   * @returns {string} 完整缓存键
   */
  generateKey(prefix, key) {
    return `${prefix}:${key}`;
  }

  /**
   * 获取本地缓存
   * @param {string} key - 缓存键
   * @returns {any} 缓存值或undefined
   */
  getLocal(key) {
    // 检查是否过期
    const ttl = this.localCacheTTL.get(key);
    if (ttl && Date.now() > ttl) {
      // 过期，删除缓存
      this.localCache.delete(key);
      this.localCacheTTL.delete(key);
      return undefined;
    }
    
    return this.localCache.get(key);
  }

  /**
   * 设置本地缓存
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 过期时间（秒）
   */
  setLocal(key, value, ttl = this.defaultTTL) {
    // 如果本地缓存已满，删除最旧的条目
    if (this.localCache.size >= this.maxLocalCacheSize) {
      const firstKey = this.localCache.keys().next().value;
      if (firstKey) {
        this.localCache.delete(firstKey);
        this.localCacheTTL.delete(firstKey);
      }
    }
    
    this.localCache.set(key, value);
    this.localCacheTTL.set(key, Date.now() + (ttl * 1000));
  }

  /**
   * 从Redis获取缓存
   * @param {string} key - 缓存键
   * @returns {Promise<any>} 缓存值或null
   */
  async getRedis(key) {
    if (!this.redisClient || !isRedisConnected()) {
      return null;
    }
    
    try {
      const value = await this.redisClient.get(key);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      logger.error('从Redis获取缓存失败:', error);
      return null;
    }
  }

  /**
   * 设置Redis缓存
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 过期时间（秒）
   */
  async setRedis(key, value, ttl = this.defaultTTL) {
    if (!this.redisClient || !isRedisConnected()) {
      return;
    }
    
    try {
      await this.redisClient.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      logger.error('设置Redis缓存失败:', error);
    }
  }

  /**
   * 获取缓存（多级）
   * @param {string} key - 缓存键
   * @param {string} prefix - 键前缀
   * @returns {Promise<any>} 缓存值或undefined
   */
  async get(key, prefix = 'cache') {
    const fullKey = this.generateKey(prefix, key);
    
    // 首先从本地缓存获取
    let value = this.getLocal(fullKey);
    if (value !== undefined) {
      logger.debug(`本地缓存命中: ${fullKey}`);
      return value;
    }
    
    // 然后从Redis获取
    value = await this.getRedis(fullKey);
    if (value !== null) {
      logger.debug(`Redis缓存命中: ${fullKey}`);
      // 将Redis缓存写入本地缓存
      this.setLocal(fullKey, value);
      return value;
    }
    
    logger.debug(`缓存未命中: ${fullKey}`);
    return undefined;
  }

  /**
   * 设置缓存（多级）
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值
   * @param {number} ttl - 过期时间（秒）
   * @param {string} prefix - 键前缀
   */
  async set(key, value, ttl = this.defaultTTL, prefix = 'cache') {
    const fullKey = this.generateKey(prefix, key);
    
    // 设置本地缓存
    this.setLocal(fullKey, value, ttl);
    
    // 设置Redis缓存
    await this.setRedis(fullKey, value, ttl);
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   * @param {string} prefix - 键前缀
   */
  async del(key, prefix = 'cache') {
    const fullKey = this.generateKey(prefix, key);
    
    // 删除本地缓存
    this.localCache.delete(fullKey);
    this.localCacheTTL.delete(fullKey);
    
    // 删除Redis缓存
    if (this.redisClient && isRedisConnected()) {
      try {
        await this.redisClient.del(fullKey);
      } catch (error) {
        logger.error('删除Redis缓存失败:', error);
      }
    }
  }

  /**
   * 清空所有缓存
   */
  async clear() {
    // 清空本地缓存
    this.localCache.clear();
    this.localCacheTTL.clear();
    
    // 清空Redis缓存（注意：这里只清空当前应用的缓存）
    if (this.redisClient && isRedisConnected()) {
      try {
        // 注意：在生产环境中，不要使用FLUSHALL，而是删除特定的键
        // 这里仅为示例
        // await this.redisClient.flushall();
      } catch (error) {
        logger.error('清空Redis缓存失败:', error);
      }
    }
  }

  /**
   * 获取缓存统计信息
   * @returns {Object} 统计信息
   */
  getStats() {
    return {
      localCacheSize: this.localCache.size,
      redisConnected: this.redisClient ? isRedisConnected() : false
    };
  }

  /**
   * 获取或设置缓存（带工厂函数）
   * @param {string} key - 缓存键
   * @param {Function} factory - 生成缓存值的函数
   * @param {number} ttl - 过期时间（秒）
   * @param {string} prefix - 键前缀
   * @returns {Promise<any>} 缓存值
   */
  async getOrSet(key, factory, ttl = this.defaultTTL, prefix = 'cache') {
    const value = await this.get(key, prefix);
    if (value !== undefined) {
      return value;
    }
    
    // 防止缓存击穿，使用锁机制（简化实现）
    const lockKey = `lock:${key}`;
    const lock = await this.get(lockKey, prefix);
    if (lock) {
      // 等待其他请求完成并返回缓存值
      await new Promise(resolve => setTimeout(resolve, 100));
      return await this.get(key, prefix);
    }
    
    // 设置锁
    await this.set(lockKey, true, 10, prefix); // 10秒锁超时
    
    try {
      const newValue = await factory();
      await this.set(key, newValue, ttl, prefix);
      return newValue;
    } finally {
      // 释放锁
      await this.del(lockKey, prefix);
    }
  }
}

module.exports = new MultiLevelCacheService();