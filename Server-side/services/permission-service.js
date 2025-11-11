/**
 * 权限服务
 * 提供统一的权限检查和管理功能
 */

const { pool } = require('../config/db');
const { logger } = require('../config/logger');
const PermissionCacheManager = require('./permission-cache-manager');
const cacheService = require('./cache-service');

class PermissionService {
  /**
   * 检查用户是否具有特定权限
   * @param {string} userId - 用户ID
   * @param {string} permissionCode - 权限代码
   * @returns {Promise<boolean>} 是否具有权限
   */
  async checkUserPermission(userId, permissionCode) {
    try {
      // 生成缓存键
      const cacheKey = `user_permission:${userId}:${permissionCode}`;
      
      // 尝试从缓存获取结果
      const cachedResult = await cacheService.get(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }
      
      // 查询用户权限
      const queryText = `
        SELECT 1
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1 AND p.code = $2
        LIMIT 1
      `;
      
      const result = await pool.query(queryText, [userId, permissionCode]);
      const hasPermission = result.rows.length > 0;
      
      // 缓存结果（5分钟）
      await cacheService.set(cacheKey, hasPermission, 300);
      
      return hasPermission;
    } catch (error) {
      logger.error('检查用户权限失败:', error);
      return false;
    }
  }
  
  /**
   * 检查用户是否具有任一权限
   * @param {string} userId - 用户ID
   * @param {Array<string>} permissionCodes - 权限代码数组
   * @returns {Promise<boolean>} 是否具有任一权限
   */
  async checkUserAnyPermission(userId, permissionCodes) {
    try {
      // 生成缓存键
      const cacheKey = `user_any_permission:${userId}:${permissionCodes.join(',')}`;
      
      // 尝试从缓存获取结果
      const cachedResult = await cacheService.get(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }
      
      // 查询用户权限
      const queryText = `
        SELECT 1
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1 AND p.code = ANY($2)
        LIMIT 1
      `;
      
      const result = await pool.query(queryText, [userId, permissionCodes]);
      const hasPermission = result.rows.length > 0;
      
      // 缓存结果（5分钟）
      await cacheService.set(cacheKey, hasPermission, 300);
      
      return hasPermission;
    } catch (error) {
      logger.error('检查用户任一权限失败:', error);
      return false;
    }
  }
  
  /**
   * 检查用户是否具有所有权限
   * @param {string} userId - 用户ID
   * @param {Array<string>} permissionCodes - 权限代码数组
   * @returns {Promise<boolean>} 是否具有所有权限
   */
  async checkUserAllPermissions(userId, permissionCodes) {
    try {
      // 生成缓存键
      const cacheKey = `user_all_permissions:${userId}:${permissionCodes.join(',')}`;
      
      // 尝试从缓存获取结果
      const cachedResult = await cacheService.get(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }
      
      // 查询用户权限
      const queryText = `
        SELECT COUNT(DISTINCT p.code) as permission_count
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1 AND p.code = ANY($2)
      `;
      
      const result = await pool.query(queryText, [userId, permissionCodes]);
      const hasAllPermissions = result.rows[0].permission_count === permissionCodes.length;
      
      // 缓存结果（5分钟）
      await cacheService.set(cacheKey, hasAllPermissions, 300);
      
      return hasAllPermissions;
    } catch (error) {
      logger.error('检查用户所有权限失败:', error);
      return false;
    }
  }
  
  /**
   * 检查用户是否具有特定角色
   * @param {string} userId - 用户ID
   * @param {string} roleName - 角色名称
   * @returns {Promise<boolean>} 是否具有角色
   */
  async checkUserRole(userId, roleName) {
    try {
      // 生成缓存键
      const cacheKey = `user_role:${userId}:${roleName}`;
      
      // 尝试从缓存获取结果
      const cachedResult = await cacheService.get(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }
      
      // 查询用户角色
      const queryText = `
        SELECT 1
        FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = $1 AND r.name = $2
        LIMIT 1
      `;
      
      const result = await pool.query(queryText, [userId, roleName]);
      const hasRole = result.rows.length > 0;
      
      // 缓存结果（5分钟）
      await cacheService.set(cacheKey, hasRole, 300);
      
      return hasRole;
    } catch (error) {
      logger.error('检查用户角色失败:', error);
      return false;
    }
  }
  
  /**
   * 获取用户所有权限
   * @param {string} userId - 用户ID
   * @returns {Promise<Array<string>>} 用户权限代码数组
   */
  async getUserPermissions(userId) {
    try {
      // 生成缓存键
      const cacheKey = `user_permissions:${userId}`;
      
      // 尝试从缓存获取结果
      const cachedResult = await cacheService.get(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }
      
      // 查询用户权限
      const queryText = `
        SELECT DISTINCT p.code
        FROM permissions p
        JOIN role_permissions rp ON p.id = rp.permission_id
        JOIN user_roles ur ON rp.role_id = ur.role_id
        WHERE ur.user_id = $1
      `;
      
      const result = await pool.query(queryText, [userId]);
      const permissions = result.rows.map(row => row.code);
      
      // 缓存结果（5分钟）
      await cacheService.set(cacheKey, permissions, 300);
      
      return permissions;
    } catch (error) {
      logger.error('获取用户权限失败:', error);
      return [];
    }
  }
  
  /**
   * 获取用户所有角色
   * @param {string} userId - 用户ID
   * @returns {Promise<Array<string>>} 用户角色名称数组
   */
  async getUserRoles(userId) {
    try {
      // 生成缓存键
      const cacheKey = `user_roles:${userId}`;
      
      // 尝试从缓存获取结果
      const cachedResult = await cacheService.get(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }
      
      // 查询用户角色
      const queryText = `
        SELECT DISTINCT r.name
        FROM roles r
        JOIN user_roles ur ON r.id = ur.role_id
        WHERE ur.user_id = $1
      `;
      
      const result = await pool.query(queryText, [userId]);
      const roles = result.rows.map(row => row.name);
      
      // 缓存结果（5分钟）
      await cacheService.set(cacheKey, roles, 300);
      
      return roles;
    } catch (error) {
      logger.error('获取用户角色失败:', error);
      return [];
    }
  }
  
  /**
   * 清除用户权限缓存
   * @param {string} userId - 用户ID
   */
  async clearUserPermissionCache(userId) {
    try {
      // 清除用户相关的所有缓存
      await cacheService.delPattern(`user_permission:${userId}:*`);
      await cacheService.delPattern(`user_any_permission:${userId}:*`);
      await cacheService.delPattern(`user_all_permissions:${userId}:*`);
      await cacheService.delPattern(`user_role:${userId}:*`);
      await cacheService.del(`user_permissions:${userId}`);
      await cacheService.del(`user_roles:${userId}`);
    } catch (error) {
      logger.error('清除用户权限缓存失败:', error);
    }
  }
}

// 创建单例实例
const permissionService = new PermissionService();

module.exports = permissionService;