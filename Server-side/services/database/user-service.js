/**
 * 用户服务
 * 处理用户相关的数据库操作
 */

const BaseService = require('./base-service');
const { v4: uuidv4 } = require('uuid');
const enhancedCacheService = require('../enhanced-cache-service');

class UserService extends BaseService {
  constructor() {
    super('users');
  }

  /**
   * 查找管理员用户
   * @param {string} username - 用户名
   * @returns {Promise<Object|null>} 管理员用户信息
   */
  async findAdminUser(username) {
    const sql = `SELECT u.id, u.username, u.password_hash 
         FROM users u 
         JOIN user_roles ur ON u.id = ur.user_id 
         JOIN roles r ON ur.role_id = r.id 
         WHERE u.username = $1 AND r.name = '管理员'`;
    const result = await this.query(sql, [username]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  /**
   * 根据用户名查找用户
   * @param {string} username - 用户名
   * @returns {Promise<Object|null>} 查找结果
   */
  async findByUsername(username) {
    // 使用缓存键模式：user:username:{username}
    const cacheKey = `user:username:${username}`;
    
    // 使用增强版缓存的getOrSet方法实现缓存穿透保护
    return await enhancedCacheService.getOrSet(cacheKey, async () => {
      const sql = `SELECT * FROM users WHERE username = $1`;
      const result = await this.query(sql, [username]);
      const user = result.rows.length > 0 ? result.rows[0] : null;
      
      // 如果找到用户，删除密码哈希字段（安全考虑）
      if (user) {
        delete user.password_hash;
      }
      
      return user;
    }, enhancedCacheService.getDefaultTTL('user'), ['user']); // 使用用户类型的默认TTL并添加标签
  }

  /**
   * 根据邮箱查找用户
   * @param {string} email - 邮箱
   * @returns {Promise<Object|null>} 查找结果
   */
  async findByEmail(email) {
    // 使用缓存键模式：user:email:{email}
    const cacheKey = `user:email:${email}`;
    
    // 使用增强版缓存的getOrSet方法实现缓存穿透保护
    return await enhancedCacheService.getOrSet(cacheKey, async () => {
      const sql = `SELECT * FROM users WHERE email = $1`;
      const result = await this.query(sql, [email]);
      const user = result.rows.length > 0 ? result.rows[0] : null;
      
      // 如果找到用户，删除密码哈希字段（安全考虑）
      if (user) {
        delete user.password_hash;
      }
      
      return user;
    }, enhancedCacheService.getDefaultTTL('user'), ['user']); // 使用用户类型的默认TTL并添加标签
  }

  /**
   * 创建新用户
   * @param {Object} userData - 用户数据
   * @returns {Promise<Object>} 创建的用户
   */
  async createUser(userData) {
    const { username, email, password, name, avatar, phone } = userData;

    // 密码已经在user-business-service.js中哈希过，直接使用
    const passwordHash = password;
    
    const sql = `
      INSERT INTO users (username, email, password_hash, avatar_url, phone, status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [username, email, passwordHash, avatar, phone, 'active'];
    const result = await this.query(sql, values);
    
    // 检查是否成功创建用户
    if (!result || !result.rows || result.rows.length === 0) {
      throw new Error('创建用户失败：数据库未返回用户数据');
    }
    
    const user = result.rows[0];
    delete user.password_hash;
    
    // 清除可能存在的用户名和邮箱缓存（防止缓存脏数据）
    await this.clearUserCache(null, username, email);
    
    return user;
  }

  /**
   * 验证用户登录
   * @param {string} username - 用户名
   * @param {string} password - 密码
   * @returns {Promise<Object|null>} 验证结果
   */
  async validateLogin(username, password) {
    const sql = `SELECT * FROM users WHERE (username = $1 OR email = $1) AND status = $2`;
    const result = await this.query(sql, [username, 'active']);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const user = result.rows[0];
    const { verifyPassword } = require('../password-service');
    const isValidPassword = await verifyPassword(password, user.password_hash);
    
    if (!isValidPassword) {
      return null;
    }
    
    // 返回用户信息，但不包含密码哈希
    delete user.password_hash;
    return user;
  }

  /**
   * 更新用户密码
   * @param {string} userId - 用户ID
   * @param {string} newPassword - 新密码
   * @returns {Promise<boolean>} 是否更新成功
   */
  async updatePassword(userId, newPassword) {
    // 如果传入的是明文密码，需要先哈希
    const { hashPassword } = require('../password-service');
    const passwordHash = await hashPassword(newPassword);
    
    const sql = `
      UPDATE users 
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $2
    `;
    const result = await this.query(sql, [passwordHash, userId]);
    return result.rowCount > 0;
  }

  /**
   * 更新用户信息
   * @param {string} userId - 用户ID
   * @param {Object} updateData - 更新数据
   * @returns {Promise<Object|null>} 更新后的用户信息
   */
  async updateUser(userId, updateData) {
    const allowedFields = ['username', 'email', 'name', 'avatar', 'phone', 'is_active'];
    const updates = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return null;
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const sql = `
      UPDATE users 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await this.query(sql, values);
    if (result.rows.length === 0) {
      return null;
    }

    // 返回用户信息，但不包含密码
    const user = result.rows[0];
    delete user.password;
    
    // 清除相关缓存
    await this.clearUserCache(userId, user.username, user.email);
    
    return user;
  }

  /**
   * 获取用户所属的房间
   * @param {string} userId - 用户ID
   * @returns {Promise<Array>} 用户所属的房间列表
   */
  async getUserRooms(userId) {
    // 使用缓存键模式：user:rooms:{userId}
    const cacheKey = `user:rooms:${userId}`;
    
    // 使用增强版缓存的getOrSet方法实现缓存穿透保护
    return await enhancedCacheService.getOrSet(cacheKey, async () => {
      const sql = `
        SELECT r.*, rm.role, rm.joined_at
        FROM rooms r
        JOIN room_members rm ON r.id = rm.room_id
        WHERE rm.user_id = $1 AND r.status = $2
        ORDER BY rm.joined_at DESC
      `;
      const result = await this.query(sql, [userId, 'active']);
      return result.rows;
    }, enhancedCacheService.getDefaultTTL('room'), ['user', 'room']); // 使用房间类型的默认TTL并添加多个标签
  }

  /**
   * 获取房间中的用户
   * @param {string} roomId - 房间ID
   * @returns {Promise<Array>} 房间中的用户列表
   */
  async getRoomUsers(roomId) {
    // 使用缓存键模式：room:users:{roomId}
    const cacheKey = `room:users:${roomId}`;
    
    // 使用增强版缓存的getOrSet方法实现缓存穿透保护
    return await enhancedCacheService.getOrSet(cacheKey, async () => {
      const sql = `
        SELECT u.id, u.username, u.email, u.name, u.avatar, u.phone, rm.role, rm.joined_at
        FROM users u
        JOIN room_members rm ON u.id = rm.user_id
        WHERE rm.room_id = $1 AND u.status = $2
        ORDER BY rm.joined_at ASC
      `;
      const result = await this.query(sql, [roomId, 'active']);
      return result.rows;
    }, enhancedCacheService.getDefaultTTL('room'), ['room', 'user']); // 使用房间类型的默认TTL并添加多个标签
  }

  /**
   * 批量获取用户信息
   * @param {Array<string>} userIds - 用户ID数组
   * @returns {Promise<Map<string, Object>>} 用户ID到用户信息的映射
   */
  async getUsersBatch(userIds) {
    if (!userIds || userIds.length === 0) {
      return new Map();
    }
    
    // 生成缓存键数组
    const cacheKeys = userIds.map(id => `user:id:${id}`);
    
    // 尝试从批量缓存获取
    const cachedResults = await enhancedCacheService.mget(cacheKeys);
    const results = new Map();
    const uncachedIds = [];
    
    // 分离已缓存和未缓存的用户
    for (let i = 0; i < userIds.length; i++) {
      const userId = userIds[i];
      const cacheKey = cacheKeys[i];
      const cachedUser = cachedResults.get(cacheKey);
      
      if (cachedUser) {
        results.set(userId, cachedUser);
      } else {
        uncachedIds.push(userId);
      }
    }
    
    // 如果有未缓存的用户，从数据库获取
    if (uncachedIds.length > 0) {
      const sql = `SELECT id, username, email, name, avatar, phone FROM users WHERE id = ANY($1)`;
      const dbResult = await this.query(sql, [uncachedIds]);
      
      // 批量设置缓存
      const cacheItems = [];
      
      for (const user of dbResult.rows) {
        results.set(user.id, user);
        cacheItems.push({
          key: `user:id:${user.id}`,
          value: user,
          ttl: enhancedCacheService.getDefaultTTL('user'),
          tags: ['user']
        });
      }
      
      // 批量设置缓存
      if (cacheItems.length > 0) {
        await enhancedCacheService.mset(cacheItems);
      }
    }
    
    return results;
  }

  /**
   * 清除用户相关的缓存
   * @param {string} userId - 用户ID
   * @param {string} username - 用户名
   * @param {string} email - 邮箱
   * @returns {Promise<void>}
   */
  async clearUserCache(userId, username, email) {
    // 清除用户基本信息缓存
    if (username) {
      await enhancedCacheService.del(`user:username:${username}`);
    }
    
    if (email) {
      await enhancedCacheService.del(`user:email:${email}`);
    }
    
    if (userId) {
      await enhancedCacheService.del(`user:id:${userId}`);
      // 清除用户房间列表缓存
      await enhancedCacheService.del(`user:rooms:${userId}`);
    }
  }

  /**
   * 清除房间相关的缓存
   * @param {string} roomId - 房间ID
   * @returns {Promise<void>}
   */
  async clearRoomCache(roomId) {
    // 清除房间用户列表缓存
    await enhancedCacheService.del(`room:users:${roomId}`);
    
    // 使用标签批量清除所有用户房间列表缓存
    await enhancedCacheService.delByTag('user:rooms');
  }

  /**
   * 获取活跃用户列表
   * @param {number} limit - 限制数量
   * @returns {Promise<Array>} 活跃用户列表
   */
  async getActiveUsers(limit = 100) {
    const sql = `
      SELECT id, username, email, name, avatar, phone, created_at 
      FROM users 
      WHERE is_active = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    const result = await this.query(sql, [true, limit]);
    return result.rows;
  }

  /**
   * 根据ID查找用户
   * @param {string} userId - 用户ID
   * @returns {Promise<Object|null>} 用户信息
   */
  async getUserById(userId) {
    const cacheKey = `user:id:${userId}`;
    
    return await enhancedCacheService.getOrSet(cacheKey, async () => {
      const sql = `SELECT id, username, email, name, avatar, phone, created_at, updated_at FROM users WHERE id = $1 AND is_active = $2`;
      const result = await this.query(sql, [userId, true]);
      return result.rows.length > 0 ? result.rows[0] : null;
    }, enhancedCacheService.getDefaultTTL('user'), ['user']);
  }
}

module.exports = new UserService();