/**
 * Redis缓存服务
 * 提供统一的缓存操作接口，支持各种缓存场景
 */

const { getRedisClient } = require('../config/redis');
const { logger } = require('../config/logger');

/**
 * 缓存服务类
 */
class CacheService {
  constructor() {
    this.defaultTTL = 3600; // 默认过期时间（秒）
    this.keyPrefix = 'expense_system:'; // 键前缀
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
   * 设置缓存
   * @param {string} key - 缓存键
   * @param {any} value - 缓存值（将自动序列化为JSON）
   * @param {number} ttl - 过期时间（秒），默认使用defaultTTL
   * @returns {Promise<boolean>} 操作是否成功
   */
  async set(key, value, ttl = this.defaultTTL) {
    try {
      const client = getRedisClient();
      const fullKey = this.getFullKey(key);
      const serializedValue = JSON.stringify(value);
      
      if (ttl > 0) {
        await client.setEx(fullKey, ttl, serializedValue);
      } else {
        await client.set(fullKey, serializedValue);
      }
      
      logger.debug(`缓存设置成功: ${key}, TTL: ${ttl}秒`);
      return true;
    } catch (error) {
      logger.error(`设置缓存失败: ${key}`, error);
      return false;
    }
  }

  /**
   * 获取缓存
   * @param {string} key - 缓存键
   * @returns {Promise<any|null>} 缓存值（反序列化后的对象），如果不存在则返回null
   */
  async get(key) {
    try {
      const client = getRedisClient();
      const fullKey = this.getFullKey(key);
      const value = await client.get(fullKey);
      
      if (value === null) {
        logger.debug(`缓存未命中: ${key}`);
        return null;
      }
      
      logger.debug(`缓存命中: ${key}`);
      return JSON.parse(value);
    } catch (error) {
      logger.error(`获取缓存失败: ${key}`, error);
      return null;
    }
  }

  /**
   * 删除缓存
   * @param {string} key - 缓存键
   * @returns {Promise<boolean>} 操作是否成功
   */
  async del(key) {
    try {
      const client = getRedisClient();
      const fullKey = this.getFullKey(key);
      const result = await client.del(fullKey);
      
      if (result > 0) {
        logger.debug(`缓存删除成功: ${key}`);
        return true;
      } else {
        logger.debug(`缓存不存在，无需删除: ${key}`);
        return false;
      }
    } catch (error) {
      logger.error(`删除缓存失败: ${key}`, error);
      return false;
    }
  }

  /**
   * 检查缓存是否存在
   * @param {string} key - 缓存键
   * @returns {Promise<boolean>} 缓存是否存在
   */
  async exists(key) {
    try {
      const client = getRedisClient();
      const fullKey = this.getFullKey(key);
      const result = await client.exists(fullKey);
      
      return result === 1;
    } catch (error) {
      logger.error(`检查缓存存在性失败: ${key}`, error);
      return false;
    }
  }

  /**
   * 设置缓存过期时间
   * @param {string} key - 缓存键
   * @param {number} ttl - 过期时间（秒）
   * @returns {Promise<boolean>} 操作是否成功
   */
  async expire(key, ttl) {
    try {
      const client = getRedisClient();
      const fullKey = this.getFullKey(key);
      const result = await client.expire(fullKey, ttl);
      
      if (result === 1) {
        logger.debug(`设置缓存过期时间成功: ${key}, TTL: ${ttl}秒`);
        return true;
      } else {
        logger.debug(`缓存不存在，无法设置过期时间: ${key}`);
        return false;
      }
    } catch (error) {
      logger.error(`设置缓存过期时间失败: ${key}`, error);
      return false;
    }
  }

  /**
   * 获取缓存剩余过期时间
   * @param {string} key - 缓存键
   * @returns {Promise<number>} 剩余时间（秒），如果不存在或无过期时间则返回-1
   */
  async ttl(key) {
    try {
      const client = getRedisClient();
      const fullKey = this.getFullKey(key);
      return await client.ttl(fullKey);
    } catch (error) {
      logger.error(`获取缓存过期时间失败: ${key}`, error);
      return -1;
    }
  }

  /**
   * 批量删除匹配模式的缓存
   * @param {string} pattern - 匹配模式（如 "user:*"）
   * @returns {Promise<number>} 删除的键数量
   */
  async delPattern(pattern) {
    try {
      const client = getRedisClient();
      const fullPattern = this.getFullKey(pattern);
      const keys = await client.keys(fullPattern);
      
      if (keys.length === 0) {
        logger.debug(`没有匹配的缓存键: ${pattern}`);
        return 0;
      }
      
      const result = await client.del(keys);
      logger.debug(`批量删除缓存成功: ${pattern}, 删除数量: ${result}`);
      return result;
    } catch (error) {
      logger.error(`批量删除缓存失败: ${pattern}`, error);
      return 0;
    }
  }

  /**
   * 原子性递增缓存值
   * @param {string} key - 缓存键
   * @param {number} increment - 递增量，默认为1
   * @returns {Promise<number|null>} 递增后的值，失败返回null
   */
  async incr(key, increment = 1) {
    try {
      const client = getRedisClient();
      const fullKey = this.getFullKey(key);
      
      let result;
      if (increment === 1) {
        result = await client.incr(fullKey);
      } else {
        result = await client.incrBy(fullKey, increment);
      }
      
      logger.debug(`缓存递增成功: ${key}, 增量: ${increment}, 结果: ${result}`);
      return result;
    } catch (error) {
      logger.error(`缓存递增失败: ${key}`, error);
      return null;
    }
  }

  /**
   * 原子性递减缓存值
   * @param {string} key - 缓存键
   * @param {number} decrement - 递减量，默认为1
   * @returns {Promise<number|null>} 递减后的值，失败返回null
   */
  async decr(key, decrement = 1) {
    try {
      const client = getRedisClient();
      const fullKey = this.getFullKey(key);
      
      let result;
      if (decrement === 1) {
        result = await client.decr(fullKey);
      } else {
        result = await client.decrBy(fullKey, decrement);
      }
      
      logger.debug(`缓存递减成功: ${key}, 减量: ${decrement}, 结果: ${result}`);
      return result;
    } catch (error) {
      logger.error(`缓存递减失败: ${key}`, error);
      return null;
    }
  }

  /**
   * 获取或设置缓存（缓存穿透保护）
   * 如果缓存不存在，则执行回调函数获取数据并设置缓存
   * @param {string} key - 缓存键
   * @param {Function} callback - 获取数据的回调函数
   * @param {number} ttl - 过期时间（秒）
   * @returns {Promise<any>} 缓存值或回调函数返回值
   */
  async getOrSet(key, callback, ttl = this.defaultTTL) {
    try {
      // 尝试从缓存获取
      let value = await this.get(key);
      
      // 如果缓存不存在，则执行回调函数
      if (value === null) {
        logger.debug(`缓存未命中，执行回调获取数据: ${key}`);
        value = await callback();
        
        // 如果回调函数返回了有效值，则设置缓存
        if (value !== undefined && value !== null) {
          await this.set(key, value, ttl);
        }
      }
      
      return value;
    } catch (error) {
      logger.error(`获取或设置缓存失败: ${key}`, error);
      // 如果缓存操作失败，直接执行回调函数
      return await callback();
    }
  }
}

// 创建单例实例
const cacheService = new CacheService();

module.exports = cacheService;