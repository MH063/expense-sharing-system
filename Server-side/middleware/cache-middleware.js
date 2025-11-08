/**
 * 缓存中间件
 * 用于在API路由中实现缓存功能
 */

const cacheService = require('../services/cache-service');

/**
 * 生成缓存键
 * @param {string} prefix - 缓存键前缀
 * @param {Object} req - 请求对象
 * @returns {string} 缓存键
 */
const generateCacheKey = (prefix, req) => {
  // 包含路径和查询参数
  const path = req.originalUrl || req.url;
  const params = JSON.stringify(req.query);
  return `${prefix}:${path}:${Buffer.from(params).toString('base64')}`;
};

/**
 * 获取缓存中间件
 * @param {string} prefix - 缓存键前缀
 * @param {number} ttl - 缓存过期时间（秒），默认为300秒（5分钟）
 * @returns {Function} Express中间件函数
 */
const getCache = (prefix, ttl = 300) => {
  return async (req, res, next) => {
    try {
      // 只对GET请求进行缓存
      if (req.method !== 'GET') {
        return next();
      }

      const cacheKey = generateCacheKey(prefix, req);
      const cachedData = await cacheService.get(cacheKey);

      if (cachedData) {
        console.log(`缓存命中: ${cacheKey}`);
        return res.json({
          success: true,
          data: cachedData,
          cached: true
        });
      }

      // 如果缓存中没有数据，继续处理请求
      console.log(`缓存未命中: ${cacheKey}`);
      
      // 保存原始的res.json方法
      const originalJson = res.json;
      
      // 重写res.json方法，以便在响应时缓存数据
      res.json = function(data) {
        // 只缓存成功的响应
        if (data && data.success && data.data) {
          // 异步缓存数据，不阻塞响应
          cacheService.set(cacheKey, data.data, ttl).catch(err => {
            console.error('缓存数据失败:', err);
          });
        }
        
        // 调用原始的json方法
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('缓存中间件错误:', error);
      next();
    }
  };
};

/**
 * 清除缓存中间件
 * @param {string} pattern - 缓存键模式
 * @returns {Function} Express中间件函数
 */
const clearCache = (pattern) => {
  return async (req, res, next) => {
    try {
      // 在请求处理完成后清除缓存
      const originalJson = res.json;
      
      res.json = function(data) {
        // 只在成功的响应后清除缓存
        if (data && data.success) {
          // 异步清除缓存，不阻塞响应
          cacheService.delPattern(pattern).catch(err => {
            console.error('清除缓存失败:', err);
          });
        }
        
        // 调用原始的json方法
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('清除缓存中间件错误:', error);
      next();
    }
  };
};

/**
 * 用户相关的缓存中间件
 */
const userCache = {
  // 获取用户信息缓存
  getUser: getCache('user', 3600), // 1小时
  
  // 清除用户相关缓存
  clearUser: clearCache('user:*'),
  
  // 清除特定用户的缓存
  clearSpecificUser: (userId) => clearCache(`user:*${userId}*`)
};

/**
 * 账单相关的缓存中间件
 */
const billCache = {
  // 获取账单信息缓存
  getBills: getCache('bills', 1800), // 30分钟
  
  // 清除账单相关缓存
  clearBills: clearCache('bills:*'),
  
  // 清除特定房间的账单缓存
  clearRoomBills: (roomId) => clearCache(`bills:*${roomId}*`)
};

/**
 * 房间相关的缓存中间件
 */
const roomCache = {
  // 获取房间信息缓存
  getRooms: getCache('rooms', 1800), // 30分钟
  
  // 清除房间相关缓存
  clearRooms: clearCache('rooms:*'),
  
  // 清除特定房间的缓存
  clearSpecificRoom: (roomId) => clearCache(`rooms:*${roomId}*`)
};

module.exports = {
  getCache,
  clearCache,
  userCache,
  billCache,
  roomCache
};