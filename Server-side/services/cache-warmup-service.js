/**
 * 缓存预热服务
 * 负责在系统启动时预热关键缓存数据，提高系统响应速度
 */
const { getRedisClient } = require('../config/redis');
const { DEFAULT_TTL, CACHE_TAGS, WARMUP_CONFIG, getTaggedCacheKey } = require('../config/cache-config');
const { logger } = require('../config/logger');
const userService = require('./database/user-service');
const billService = require('./database/bill-service');
const roomService = require('./database/room-service');

class CacheWarmupService {
  constructor() {
    this.isWarmingUp = false;
    this.warmupStats = {
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      startTime: null,
      endTime: null,
      errors: []
    };
  }

  /**
   * 执行缓存预热
   * @returns {Promise<Object>} 预热结果统计
   */
  async warmupCache() {
    if (this.isWarmingUp) {
      logger.warn('缓存预热已在进行中，跳过本次预热');
      return this.warmupStats;
    }

    this.isWarmingUp = true;
    this.warmupStats = {
      total: 0,
      success: 0,
      failed: 0,
      skipped: 0,
      startTime: new Date(),
      endTime: null,
      errors: []
    };

    logger.info('开始缓存预热...');

    try {
      // 预热用户数据
      if (WARMUP_CONFIG.USERS.ENABLED) {
        await this.warmupUsers();
      }

      // 预热房间数据
      if (WARMUP_CONFIG.ROOMS.ENABLED) {
        await this.warmupRooms();
      }

      // 预热账单数据
      if (WARMUP_CONFIG.BILLS.ENABLED) {
        await this.warmupBills();
      }

      // 预热统计数据
      if (WARMUP_CONFIG.STATS.ENABLED) {
        await this.warmupStats();
      }

      this.warmupStats.endTime = new Date();
      const duration = this.warmupStats.endTime - this.warmupStats.startTime;
      
      logger.info(`缓存预热完成，耗时: ${duration}ms`);
      logger.info(`预热统计: 总计${this.warmupStats.total}, 成功${this.warmupStats.success}, 失败${this.warmupStats.failed}, 跳过${this.warmupStats.skipped}`);
      
      if (this.warmupStats.errors.length > 0) {
        logger.warn(`预热过程中发生${this.warmupStats.errors.length}个错误`);
      }

      return this.warmupStats;
    } catch (error) {
      logger.error('缓存预热过程中发生错误:', error);
      this.warmupStats.errors.push({
        type: 'system',
        message: error.message,
        timestamp: new Date()
      });
      return this.warmupStats;
    } finally {
      this.isWarmingUp = false;
    }
  }

  /**
   * 预热用户数据
   */
  async warmupUsers() {
    logger.info('开始预热用户数据...');
    
    try {
      // 获取活跃用户列表
      const activeUsers = await userService.getActiveUsers(WARMUP_CONFIG.USERS.LIMIT);
      
      for (const user of activeUsers) {
        try {
          this.warmupStats.total++;
          
          // 预热用户基本信息
          await userService.getUserById(user.id);
          
          // 预热用户房间列表
          await userService.getUserRooms(user.id);
          
          this.warmupStats.success++;
        } catch (error) {
          this.warmupStats.failed++;
          this.warmupStats.errors.push({
            type: 'user',
            id: user.id,
            message: error.message,
            timestamp: new Date()
          });
          logger.error(`预热用户${user.id}失败:`, error);
        }
      }
      
      logger.info(`用户数据预热完成，处理了${activeUsers.length}个用户`);
    } catch (error) {
      logger.error('预热用户数据失败:', error);
    }
  }

  /**
   * 预热房间数据
   */
  async warmupRooms() {
    logger.info('开始预热房间数据...');
    
    try {
      // 获取活跃房间列表
      const activeRooms = await roomService.getActiveRooms(WARMUP_CONFIG.ROOMS.LIMIT);
      
      for (const room of activeRooms) {
        try {
          this.warmupStats.total++;
          
          // 预热房间基本信息
          await roomService.getRoomById(room.id);
          
          // 预热房间用户列表
          await roomService.getRoomUsers(room.id);
          
          // 预热房间账单列表
          await roomService.getRoomBills(room.id, { limit: 10 });
          
          this.warmupStats.success++;
        } catch (error) {
          this.warmupStats.failed++;
          this.warmupStats.errors.push({
            type: 'room',
            id: room.id,
            message: error.message,
            timestamp: new Date()
          });
          logger.error(`预热房间${room.id}失败:`, error);
        }
      }
      
      logger.info(`房间数据预热完成，处理了${activeRooms.length}个房间`);
    } catch (error) {
      logger.error('预热房间数据失败:', error);
    }
  }

  /**
   * 预热账单数据
   */
  async warmupBills() {
    logger.info('开始预热账单数据...');
    
    try {
      // 获取最近账单列表
      const recentBills = await billService.getRecentBills(WARMUP_CONFIG.BILLS.LIMIT);
      
      for (const bill of recentBills) {
        try {
          this.warmupStats.total++;
          
          // 预热账单详情
          await billService.getBillById(bill.id);
          
          this.warmupStats.success++;
        } catch (error) {
          this.warmupStats.failed++;
          this.warmupStats.errors.push({
            type: 'bill',
            id: bill.id,
            message: error.message,
            timestamp: new Date()
          });
          logger.error(`预热账单${bill.id}失败:`, error);
        }
      }
      
      logger.info(`账单数据预热完成，处理了${recentBills.length}个账单`);
    } catch (error) {
      logger.error('预热账单数据失败:', error);
    }
  }

  /**
   * 预热统计数据
   */
  async warmupStats() {
    logger.info('开始预热统计数据...');
    
    try {
      // 这里可以添加具体的统计数据预热逻辑
      // 由于stats-service不存在，我们暂时跳过
      logger.info('统计数据预热跳过（stats-service不存在）');
    } catch (error) {
      this.warmupStats.failed++;
      this.warmupStats.errors.push({
        type: 'stats',
        message: error.message,
        timestamp: new Date()
      });
      logger.error('预热统计数据失败:', error);
    }
  }

  /**
   * 获取预热状态
   * @returns {Object} 预热状态信息
   */
  getWarmupStatus() {
    return {
      isWarmingUp: this.isWarmingUp,
      stats: this.warmupStats
    };
  }

  /**
   * 清除预热相关的缓存
   * @returns {Promise<boolean>} 操作是否成功
   */
  async clearWarmupCache() {
    try {
      const client = getRedisClient();
      
      // 清除所有预热相关的缓存
      const warmupKeys = await client.keys(`${getTaggedCacheKey('', CACHE_TAGS.WARMUP)}*`);
      
      if (warmupKeys.length > 0) {
        await client.del(warmupKeys);
        logger.info(`清除了${warmupKeys.length}个预热缓存键`);
      }
      
      return true;
    } catch (error) {
      logger.error('清除预热缓存失败:', error);
      return false;
    }
  }
}

module.exports = CacheWarmupService;