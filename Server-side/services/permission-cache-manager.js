/**
 * 权限缓存管理器
 * 管理权限相关的缓存操作
 */

const cacheService = require('./cache-service');
const { logger } = require('../config/logger');

class PermissionCacheManager {
  /**
   * 生成用户权限缓存键
   * @param {string} userId - 用户ID
   * @returns {string} 缓存键
   */
  static getUserPermissionCacheKey(userId) {
    return `user_permissions:${userId}`;
  }
  
  /**
   * 生成用户角色缓存键
   * @param {string} userId - 用户ID
   * @returns {string} 缓存键
   */
  static getUserRoleCacheKey(userId) {
    return `user_roles:${userId}`;
  }
  
  /**
   * 生成用户特定权限检查缓存键
   * @param {string} userId - 用户ID
   * @param {string} permission - 权限代码
   * @returns {string} 缓存键
   */
  static getUserPermissionCheckCacheKey(userId, permission) {
    return `user_has_permission:${userId}:${permission}`;
  }
  
  /**
   * 生成用户任一权限检查缓存键
   * @param {string} userId - 用户ID
   * @param {Array<string>} permissions - 权限代码数组
   * @returns {string} 缓存键
   */
  static getUserAnyPermissionCheckCacheKey(userId, permissions) {
    return `user_has_any_permission:${userId}:${permissions.sort().join(',')}`;
  }
  
  /**
   * 生成用户所有权限检查缓存键
   * @param {string} userId - 用户ID
   * @param {Array<string>} permissions - 权限代码数组
   * @returns {string} 缓存键
   */
  static getUserAllPermissionsCheckCacheKey(userId, permissions) {
    return `user_has_all_permissions:${userId}:${permissions.sort().join(',')}`;
  }
  
  /**
   * 缓存用户权限
   * @param {string} userId - 用户ID
   * @param {Array<string>} permissions - 权限代码数组
   * @param {number} ttl - 过期时间（秒）
   */
  static async cacheUserPermissions(userId, permissions, ttl = 300) {
    try {
      const cacheKey = this.getUserPermissionCacheKey(userId);
      await cacheService.set(cacheKey, permissions, ttl);
      logger.debug(`缓存用户权限成功: ${userId}`);
    } catch (error) {
      logger.error(`缓存用户权限失败: ${userId}`, error);
    }
  }
  
  /**
   * 获取缓存的用户权限
   * @param {string} userId - 用户ID
   * @returns {Promise<Array<string>|null>} 权限代码数组或null
   */
  static async getCachedUserPermissions(userId) {
    try {
      const cacheKey = this.getUserPermissionCacheKey(userId);
      const permissions = await cacheService.get(cacheKey);
      if (permissions !== null) {
        logger.debug(`命中用户权限缓存: ${userId}`);
      }
      return permissions;
    } catch (error) {
      logger.error(`获取缓存用户权限失败: ${userId}`, error);
      return null;
    }
  }
  
  /**
   * 缓存用户角色
   * @param {string} userId - 用户ID
   * @param {Array<string>} roles - 角色名称数组
   * @param {number} ttl - 过期时间（秒）
   */
  static async cacheUserRoles(userId, roles, ttl = 300) {
    try {
      const cacheKey = this.getUserRoleCacheKey(userId);
      await cacheService.set(cacheKey, roles, ttl);
      logger.debug(`缓存用户角色成功: ${userId}`);
    } catch (error) {
      logger.error(`缓存用户角色失败: ${userId}`, error);
    }
  }
  
  /**
   * 获取缓存的用户角色
   * @param {string} userId - 用户ID
   * @returns {Promise<Array<string>|null>} 角色名称数组或null
   */
  static async getCachedUserRoles(userId) {
    try {
      const cacheKey = this.getUserRoleCacheKey(userId);
      const roles = await cacheService.get(cacheKey);
      if (roles !== null) {
        logger.debug(`命中用户角色缓存: ${userId}`);
      }
      return roles;
    } catch (error) {
      logger.error(`获取缓存用户角色失败: ${userId}`, error);
      return null;
    }
  }
  
  /**
   * 缓存用户权限检查结果
   * @param {string} userId - 用户ID
   * @param {string} permission - 权限代码
   * @param {boolean} hasPermission - 是否具有权限
   * @param {number} ttl - 过期时间（秒）
   */
  static async cacheUserPermissionCheck(userId, permission, hasPermission, ttl = 300) {
    try {
      const cacheKey = this.getUserPermissionCheckCacheKey(userId, permission);
      await cacheService.set(cacheKey, hasPermission, ttl);
      logger.debug(`缓存用户权限检查结果成功: ${userId} -> ${permission}`);
    } catch (error) {
      logger.error(`缓存用户权限检查结果失败: ${userId} -> ${permission}`, error);
    }
  }
  
  /**
   * 获取缓存的用户权限检查结果
   * @param {string} userId - 用户ID
   * @param {string} permission - 权限代码
   * @returns {Promise<boolean|null>} 是否具有权限或null
   */
  static async getCachedUserPermissionCheck(userId, permission) {
    try {
      const cacheKey = this.getUserPermissionCheckCacheKey(userId, permission);
      const hasPermission = await cacheService.get(cacheKey);
      if (hasPermission !== null) {
        logger.debug(`命中用户权限检查缓存: ${userId} -> ${permission}`);
      }
      return hasPermission;
    } catch (error) {
      logger.error(`获取缓存用户权限检查结果失败: ${userId} -> ${permission}`, error);
      return null;
    }
  }
  
  /**
   * 清除用户相关的所有权限缓存
   * @param {string} userId - 用户ID
   */
  static async clearUserPermissionCache(userId) {
    try {
      // 清除用户权限缓存
      await cacheService.del(this.getUserPermissionCacheKey(userId));
      
      // 清除用户角色缓存
      await cacheService.del(this.getUserRoleCacheKey(userId));
      
      // 清除用户权限检查缓存
      await cacheService.delPattern(`user_has_permission:${userId}:*`);
      await cacheService.delPattern(`user_has_any_permission:${userId}:*`);
      await cacheService.delPattern(`user_has_all_permissions:${userId}:*`);
      
      logger.info(`清除用户权限缓存成功: ${userId}`);
    } catch (error) {
      logger.error(`清除用户权限缓存失败: ${userId}`, error);
    }
  }
  
  /**
   * 清除所有权限相关的缓存
   */
  static async clearAllPermissionCache() {
    try {
      // 清除所有用户权限缓存
      await cacheService.delPattern('user_permissions:*');
      
      // 清除所有用户角色缓存
      await cacheService.delPattern('user_roles:*');
      
      // 清除所有权限检查缓存
      await cacheService.delPattern('user_has_permission:*');
      await cacheService.delPattern('user_has_any_permission:*');
      await cacheService.delPattern('user_has_all_permissions:*');
      
      logger.info('清除所有权限缓存成功');
    } catch (error) {
      logger.error('清除所有权限缓存失败', error);
    }
  }
}

module.exports = PermissionCacheManager;