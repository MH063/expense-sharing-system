/**
 * 权限事件处理器
 * 处理权限相关的事件，如角色变更、权限分配等
 */

const permissionService = require('./permission-service');
const { logger } = require('../config/logger');

class PermissionEventHandler {
  /**
   * 处理用户角色变更事件
   * @param {string} userId - 用户ID
   */
  static async handleUserRoleChange(userId) {
    try {
      logger.info(`处理用户角色变更事件: ${userId}`);
      
      // 清除用户的权限缓存
      await permissionService.clearUserPermissionCache(userId);
      
      logger.info(`用户角色变更事件处理完成: ${userId}`);
    } catch (error) {
      logger.error(`处理用户角色变更事件失败: ${userId}`, error);
    }
  }
  
  /**
   * 处理角色权限变更事件
   * @param {string} roleId - 角色ID
   */
  static async handleRolePermissionChange(roleId) {
    try {
      logger.info(`处理角色权限变更事件: ${roleId}`);
      
      // 获取拥有该角色的所有用户
      const { pool } = require('../config/db');
      const userResult = await pool.query(
        'SELECT user_id FROM user_roles WHERE role_id = $1',
        [roleId]
      );
      
      // 清除所有相关用户的权限缓存
      for (const row of userResult.rows) {
        await permissionService.clearUserPermissionCache(row.user_id);
      }
      
      logger.info(`角色权限变更事件处理完成: ${roleId}, 影响用户数: ${userResult.rows.length}`);
    } catch (error) {
      logger.error(`处理角色权限变更事件失败: ${roleId}`, error);
    }
  }
  
  /**
   * 处理权限变更事件
   * @param {string} permissionId - 权限ID
   */
  static async handlePermissionChange(permissionId) {
    try {
      logger.info(`处理权限变更事件: ${permissionId}`);
      
      // 获取拥有该权限的所有角色
      const { pool } = require('../config/db');
      const roleResult = await pool.query(
        'SELECT role_id FROM role_permissions WHERE permission_id = $1',
        [permissionId]
      );
      
      // 对每个角色，获取其所有用户并清除缓存
      for (const row of roleResult.rows) {
        await this.handleRolePermissionChange(row.role_id);
      }
      
      logger.info(`权限变更事件处理完成: ${permissionId}, 影响角色数: ${roleResult.rows.length}`);
    } catch (error) {
      logger.error(`处理权限变更事件失败: ${permissionId}`, error);
    }
  }
}

module.exports = PermissionEventHandler;