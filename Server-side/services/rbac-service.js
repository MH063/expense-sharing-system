/**
 * RBAC(Role-Based Access Control)权限管理服务
 * 提供角色、权限的管理和验证功能
 */

const { pool } = require('../config/db');
const { logger } = require('../config/logger');
const { LogHelper } = require('../utils/log-helpers');

/**
 * 权限缓存(内存,生产环境建议使用Redis)
 */
class PermissionCache {
  constructor() {
    this.cache = new Map(); // userId -> { roles, permissions, timestamp }
    this.ttl = 300000; // 5分钟
  }

  get(userId) {
    const cached = this.cache.get(userId);
    if (!cached) return null;
    
    // 检查是否过期
    if (Date.now() - cached.timestamp > this.ttl) {
      this.cache.delete(userId);
      return null;
    }
    
    return cached;
  }

  set(userId, data) {
    this.cache.set(userId, {
      ...data,
      timestamp: Date.now()
    });
  }

  invalidate(userId) {
    this.cache.delete(userId);
  }

  clear() {
    this.cache.clear();
  }
}

const permissionCache = new PermissionCache();

/**
 * RBAC服务类
 */
class RBACService {
  /**
   * 获取用户的所有角色
   * @param {string} userId - 用户ID
   * @param {boolean} useCache - 是否使用缓存
   * @returns {Promise<Array>} 角色列表
   */
  static async getUserRoles(userId, useCache = true) {
    try {
      // 尝试从缓存获取
      if (useCache) {
        const cached = permissionCache.get(userId);
        if (cached && cached.roles) {
          return cached.roles;
        }
      }
      
      const result = await pool.query(
        `SELECT DISTINCT r.id, r.name, r.description, r.level
         FROM roles r
         JOIN user_roles ur ON r.id = ur.role_id
         WHERE ur.user_id = $1
         ORDER BY r.level DESC`,
        [userId]
      );
      
      const roles = result.rows;
      
      // 更新缓存
      if (useCache) {
        const cached = permissionCache.get(userId) || {};
        permissionCache.set(userId, { ...cached, roles });
      }
      
      return roles;
    } catch (error) {
      LogHelper.error('获取用户角色失败', error, { userId });
      return [];
    }
  }

  /**
   * 获取用户的所有权限
   * @param {string} userId - 用户ID
   * @param {boolean} useCache - 是否使用缓存
   * @returns {Promise<Array>} 权限列表
   */
  static async getUserPermissions(userId, useCache = true) {
    try {
      // 尝试从缓存获取
      if (useCache) {
        const cached = permissionCache.get(userId);
        if (cached && cached.permissions) {
          return cached.permissions;
        }
      }
      
      const result = await pool.query(
        `SELECT DISTINCT p.id, p.code, p.name, p.description, p.resource, p.action
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         JOIN user_roles ur ON rp.role_id = ur.role_id
         WHERE ur.user_id = $1`,
        [userId]
      );
      
      const permissions = result.rows;
      
      // 更新缓存
      if (useCache) {
        const cached = permissionCache.get(userId) || {};
        permissionCache.set(userId, { ...cached, permissions });
      }
      
      return permissions;
    } catch (error) {
      LogHelper.error('获取用户权限失败', error, { userId });
      return [];
    }
  }

  /**
   * 检查用户是否拥有指定角色
   * @param {string} userId - 用户ID
   * @param {string|Array} roles - 角色名称或数组
   * @returns {Promise<boolean>} 是否拥有角色
   */
  static async hasRole(userId, roles) {
    try {
      const userRoles = await this.getUserRoles(userId);
      const roleNames = userRoles.map(r => r.name);
      
      const requiredRoles = Array.isArray(roles) ? roles : [roles];
      
      return requiredRoles.some(role => roleNames.includes(role));
    } catch (error) {
      LogHelper.error('检查用户角色失败', error, { userId, roles });
      return false;
    }
  }

  /**
   * 检查用户是否拥有指定权限
   * @param {string} userId - 用户ID
   * @param {string|Array} permissions - 权限代码或数组
   * @returns {Promise<boolean>} 是否拥有权限
   */
  static async hasPermission(userId, permissions) {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      const permissionCodes = userPermissions.map(p => p.code);
      
      const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
      
      return requiredPermissions.some(perm => permissionCodes.includes(perm));
    } catch (error) {
      LogHelper.error('检查用户权限失败', error, { userId, permissions });
      return false;
    }
  }

  /**
   * 检查用户是否拥有所有指定权限
   * @param {string} userId - 用户ID
   * @param {Array} permissions - 权限代码数组
   * @returns {Promise<boolean>} 是否拥有所有权限
   */
  static async hasAllPermissions(userId, permissions) {
    try {
      const userPermissions = await this.getUserPermissions(userId);
      const permissionCodes = userPermissions.map(p => p.code);
      
      return permissions.every(perm => permissionCodes.includes(perm));
    } catch (error) {
      LogHelper.error('检查用户所有权限失败', error, { userId, permissions });
      return false;
    }
  }

  /**
   * 为用户分配角色
   * @param {string} userId - 用户ID
   * @param {string|Array} roleIds - 角色ID或数组
   * @param {string} operatorId - 操作人ID
   * @returns {Promise<boolean>} 是否成功
   */
  static async assignRoles(userId, roleIds, operatorId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const roleIdArray = Array.isArray(roleIds) ? roleIds : [roleIds];
      
      for (const roleId of roleIdArray) {
        // 检查是否已存在
        const existsResult = await client.query(
          'SELECT id FROM user_roles WHERE user_id = $1 AND role_id = $2',
          [userId, roleId]
        );
        
        if (existsResult.rows.length === 0) {
          await client.query(
            'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
            [userId, roleId]
          );
        }
      }
      
      await client.query('COMMIT');
      
      // 清除缓存
      permissionCache.invalidate(userId);
      
      LogHelper.business('分配角色成功', {
        userId,
        roleIds: roleIdArray,
        operatorId
      });
      
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      LogHelper.error('分配角色失败', error, { userId, roleIds, operatorId });
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * 移除用户的角色
   * @param {string} userId - 用户ID
   * @param {string|Array} roleIds - 角色ID或数组
   * @param {string} operatorId - 操作人ID
   * @returns {Promise<boolean>} 是否成功
   */
  static async removeRoles(userId, roleIds, operatorId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const roleIdArray = Array.isArray(roleIds) ? roleIds : [roleIds];
      
      for (const roleId of roleIdArray) {
        await client.query(
          'DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2',
          [userId, roleId]
        );
      }
      
      await client.query('COMMIT');
      
      // 清除缓存
      permissionCache.invalidate(userId);
      
      LogHelper.business('移除角色成功', {
        userId,
        roleIds: roleIdArray,
        operatorId
      });
      
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      LogHelper.error('移除角色失败', error, { userId, roleIds, operatorId });
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * 获取角色的所有权限
   * @param {string} roleId - 角色ID
   * @returns {Promise<Array>} 权限列表
   */
  static async getRolePermissions(roleId) {
    try {
      const result = await pool.query(
        `SELECT p.id, p.code, p.name, p.description, p.resource, p.action
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role_id = $1`,
        [roleId]
      );
      
      return result.rows;
    } catch (error) {
      LogHelper.error('获取角色权限失败', error, { roleId });
      return [];
    }
  }

  /**
   * 为角色分配权限
   * @param {string} roleId - 角色ID
   * @param {string|Array} permissionIds - 权限ID或数组
   * @param {string} operatorId - 操作人ID
   * @returns {Promise<boolean>} 是否成功
   */
  static async assignPermissionsToRole(roleId, permissionIds, operatorId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const permissionIdArray = Array.isArray(permissionIds) ? permissionIds : [permissionIds];
      
      for (const permissionId of permissionIdArray) {
        // 检查是否已存在
        const existsResult = await client.query(
          'SELECT id FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
          [roleId, permissionId]
        );
        
        if (existsResult.rows.length === 0) {
          await client.query(
            'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
            [roleId, permissionId]
          );
        }
      }
      
      await client.query('COMMIT');
      
      // 清除所有拥有此角色的用户的缓存
      await this.invalidateCacheForRole(roleId);
      
      LogHelper.business('为角色分配权限成功', {
        roleId,
        permissionIds: permissionIdArray,
        operatorId
      });
      
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      LogHelper.error('为角色分配权限失败', error, { roleId, permissionIds, operatorId });
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * 移除角色的权限
   * @param {string} roleId - 角色ID
   * @param {string|Array} permissionIds - 权限ID或数组
   * @param {string} operatorId - 操作人ID
   * @returns {Promise<boolean>} 是否成功
   */
  static async removePermissionsFromRole(roleId, permissionIds, operatorId) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const permissionIdArray = Array.isArray(permissionIds) ? permissionIds : [permissionIds];
      
      for (const permissionId of permissionIdArray) {
        await client.query(
          'DELETE FROM role_permissions WHERE role_id = $1 AND permission_id = $2',
          [roleId, permissionId]
        );
      }
      
      await client.query('COMMIT');
      
      // 清除所有拥有此角色的用户的缓存
      await this.invalidateCacheForRole(roleId);
      
      LogHelper.business('移除角色权限成功', {
        roleId,
        permissionIds: permissionIdArray,
        operatorId
      });
      
      return true;
    } catch (error) {
      await client.query('ROLLBACK');
      LogHelper.error('移除角色权限失败', error, { roleId, permissionIds, operatorId });
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * 清除拥有指定角色的所有用户的缓存
   * @param {string} roleId - 角色ID
   */
  static async invalidateCacheForRole(roleId) {
    try {
      const result = await pool.query(
        'SELECT user_id FROM user_roles WHERE role_id = $1',
        [roleId]
      );
      
      result.rows.forEach(row => {
        permissionCache.invalidate(row.user_id);
      });
    } catch (error) {
      LogHelper.error('清除角色缓存失败', error, { roleId });
    }
  }

  /**
   * 创建新角色
   * @param {Object} roleData - 角色数据
   * @param {string} operatorId - 操作人ID
   * @returns {Promise<Object|null>} 创建的角色或null
   */
  static async createRole(roleData, operatorId) {
    try {
      const { name, description, level = 1 } = roleData;
      
      const result = await pool.query(
        `INSERT INTO roles (name, description, level, created_at, updated_at)
         VALUES ($1, $2, $3, NOW(), NOW())
         RETURNING *`,
        [name, description, level]
      );
      
      const role = result.rows[0];
      
      LogHelper.business('创建角色成功', {
        roleId: role.id,
        roleName: role.name,
        operatorId
      });
      
      return role;
    } catch (error) {
      LogHelper.error('创建角色失败', error, { roleData, operatorId });
      return null;
    }
  }

  /**
   * 创建新权限
   * @param {Object} permissionData - 权限数据
   * @param {string} operatorId - 操作人ID
   * @returns {Promise<Object|null>} 创建的权限或null
   */
  static async createPermission(permissionData, operatorId) {
    try {
      const { code, name, description, resource, action } = permissionData;
      
      const result = await pool.query(
        `INSERT INTO permissions (code, name, description, resource, action, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
         RETURNING *`,
        [code, name, description, resource, action]
      );
      
      const permission = result.rows[0];
      
      LogHelper.business('创建权限成功', {
        permissionId: permission.id,
        permissionCode: permission.code,
        operatorId
      });
      
      return permission;
    } catch (error) {
      LogHelper.error('创建权限失败', error, { permissionData, operatorId });
      return null;
    }
  }

  /**
   * 清除所有缓存
   */
  static clearAllCache() {
    permissionCache.clear();
    LogHelper.system('清除所有权限缓存');
  }
}

module.exports = RBACService;
