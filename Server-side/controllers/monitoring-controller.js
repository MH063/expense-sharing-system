const { pool } = require('../config/db');
const { logger } = require('../config/logger');

/**
 * 性能指标和审计日志控制器
 * 提供API接口获取系统性能指标和审计日志
 */

class MonitoringController {
  /**
   * 获取系统性能指标
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getSystemPerformanceMetrics(req, res) {
    try {
      // 验证用户是否为管理员
      const adminCheck = await pool.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [req.user.sub]
      );
      
      if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
        return res.error(403, '无权访问系统性能指标');
      }
      
      const { 
        metricName, 
        startTime, 
        endTime, 
        limit = 100 
      } = req.query;
      
      let query = `
        SELECT metric_name, metric_value, metric_unit, additional_data, recorded_at
        FROM system_performance_metrics
        WHERE 1=1
      `;
      
      const queryParams = [];
      let paramIndex = 1;
      
      // 添加指标名称筛选
      if (metricName) {
        query += ` AND metric_name = $${paramIndex++}`;
        queryParams.push(metricName);
      }
      
      // 添加时间范围筛选
      if (startTime) {
        query += ` AND recorded_at >= $${paramIndex++}`;
        queryParams.push(startTime);
      }
      
      if (endTime) {
        query += ` AND recorded_at <= $${paramIndex++}`;
        queryParams.push(endTime);
      }
      
      // 添加排序和限制
      query += ` ORDER BY recorded_at DESC LIMIT $${paramIndex}`;
      queryParams.push(parseInt(limit));
      
      const result = await pool.query(query, queryParams);
      
      res.success({
        metrics: result.rows,
        count: result.rowCount
      });
    } catch (error) {
      logger.error('获取系统性能指标失败:', error);
      res.error(500, '获取系统性能指标失败');
    }
  }
  
  /**
   * 获取API使用统计
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getApiUsageStats(req, res) {
    try {
      // 验证用户是否为管理员
      const adminCheck = await pool.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [req.user.sub]
      );
      
      if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
        return res.error(403, '无权访问API使用统计');
      }
      
      const { 
        endpoint, 
        method, 
        startTime, 
        endTime, 
        limit = 100 
      } = req.query;
      
      let query = `
        SELECT 
          endpoint,
          method,
          AVG(response_time_ms) as avg_response_time,
          MAX(response_time_ms) as max_response_time,
          MIN(response_time_ms) as min_response_time,
          COUNT(*) as request_count,
          COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count,
          ROUND(COUNT(CASE WHEN status_code >= 400 THEN 1 END) * 100.0 / COUNT(*), 2) as error_rate
        FROM system_api_usage_logs
        WHERE 1=1
      `;
      
      const queryParams = [];
      let paramIndex = 1;
      
      // 添加端点筛选
      if (endpoint) {
        query += ` AND endpoint = $${paramIndex++}`;
        queryParams.push(endpoint);
      }
      
      // 添加方法筛选
      if (method) {
        query += ` AND method = $${paramIndex++}`;
        queryParams.push(method);
      }
      
      // 添加时间范围筛选
      if (startTime) {
        query += ` AND created_at >= $${paramIndex++}`;
        queryParams.push(startTime);
      }
      
      if (endTime) {
        query += ` AND created_at <= $${paramIndex++}`;
        queryParams.push(endTime);
      }
      
      // 添加分组和排序
      query += ` GROUP BY endpoint, method ORDER BY avg_response_time DESC LIMIT $${paramIndex}`;
      queryParams.push(parseInt(limit));
      
      const result = await pool.query(query, queryParams);
      
      res.success({
        apiStats: result.rows,
        count: result.rowCount
      });
    } catch (error) {
      logger.error('获取API使用统计失败:', error);
      res.error(500, '获取API使用统计失败');
    }
  }
  
  /**
   * 获取用户活动日志
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getUserActivityLogs(req, res) {
    try {
      // 验证用户是否为管理员
      const adminCheck = await pool.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [req.user.sub]
      );
      
      if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
        return res.error(403, '无权访问用户活动日志');
      }
      
      const { 
        userId, 
        action, 
        startTime, 
        endTime, 
        page = 1, 
        limit = 20 
      } = req.query;
      
      let query = `
        SELECT 
          ual.id,
          ual.user_id,
          u.username,
          ual.action,
          ual.detail,
          ual.ip_address,
          ual.user_agent,
          ual.created_at
        FROM user_activity_logs ual
        LEFT JOIN users u ON ual.user_id = u.id
        WHERE 1=1
      `;
      
      const queryParams = [];
      let paramIndex = 1;
      
      // 添加用户ID筛选
      if (userId) {
        query += ` AND ual.user_id = $${paramIndex++}`;
        queryParams.push(userId);
      }
      
      // 添加操作类型筛选
      if (action) {
        query += ` AND ual.action = $${paramIndex++}`;
        queryParams.push(action);
      }
      
      // 添加时间范围筛选
      if (startTime) {
        query += ` AND ual.created_at >= $${paramIndex++}`;
        queryParams.push(startTime);
      }
      
      if (endTime) {
        query += ` AND ual.created_at <= $${paramIndex++}`;
        queryParams.push(endTime);
      }
      
      // 添加排序
      query += ` ORDER BY ual.created_at DESC`;
      
      // 添加分页
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
      queryParams.push(parseInt(limit), offset);
      
      const result = await pool.query(query, queryParams);
      
      // 获取总数
      let countQuery = `
        SELECT COUNT(*) as total
        FROM user_activity_logs ual
        WHERE 1=1
      `;
      
      const countParams = [];
      let countParamIndex = 1;
      
      if (userId) {
        countQuery += ` AND ual.user_id = $${countParamIndex++}`;
        countParams.push(userId);
      }
      
      if (action) {
        countQuery += ` AND ual.action = $${countParamIndex++}`;
        countParams.push(action);
      }
      
      if (startTime) {
        countQuery += ` AND ual.created_at >= $${countParamIndex++}`;
        countParams.push(startTime);
      }
      
      if (endTime) {
        countQuery += ` AND ual.created_at <= $${countParamIndex++}`;
        countParams.push(endTime);
      }
      
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      
      res.success({
        logs: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      logger.error('获取用户活动日志失败:', error);
      res.error(500, '获取用户活动日志失败');
    }
  }
  
  /**
   * 获取数据变更审计日志
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getDataChangeAudits(req, res) {
    try {
      // 验证用户是否为管理员
      const adminCheck = await pool.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [req.user.sub]
      );
      
      if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
        return res.error(403, '无权访问数据变更审计日志');
      }
      
      const { 
        userId, 
        tableName, 
        action, 
        startTime, 
        endTime, 
        page = 1, 
        limit = 20 
      } = req.query;
      
      let query = `
        SELECT 
          dca.id,
          dca.user_id,
          u.username,
          dca.table_name,
          dca.record_id,
          dca.action,
          dca.old_values,
          dca.new_values,
          dca.changed_fields,
          dca.ip_address,
          dca.user_agent,
          dca.changed_at
        FROM data_change_audits dca
        LEFT JOIN users u ON dca.user_id = u.id
        WHERE 1=1
      `;
      
      const queryParams = [];
      let paramIndex = 1;
      
      // 添加用户ID筛选
      if (userId) {
        query += ` AND dca.user_id = $${paramIndex++}`;
        queryParams.push(userId);
      }
      
      // 添加表名筛选
      if (tableName) {
        query += ` AND dca.table_name = $${paramIndex++}`;
        queryParams.push(tableName);
      }
      
      // 添加操作类型筛选
      if (action) {
        query += ` AND dca.action = $${paramIndex++}`;
        queryParams.push(action);
      }
      
      // 添加时间范围筛选
      if (startTime) {
        query += ` AND dca.changed_at >= $${paramIndex++}`;
        queryParams.push(startTime);
      }
      
      if (endTime) {
        query += ` AND dca.changed_at <= $${paramIndex++}`;
        queryParams.push(endTime);
      }
      
      // 添加排序
      query += ` ORDER BY dca.changed_at DESC`;
      
      // 添加分页
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
      queryParams.push(parseInt(limit), offset);
      
      const result = await pool.query(query, queryParams);
      
      // 获取总数
      let countQuery = `
        SELECT COUNT(*) as total
        FROM data_change_audits dca
        WHERE 1=1
      `;
      
      const countParams = [];
      let countParamIndex = 1;
      
      if (userId) {
        countQuery += ` AND dca.user_id = $${countParamIndex++}`;
        countParams.push(userId);
      }
      
      if (tableName) {
        countQuery += ` AND dca.table_name = $${countParamIndex++}`;
        countParams.push(tableName);
      }
      
      if (action) {
        countQuery += ` AND dca.action = $${countParamIndex++}`;
        countParams.push(action);
      }
      
      if (startTime) {
        countQuery += ` AND dca.changed_at >= $${countParamIndex++}`;
        countParams.push(startTime);
      }
      
      if (endTime) {
        countQuery += ` AND dca.changed_at <= $${countParamIndex++}`;
        countParams.push(endTime);
      }
      
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      
      res.success({
        audits: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      logger.error('获取数据变更审计日志失败:', error);
      res.error(500, '获取数据变更审计日志失败');
    }
  }
  
  /**
   * 获取系统健康报告
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getSystemHealthReport(req, res) {
    try {
      // 验证用户是否为管理员
      const adminCheck = await pool.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [req.user.sub]
      );
      
      if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
        return res.error(403, '无权访问系统健康报告');
      }
      
      // 导入监控服务
      const { generateSystemHealthReport } = require('../services/monitoring-service');
      
      // 生成系统健康报告
      const report = await generateSystemHealthReport();
      
      res.success({
        report
      });
    } catch (error) {
      logger.error('获取系统健康报告失败:', error);
      res.error(500, '获取系统健康报告失败');
    }
  }
  
  /**
   * 获取系统审计日志
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getSystemAuditLogs(req, res) {
    try {
      // 验证用户是否为管理员
      const adminCheck = await pool.query(
        'SELECT is_admin FROM users WHERE id = $1',
        [req.user.sub]
      );
      
      if (adminCheck.rows.length === 0 || !adminCheck.rows[0].is_admin) {
        return res.error(403, '无权访问系统审计日志');
      }
      
      const { 
        eventType, 
        eventLevel, 
        startTime, 
        endTime, 
        page = 1, 
        limit = 20 
      } = req.query;
      
      let query = `
        SELECT 
          sal.id,
          sal.event_type,
          sal.event_level,
          sal.description,
          sal.details,
          sal.user_id,
          u.username,
          sal.occurred_at
        FROM system_audit_logs sal
        LEFT JOIN users u ON sal.user_id = u.id
        WHERE 1=1
      `;
      
      const queryParams = [];
      let paramIndex = 1;
      
      // 添加事件类型筛选
      if (eventType) {
        query += ` AND sal.event_type = $${paramIndex++}`;
        queryParams.push(eventType);
      }
      
      // 添加事件级别筛选
      if (eventLevel) {
        query += ` AND sal.event_level = $${paramIndex++}`;
        queryParams.push(eventLevel);
      }
      
      // 添加时间范围筛选
      if (startTime) {
        query += ` AND sal.occurred_at >= $${paramIndex++}`;
        queryParams.push(startTime);
      }
      
      if (endTime) {
        query += ` AND sal.occurred_at <= $${paramIndex++}`;
        queryParams.push(endTime);
      }
      
      // 添加排序
      query += ` ORDER BY sal.occurred_at DESC`;
      
      // 添加分页
      const offset = (parseInt(page) - 1) * parseInt(limit);
      query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
      queryParams.push(parseInt(limit), offset);
      
      const result = await pool.query(query, queryParams);
      
      // 获取总数
      let countQuery = `
        SELECT COUNT(*) as total
        FROM system_audit_logs sal
        WHERE 1=1
      `;
      
      const countParams = [];
      let countParamIndex = 1;
      
      if (eventType) {
        countQuery += ` AND sal.event_type = $${countParamIndex++}`;
        countParams.push(eventType);
      }
      
      if (eventLevel) {
        countQuery += ` AND sal.event_level = $${countParamIndex++}`;
        countParams.push(eventLevel);
      }
      
      if (startTime) {
        countQuery += ` AND sal.occurred_at >= $${countParamIndex++}`;
        countParams.push(startTime);
      }
      
      if (endTime) {
        countQuery += ` AND sal.occurred_at <= $${countParamIndex++}`;
        countParams.push(endTime);
      }
      
      const countResult = await pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      
      res.success({
        logs: result.rows,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      logger.error('获取系统审计日志失败:', error);
      res.error(500, '获取系统审计日志失败');
    }
  }
}

module.exports = new MonitoringController();