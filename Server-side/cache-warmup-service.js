/**
 * 缓存预热服务
 * 用于在系统启动时预加载热点数据，提高缓存命中率
 */

const enhancedCacheService = require('./enhanced-cache-service');
const userService = require('./database/user-service');
const billService = require('./database/bill-service');
const roomService = require('./database/room-service');
const statsService = require('./database/stats-service');

class CacheWarmupService {
  constructor() {
    this.isWarmingUp = false;
    this.warmupStats = {
      totalKeys: 0,
      successKeys: 0,
      failedKeys: 0,
      startTime: null,
      endTime: null,
      errors: []
    };
  }

  /**
   * 执行缓存预热
   * @param {Object} options - 预热选项
   * @param {Array} options.types - 预热的数据类型 ['users', 'bills', 'rooms', 'stats']
   * @param {boolean} options.force - 是否强制预热（忽略已有缓存）
   * @param {number} options.batchSize - 批量处理大小
   * @returns {Promise<Object>} 预热结果
   */
  async warmupCache(options = {}) {
    if (this.isWarmingUp) {
      throw new Error('缓存预热正在进行中，请稍后再试');
    }

    const {
      types = ['users', 'bills', 'rooms', 'stats'],
      force = false,
      batchSize = 100
    } = options;

    this.isWarmingUp = true;
    this.warmupStats = {
      totalKeys: 0,
      successKeys: 0,
      failedKeys: 0,
      startTime: new Date(),
      endTime: null,
      errors: []
    };

    console.log('开始缓存预热...');
    console.log(`预热类型: ${types.join(', ')}`);

    try {
      // 预热用户数据
      if (types.includes('users')) {
        await this.warmupUsers(force, batchSize);
      }

      // 预热账单数据
      if (types.includes('bills')) {
        await this.warmupBills(force, batchSize);
      }

      // 预热房间数据
      if (types.includes('rooms')) {
        await this.warmupRooms(force, batchSize);
      }

      // 预热统计数据
      if (types.includes('stats')) {
        await this.warmupStats(force);
      }

      this.warmupStats.endTime = new Date();
      const duration = this.warmupStats.endTime - this.warmupStats.startTime;
      
      console.log('缓存预热完成');
      console.log(`总键数: ${this.warmupStats.totalKeys}`);
      console.log(`成功: ${this.warmupStats.successKeys}`);
      console.log(`失败: ${this.warmupStats.failedKeys}`);
      console.log(`耗时: ${duration}ms`);

      return {
        success: true,
        stats: this.warmupStats,
        duration
      };
    } catch (error) {
      console.error('缓存预热失败:', error);
      this.warmupStats.errors.push(error.message);
      this.warmupStats.endTime = new Date();
      
      return {
        success: false,
        stats: this.warmupStats,
        error: error.message
      };
    } finally {
      this.isWarmingUp = false;
    }
  }

  /**
   * 预热用户数据
   * @param {boolean} force - 是否强制预热
   * @param {number} batchSize - 批量处理大小
   */
  async warmupUsers(force, batchSize) {
    console.log('预热用户数据...');
    
    try {
      // 获取活跃用户列表
      const activeUsers = await userService.getActiveUsers({ limit: 500 });
      const userIds = activeUsers.map(user => user.id);
      
      // 分批处理用户数据
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        await this.warmupUserBatch(batch, force);
      }
      
      console.log(`用户数据预热完成，共处理 ${userIds.length} 个用户`);
    } catch (error) {
      console.error('预热用户数据失败:', error);
      this.warmupStats.errors.push(`预热用户数据失败: ${error.message}`);
    }
  }

  /**
   * 预热用户批次数据
   * @param {Array} userIds - 用户ID数组
   * @param {boolean} force - 是否强制预热
   */
  async warmupUserBatch(userIds, force) {
    try {
      // 批量获取用户信息
      const usersMap = await userService.getUsersBatch(userIds);
      
      // 预热每个用户的缓存
      for (const [userId, user] of usersMap) {
        this.warmupStats.totalKeys++;
        
        try {
          // 预热用户基本信息
          const userKey = `user:${userId}`;
          if (force || !(await enhancedCacheService.exists(userKey))) {
            await enhancedCacheService.set(userKey, user, 3600, 'user');
          }
          
          // 预热用户房间信息
          const userRoomsKey = `user:rooms:${userId}`;
          if (force || !(await enhancedCacheService.exists(userRoomsKey))) {
            const userRooms = await userService.getUserRooms(userId);
            await enhancedCacheService.set(userRoomsKey, userRooms, 1800, 'user');
          }
          
          this.warmupStats.successKeys++;
        } catch (error) {
          this.warmupStats.failedKeys++;
          this.warmupStats.errors.push(`预热用户 ${userId} 失败: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('预热用户批次失败:', error);
      this.warmupStats.errors.push(`预热用户批次失败: ${error.message}`);
    }
  }

  /**
   * 预热账单数据
   * @param {boolean} force - 是否强制预热
   * @param {number} batchSize - 批量处理大小
   */
  async warmupBills(force, batchSize) {
    console.log('预热账单数据...');
    
    try {
      // 获取活跃房间列表
      const activeRooms = await roomService.getActiveRooms({ limit: 100 });
      const roomIds = activeRooms.map(room => room.id);
      
      // 分批处理房间账单数据
      for (let i = 0; i < roomIds.length; i += batchSize) {
        const batch = roomIds.slice(i, i + batchSize);
        await this.warmupBillBatch(batch, force);
      }
      
      console.log(`账单数据预热完成，共处理 ${roomIds.length} 个房间`);
    } catch (error) {
      console.error('预热账单数据失败:', error);
      this.warmupStats.errors.push(`预热账单数据失败: ${error.message}`);
    }
  }

  /**
   * 预热账单批次数据
   * @param {Array} roomIds - 房间ID数组
   * @param {boolean} force - 是否强制预热
   */
  async warmupBillBatch(roomIds, force) {
    try {
      for (const roomId of roomIds) {
        this.warmupStats.totalKeys++;
        
        try {
          // 预热房间账单列表
          const roomBillsKey = `room:bills:${roomId}:default`;
          if (force || !(await enhancedCacheService.exists(roomBillsKey))) {
            const options = { page: 1, limit: 20 };
            const roomBills = await billService.getRoomBills(roomId, options);
            await enhancedCacheService.set(roomBillsKey, roomBills, 1800, 'bill');
          }
          
          this.warmupStats.successKeys++;
        } catch (error) {
          this.warmupStats.failedKeys++;
          this.warmupStats.errors.push(`预热房间 ${roomId} 账单失败: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('预热账单批次失败:', error);
      this.warmupStats.errors.push(`预热账单批次失败: ${error.message}`);
    }
  }

  /**
   * 预热房间数据
   * @param {boolean} force - 是否强制预热
   * @param {number} batchSize - 批量处理大小
   */
  async warmupRooms(force, batchSize) {
    console.log('预热房间数据...');
    
    try {
      // 获取活跃房间列表
      const activeRooms = await roomService.getActiveRooms({ limit: 500 });
      
      // 分批处理房间数据
      for (let i = 0; i < activeRooms.length; i += batchSize) {
        const batch = activeRooms.slice(i, i + batchSize);
        await this.warmupRoomBatch(batch, force);
      }
      
      console.log(`房间数据预热完成，共处理 ${activeRooms.length} 个房间`);
    } catch (error) {
      console.error('预热房间数据失败:', error);
      this.warmupStats.errors.push(`预热房间数据失败: ${error.message}`);
    }
  }

  /**
   * 预热房间批次数据
   * @param {Array} rooms - 房间对象数组
   * @param {boolean} force - 是否强制预热
   */
  async warmupRoomBatch(rooms, force) {
    try {
      for (const room of rooms) {
        this.warmupStats.totalKeys++;
        
        try {
          // 预热房间基本信息
          const roomKey = `room:${room.id}`;
          if (force || !(await enhancedCacheService.exists(roomKey))) {
            await enhancedCacheService.set(roomKey, room, 3600, 'room');
          }
          
          // 预热房间用户列表
          const roomUsersKey = `room:users:${room.id}`;
          if (force || !(await enhancedCacheService.exists(roomUsersKey))) {
            const roomUsers = await userService.getRoomUsers(room.id);
            await enhancedCacheService.set(roomUsersKey, roomUsers, 1800, 'room');
          }
          
          this.warmupStats.successKeys++;
        } catch (error) {
          this.warmupStats.failedKeys++;
          this.warmupStats.errors.push(`预热房间 ${room.id} 失败: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('预热房间批次失败:', error);
      this.warmupStats.errors.push(`预热房间批次失败: ${error.message}`);
    }
  }

  /**
   * 预热统计数据
   * @param {boolean} force - 是否强制预热
   */
  async warmupStats(force) {
    console.log('预热统计数据...');
    
    try {
      // 获取活跃房间列表
      const activeRooms = await roomService.getActiveRooms({ limit: 100 });
      const roomIds = activeRooms.map(room => room.id);
      
      // 预热每个房间的统计数据
      for (const roomId of roomIds) {
        this.warmupStats.totalKeys++;
        
        try {
          // 预热房间统计数据
          const roomStatsKey = `room:stats:${roomId}:all`;
          if (force || !(await enhancedCacheService.exists(roomStatsKey))) {
            const options = { period: 'all' };
            const roomStats = await statsService.getRoomStats(roomId, options);
            await enhancedCacheService.set(roomStatsKey, roomStats, 3600, 'stats');
          }
          
          this.warmupStats.successKeys++;
        } catch (error) {
          this.warmupStats.failedKeys++;
          this.warmupStats.errors.push(`预热房间 ${roomId} 统计失败: ${error.message}`);
        }
      }
      
      console.log(`统计数据预热完成，共处理 ${roomIds.length} 个房间`);
    } catch (error) {
      console.error('预热统计数据失败:', error);
      this.warmupStats.errors.push(`预热统计数据失败: ${error.message}`);
    }
  }

  /**
   * 获取预热状态
   * @returns {Object} 预热状态
   */
  getWarmupStatus() {
    return {
      isWarmingUp: this.isWarmingUp,
      stats: this.warmupStats
    };
  }

  /**
   * 清除预热统计
   */
  clearStats() {
    this.warmupStats = {
      totalKeys: 0,
      successKeys: 0,
      failedKeys: 0,
      startTime: null,
      endTime: null,
      errors: []
    };
  }
}

module.exports = new CacheWarmupService();