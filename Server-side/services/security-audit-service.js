/**
 * 安全审计日志服务
 * 记录和查询系统安全事件
 */

const { pool } = require('../config/db');
const { logger } = require('../config/logger');
const { LogHelper } = require('../utils/log-helpers');

/**
 * 审计事件类型
 */
const AuditEventType = {
  // 认证事件
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  LOGOUT: 'logout',
  TOKEN_REFRESH: 'token_refresh',
  TOKEN_REVOKE: 'token_revoke',
  
  // 密码相关
  PASSWORD_CHANGE: 'password_change',
  PASSWORD_RESET_REQUEST: 'password_reset_request',
  PASSWORD_RESET_SUCCESS: 'password_reset_success',
  PASSWORD_RESET_FAILURE: 'password_reset_failure',
  
  // 权限变更
  ROLE_ASSIGNED: 'role_assigned',
  ROLE_REMOVED: 'role_removed',
  PERMISSION_GRANTED: 'permission_granted',
  PERMISSION_REVOKED: 'permission_revoked',
  
  // 账户管理
  ACCOUNT_CREATED: 'account_created',
  ACCOUNT_UPDATED: 'account_updated',
  ACCOUNT_DELETED: 'account_deleted',
  ACCOUNT_LOCKED: 'account_locked',
  ACCOUNT_UNLOCKED: 'account_unlocked',
  ACCOUNT_DISABLED: 'account_disabled',
  ACCOUNT_ENABLED: 'account_enabled',
  
  // 安全事件
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  PERMISSION_DENIED: 'permission_denied',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  BRUTE_FORCE_DETECTED: 'brute_force_detected',
  INVALID_TOKEN: 'invalid_token',
  
  // 数据操作
  SENSITIVE_DATA_ACCESS: 'sensitive_data_access',
  DATA_EXPORT: 'data_export',
  DATA_IMPORT: 'data_import',
  DATA_DELETION: 'data_deletion',
  
  // 系统配置
  CONFIG_CHANGE: 'config_change',
  SYSTEM_SETTING_CHANGE: 'system_setting_change'
};

/**
 * 安全审计服务类
 */
class SecurityAuditService {
  /**
   * 记录审计日志
   * @param {Object} auditData - 审计数据
   * @returns {Promise<boolean>} 是否成功
   */
  static async log(auditData) {
    try {
      const {
        userId = null,
        username = null,
        eventType,
        eventDescription,
        ipAddress = null,
        userAgent = null,
        resource = null,
        action = null,
        result = 'success',
        metadata = null,
        severity = 'info'
      } = auditData;
      
      await pool.query(
        `INSERT INTO security_audit_logs 
         (user_id, username, event_type, event_description, ip_address, user_agent,
          resource, action, result, metadata, severity, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
        [
          userId,
          username,
          eventType,
          eventDescription,
          ipAddress,
          userAgent,
          resource,
          action,
          result,
          metadata ? JSON.stringify(metadata) : null,
          severity
        ]
      );
      
      // 同时记录到应用日志
      if (severity === 'critical' || severity === 'high') {
        logger.warn(`[安全审计] ${eventType}: ${eventDescription}`, auditData);
      } else {
        logger.info(`[安全审计] ${eventType}: ${eventDescription}`, auditData);
      }
      
      return true;
    } catch (error) {
      // 审计日志失败不应影响主业务,只记录错误
      logger.error('记录审计日志失败', {
        error: error.message,
        auditData
      });
      return false;
    }
  }

  /**
   * 记录登录成功事件
   */
  static async logLoginSuccess(userId, username, ipAddress, userAgent) {
    return this.log({
      userId,
      username,
      eventType: AuditEventType.LOGIN_SUCCESS,
      eventDescription: '用户登录成功',
      ipAddress,
      userAgent,
      action: 'login',
      result: 'success',
      severity: 'info'
    });
  }

  /**
   * 记录登录失败事件
   */
  static async logLoginFailure(username, ipAddress, userAgent, reason) {
    return this.log({
      username,
      eventType: AuditEventType.LOGIN_FAILURE,
      eventDescription: `用户登录失败: ${reason}`,
      ipAddress,
      userAgent,
      action: 'login',
      result: 'failure',
      severity: 'medium',
      metadata: { reason }
    });
  }

  /**
   * 记录登出事件
   */
  static async logLogout(userId, username, ipAddress) {
    return this.log({
      userId,
      username,
      eventType: AuditEventType.LOGOUT,
      eventDescription: '用户登出',
      ipAddress,
      action: 'logout',
      result: 'success',
      severity: 'info'
    });
  }

  /**
   * 记录密码修改事件
   */
  static async logPasswordChange(userId, username, ipAddress) {
    return this.log({
      userId,
      username,
      eventType: AuditEventType.PASSWORD_CHANGE,
      eventDescription: '用户修改密码',
      ipAddress,
      action: 'password_change',
      result: 'success',
      severity: 'medium'
    });
  }

  /**
   * 记录密码重置请求
   */
  static async logPasswordResetRequest(userId, username, email, ipAddress) {
    return this.log({
      userId,
      username,
      eventType: AuditEventType.PASSWORD_RESET_REQUEST,
      eventDescription: '用户请求密码重置',
      ipAddress,
      action: 'password_reset_request',
      result: 'success',
      severity: 'medium',
      metadata: { email }
    });
  }

  /**
   * 记录权限拒绝事件
   */
  static async logPermissionDenied(userId, username, resource, action, ipAddress) {
    return this.log({
      userId,
      username,
      eventType: AuditEventType.PERMISSION_DENIED,
      eventDescription: `权限不足,尝试访问: ${resource}`,
      ipAddress,
      resource,
      action,
      result: 'failure',
      severity: 'medium'
    });
  }

  /**
   * 记录未授权访问
   */
  static async logUnauthorizedAccess(path, ipAddress, userAgent) {
    return this.log({
      eventType: AuditEventType.UNAUTHORIZED_ACCESS,
      eventDescription: `未授权访问尝试: ${path}`,
      ipAddress,
      userAgent,
      resource: path,
      action: 'access',
      result: 'failure',
      severity: 'high'
    });
  }

  /**
   * 记录可疑活动
   */
  static async logSuspiciousActivity(userId, username, description, ipAddress, metadata) {
    return this.log({
      userId,
      username,
      eventType: AuditEventType.SUSPICIOUS_ACTIVITY,
      eventDescription: description,
      ipAddress,
      result: 'detected',
      severity: 'high',
      metadata
    });
  }

  /**
   * 记录暴力破解检测
   */
  static async logBruteForceDetected(username, ipAddress, attemptCount) {
    return this.log({
      username,
      eventType: AuditEventType.BRUTE_FORCE_DETECTED,
      eventDescription: `检测到暴力破解尝试,失败次数: ${attemptCount}`,
      ipAddress,
      action: 'login',
      result: 'blocked',
      severity: 'critical',
      metadata: { attemptCount }
    });
  }

  /**
   * 记录角色分配事件
   */
  static async logRoleAssigned(targetUserId, targetUsername, roleId, roleName, operatorId, operatorUsername) {
    return this.log({
      userId: operatorId,
      username: operatorUsername,
      eventType: AuditEventType.ROLE_ASSIGNED,
      eventDescription: `为用户 ${targetUsername} 分配角色 ${roleName}`,
      action: 'assign_role',
      result: 'success',
      severity: 'medium',
      metadata: {
        targetUserId,
        targetUsername,
        roleId,
        roleName
      }
    });
  }

  /**
   * 记录敏感数据访问
   */
  static async logSensitiveDataAccess(userId, username, resource, ipAddress) {
    return this.log({
      userId,
      username,
      eventType: AuditEventType.SENSITIVE_DATA_ACCESS,
      eventDescription: `访问敏感数据: ${resource}`,
      ipAddress,
      resource,
      action: 'read',
      result: 'success',
      severity: 'medium'
    });
  }

  /**
   * 查询审计日志
   * @param {Object} filters - 查询过滤条件
   * @param {Object} pagination - 分页参数
   * @returns {Promise<Object>} 审计日志列表和分页信息
   */
  static async queryLogs(filters = {}, pagination = {}) {
    try {
      const {
        userId,
        username,
        eventType,
        startDate,
        endDate,
        ipAddress,
        severity,
        result
      } = filters;
      
      const {
        page = 1,
        pageSize = 20,
        sortBy = 'created_at',
        sortOrder = 'DESC'
      } = pagination;
      
      // 构建查询条件
      const conditions = [];
      const params = [];
      let paramIndex = 1;
      
      if (userId) {
        conditions.push(`user_id = $${paramIndex++}`);
        params.push(userId);
      }
      
      if (username) {
        conditions.push(`username ILIKE $${paramIndex++}`);
        params.push(`%${username}%`);
      }
      
      if (eventType) {
        conditions.push(`event_type = $${paramIndex++}`);
        params.push(eventType);
      }
      
      if (startDate) {
        conditions.push(`created_at >= $${paramIndex++}`);
        params.push(startDate);
      }
      
      if (endDate) {
        conditions.push(`created_at <= $${paramIndex++}`);
        params.push(endDate);
      }
      
      if (ipAddress) {
        conditions.push(`ip_address = $${paramIndex++}`);
        params.push(ipAddress);
      }
      
      if (severity) {
        conditions.push(`severity = $${paramIndex++}`);
        params.push(severity);
      }
      
      if (result) {
        conditions.push(`result = $${paramIndex++}`);
        params.push(result);
      }
      
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      // 查询总数
      const countResult = await pool.query(
        `SELECT COUNT(*) as total FROM security_audit_logs ${whereClause}`,
        params
      );
      
      const total = parseInt(countResult.rows[0].total);
      
      // 查询数据
      const offset = (page - 1) * pageSize;
      params.push(pageSize, offset);
      
      const logsResult = await pool.query(
        `SELECT * FROM security_audit_logs 
         ${whereClause}
         ORDER BY ${sortBy} ${sortOrder}
         LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
        params
      );
      
      return {
        items: logsResult.rows,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      };
    } catch (error) {
      LogHelper.error('查询审计日志失败', error, { filters, pagination });
      throw error;
    }
  }

  /**
   * 获取用户的审计日志统计
   * @param {string} userId - 用户ID
   * @param {number} days - 统计天数
   * @returns {Promise<Object>} 统计信息
   */
  static async getUserAuditStats(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const result = await pool.query(
        `SELECT 
           event_type,
           COUNT(*) as count,
           MAX(created_at) as last_occurrence
         FROM security_audit_logs
         WHERE user_id = $1 AND created_at >= $2
         GROUP BY event_type
         ORDER BY count DESC`,
        [userId, startDate]
      );
      
      return {
        userId,
        period: `${days}天`,
        statistics: result.rows
      };
    } catch (error) {
      LogHelper.error('获取用户审计统计失败', error, { userId, days });
      throw error;
    }
  }

  /**
   * 清理旧的审计日志
   * @param {number} days - 保留天数
   * @returns {Promise<number>} 清理的数量
   */
  static async cleanupOldLogs(days = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const result = await pool.query(
        'DELETE FROM security_audit_logs WHERE created_at < $1',
        [cutoffDate]
      );
      
      const deletedCount = result.rowCount;
      
      LogHelper.system('清理旧审计日志', {
        cutoffDate: cutoffDate.toISOString(),
        deletedCount
      });
      
      return deletedCount;
    } catch (error) {
      LogHelper.error('清理审计日志失败', error, { days });
      return 0;
    }
  }
}

// 导出事件类型常量
SecurityAuditService.AuditEventType = AuditEventType;

module.exports = SecurityAuditService;
