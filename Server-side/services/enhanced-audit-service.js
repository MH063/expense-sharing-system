const winston = require('winston');
const { pool } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

// 创建审计日志记录器
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/enhanced-audit.log' })
  ]
});

// 增强的审计日志服务
class EnhancedAuditService {
  constructor() {
    this.logger = auditLogger;
  }

  // 记录用户活动
  async logUserActivity(userId, username, action, details = {}, ipAddress = null, userAgent = null) {
    const activityId = uuidv4();
    const timestamp = new Date().toISOString();
    
    try {
      // 记录到数据库
      await pool.query(
        `INSERT INTO user_activity_logs 
         (id, user_id, username, action, details, ip_address, user_agent, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [activityId, userId, username, action, JSON.stringify(details), ipAddress, userAgent, timestamp]
      );

      // 记录到日志文件
      this.logger.info('用户活动记录', {
        activityId,
        userId,
        username,
        action,
        details,
        ipAddress,
        userAgent,
        timestamp
      });

      return activityId;
    } catch (error) {
      this.logger.error('记录用户活动失败', {
        error: error.message,
        userId,
        username,
        action,
        timestamp
      });
      throw error;
    }
  }

  // 记录数据变更
  async logDataChange(userId, username, tableName, recordId, operation, oldData = {}, newData = {}, details = {}) {
    const changeId = uuidv4();
    const timestamp = new Date().toISOString();
    
    try {
      // 记录到数据库
      await pool.query(
        `INSERT INTO data_change_audits 
         (id, user_id, username, table_name, record_id, operation, old_data, new_data, details, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          changeId, 
          userId, 
          username, 
          tableName, 
          recordId, 
          operation, 
          JSON.stringify(oldData), 
          JSON.stringify(newData), 
          JSON.stringify(details), 
          timestamp
        ]
      );

      // 记录到日志文件
      this.logger.info('数据变更记录', {
        changeId,
        userId,
        username,
        tableName,
        recordId,
        operation,
        oldData,
        newData,
        details,
        timestamp
      });

      return changeId;
    } catch (error) {
      this.logger.error('记录数据变更失败', {
        error: error.message,
        userId,
        username,
        tableName,
        recordId,
        operation,
        timestamp
      });
      throw error;
    }
  }

  // 记录系统事件
  async logSystemEvent(eventType, eventName, details = {}, severity = 'info') {
    const eventId = uuidv4();
    const timestamp = new Date().toISOString();
    
    try {
      // 记录到数据库
      await pool.query(
        `INSERT INTO system_audit_logs 
         (id, event_type, event_name, details, severity, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [eventId, eventType, eventName, JSON.stringify(details), severity, timestamp]
      );

      // 记录到日志文件
      this.logger.info('系统事件记录', {
        eventId,
        eventType,
        eventName,
        details,
        severity,
        timestamp
      });

      return eventId;
    } catch (error) {
      this.logger.error('记录系统事件失败', {
        error: error.message,
        eventType,
        eventName,
        timestamp
      });
      throw error;
    }
  }

  // 获取用户活动日志
  async getUserActivityLogs(filters = {}, pagination = {}) {
    try {
      let query = `
        SELECT id, user_id, username, action, details, ip_address, user_agent, timestamp
        FROM user_activity_logs
        WHERE 1=1
      `;
      const queryParams = [];
      let paramIndex = 1;

      // 添加过滤条件
      if (filters.userId) {
        query += ` AND user_id = $${paramIndex++}`;
        queryParams.push(filters.userId);
      }

      if (filters.username) {
        query += ` AND username ILIKE $${paramIndex++}`;
        queryParams.push(`%${filters.username}%`);
      }

      if (filters.action) {
        query += ` AND action = $${paramIndex++}`;
        queryParams.push(filters.action);
      }

      if (filters.startDate) {
        query += ` AND timestamp >= $${paramIndex++}`;
        queryParams.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND timestamp <= $${paramIndex++}`;
        queryParams.push(filters.endDate);
      }

      // 添加排序
      query += ` ORDER BY timestamp DESC`;

      // 添加分页
      if (pagination.limit) {
        query += ` LIMIT $${paramIndex++}`;
        queryParams.push(pagination.limit);

        if (pagination.offset) {
          query += ` OFFSET $${paramIndex++}`;
          queryParams.push(pagination.offset);
        }
      }

      const result = await pool.query(query, queryParams);
      
      // 解析details字段
      const logs = result.rows.map(row => ({
        ...row,
        details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details
      }));

      return logs;
    } catch (error) {
      this.logger.error('获取用户活动日志失败', {
        error: error.message,
        filters,
        pagination
      });
      throw error;
    }
  }

  // 获取数据变更审计日志
  async getDataChangeAudits(filters = {}, pagination = {}) {
    try {
      let query = `
        SELECT id, user_id, username, table_name, record_id, operation, old_data, new_data, details, timestamp
        FROM data_change_audits
        WHERE 1=1
      `;
      const queryParams = [];
      let paramIndex = 1;

      // 添加过滤条件
      if (filters.userId) {
        query += ` AND user_id = $${paramIndex++}`;
        queryParams.push(filters.userId);
      }

      if (filters.username) {
        query += ` AND username ILIKE $${paramIndex++}`;
        queryParams.push(`%${filters.username}%`);
      }

      if (filters.tableName) {
        query += ` AND table_name = $${paramIndex++}`;
        queryParams.push(filters.tableName);
      }

      if (filters.operation) {
        query += ` AND operation = $${paramIndex++}`;
        queryParams.push(filters.operation);
      }

      if (filters.startDate) {
        query += ` AND timestamp >= $${paramIndex++}`;
        queryParams.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND timestamp <= $${paramIndex++}`;
        queryParams.push(filters.endDate);
      }

      // 添加排序
      query += ` ORDER BY timestamp DESC`;

      // 添加分页
      if (pagination.limit) {
        query += ` LIMIT $${paramIndex++}`;
        queryParams.push(pagination.limit);

        if (pagination.offset) {
          query += ` OFFSET $${paramIndex++}`;
          queryParams.push(pagination.offset);
        }
      }

      const result = await pool.query(query, queryParams);
      
      // 解析JSON字段
      const audits = result.rows.map(row => ({
        ...row,
        oldData: typeof row.old_data === 'string' ? JSON.parse(row.old_data) : row.old_data,
        newData: typeof row.new_data === 'string' ? JSON.parse(row.new_data) : row.new_data,
        details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details
      }));

      return audits;
    } catch (error) {
      this.logger.error('获取数据变更审计日志失败', {
        error: error.message,
        filters,
        pagination
      });
      throw error;
    }
  }

  // 获取系统审计日志
  async getSystemAuditLogs(filters = {}, pagination = {}) {
    try {
      let query = `
        SELECT id, event_type, event_name, details, severity, timestamp
        FROM system_audit_logs
        WHERE 1=1
      `;
      const queryParams = [];
      let paramIndex = 1;

      // 添加过滤条件
      if (filters.eventType) {
        query += ` AND event_type = $${paramIndex++}`;
        queryParams.push(filters.eventType);
      }

      if (filters.eventName) {
        query += ` AND event_name ILIKE $${paramIndex++}`;
        queryParams.push(`%${filters.eventName}%`);
      }

      if (filters.severity) {
        query += ` AND severity = $${paramIndex++}`;
        queryParams.push(filters.severity);
      }

      if (filters.startDate) {
        query += ` AND timestamp >= $${paramIndex++}`;
        queryParams.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND timestamp <= $${paramIndex++}`;
        queryParams.push(filters.endDate);
      }

      // 添加排序
      query += ` ORDER BY timestamp DESC`;

      // 添加分页
      if (pagination.limit) {
        query += ` LIMIT $${paramIndex++}`;
        queryParams.push(pagination.limit);

        if (pagination.offset) {
          query += ` OFFSET $${paramIndex++}`;
          queryParams.push(pagination.offset);
        }
      }

      const result = await pool.query(query, queryParams);
      
      // 解析details字段
      const logs = result.rows.map(row => ({
        ...row,
        details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details
      }));

      return logs;
    } catch (error) {
      this.logger.error('获取系统审计日志失败', {
        error: error.message,
        filters,
        pagination
      });
      throw error;
    }
  }
}

// 创建单例实例
const enhancedAuditService = new EnhancedAuditService();

module.exports = {
  enhancedAuditService
};